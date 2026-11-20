const dnsParser = require("./parser/dnsParser");
const dgram = require("dgram");
const config = require("./config/config");
const { response } = require("express");

// ==============================
// CREATE UDP CLIENT
// ==============================

const client = dgram.createSocket("udp4");

// ==============================
// CREATE DNS PACKET
// ==============================

const packet = Buffer.alloc(512);

// ==============================
// TRANSACTION ID
// ==============================

const transactionId = Math.floor(Math.random() * 65536);

packet.writeUInt16BE(transactionId, 0); // Transaction ID

// ==============================
// DNS FLAGS
// ==============================

// QR = 0 → Query
// RD = 1 → Recursion Desired

//Flags
packet.writeUInt16BE(0x0100, 2);

// ==============================
// DNS HEADER COUNTS
// ==============================

//Question Count
packet.writeUInt16BE(1, 4);

//Answer Count
packet.writeUInt16BE(0, 6);

//Authority Count
packet.writeUInt16BE(0, 8);

//Additional Count
packet.writeUInt16BE(0, 10);

// ==============================
// DOMAIN NAME
// ==============================

const domain = process.argv[2] || "google.com";

const recordType =  (process.argv[3] || "A").toUpperCase();

const labels = domain.split(".");

let offset = 12;

// Convert google.com → 06 google 03 com 00

for(const label of labels){

    // Write label length
    packet.writeUInt8(label.length, offset);
    offset++;

    // Write label itself
    packet.write(label, offset);
    offset += label.length;

}
//End of domain name
packet.writeUInt8(0, offset);
offset++;

// ==============================
// QUERY TYPE
// ==============================

//A = 1
// AAAA = 28

let queryType;

if(recordType === "A"){
    
    queryType = 1;

}else if(recordType === "AAAA"){

    queryType = 28;

}else if(recordType === "CNAME"){

    queryType = 5;

}else if (recordType === "MX") {
    
    queryType = 15;

}else{

    console.log("Unsupported record type.");
    console.log("Supported types: A, AAAA, CNAME, MX");

    client.close();

    process.exit(1);
}

//Write Query Type
packet.writeUInt16BE(queryType, offset);
offset += 2;

// ==============================
// QUERY CLASS
// ==============================

// IN = Internet
packet.writeUInt16BE(1, offset);
offset += 2;

// ==============================
// RECEIVE DNS RESPONSE
// ==============================

client.on("message", (msg, rinfo) => {

    console.log("DNS Response Received!");

    console.log("Response Size:", msg.length);

    // ==============================
    // VALIDATE DNS HEADER
    // ==============================

    if(msg.length < 12){
        
        console.log("Invalid DNS respponse: Header is incomplete.");

        client .close();

        return;
    }


    // ==============================
    // CHECK TRANSACTION ID
    // ==============================

    const responseID = msg.readUInt16BE(0);

    if(responseID !== transactionId) {

        console.log("Transaction ID mismatch. Ignoring Response!");

        return;
    }

    clearTimeout(timeout);

    // ==============================
    // CHECK DNS RESPONSE CODE
    // ==============================

    const flags = msg.readUInt16BE(2);

    //Check QR bit
    const isRespponse = (flags & 0x8000) !== 0;

    if(!isRespponse){

        console.log("Invalid DNS packet: Received a query instead of a response.");

        client.close();

        return;
    }

    // ==============================
    // VALIDATE QUESTION COUNT
    // ==============================

    const questionCount = msg.readUInt16BE(4);

    if(questionCount !== 1){

        console.log("Invalid DNS response: Unexpected question count.");

        client.close();

        return;
    }

    // ==============================
    // VALIDATE DNS QUESTION
    // ==============================

    try{

        const questionInfo = dnsParser.parseDomain(msg, 12);

        const responseDomain = questionInfo.domain.toLocaleLowerCase();

        const questionTypeOffset = questionInfo.offset + 1;

        //Ensure QTYPE & QCLASS are present
        if(questionTypeOffset + 4 > msg.length){

            console.log("Invalid DNS response: Incomplete question section");

            client.close();

            return;
        }

        const responseType = msg.readUInt16BE(questionTypeOffset);

        const respoonseClass = msg.readUInt16BE(questionTypeOffset + 2);

        if(responseDomain !== domain.toLowerCase() || responseType  !== queryType || respoonseClass !== 1){

            console.log("Invalid DNS response: Question mismatch");

            client.close();

            return;
        }

    } catch(err){

        console.log("Invalid DNS question:", err.message);

        client.close();

        return;
    }

    const rcode = flags & 0x000F;

    const rcodeMessages = {
        0: "NOERROR",
        1: "FORMERR",
        2: "SERVFAIL",
        3: "NXDOMAIN",
        4: "NOTIMP",
        5: "REFUSED"
    };

    const rcodeName = rcodeMessages[rcode] || `UNKNOWN (${rcode})`;

    if(rcode !== 0){

        console.log("DNS Response Code:", rcodeName);
        
        switch(rcode){
            
            case 1:
                console.log("Message: The DNS query was malformed.");
                break;
            
            case 2:
                console.log("Message: The DNS server failed to complete the query.");
                break;
            
            case 3:
                console.log("Domain:", domain);
                console.log("Status: NXDOMAIN");
                console.log("Message: The queried domain does not exists.");
                break;
            
            case 4:
                console.log("Message: The requested operation is not supported.");
                break;
            
            case 5:
                console.log("Message: The DNS server refused the query.");
                break;
            
            default:
                console.log("Message: UNKNNOWN DNS response code.");
        }

        client.close();

        return;
    }


    // ==============================
    // PARSE ANSWERS
    // ==============================

    let answers;

    try{

        answers = dnsParser.parseAnswers(msg);

    }catch(err){

        console.log("Invalid DNS response: Unable to parse answers. ");
        console.log("Reason:", err.message);

        client.close();

        return;
    }

    // ==============================
    // FIND ALL REQUESTED RECORDS
    // ==============================

    const requestedRecords = answers.filter(
        answer => answer.type === recordType
    );

    // ==============================
    // DISPLAY RESULT
    // ==============================

    if(requestedRecords.length > 0){

        const status =
            requestedRecords[0].data === config.DEFAULT_BLOCK_IP
                ? "Blocked"
                : "Resolved";

        console.log("Domain:", domain);
        console.log("Record Type:", recordType);
        console.log("Status:", status);
        console.log("Records Found:", requestedRecords.length);

        requestedRecords.forEach((record, index) => {

            if(recordType === "MX"){
                console.log(
                    `${index + 1}. Priority: ${record.priority}, Mail Server: ${record.data} (TTL: ${record.ttl})`
                );
            } else {

                console.log(
                    `${index + 1}. ${record.data} (TTL: ${record.ttl})`
                );
            }

        });

    }else{

        console.log(
            `No ${recordType} record found for ${domain}.`
        );
    }

    client.close();

});

// ==============================
// DNS REQUEST TIMEOUT
// ==============================

const timeout = setTimeout(() => {

    console.log("DNS request timed out.");

    client.close();

}, config.CLIENT_TIMEOUT);

// ==============================
// SEND DNS QUERY
// ==============================

client.send(
    packet.slice(0, offset),
    5300,
    "127.0.0.1",
    (err) => {

        if(err) {

            console.log("Error:", err);

            clearTimeout(timeout);
            client.close();
        }else{

            console.log("DNS Query Sent !");

        }

    }
);