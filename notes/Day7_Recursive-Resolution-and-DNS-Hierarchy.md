## Day 7 Notes:-

## Concepts Learned:- 

**DNS Hierarchy:-**
-> DNS is not a single giant database. Instead, DNS is organized as hierarchy :- (Root Servers -> TLD Servers -> Authoritative Servers). Each layer knows who to reach the next layer. This design allows DNS to scale to billions of domains without requiring a single server to store all DNS records.

**Root Servers:-**
-> Root Servers are the highest level in the DNS hierarchy. Root Servers know:-                     * Where .com TLD servers are                                                                        * Where .org TLD servers are                                                                        * Where .net TLD servers are                                                                        * Where .in TLD servers are                                                                         Root Servers do NOT know the final IP address of websites. Example:- Question: github.com?        Root Server Response: Ask the .com TLD servers.  Root Servers provide referrals, not final answers.

**TLD Servers:-**
-> TLD stands for the Top Level Domain. Examples:-                                                  * .com                                                                                              * .org                                                                                              * .net                                                                                              * .in                                                                                               * .edu                                                                                              TLD Servers know:-                                                                                  Which authoritative servers are responsible for a domain. Example:- (github.com -> GitHub Authoritative Servers) TLD Servers do not normally provide the final IP Address. They provide referrals to authoritative servers.

**Authoritative Servers:-**
-> Authoritative Servers are the source of truth for a domain. They contain the actual DNS records. Example:- (github.com->140.82.121.3). When a resolver reaches an authoritative server, it recieves the final answer.

**DNS Resolution Process:-**
-> Suppose a resolver needs: github.com?  The lookup process is:- Resolver->Root Server->.com TLD Server->GitHub Authoritative Server->IP Address Returned. This is known as recursive resolution.

**Referrals:-**
-> Root and TLD servers generally do not provide final answers. Instead they provide referrals. Example:- (Root Server: Ask the .com TLD Servers.  TLD Server: Ask GitHub's authoritative servers.)Referrals help guide the resolver through the DNS hierarchy.

**Recursive Resolution:-**
-> Recursive Resolution means:- Find the answer for me. The Client asks a recursive resolver for a domain. The recursive resolver performs all required DNS lookups and returns the final answer. Example:- (Browser->Google DNS->Root->TLD->Authoritative->Answer).The client recieves only the final answer.

**Iterative Resolution:-**
-> Iterative Resolution means:- Tell me the next place to ask . The client performs the DNS hierarchy traversal itself. Example:- (Client->Root->Client->TLD->Client->Authoritative->Answer). The client is responsible for following referrals.

**Recursive vs Iterative Resolution:-**
->RECURSIVE RESOLUTION:-                                                                            * Resolver does the work                                                                            * Simpler for clients                                                                               * Enables shared caching                                                                            * Reduces infrastructure load                                                                       ->ITERATIVE RESOLUTION:-                                                                            * Client does the work                                                                              * More network requests                                                                             * More complexity                                                                                   * Less efficient for large-scale usage                                                              Most devices use recursive resolution. 


## CONNECTION WITH PROJECT:-

*Current Architecture:-*
-> My DNS server currently behaves as a forwarding resolver. FLOW:- Browser->My DNS Server->Google DNS->Answer   My DNS Server forwards queries instead of performing recursive resolution itself.

*Future Architecture:-*
-> A future version of my DNS server could perform recursive resolution directly. FLOW:- Browser->My DNS Server->Root->TLD->Authoritative->Answer . This would make it a true recursive resolver.

*Referral Caching:-*
-> Recursive resolvers cache more than final answers. They also cache DNS hierarchy information. Example:- During a github.com lookup, the resolvers learns: .com TLD Servers and GitHub Authoritative Servers. This information can be reused for future lookups.

*What information should a resolver cache?*
-> A recursive resolver should cache:-                                                              1. Final DNS Answers:- Example:-(github.com->140.82.121.3).                                         2. TLD Referral Information:- Example:-(.com->TLD Servers) This helps future.com lookups skip Root Servers.                                                                                            3. Authoritative Server Information:- Example:-(github.com->GitHub Authoritative Servers) This helps future lookups reach authoritative servers more quickly.

*Why Recursive Resolvers are fast?*
-> Resolvers such as Google DNS and Cloudflare DNS accumulate DNS knowledge over time.They cache:-  * DNS answers                                                                                       * Referral information                                                                              * TLD information                                                                                   * Authoritative server information                                                                  This allows them to skip portions of the DNS hierarchy during future lookups.

*TTL and Referral Caching:-*
-> Referral information is also cached using TTL values. Examples:-                                 * TLD Information                                                                                   * NS Records                                                                                        * Authoritative Server Information                                                                  can all become stale.                                                                               This creates the same tradeoff seen with DNS answer caching: Performance vs Freshness.            TTL helps balance these competing requirements.


## Engineering Insights:- 

*DNS is a chain of databases*
-> (Root->TLD->Authoritative) Each layer knows only enough information to reach the next layer. No single DNS Server needs to know the entire Internet.

*Recursive Resolvers Build Knowledge*
-> Resolvers do not simply cache answers. They build a knowledge base of :-                         * Domain records                                                                                    * TLD information                                                                                   * Referral information                                                                              * Authoritative servers                                                                             This accumulated knowledge dramatically improves performance.


## INTERVIEW NOTES:-

*Which DNS Server knows the Final IP Address?*
-> The authoritative server for the domain knows the final IP Address. Root and TLD servers typically provide referrals rather than final answers.

*What is Recursive Resolution?*
-> Recursive resolution occurs when a resolver performs all DNS lookups on behalf of a client and returns the final answer.

*What is Iterative Resolution?*
-> Iterative resolution occurs when a client follows DNS referrals itself and performs each lookup step manually.

*Why do recursive resolvers cache referral information?*
-> Caching referral information allows future lookups to skip parts of the DNS hierarchy, reducing latency and lowering load on root and TLD servers.

*What would happen if root servers disappeared?*
-> DNS would not fail immediately because resolvers and clients cache DNS information. However, once cached information expired, new lookups would begin failing because resolvers could no longer discover TLD servers.

*Why don't client devices perform recursive resolution themselves?*
-> Having every client perform recursive resolution would increase latency, eliminate shared caching benifits, increase load on DNS infrastructure, and require complex DNS logic on every device. Recursive resolvers centralize this work and improve efficiency.

*What should a recursive resolver cache?*
-> A recursive resolver should cache final DNS answers(such as A records), referral information(such as TLD server locations), and NS records that identify authoritative servers. Caching all three reduces future lookup latency and decrease load on the DNS hierarchy.

*Why don't client devices perform full recursive resolution themselves?*
-> Having every client perform recursive resolution would increase latency, eliminate the benifits of shared caching, significantly increase load on root and TLD servers, and require complex DNS logic on every device. Recursive resolvers centralized this work, improve performance through caching, and reduce overall DNS infrastucture load.

*Can NS records and referral information becomes stale?*
-> Yes. Recursive resolvers cache not only final DNS answers but also referral and NS records. These cached entries are subject to TTL values and can become stale if infrastructure changes before the TTL expires. This is the same freshness - vs - performance tradeoff seen with A records.

*Why do recursive resolvers cache NS records and referrals?*
-> Caching referral information allows future lookups to skip protions of the DNS hierarchy. For Example, if the resolver already knows the .com TLD servers, it can bypass root servers for future.com lookups. This reduces latency and lowers load on the DNS infrastructure.

*What would happen if all root servers disappeared?*
-> DNS would not fail immediately because recursive resolvers and clients cache DNS information according to TTL values. Existing cached records would continue working until expiration. However, once caches expired and new lookups were required, resolvers would be unable to discover TLD servers, causing DNS resolution to gradually fail across the Internet.
