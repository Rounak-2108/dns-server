## Day 1 Notes:-

*WHat is DNS?*
-> It stands for Domain Name Systems which is also reffered as the "phonebook of the internet". It is foundational technology that translates human-readable domain names(like google.com) into machine readable IP addresses(like 192.168.1.1) so computers can locate and load websites.

*Why can't humans directly use IP addresses??*
-> Humans cannot directly use IP addresses because they are long string of numbers(like 192.146.1.2)that are difficult to memorize and prone to typing errors. Instead DNS act as phonebook that contains easy-to-read and easy-to-remember domain names which can be used to translate into machine IP Address to open that site. Also IP address for a site can change over time so DNS provides a layer of abstraction that allows people use memorable domain names while the underlying IP Address can change without affecting users.

*What happens when I type google.com in browser?*
-> When I type google.com in browser then browser asks for ip address of "google.com" then DNS server replies something like "142.250.190.14" then browser connects to that ip address and opens the website.

*Where does my DNS server fit in the DNS resolution process?*
-> My DNS server sits exactly between Browser and Google DNS like (Browser->My DNS Server->Google DNS). My project acts as a resolver 

*Explain DNS using Phone Contact analogy.*
-> In your phone contact list you save numbers like 9845632432 as Mom, Dad, Brother etc.and then your phone translates MOM->9845632432. Same analogy works in DNS. DNS maps easy to remember names to IP addresses.