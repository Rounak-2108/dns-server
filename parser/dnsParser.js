// ==============================
// PARSE DOMAIN
// ==============================

function parseDomain(msg, offset) {
    let domain = "";
    let i = offset;
    let jumped = false;
    let originalOffset = offset;
    const visitedOffsets = new Set();
    let terminated = false;

    while (i < msg.length) {

        if(visitedOffsets.has(i)){
            throw new Error("DNS Compression pointer loop detected");
        }

        visitedOffsets.add(i);

        const length = msg[i];

        // End of domain name
        if (length === 0) {
            if (!jumped) {
                originalOffset = i;
            }
            terminated = true;
            break;
        }

        // DNS Compression Pointer
        if ((length & 0xC0) === 0xC0) {
            if (i + 1 >= msg.length) {
                throw new Error("Invalid DNS compression pointer");
            }

            const pointer =
                ((length & 0x3F) << 8) |
                msg[i + 1];

            //validate pointer target
            if(pointer >= msg.length){
                throw new Error("Invalid DNS Compression pointer: target outside packet");
            }

            if(pointer >= i){
                throw new Error("Invalid DNS Compression pointer: target must point backward");
            }

            if (!jumped) {
                originalOffset = i + 1;
            }

            i = pointer;
            jumped = true;
            continue;
        }

        // Normal label
        if (length < 1 || length > 63) {
            throw new Error("Invalid DNS label length");
        }

        i++;

        if (i + length > msg.length) {
            throw new Error(
                "Invalid DNS packet: label exceeds packet length"
            );
        }

        if (domain.length > 0) {
            domain += ".";
        }

        domain += msg.toString(
            "ascii",
            i,
            i + length
        );

        i += length;
    }
    
    if(!terminated){
        throw new Error("Invalid DNS domain: missing termination");
    }

    return {
        domain,
        offset: originalOffset
    };
}

// ==============================
// GET TTL
// ==============================

function getTTL(response) {

    try {

        let offset = 12;

        // skip question section
        while (response[offset] !== 0) {
            offset += response[offset] + 1;
        }

        offset += 5;

        // answer name
        offset += 2;

        // type + class
        offset += 4;

        // TTL
        return response.readUInt32BE(offset);

    } catch (err) {

        return 60;
    }
}

// ==============================
// PARSE COMPRESSED DOMAIN
// ==============================

function parseCompressedDomain(response, offset) {

    const labels = [];

    let currentOffset = offset;

    let jumped = false;

    const visitedOffsets = new Set();

    while (true) {

        if (currentOffset >= response.length) {

            throw new Error(
                "Invalid DNS packet: compressed domain exceeds packet length"
            );

        }

        // Prevent infinite pointer loops
        if (visitedOffsets.has(currentOffset)) {

            throw new Error(
                "Invalid DNS compression pointer loop"
            );

        }

        visitedOffsets.add(currentOffset);

        const length = response[currentOffset];

        // End of domain name
        if (length === 0) {
            break;
        }

        // Check whether this is a compression pointer
        if ((length & 0xC0) === 0xC0) {

            if (currentOffset + 1 >= response.length) {

                throw new Error(
                    "Invalid DNS compression pointer"
                );

            }

            const pointer =
                ((length & 0x3F) << 8) |
                response[currentOffset + 1];

            currentOffset = pointer;

            jumped = true;

        } else {

            // Normal label
            if (length > 63) {

                throw new Error(
                    "Invalid DNS label length"
                );

            }

            currentOffset++;

            if (
                currentOffset + length >
                response.length
            ) {

                throw new Error(
                    "Invalid DNS packet: label exceeds packet length"
                );

            }

            labels.push(
                response.toString(
                    "ascii",
                    currentOffset,
                    currentOffset + length
                )
            );

            currentOffset += length;

        }

    }

    return labels.join(".");
}

// ==============================
// VALIDATE PACKET BOUNDS
// ==============================

function ensureAvailable(response, offset, length, context){

    if(offset < 0 || length < 0 || offset + length > response.length){

        throw new Error(`Invalid DNS packet: Incomplete ${context}`);

    }
}

function parseAnswers(response) {

    const answers = [];

    // ==============================
    // VALIDATE DNS HEADER
    // ==============================

    ensureAvailable(response, 0, 12, "DNS HEADER");

    const questionCount = response.readUInt16BE(4);
    const answerCount = response.readUInt16BE(6);

    let offset = 12;

    // ==============================
    // Skip Question Section
    // ==============================

    for(let i = 0; i < questionCount; i++){

        const questionInfo = parseDomain(response, offset);

        //Move past domain name
        offset = questionInfo.offset + 1;

        //Validate QTYPE and QCLASS
        ensureAvailable(response, offset, 4, "question type and class");

        //Skip QTYPE and QCLASS
        offset += 4;

    }

    // Now offset points to Answer #1

    for (let i = 0; i < answerCount; i++) {
        
        // ==============================
        // PARSE ANSWER NAME
        // ==============================

        const nameInfo = parseDomain(response, offset);

        offset = nameInfo.offset + 1;

        // ==============================
        // VALIDATE FIXED RECORD FIELDS
        // ==============================

        ensureAvailable(response, offset, 10, "answer record header");

        //TYPE
        const type = response.readUInt16BE(offset);
        offset += 2;

        //CLASS
        const dnsClass = response.readUInt16BE(offset);
        offset += 2;

        //TTL
        const ttl = response.readUInt32BE(offset);
        offset += 4;

        //RDLENGTH
        const rdLength = response.readUInt16BE(offset);
        offset += 2;

        ensureAvailable(response, offset, rdLength, "record data");

        if(type === 1){
            //A record
            //IPv4 -> 4bytes
            if(rdLength !== 4){
                throw new Error("Invalid A record length");
            }
            const ip = [];
            for(let j = 0; j < rdLength; j++){
                ip.push(response[offset + j]);
            }

            answers.push({
                type: "A",
                ttl,
                data: ip.join(".")
            });
        }
        else if(type === 28){
            // AAAA record
            // IPv6 -> 16bytes
            if(rdLength !== 16){
                throw new Error("Invalid AAAA record length");
            }
            const groups = [];
            for(let j = 0; j < 16; j += 2){
                const group = ((response[offset + j] << 8) | response[offset + j + 1]).toString(16);
                groups.push(group);
            }

            answers.push({
                type: "AAAA",
                ttl,
                data: groups.join(":")
            });
        }
        else if(type === 15){
            //MX Record
            //First 2 bytes = preference / priority

            if(rdLength < 3){
                throw new Error("Invalid MX record length");
            }

            const rdataEnd = offset + rdLength;

            const priority = response.readUInt16BE(offset);
            const exchangeOffset = offset + 2;

            //Domain name starts after the 2-byte priority
            const exchangeInfo = parseDomain(response, exchangeOffset);

            const consumedBytes = exchangeInfo.offset + 1 - exchangeOffset;

            if(exchangeOffset + consumedBytes > rdataEnd){
                throw new Error("Invalid MX exchange name length");
            }

            answers.push({
                type: "MX",
                ttl,
                priority,
                data: exchangeInfo.domain
            });
        }
        else if(type === 5){
            // CNAME RECORD

            const rdataEnd = offset + rdLength;

            const cnameInfo = parseDomain(response, offset);

            const consumedBytes = cnameInfo.offset + 1 - offset;

            if(offset + consumedBytes > rdataEnd) {
                throw new Error("Invalid CNAME record length");
            }

            answers.push({
                type: "CNAME",
                ttl,
                data: cnameInfo.domain
            });
        }

        offset += rdLength;
    }

    console.log(answers);
    return answers;

}

module.exports = {
    parseDomain,
    getTTL,
    parseAnswers
};