import { dijkstra, buildGraph } from './dijkstra.js'; 
import { initializeRouteModal } from './modals.js';
import { setupRoomClickHandler } from './roomClickHandler.js';

mapboxgl.accessToken = 'pk.eyJ1IjoiaGFtZWRoYWRhZCIsImEiOiJjbTNsdHBwaG4wbXo1MmxzZHQ2bGM2azFvIn0.pp7ow3gyNYL7pIA0ZQmHuw';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/hamedhadad/cm3xvrod9003g01sgap1cftwo',
    center: [35.1820, 31.96000],
    zoom: 17,
    pitch: 45,
    bearing: 90
});

let currentView = 'building';
let nodesDataGlobal = null;
let graphGlobal = null;

// Create a room to node mapping
const roomToNodeMapping = {
    '162': 'NODE_017',
    '150': 'NODE_041',
    '152': 'NODE_025',
    '101': 'NODE_035',
    '102': 'NODE_001',
    '112': 'NODE_034',
    '116': 'NODE_010',

    // Add more mappings as needed
};

function calculateDistance(point1, point2) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Function to find the closest node
function findClosestNode(coordinates, nodesData) {
    let closestNode = null;
    let minDistance = Infinity;

    nodesData.features.forEach(node => {
        const nodeCoords = [node.properties.X, node.properties.Y];
        const distance = calculateDistance(coordinates, nodeCoords);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestNode = node.properties.NODE_ID;
        }
    });

    return closestNode;
}

map.on('load', function() {
    // Create an array to track loaded data sources
    const dataSources = [
        { url: 'Ground_Floor.geojson', type: 'ground-floor' },
        { url: 'BZUBuildings.geojson', type: 'building-layer' },
        { url: 'Nodes.geojson', type: 'nodes' },
        { url: 'Edges.geojson', type: 'edges' },
        { url: 'Stairs.geojson', type: 'stairs' },
        { url: 'Rooms_G.geojson', type: 'rooms' }
    ];

    // Function to load a single data source
    function loadDataSource(sourceConfig) {
        return fetch(sourceConfig.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Add source to map
                map.addSource(sourceConfig.type, {
                    type: 'geojson',
                    data: data
                });

                // Add layers based on source type
                switch(sourceConfig.type) {
                    case 'ground-floor':
                        map.addLayer({
                            id: 'ground-floor-3d',
                            type: 'fill-extrusion',
                            source: 'ground-floor',
                            layout: { visibility: 'none' },
                            paint: {
                                'fill-extrusion-color': '#9c9292',
                                'fill-extrusion-opacity': 0.8,
                                'fill-extrusion-height': 2,
                                'fill-extrusion-base': 0
                            }
                        });
                        break;

                    case 'building-layer':
                        map.addLayer({
                            id: 'building-layer-3d',
                            type: 'fill-extrusion',
                            source: 'building-layer',
                            paint: {
                                'fill-extrusion-color': '#9c9292',
                                'fill-extrusion-opacity': 0.8,
                                'fill-extrusion-height': 15,
                                'fill-extrusion-base': 0
                            }
                        });
                        break;

                    case 'nodes':
                        map.addLayer({
                            id: 'nodes-layer',
                            type: 'circle',
                            source: 'nodes',
                            layout: { visibility: 'none' },
                            paint: {
                                'circle-radius': 6,
                                'circle-color': '#ff5733'
                            }
                        });

                        map.addLayer({
                            id: 'node-labels',
                            type: 'symbol',
                            source: 'nodes',
                            layout: {
                                 visibility: 'none',
                                'text-field': ['get', 'NODE_ID'],
                                'text-size': 12,
                                'text-anchor': 'top',
                                'text-offset': [0, 1.5]
                            },
                            paint: {
                                'text-color': '#000000',
                                'text-halo-color': '#ffffff',
                                'text-halo-width': 2
                            }
                        });
                        break;

                    case 'edges':
                        map.addLayer({
                            id: 'edges-layer',
                            type: 'line',
                            source: 'edges',
                            layout: { visibility: 'none' },
                            paint: {
                                'line-color': '#00f',
                                'line-width': 2
                            }
                        });
                        break;

                    case 'stairs':
                        map.addLayer({
                            id: 'stairs-3d',
                            type: 'fill-extrusion',
                            source: 'stairs',
                            layout: { visibility: 'none' },
                            paint: {
                                'fill-extrusion-color': '#9c9292',
                                'fill-extrusion-opacity': 1,
                                'fill-extrusion-height': ['get', 'Height'],
                                'fill-extrusion-base': 0
                            }
                        });
                        break;

                    case 'rooms':
                        map.addLayer({
                            id: 'rooms-3d',
                            type: 'fill-extrusion',
                            source: 'rooms',
                            layout: { visibility: 'none' },
                            paint: {
                                'fill-extrusion-color': '#32a852',
                                'fill-extrusion-opacity': 0.3,
                                'fill-extrusion-height': 2,
                                'fill-extrusion-base': 0
                            }
                        });

                        map.addLayer({
                            id: 'highlighted-room',
                            type: 'fill-extrusion',
                            source: 'rooms',
                            layout: { visibility: 'none' },
                            paint: {
                                'fill-extrusion-color': '#c0392b',
                                'fill-extrusion-height': 2,
                                'fill-extrusion-opacity': 0,
                            }
                        }, 'rooms-3d');

                        map.addLayer({
                            id: 'room-labels',
                            type: 'symbol',
                            source: 'rooms',
                            layout: {
                                visibility: 'none',
                                'text-field': ['get', 'Room_Num'],
                                'text-size': 14,
                                'text-anchor': 'center'
                            },
                            paint: {
                                'text-color': '#000000',
                                'text-halo-color': '#ffffff',
                                'text-halo-width': 2
                            }
                        });
                        break;
                }

                return data;
            })
            .catch(error => {
                console.error(`Error loading ${sourceConfig.url}:`, error);
            });
    }
    

    // Load all data sources
    Promise.all(dataSources.map(loadDataSource))
        .then(results => {
            const nodesData = results.find(data => data && data.type === 'FeatureCollection' && data.features[0]?.properties.NODE_ID);
            const edgesData = results.find(data => data && data.type === 'FeatureCollection' && data.features[0]?.properties.Start_NODE);

            if (nodesData && edgesData) {
                const graph = buildGraph(edgesData);

                nodesDataGlobal = nodesData;
                graphGlobal = graph;

                initializeRouteModal(map, graph, nodesData, dijkstra);

                // Set up room click handler with the extracted function
                setupRoomClickHandler(map, roomToNodeMapping, findClosestNode, nodesDataGlobal);
            }
        });

    // Toggle View Button
    document.getElementById('toggleViewButton').addEventListener('click', function () {
        if (currentView === 'building') {
            // Hide Building, Show Ground_Floor
            map.setLayoutProperty('building-layer-3d', 'visibility', 'none');
            map.setLayoutProperty('ground-floor-3d', 'visibility', 'visible');
            map.setLayoutProperty('stairs-3d', 'visibility', 'visible');
            map.setLayoutProperty('rooms-3d', 'visibility', 'visible');
            map.setLayoutProperty('room-labels', 'visibility', 'visible');
            map.setLayoutProperty('highlighted-room', 'visibility', 'visible');
            map.flyTo({ center: [35.1826, 31.96065], zoom: 20.5 }); // Zoom to Ground Floor
            currentView = 'ground-floor';
        } else if (currentView === 'ground-floor') {
            // Hide Ground_Floor, Show Nodes & Edges
            map.setLayoutProperty('ground-floor-3d', 'visibility', 'none');
            map.setLayoutProperty('stairs-3d', 'visibility', 'none');
            map.setLayoutProperty('rooms-3d', 'visibility', 'none');
            map.setLayoutProperty('room-labels', 'visibility', 'none');
            map.setLayoutProperty('highlighted-room', 'visibility', 'none');
            map.setLayoutProperty('nodes-layer', 'visibility', 'visible');
            map.setLayoutProperty('edges-layer', 'visibility', 'visible');
            map.setLayoutProperty('node-labels', 'visibility', 'visible'); // Show Node Labels
            map.flyTo({ center: [35.1826, 31.96065], zoom: 20.5 }); // Zoom to Ground Floor
            currentView = 'nodes-edges';
        } else if (currentView === 'nodes-edges') {
            // Reset to show Building
            map.setLayoutProperty('stairs-3d', 'visibility', 'none');
            map.setLayoutProperty('nodes-layer', 'visibility', 'none');
            map.setLayoutProperty('edges-layer', 'visibility', 'none');
            map.setLayoutProperty('node-labels', 'visibility', 'none'); // Hide Node Labels
            map.setLayoutProperty('rooms-3d', 'visibility', 'none');
            map.setLayoutProperty('room-labels', 'visibility', 'none');
            map.setLayoutProperty('highlighted-room', 'visibility', 'none');
            map.setLayoutProperty('building-layer-3d', 'visibility', 'visible');
            map.flyTo({ center: [35.1820, 31.96000], zoom: 17 }); // Reset to Building
            currentView = 'building';
        }
    });

    // Pitch Toggle Button
    document.getElementById('togglePitchButton').addEventListener('click', function() {
        const currentPitch = map.getPitch();
        if (currentPitch === 0) {
            map.setPitch(45);
        } else {
            map.setPitch(0);
        }
    });
});
