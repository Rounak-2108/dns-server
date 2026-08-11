const dnsParser = require("./parser/dnsParser");
const { off } = require("cluster");
const dgram = require("dgram");
const config = require("./config/config");

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

// A record = IPv4
packet.writeUInt16BE(1, offset);
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
    
    clearTimeout(timeout);

    console.log("DNS Response Received!");

    console.log("Response Size:", msg.length);

    const reponseID = msg.readUInt16BE(0);

    if(reponseID !== transactionId) {

        console.log("Transaction ID mismatch. Ignoring Response!");

        return;
    }

    const answers = dnsParser.parseAnswers(msg);

    const aRecord = answers.find(
        answer => answer.type === "A"
    );

    if(aRecord){

        const status = aRecord.data === config.DEFAULT_BLOCK_IP ? "Blocked" : "Resolved";
        
        console.log("Domain:", domain);
        console.log("Status:", status);
        console.log("IP Address:", aRecord.data);
        console.log("TTL:", aRecord.ttl);
        
    }

});

const timeout = setTimeout(() => {

    console.log("DNS request timed out.");

    client.close();

}, config.DNS_TIMEOUT);

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

        }else{

            console.log("DNS Query Sent !");

        }

    }
);