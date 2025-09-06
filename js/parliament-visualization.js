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
        const rowRadius = radius * 0.3 + (radius * 0.6 * (row / rows));
        const circumference = Math.PI * rowRadius;
        const maxSeatInRow = Math.floor(circumference / (seatRadius * 2.2));
        
        let seatsInRow;
        if (row < 3) {
            seatsInRow = Math.min(maxSeatInRow, Math.ceil(169 / (rows * 1.5)));
        } else if (row < 6) {
            seatsInRow = Math.min(maxSeatInRow, Math.ceil(169 / rows));
        } else {
            seatsInRow = Math.min(maxSeatInRow, Math.ceil(169 / (rows * 0.7)));
        }
        
        const angleStep = Math.PI / (seatsInRow - 1 || 1);
        
        for (let i = 0; i < seatsInRow; i++) {
            const angle = Math.PI - (angleStep * i);
            const x = rowRadius * Math.cos(angle);
            const y = rowRadius * Math.sin(angle) * -1;
            
            visualizationData.seatPositions.push({
                x: x,
                y: y,
                row: row,
                angle: angle,
                position: i
            });
        }
    }
    
    visualizationData.seatPositions.sort((a, b) => {
        if (a.angle !== b.angle) return b.angle - a.angle;
        return a.row - b.row;
    });
    
    if (visualizationData.seatPositions.length > 169) {
        visualizationData.seatPositions = visualizationData.seatPositions.slice(0, 169);
    }
    
    visualizationData.allSeats = [];
    let positionIndex = 0;
    
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
    updateLegend(parties, selectedParties);
    
    // Render all seats
    renderSeats(selectedParties);
}

// Render all seats based on current selection (UENDRET)
function renderSeats(selectedParties) {
    if (!visualizationData.svg) return;
    
    visualizationData.svg.selectAll("*").remove();
    
    const seatRadius = 6;
    
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
            })
            .on("click", function() {
                const partyShorthand = seat.party;
                togglePartyFromVisualization(partyShorthand);
            });
    });
}

// Hjelpefunksjon for å toggle et parti (UENDRET)
function togglePartyFromVisualization(partyShorthand) {
    const partyCard = document.querySelector(`.party-card[data-shorthand="${partyShorthand}"]`);
    
    if (partyCard && typeof toggleParty === 'function') {
        toggleParty(partyCard);
    }
}

// *** MODIFISERT FUNKSJON ***
// Update the legend to use new visual style
function updateLegend(parties, selectedParties = []) {
    document.getElementById('parliamentLegend').innerHTML = '';
    
    const sortedParties = [...parties].sort((a, b) => a.position - b.position);
    
    sortedParties.forEach(party => {
        const legendItem = document.createElement('div');
        // Gjenbruker '.party-tag-small' for konsistens, og legger til '.legend-item' for spesifisitet
        legendItem.className = 'party-tag-small legend-item'; 
        legendItem.dataset.shorthand = party.shorthand;
        
        const logo = document.createElement('img');
        logo.src = `images/parties/${party.shorthand.toLowerCase()}.png`;
        logo.className = 'party-tag-logo'; // Gjenbruker denne klassen
        logo.alt = party.name;

        const legendText = document.createElement('span');
        legendText.textContent = `${party.shorthand} (${party.seats})`;
        
        legendItem.appendChild(logo);
        legendItem.appendChild(legendText);
        
        legendItem.addEventListener('click', function() {
            togglePartyFromVisualization(party.shorthand);
        });
        
        document.getElementById('parliamentLegend').appendChild(legendItem);
    });
    
    updateLegendAppearance(selectedParties);
}

// Hjelpefunksjon for å oppdatere utseende på legend (UENDRET)
function updateLegendAppearance(selectedParties) {
    const legendItems = document.querySelectorAll('.legend-item');
    
    legendItems.forEach(item => {
        const partyShorthand = item.dataset.shorthand;
        const partyInfo = visualizationData.partyData[partyShorthand];
        
        if (selectedParties.includes(partyShorthand)) {
            item.classList.add('selected');
            item.style.opacity = '1';
            // Sett farger for valgt tilstand
            if(partyInfo) {
                item.style.backgroundColor = hexToRgba(partyInfo.color, 0.15);
                item.style.borderColor = partyInfo.color;
            }
        } else {
            item.classList.remove('selected');
            item.style.opacity = '0.7'; // Standard "dimmet"
            // Sett nøytrale farger
            item.style.backgroundColor = '#f8f9fa';
            item.style.borderColor = '#eee';
        }
    });
}

// This will be called to update the visualization when selection changes (UENDRET)
function updateD3Visualization(selectedParties) {
    renderSeats(selectedParties);
    updateLegendAppearance(selectedParties);
}

// *** NY HJELPEFUNKSJON *** (Kan være duplikat av den i script.js, men trygt å ha den her også)
function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#')) return 'rgba(200, 200, 200, 0.15)';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
