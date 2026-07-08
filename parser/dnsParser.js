// ==============================
// PARSE DOMAIN
// ==============================

function parseDomain(msg, offset) {

    let domain = "";
    let i = offset;

    while (msg[i] !== 0) {

        const length = msg[i];

        i++;

        domain += msg.toString("ascii", i, i + length);

        i += length;

        if (msg[i] !== 0) {
            domain += ".";
        }
    }

    return {
        domain,
        offset: i
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

function parseAnswers(response) {

    const answers = [];

    const answerCount = response.readUInt16BE(6);

    let offset = 12;

    // Skip Question Section

    while (response[offset] !== 0) {

        offset += response[offset] + 1;

    }

    offset += 5;

    // Now offset points to Answer #1

    for (let i = 0; i < answerCount; i++) {
        
        //NAME (compressed pointer)
        offset += 2;

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

        if(type === 1){
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