// Parliament visualization using D3.js

// Global variables for visualization
let visualizationData = {
  svg: null,
  allSeats: [],
  partyData: {},
  seatPositions: []
};

// This function will be called from the main script
function createD3ParliamentVisualization(parties, selectedParties) {
    // Clear any existing visualization completely
    d3.select("#d3-parliament").html("");
    
    // Store party data for later reference
    visualizationData.partyData = {};
    parties.forEach(party => {
        visualizationData.partyData[party.shorthand] = party;
    });
    
    // Set up dimensions - adjusted to show full visualization
    const width = 500;
    const height = 300;
    const radius = Math.min(width, height * 1.4) / 2;
    
    // Create SVG container with responsive scaling
    const svg = d3.select("#d3-parliament")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("width", "100%") 
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height - 30})`); // Moved up to show inner row
    
    visualizationData.svg = svg;
    
    // Sort parties by political position (left to right)
    const sortedParties = [...parties].sort((a, b) => a.position - b.position);
    
    // Calculate positions for each seat in a hemicycle
    const seatRadius = 6;
    const rows = 8;
    
    // First calculate all possible positions
    visualizationData.seatPositions = [];
    
    for (let row = 0; row < rows; row++) {
        // Calculate radius for this row (outer rows have larger radius)
        const rowRadius = radius * 0.3 + (radius * 0.6 * (row / rows));
        
        // Calculate how many seats can fit in this row
        const circumference = Math.PI * rowRadius;
        const maxSeatInRow = Math.floor(circumference / (seatRadius * 2.2));
        
        // Distribute seats more evenly among rows
        let seatsInRow;
        if (row < 3) {
            seatsInRow = Math.min(maxSeatInRow, Math.ceil(169 / (rows * 1.5)));
        } else if (row < 6) {
            seatsInRow = Math.min(maxSeatInRow, Math.ceil(169 / rows));
        } else {
            seatsInRow = Math.min(maxSeatInRow, Math.ceil(169 / (rows * 0.7)));
        }
        
        // Calculate angle between seats
        const angleStep = Math.PI / (seatsInRow - 1 || 1);
        
        // Create positions for this row - from left to right
        for (let i = 0; i < seatsInRow; i++) {
            const angle = Math.PI - (angleStep * i);
            const x = rowRadius * Math.cos(angle);
            const y = rowRadius * Math.sin(angle) * -1;
            
            visualizationData.seatPositions.push({
                x: x,
                y: y,
                row: row,
                angle: angle, // Store angle for ordering
                position: i   // Store position in row for ordering
            });
        }
    }
    
    // Sort positions from left to right based on angle
    visualizationData.seatPositions.sort((a, b) => {
        if (a.angle !== b.angle) return b.angle - a.angle; // Higher angle = more to the left
        return a.row - b.row; // Inner rows first
    });
    
    // Ensure we don't have more positions than seats
    if (visualizationData.seatPositions.length > 169) {
        visualizationData.seatPositions = visualizationData.seatPositions.slice(0, 169);
    }
    
    // Now assign parties to positions in left-to-right order based on political position
    visualizationData.allSeats = [];
    let positionIndex = 0;
    
    // Add seats for each party from left to right
    sortedParties.forEach(party => {
        for (let i = 0; i < party.seats; i++) {
            if (positionIndex < visualizationData.seatPositions.length) {
                const position = visualizationData.seatPositions[positionIndex];
                visualizationData.allSeats.push({
                    party: party.shorthand,
                    color: party.color,
                    name: party.name,
                    selected: selectedParties.includes(party.shorthand),
                    x: position.x,
                    y: position.y,
                    row: position.row,
                    index: positionIndex
                });
                positionIndex++;
            }
        }
    });
    
    // Update legend with current party data
    updateLegend(parties);
    
    // Render all seats
    renderSeats(selectedParties);
}

// Render all seats based on current selection
function renderSeats(selectedParties) {
    if (!visualizationData.svg) return;
    
    // Remove all existing elements, not just seats
    visualizationData.svg.selectAll("*").remove();
    
    const seatRadius = 6;
    
    // Create seats
    visualizationData.allSeats.forEach(seat => {
        const isSelected = selectedParties.includes(seat.party);
        
        visualizationData.svg.append("circle")
            .attr("cx", seat.x)
            .attr("cy", seat.y)
            .attr("r", seatRadius)
            .attr("fill", seat.color)
            .attr("class", "seat")
            .attr("data-party", seat.party)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .style("opacity", isSelected ? 1 : 0.3)
            .style("cursor", "pointer")
            .on("mouseover", function() {
                d3.select(this).attr("r", seatRadius * 1.3);
                
                visualizationData.svg.append("text")
                    .attr("id", "tooltip")
                    .attr("x", seat.x)
                    .attr("y", seat.y - 15)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "10px")
                    .attr("fill", "#333")
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 0.5)
                    .attr("paint-order", "stroke")
                    .text(seat.name);
            })
            .on("mouseout", function() {
                d3.select(this).attr("r", seatRadius);
                d3.select("#tooltip").remove();
            });
    });
}

// Update the legend with current party data
function updateLegend(parties) {
    // Clear existing legend
    document.getElementById('parliamentLegend').innerHTML = '';
    
    // Sort parties by position
    const sortedParties = [...parties].sort((a, b) => a.position - b.position);
    
    // Create new legend items
    sortedParties.forEach(party => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const legendColor = document.createElement('div');
        legendColor.className = 'legend-color';
        legendColor.style.backgroundColor = party.color;
        
        const legendText = document.createElement('span');
        legendText.textContent = `${party.name} (${party.seats})`;
        
        legendItem.appendChild(legendColor);
        legendItem.appendChild(legendText);
        document.getElementById('parliamentLegend').appendChild(legendItem);
    });
}

// This will be called to update the visualization when selection changes
function updateD3Visualization(selectedParties) {
    // Re-render all seats with new selection
    renderSeats(selectedParties);
}
