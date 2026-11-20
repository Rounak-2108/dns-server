const logger = require("../logger/logger");
const net = require("net");
const dgram = require("dgram");
const config = require("../config/config");

function forwardTCP(msg, dnsServer) {

    return new Promise((resolve) => {

        let finished = false;
        let buffer = Buffer.alloc(0);
        let expectedLength = null;

        const client = new net.Socket();

        const timer = setTimeout(() => {
            finish(null);
        }, config.DNS_TIMEOUT);

        function finish(result) {

            if (finished) return;

            finished = true;

            clearTimeout(timer);
            client.destroy();

            resolve(result);
        }

        client.on("connect", () => {

            // Create the 2-byte DNS TCP length prefix
            const lengthBuffer = Buffer.alloc(2);
            lengthBuffer.writeUInt16BE(msg.length, 0);

            // Prefix + original DNS query
            const tcpMessage = Buffer.concat([lengthBuffer, msg]);

            client.write(tcpMessage);

            logger.log(`${dnsServer.name}: DNS query sent over TCP.`);
        });

        client.on("data", (chunk) => {

            // Accumulate incoming TCP chunks
            buffer = Buffer.concat([buffer, chunk]);

            // Wait until the 2-byte length prefix is available
            if (expectedLength === null && buffer.length >= 2) {

                expectedLength = buffer.readUInt16BE(0);

                if (expectedLength < 12) {
                    logger.log(`${dnsServer.name}: Invalid TCP DNS response length.`);
                    finish(null);
                    return;
                }
            }

            // Wait until the complete DNS message arrives
            if (
                expectedLength !== null &&
                buffer.length >= expectedLength + 2
            ) {

                const response = buffer.subarray(2, expectedLength + 2);

                if (response.length < 12) {
                    finish(null);
                    return;
                }

                //Check wether the response belongs to our original query
                if(response.readUInt16BE(0) !== msg.readUInt16BE(0)){
                    logger.log(`${dnsServer.name}: TCP transaction ID mismatch.`);
                    finish(null);
                    return;
                }

                //Read DNS Flags
                const flags = response.readUInt16BE(2);
                const isTruncated = (flags & 0x0200) !== 0;

                if (isTruncated) {
                    logger.log(`${dnsServer.name}: TCP response is still truncated.`);
                    finish(null);
                    return;
                }

                logger.log(`${dnsServer.name}: TCP response received successfully.`);

                finish(response);
            }
        });

        client.on("error", (err) => {
            logger.log(`${dnsServer.name}: TCP error: ${err.message}`);
            finish(null);
        });

        client.on("close", () => {

            if (!finished) {
                logger.log(`${dnsServer.name}: TCP connection closed before complete response.`);
                finish(null);
            }

        });

        client.connect(dnsServer.port, dnsServer.ip);

    });
}

async function forward(msg){

    for (const dnsServer of config.DNS_SERVERS) {

        const response = await new Promise((resolveAttempt) => {

            let finished = false;

            // Everything related to ONE DNS server goes here
            const client = dgram.createSocket("udp4");

            const timer = setTimeout(() => {

                if (finished) return;

                finished = true;

                logger.log(`${dnsServer.name} DNS timed out.`);

                client.close();

                resolveAttempt(null);

            }, config.DNS_TIMEOUT);

            client.on("message", async (response) => {

                if (finished) return;

                //validate minimum DNS Header
                if(response.length < 12){

                    finished = true;

                    clearTimeout(timer);

                    client.close();

                    logger.log(`${dnsServer.name} : Invalid DNS Response.`);

                    resolveAttempt(null);

                    return;
                }

                //Read DNS Flags
                const flags = response.readUInt16BE(2);

                // Check TC bit
                const isTruncated = (flags & 0x0200) !== 0;

                finished = true;

                clearTimeout(timer);

                client.close();

                //If UDP response is truncated, retry using TCP
                if(isTruncated){

                    logger.log(`${dnsServer.name}: UDP response truncated. Retrying over TCP...`);

                    const tcpResponse = await forwardTCP(msg, dnsServer);

                    resolveAttempt(tcpResponse);

                    return;
                }

                logger.log(`${dnsServer.name} responded successfully over UDP.`);

                resolveAttempt(response);

            });

            client.on("error", (err) => {

                if (finished) return;

                finished = true;

                clearTimeout(timer);

                client.close();

                logger.log(`${dnsServer.name} error: ${err.message}`);

                resolveAttempt(null);

            });

            logger.log (`Trying ${dnsServer.name} DNS...`);

            client.send(
                msg,
                dnsServer.port,
                dnsServer.ip,
                (err) => {
                    if (err) {
                        if (finished) return;

                        finished = true;

                        clearTimeout(timer);

                        client.close(); 

                        logger.log(`${dnsServer.name} send failed.`);

                        resolveAttempt(null);
                    }
                }
            );

        });

        if (response) {
            return response;
        }
    }

    throw new Error("ALL DNS servers failed.");

}

module.exports = {
    forward
};