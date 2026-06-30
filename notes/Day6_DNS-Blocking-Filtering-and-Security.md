## Day 6 Notes:-

## Concepts Learned:-

**What is DNS Blocking?**
-> DNS Blocking is a technique that prevents access to a website by stopping DNS resolution. Normal Flow:- Browser->DNS Query->DNS Server->IP Address Returned->Website Opens                           Blocked Flow:- Browser->DNS Query->DNS Server->Blocked->No Connection                               DNS blocking prevents the browser from discovering the IP address of the target website.

**Why DNS Blocking is Effective?**
-> DNS blocking works before a network connection is established. No DNS Resolution->No IP Address->No Connection.  This makes DNS filtering an efficient way to block access to websites, advertisements, trackers, malware domains, and phising sites.

**Methods of DNS Blocking:-**
-> Method 1:- Return 0.0.0.0                                                                        Blocked Domain: ads.badsite.com  DNS returns:0.0.0.0                                                The browser attempts to connect to: 0.0.0.0 and the connection fails. This is the method implemented in my DNS server. Advantages:-                                                          * Simple                                                                                            * Fast                                                                                              * Easy to implement                                                                                 Method 2:- Return NXDOMAIN                                                                          Instead of returning an IP address, the DNS server responds:"Domain does not exist". DNS Response:- RDCODE=3. This is known as NXDOMAIN.The browser treats the domain as non-existentand stops the request.                                                                                            Method 3:- Redirect to A Block Page                                                                 Instead of returning the real IP address, the DNS server returns the IP address of a custom block page. Example:- ads.badsite.com->192.168.1.100. The user is redirected to an "Access Denied" page. This approach is often used in schools and enterprises environments.

**Real-World DNS Filtering:-**
-> DNS Filtering products include:-                                                                 * Pi-hole                                                                                           * AdGuard Home                                                                                      * NextDNS                                                                                           * OpenDNS Family Sheild                                                                             These systems maintain large blocklists and intercept DNS requests before forwarding them upstream.

**Pi-hole Architecture:-**
-> Device->Pi-hole->Blocked?->Yes->(Return Blocked Response)->No->(forward Query).         Pi-hole works using the same high-level concept as my DNS blocker.

**Security Applications of DNS Filtering:-**
->DNS filtering can be used to block:                                                               Advertisements:- Example:- ads.doubleclick.net                                                      Tracking Domains:- Example:- analytics.example.com                                                  Malware Domains:- Example:- malware-download.com                                                    Phising websites:- Example:- fake-bank-login.com                                                    Adult Content:- Example:- adultsite.com                                                             Company Policy Enforcement:- Example:- facebook.com, youtube.com during work hours                  


## CONNECTION WITH PROJECT:- 

*How My DNS Blocker works?*
-> When DNS query arrives: if(blockedDomains.has(domain))  My DNS server checks wether the requested domain exists in the blocklist. If it exist:-                                             * DNS resolution is prevented                                                                       * A blocked response is returned                                                                    Otherwise:-                                                                                         * The query is forwarded to the upstream resolver 

*Why My DNS Blocker Works?*
-> The blocker does not block websites directly.Instead , it blocks the process of discovering the website's IP address. No Resolution->No IP Address->No Connection.

*Blocklist matching:-*
-> My current implementation uses exact string matching. Example:-  Blocked:facebook.com         Not Blocked:  www.facebook.com                                                                      Because DNS treats these as different domains names.

*Wildcard and Suffix Matching:-*
-> Instead of exact matching:- blockedDomains.has(domain)                                           A more advanced approach is:- domain === "facebook.com" || domain.endsWith(".facebook.com")         This blocks:-                                                                                       * facebook.com                                                                                      * www.facebook.com                                                                                  * m.facebook.com                                                                                    * images.facebook.com                                                                               while avoiding false positives.

*False Positives:-*
-> A false positive occurs when a filtering rule blocks a domain that should not be blacked. Example:- Using: domain.endsWith("facebook.com") would incorrectly block: myfacebook.com even though it is not a part of Facebook. Proper suffix matching avoids this issue.

*Case Sensitivity:-*
-> DNS domain names are case-insensitive. Example:- facebook.com, FACEBOOK.COM, Facebook.Com   All refer to the same domain. However, Javascript string matching is case-sensitive. Example:- "facebook.com === FACEBOOK.COM" returns false. To prevent bypasses, domain names should be normalized: domain = domain.toLowerCase(); before filtering.

*DNS Filtering Limitations:-*
->DNS filtering is useful but not perfect.Users may bypass filtering through:             Alternative DNS Servers                                                                     Examples:Google DNS, Cloudflare DNS                                                                 VPNs                                                                                                VPNs often use their own DNS resolvers.DNS requests never reach the local DNS filter.               Direct IP Addresses                                                                                 Some websites can be accessed using their IP address directly.This bypasses DNS entirely.           DNS-over-HTTPS (DoH)                                                                                DNS queries are sent through encrypted HTTPS connections.Local DNS filters may not see these requests.


## Engineering Insights:- 

*DNS Filtering Is Discovery Blocking*
->DNS filtering does not directly block websites.It blocks Discovery of websites. Without IP address, the browser cannot establish a connection.

*Security Is Layered*
-> DNS filtering should be viewed as one security layer.Real enterprise environments combine:       * DNS Filtering                                                                                     * Firewalls                                                                                         * VPN Controls                                                                                      * Proxy Rules                                                                                       * Network Policies                                                                                  to achieve stronger protection


## INTERVIEW NOTES:-

*What is DNS Blocking?*
-> DNS Blocking prevents access to a domain by stopping DNS resolution before a network connection can be established.

*Why is DNS Filtering effective?*
-> DNS filtering operates before the connection phase. If a client cannot resolve a domain name into an IP address, it cannot connect to the website.

*What are common DNS Blocking techniques?*
-> * Return 0.0.0.0                                                                                 * Return NXDOMAIN                                                                                   * Redirect to a block page 

*Why isn't exact domain matching sufficient?*
-> Large services often use many subdomains. Blocking only one hostname may allow access through other subdomains. Wildcard or suffix matching is often required.

*Why should domain names be normalized before filtering?*
-> DNS is a case-insensitive, but JavaScript string comparisons are case-sensitive. Converting domains to lowercase prevents capitalization based bypasses.

*Can DNS Filtering be bypassed?*
-> Yes                                                                                              Common bypass methods include:                                                                      * Alternative DNS Servers                                                                           * VPNs                                                                                              * Direct IP address                                                                                 * DNS-over-HTTPS(DoH)                                                                               Therefore DNS filtering should be considered one layer of a larger security strategy.

*Why is endsWith("facebook.com") not sufficient?*
-> Because it can accidentally match unrelated domains such as myfacebook.com. A safer approach is to match either the exact domain (facebook.com) or subdomains ending in .facebook.com, ensuring only the intended domain hierarchy is blocked.

*Why isn't blocking facebook.com alone sufficient?*
-> DNS filtering based on exact string matching only blocks the specific hostname listed in the blocklist. Large services often use multiple subdomains such as www.facebook.com and m.facebook.com. To effectively block an entire service, wildcard or suffix-based matching is often required.
