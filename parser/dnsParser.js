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

module.exports = {
    parseDomain,
    getTTL
};