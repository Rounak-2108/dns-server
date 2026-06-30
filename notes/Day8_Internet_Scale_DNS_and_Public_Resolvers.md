## Day 8 Notes:- 

## Concepts Learned :-

**Why public DNS Resolver Exists?**
-> If every device on Earth performed recursive DNS resolution independently, the DNS infrastructure would recieve enormous amounts of unnecessary traffic. Instead, users rely on public recursive resolvers suchas:-                                                                        * Google DNS(8.8.8.8)                                                                               * Cloudflare DNS(1.1.1.1)                                                                           * Quad9                                                                                             * OpenDNS                                                                                           These resolvers perform DNS lookups on behalf of millions of users and share cached results.

**How public DNS Resolvers Work?**
-> Normal User Flow:- Browser->Google DNS->Answer                                                   When Cache Miss occurs:- Browser->Google Dns->Root Server->TLD Server->Authoritative Server->Answer The resolver stores the answer in cache and reuses it for future requests.

**Why Public DNS Resolvers are fast?**
-> Public DNS resolvers are fast because they rely heavily on caching. Example:- github.com->140.82.121.3   After first lookup:- Future request becomes: Cache Hit->Immediate Response.   The resolver avoids contacting:-                                                                                 * Root Servers                                                                                      * TLD Servers                                                                                       * Authoritative Servers                                                                             for every requests 

**Massive Shared Caching:-**
-> Suppose:- 100,000 users request: github.com    Without caching: 100,000 recursive lookups       With caching: 1 recursive lookup -> 99,999 cache hits                                               Caching dramatically reduces DNS infrastructure load.

**Anycast:-**
-> Anycast allows many physical servers to share the same IP address. Example:- Google Dns:8.8.8.8 may actually represent:                                                                             * Server in Canada                                                                                  * Server in Germany                                                                                 * Server in Japan                                                                                   * Server in Australia                                                                               All advertisethe same IP address.                                                                   Internet routing automatically directs users to the nearest available server.

**Benifits of Anycast:-**
-> * Lower Latency:- Users connect to nearby DNS server instead of distant servers. Example:-  Indian User->Nearby DNS Server instead of: India->Server in another continent.                      * Improved Reliability:- If one fails: Traffic automatically shifts to another server. No DNS reconfiguration is required.                                                                        * Better Scalability:- Traffic is distributed across many servers rather than concentrated on a single machine.                                                                                     * Redundancy:- Redundancy means maintaining multiple copies of critical infrastrucutre. Example:- Google DNS runs on many servers around the world. If one machine fails:-                            Other servers continue serving requsts.                                                             Redundancy improves:- Availability, Reliability, Fault Tolerance                                    * Load Balancing :- Load Balancing distributes requests among multiple servers. Example:- 1,000,000 Requests Instead of: Server A->1,000,000 Use:- Server A->250,000   Server B->250,000  Server C->250,000   Server D->250,000 .  This prevents individual servers from becoming overloaded.

**Independent Resolver Caches:-**
-> Different DNS providers maintain seperate caches. Example:- Google DNS Cache ≠ Cloudflare DNS Cache. If Google DNS learns: github.com->140.82.121.3  Cloudflare DNS does not automatically know this information. Cloudflare performs its own recursive lookup and stores the result in its own cache.

**Why Different DNS Providers May Return Different Results?**
-> Resolvers maintain independent caches with independent TTL expiration times. Example:- Google cache expires at 10:05   Cloudflare cache expires at 10:07   Google may refresh the record earlier and return a newer answer. Temporary differences can occur even when both resolvers are functioning correctly.

**Cache Capacity Challenges:-**
-> DNS resolver caches have finite memory. When cache space becomes limited:-                       Resolvers must decide:-                                                                             * What to keep                                                                                      * What to remove                                                                                    This process is called cache eviction.

**Cache Eviction:-**
-> Cache Eviction removes records to free memory. Priority is generally:                            1. Expired Records:- Records whose TTL has expired provide no value and should be removed first.    2. Low Value Records:- Records that are rarely used may be removed when space is required.

**Least Recently Used(LRU):-**
-> LRU stands for Least Recently Used. Idea:- Recently Used->Likely Useful->Keep    Not Recently Used->Less Useful->Remove   LRU is one of the most common cache eviction stratergies.

**Frequency vs Recency:-**
-> Resolvers may consider:-                                                                         *Frequency:-* How often a record is requested. Example:- google.com Millions of request per day     *Recency:-* How recently a record was accessed. Example:- A domain requested a few seconds ago is likely to be requested again soon.

**TTL and Cache Refresh:-**
-> Cache records remain valid only until TTL expiration. Example:- TTL = 300seconds  After expiration: Cache Entry Expires->Fresh Recursive Lookup->New Record Stored .                        This prevents stale data from being served indefinitely.


## CONNECTION WITH PROJECT:-

*My DNS server currently uses:-*
-> * In-memory cache                                                                                * TTL expiration                                                                                    * Cache hit detection                                                                               * Cache miss handling                                                                               Large public DNS resolvers use the same principles but at Internet scale. The main differences are: * Larger caches                                                                                     * Global infrastructure                                                                             * Anycast networking                                                                                * Load Balancing                                                                                    * Redundancy


## Engineering Insights:-

*Caching Enables Internet Scale:-*
-> Without caching:- Every request->Root->TLD->Authoritative                                        DNS infrastucture would be overwhelmed.                                                             Caching is one of the primary reasons DNS can scale globally.

*Not All Cached Data is equally valuable:-*
-> Frequently accessed records provide significantly more value than rarely accessed records. Resolvers should prioritize retaining high-value records.

*DNS is a Distributed System:-*
-> Google DNS is not a single server. It is a globally distributed network of servers working together through:-                                                                                  * Anycast                                                                                           * Load Balancing                                                                                    * Redundancy                                                                                        * Shared Architecture 


## INTERVIEW NOTES:- 

*Which is Google DNS Fast?*
-> Google DNS uses massive caching, Anycast routing, load balancing, and globally distributed infrastructure to reduce latency and minimize recursive lookups.

*What is Anycast?*
-> Anycast is a networking technique where multiple physical servers advertise the same IP address. Internet routing automatically directs users to the nearest available server.

*What is Redundancy?*
-> Redundancy is the use of multiple copies of critical infrastructure so that service continues operating even if individual components fail.

*Why do Public DNS Resolvers cache results?*
-> Caching reduces latency, decreases recursive lookups, lowers infrastructure load, and improves scalability.

*Does Google DNS share its cache with Cloudflare DNS ?*
-> No. Each DNS provider maintains its own independent cache and performs its own recursive lookups when cache misses occcurs.

*What is LRU?*
-> Least Recently Used (LRU) is a cache eviction strategy that removes entries which have not been accessed recently, preserving more valuable cached records.

*What Happens When A DNS Record's TTL Expires?*
-> The resolver treats the cached entry as expired, performs a fresh recursive lookup, retrieves the latest information, and updates the cache.

*Why shouldn't all cached DNS records be treated equally?*
-> Different records provide different levels of value. Frequently requested domains generate many cache hits and significantly reduce recursive lookups. Rarely accessed records consume memory while providing little benefit. Therefore resolvers use cache eviction policies such as LRU to preferentially retain high-value entries and remove low-value ones when space is limited.

*What should a DNS resolver do when its cache becomes full?*
-> The resolver should evict entries that provide the least value. Expired records should be removed first because they are no longer valid. If additional space is needed, cache eviction policies such as Least Recently Used (LRU) can remove records that have not been accessed recently while preserving frequently requested domains.