const Node = require('./Node');

class LRUCache {

    constructor(capacity) {

        this.capacity = capacity;

        this.size = 0;

        this.cache = new Map();

        this.head = new Node(null, null, null);

        this.tail = new Node(null, null, null);

        this.head.next = this.tail;

        this.tail.prev = this.head;

    }

    addToFront(node) {

        const firstNode = this.head.next; //Save the old first node

        node.next = firstNode; //Prepare Google
        node.prev = this.head; //Prepare Google

        this.head.next = node; //Update exisiting list
        firstNode.prev = node; //Update exisiting list

    }

    removeNode(node) {

        const previous = node.prev;
        const next = node.next;

        previous.next = next;
        next.prev = previous;

        node.prev = null;
        node.next = null;

    }

    moveToFront(node) {

        this.removeNode(node);

        this.addToFront(node);

    }

    removeTail() {

        const lru = this.tail.prev;

        this.removeNode(lru);

        this.cache.delete(lru.domain);

        this.size--;

        return lru;
    }

    get(domain) {
        
        const node = this.cache.get(domain);

        if(node === undefined) {
            return null;
        }

        this.moveToFront(node);

        return {
            domain: node.domain,
            ip: node.ip,
            expiresAt: node.expiresAt
        };
    }

    put(domain, ip, expiresAt) {

        const node = this.cache.get(domain);

        if(node !== undefined) {

            node.ip = ip;
            node.expiresAt = expiresAt;

            this.moveToFront(node);

            return;
        }
        
        if(this.size === this.capacity) {
            this.removeTail();
        }

        const newNode = new Node(domain, ip, expiresAt);

        this.addToFront(newNode);

        this.cache.set(domain, newNode);

        this.size++;
    }
    remove(domain) {

        const node = this.cache.get(domain);

        if(node === undefined) {
            return;
        }

        this.removeNode(node);

        this.cache.delete(domain);

        this.size--;

    }

    getAllNodes() {

        const nodes = [];

        let current = this.head.next;

        while(current !== this.tail){
            
            nodes.push(current);

            current = current.next;
        }

        return nodes;
    }
}

module.exports = LRUCache;