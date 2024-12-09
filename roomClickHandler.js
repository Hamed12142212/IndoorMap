

export function setupRoomClickHandler(map, roomToNodeMapping, findClosestNode, nodesDataGlobal, getCurrentFloor, updateRoute) {
    let selectedRoom = null;
    let destinationMarker = null;
    let isPlacingMarker = false;

    const findFloorSpecificClosestNode = (coordinates, nodesData) => {

        const floor = getCurrentFloor();
        // Convert floor to string for consistent comparison
        const targetFloor = floor === 'ground' ? '0' : 
                            floor === 'first' ? '1' : 
                            floor;

        let closestNode = null;
        let minDistance = Infinity;

        nodesData.features.forEach(node => {
            // Ensure the node is on the correct floor
            const nodeFloor = node.properties.Floor;
            if (nodeFloor !== targetFloor) return;

            const nodeCoords = [node.properties.X, node.properties.Y];
            const distance = calculateDistance(coordinates, nodeCoords);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestNode = node.properties.NODE_ID;
            }
        });

        return closestNode;
    };

    // Helper distance calculation function
    function calculateDistance(point1, point2) {
        const [x1, y1] = point1;
        const [x2, y2] = point2;
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    map.on('click', () => {
        if (isPlacingMarker) {
            // Ignore reset logic if we're placing a marker
            return;
        }
    
        // Reset room colors to original
        map.setPaintProperty('rooms-3d', 'fill-extrusion-color', '#32a852');
        map.setPaintProperty('rooms-3d', 'fill-extrusion-opacity', 0.3);
    
        // Clear the filter for the highlighted room layer and reset its opacity
        map.setFilter('highlighted-room', ['==', ['get', 'Room_Num'], '']);
        map.setPaintProperty('highlighted-room', 'fill-extrusion-opacity', 0);
    
        // Check if destinationMarker exists before removing buttons
        if (!destinationMarker) {
            const destinationButton = document.getElementById('destinationButton');
            if (destinationButton && destinationButton.style.display !== 'none') {
                destinationButton.remove();
            }
    
            const closeButton = document.getElementById('destinationCloseButton');
            if (closeButton && closeButton.style.display !== 'none') {
                closeButton.remove();
            }
        }
    });
    

    // Verify the layer exists before attaching the event
    if (!map.getLayer('rooms-3d')) {
        console.error('rooms-3d layer not found! Make sure the layer is added before setting up the click handler.');
        return;
    }

    map.on('click', 'rooms-3d', (e) => {
        console.log('Room clicked:', e.features[0]);
        
        const roomFeature = e.features[0];
        const roomNumber = roomFeature.properties.Room_Num;
        selectedRoom = roomNumber;
    
        // Debug logging
        console.log('Selected Room:', roomNumber);
    
        // Explicitly set paint properties 
        try {
            map.setPaintProperty('rooms-3d', 'fill-extrusion-color', [
                'case',
                ['==', ['get', 'Room_Num'], roomNumber],
                '#c0392b', // Red for the selected room
                '#32a852'   // Original green color for other rooms
            ]);
            
            console.log('Paint properties set successfully');
        } catch (error) {
            console.error('Error setting paint properties:', error);
        }
    
        // Update highlighted-room layer to show only the selected room
        try {
            map.setFilter('highlighted-room', ['==', ['get', 'Room_Num'], roomNumber]);
            console.log('Room filter set successfully');
        } catch (error) {
            console.error('Error setting room filter:', error);
        }
    
        // Create a temporary flash animation only for the selected room
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            const opacity = flashCount % 2 === 0 ? 0.6 : 0; // Flashing effect for selected room
            
            // Update opacity of highlighted-room layer
            map.setPaintProperty('highlighted-room', 'fill-extrusion-opacity', opacity);
            
            flashCount++;
    
            // Stop flashing after 6 iterations (3 full blinks)
            if (flashCount >= 6) {
                clearInterval(flashInterval);
                // Reset to original opacity after flashing ends
                map.setPaintProperty('highlighted-room', 'fill-extrusion-opacity', 0.6); 
            }
        }, 200); // Blink every 200ms

        // Remove any existing destination button and close button
        const existingButton = document.getElementById('destinationButton');
        const existingCloseButton = document.getElementById('destinationCloseButton');
        if (existingButton) {
            existingButton.remove();
        }
        if (existingCloseButton) {
            existingCloseButton.remove();
        }
        
        // Remove any existing destination marker
        if (destinationMarker) {
            destinationMarker.remove();
        }
        
        // Create a container for buttons
        const roomLabelsContainer = document.querySelector('.mapboxgl-map');
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.bottom = '20px';
        buttonContainer.style.left = '50%';
        buttonContainer.style.transform = 'translateX(-50%)';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.gap = '10px';
        
        // Create destination button
        const destinationButton = document.createElement('button');
        destinationButton.id = 'destinationButton';
        destinationButton.textContent = 'Set as Destination';
        destinationButton.style.padding = '10px';
        destinationButton.style.backgroundColor = '#4CAF50';
        destinationButton.style.color = 'white';
        destinationButton.style.border = 'none';
        destinationButton.style.borderRadius = '5px';
        destinationButton.style.cursor = 'pointer';
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.id = 'destinationCloseButton';
        closeButton.innerHTML = '&times;'; // × symbol
        closeButton.style.padding = '10px';
        closeButton.style.backgroundColor = '#ff4444';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '20px';
        closeButton.style.lineHeight = '1';
        


       
        // Add close button functionality
        closeButton.addEventListener('click', () => {
            // Remove destination marker if it exists
            if (destinationMarker) {
                destinationMarker.remove();
                destinationMarker = null;
            }
            
        
            // Reset room colors to original
            map.setPaintProperty('rooms-3d', 'fill-extrusion-color', '#32a852');
            map.setPaintProperty('rooms-3d', 'fill-extrusion-opacity', 0.3);
        
            // Clear the filter for the highlighted room layer and reset its opacity
            map.setFilter('highlighted-room', ['==', ['get', 'Room_Num'], '']);
            map.setPaintProperty('highlighted-room', 'fill-extrusion-opacity', 0);
        
            // Remove the destination and close buttons
            destinationButton.remove();
            closeButton.remove();
            
        
            // Reset the route
            if (map.getLayer('route-layer')) {
                map.removeLayer('route-layer');
            }
            if (map.getSource('route-source')) {
                map.removeSource('route-source');
            }
        
            // Reset FromNode and ToNode inputs (if relevant)
            const fromNodeInput = document.getElementById('fromNodeInput');
            const toNodeInput = document.getElementById('toNodeInput');
            if (fromNodeInput) fromNodeInput.value = '';
            if (toNodeInput) toNodeInput.value = '';
        
            // Reset selected room
            selectedRoom = null;
        
            // Close the modal (if you have a modal with a specific ID, e.g., 'findRouteModal')
            const findRouteModal = document.getElementById('findRouteModal');
            if (findRouteModal) {
                // Assuming the modal has a "close" method or you can hide it like this:
                findRouteModal.style.display = 'none';
            }

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
        
            
        
            // Reset cursor if necessary
            map.getCanvas().style.cursor = '';

            
        });
        
        
        
        // Add click event to destination button
        destinationButton.addEventListener('click', () => {
            isPlacingMarker = true;
            // Set ToNode based on the room number mapping
            const toNodeInput = document.getElementById('toNodeInput');
            const mappedNode = roomToNodeMapping[roomNumber];
            
            if (mappedNode) {
                toNodeInput.value = mappedNode;
            } else {
                // Optional: Handle rooms without a mapped node
                alert(`No node mapped for Room ${roomNumber}`);
                return;
            }
            
            // Enable pinpoint placement mode
            map.getCanvas().style.cursor = 'crosshair';
            
            // One-time click event to place the marker for FromNode
            const placeFromNodeMarker = (e) => {
                // Remove the one-time event listener
                map.off('click', placeFromNodeMarker);
                
                // Reset cursor
                map.getCanvas().style.cursor = '';
                
                // Create a marker at the clicked location
                if (destinationMarker) {
                    destinationMarker.remove();
                }
                
                destinationMarker = new mapboxgl.Marker({
                    color: "#FF0000",
                    draggable: true
                })
                .setLngLat(e.lngLat)
                .addTo(map);
                
                // Function to find route and update
                const updateRoute = () => {
                    // Find closest node to the marker
                    const markerLocation = destinationMarker.getLngLat();
                    if (nodesDataGlobal) {
                        const closestFromNode = findFloorSpecificClosestNode(
                            [markerLocation.lng, markerLocation.lat], 
                            nodesDataGlobal,
                            getCurrentFloor
                        );
                        if (closestFromNode) {
                            // Set FromNode
                            const fromNodeInput = document.getElementById('fromNodeInput');
                            fromNodeInput.value = closestFromNode;
                            
                            // Trigger route finding
                            const findRouteModalBtn = document.getElementById('findRouteModalBtn');
                            if (findRouteModalBtn) {
                                findRouteModalBtn.click();
                            }
                        } else {
                            alert(`No nodes found on floor ${getCurrentFloor}`);
                        }
                    }
                };
                
                // Initial route finding
                updateRoute();
                
                // Add drag end event to automatically redraw route
                destinationMarker.on('dragend', updateRoute);

                isPlacingMarker = false;
            };
        
            
            // Add the one-time click event
            map.on('click', placeFromNodeMarker);
        });
        
        // Add buttons to container
        buttonContainer.appendChild(destinationButton);
        buttonContainer.appendChild(closeButton);
        
        // Add container to map
        roomLabelsContainer.appendChild(buttonContainer);
    });

 

}    
