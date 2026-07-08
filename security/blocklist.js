// ==============================
// BLOCKLIST MODULE
// ==============================

const fs = require("fs");
const config = require("../config/config");

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

function isBlocked(domain){
    return blockedDomains.has(domain);
}

module.exports = {
    isBlocked
};