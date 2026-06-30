## Day 4 Notes:-

## Concepts Learned:-

**DNS Response Structure :-**
-> A DNS response packet consist of:-                                                               *Header                                                                                             *Question Section                                                                                   *Answer Section                                                                                     The Answer Section contains the actual information requested by the client, such as the IP Address corressponding to a domain name.

**Components of a DNS Answer Records:-**
-> Every DNS answer contains:-                                                                      *NAME*:- Identifies which domain this answer belongs to. Eg-> "github.com".                         *TYPE*:- Specifies what kind of answer is being returned. Examples:-                                * A -> IPv4 Address                                                                                 * AAAA ->IPv6 Address                                                                               * MX -> Mail Server                                                                                 * CNAME -> Alias                                                                                    My DNS Server primarily handles A records.                                                          *CLASS*:- Usually set to IN(Internet). This indicates that the record belongs to the Internet DNS System.                                                                                             *TTL(Time to Live)*:- TTL specifies how long a DNS response can be cached before it must be discarded. Eg-> TTL=300 means the response can be cached for 300seconds(5 minutes). TTL prevents cache from keeping outdated information forever.                                                    *RDLENGTH*:- Specifies the size of answer data. For an IPv4 address: RDLENGTH = 4 because IPv4 address consists of 4 bytes.                                                                        *RDATA*:- Contains the actual answer data. Eg-> 20.207.73.82 is stored as four bytes:- 20       207      73        82


## CONNECTION WITH PROJECT:-

*Why TTL matters?*
-> My DNS cache uses TTL to determine when cached records expire . Eg-> Stored At: 10:00:00  TTL : 300 seconds  Expires At: 10:05:00  . After expiration the record is removed and a fresh DNS Query is sent.

*Why response.writeUInt32BE(60, offset) is used?*
-> This line writes the TTL value into the DNS Answer Section. It tells DNS Clients: "You may cache this response for 60 seconds."

*Why response.writeUInt16BE(4, offset) Is Used?*
-> This sets: RDLENGTH = 4 because an IPv4 address occupies exactly 4 bytes.

*DNS COMPRESSION*:-
-> DNS uses compression to reduce packet size. Instead of repeating the same domain name multiple times, DNS can store the domain once and reference it using a pointer. This reduces:-               *Packet Size                                                                                        *Bandwidth Usage                                                                                    *Transmission Overhead

*What does 0xC00C mean ?*
-> 0xC00C is a DNS compression pointer. It tells client: "Go to byte 12 and reuse the domain name stored there." Byte 12 is the beginning of the Question Section, where the original domain name is stored. Therefore:- 0xC00C effectively means:- Reuse the domain name from the Question Section.

*Why use Compression?*
-> Without Compression:                                                                             Question: github.com                                                                                Answer: github.com-> 20.207.73.82                                                                   The domain name is stored twice.                                                                    -> With Compression:                                                                                Question: github.com                                                                                Answer: Pointer-> github.com                                                                        The domain name is stored only once. This makes packet smaller and more efficient.

*Is Compression mandatory?*
-> NO. DNS packets can function correctly without compression. Compression is an optimization that reduces packet size and improves efficiency.The packet remains valid wether the domain name is repeated or referenced through a pointer.


## INTERVIEW NOTES:-

*What is TTL?*
-> TTL (Time To Live) is a field in a DNS answer that specifies how long a DNS record can be cached before it expires. It helps ensure that caches eventually refresh outdated information.

*Why is TTL important?*
-> Without TTL, DNS caches could keep outdated IP addresses forever.TTL ensures that changes made by domain owners eventually propagate across the Internet.

*What is DNS Compression?*
-> DNS Compression is a technique used to reduce packet size by replacing repeated domain names with pointers to previously stored domain names within the same packet.

*What is 0xC00C?*
-> 0xC00C is a DNS compression pointer.It points to byte 12 of the packet, where the domain name is stored in the Question Section.This avoids repeating the same domain name multiple times.

*Why is 0xC00C more efficient than storing the domain name again?*
-> Because the pointer occupies only 2 bytes, while a full domain name may require many more bytes.This reduces packet size, saves bandwidth, and improves transmission efficiency.