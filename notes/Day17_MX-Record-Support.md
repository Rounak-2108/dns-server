## Day 17 Notes:- 


## Concepts Learned:-

**1. MX Records**
An MX record tells us which mail servers handle email for a domain.
For example:
gmail.com

Priority 5  → gmail-smtp-in.l.google.com
Priority 10 → alt1.gmail-smtp-in.l.google.com
Priority 20 → alt2.gmail-smtp-in.l.google.com
...
The lower the priority number, the more preferred the server.
An MX record therefore needs two pieces of information:
{
    priority: 5,
    data: "gmail-smtp-in.l.google.com"
}
This is why MX couldn't simply use the same cache representation as A records.


**2. DNS Record Type 15**
You learned that DNS assigns numerical type codes:
A       = 1
CNAME   = 5
MX      = 15
AAAA    = 28
The client creates the query using:
queryType = 15;
The server recognizes:
else if(queryType === 15) {
    recordType = "MX";
}


**3. MX Parsing**
The MX record's RDATA contains:
2 bytes → Preference/Priority
remaining → Mail Server Domain
So the parser extracts:
{
    type: "MX",
    ttl,
    priority,
    data: exchangeDomain
}
This is a nice example of how different DNS record types have different RDATA structures.


**4. Why We Changed the Cache**
For A:
[
    "142.251.221.174"
]
For MX:
[
    {
        priority: 40,
        data: "alt4.gmail-smtp-in.l.google.com"
    },
    {
        priority: 5,
        data: "gmail-smtp-in.l.google.com"
    }
]
If we had stored only:
[
    "alt4.gmail-smtp-in.l.google.com",
    "gmail-smtp-in.l.google.com"
]
we would have lost the MX priority.
That's why your cache now preserves the complete record information.


**5. DNS Error Handling**
This was another major improvement.
Previously:
Upstream DNS fails
       ↓
Server throws error
       ↓
Client waits
       ↓
Client timeout

Now:
Upstream DNS fails
       ↓
Server catches error
       ↓
createErrorResponse()
       ↓
RCODE = 2
       ↓
SERVFAIL
       ↓
Client receives response
This is much closer to how a real DNS server behaves.


**6. DNS RCODE**
You learned that the DNS response's flags contain a 4-bit response code.
You extract it with:
const flags = msg.readUInt16BE(2);
const rcode = flags & 0x000F;
The important codes are:
0 → NOERROR
1 → FORMERR
2 → SERVFAIL
3 → NXDOMAIN
4 → NOTIMP
5 → REFUSED
Your client now correctly converts:
2
↓
SERVFAIL


**7. Separate Timeout Responsibilities**
We also discovered an important design issue during testing.
Originally:
DNS_TIMEOUT: 2000
was being used for both:
- upstream DNS timeout
- client timeout
That caused a problem because three upstream servers could take:
2 + 2 + 2 = ~6 seconds
while the client could give up after 2 seconds.
We fixed the design by separating them:
DNS_TIMEOUT: 2000,
CLIENT_TIMEOUT: 10000
So now:
DNS_TIMEOUT
     ↓
Individual upstream server

CLIENT_TIMEOUT
     ↓
Our DNS client waiting for our server
This is an important systems-design lesson:
Different operations can have different timeout requirements, even if they initially appear to be doing the same thing.



## Concepts to Remember:-

**MX**
"I added MX record support with DNS type 15. Since MX records contain both a priority and mail-server domain, I preserved both fields during parsing, caching, and response reconstruction."

**SERVFAIL**
"I added error handling for the case where all configured upstream DNS servers fail. Instead of leaving the client waiting until timeout, my server generates a DNS response with RCODE 2, which represents SERVFAIL."

**RCODE**
"The DNS response code is stored in the lower four bits of the flags field. I extract it using flags & 0x000F."

**Timeout design**
"I separated the upstream DNS timeout from the client timeout because multiple sequential upstream attempts can take longer than a single upstream timeout."

**Cache**
"For MX records, I can't cache only the domain because the priority is part of the record's semantics. I cache both priority and mail-server data."


## Complete Architecture By Day 17


                    ┌──────────────────┐
                    │    DNS Client    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    DNS Server    │
                    └────────┬─────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
            Blocklist                 Cache
                 │                       │
                 │                HIT ────┘
                 │
                 ▼
              MISS
                 │
                 ▼
          DNS Forwarder
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
    Google   Cloudflare   Quad9
       │
       ▼
    Response
       │
       ▼
   DNS Parser
       │
       ├── A
       ├── AAAA
       ├── CNAME
       └── MX
       │
       ▼
      Cache
       │
       ▼
  Response → Client



## INTERVIEW NOTES:-

*What was the main objective of Day 17?*
-> The main objective of Day 17 was to add MX record support to the DNS server and implement proper error handling when all upstream DNS servers fail.


*What is an MX record?*
-> An MX record stands for Mail Exchange record. It specifies the mail server responsible for receiving emails for a domain.
For example, when an email is sent to user@example.com, the sending mail server checks the MX records of example.com to determine which mail server should receive the email.
An MX record contains:
1. Priority
2. Mail server domain name


*What is the DNS record type number of an MX record?*
-> The DNS record type number of an MX record is 15.
For comparison:
1. A record = 1
2. CNAME record = 5
3. AAAA record = 28
4. MX record = 15
5. What information does an MX record contain?
An MX record contains two main fields:
1. Priority
2. Exchange or mail server domain n:10 mail.example.com
Here:
1. 10 is the priority.
2. mail.example.com is the mail server responsible for receiving emails.


*What does the priority value in an MX record mean?*
-> The priority value determines the preference of the mail server.
A lower priority number means a higher preference
5 mail1.example.com
10 mail3.example.com
The sending mail server will first try mail1.example.com because it has the lowest priority value.


*6. Why can a domain have multiple MX records?*
-> A domain can have multiple MX records to provide redundancy and fault tolerance.
If the primary mail server is unavailable, the sending mail server can try another mail server with a higher priority:
10 mail1.example.com
20 mail2.example.com
30 mail3.example.com
If mail1.example.com is unavailable, the sender tries mail2.example.com.


*Does a lower priority number mean lower importance?*
-> No. In MX records, a lower numerical value means higher preference.
For example, priority 10 is preferred over priority 20.
The word priority can be confusing because the smaller number represents the more preferred mail server.


*How did you represent an MX record in your project?*
-> An MX record was represented as an object containing the record type, TTL, priority, and mail server domain
example:-
{
    type: "MX",
    ttl: 300,
    priority: 10,
    data: "mail.example.com"
}


*What does data: "mail.example.com" mean?*
-> It means that mail.example.com is the mail server responsible for receiving emails. The data property stores the mail server domain name.


*How did you parse the MX priority?*
-> I used::const priority = response.readUInt16BE(offset);
The MX priority is stored as a 2-byte unsigned integer in big-endian format.


*How did you update the DNS client for MX records?*
-> I mapped the "MX" record type to DNS type number 15.:
else if(recordType === "MX"){
    queryType = 15;
}


*How did you cache MX records?*
-> I stored all MX records in an array. Each record was stored as an object containing its priority and mail server domain.:
[
    {
        priority: 10,
        data: "mail1.example.com"
    },
    {
        priority: 20,
        data: "mail2.example.com"
    }
]


*Why did you preserve the priority while caching MX records?*
-> Priority is necessary to determine the preferred mail server. If priority were not cached, the server could return incorrect mail server preferences.


*Why is the record type included in the cache key?*
-> The same domain can have different DNS record types. Therefore, the cache key uses both domain and type::
gmail.com:A
gmail.com:MX
This prevents different record types from conflicting.


*How did you generate an MX response?*
-> The response generator writes:
1. Record name pointer
2. Record type 15
3. Class IN
4. TTL
5. Data length
6. Two-byte priority
7. Encoded mail server domain


*How did you test MX support?*
-> I used::
node dnsClient.js gmail.com MX
The command returned multiple MX records with their priorities and TTLs. I repeated the query to verify that the second request was served from the cache.


*What is DNS error handling?*
-> DNS error handling is the process of detecting resolution failures and sending an appropriate error response to the client.


*What is upstream failover?*
-> Upstream failover means trying another DNS server when the current upstream server fails.
The server tries each configured upstream DNS server until one responds successfully or all servers fail.


*What happens if all upstream DNS servers fail?*
-> The forwarding function throws an error. The server catches it, creates a SERVFAIL response, and sends that response to the client.


*What is SERVFAIL?*
-> SERVFAIL means Server Failure. It indicates that the DNS server could not successfully complete the query.


*What is the response code for SERVFAIL?*
-> The DNS response code for SERVFAIL is 2.


*Why must the transaction ID be copied into the error response?*
-> The transaction ID allows the client to match the response with the original request. If the ID is different, the client may reject the response.


*How does the client detect SERVFAIL?*
-> The client reads the DNS flags and extracts the lowest four bit:
const flags = msg.readUInt16BE(2);
const responseCode = flags & 0x000F;
If the response code is `2`, the client displays the SERVFAIL message.


*What is the difference between SERVFAIL and NXDOMAIN?*
-> SERVFAIL means the DNS server failed to complete the query.
NXDOMAIN means the requested domain name does not exist.


*What is the difference between DNS_TIMEOUT and CLIENT_TIMEOUT?*
-> `DNS_TIMEOUT` is the time the server waits for one upstream DNS server.
`CLIENT_TIMEOUT` is the time the client waits for a response from the local DNS server.


*Why should CLIENT_TIMEOUT be greater than DNS_TIMEOUT?*
-> The server may try multiple upstream servers sequentially. Therefore, the client must wait long enough for the server to complete all upstream attempts.


*What was the main learning from Day 17?*
-> The main learning was that different DNS record types have different data structures. MX records contain both priority and a mail server domain, so both values must be preserved during parsing, caching, and response generation.


*Give a one-minute explanation of Day 17.*
->On Day 17, I added MX record support and improved DNS error handling in my DNS server project. MX records are used for email delivery and contain a priority value and a mail server domain name. I updated the parser to read the two-byte priority field and parse the exchange domain. I also updated the cache to preserve both priority and mail server information. The response generator was modified to create MX responses using record type 15. I also implemented SERVFAIL handling. If all upstream DNS servers fail, the server creates an error response with response code 2 and sends it to the client. I tested successful MX resolution, cache hits, and complete upstream failure.