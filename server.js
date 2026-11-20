const dnsForwarder = require("./forwarding/dnsForwarder");
const cacheManager = require("./cache/cacheManager");
const blocklist = require("./security/blocklist");
const stats = require("./stats/statsManager");
const dnsParser = require("./parser/dnsParser");
const logger = require("./logger/logger");
const config = require("./config/config");
const dgram = require("dgram");
const startDashboard = require("./dashboard");
const { off } = require("cluster");



// ==============================
// DNS SERVER
// ==============================

const server = dgram.createSocket("udp4");

// ==============================
// RECORD RECENT DNS REQUEST
// ==============================

function recordRecentRequest(domain, type, status) {

    stats.recentRequests.unshift({
        domain,
        type,
        status
    });

    // Keep only the latest 20 requests
    if (stats.recentRequests.length > 20) {

        stats.recentRequests.pop();

    }

}

// ==============================
// CREATE BLOCKED RESPONSE
// ==============================

function createBlockedResponse(request) {

    return createDnsResponse(request, config.DEFAULT_BLOCK_IP, "A", config.DEFAULT_TTL);
}

// ==============================
// CREATE DNS RESPONSE
// ==============================

function createDnsResponse(request, data, recordType, ttl = config.DEFAULT_TTL) {

    const response = Buffer.alloc(512);

    // Transaction ID
    request.copy(response, 0, 0, 2);

    // Flags
    response.writeUInt16BE(0x8180, 2);

    // Questions
    response.writeUInt16BE(1, 4);

    // Answers
    const records = Array.isArray(data) ? data : [data];
    response.writeUInt16BE(records.length, 6);

    // Authority RRs
    response.writeUInt16BE(0, 8);

    // Additional RRs
    response.writeUInt16BE(0, 10);

    // ==============================
    // COPY QUESTION SECTION
    // ==============================

    const domainInfo = dnsParser.parseDomain(request, 12);

    const questionEnd = domainInfo.offset + 5;

    request.copy(response, 12, 12, questionEnd);

    let offset = questionEnd;

    // ==============================
    // CREATE EACH ANSWER
    // ==============================

    for (const record of records) {

        // NAME pointer
        response[offset++] = 0xc0;
        response[offset++] = 0x0c;

        // ==========================
        // RECORD TYPE
        // ==========================

        if (recordType === "A") {

            response.writeUInt16BE(1, offset);

        } else if (recordType === "AAAA") {

            response.writeUInt16BE(28, offset);

        } else if(recordType === "CNAME") {

            response.writeUInt16BE(5, offset);

        } else if (recordType === "MX") {

            response.writeUInt16BE(15, offset);

        } else {

            throw new Error(
                `Unsupported response record type: ${recordType}`
            );
        }

        offset += 2;

        // CLASS IN
        response.writeUInt16BE(1, offset);
        offset += 2;

        // TTL
        response.writeUInt32BE(ttl, offset);
        offset += 4;

        // ==========================
        // RDATA
        // ==========================

        if (recordType === "A") {

            const ipParts = record.split(".");

            if (ipParts.length !== 4) {
                throw new Error(
                    `Invalid IPv4 address: ${ip}`
                );
            }

            // RDLENGTH = 4
            response.writeUInt16BE(4, offset);
            offset += 2;

            for (const part of ipParts) {

                const value = Number(part);

                if (value < 0 || value > 255) {
                    throw new Error(
                        `Invalid IPv4 address: ${record}`
                    );
                }

                response[offset++] = value;
            }

        } else if (recordType === "AAAA") {

            const groups = record.split(":");

            if (groups.length !== 8) {
                throw new Error(
                    `Invalid IPv6 address: ${record}`
                );
            }

            // RDLENGTH = 16
            response.writeUInt16BE(16, offset);
            offset += 2;

            for (const group of groups) {

                const value = parseInt(
                    group || "0",
                    16
                );

                response.writeUInt16BE(
                    value,
                    offset
                );

                offset += 2;
            }
        } else if (recordType === "CNAME") {

            const labels = record.split(".");

            //Calculate the length of the encoded domain
            let dataLength = 1;

            for(const label of labels){
                dataLength += 1 + Buffer.byteLength(label);
            }

            //Write RDLENGTH
            response.writeUInt16BE(dataLength, offset);
            offset += 2;

            //Write each domain label
            for(const label of labels){

                const length = Buffer.byteLength(label);

                response[offset++] = length;

                response.write(label, offset, length, "ascii");

                offset += length;
            }

            //End of domain name
            response[offset++] = 0;
        } else if (recordType === "MX") {
            // record contains:
            // {
            //     priority: 10,
            //     data: "mail.example.com"
            // }

            const priority = record.priority;
            const mailServer = record.data;

            //Split mail server domain into labels
            const labels = mailServer.split(".");

            //Calculate RD Length
            //2 bytes priority
            // + encoded domain
            let dataLength = 2 + 1;

            for(const label of labels){
                dataLength += 1 + Buffer.byteLength(label);
            }

            //Write RD Length
            response.writeUInt16BE(dataLength, offset);
            offset += 2;

            //Write Priority
            response.writeUInt16BE(priority, offset);
            offset += 2;

            //Write Mail Server Domain
            for(const label of labels){
                const length = Buffer.byteLength(label);

                response[offset++] = length;

                response.write(label, offset, length, "ascii");
                offset += length;
            }
            
            //End of domain
            response[offset++] = 0;

        }
    }

    return response.slice(0, offset);
}

// ==============================
// CREATE DNS ERROR RESPONSE
// ==============================

function createErrorResponse(request) {
    const response = Buffer.alloc(512);

    // Copy Transaction ID
    request.copy(response, 0, 0, 2);

    // Flags
    // QR = 1 (Response)
    // RD = 1
    // RA = 1
    // RCODE = 2 (Server Failure)
    response.writeUInt16BE(0x8182, 2);

    // Copy question count
    response.writeUInt16BE(1, 4);

    // No answers
    response.writeUInt16BE(0, 6);

    // No authority records
    response.writeUInt16BE(0, 8);

    // No additional records
    response.writeUInt16BE(0, 10);

    // Copy Question Section
    const domainInfo = dnsParser.parseDomain(request, 12);

    const questionEnd = domainInfo.offset + 5;

    request.copy(response, 12, 12, questionEnd);

    return response.slice(0, questionEnd);
}

// ==============================
// HANDLE REQUESTS
// ==============================

server.on("message", async (msg, rinfo) => {

    stats.totalRequests++;

    let domainInfo;

    try{

        domainInfo = dnsParser.parseDomain(msg, 12);

    } catch (err){
        
        logger.log(`Invalid DNS packet: ${err.message}`);

        const errorResponse = createErrorResponse(msg);

        server.send(
            errorResponse,
            rinfo.port,
            rinfo.address
        );

        logger.log("DNS error response sent to client");

        return;
        
    }

    logger.log(`Requested Domain: ${domainInfo.domain}`);

    // ==========================
    // GET REQUESTED RECORD TYPE
    // ==========================

    const queryType = msg.readUInt16BE(domainInfo.offset + 1);

    let recordType;

    if(queryType === 1){
        
        recordType = "A";

    }else if(queryType === 28){

        recordType = "AAAA";

    }else if(queryType === 5){
        
        recordType = "CNAME";

    }else if(queryType === 15){

        recordType = "MX";

    }else{

        recordType = "UNKNOWN";
    }

    logger.log(`Requested Record Type: ${recordType}`);

    // ==========================
    // BLOCKED DOMAIN
    // ==========================

    if (blocklist.isBlocked(domainInfo.domain)) {

        stats.blockedRequests++;

        recordRecentRequest(domainInfo.domain, recordType, "BLOCKED");

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

    const cachedEntry = cacheManager.get(domainInfo.domain, recordType);

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {

        stats.cacheHits++;

        recordRecentRequest(domainInfo.domain, recordType, "CACHE HIT");

        logger.log("Cache HIT");

        const remainingTTL = Math.max(0, Math.floor((cachedEntry.expiresAt - Date.now())/1000));
        const cachedResponse = createDnsResponse(
            msg,
            cachedEntry.data,
            cachedEntry.type,
            remainingTTL
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

    logger.log(`Forwarding request ...`);

    try{

        const response = await dnsForwarder.forward(msg);

        logger.log(`Upstream DNS responded successfully.`);

        recordRecentRequest(domainInfo.domain, recordType, "FORWARDED");

        const answers = dnsParser.parseAnswers(response);

        // Get ALL records of the requested type
        const records = answers.filter(
            answer => answer.type === recordType
        );

        if(records.length > 0){

            let data;

            if(recordType === "MX") {
                data = records.map(record =>({
                    priority: record.priority,
                    data: record.data
                }));
            } else {
                data = records.map(
                    record => record.data
                );
            }

            const ttl = records[0].ttl;

            cacheManager.set(
                domainInfo.domain,
                recordType,
                data,
                ttl
            );

            logger.log(
                `Saved ${records.length} ${recordType} record(s) to cache`
            );
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

        const errorResponse = createErrorResponse(msg);

        server.send(
            errorResponse,
            rinfo.port,
            rinfo.address
        );

        logger.log("DNS error response sent to client");

    }
});

// ==============================
// START SERVER
// ==============================

server.bind(config.PORT, () => {

    logger.log(`DNS Server running on port ${config.PORT}`);
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