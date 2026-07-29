class Node{

    constructor(domain, ip, expiresAt){

        this.domain = domain;
        this.ip = ip;
        this.expiresAt = expiresAt;

        this.prev = null;
        this.next = null;

    }
}

module.exports = Node;