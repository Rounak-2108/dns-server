## Day 10 Notes:-

## Concepts Learned:- 

DNS is one of the most important services on the Internet.

If attackers can manipulate DNS responses, they can redirect users to malicious websites, intercept traffic, steal credentials, or disrupt services. 

Day 10 focuses on understanding common DNS attacks and the defenses used to prevent them.

**DNS Spoofing:-** DNS Spoofing occurs when an attacker sends a fake DNS response that appears legitimate. Instead of returning the real IP address:- google.com -> 142.250.x.x  the attacker returns: google.com -> 6.6.6.6  The victim's browser trusts the response and connects to the attacker's server.                                                                                  *Impact:-*                                                                                          * Redirect users to malicious websites.                                                             * Credential theft                                                                                  * Phishing attacks                                                                                  * Traffic interception                                                                              *Real World Analogy:-*                                                                              Asking for the address of a building and receiving a fake address from a malicious person.

**Transaction ID:-**                                                                                DNS qeuries contain: Transaction ID stored in: Bytes 0-1 of DNS Header.                             *Purpose:-* Match responses with requests.   Example:-  Query: Transaction ID = 1234            Response: Transaction ID = 1234                                                                     The resolver accepts the response because IDs match.                                                *Security Importance:-*                                                                             Attackers must correctly guess the Transaction ID before a forged response can be accepted. Random Transaction IDs make spoofing more difficult.

**Why Random Transaction IDs Matter?**
Bad:                                                                                                Transaction IDs:                                                                                    1                                                                                                   2                                                                                                   3                                                                                                   4                                                                                                   5                                                                                                   Predictable.                                                                                        Attackers can guess future values.                                                                  Good:                                                                                               Transaction IDs:                                                                                    4893                                                                                                10593                                                                                               58211                                                                                               Random and difficult to predict.                                                                    *Interview Note:-*                                                                                  Random Transaction IDs increase uncertainity and reduce the probability of successful spoofing attacks.

**DNS Cache Poisoning :-**                                                                          Cache poisoning occurs when a forged DNS response is stored inside the resolver's cache. Example:  google.com -> 6.6.6.6   TTL = 86400

**Why DNS Cache Poisoning is worse than DNS Spoofing?**                                             DNS Spoofing: Affects one request                                                                   DNS Cache Poisoning: Affects every future request until cache expiration.                           *Impact:-*                                                                                          User1 -> Fake IP        User2 -> Fake IP      User3 -> Fake IP                                      All users recieve poisoned responses from cache.

**Connection to Day 5:-**                                                                           Caching improves performance.                                                                       Posioned caching spreads incorrect information efficiently.

**Source Port Randomization:-**                                                                     Resolvers often send DNS requests using random source ports. Example:-                              Request 1: Port 41234           Request 2: Port 58211            Request 3: Port 23117              *Security Benifit:-*                                                                                An attacker must correctly guess:-                                                                  * Transaction ID                                                                                    * Source Port                                                                                       instead of only the Transaction ID.                                                                 This significantly increases attack difficulty.                                                     *Interview Note:-*                                                                                  Source port randomization increases entropy and makes spoofing and cache poisoning attacks more difficult.

**Kaminsky Attack:-**                                                                               *Background:-*                                                                                      One of the most important DNS vulnerabilities discovered in 2008 by Dan Kaminsky.                   *Idea:-*                                                                                            Instead of sending one forged response:  Send thousands of forged responses. Each forged response uses different guesses for:                                                                         * Transaction ID                                                                                    * Source Port                                                                                       Eventually one guess may match.                                                                     *Why it was Dangerous?*                                                                             Successful cache poisoning could affect:-                                                           * ISPs                                                                                              * Universities                                                                                      * Enterprises                                                                                       * Large resolver infrastructures                                                                    Potentially impacting millions of users.                                                            *Industry Response:-*                                                                               Resolvers began using:                                                                              * Random Transaction IDs                                                                            * Random Source Ports                                                                               to increase unpredictability.

**TTL and Security:-**                                                                              Example:- Poisoned Record: google.com -> 6.6.6.6   TTL = 86400                                      *Why Attackers prefer Long TTLs?*                                                                   Long TTL means:-                                                                                    * Poison remains longer                                                                             * More users affected                                                                               * Fewer opportunities to refresh correct data                                                       *Connection To Day4:-* TTL controls cache lifetime.                                                 *Connection To Day10:-* TTL controls attack persistence

**DNS Amplification Attack:-**                                                                      A Distributed Denial of Service(DDoS) attack that abuses DNS servers to generate large amounts of traffic toward a victim. Example:- Attacker sends: 60-byte DNS Query   DNS Server responds: 4000-byte DNS Response  Amplification: 4000/60 = 67x     Attack Process: Attacker->Spoofs Victim IP->DNS Server->Large Response->Victim                                                              *Why DNS is Vulnerable?*                                                                            -> DNS commonly uses UDP. UDP does not verify source IP ownership.                                  *Impact:-*                                                                                          * Victims receive enormous traffic values.                                                          * Service becomes unavailable.                                                                      *Why UDP Enables Amplification?*                                                                    -> UDP is connectionless.                                                                           No:                                                                                                 * Handshake                                                                                         * Session Establishment                                                                             * Sender Verification                                                                               DNS server trusts the source IP contained in the packet. Attackers can spoof victim IP addresses.   *Connection to Day 2:-* UDP is fast and lightweight. Those same properties can also be abused.

**Open Resolver:-**                                                                                 A DNS resolver that accepts recursive queries from anyone on the Internet. Example:- Anyone -> DNS Resolver -> Recursive Resolution                                                                    *Security Risk:-*                                                                                   Attackers can abuse open resolvers for amplification attacks.

**Closed Resolver:-**                                                                               A resolver that only accepts recursive queries from authorized clients. Example:- ISP Customers -> Resolver -> Recursive Resolution                                                                    Unauthorized users are rejected.                                                                    *Benifits:-*                                                                                        * Reduced attack surface                                                                            * Less abuse potential                                                                              * Mitigates amplification attacks

**DNSSEC(Domain Name System Security Extensions):-**                                                *Problem Solved:-*                                                                                  Traditional DNS trusts responses based on:                                                          * Transaction ID                                                                                    * Source Port                                                                                       If attacker guess these values, forged responses may be accepted.                                   *DNSSEC Solution:-*                                                                                 Authoritative servers digitally sign DNS records. Resolvers verify signatures using public keys.    *High Level Process:-*                                                                              Authoritative Server->Private Key->Generate Signature   Resolver->Public Key->Verify Signature      *Result:-*                                                                                          If signature is valid: Accept response        If signature is invalid: Reject Response              *Benifits:-*                                                                                        * Protects against spoofing                                                                         * Protects against cache poisoning                                                                  * Verifies authenticity                                                                             * Verifies integrity                                                                                *Interview Note:-*                                                                                  DNSSEC uses cryptographic signatures to verify that DNS data was created by the authoritative server and was not modified in transit.           

**Security Evolution of DNS:-**                                                                     Original DNS:-                                                                                      Trust Responses->Transaction IDs Added->Random Transaction IDs->Source Port Randomization->DNSSEC   The DNS ecosystem evolved to become increasingly resistant to spoofing and cache poisoning attacks.


## Engineering Insights:- 

Performance Features can become Attack Vectors                                                      Caching: Performance Improvement -> Cache Poisoning Risk                                            UDP: Fast and Lightweight -> Amplification Risk                                                     TTL: Reduces Network Traffic -> Extends Poison Duration                                             Security Engineering often means balancing performance and safety.


## INTERVIEW NOTES:-

*What is DNS Spoofing?*
-> Providing a forged DNS response that redirects users to malicious destination.

*What is DNS Cache Poisoning?* 
-> Storing forged DNS data inside a resolver's cache.

*Why are Random Transaction IDs important?*
-> They make forged responses harder to predict and match.

*Why is Source Port Randomization useful?*
-> Attackers must correctly guess both the Transaction IDs and Source Port.

*What was Kaminsky Attack?*
-> A large scale DNS cache poisoning attack that relied on sending many forged responses to increase the chance of a successful guess.

*What is DNS Amplification?*
-> A DDoS attack that exploits the difference between small DNS queries and large DNS responses.

*What is an Open Resolver?*
-> A DNS resolver that accepts recursive queries from any Internet User.

*What is DNSSEC?*
-> A security extension that uses cryptographic signatures to verify DNS data authenticity and integrity.

*What problem does DNSSEC solve?*
-> DNSSEC adds cryptographic signatures to DNS records. Resolvers use public keys to verify that DNS responses were actually generated by the authoritative DNS server and were not modified in transit. This helps protect against DNS spoofing and cache poisoning attacks.

*Why are Open DNS Resolvers dangerous?*
-> Open DNS resolvers accept recursive queries from any client on the Internet. Attackers can abuse them for DNS amplification attacks by sending spoofed requests that cause large responses to be directed at victims. Restricting recursion to authorized users significantly reduces this risk.

*Why are DNS amplification attacks possible?*
-> DNS amplification attacks are possible because DNS commonly uses UDP, which is connectionless and does not verify the sender's IP address through a handshake. Attackers can spoof a victim's IP address in a DNS query, causing DNS servers to send large responses to the victim instead of the attacker.

*What is DNS Amplification attack?*
-> A DNS amplification attack is a DDoS technique in which an attacker sends small spoofed DNS queries to open DNS resolvers. Because DNS responses can be much larger than the requests, the resolvers generate amplified traffic toward the victim, overwhelming the victim's network or services.

*Why would an attacker prefer a poisoned DNS record with a long TTL?*
-> A longer TTL causes the malicious record to remain in the resolver's cache for a longer period of time. This increases the number of users affected, reduces opportunities for the resolver to refresh the correct information, and allows the attacker to maintain control of DNS responses for an extended duration.

*Why are many forged DNS responses more dangerous than one forged response?*
-> Sending many forged responses increases the probability that one response will match the resolver's expected transaction ID and source port. This brute-force approach can significantly increase the likelihood of successful DNS spoofing or cache poisoning attacks, especially if identifiers are predictable.

*Why does source port randomization help prevent DNS cache poisoning?*
-> Source port randomization adds another unpredictable value that an attacker must correctly guess. Instead of matching only the DNS Transaction ID, a forged response must also arrive on the correct source port. This significantly increases the search space and makes spoofing and cache poisoning attacks much more difficult.

*Why is DNS Cache Poisoning more dangerous than simple DNS Spoofing?*
-> DNS spoofing affects a single DNS response, whereas DNS cache poisoning stores forged information inside the resolver's cache. Once poisoned, the resolver may continue serving malicious responses to many users until the cached entry expires or is removed, making the impact much larger and longer lasting.

*Why are random DNS Transaction IDs important?*
-> DNS Transaction IDs are used to match responses to queries. Randomizing these IDs makes it difficult for attackers to forge responses because they must correctly guess the identifier before the legitimate response arrives. Predictable IDs significantly increase the risk of DNS spoofing and cache poisoning attacks.

*Why must an attacker guess the DNS Transaction ID?*
-> DNS resolvers use the Transaction ID to match responses with outstanding queries. If an attacker wants a forged DNS response to be accepted, they must correctly guess the Transaction ID so the resolver believes the forged response belongs to the original query.
