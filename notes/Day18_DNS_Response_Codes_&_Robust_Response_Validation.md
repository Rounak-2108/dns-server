## Day 18 Notes:-


## Concepts Learned:-

**1. DNS Response Codes (RCODE)**
The DNS header contains a 4-bit RCODE field that tells the client the result of the query.
We extract it using:
const rcode = flags & 0x000F;
Important response codes:
RCODE	Name	Meaning
0	NOERROR	    Query completed successfully
1	FORMERR	    DNS query was malformed
2	SERVFAIL	Server failed to complete the query
3	NXDOMAIN	Domain name does not exist
4	NOTIMP	    Requested operation isn't supported
5	REFUSED	    Server refused the query
*Important distinction*
*NXDOMAIN is not the same as SERVFAIL.*
NXDOMAIN
-> This domain does not exist.
SERVFAIL
-> The DNS server couldn't successfully complete the query.
For example:-
node dnsClient.js definitely-does-not-exist.invalid A
returns:-
DNS Response Code: NXDOMAIN
Status: NXDOMAIN


**2. DNS Header Validation**
A DNS header is 12 bytes.
Before reading fields such as Transaction ID or flags, we check:-
if(msg.length < 12) {
    // Invalid response
}
This prevents operations such as:
msg.readUInt16BE(0)
from being performed on an incomplete DNS packet.


**3. Transaction ID Validation**
The client generates a random Transaction ID:
const transactionId = Math.floor(Math.random() * 65536);
It places it in the query:
packet.writeUInt16BE(transactionId, 0);
When a response arrives:
const responseID = msg.readUInt16BE(0);
We compare:
if(responseID !== transactionId) {
    console.log("Transaction ID mismatch. Ignoring Response!");
    return;
}
Why?
A DNS client may receive packets that aren't responses to its current query.
The Transaction ID helps associate:
Query
  ↓
Transaction ID = 48291
  ↓
Response
  ↓
Transaction ID = 48291
If the IDs don't match, we don't trust the response.
This is also one of the basic defenses against DNS spoofing.


**4. QR Flag Validation**
The DNS header contains the QR bit.
QR = 0 → Query
QR = 1 → Response
We extract it using:
const flags = msg.readUInt16BE(2);
const isResponse = (flags & 0x8000) !== 0;
If QR is not set:
if(!isResponse) {
    // Invalid packet
}
we reject the packet.


**5. Question Count Validation**
Our client sends exactly one question:
packet.writeUInt16BE(1, 4);
Therefore, we expect the response to contain one question:
const questionCount = msg.readUInt16BE(4);
if(questionCount !== 1) {
    // Reject
}
This prevents us from blindly parsing an unexpected question section.


**6. Validate the Question Itself**
We don't just check QDCOUNT.
We also verify that the response's question matches what we actually asked.
We extract:
const questionInfo = dnsParser.parseDomain(msg, 12);
Then we compare:
Response domain
        ↓
google.com
Our query
        ↓
google.com
We also verify:
- Domain name
- QTYPE
- QCLASS
For example:
Query:
google.com
TYPE = A
CLASS = IN
Response:
google.com
TYPE = A
CLASS = IN
        ↓
VALID
If something doesn't match:
console.log("Invalid DNS response: Question mismatch");


**7. DNS Resource Record Structure**
A DNS Answer record has:
NAME
TYPE
CLASS
TTL
RDLENGTH
RDATA
The fixed-size portion is:
TYPE      = 2 bytes
CLASS     = 2 bytes
TTL       = 4 bytes
RDLENGTH  = 2 bytes
Total = 10 bytes
Therefore we added:
ensureAvailable(
    response,
    offset,
    10,
    "answer record header"
);
before reading the fixed fields.


**8. RDLENGTH Validation**
RDLENGTH tells us how many bytes belong to RDATA.
We check:
ensureAvailable(
    response,
    offset,
    rdLength,
    "record data"
);
This prevents a malformed packet from claiming:
RDLENGTH = 50
when only 10 bytes actually remain.


**9. A Record Validation**
An A record contains an IPv4 address.
IPv4:
4 bytes
Therefore:
if(rdLength !== 4) {
    throw new Error("Invalid A record length");
}
Example:
8.8.8.8
 ↓ ↓ ↓ ↓
4 bytes


**10. AAAA Record Validation**
An IPv6 address contains:
16 bytes
Therefore:
if(rdLength !== 16) {
    throw new Error("Invalid AAAA record length");
}


**11. MX Record Validation**
An MX record contains:
Priority
+
Mail server domain name
The priority occupies:
2 bytes
So we require enough space for:
2-byte priority + domain name
We calculate:
const rdataEnd = offset + rdLength;
Then parse the exchange domain:
const exchangeInfo = parseDomain(
    response,
    offset + 2
);
Finally, we verify that the encoded domain doesn't exceed the MX RDATA boundary.


**12. CNAME Record Validation**
A CNAME contains a domain name.
We calculate:
const rdataEnd = offset + rdLength;
Then:
const cnameInfo = parseDomain(response, offset);
We calculate how many bytes were consumed by the encoded name and ensure they remain within the declared RDATA boundary.


**13. DNS Compression**
DNS uses name compression to avoid repeating domain names.
Instead of storing:
www.example.com
multiple times, a DNS response can use a pointer:
11xxxxxx xxxxxxxx
The first two bits 11 indicate a compression pointer.
Our parser detects it using:
if((length & 0xC0) === 0xC0)
The remaining 14 bits represent the pointer offset.


**14. Compression Pointer Safety**
We added several protections.
*A. Pointer must have two bytes*
if(i + 1 >= msg.length) {
    throw new Error("Invalid DNS compression pointer");
}
*B. Pointer cannot leave the packet*
if(pointer >= msg.length) {
    throw new Error(
        "Invalid DNS compression pointer: target outside packet"
    );
}
*C. Detect compression loops*
We maintain:
const visitedOffsets = new Set();
Before processing an offset:
if(visitedOffsets.has(i)) {
    throw new Error(
        "DNS compression pointer loop detected"
    );
}
visitedOffsets.add(i);
This prevents something like:
Pointer A → Pointer B
Pointer B → Pointer A
from causing an infinite loop.
*D. Domain must terminate*
We maintain:
let terminated = false;
When we encounter:
00
we set:
terminated = true;
After parsing:
if(!terminated) {
    throw new Error(
        "Invalid DNS domain: missing termination"
    );
}
Therefore, an incomplete domain name is rejected.


**15. Error Handling**
Our parser can throw an error when it encounters malformed data.
Instead of allowing that error to crash the client, dnsClient.js catches it:
let answers;
try {
    answers = dnsParser.parseAnswers(msg);
} catch(err) {
    console.log(
        "Invalid DNS response: Unable to parse answers."
    );
    console.log("Reason:", err.message);
    client.close();
    return;
}
This gives us a clean separation:
dnsParser
    ↓
Detect malformed packet
    ↓
throw Error
    ↓
dnsClient
    ↓
catch Error
    ↓
Report + close safely


**16. Unsupported Record Types**
Our parser currently understands:
A
AAAA
CNAME
MX
But DNS supports many other types.
If an unsupported type appears, we don't need to understand its RDATA to safely move past it.
We already know:
rdLength
so after validating the RDATA boundary:
offset += rdLength;
moves to the next record.
This is important because the parser shouldn't accidentally interpret unknown RDATA as another DNS record.



## Day 18 Architecture:-
DNS Response
     ↓
Check minimum 12-byte header
     ↓
Validate Transaction ID
     ↓
Validate QR = Response
     ↓
Validate Question Count
     ↓
Validate Domain + QTYPE + QCLASS
     ↓
Read RCODE
     ↓
Handle NXDOMAIN / SERVFAIL / etc.
     ↓
Parse Answer Records
     ↓
Validate RR Header
     ↓
Validate RDLENGTH
     ↓
Validate record-specific data
     ↓
Handle compression safely
     ↓
Return valid records



## INTERVIEW NOTES:-

*Q1. What is the DNS RCODE?*
-> RCODE is the response-code field in the DNS header. It indicates whether the DNS query succeeded or failed.
For example:
- 0 → NOERROR
- 2 → SERVFAIL
- 3 → NXDOMAIN
- 5 → REFUSED
In my client, I extract it using:
const rcode = flags & 0x000F;

*Q2. What's the difference between NXDOMAIN and SERVFAIL?*
-> NXDOMAIN means the queried domain name does not exist.
SERVFAIL means the DNS server couldn't successfully complete the query.
For example:
example-that-does-not-exist.invalid
        ↓
NXDOMAIN
Whereas an upstream failure in my resolver can result in:
SERVFAIL

*Q3. Why do you validate the Transaction ID?*
-> The Transaction ID allows the client to associate a DNS response with the query it sent.
If a response contains a different Transaction ID, I don't trust it and ignore it.
It also provides a basic defense against accepting an unrelated or spoofed response

*Q4. What is the QR bit?*
-> QR stands for Query/Response.
QR = 0 → Query
QR = 1 → Response
My client verifies that the received packet has QR set before processing it as a DNS response.

*Q5. Why do you validate QDCOUNT?*
-> My client sends exactly one DNS question, so it expects the response to contain one question.
If QDCOUNT is not 1, I reject the response because its question section doesn't match the structure I expect.

*Q6. Why isn't checking QDCOUNT alone enough?*
-> Because the response could still contain the wrong question.
Therefore, I also validate:
Domain
QTYPE
QCLASS
For example, if I requested:
google.com A IN
I don't want to accept a response whose question is:
google.com MX IN

*Q7. What is RDLENGTH?*
-> RDLENGTH specifies the number of bytes occupied by the RDATA portion of a DNS resource record.
I use it to determine how much data belongs to the current record and to prevent reading beyond the packet.

*Q8. Why must an A record have RDLENGTH = 4?*
-> Because an IPv4 address contains four bytes.
For example:
8.8.8.8
contains four 8-bit octets.
Therefore an A record with any RDLENGTH other than 4 is malformed.

*Q9. Why is AAAA RDLENGTH 16?*
-> IPv6 addresses contain 128 bits.
Since:
128 / 8 = 16 bytes
an AAAA record must have RDLENGTH equal to 16.

*Q10. How does DNS compression work?*
-> DNS can replace a repeated domain name with a pointer to an existing name elsewhere in the packet.
The pointer is represented by two bytes where the first two bits are 11.
This reduces packet size and avoids repeating domain names.

*Q11. What problem can occur with malicious compression pointers?*
-> A malformed packet could create a pointer loop.
For example:
Pointer A → Pointer B
Pointer B → Pointer A
Without protection, the parser could loop indefinitely.
I prevent this using a Set of visited offsets.

*Q12. Why do you use a Set for compression pointers?*
-> I store every offset visited while following compression pointers.
Before processing an offset, I check:
visitedOffsets.has(i)
If it's already present, I've encountered a loop and reject the packet.

*Q13. Why do you check whether the pointer is within the packet?*
-> A compression pointer contains an offset into the DNS message.
If that offset is outside the received buffer, following it would cause invalid memory access or parser errors.
Therefore I verify:
pointer < msg.length
before following it.

*Q14. Why do you check whether a domain name terminated?*
-> DNS domain names must eventually terminate with a zero-length label or successfully resolve through compression.
If the packet ends before that happens, the domain name is incomplete and the response should be rejected.

*Q15. Why use try...catch around parseAnswers()?*
-> The parser detects malformed DNS packets by throwing errors.
The client catches those errors so malformed responses don't crash the entire DNS client.
This separates responsibilities:
Parser → detect invalid data
Client → handle the error safely

*Q16. What happens if your DNS server receives a record type it doesn't support?*
-> The parser still reads the common resource-record fields, validates RDLENGTH, and skips the RDATA using:
offset += rdLength;
It doesn't attempt to interpret the unknown record's contents.
This allows it to safely continue parsing subsequent records.

*Q17. Why is blindly trusting an upstream DNS response dangerous?*
-> Because the upstream response could be malformed, corrupted, or potentially malicious.
If I blindly parse it, I could:
- read beyond packet boundaries,
- accept invalid records,
- enter a compression loop,
- crash the process,
- or potentially cache invalid information.
That's why my resolver validates the response before using or caching its records.
