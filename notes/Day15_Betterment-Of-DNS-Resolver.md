## Day 15 Notes:-

## Concepts Learned:-

**1. Multiple DNS Records**
Previously, we were mainly dealing with a single DNS record.But DNS responses can contain multiple records of the same type.
For example:
google.com
A records:
142.250.118.100
142.250.118.101
142.250.118.102
142.250.118.113
...
Therefore, instead of storing:
data = "142.250.118.100";
we now support:
data = [
    "142.250.118.100",
    "142.250.118.101",
    "142.250.118.102"
];
Why?
A DNS server may return several IP addresses for:
- load balancing
- redundancy
- geographic distribution
- availability


**2. Filtering Records by Requested Type**
When an upstream response comes back, we parse all answers:
const answers = dnsParser.parseAnswers(response);
Then we select only the records matching the requested type:
const records = answers.filter(
    answer => answer.type === recordType
);
For example, if the client asks:
google.com A
we only keep:
A
A
A
A
and ignore:
AAAA
CNAME
MX
...


**3. Storing Multiple Records**
We extract the data:
const data = records.map(
    record => record.data
);
So:
records
   ↓
[
  { type: A, data: IP1 },
  { type: A, data: IP2 },
  { type: A, data: IP3 }
]
becomes:
[
    IP1,
    IP2,
    IP3
]
This array is then stored in the cache.


**4. A and AAAA Are Different**
This is extremely important.
A record
Maps a domain to an IPv4 address.
Example:
google.com → 142.250.206.78
IPv4:
142.250.206.78
AAAA record
Maps a domain to an IPv6 address.
Example:
google.com → 2404:6800:4007:817::200e
IPv6:
2404:6800:4007:817::200e
Therefore:
google.com A
and
google.com AAAA
must have separate cache entries.


**5. Cache Key**
We therefore use:
const key = `${domain}:${type}`;
For example:
google.com:A
google.com:AAAA
github.com:A
amazon.com:A
This prevents an IPv4 result from accidentally being returned for an IPv6 request.


**6. TTL — Time To Live**
TTL tells us:
How long a DNS record can remain cached.
For example:
TTL = 300
means:
300 seconds
= 5 minutes
Instead of storing only the TTL, we calculate an expiration time:
Date.now() + (ttl * 1000)
For example:
Current time = 10:00:00
TTL = 60 seconds
expiresAt = 10:01:00


**7. Why We Store expiresAt**
Suppose:
TTL = 60
and 20 seconds have passed.
We shouldn't return:
TTL = 60
because only 40 seconds remain.
Instead:
const remainingTTL =
    Math.max(
        0,
        Math.floor(
            (cachedEntry.expiresAt - Date.now()) / 1000
        )
    );
So the client sees something like:
Original TTL: 60
after 10 sec:
TTL: 50
after 20 sec:
TTL: 40
after 30 sec:
TTL: 30
This is how a proper DNS cache behaves.


**8. LRU Cache**
LRU means:
Least Recently Used
Our cache has a limited capacity.
Currently:
CACHE_CAPACITY: 3
Suppose we have:
A
B
C
and the cache is full.
If we access:
A
the order becomes:
A
B
C
where A is now the most recently used.
If we then insert:
D
the least recently used entry is removed.


**9. LRU Data Structure**
We implemented LRU using:
HashMap + Doubly Linked List
HashMap
Provides fast lookup:
domain:type → Node
Doubly Linked List
Maintains usage order:
HEAD
 ↓
MRU
 ↓
...
 ↓
LRU
 ↓
TAIL
This combination gives efficient cache operations.


**10. addToFront()**
When a node is newly inserted or accessed, we place it at the front.
addToFront(node)
Conceptually:
Before:
HEAD → A → B → TAIL
Add C:
HEAD → C → A → B → TAIL
C is now the most recently used.


**11. moveToFront()**
When an existing cache entry is accessed:
moveToFront(node)
We:
1. Remove node
2. Add node to front
Example:
Before:
HEAD → A → B → C → TAIL
Access C.
After:
HEAD → C → A → B → TAIL
So C becomes MRU.


**12. Removing the LRU Entry**
The least recently used node is:
const lru = this.tail.prev;
Because the node immediately before TAIL is the oldest entry.
Then:
this.removeNode(lru);
and:
this.cache.delete(key);


**13. Cache get()**
When we request:
cache.get(domain, type)
we first create:
const key = `${domain}:${type}`;
Then:
const node = this.cache.get(key);
If it doesn't exist:
return null;
If it exists:
this.moveToFront(node);
This is important because accessing an item makes it recently used.


**14. Cache put()**
When adding a new entry:
Is entry already present?
       │
   ┌───┴───┐
  YES      NO
   │        │
Update    Cache full?
          │
       ┌──┴──┐
      YES    NO
       │      │
 Remove      Add
 LRU         node
This gives us proper LRU behavior.


**15. Expired Cache Cleanup**
Even though we check expiration when retrieving an entry, expired entries can remain inside the cache.
Therefore we periodically clean them.
setInterval(() => {
    cleanupExpired(logger, stats);
}, config.CACHE_CLEANUP_INTERVAL);
Current configuration:
CACHE_CLEANUP_INTERVAL: 10000
which means:
10 seconds


**16. Cleanup Process**
We iterate through:
cache.getAllNodes()
and check:
if (node.expiresAt < Date.now())
If expired:
cache.remove(
    node.domain,
    node.type
);
And update:
stats.expiredCacheRemoved++;
We verified this successfully during testing.


**17. Multiple Upstream DNS Servers**
Our configuration now contains:
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

]
So our DNS server doesn't depend on a single upstream provider.


**18. DNS Fallback**
The forwarding flow is:
Client
   ↓
Our DNS Server
   ↓
Google DNS
   │
   ├── Success → return response
   │
   └── Timeout
         ↓
     Cloudflare
         │
         ├── Success → return response
         │
         └── Timeout
               ↓
             Quad9
We actually tested this.
You saw:
Google DNS DNS timed out.
Trying Cloudflare DNS...
Cloudflare DNS responded successfully.
This is an important reliability feature.


**19. Statistics Manager**
We maintain:
const stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    blockedRequests: 0,
    forwardedRequests: 0,
    expiredCacheRemoved: 0
};
Meaning
Statistic => Meaning
totalRequests => Total DNS requests received
cacheHits => Requests served from cache
cacheMisses => Requests not found in cache
blockedRequests => Requests blocked by blocklist
forwardedRequests => Requests sent to upstream DNS
expiredCacheRemoved => Expired cache entries removed


**20. Cache Hit Rate**
We calculate:
Example:
Total Requests = 10
Cache Hits = 7
Therefore:
Hit Rate = 70%
The dashboard displays this visually using a progress bar


**21. DNS Dashboard**
We created a web dashboard using Express.
It runs on:
http://localhost:3000
The dashboard displays:
🚀 DNS SERVER DASHBOARD
Total Requests
Cache Hits
Cache Misses
Blocked Requests
Forwarded Requests
Expired Cache Removed


**22. Recent DNS Requests**
We also added request history.
For example:
Domain        Type       Status
---------------------------------
google.com    A          FORWARDED
google.com    A          CACHE HIT
github.com    A          FORWARDED
This makes it much easier to understand what the resolver is actually doing.


**23. Live Logs**
The dashboard also displays logs such as:
Requested Domain: google.com
Requested Record Type: A
Cache MISS
Forwarding request...
Google DNS responded successfully.
Saved 6 A record(s) to cache
Response sent to client
This is useful for debugging and monitoring.


**24. /api/stats**
The dashboard now has an API endpoint:
/api/stats
It returns JSON containing:
{
    stats: stats,
    logs: logs
}
The browser can request this endpoint to get the latest server state.


**25. Live Dashboard Updates**
Instead of refreshing the whole webpage, JavaScript periodically calls:
fetch("/api/stats")
every:
2 seconds
Then it updates:
Statistics
    ↓
Cache hit rate
    ↓
Recent requests
    ↓
Live logs
without reloading the page.
This is much closer to a real monitoring dashboard.



## Complete Day 15 Architecture
The complete flow now looks like:
                     ┌─────────────────────┐
                     │      Dashboard      │
                     │                     │
                     │ Stats               │
                     │ Recent Requests     │
                     │ Cache Hit Rate      │
                     │ Live Logs           │
                     └──────────▲──────────┘
                                │
                           /api/stats
                                │
                                │
Client ──────→ DNS Server ──────┼────────→ Cache
                  │             │             │
                  │             │             ├── LRU
                  │             │             ├── TTL
                  │             │             └── A/AAAA
                  │
                  ├── Blocklist
                  │
                  └── Forwarder
                         │
              ┌──────────┼──────────┐
              ↓          ↓          ↓
           Google    Cloudflare   Quad9



## INTERVIEW NOTES :-

*Why do we need caching in DNS?*
To avoid repeatedly contacting upstream DNS servers for the same domain and to reduce latency and network traffic.

*Why do we need TTL?*
TTL determines how long a DNS record can safely remain cached before it needs to be refreshed.

*Why use LRU?*
Because cache capacity is limited. LRU allows us to remove the entry that has been unused for the longest time.

*Why use both a Map and linked list?*
The Map provides fast lookup, while the doubly linked list maintains the order of recently used entries.

*Why is the cache key domain:type?*
Because:
google.com:A
and:
google.com:AAAA
represent different DNS records and must not interfere with each other.

*Why do we store expiresAt instead of just TTL?*
Because TTL continuously decreases with time. expiresAt allows us to calculate the remaining TTL accurately.

*Why use multiple upstream DNS servers?*
For reliability. If one upstream DNS server times out, another can be tried.

*What happens on a cache hit?*
Client request
      ↓
Cache lookup
      ↓
Entry exists + not expired
      ↓
Move entry to front
      ↓
Calculate remaining TTL
      ↓
Return response

*What happens on a cache miss?*
Client
  ↓
Cache MISS
  ↓
Forward to upstream DNS
  ↓
Receive response
  ↓
Parse records
  ↓
Save to cache
  ↓
Send response to client

*Why did we build the dashboard?*
To monitor the DNS resolver's behavior in real time instead of relying only on terminal logs.