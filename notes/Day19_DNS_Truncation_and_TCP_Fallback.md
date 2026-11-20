## Day 19 Notes:-


## Concepts Learned:-

**1. DNS truncation**
DNS truncation occurs when a DNS response is too large to be delivered completely in the response being sent over UDP.
- The DNS header contains a TC (Truncated) bit.
- TC = 1 indicates that the response was truncated.
- TC = 0 indicates that the response was not marked as truncated.
- When a resolver receives a truncated UDP response, it should retry the query using TCP.
Important: UDP is not universally limited to 512 bytes. EDNS(0) allows DNS messages to advertise larger UDP payload sizes.


**2. DNS header and TC bit**
DNS flags occupy bytes 2 and 3 of the DNS header.The TC bit is bit 9 of the 16-bit flags field.
In our project, we detect it using:
const flags = response.readUInt16BE(2);
const isTruncated = (flags & 0x0200) !== 0;
Explanation:
- readUInt16BE(2) reads two bytes starting at offset 2.
- 0x0200 is the bit mask for TC.
- Bitwise AND checks whether the TC bit is set.
- If the result is nonzero, the response is truncated.
Example:
DNS flags	TC bit	      Meaning
0x8180	       0	    Not truncated
0x8380	       1	    Truncated


**3. Why DNS uses TCP fallback**
When a DNS response is truncated over UDP, the resolver retries using TCP to obtain the complete response.
Flow in our project:
                    DNS client sends query
                            ↓
                    Resolver sends UDP request
                            ↓
                    Receive UDP response
                           ↓
                    Check TC bit
               ┌──────────┼──────────┐
            TC = 0                 TC = 1
              ↓                       ↓
          Return UDP               Retry using
          response                   TCP
                            ↓
                    Receive complete TCP response


**4. DNS over TCP**
DNS over TCP uses a 2-byte length prefix before the DNS message.
- First 2 bytes: length of the DNS message.
- Remaining bytes: actual DNS message.
- The prefix does not include its own 2 bytes.
- The length is represented as an unsigned, big-endian integer.
Example:
00 64
Hexadecimal 0x0064 = decimal 100.
Therefore, the DNS message is 100 bytes long, excluding the prefix.
Node.js implementation:
const lengthBuffer = Buffer.alloc(2);
lengthBuffer.writeUInt16BE(msg.length, 0);
const tcpMessage = Buffer.concat([
    lengthBuffer,
    msg
]);
Here:
- Buffer.alloc(2) creates a 2-byte buffer.
- writeUInt16BE() writes the message length.
- Buffer.concat() combines the prefix and DNS query.


**5. TCP stream handling**
TCP is a byte-stream protocol. It does not preserve application message boundaries.
For example, a 100-byte DNS message might arrive in chunks:
Chunk 1 → 20 bytes
Chunk 2 → 30 bytes
Chunk 3 → 52 bytes (including 2-byte prefix)
We cannot assume one data event contains the entire DNS message.
Therefore, we accumulate chunks:
buffer = Buffer.concat([buffer, chunk]);
First, read the length prefix:
expectedLength = buffer.readUInt16BE(0);
Then wait until:
buffer.length >= expectedLength + 2
Why add 2? Because the buffer also contains the 2-byte length prefix.
Finally, extract the DNS message:
const response = buffer.subarray(
    2,
    expectedLength + 2
);


**6. DNS response validation**
Our TCP fallback implementation performs several checks.
Validation	                   Purpose
Minimum 12-byte header	       Ensures basic DNS header exists
Transaction ID	               Ensures response belongs to original query
Length prefix	               Ensures complete message has arrived
TC bit	                       Ensures TCP response is not still truncated
Timeout	                       Prevents waiting indefinitely
Socket error handling	       Handles connection failures
Transaction ID validation:
if (
    response.readUInt16BE(0) !==
    msg.readUInt16BE(0)
) {
    finish(null);
    return;
}
The DNS response transaction ID must match the original query's transaction ID.


**7. TCP failover**
What happens if TCP fallback fails?
Our forwardTCP() returns null on failure.
The existing upstream loop then tries the next configured DNS server.
For example:
Google DNS
    |
    | UDP truncated
    | TCP failed
    v
Cloudflare DNS
    |
    | UDP response successful
    v
Return response
This improves resolver reliability.


**8. UDP vs TCP in DNS**
Feature	                          UDP	                                TCP
Connection	                     Connectionless	                       Connection-oriented
Data handling	                 Datagram	                           Byte stream
Length prefix	                 No DNS TCP prefix	                   2-byte prefix
Message boundaries	             Preserved	                           Must be reconstructed
Overhead	                     Generally lower	                   Generally higher
DNS use	                         Common for queries	                   Truncated responses and other cases



## INTERVIEW NOTES:-

*Q1. What is DNS truncation?*
-> DNS truncation occurs when a DNS response cannot be delivered completely in the response being sent. The DNS server sets the TC bit in the DNS header.

*Q2. What is the TC bit?*
-> TC stands for Truncated. It is a flag in the DNS header that indicates whether the DNS response was truncated.

*Q3. Why does DNS use TCP?*
-> DNS uses TCP when a complete response cannot be obtained over UDP, including when a UDP response is truncated. TCP is also used in other DNS scenarios.

*Q4. What is the DNS TCP length prefix?*
-> It is a 2-byte unsigned big-endian integer that specifies the length of the DNS message, excluding the prefix itself.

*Q5. What is the difference between UDP and TCP?*
-> UDP is connectionless and preserves datagram boundaries. TCP is connection-oriented and provides a reliable byte stream.

*Q6. Why can't we assume that one TCP data event contains the complete DNS response?*
-> Because TCP is a stream protocol. The operating system may deliver the data in multiple chunks.

*Q7. How do you determine when the complete TCP DNS response has arrived?*
-> Read the 2-byte length prefix, then accumulate incoming chunks until the buffer contains at least the expected DNS message length plus the 2-byte prefix.

*Q8. Why do we use readUInt16BE()?*
-> Because the DNS TCP length prefix is a 16-bit unsigned integer in network byte order, which is big-endian.

*Q9. Why do we validate the transaction ID?*
-> To ensure the received DNS response belongs to the original DNS query and not another request.

*Q10. What happens if the TCP connection times out?*
-> Our TCP helper resolves with null, allowing the existing upstream loop to attempt another DNS server.

*Q11. What is the maximum DNS message size over TCP?*
-> The 2-byte length field allows a DNS message of up to 65,535 bytes.

*Q12. Can a TCP DNS response also be truncated?*
-> Yes. Our implementation checks the TC bit even after receiving the TCP response. If it remains set, we reject that response.

*Q13. Why do we close the UDP socket before retrying over TCP?*
-> The UDP attempt is finished. Closing its socket and clearing its timeout prevents unnecessary resource usage and duplicate handling.

*Q14. What is DNS EDNS(0)?*
-> EDNS(0) extends DNS capabilities, including allowing clients and servers to advertise larger UDP payload sizes. It helps reduce truncation but does not eliminate the need for TCP.

*Q15. Is DNS always supposed to use UDP first and TCP only as fallback?*
-> No. UDP is common for ordinary DNS queries, but DNS can also use TCP directly. Modern DNS implementations are expected to support TCP.

*Q16. Suppose the DNS flags are 0x8380. Is the response truncated?*
-> Yes. The TC bit is set.

*Q17. Suppose the DNS TCP prefix is 00 30. What is the expected DNS message length?*
-> 0x0030 = 48 bytes, excluding the prefix.

*Q18. Suppose the TCP response arrives in chunks of 10, 20 and 30 bytes, and the prefix says 58 bytes. When can you process it?*
-> After receiving at least 60 bytes in total: 2 prefix bytes plus 58 DNS message bytes.

*Q19. What if the TCP response has a different transaction ID?*
-> Reject the response because it does not match the original query.

*Q20. How did you test TCP fallback in your project?*
-> I created a temporary local DNS server that deliberately returned a truncated UDP response with TC = 1. My resolver detected it, retried the same query over TCP, and successfully received a complete response. I verified the process using logs from both servers.


**Interview-ready project explanation**

"I implemented DNS truncation handling and TCP fallback in my custom DNS resolver.
Initially, the resolver forwards DNS queries using UDP. When an upstream server returns a response with the TC bit set, my resolver detects truncation and retries the original query over TCP.
Since DNS over TCP uses a 2-byte length prefix, I implemented message framing and TCP stream reassembly using Node.js buffers.
I also added response validation, including transaction ID matching, minimum message length checks, timeout handling and socket error handling.
To test this feature, I built a local mock DNS server that deliberately sends a truncated UDP response and a complete TCP response. The fallback worked successfully."