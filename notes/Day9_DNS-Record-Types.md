## Day 9 Notes:- 

## Concepts Learned:- 

DNS is not just a system that converts domain names to IP addresses.
DNS is not distributed database that stores many different types of information about a domain.
Different DNS records serve different purposes.

**A Record:-** A stands for Address Record. *Purpose:-* Maps: Domain->IPv4 Address.  Example:- google.com -> 142.250.190.14. *Usage:-* Used by web browsers and applications to locate a server using an IPv4 address. *Interview Note:-* An A record maps a domain name to an IPv4 address.

**AAAA Record:-** AAAA Record. *Purpose:-* Maps: Domain->IPv6 Address.  Example:- google.com->260:f8b0:4005:805::200e.  *Usage:-* Used when a device and network support IPv6. Modern systems generally prefer IPv6 when available.

**Comparison:-**
-> *A Record:-* Domain->IPv4                **AAAA Record:-**  Domain->IPv6                         Interview Note:- An AAAA record maps a domain name to an IPv6 address.

**CNAME Record:-** Canonical Name Record. *Purpose:-* Maps: Domain->Another Domain       instead of directly mapping to an IP address. Example:- www.example.com->example.com example.com->203.0.113.10 *Why use CNAME?* -> Without CNAME: example.com->203.0.113.10  www.example.com->203.0.113.10   Both records must be updated when the IP changes.  With CNAME:-  www.example.com->example.com            Only one record must be maintained.                                                                 Advantages:-                                                                                        * Easier maintenance                                                                                * Reduced duplication                                                                               * Simplified DNS management                                                                         Limitations:-                                                                                       Long CNAME chains increase:                                                                         * DNS Lookup                                                                                        * Network Traffic                                                                                   * Latency                                                                                           Resolvers generally limit CNAME chain depth.                                                        Interview Note:-                                                                                    A CNAME record creates an alias from one domain name to another domain.

**MX Record:-** Mail Exchange Record. *Purpose:-* Specifies which mail server handles email for a domain. Example:- example.com->MX->mail.example.com  mail.example.com->198.51.100.20                *Email Delivery Process:-* Someone sends: user@example.com   Mail server asks: MX Record for example.com? DNS replies: mail.example.com                                                          Mail server then finds the IP address of mail.example.com and delivers the email.                   *MX Priority:-* Example:  MX 10 mail1.example.com      MX 20 mail2.example.com                      Lower number means: Higher Priority .  Mail is delivered to: mail1.example.com first. If unavailable: mail2.example.com is used.                                                             *Equal Priority MX Records:-*  Example:  MX 10 mail1.example.com    MX 20 mail2.example.com         *Purpose:-*                                                                                         * Load Sharing                                                                                      * Redundancy                                                                                        * Fault Tolerance                                                                                   Interview Note:-                                                                                    An MX record specifies which mail server is responsible for recieving email for a domain.

**TXT Record:-** Text Record. *Purpose:-* Stores arbitary text information in DNS.  Example:- example.com->TXT->"Hello World"                                                                     Although possible, TXT records are generally used for configuration and verification purposes.

**Domain Ownership Verification:-**  Example:- google-site-verification=abc123xyz                   Services such as:-                                                                                  * Google Search Console                                                                             * Google Workspace                                                                                  * Microsoft 365                                                                                     use TXT records to verify domain ownership.

**SPF(Sender Policy Framework):-**  Example:- v=spf1 include:_spf.google.com ~all                   *Purpose:-* Specifies which mail servers are allowed to send email on behalf of a domain.           Helps prevent:-                                                                                     * Email spoofing                                                                                    * Spam

**DKIM:-** TXT records may contain public cryptographic keys. *Purpose:-* Allows receiving mail servers to verify email integrity.

**DMARC:-** Example: v=DMARC1;p=reject  *Purpose:-* Specifies how email providers should handle suspicious email messages.

**NS Record:-** Name Server Record. *Purpose:-* Identifies the authoritative DNS servers responsible for domain. Example:- rounak.com->NS->ns1.rounakdns.com   rounak.com->NS->ns2.rounakdns.com         *Role In DNS Hierarchy:-* Resolver->Root->TLD->NS Record->Authoritative Server          NS records allow resolvers to locate authoritative servers.                                         *Why Multiple NS Records?*                                                                          Provides:-                                                                                          * Redundancy                                                                                        * Reliability                                                                                       * High Availability                                                                                 If one nameserver fails, another can still answer queries.                                          Interview Note:-                                                                                    An NS record specifies which authoritative DNS servers are responsible for a domain.

**Glue Records:-**                                                                                  *Problem:-*                                                                                         Suppose: rounak.com->NS->ns1.rounak.com    To conatct: ns1.rounak.com  the resolver needs its IP address. This creates a circular dependency.                                                        *Solution:-*                                                                                        TLD servers provide: Glue Records  Example:- NS:ns1.rounak.com      Glue:ns1.rounak.com->192.0.2.10 Resolvers can immediately contact the authoritative server.                                         *Purpose:-* Glue records prevent infinite DNS resolution loops.                                     Interview Note:-                                                                                    Glue records are A and AAAA records supplied alongside NS records to help resolvers locate authoritative nameservers.

**SOA Record:-** Start of Authority. *Purpose:-* Contains administrative and configuration information for a DNS zone. Think of it as: Birth Certificate + configuration file + management Metadata       for a domain.                                                                        *Information Stored:-*                                                                              Primary Authoritative Server - Example: ns1.example.com                                             Administrator Contact - Example: admin@example.com                                                  Serial Number -  Example: 2026062101   Whenever DNS records change: Serial Number Increases     Used by secondary DNS servers to detect updates.                                                    Refresh Interval - How often secondary servers should check for updates.                            Retry Interval - How long to wait before retrying if an update check fails.                         Expire Interval - How long secondary servers can continue serving data without contacting the primary server.                                                                                     Minimum TTL - Default caching value for records in the zone.                                        *Why SOA matters?*                                                                                  SOA allows:-                                                                                        * DNS synchronization                                                                               * Version tracking                                                                                  * Zone management                                                                                   * Administrative control                                                                            Interview Note:-                                                                                    An SOA record contains administrative and synchronization information for a DNS zone.


## Engineering Insights:- 

DNS is not simply a name-to-IP translation system. DNS is a globally distributed database that stores:-                                                                                            * Address Information                                                                               * Email Routing Information                                                                         * Ownership Verification                                                                            * Security Policies                                                                                 * Administrative Metadata                                                                           * Server Delegation Information                                                                     Every major Internet service depends on DNS records working correctly.


## INTERVIEW NOTES:- 

*What Record Maps a domain to IPv4?*
-> A Record

*What Record Maps a domain to IPv6?*
-> AAAA Record

*What record creates domain aliases?*
-> CNAME Record

*What record specifies Mail Servers?*
-> MX Record

*What record stores verification and security information?*
-> TXT Record

*What record identifies Authoritative DNS Servers?*
-> NS Record

*What record stores Zone Administration Information?*
-> SOA Record

*What problem do GLUE Records solve?*
-> Circular Dependency during nameserver resolution.

*What is SOA Record?*
-> An SOA(Start of Authority) record contains administrative and configuration information about a DNS zone. It identifies the primary authoritative server, administrator conatct, serial number, and synchronization parameters used by secondary DNS servers.

*What is a glue record and why is it needed?*
-> A glue record is an A or AAAA record provided alongside an NS record. It supplies the IP address of a nameserver when that nameserver's hostname is inside the domain it serves. Glue records prevent circular dependency problems and allow resolvers to contact authoritative nameservers directly.

*What is an NS record?*
-> An NS (Name Server) record identifies the authoritative DNS servers responsible for a domain. Recursive resolvers use NS records to determine which authoritative server should be queried for DNS information about that domain.

*What happens if an SPF TXT record is deleted?*
-> The website would typically continue functioning because web traffic depends on A, AAAA, or CNAME records. However, email authentication would be affected. Recieving mail servers would be unable to verify authorized senders through SPF, increasing the risk of spam classification, spoofing issues, or email delivery problems.

*What is a TXT record used for?*
-> A TXT record stores arbitrary text information in DNS. It is commonly used for domain ownership verification, email security mechanisms such as SPF, DKIM, and DMARC, and service-specific configuration data.

*Why would multiple MX records have the same priority?*
-> Multiple MX records with the same priority allow mail traffic to be distributed across multiple mail servers. This improves scalability through load sharing and also increases reliability because email can still be delivered if one server becomes unavailable.

*What is an MX record?*
-> An MX (Mail Exchange) record specifies which mail server is responsible for receiving email on behalf of a domain. When an email is sent to a domain, the sender's mail server queries DNS for MX records and uses them to determine where the email should be delivered.

*Are long CNAME chains a good idea?*
-> Long CNAME chains technically work because resolvers can follow aliases until an A or AAAA record is reached. However, they increase lookup latency, generate additional DNS queries, and can create complexity or looping issues. Therefore DNS configurations generally keep CNAME chains short.

*Why use a CNAME instead of another A record?*
-> A CNAME allows one domain name to act as an alias for another domain name. This reduces duplication and simplifies maintenance because IP address changes only need to be updated in one place rather than multiple DNS records.

*If both A and AAAA records exist, which one is used?*
-> DNS may return both A and AAAA records. The operating system and network stack typically prefer IPv6 if the device and network support it. If IPv6 is unavailable or unsupported, the system falls back to the IPv4 address provided by the A record.

*What is the difference between A and AAAA records?*
-> An A record maps a domain name to an IPv4 address, while an AAAA record maps a domain name to an IPv6 address. IPv4 addresses are 32 bits long, whereas IPv6 addresses are 128 bits long and provide a significantly larger address space.
