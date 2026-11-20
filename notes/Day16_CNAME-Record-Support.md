## Day 16 Notes:-


## Concepts Learned:-

**1. Recognized CNAME queries**
- DNS Type 5
- Example:
www.github.com → CNAME → github.com


**2. Parsed CNAME responses**
- Updated parseAnswers()
- Extracted CNAME target domain


**3. Created CNAME responses**
- Updated createDnsResponse()
- Encoded domain names using DNS label format


**4. Added CNAME caching**
- CNAME records are now stored in cache
- TTL is preserved


**5. Tested Cache MISS**
First request → Forwarded to Google DNS


**6. Tested Cache HIT**
   Second request → Returned directly from cache
Successful test
node dnsClient.js www.github.com CNAME
First request:
Cache MISS
Forwarding request...
Saved 1 CNAME record(s) to cache
Second request:
Cache HIT
And your DNS statistics confirmed:
Total Requests: 2
Cache Hits: 1
Cache Misses: 1
Forwarded Requests: 1
Important thing we discovered
Not every domain has a CNAME record.
For example:
www.youtube.com
returned no CNAME records:
[]
That is a valid DNS response and not an error in our server.