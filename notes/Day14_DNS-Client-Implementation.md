## Day 14 Notes:- 


## Concepts Learned:-

**1. DNS Client:-**                                                                                                                          We created dnsClient.js                                                                                  It can:                                                                                                  * Accept a domain from the command line                                                                  * Build a DNS query packet                                                                               * Generate a random Transaction ID                                                                       * Send the query over UDP                                                                                * Receive the DNS response                                                                               * Validate the Transaction ID                                                                            * Parse the A record                                                                                     * Display IP address and TTL                                                                             * Detect blocked vs resolved domains                                                                     * Handle request timeout                                                                                 Example:- node dnsClient.js github.com                                                                   Output:-                                                                                                 Domain: github.com                                                                                       Status: Resolved                                                                                         IP Address: 140.82.112.3                                                                                 TTL: 60

**2. Command-Line domain support:-**                                                                     We added: const domain = process.argv[2] || "google.com";                                                So: node dnsClient.js github.com                                                                        queries: github.com                                                                                     while: node dnsClient.js                                                                                 defaults to: google.com

**3. Timeout Handling:-**                                                                                We added a timeout using : setTimeout(...)                                                               So if the DNS server doesn't respond within the configured: DNS_TIMEOUT = 2000ms                         the client reports: DNS request Timed Out                                                                We actually tested this by intentionally pointing the client at the wrong port.

**4. Transaction ID Validation:-**                                                                       The client generates:                                                                                    const transactionId  = Math.floor(Math.random() * 65536);                                                and writes it into the DNS header.                                                                       When the response arrives:                                                                               const responseId = msg.readUInt16BE(0);                                                                  we compare:                                                                                              if(responseId !== transactionId)                                                                         This prevents the client from accepting a response belonging to a different DNS query.

**5. DNS Blocking test:-**                                                                               We tested: dobleclick.net which is in blocklist.                                                         The result was:                                                                                          Status: Blocked                                                                                          IP Address: 0.0.0.0                                                                                      TTL: 60                                                                                                  And server correctly showed                                                                              Blocked Requests: 1

**6. The big debugging lesson:-**                                                                        This was probably the most valuable part of Day 14.                                                      We experienced:                                                                                 Javascript heap out of memory                                                                            and initially didn't know why.                                                                           We systematically investigated everyfile and eventually we found the vulnerable parsing logic:           while(msg[i] !== 0)                                                                                      It assumed the incoming UDP packet was always a valid DNS packet.                                        When we sent:                                                                                            Hello DNS Server                                                                                         the parser attempted to interpret that malformed packet as a DNS domain. That could cause uncontrolled parsing. We changed it to defensive parsing with bounds checking and validation. Then we deliberetly sent the malformed packet again.                                                                         Result:                                                                                                  Invalid DNS packet: Invalid DNS label length                                                             and the server stayed alive.                                                                             That's a geniune robustness improvement.


## INTERVIEW NOTES:-

*Why did you create a separate DNS client?*
-> I created a custom UDP DNS client so I could test my DNS server directly without depending on a browser or operating-system DNS resolver. It lets me construct DNS packets, send them to my resolver, validate the response, and inspect records such as IP address and TTL.

*Why did you use UDP?*
-> DNS normally uses UDP because DNS queries are small and UDP has lower overhead than TCP. My resolver uses UDP for normal DNS communication, while DNS can fall back to TCP when necessary for larger responses or specific cases.

*What is a Transaction ID?*
-> The Transaction ID is a 16-bit identifier placed in the DNS header. The client generates it when sending a query and verifies that the response contains the same ID, which helps associate the response with the correct request.

*Why do you need a timeout?*
-> UDP does not guarantee delivery or a response. If the DNS server or upstream resolver doesn't respond, the client could otherwise wait indefinitely. I therefore added a configurable timeout so the request terminates cleanly.

*What happens when a blocked domain is requested?*
-> The DNS server checks the domain against the blocklist before checking the cache or forwarding the request. If it is blocked, the server immediately returns an A record containing 0.0.0.0 instead of forwarding the query upstream.

*How did you handle malformed DNS packets?*
-> I added bounds checking and DNS label validation to the parser. If a packet is malformed or truncated, the parser throws an error, and the server catches it, logs the invalid packet, and ignores that request instead of crashing.

*Why is defensive parsing important in a DNS server?*
-> DNS is a network-facing service, so it cannot assume incoming UDP packets are valid. Without validation, malformed input can cause invalid memory access, infinite parsing loops, crashes, or denial-of-service conditions.

*What did you learn from the heap-out-of-memory bug?*
-> Instead of immediately increasing Node.js's heap limit, I traced the problem through the server components. I eventually discovered that the DNS parser didn't properly validate malformed packets. Adding bounds checks and error handling fixed the underlying issue rather than masking it.

*Why do you register the UDP message listener before sending the DNS request?*
-> I register the listener before sending the request so that the client is ready to handle the response immediately. Since UDP communication is asynchronous and the response could arrive very quickly, registering the listener first prevents the possibility of missing the response.

*Why do we write the length before each label?*
-> The DNS protocol stores domain names as a sequence of labels. Each label is prefixed with its length so the receiver knows exactly how many bytes belong to that label. This eliminates the need to search for separator characters and makes parsing more efficient.

*Why did you use split(".")?*
-> DNS stores a domain as individual labels. For example, google.com consists of two labels: google and com. Using split(".") separates the domain into these labels so they can be encoded according to the DNS protocol.

*Why does DNS store domain names as 06 google 03 com 00 instead of "google.com"?*
-> DNS encodes domain names as a sequence of labels. Each label is preceded by its length, and the domain ends with a zero byte. This allows the parser to know exactly how many bytes belong to each label without searching for separator characters. It also makes the protocol compact and efficient.

*Why is the QR bit set to 0 in the client and 1 in the server?*
-> The QR (Query/Response) bit distinguishes DNS queries from DNS responses. A client sends a query, so it sets QR = 0. The DNS server sends a response after processing the request, so it sets QR = 1. This allows both sides to correctly interpret the type of DNS message.

*Why should the Transaction ID be random?*
-> The Transaction ID uniquely identifies a DNS request. If every request used the same ID, the client could not reliably match responses to requests, especially when multiple queries are in flight simultaneously. Using a random 16-bit ID also makes DNS spoofing attacks more difficult because an attacker has to correctly guess the Transaction ID to forge a valid response.

*Why did you use writeUInt16BE() instead of writeUInt16LE()?*
-> DNS uses Network Byte Order for all multi-byte fields, and Network Byte Order is Big Endian. Since the DNS protocol expects 16-bit values like the Transaction ID, Flags, and Question Count to be stored in Big Endian format, I used writeUInt16BE(). This also matches the parser, which reads these fields using readUInt16BE().

*What do you think is special about 512 bytes?*
-> Traditional DNS over UDP limits packets to 512 bytes (without EDNS0). Therefore, we allocate a 512-byte buffer, which is sufficient for constructing and receiving standard DNS packets. If a response exceeds this size, the DNS server sets the Truncated (TC) flag, and the client retries using TCP.

*Why did you use Buffer.alloc() instead of an array?*
-> DNS packets are binary data sent over the network. Node.js represents binary data using Buffer. A Buffer allows reading and writing bytes efficiently with methods like writeUInt16BE() and writeUInt32BE(), which are exactly what the DNS protocol requires. A normal JavaScript array stores JavaScript values rather than raw binary memory and is not suitable for constructing protocol packets.

*When you type:google.com  what do you think our client should send?*
-> We must send a properly formatted DNS packet because DNS is a protocol. Every DNS server expects requests in a standardized binary format defined by the DNS protocol. If we send plain text like "google.com", the server will not understand it. The packet contains metadata such as the Transaction ID, Flags, Question Count, and the Question Section, which allow the server to correctly process the request and send the corresponding response.
