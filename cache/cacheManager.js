const config = require("../config/config");

// ==============================
// CACHE MANAGER
// ==============================

const LRUCache = require("./LRUCache");

const cache = new LRUCache(config.CACHE_CAPACITY);

// ------------------------------
// Get cache entry
// ------------------------------

function get(domain, type) {

    return cache.get(domain, type);

}

// ------------------------------
// Save cache entry
// ------------------------------

function set(domain, type, data, ttl) {

    cache.put(
        domain,
        type,
        data,
        Date.now() + (ttl * 1000)
    );

}

// ------------------------------
// Remove cache entry
// ------------------------------

function remove(domain, type) {

    cache.remove(domain, type);

}

// ------------------------------
// Cleanup expired cache
// ------------------------------

function cleanupExpired(logger, stats) {

    logger.log("Checking cache for expired entries...");

    for (const node of cache.getAllNodes()) {

        if (node.expiresAt <= Date.now()) {

            stats.expiredCacheRemoved++;

            logger.log(`Removing expired cache: ${node.domain}:${node.type}`);

            cache.remove(node.domain, node.type);

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