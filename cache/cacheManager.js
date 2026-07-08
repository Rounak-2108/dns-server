const config = require("../config/config");

// ==============================
// CACHE MANAGER
// ==============================

const cache = {};

// ------------------------------
// Get cache entry
// ------------------------------

function get(domain) {

    console.log("CACHE CONTENT:");

    console.log(cache);

    return cache[domain];

}

// ------------------------------
// Save cache entry
// ------------------------------

function set(domain, ip, ttl) {

    cache[domain] = {

        ip,

        expiresAt: Date.now() + (ttl * 1000)

    };
    console.log("CACHE SAVED:");

    console.log(cache);

}

// ------------------------------
// Remove cache entry
// ------------------------------

function remove(domain) {

    delete cache[domain];

}

// ------------------------------
// Cleanup expired cache
// ------------------------------

function cleanupExpired(logger, stats) {

    logger.log("Checking cache for expired entries...");

    for (const domain in cache) {

        if (cache[domain].expiresAt < Date.now()) {

            stats.expiredCacheRemoved++;

            logger.log(`Removing expired cache: ${domain}`);

            remove(domain);

        }

    }

}

// ------------------------------
// Start cleanup timer
// ------------------------------

function startCleanup(logger, stats) {

    setInterval(() => {

        cleanupExpired(logger, stats);

    }, config.CACHE_CLEANUP_INTERVAL);

}

module.exports = {
    get,
    set,
    remove,
    cleanupExpired,
    startCleanup
};