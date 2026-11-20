// ==============================
// STATS MANAGER
// ==============================

const stats = {

    totalRequests: 0,

    cacheHits: 0,

    cacheMisses: 0,

    blockedRequests: 0,

    forwardedRequests: 0,

    expiredCacheRemoved: 0,

    // ==============================
    // RECENT DNS REQUESTS
    // ==============================

    recentRequests: []

};

module.exports = stats;