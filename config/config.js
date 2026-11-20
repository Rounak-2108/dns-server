module.exports = {
    PORT: 5300,
    DNS_SERVERS: [
        {
            name: "Google DNS",
            ip: "8.8.8.8",
            port: 53
        },
        
        {
            name: "Cloudflare",
            ip: "1.1.1.1",
            port: 53
        },

        {
            name: "Quad9",
            ip: "9.9.9.9",
            port: 53
        }
    ],
    DEFAULT_BLOCK_IP: "0.0.0.0",
    DEFAULT_TTL: 60,
    CACHE_CAPACITY: 3,
    CACHE_CLEANUP_INTERVAL: 10000,
    STATS_INTERVAL: 15000,
    BLOCKLIST_FILE: "blocklist.txt",
    DNS_TIMEOUT: 2000,
    CLIENT_TIMEOUT: 10000
};