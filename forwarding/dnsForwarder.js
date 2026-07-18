const logger = require("../logger/logger");
const dgram = require("dgram");
const config = require("../config/config");

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

            client.on("message", (response) => {

                if (finished) return;

                finished = true;

                clearTimeout(timer);

                client.close();

                logger.log(`${dnsServer.name} responded successfully.`);

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