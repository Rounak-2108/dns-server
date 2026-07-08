const dnsForwarder = require("./forwarding/dnsForwarder");
const cacheManager = require("./cache/cacheManager");
const blocklist = require("./security/blocklist");
const stats = require("./stats/statsManager");
const dnsParser = require("./parser/dnsParser");
const logger = require("./logger/logger");
const config = require("./config/config");
const fs = require("fs");
const dgram = require("dgram");
const express = require("express");
const startDashboard = require("./dashboard");


// ==============================
// DNS SERVER
// ==============================

const server = dgram.createSocket("udp4");

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

server.on("message", async (msg, rinfo) => {

    stats.totalRequests++;

    const domainInfo = dnsParser.parseDomain(msg, 12);

    logger.log(`Requested Domain: ${domainInfo.domain}`);

    // ==========================
    // BLOCKED DOMAIN
    // ==========================

    if (blocklist.isBlocked(domainInfo.domain)) {

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

    const cachedEntry = cacheManager.get(domainInfo.domain);

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

    try{

        const response = await dnsForwarder.forward(msg);

        logger.log("Received response from Google DNS");

        const answers = dnsParser.parseAnswers(response);

        const aRecord = answers.find(answer => answer.type === "A");

        if(aRecord){
            
            cacheManager.set(
                domainInfo.domain,
                aRecord.data,
                aRecord.ttl
            );
            
            logger.log("Saved to cache");

        }

        server.send(
            response,
            rinfo.port,
            rinfo.address
        );
        
        logger.log("Response sent to client");
    }
    catch (err) {

        logger.log(`Forwarding failed: ${err.message}`);

    }
});

// ==============================
// START SERVER
// ==============================

server.bind(config.PORT, () => {

    logger.log("DNS Server running on port 53");
});

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

cacheManager.startCleanup(logger, stats);

// ==============================
// START DASHBOARD
// ==============================

startDashboard(stats, logger.getLogs());