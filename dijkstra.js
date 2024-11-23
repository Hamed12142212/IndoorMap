// Export the dijkstra function so it can be imported in other files
export function dijkstra(graph, start, end) {
    let distances = {};
    let predecessors = {};
    let nodes = new PriorityQueue();

    // Initialize all nodes
    Object.keys(graph).forEach(function(node) {
        if (node === start) {
            distances[node] = 0;
            nodes.enqueue(node, 0);
        } else {
            distances[node] = Infinity;
            nodes.enqueue(node, Infinity);
        }
        predecessors[node] = null;
    });

    while (!nodes.isEmpty()) {
        let closestNode = nodes.dequeue().element;
        if (closestNode === end) break;

        graph[closestNode].forEach(function(neighbor) {
            let alt = distances[closestNode] + neighbor.weight;
            if (alt < distances[neighbor.node]) {
                distances[neighbor.node] = alt;
                predecessors[neighbor.node] = closestNode;
                nodes.enqueue(neighbor.node, distances[neighbor.node]);
            }
        });
    }

    // Build the shortest path
    let path = [];
    let currentNode = end;
    while (currentNode !== start) {
        path.unshift(currentNode);
        currentNode = predecessors[currentNode];
    }
    path.unshift(start);

    return path;
}

// PriorityQueue class used in Dijkstra's algorithm
class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element, priority) {
        let queueElement = { element, priority };
        let added = false;
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].priority > priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }
        if (!added) {
            this.items.push(queueElement);
        }
    }

    dequeue() {
        return this.items.shift();
    }

    isEmpty() {
        return this.items.length === 0;
    }
}
