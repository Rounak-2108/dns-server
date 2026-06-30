## Day 3 Notes:-


## INTERVIEW Questions:-

*Why did you have to copy the first two bytes when generating cached DNS responses?*
-> The first two bytes of a DNS packet contain the Trasaction ID. The client uses this ID to match the response with outstanding requests. When generating cached response, I had to copy the Transaction ID from the incoming request into response packet ; otherwise the client would reject the response because the IDs would not match.

*Why did you need a custom parseDomain() function in your DNS server?*
-> DNS packets do not store domain names as plain strings. They use a length-prefixed format where each label is preceeded by its length. I implemented parseDomain() to decode the DNS Question section and reconstruct domains like github.com from their binary representation.

*Why does parseDomain(msg, 12) starts at byte 12?*
-> the first 12 byte of a DNS packet are reserved for the header, which conatins metadata such as Transaction ID, Flags and record counts. The actual domain name is stored int the Question Section, which begins immediately after the header at byte 12. Starting the parser at byte 0 would cause it to misinterpret header fields as domain labels.

*How does a DNS packet store github.com?*
-> DNS packets do not store domain names as plain strings. Instead, they use a length-prefixed format.                                                                                             For example:                                                                                  github.com                                                                                        is stored as:                                                                                     [6][github][3][com][0]Where:                                                                                             6 indicates the length of "github"                                                                 3 indicates the length of "com"                                                                    0 marks the end of the domain name                                                                My parseDomain() function reads these labels one by one and reconstructs the human-readable domain name.

## CONCEPTS LEARNED:-

*DNS HEADER* -> A DNS Header is a fixed 12 byte section at the beginning of every DNS query and response message.It conatins essential control information that tells DNS client and servers how to process, route, and interpret the rest of the packet.
*Transaction ID* -> Transaction ID is a 16 bit random identifier assigned by a DNS Client (like your computer or router) to specific query.
*Flags* -> A 16-bit metadata field that dictates how a DNS message should be routed, processed, and responded to.
*Question Count* -> A 16-bit field in the DNS message header that specifies the number of entries in the Question section of the DNS packet.
*Answer Count* -> It is a 16-bit integer that indicates the number of resources records(RRs) in the answer section of DNS message.It tells the client how many valid response are provided for the domain name they queried.
*Domain Encoding* -> Domain Encoding in the DNS header represents domain names as a series of length-value pairs(or labels), rather than as a continuous readable string(eg:- example.com), to make parsing more efficient and eliminate the need for delimeter characters.


## CONNECTION WITH PROJECT:-

*Why msg.copy(response, 0, 0, 2) fixes Transaction IDs?*
-> The first two bytes of every DNS packet contain the Transaction ID. A DNS client uses this ID to match responses with the requests it previously sent. When I generated cached DNS response, I had to copy the Transaction ID from the incoming request into the response packet. This ensure that the client recognizes the response as belonging to its original request. If the Transaction IDs do not match, the client may ignore or reject the response.

*Why 0x8180 is used?*
-> 0x8180 is the value written into the DNS Flags field when creating a successful DNS response.    This flag value indicates:                                                                          i. QR  = 1 (This packet is a response)                                                              ii. RD = 1 (Recursion Desired)                                                                      iii. RA = 1 (Recursion Available)                                                                   iv. RCODE = 0 (No error / Success)                                                                  By writing 0x8180, my DNS server tells the client that the query was successfully processed and a valid response is being returned.

*Why Answer Count must match actual answer?*
-> The DNS header contains an Answer Count field that tells the client how many answer records exist in the packet.If the header says there is 1 answer, the packet must contain exactly 1 answer record. If the header says there are 0 answers but an answer record is present, the client may ignore the answer or treat the packet as malformed. The header acts as a contract between the sender and receiver, so the counts in the header must always match the actual contents of the packet.  