const dgram = require("dgram");
const config = require("../config/config");
const { resolve } = require("dns");

function forward(msg){

    return new Promise((resolve, reject) => {

        const client = dgram.createSocket("udp4");

        client.send(
            msg,
            config.GOOGLE_DNS_PORT,
            config.GOOGLE_DNS_IP
        );

        client.on("message", (response) =>{
            
            resolve(response);

            client.close();
        });

        client.on("error", (err) => {
            
            reject(err);

            client.close();
        });

    });

}

module.exports = {
    forward
};