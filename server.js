const dnsParser = require("./parser/dnsParser");
const logger = require("./logger/logger");
const config = require("./config/config");
const fs = require("fs");
const dgram = require("dgram");
const express = require("express");

const startDashboard = require("./dashboard");

// ==============================
// LOAD BLOCKLIST
// ==============================

const blockedDomains = new Set();

const blocklist = fs.readFileSync(config.BLOCKLIST_FILE, "utf-8");

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
// CREATE BLOCKED RESPONSE
// ==============================

function createBlockedResponse(request) {

    return createDnsResponse(request, config.DEFAULT_BLOCK_IP);
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
    const domainInfo = dnsParser.parseDomain(request, 12);

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
    response.writeUInt32BE(config.DEFAULT_TTL, offset);
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

    const domainInfo = dnsParser.parseDomain(msg, 12);

    logger.log(`Requested Domain: ${domainInfo.domain}`);

    // ==========================
    // BLOCKED DOMAIN
    // ==========================

    if (blockedDomains.has(domainInfo.domain)) {

        stats.blockedRequests++;

        logger.log(`BLOCKED DOMAIN: ${domainInfo.domain}`);

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

        logger.log("Cache HIT");

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

    logger.log("Cache MISS");

    stats.forwardedRequests++;

    logger.log("Forwarding request to Google DNS");

    const client = dgram.createSocket("udp4");

    client.send(
        msg,
        config.GOOGLE_DNS_PORT,
        config.GOOGLE_DNS_IP
    );

    client.on("message", (response) => {

        logger.log("Received response from Google DNS");

        const ttl = dnsParser.getTTL(response);

        logger.log(`TTL: ${ttl}`);

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

        logger.log("Saved to cache");

        // Send original response
        server.send(
            response,
            rinfo.port,
            rinfo.address
        );

        logger.log("Response sent to client");

        client.close();
    });
});

// ==============================
// START SERVER
// ==============================

server.bind(config.PORT, () => {

    logger.log("DNS Server running on port 53");
});

// ==============================
// CACHE CLEANUP
// ==============================

setInterval(() => {

    logger.log("Checking cache for expired entries...");

    for (const domain in cache) {

        if (cache[domain].expiresAt < Date.now()) {

            stats.expiredCacheRemoved++;

            logger.log(`Removing expired cache: ${domain}`);

            delete cache[domain];
        }
    }

}, config.CACHE_CLEANUP_INTERVAL);

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

}, config.STATS_INTERVAL);

// ==============================
// START DASHBOARD
// ==============================

startDashboard(stats, logger.getLogs());