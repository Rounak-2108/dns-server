const dgram = require("dgram");

const client = dgram.createSocket("udp4");

const message = Buffer.from("Hello DNS Server");

client.send(
    message,
    5300,
    "127.0.0.1",
    (err) => {
        if (err) {
            console.log("Error:", err);
        } else {
            console.log("Packet sent");
        }

        client.close();
    }
);