// issue-matrix.js - Håndterer visualisering av saksmatrisen

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM lastet i issue-matrix.js");
    
    // Laster inn data direkte
    loadMatrixData();
});

// Party data
const parties = [
    { name: "Rødt", shorthand: "R", seats: 8, position: 1, color: "#da291c", classPrefix: "r" },
    { name: "Sosialistisk Venstreparti", shorthand: "SV", seats: 13, position: 2, color: "#eb2e2d", classPrefix: "sv" },
    { name: "Arbeiderpartiet", shorthand: "AP", seats: 48, position: 3, color: "#ed1b34", classPrefix: "ap" },
    { name: "Senterpartiet", shorthand: "SP", seats: 28, position: 4, color: "#14773c", classPrefix: "sp" },
    { name: "Miljøpartiet De Grønne", shorthand: "MDG", seats: 3, position: 5, color: "#439539", classPrefix: "mdg" },
    { name: "Kristelig Folkeparti", shorthand: "KrF", seats: 3, position: 6, color: "#ffbe00", classPrefix: "krf" },
    { name: "Venstre", shorthand: "V", seats: 8, position: 7, color: "#00807b", classPrefix: "v" },
    { name: "Høyre", shorthand: "H", seats: 36, position: 8, color: "#007ac8", classPrefix: "h" },
    { name: "Fremskrittspartiet", shorthand: "FrP", seats: 21, position: 9, color: "#002e5e", classPrefix: "frp" }
];

// Mykere farger for enighetsgrad som matcher flertallskalkulatoren
const agreementColors = {
    0: {
        background: "rgba(230, 60, 140, 0.1)",
        color: "#e63c8c",
        border: "#e63c8c"
    },
    1: {
        background: "rgba(255, 190, 44, 0.1)",
        color: "#ffbe2c",
        border: "#ffbe2c"
    },
    2: {
        background: "rgba(0, 168, 163, 0.1)",
        color: "#00a8a3",
        border: "#00a8a3"
    }
};

// Kreftforeningens farge for overskrifter basert på nettsiden
const headerBackground = "#d9ebf7"; // Kreftforeningens lyseblå
const headerGradient = "linear-gradient(90deg, #6e2b62, #6e2b62)"; // Ensfarget versjon

// Global variabel for å holde data
let matrixIssues = [];

// Last data direkte fra issues.json
function loadMatrixData() {
    console.log("Laster matrixdata direkte fra issues.json");
    document.querySelector('.matrix-loader').textContent = 'Laster inn data...';
    
    fetch('data/issues.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data lastet fra issues.json:", data.length, "saker");
            matrixIssues = data;
            initializeMatrix();
        })
        .catch(error => {
            console.error("Feil ved henting av data:", error);
            document.querySelector('.matrix-loader').textContent = 
                'Kunne ikke laste data: ' + error.message + '. Vennligst oppdater siden.';
        });
}

// Hovedfunksjon for å initalisere matrisen
function initializeMatrix() {
    console.log("Initialiserer matrix med", matrixIssues.length, "saker");
    
    // Sjekk at dataene faktisk er lastet
    if (!matrixIssues || matrixIssues.length === 0) {
        console.error("Ingen issues-data funnet!");
        document.querySelector('.matrix-loader').textContent = 'Ingen data funnet. Vennligst oppdater siden.';
        return;
    }
    
    // Debugg: Sjekk strukturen til issues-dataene
    console.log("First issue:", matrixIssues[0]);
    if (matrixIssues[0].partyStances) {
        console.log("partyStances for første issue:", matrixIssues[0].partyStances);
        // Sjekk flere partistanser for å se om de inneholder level-verdier
        for (const partyCode in matrixIssues[0].partyStances) {
            console.log(`Parti: ${partyCode}, level: ${matrixIssues[0].partyStances[partyCode].level}`);
        }
    }
    
    // Fjern lasteindikatoren
    document.querySelector('.matrix-loader').style.display = 'none';
    
    // Hent unike områder
    const areas = getUniqueAreas();
    populateAreaFilter(areas);
    
    // Generer matrisen
    generateMatrix('all', 'heatmap');
    
    // Sett opp event listeners
    setupFilterListeners();
}

// Hent unike saksområder fra issues-arrayet
function getUniqueAreas() {
    const areas = matrixIssues.map(issue => issue.area);
    return [...new Set(areas)];
}

// Fyll area-filter med unike saksområder
function populateAreaFilter(areas) {
    const areaFilter = document.getElementById('area-filter');
    
    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
}

// Sett opp lyttere for filtrering
function setupFilterListeners() {
    const areaFilter = document.getElementById('area-filter');
    const viewMode = document.getElementById('view-mode');
    
    areaFilter.addEventListener('change', function() {
        generateMatrix(this.value, viewMode.value);
    });
    
    viewMode.addEventListener('change', function() {
        generateMatrix(areaFilter.value, this.value);
    });
}

// Generer matrisen basert på filtrering
function generateMatrix(areaFilter, viewMode) {
    console.log("Genererer matrise med", matrixIssues.length, "saker, filter:", areaFilter, "visning:", viewMode);
    
    const matrixContainer = document.getElementById('matrix-visualization');
    matrixContainer.innerHTML = '';
    
    // Opprett container for matrisen
    const matrixWrapper = document.createElement('div');
    matrixWrapper.className = 'matrix-container';
    matrixWrapper.style.overflowX = 'auto';
    matrixContainer.appendChild(matrixWrapper);
    
    // Filtrer saker basert på valgt område
    let filteredIssues = matrixIssues;
    if (areaFilter !== 'all') {
        filteredIssues = matrixIssues.filter(issue => issue.area === areaFilter);
    }
    
    console.log("Filtrerte saker:", filteredIssues.length);
    
    // Sorter saker etter område og deretter etter navn
    filteredIssues.sort((a, b) => {
        if (a.area !== b.area) return a.area.localeCompare(b.area);
        return a.name.localeCompare(b.name);
    });
    
    // Lag tabellen
    const table = document.createElement('table');
    table.className = 'matrix-table';
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = "0px";
    table.style.width = "100%";
    
    // Lag tabellhodet med parti-kolonner
    const thead = document.createElement('thead');
    thead.style.position = "sticky";
    thead.style.top = "0";
    thead.style.zIndex = "10";
    thead.style.backgroundColor = "white";
    
    const headerRow = document.createElement('tr');
    
    // Første kolonne for saknavn
    const issueHeader = document.createElement('th');
    issueHeader.className = 'issue-col';
    issueHeader.textContent = 'Sak';
    issueHeader.style.textAlign = "left";
    issueHeader.style.padding = "15px";
    issueHeader.style.position = "sticky";
    issueHeader.style.left = "0";
    issueHeader.style.backgroundColor = "white";
    issueHeader.style.zIndex = "11";
    issueHeader.style.minWidth = "300px";
    headerRow.appendChild(issueHeader);
    
    // Legg til kolonner for hvert parti - gjør dem mer subtile
    parties.forEach(party => {
        const partyHeader = document.createElement('th');
        partyHeader.className = 'party-col';
        partyHeader.textContent = party.shorthand;
        partyHeader.title = party.name;
        
        // Bruk mykere farge for partioverskriftene (70% opasitet)
        const rgbColor = hexToRgb(party.color);
        partyHeader.style.backgroundColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.7)`;
        
        partyHeader.style.color = '#fff';
        partyHeader.style.padding = "15px";
        partyHeader.style.textAlign = "center";
        partyHeader.style.minWidth = "80px"; // Økt bredde
        partyHeader.style.maxWidth = "80px"; // Fast maksbredde
        headerRow.appendChild(partyHeader);
    });
    
    // Legg til SUM-kolonne
    const sumHeader = document.createElement('th');
    sumHeader.className = 'party-col';
    sumHeader.textContent = 'SUM';
    sumHeader.title = 'Sum av poeng fra alle partier';
    sumHeader.style.padding = "15px";
    sumHeader.style.textAlign = "center";
    sumHeader.style.backgroundColor = "#f5f5f5";
    sumHeader.style.minWidth = "80px"; // Samme bredde
    headerRow.appendChild(sumHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Lag tabellkroppen
    const tbody = document.createElement('tbody');
    
    // Gruppe issues etter område - bruk samme sortering som i excelark
    const areaOrder = [
        "Arbeidsliv",
        "Diagnostikk og tidlig oppdagelse",
        "Folkehelse og forebygging",
        "Forskning og innovasjon",
        "Frivillig sektor",
        "Kreftomsorg",
        "Rettigheter",
        "Tilgang til behandling",
        "Økt investeringer i helse"
    ];
    
    // Gruppe issues etter område
    const issuesByArea = {};
    filteredIssues.forEach(issue => {
        if (!issuesByArea[issue.area]) {
            issuesByArea[issue.area] = [];
        }
        issuesByArea[issue.area].push(issue);
    });
    
    // Gå gjennom områdene i riktig rekkefølge
    areaOrder.forEach(area => {
        // Hopp over hvis det ikke er noen saker i dette området eller hvis filtrert
        if (!issuesByArea[area] || issuesByArea[area].length === 0) return;
        
        // Lag områdeoverskrift med Kreftforeningens lilla overskriftsfarge
        const areaRow = document.createElement('tr');
        areaRow.className = 'area-header';
        
        const areaCell = document.createElement('td');
        areaCell.colSpan = parties.length + 2; // +2 for issue-col og SUM
        areaCell.textContent = area;
        areaCell.style.background = headerBackground; // Bruk Kreftforeningens lilla
        areaCell.style.color = "white";
        areaCell.style.fontWeight = "bold";
        areaCell.style.padding = "12px";
        areaCell.style.textAlign = "center";
        areaCell.style.fontSize = "1.2rem";
        areaCell.style.borderRadius = "0"; // Fjern avrunding
        
        // Legg til ekstra attributter for styling og tilgjengelighet
        areaCell.setAttribute('role', 'heading');
        areaCell.setAttribute('aria-level', '2');
        
        areaRow.appendChild(areaCell);
        tbody.appendChild(areaRow);
        
        // Gå gjennom hver sak i dette området
        issuesByArea[area].forEach(issue => {
            const row = document.createElement('tr');
            row.style.height = "60px"; // Økt høyde
            
            // Annenhver rad styling
            if (tbody.children.length % 2 === 0) {
                row.style.backgroundColor = "#f8f9fa";
            }
            
            // Celle for saknavn
            const issueCell = document.createElement('td');
            issueCell.className = 'issue-col';
            issueCell.textContent = issue.name;
            issueCell.title = issue.name;
            issueCell.style.textAlign = "left";
            issueCell.style.padding = "10px 15px";
            issueCell.style.position = "sticky";
            issueCell.style.left = "0";
            issueCell.style.backgroundColor = row.style.backgroundColor || "white";
            issueCell.style.borderBottom = "1px solid #f0f0f0";
            row.appendChild(issueCell);
            
            // Hold styr på total poengsum for alle partier i denne saken
            let totalPoints = 0;
            
            // Lag en celle for hvert parti
            parties.forEach(party => {
                const cellContainer = document.createElement('td');
                cellContainer.style.textAlign = "center";
                cellContainer.style.verticalAlign = "middle";
                cellContainer.style.borderBottom = "1px solid #f0f0f0";
                cellContainer.style.padding = "10px";
                cellContainer.style.width = "80px"; // Fast bredde
                
                // Hent enighetsgrad hvis den finnes
                let agreementLevel = 0;
                if (issue.partyStances && issue.partyStances[party.shorthand]) {
                    agreementLevel = issue.partyStances[party.shorthand].level;
                }
                
                // Opprett oval boks som ligner på partiboksene i flertallskalkulatoren
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Sett fargeklasse basert på enighetsgrad
                const colors = agreementColors[agreementLevel];
                
                // Sett styling for oval boks - mer som partiboksene i flertallskalkulatoren
                cell.style.backgroundColor = colors.background;
                cell.style.color = colors.color;
                cell.style.border = `1px solid ${colors.border}`;
                cell.style.borderRadius = "24px"; // Mer avrundet
                cell.style.width = "70px"; // Nesten full bredde
                cell.style.height = "36px"; // Høyere
                cell.style.display = "flex"; // Bruk flex for vertikal sentrering
                cell.style.alignItems = "center"; // Vertikal sentrering
                cell.style.justifyContent = "center"; // Horisontal sentrering
                cell.style.fontWeight = "bold";
                cell.style.fontSize = "1rem"; // Større tekst
                cell.style.cursor = "pointer";
                
                // Sett innholdet basert på visningsmodus
                if (viewMode === 'numbers') {
                    cell.textContent = agreementLevel;
                } else {
                    // Ved heatmap/farge-visning, ikke vis tall
                    cell.innerHTML = '&nbsp;'; // Usynlig mellomrom for konsistent høyde
                }
                
                // Legg til tooltip-data
                cell.dataset.party = party.shorthand;
                cell.dataset.issue = issue.id;
                cell.dataset.level = agreementLevel;
                
                // Event listener for å vise tooltip
                cell.addEventListener('click', function() {
                    showTooltip(this, issue, party.shorthand, agreementLevel);
                });
                
                cellContainer.appendChild(cell);
                row.appendChild(cellContainer);
                
                // Legg til poengene fra dette partiet til totalen
                totalPoints += agreementLevel;
            });
            
            // Legg til SUM-celle med oval styling
            const sumCellContainer = document.createElement('td');
            sumCellContainer.style.textAlign = "center";
            sumCellContainer.style.verticalAlign = "middle";
            sumCellContainer.style.borderBottom = "1px solid #f0f0f0";
            sumCellContainer.style.backgroundColor = "#f5f5f5";
            sumCellContainer.style.width = "80px"; // Fast bredde
            
            const sumCell = document.createElement('div');
            sumCell.textContent = totalPoints;
            sumCell.style.fontWeight = 'bold';
            sumCell.style.borderRadius = '24px'; // Mer avrundet
            sumCell.style.width = '70px'; // Matcher celler
            sumCell.style.height = '36px'; // Matcher celler
            sumCell.style.display = 'flex'; // Bruk flex for vertikal sentrering
            sumCell.style.alignItems = 'center'; // Vertikal sentrering
            sumCell.style.justifyContent = 'center'; // Horisontal sentrering
            sumCell.style.fontSize = '1rem'; // Større tekst
            
            // Fargekode basert på total poengsum (maksimum mulig er parties.length * 2)
            const maxPossiblePoints = parties.length * 2;
            const scoreRatio = totalPoints / maxPossiblePoints;
            
            if (scoreRatio >= 0.6) { // Høy enighet (60%+ av maksimum)
                sumCell.style.backgroundColor = 'rgba(0, 168, 163, 0.1)'; // Mykere
                sumCell.style.color = '#00a8a3';
                sumCell.style.border = '1px solid #00a8a3';
            } else if (scoreRatio >= 0.3) { // Middels enighet (30-60% av maksimum)
                sumCell.style.backgroundColor = 'rgba(255, 190, 44, 0.1)'; // Mykere
                sumCell.style.color = '#ffbe2c';
                sumCell.style.border = '1px solid #ffbe2c';
            } else { // Lav enighet (mindre enn 30% av maksimum)
                sumCell.style.backgroundColor = 'rgba(230, 60, 140, 0.1)'; // Mykere
                sumCell.style.color = '#e63c8c';
                sumCell.style.border = '1px solid #e63c8c';
            }
            
            sumCellContainer.appendChild(sumCell);
            row.appendChild(sumCellContainer);
            tbody.appendChild(row);
        });
    });
    
    table.appendChild(tbody);
    matrixWrapper.appendChild(table);
    
    // Lag tooltip-container hvis den ikke finnes
    if (!document.querySelector('.matrix-tooltip')) {
        const tooltip = document.createElement('div');
        tooltip.className = 'matrix-tooltip';
        tooltip.style.display = 'none';
        tooltip.style.position = 'absolute';
        tooltip.style.zIndex = '1000';
        tooltip.style.backgroundColor = 'white';
        tooltip.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        tooltip.style.borderRadius = '12px';
        tooltip.style.padding = '20px';
        tooltip.style.maxWidth = '350px';
        document.body.appendChild(tooltip);
    }
    
    // Oppdater legend for å matche celle-stilen
    updateLegendStyles();
}

// Funksjon for å konvertere hex farge til RGB
function hexToRgb(hex) {
    // Fjern # hvis det finnes
    hex = hex.replace('#', '');
    
    // Parse til RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
}

// Funksjon for å oppdatere legendens stiler
function updateLegendStyles() {
    const legendItems = document.querySelectorAll('.legend-item');
    
    legendItems.forEach(item => {
        // Finn level fra klassen til .legend-color innenfor dette elementet
        const colorElement = item.querySelector('.legend-color');
        if (!colorElement) return;
        
        const level = colorElement.classList.contains('level-0') ? 0 : 
                     colorElement.classList.contains('level-1') ? 1 : 2;
        
        const colors = agreementColors[level];
        
        // Stil legendeelementet
        item.style.borderRadius = '24px'; // Mer avrundet
        item.style.padding = '8px 20px'; // Større padding
        item.style.backgroundColor = colors.background;
        item.style.border = `1px solid ${colors.border}`;
        item.style.color = colors.color;
        item.style.display = 'inline-flex';
        item.style.alignItems = 'center';
        
        // Stil fargeelementet
        colorElement.style.display = 'inline-block';
        colorElement.style.width = '25px'; // Større
        colorElement.style.height = '25px'; // Større
        colorElement.style.borderRadius = '12px';
        colorElement.style.marginRight = '10px';
        colorElement.style.backgroundColor = colors.background;
        colorElement.style.border = `1px solid ${colors.border}`;
        
        // Stil tekstelementet
        const textElement = item.querySelector('.legend-text');
        if (textElement) {
            textElement.style.color = colors.color;
            textElement.style.fontWeight = 'bold';
            textElement.style.fontSize = '1rem'; // Større tekst
        }
    });
}

// Funksjon for å vise tooltip med detaljer
function showTooltip(element, issue, partyCode, level) {
    const tooltip = document.querySelector('.matrix-tooltip');
    const rect = element.getBoundingClientRect();
    
    // Finn partinavn og farge
    const party = parties.find(p => p.shorthand === partyCode);
    const partyName = party ? party.name : partyCode;
    const partyColor = party ? party.color : '#333';
    
    // Finn eventuelt sitat
    let quote = '';
    if (issue.partyStances && issue.partyStances[partyCode] && issue.partyStances[partyCode].quote) {
        quote = issue.partyStances[partyCode].quote;
    }
    
    // Sett enighetsgrad-tekst
    let levelText = '';
    let colors = agreementColors[level];
    
    if (level === 2) {
        levelText = 'Helt enig';
    } else if (level === 1) {
        levelText = 'Delvis enig';
    } else {
        levelText = 'Ikke enig / ingen standpunkt';
    }
    
    // Bygg tooltip-innhold
    let tooltipContent = `
        <h3 style="margin-top: 0; color: #6e2b62; border-bottom: 1px solid #eee; padding-bottom: 10px;">${issue.name}</h3>
        <p><strong style="color: ${partyColor}">${partyName}</strong> er <strong style="display: inline-block; padding: 3px 10px; border-radius: 24px; background-color: ${colors.background}; color: ${colors.color}; border: 1px solid ${colors.border};">${levelText}</strong> med Kreftforeningen i denne saken.</p>
    `;
    
    // Legg til sitat hvis det finnes
    if (quote) {
        tooltipContent += `<div style="background-color: #f9f9f9; padding: 12px; margin-top: 15px; border-left: 3px solid #6e2b62; border-radius: 8px; font-style: italic;">"${quote}"</div>`;
    } else {
        tooltipContent += `<p style="font-style: italic; color: #777;">Ingen utdypende informasjon tilgjengelig.</p>`;
    }
    
    tooltip.innerHTML = tooltipContent;
    
    // Posisjonere tooltip
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const tooltipHeight = 200; // Estimert høyde
    
    let top = rect.top + scrollTop - tooltipHeight - 20;
    
    // Hvis tooltip går over toppen av vinduet, vis den under elementet i stedet
    if (top < scrollTop) {
        top = rect.bottom + scrollTop + 10;
    }
    
    tooltip.style.left = (rect.left + rect.width / 2 - 175) + 'px'; // Sentrert
    tooltip.style.top = top + 'px';
    tooltip.style.display = 'block';
    
    // Legg til event listener for å lukke tooltip
    document.addEventListener('click', closeTooltip);
}

// Funksjon for å lukke tooltip
function closeTooltip(event) {
    const tooltip = document.querySelector('.matrix-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
    document.removeEventListener('click', closeTooltip);
}
