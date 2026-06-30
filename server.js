const fs = require("fs");
const dgram = require("dgram");
const express = require("express");

const startDashboard = require("./dashboard");

// ==============================
// LOAD BLOCKLIST
// ==============================

const blockedDomains = new Set();

const blocklist = fs.readFileSync("blocklist.txt", "utf-8");

const domains = blocklist.split("\n");

for (const domain of domains) {

    const cleanDomain = domain.trim();

    if (cleanDomain.length > 0) {
        blockedDomains.add(cleanDomain);
    }
}

console.log("Loaded blocked domains:", blockedDomains.size);

// ==============================
// DNS SERVER
// ==============================

const server = dgram.createSocket("udp4");

// ==============================
// CACHE
// ==============================

const cache = {};

// ==============================
// STATS
// ==============================

const stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    blockedRequests: 0,
    forwardedRequests: 0,
    expiredCacheRemoved: 0
};

// ==============================
// LOGS
// ==============================

const logs = [];

function addLog(message) {

    const time = new Date().toLocaleTimeString();

    logs.unshift(`[${time}] ${message}`);

    if (logs.length > 50) {
        logs.pop();
    }

    console.log(message);
}

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

// ==============================
// CREATE BLOCKED RESPONSE
// ==============================

function createBlockedResponse(request) {

    return createDnsResponse(request, "0.0.0.0");
}

// ==============================
// CREATE DNS RESPONSE
// ==============================

function createDnsResponse(request, ip) {

    const response = Buffer.alloc(512);

    // Transaction ID
    request.copy(response, 0, 0, 2);

    // Flags
    response.writeUInt16BE(0x8180, 2);

    // Questions
    response.writeUInt16BE(1, 4);

    // Answers
    response.writeUInt16BE(1, 6);

    // Authority RRs
    response.writeUInt16BE(0, 8);

    // Additional RRs
    response.writeUInt16BE(0, 10);

    // Parse domain
    const domainInfo = parseDomain(request, 12);

    const questionEnd = domainInfo.offset + 5;

    // Copy question section
    request.copy(response, 12, 12, questionEnd);

    let offset = questionEnd;

    // NAME pointer
    response[offset++] = 0xc0;
    response[offset++] = 0x0c;

    // TYPE A
    response.writeUInt16BE(1, offset);
    offset += 2;

    // CLASS IN
    response.writeUInt16BE(1, offset);
    offset += 2;

    // TTL
    response.writeUInt32BE(60, offset);
    offset += 4;

    // RDLENGTH
    response.writeUInt16BE(4, offset);
    offset += 2;

    // IP Address
    const ipParts = ip.split(".");

    for (const part of ipParts) {
        response[offset++] = parseInt(part);
    }

    return response.slice(0, offset);
}

// ==============================
// HANDLE REQUESTS
// ==============================

server.on("message", (msg, rinfo) => {

    stats.totalRequests++;

    const domainInfo = parseDomain(msg, 12);

    addLog(`Requested Domain: ${domainInfo.domain}`);

    // ==========================
    // BLOCKED DOMAIN
    // ==========================

    if (blockedDomains.has(domainInfo.domain)) {

        stats.blockedRequests++;

        addLog(`BLOCKED DOMAIN: ${domainInfo.domain}`);

        const blockedResponse = createBlockedResponse(msg);

        server.send(
            blockedResponse,
            rinfo.port,
            rinfo.address
        );

        return;
    }

    // ==========================
    // CACHE HIT
    // ==========================

    const cachedEntry = cache[domainInfo.domain];

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {

        stats.cacheHits++;

        addLog("Cache HIT");

        const cachedResponse = createDnsResponse(
            msg,
            cachedEntry.ip
        );

        server.send(
            cachedResponse,
            rinfo.port,
            rinfo.address
        );

        return;
    }

    // ==========================
    // CACHE MISS
    // ==========================

    stats.cacheMisses++;

    addLog("Cache MISS");

    stats.forwardedRequests++;

    addLog("Forwarding request to Google DNS");

    const client = dgram.createSocket("udp4");

    client.send(
        msg,
        53,
        "8.8.8.8"
    );

    client.on("message", (response) => {

        addLog("Received response from Google DNS");

        const ttl = getTTL(response);

        addLog(`TTL: ${ttl}`);

        // ======================
        // EXTRACT IP
        // ======================

        const ip = [
            response[response.length - 4],
            response[response.length - 3],
            response[response.length - 2],
            response[response.length - 1]
        ].join(".");

        // ======================
        // SAVE CACHE
        // ======================

        cache[domainInfo.domain] = {
            ip,
            expiresAt: Date.now() + (ttl * 1000)
        };

        addLog("Saved to cache");

        // Send original response
        server.send(
            response,
            rinfo.port,
            rinfo.address
        );

        addLog("Response sent to client");

        client.close();
    });
});

// ==============================
// START SERVER
// ==============================

server.bind(53, () => {

    addLog("DNS Server running on port 53");
});

// ==============================
// CACHE CLEANUP
// ==============================

setInterval(() => {

    addLog("Checking cache for expired entries...");

    for (const domain in cache) {

        if (cache[domain].expiresAt < Date.now()) {

            stats.expiredCacheRemoved++;

            addLog(`Removing expired cache: ${domain}`);

            delete cache[domain];
        }
    }

}, 10000);

// ==============================
// DASHBOARD STATS
// ==============================

setInterval(() => {

    console.log("\n========== DNS STATS ==========");

    console.log("Total Requests:", stats.totalRequests);

    console.log("Cache Hits:", stats.cacheHits);

    console.log("Cache Misses:", stats.cacheMisses);

    console.log("Blocked Requests:", stats.blockedRequests);

    console.log("Forwarded Requests:", stats.forwardedRequests);

    console.log("Expired Cache Removed:", stats.expiredCacheRemoved);

    console.log("================================\n");

}, 15000);

// ==============================
// START DASHBOARD
// ==============================

startDashboard(stats, logs);