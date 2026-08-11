## DAy 13 Notes:-


## Concepts Learned:-

**1. Why an LRU Cache?**                                                                                 -> Old Cache:                                                                                           * No Size Limit .                                                                                        * Memory usage would continously increase.                                                               LRU Cache:                                                                                               * Capacity = 3                                                                                           Most Recently Used                                                                                       Google                                                                                                   Youtube                                                                                                  Github                                                                                                   Least Recently Used                                                                                      * When a fourth item is inserted:                                                                        Google                                                                                                   Youtube                                                                                                  Github                                                                                                   Facebook                                                                                                 Github(the recently used) gets removed automatically.

**2. Why HashMap + Doubly Linked List?**                                                                 -> We learned that one data structure alone isn't enough.                                                *HashMap* Provides:- Domain->Node        Time Complexity:- get()->O(1), put()->O(1), remove()->O(1)      *Doubly Linked List* Keeps items ordered by recent usage. Head->Google->Youtube->Github->Tail            Most Recently Used is near Head.                                                                         Least Recently Used is near tail.                                                                        *Together:-*  HashMap->Node<-Doubly Linked List                                                          The combination gives O(1) for every operation.

**3. Dummy Head & Tail Nodes:-**                                                                         Instead of handling many edge cases, we created two dummy nodes.                                         Head<=>Tail                                                                                              Initially,                                                                                               head.next = tail                                                                                         tail.prev = head                                                                                         After inserting Google                                                                                   Head<=>Google<=>Tail

**4. Node Structure:-**                                                                                  Each Node stores:                                                                                        domain                                                                                                   ip                                                                                                       expiresAt                                                                                                prev                                                                                                     next

**5. Core Operations:-**                                                                                 *addToFront(node)* Purpose:- Move a node to the MRU position.                                            Result:- Head->Node->First Node->...                                                                     *removeNode(node)* Purpose:- Detach a node from the linked list.                                         We learned      node.prev.next = node.next                 node.next.prev = node.prev                    *moveToFront(node)*  Instead of writing duplicate code we reused existing methods.              removeNode(node)   addToFront(node)                                                                      *removeTail()* Purpose:- Remove LRU node  Tail.prev     We reused   removeNode(lru)  instead of writing duplicate logic.

**6. Cache Operations:-**                                                                                *get(domain)* Flow:- HashMap->Found?->Move node to front->Return node                                    If not found: undefined                                                                                  *put(domain, ip, expiresAt)*                                                                             Case 1:                                                                                                  Already Exists: Update values->Move to Front                                                             Case 2:                                                                                                  New Domain: Capacity Full?->Yes->Remove Tail->Insert New Node->hasMap.put()                              *remove(domain)* Flow:- HashMap->Get Node->removeNode()->HasMap.delete()

**7. LRU Integeration:-**                                                                                Old:-  cache={}            New:-  const cache = new LRUCache(config.CACHE_CAPACITY);                     Old:-  cache[domain]       New:-  cache.get(domain)                                                      Old:-  cache[domain]=...   New:- cache.put(...)

**8. Cache Cleanup:-**                                                                                   Instead of *for(const domain in cache)* we use *for(const node of cache.getAllNodes())* because the cache is no longer a plain object.

**9. Git Lesson:-**                                                                                      This became one of the biggest lessons of the project.                                                   When we accidentally replaced server.js , Git allowed us to recover it instantly.                        We created a recovery checkpoint:                                                                        Restore DNS Server after debugging and keep LRU implementation                                           This is now our stable base.


## INTERVIEW NOTES:-  

*Why did you replace a normal JavaScript object with an LRU Cache?* 
-> Intially, I stored DNS records in a plain JavaScript object. Although lookup was O(1), the cache kept growing indefinitely. Since DNS servers cache thousands of domains, unlimited growth would eventually waste memory.To solve this, I implemented an LRU (Least Recently Used) Cache that automatically removes the least recently used entry when the cache reaches its capacity. This keeps the memory usage bounded while maintaining O(1) lookup and insertion.

*Why not just use a HashMap?*
->A HashMap provides O(1) lookup but does not maintain the order of usage.For an LRU cache, we must always know which entry was used most recently and which one was used least recently.A HashMap alone cannot efficiently answer that.Therefore, I combined it with a Doubly Linked List.

*Why not just use a Doubly Linked List?*
-> A Doubly Linked List maintains order, but searching for a particular domain would require traversing the list. That would take O(n). By combining a HashMap with a Doubly Linked List, I achieved O(1) lookup and O(1) updates.

*Why did you choose a Doubly Linked List instead of a Singly Linked List?*
-> When removing a node, I need access to both the previous node and the next node.With a singly linked list, removing an arbitrary node requires finding its previous node first, which takes O(n).A Doubly Linked List stores both prev and next, allowing removal in O(1).

*Why did you create dummy Head and Tail nodes?*
-> Dummy nodes eliminate edge cases. Without them, inserting or deleting the first or last node requires special conditions. With dummy nodes, every insertion and deletion follows the same logic, making the implementation simpler and less error-prone.

*Explain your addToFront() method.*
-> addToFront() inserts a node immediately after the dummy head.This makes the node the Most Recently Used (MRU) item.Whenever a domain is accessed or newly inserted, I move it to the front.

*Why does get() move the node to the front?*
-> In an LRU cache, accessing an item means it has become recently used. Therefore, after retrieving the node, I move it to the front of the linked list. This ensures the least recently used node always remains near the tail.

*What happens when the cache becomes full?*
-> If the cache size equals its capacity, I remove the node immediately before the dummy tail. That node is the Least Recently Used (LRU) entry. After removing it from both the linked list and the HashMap, I insert the new entry.

*What is the time complexity of your cache operations?*
Operations                           Complexity                                                          get()                                O(1)                                                                put()                                O(1)                                                                remove()                             O(1)                                                                moveToFront()                        O(1)                                                                removeTail()                         O(1)

*How did you integrate the LRU cache into your DNS Server?*
-> Previously, the cache manager stored entries in a JavaScript object. I replaced that object with an instance of my custom LRUCache. The cache manager now delegates all cache operations to the LRU cache using:                                                                                                   * cache.get()                                                                                            * cache.put()                                                                                            * cache.remove()                                                                                         The rest of the DNS server did not need to know how the cache was implemented, preserving separation of concerns.

*Why didn't you put the LRU logic directly inside server.js?*
-> I wanted to keep the server responsible only for handling DNS requests. Caching is a separate responsibility. Therefore, I encapsulated the caching logic inside cacheManager.js, which internally uses LRUCache. This improves modularity and makes future changes easier.

*Why is LRU used in DNS servers?*
-> DNS caches have limited memory. Popular domains are requested frequently, while some domains may never be requested again. LRU keeps frequently used entries in memory while automatically removing stale, less frequently accessed entries. This improves memory efficiency and cache hit rates.

*Suppose Google.com is requested every second. Will it ever be removed from the cache?*
-> No. Every request moves the corresponding node to the front of the linked list. Since Google.com is continuously being accessed, it remains the Most Recently Used item. The cache always evicts the Least Recently Used entry near the tail.

*You already remove entries when the cache becomes full. Why do you still have TTL cleanup?*
-> The two mechanisms solve different problems.                                                          * TTL expiration removes entries that have become invalid according to DNS rules, even if the cache isn't full.                                                                                              * LRU eviction removes the least recently used entry only when the cache reaches its capacity.           Using both ensures cached records are both fresh and memory-efficient.                                   This is exactly how many real-world DNS resolvers manage their caches.

*What was the hardest part of implementing the DNS cache?*
-> The most challenging part was implementing the LRU cache with O(1) operations. I had to combine a HashMap and a Doubly Linked List, carefully maintain prev and next pointers, and then integrate it into the existing DNS server without changing the server's overall architecture. I also learned the importance of version control when we used Git to recover the project after an accidental overwrite.

