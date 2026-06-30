## Day 2 Notes:-

*What is the difference between an IP Address and a port number?*
-> IP address identifies specific device on the network while the port number identifies the specific application running on that device.

*Why isn't an IP address alone enough?*
-> IP address alone isn't enough because it only locates devicw location on the network but it does not finds the specific service or application. 

*What is socket?*
-> A socket is generally reffered as the communication endpoint. A socket is the communication door through which data enters and leaves. Socket = IP Address + Port .

*In Your DNS Project what does : "server.bind(53)" actually do?*
-> It attaches my DNS Server on the port 53 and all the packets arriving on Port 53 are delivered to my DNS Server.

*What is UDP?*
-> UDP stands for User Datagram Protocol. It is a core, lightweight communication protocol used on the internet to send data packets between devices without establishing a prior connection.

*What is TCP?*
-> TCP stands for Transmission Control Protocol. It is foundational set of rules that governs how digital data is broken down into packets , sent across internet and reliably assembled at its destination.

*UDP vs TCP:-*
-> UDP = Fast, cheap, connectionless
-> TCP = Slow, Reliable, Ordered, Connection-Oriented 

*Tell me when does DNS uses UDP and when does it uses TCP?*
-> DNS uses UDP when the queries are small, Speed Matters and Loss is cheap whereas DNS uses TCP when Responses become large and reliability becomes important as TCP handles large data transfer and retransmission more reliably.

*In your DNS project, what would happen if you changed:"const server = dgram.createSocket("udp4");"to a TCP server instead?. Explain what you think would happen architecturally.*
-> My DNS server would stop working with normal DNS clients because they expect to communicate using UDP. If I changed the server to TCP, the client and server would no longer be using the same transport protocol. To support TCP DNS, I would need to implement a TCP listener and ensure the client also communicates using TCP.