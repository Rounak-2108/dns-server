class Node{

    constructor(domain, type, data, expiresAt){

        this.domain = domain;
        this.type = type;
        this.data = data;
        this.expiresAt = expiresAt;

        this.prev = null;
        this.next = null;

    }
}

module.exports = Node;