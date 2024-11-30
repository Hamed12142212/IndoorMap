

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
    
        // Close the modal after the user clicks the button
        routeModal.style.display = 'none';


        const existingStepsModal = document.getElementById('stepsModal');
        if (existingStepsModal) {
            existingStepsModal.remove();
        }
    
        if (!fromNode || !toNode) {
            alert("Both 'From' and 'To' nodes must be specified.");
            return;
        }
    
        if (!graph[fromNode] || !graph[toNode]) {
            alert("One or both of the specified nodes do not exist in the graph.");
            return;
        }
    
        // Find route using Dijkstra algorithm
        const route = dijkstra(graph, nodesData, fromNode, toNode);
    
        if (route.length === 0) {
            alert("No route found between the specified nodes.");
            return;
        }
    
        const routeCoordinates = route.map(nodeID => {
            const node = nodesData.features.find(feature => feature.properties.NODE_ID === nodeID);
            return node ? [node.properties.X, node.properties.Y] : null;
        }).filter(coord => coord !== null);
    
        if (routeCoordinates.length === 0) {
            alert("No route found between the specified nodes.");
            return;
        }
    
        // Step 1: Group nodes by floor for stepwise navigation
        const steps = [];
        let currentFloor = null;
        let currentStep = [];
    
        route.forEach(nodeID => {
            const node = nodesData.features.find(feature => feature.properties.NODE_ID === nodeID);
            
            // Access the Floor property here
            const floor = node ? node.properties.Floor : null;
    
            if (floor !== currentFloor) {
                // New floor means a new step
                if (currentStep.length > 0) {
                    steps.push(currentStep);
                }
                currentStep = [nodeID];
                currentFloor = floor;
            } else {
                currentStep.push(nodeID);
            }
        });
    
        // Add the last step if there are nodes in currentStep
        if (currentStep.length > 0) {
            steps.push(currentStep);
        }
    
        // Step 2: Visualize the route on the map
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
    
        // Step 3: Create and manage the steps modal within InitializeRouteModal
        let currentStepIndex = 0;
        const modalContainer = document.body;
        const stepsModalHTML = `
        <div id="stepsModal" style="position: absolute; bottom: 10px; left: 10px; background: white; padding: 20px; border: 1px solid black; border-radius: 10px; width: 300px; height: 100px; display: flex; align-items: center; justify-content: space-between;">
         <button id="closeStepsModalBtn" style="position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; border-radius: 5px; font-size: 14px; padding: 5px 8px; cursor: pointer;">x</button>
            <button id="prevStepBtn" style="font-size: 18px; padding: 10px;">←</button>
            <span id="stepTitle" style="color: black; font-size: 20px; font-weight: bold;">Step ${currentStep}</span>
            <button id="nextStepBtn" style="font-size: 18px; padding: 10px;">→</button>
        </div>
        `;
    
        // Ensure the modal container exists before appending
        if (modalContainer) {
            const stepsDiv = document.createElement('div');
            stepsDiv.innerHTML = stepsModalHTML;
            modalContainer.appendChild(stepsDiv.firstElementChild);
        }
       
        const stepTitle = document.getElementById('stepTitle');
        const prevStepBtn = document.getElementById('prevStepBtn');
        const nextStepBtn = document.getElementById('nextStepBtn');
    
       // Modify the updateStepDisplay function to add floor transition markers
       const updateStepDisplay = () => {
        if (steps[currentStepIndex]) {
            const currentStepNodes = steps[currentStepIndex];
            const stepFloor = nodesData.features.find(node => node.properties.NODE_ID === currentStepNodes[0])?.properties.Floor;
            
            if (stepFloor !== undefined) {
                stepTitle.textContent = `Step ${currentStepIndex + 1}: Floor ${stepFloor}`;
    
                // Remove previous route layers and transition markers if they exist
                if (map.getLayer('step-route-layer')) {
                    map.removeLayer('step-route-layer');
                }
                if (map.getSource('step-route')) {
                    map.removeSource('step-route');
                }
                if (map.getLayer('route-layer')) {
                    map.removeLayer('route-layer');
                }
                if (map.getSource('route')) {
                    map.removeSource('route');
                }
                if (map.getLayer('floor-transition-marker')) {
                    map.removeLayer('floor-transition-marker');
                }
                if (map.getSource('floor-transition')) {
                    map.removeSource('floor-transition');
                }
    
                // Show the current step's path
                const stepCoordinates = currentStepNodes.map(nodeID => {
                    const node = nodesData.features.find(feature => feature.properties.NODE_ID === nodeID);
                    return [node.properties.X, node.properties.Y];
                });
    
                const stepGeoJSON = {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": stepCoordinates
                    }
                };
    
                // Add the current step route
                map.addSource('step-route', {
                    type: 'geojson',
                    data: stepGeoJSON
                });
    
                map.addLayer({
                    id: 'step-route-layer',
                    type: 'line',
                    source: 'step-route',
                    paint: {
                        'line-color': '#33FF57',
                        'line-width': 4,
                        'line-opacity': 0.7
                    }
                });
    
                // Add floor transition marker only when changing floors
                if (steps.length > 1 && currentStepIndex < steps.length - 1) {
                    const currentFloor = stepFloor;
                    const nextFloor = nodesData.features.find(node => 
                        node.properties.NODE_ID === steps[currentStepIndex + 1][0]
                    )?.properties.Floor;
    
                    // Only add transition marker if floors are different
                    if (currentFloor !== nextFloor) {
                        // Determine transition direction
                        const transitionIcon = nextFloor > currentFloor ? '▲' : '▼';
    
                        // Get the last coordinate of the current step
                        const lastCoordinate = stepCoordinates[stepCoordinates.length - 1];
    
                        // Add transition marker
                        const transitionGeoJSON = {
                            "type": "FeatureCollection",
                            "features": [{
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": lastCoordinate
                                },
                                "properties": {
                                    "icon": transitionIcon
                                }
                            }]
                        };
    
                        map.addSource('floor-transition', {
                            type: 'geojson',
                            data: transitionGeoJSON
                        });
    
                        map.addLayer({
                            id: 'floor-transition-marker',
                            type: 'symbol',
                            source: 'floor-transition',
                            layout: {
                                'text-field': ['get', 'icon'],
                                'text-size': 30,
                                'text-allow-overlap': true
                            },
                            paint: {
                                'text-color': '#FF5733',
                                'text-halo-color': 'white',
                                'text-halo-width': 2
                            }
                        });
    
                        // Add click event to the transition marker
                        map.on('click', 'floor-transition-marker', () => {
                            if (currentStepIndex < steps.length - 1) {
                                currentStepIndex++;
                                updateStepDisplay();
                            }
                        });
    
                        // Change cursor to pointer when hovering over the marker
                        map.on('mouseenter', 'floor-transition-marker', () => {
                            map.getCanvas().style.cursor = 'pointer';
                        });
    
                        map.on('mouseleave', 'floor-transition-marker', () => {
                            map.getCanvas().style.cursor = '';
                        });
                    }
                }
            } else {
                console.error('Floor property not found for the current step!');
            }
        }
    };
    
        // Initialize the first step display
        updateStepDisplay();
    
        // Event listeners for navigating through the steps
        prevStepBtn.addEventListener('click', () => {
            if (currentStepIndex > 0) {
                currentStepIndex--;
                updateStepDisplay();
            }
        });
    
        nextStepBtn.addEventListener('click', () => {
            if (currentStepIndex < steps.length - 1) {
                currentStepIndex++;
                updateStepDisplay();
            }
        });
    
// Close steps modal functionality
const closeStepsModalBtn = document.getElementById('closeStepsModalBtn');
closeStepsModalBtn.addEventListener('click', () => {
    // Remove steps modal
    const stepsModal = document.getElementById('stepsModal');
    if (stepsModal) stepsModal.remove();

    // Remove route layers
    if (map.getLayer('step-route-layer')) {
        map.removeLayer('step-route-layer');
    }
    if (map.getSource('step-route')) {
        map.removeSource('step-route');
    }
    if (map.getLayer('route-layer')) {
        map.removeLayer('route-layer');
    }
    if (map.getSource('route')) {
        map.removeSource('route');
    }
    if (map.getLayer('floor-transition-marker')) {
        map.removeLayer('floor-transition-marker');
    }
    if (map.getSource('floor-transition')) {
        map.removeSource('floor-transition');
    }
});
    });
}    





