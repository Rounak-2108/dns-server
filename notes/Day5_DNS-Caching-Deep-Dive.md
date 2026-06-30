## Day 5 Notes:-

## Concepts Learned:-

**What is Caching?**
->Caching is the process of storing previously retrived or computed data so it can be reused later without performing the same operation again. Instead of repeatedly asking upstream DNS server for the same domain, a DNS cache stores the answer and serves future requests directly from memory.

**Why Does Caching Exist?**
-> Without caching , every DNS request would need to be forwarded to an upstream resolver. Example:-(github.com? -> Google DNS   github.com? -> Google DNS  github.com? -> Google DNS).This cause unnecessary work because the answer is often the same. Caching alow DNS server to:-                 *Reduce latency                                                                                     *Reduce network traffic                                                                             *Reduce upstream DNS load                                                                           *Improve scalability                                                                                *Improve performance

**Cache HIT:-**
-> A cache Hit occurs when the requested domain already exists in the cache and its TTL has not expired. Example(github.com? -> Found in Cache -> Return Cached IP). No upstream DNS query is needed. Cache Hits are fast and efficient.

**Cache Miss:-**
-> A Cache Miss occurs when:-                                                                       * The domain is not present in the cache                                                            * The cached record has expired                                                                     Example:-(github.com? -> Not Found in Cache -> Query Google DNS -> Store Result -> Return Response).Cache Misses are slower because DNS Lookup must be performed.

**TTL and Cache Freshness:-**
-> TTL(Time to Live) determines how long a cached DNS record remains valid. Example:- TTL = 300seconds means A cached record may be reused for 5 minutes. After Expiration:-                    * The record is considered invalid.                                                                 * A new DNS query must be performed.                                                                TTL helps balance:-                                                                                 * Performance                                                                                       * Data Freshness

**Stale Data:-**
-> Stale Data refers to outdated information stored in the cache. Example:- Cached IP: 20.207.73.82 Actual Current IP: 140.82.121.3 . The cache continues serving the old IP until the TTL expires. This is the primary tradeoff introduced by caching.

**Caching Tradeoff:-**
-> Caching improves performance but sacrifices immediate freshness. A cache does not automatically know when the upstream data changes. Instead it relies on TTL expiration. Tradeoff:- Fast Response  -> Possibilty of Stale Data.


## CONNECTION WITH PROJECT:- 

*How My DNS Cache Works?*
-> When a DNS response is received, my server stores:                                          Domain Name                                                                                       DNS Response Packet                                                                               Expiration Time Example:                                                                                        cache["github.com"] = {                                                                       packet,expiresAt                                                                                           }                                                                                                This allows future requests to be answered directly from memory.

*Cache Hit Logic:-*
-> MY DNS server checks:-                                                                           if (                                                                                            cachedEntry &&                                                                                      cachedEntry.expiresAt > Date.now())                                                                 If true:-                                                                                           * Cache Hit                                                                                         * Return cached response                                                                            This avoids contacting Google DNS.

*Cache Misses Logic:-*
-> If:                                                                                              cachedEntry === undefined                                                                           or                                                                                                  cachedEntry.expiresAt <= Date.now()                                                                 Then:-                                                                                              * Cache Miss                                                                                        * Forward request to upstream DNS                                                                   * Store fresh response 

*Why TTL-Based Expiration Is Necessary?*
-> Without TTL expiration:                                                                       *Old IP addresses may remain forever                                                              *DNS records may become outdated                                                                *Users may be directed to incorrect servers                                                        TTL ensures cached records are periodically refreshed.

*Why The Cleanup Thread Exists?*
-> My DNS server periodically removes expired cache entries.Purpose:                                                                                            *Prevent memory growth                                                                         *Remove unused records                                                                         *Improve long-term resource usage                                                                   Without cleanup:                                                                             *Expired records would remain in memory                                                            *RAM usage would continuously increase                                                             The DNS server would still function correctly because TTL checks prevent stale records from being served, but memory consumption would become a problem.

*Scalability Benefits:-*
-> Caching dramatically reduces the number of upstream DNS queries. Example:-                       Without Cache:- 1000 Requests -> 1000 Upstream DNS Queries                                          With Cache:- 1000 Requests -> 1 Upstream DNS Query -> 999 Cache Hits                                Benifits:-                                                                                          * Lower network traffic                                                                             * Reduced upstream server load                                                                      * Faster responses                                                                                  * Better scalability


## INTERVIEW NOTES:-

*What is a Cache Hit?*
-> A Cache Hit occurs when requested data is found in the cache and is still valid. The server can immediately return the cached response without contacting the upstream resolver.

*What is a Cache Miss?*
-> A Cache Miss occurs when requested data is not found in the cache or has expired. The server must perform a fresh DNS lookup and then store the result.

*Why si Caching important?*
-> Caching improves performance by avoiding repeated work. It reduces latency, lowers network traffic, decreases resource usage, and improves scalability.

*Why Doesn't DNS Cache Data Forever?*
-> DNS records can change over time. Caching forever would result in stale data and incorrect IP address. TTL ensures cached records are periodically refreshed.

*What problems does Caching Introduce?*
-> Caching introduces:-                                                                             * Stale Data                                                                                        * Memory Growth                                                                                     * Cache Invalidation Challenges                                                                     These issues must be managed using TTLs and cleanup mechanisms.

*Why did you add Caching To Your DNS Server?*
-> I added caching to reduce repeated DNS lookups. Frequently requested domains can be served directly from memory, reducing latency, lowering network traffic, decreasing upstream DNS load, and improving scalability.

*What challenges did you face when adding DNS caching?*
-> While caching significantly reduced lookup latency and upstream DNS traffic, it introduced challenges such as stale data and memory management. I used TTL-based expiration to prevent outdated records from being served and implemented a periodic cleanup process to remove expired entires and prevent unbounded memory growth.

*Why did you implement a cache cleanup thread?*
-> The DNS server already checks TTL before serving cached entries, so expired entries would not be returned. However, without periodic cleanup, expired records would continue occupying memory indefinitely. The cleanup thread removes stale entries to prevent memory growth and maintain efficient resource usage over time.
