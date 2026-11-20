const Node = require('./Node');

class LRUCache {

    constructor(capacity) {

        this.capacity = capacity;

        this.size = 0;

        this.cache = new Map();

        this.head = new Node(null, null, null, null);

        this.tail = new Node(null, null, null, null);

        this.head.next = this.tail;

        this.tail.prev = this.head;

    }

    // ==============================
    // ADD NODE TO FRONT
    // ==============================

    addToFront(node) {

        const firstNode = this.head.next; //Save the old first node

        node.next = firstNode; //Prepare Google
        node.prev = this.head; //Prepare Google

        this.head.next = node; //Update exisiting list
        firstNode.prev = node; //Update exisiting list

    }

    // ==============================
    // REMOVE NODE
    // ==============================

    removeNode(node) {

        const previous = node.prev;
        const next = node.next;

        previous.next = next;
        next.prev = previous;

        node.prev = null;
        node.next = null;

    }

    // ==============================
    // MOVE NODE TO FRONT
    // ==============================

    moveToFront(node) {

        this.removeNode(node);

        this.addToFront(node);

    }

    // ==============================
    // REMOVE LEAST RECENTLY USED
    // ==============================

    removeTail() {

        const lru = this.tail.prev;

        this.removeNode(lru);

        this.cache.delete(`${lru.domain}:${lru.type}`);

        this.size--;

        return lru;
    }

    // ==============================
    // GET
    // ==============================

    get(domain, type) {
        
        const key = `${domain}:${type}`;
        const node = this.cache.get(key);

        if(node === undefined) {
            return null;
        }

        this.moveToFront(node);

        return {
            domain: node.domain,
            type: node.type,
            data: node.data,
            expiresAt: node.expiresAt
        };
    }

    // ==============================
    // PUT
    // ==============================

    put(domain, type, data, expiresAt) {

        const key = `${domain}:${type}`;
        const node = this.cache.get(key);

        if(node !== undefined) {

            node.data = data;
            node.expiresAt = expiresAt;

            this.moveToFront(node);

            return;
        }
        
        //Cache full
        if(this.size === this.capacity) {
            this.removeTail();
        }

        const newNode = new Node(domain, type, data, expiresAt);

        this.addToFront(newNode);

        this.cache.set(key, newNode);

        this.size++;
    }

    // ==============================
    // REMOVE
    // ==============================

    remove(domain, type) {

        const key = `${domain}:${type}`;
        const node = this.cache.get(key);

        if(node === undefined) {
            return;
        }

        this.removeNode(node);

        this.cache.delete(key);

        this.size--;

    }

    // ==============================
    // GET ALL NODES
    // ==============================

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