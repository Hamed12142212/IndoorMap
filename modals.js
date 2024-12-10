

export function initializeRouteModal(map, graph, nodesData, dijkstra) {
    // Create modal HTML
    const modalHTML = `
        <div id="routeModal">
            <div class="modal-content">
                <h2>Find Route</h2>
                <div class="input-wrapper">
                    <input type="text" id="fromNodeInput" autocomplete="off" class="modal-input" placeholder="Start Node (e.g., NODE_015)">
                    <div id="fromNodeDropdown" class="node-dropdown"></div>
                </div>
                <div class="input-wrapper">
                    <input type="text" id="toNodeInput" autocomplete="off" class="modal-input" placeholder="End Node (e.g., NODE_027)">
                    <div id="toNodeDropdown" class="node-dropdown"></div>
                </div>
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
    const fromNodeDropdown = document.getElementById('fromNodeDropdown');
    const toNodeDropdown = document.getElementById('toNodeDropdown');
    

    

    // Add event listeners to input fields
    function createNodeDropdown(inputElement, dropdownElement, nodesData) {
        // Extract unique node IDs and sort them
        const nodeIds = nodesData.features
            .map(feature => feature.properties.NODE_ID)
            .sort();

        // Create dropdown options
        function updateDropdown(searchTerm) {
            // Clear previous options
            dropdownElement.innerHTML = '';

            // Filter nodes based on input
            const filteredNodes = nodeIds.filter(nodeId => 
                nodeId.toLowerCase().includes(searchTerm.toLowerCase())
            );

            // Create dropdown items
            filteredNodes.slice(0, 999).forEach(nodeId => {
                const dropdownItem = document.createElement('div');
                dropdownItem.classList.add('dropdown-item');
                dropdownItem.textContent = nodeId;
                dropdownItem.addEventListener('click', () => {
                    inputElement.value = nodeId;
                    dropdownElement.style.display = 'none';
                });
                dropdownElement.appendChild(dropdownItem);
            });

            // Show/hide dropdown based on results
            dropdownElement.style.display = filteredNodes.length > 0 ? 'block' : 'none';
        }

        // Add event listeners for input
        inputElement.addEventListener('input', (e) => {
            updateDropdown(e.target.value);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!inputElement.contains(e.target) && !dropdownElement.contains(e.target)) {
                dropdownElement.style.display = 'none';
            }
        });

        // Show dropdown when input is focused
        inputElement.addEventListener('focus', (e) => {
            updateDropdown(e.target.value);
        });
    }

    // Initialize dropdowns for both inputs
    createNodeDropdown(fromNodeInput, fromNodeDropdown, nodesData);
    createNodeDropdown(toNodeInput, toNodeDropdown, nodesData);


    // Show modal when Find Route button is clicked
    routeButton.addEventListener('click', () => {
        routeModal.style.display = 'flex';
        // Small timeout to ensure display is set before adding show class
        setTimeout(() => {
            routeModal.classList.add('show');
        }, 10);
    });
    
    // Close modal with animation
    function closeModal() {
        routeModal.classList.remove('show');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            routeModal.style.display = 'none';
        }, 300); // Match this with the CSS transition time
    }
    
    // Cancel button closes the modal
    cancelRouteModalBtn.addEventListener('click', closeModal);
    
    // Handle route finding
    findRouteModalBtn.addEventListener('click', () => {
        const fromNode = fromNodeInput.value.trim();
        const toNode = toNodeInput.value.trim();
    
        // Close the modal after the user clicks the button
        closeModal();
    
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
    
        // Find the start node's floor
        const startNodeData = nodesData.features.find(feature => feature.properties.NODE_ID === fromNode);
        
        if (startNodeData) {
            // Map floor numbers to corresponding data-floor attributes
            const floorMap = {
                0: 'ground',
                1: 'first'
            };
    
            const startFloor = startNodeData.properties.Floor;
            
            // Find and click the correct floor button
            const floorNumberButtons = document.querySelectorAll('.floor-number');
            const targetButton = Array.from(floorNumberButtons).find(btn => 
                btn.dataset.floor === floorMap[startFloor]
            );
    
            if (targetButton) {
                // Programmatically trigger the click event on the target floor button
                targetButton.click();
            }
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
        const stepsModalHTML = `<div id="stepsModal" class="stepsModal">
        <button id="closeStepsModalBtn" class="closeStepsModalBtn">✕</button>
        <button id="prevStepBtn" class="prevStepBtn">←</button>
        <span id="stepTitle" class="stepTitle">Step ${currentStep}</span>
        <button id="nextStepBtn" class="nextStepBtn">→</button>
    </div>
    <style>
        @keyframes fadeInModal {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    
        #prevStepBtn:hover, #nextStepBtn:hover {
            transform: scale(1.1);
            color: #007bff;
        }
    
        #closeStepsModalBtn:hover {
            background: #ff6b6b;
            transform: rotate(90deg);
        }
    
        #stepTitle {
            text-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
    </style>
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
                
                stepTitle.style.transition = 'opacity 0.25s ease, transform 0.25s ease'; // Add transition for opacity and transform

stepTitle.style.opacity = 0;
stepTitle.style.transform = 'translateX(10px)'; // Slide it to the right (out of view)

setTimeout(() => {
    stepTitle.textContent = `Step ${currentStepIndex + 1}: Floor ${stepFloor}`;
    stepTitle.style.opacity = 1;
    stepTitle.style.transform = 'translateX(0)'; // Slide it back to its original position
}, 250);

    
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
    
                        
                        // Modify the click event for floor transition marker
map.on('click', 'floor-transition-marker', () => {
    // Add a small delay to ensure previous operations have completed
    setTimeout(() => {
        if (currentStepIndex < steps.length - 1) {
            // Explicitly check the next step's existence and floor
            const nextStep = steps[currentStepIndex + 1];
            if (nextStep && nextStep.length > 0) {
                const currentNode = nodesData.features.find(feature => 
                    feature.properties.NODE_ID === steps[currentStepIndex][0]
                );
                const nextNode = nodesData.features.find(feature => 
                    feature.properties.NODE_ID === nextStep[0]
                );

                // Ensure both current and next nodes exist and are on different floors
                if (currentNode && nextNode && 
                    currentNode.properties.Floor !== nextNode.properties.Floor) {
                    
                    // Determine the next floor and update UI accordingly
                    const currentFloor = currentNode.properties.Floor;
                    const nextFloor = nextNode.properties.Floor;

                    // Map floor numbers to corresponding data-floor attributes
                    const floorMap = {
                        0: 'ground',
                        1: 'first'
                    };

                    // Find the button for the next floor
                    const floorNumberButtons = document.querySelectorAll('.floor-number');
                    const targetButton = Array.from(floorNumberButtons).find(btn => 
                        btn.dataset.floor === floorMap[nextFloor]
                    );

                    if (targetButton) {
                        // Programmatically trigger the click event on the target floor button
                        targetButton.click();
                        
                        // Increment the step index
                        currentStepIndex++;
                        updateStepDisplay();
                    } else {
                        console.warn('Could not find floor button for transition');
                    }
                } else {
                    console.warn('Floor transition not valid or nodes not found');
                }
            }
        }
    }, 100); // Small 100ms delay to allow previous operations to complete
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
    

        prevStepBtn.addEventListener('mouseover', () => {
            prevStepBtn.style.transform = 'scale(1.1)';
            prevStepBtn.style.color = '#007bff';
        });
        
        prevStepBtn.addEventListener('mouseout', () => {
            prevStepBtn.style.transform = 'scale(1)';
            prevStepBtn.style.color = '#333';
        });
        
        nextStepBtn.addEventListener('mouseover', () => {
            nextStepBtn.style.transform = 'scale(1.1)';
            nextStepBtn.style.color = '#007bff';
        });
        
        nextStepBtn.addEventListener('mouseout', () => {
            nextStepBtn.style.transform = 'scale(1)';
            nextStepBtn.style.color = '#333';
        });
        // Event listeners for navigating through the steps
        prevStepBtn.addEventListener('click', () => {
            if (currentStepIndex > 0) {
                currentStepIndex--;
                
                // Find the floor for the current step
                const currentStepNodes = steps[currentStepIndex];
                const currentNode = nodesData.features.find(feature => 
                    feature.properties.NODE_ID === currentStepNodes[0]
                );
        
                if (currentNode) {
                    // Map floor numbers to corresponding data-floor attributes
                    const floorMap = {
                        0: 'ground',
                        1: 'first'
                    };
        
                    const currentFloor = currentNode.properties.Floor;
                    
                    // Find and click the correct floor button
                    const floorNumberButtons = document.querySelectorAll('.floor-number');
                    const targetButton = Array.from(floorNumberButtons).find(btn => 
                        btn.dataset.floor === floorMap[currentFloor]
                    );
        
                    if (targetButton) {
                        // Programmatically trigger the click event on the target floor button
                        targetButton.click();
                    }
                }
        
                updateStepDisplay();
            }
        });
        
        nextStepBtn.addEventListener('click', () => {
            if (currentStepIndex < steps.length - 1) {
                currentStepIndex++;
                
                // Find the floor for the current step
                const currentStepNodes = steps[currentStepIndex];
                const currentNode = nodesData.features.find(feature => 
                    feature.properties.NODE_ID === currentStepNodes[0]
                );
        
                if (currentNode) {
                    // Map floor numbers to corresponding data-floor attributes
                    const floorMap = {
                        0: 'ground',
                        1: 'first'
                    };
        
                    const currentFloor = currentNode.properties.Floor;
                    
                    // Find and click the correct floor button
                    const floorNumberButtons = document.querySelectorAll('.floor-number');
                    const targetButton = Array.from(floorNumberButtons).find(btn => 
                        btn.dataset.floor === floorMap[currentFloor]
                    );
        
                    if (targetButton) {
                        // Programmatically trigger the click event on the target floor button
                        targetButton.click();
                    }
                }
        
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





