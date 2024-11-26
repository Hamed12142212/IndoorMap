
import { dijkstra } from './dijkstra.js';
export function initializeRouteModal(map, graph, nodesData, dijkstra) {
    // Create modal HTML
    const modalHTML = `
        <div id="routeModal">
        <div class="modal-content">
            <h2>Find Route</h2>
            <input type="text" id="fromNodeInput" class="modal-input" placeholder="Start Node (e.g., NODE_015)">
            <input type="text" id="toNodeInput" class="modal-input" placeholder="End Node (e.g., NODE_027)">
            <div class="modal-buttons">
                <button id="cancelRouteModalBtn" class="modal-btn modal-btn-cancel">Cancel</button>
                <button id="findRouteModalBtn" class="modal-btn modal-btn-find">Find Route</button>
                
            </div>
        </div>
    </div>
    `;

    // Append modal to body if not exists
    if (!document.getElementById('routeModal')) {
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHTML;
        document.body.appendChild(modalDiv.firstElementChild);
    }

    // Get modal elements
    const routeButton = document.getElementById('routeButton');
    const routeModal = document.getElementById('routeModal');
    const findRouteModalBtn = document.getElementById('findRouteModalBtn');
    const cancelRouteModalBtn = document.getElementById('cancelRouteModalBtn');
    const fromNodeInput = document.getElementById('fromNodeInput');
    const toNodeInput = document.getElementById('toNodeInput');


    // Add event listeners to input fields
fromNodeInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        findRouteModalBtn.click();
    }
});

toNodeInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        findRouteModalBtn.click();
    }
});


    // Show modal when Find Route button is clicked
    routeButton.addEventListener('click', () => {
        routeModal.style.display = 'flex';
    });

    // Cancel button closes the modal
    cancelRouteModalBtn.addEventListener('click', () => {
        routeModal.style.display = 'none';
    });

    // Handle route finding
    findRouteModalBtn.addEventListener('click', () => {
        const fromNode = fromNodeInput.value.trim();
        const toNode = toNodeInput.value.trim();

        // Close the modal
        routeModal.style.display = 'none';

        if (!fromNode || !toNode) {
            alert("Both 'From' and 'To' nodes must be specified.");
            return;
        }

        if (!graph[fromNode] || !graph[toNode]) {
            alert("One or both of the specified nodes do not exist in the graph.");
            return;
        }

        const route = dijkstra(graph, fromNode, toNode);

        const routeCoordinates = [];
        route.forEach(nodeID => {
            const node = nodesData.features.find(feature => 
                feature.properties.NODE_ID === nodeID
            );
            if (node) {
                routeCoordinates.push([node.properties.X, node.properties.Y]);
            }
        });

        if (routeCoordinates.length === 0) {
            alert("No route found between the specified nodes.");
            return;
        }

        const routeGeoJSON = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": routeCoordinates
            }
        };

        if (map.getSource('route')) {
            map.getSource('route').setData(routeGeoJSON);
        } else {
            map.addSource('route', {
                type: 'geojson',
                data: routeGeoJSON
            });

            map.addLayer({
                id: 'route-layer',
                type: 'line',
                source: 'route',
                paint: {
                    'line-color': '#FF5733',
                    'line-width': 4,
                    'line-opacity': 0.7
                }
            });
        }
    });
}