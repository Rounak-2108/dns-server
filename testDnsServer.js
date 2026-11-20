
const dgram = require("dgram");
const net = require("net");

// UDP test server
const udpServer = dgram.createSocket("udp4");

// TCP test server
const tcpServer = net.createServer((socket) => {

    let buffer = Buffer.alloc(0);

    socket.on("data", (chunk) => {

        buffer = Buffer.concat([buffer, chunk]);

        if (buffer.length < 2) return;

        const queryLength = buffer.readUInt16BE(0);

        if (buffer.length < queryLength + 2) return;

        const query = buffer.subarray(2, queryLength + 2);

        // Create a complete DNS response
        const response = Buffer.from(query);

        // QR = 1, TC = 0, RD = 1, RA = 1
        response.writeUInt16BE(0x8180, 2);

        // No answer records needed for this transport test
        response.writeUInt16BE(0, 6);

        // Add TCP length prefix
        const lengthBuffer = Buffer.alloc(2);
        lengthBuffer.writeUInt16BE(response.length, 0);

        socket.write(Buffer.concat([lengthBuffer, response]));

        console.log("TCP: Complete DNS response sent.");
    });
});

// Deliberately return a truncated UDP response
udpServer.on("message", (query, rinfo) => {

    const response = Buffer.from(query);

    // QR = 1, TC = 1, RD = 1, RA = 1
    response.writeUInt16BE(0x8380, 2);

    udpServer.send(response, rinfo.port, rinfo.address);

    console.log("UDP: Truncated DNS response sent.");
});

udpServer.on("error", (err) => {
    console.log("UDP server error:", err.message);
});

udpServer.bind(55353, "127.0.0.1", () => {
    console.log("UDP test server listening on port 55353.");
});

tcpServer.listen(55353, "127.0.0.1", () => {
    console.log("TCP test server listening on port 55353.");
});
