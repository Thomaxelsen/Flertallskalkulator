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
    { name: "Fremskrittspartiet", shorthand: "FrP", seats: 21, position: 9, color: "#002e5e", classPrefix: "frp" },
    { name: "Pasientfokus", shorthand: "PF", seats: 1, position: 10, color: "#a04d94", classPrefix: "pf" }
];

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
    
    // Lag tabellhodet med parti-kolonner
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Første kolonne for saknavn
    const issueHeader = document.createElement('th');
    issueHeader.className = 'issue-col';
    issueHeader.textContent = 'Sak';
    headerRow.appendChild(issueHeader);
    
    // Legg til kolonner for hvert parti
    parties.forEach(party => {
        const partyHeader = document.createElement('th');
        partyHeader.className = 'party-col';
        partyHeader.textContent = party.shorthand;
        partyHeader.title = party.name;
        partyHeader.style.backgroundColor = party.color;
        partyHeader.style.color = '#fff';
        headerRow.appendChild(partyHeader);
    });
    
    // Legg til SUM-kolonne
    const sumHeader = document.createElement('th');
    sumHeader.className = 'party-col';
    sumHeader.textContent = 'SUM';
    sumHeader.title = 'Totalt antall partier som er helt enige';
    headerRow.appendChild(sumHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Lag tabellkroppen
    const tbody = document.createElement('tbody');
    
    // Gruppe issues etter område
    const issuesByArea = {};
    filteredIssues.forEach(issue => {
        if (!issuesByArea[issue.area]) {
            issuesByArea[issue.area] = [];
        }
        issuesByArea[issue.area].push(issue);
    });
    
    // Gå gjennom hvert område og lag egne seksjoner
    Object.keys(issuesByArea).forEach(area => {
        // Lag områdeoverskrift
        const areaRow = document.createElement('tr');
        areaRow.className = 'area-header';
        const areaCell = document.createElement('td');
        areaCell.colSpan = parties.length + 2; // +2 for issue-col og SUM
        areaCell.textContent = area;
        areaRow.appendChild(areaCell);
        tbody.appendChild(areaRow);
        
        // Gå gjennom hver sak i dette området
        issuesByArea[area].forEach(issue => {
            const row = document.createElement('tr');
            
            // Celle for saknavn
            const issueCell = document.createElement('td');
            issueCell.className = 'issue-col';
            issueCell.textContent = issue.name;
            issueCell.title = issue.name;
            row.appendChild(issueCell);
            
            // Hold styr på antall partier som er helt enige
            let totalAgreement = 0;
            
            // Debug
            console.log(`Behandler sak [${issue.id}] ${issue.name}, partyStances:`, issue.partyStances ? 'exists' : 'missing');
            
            // Lag en celle for hvert parti
            parties.forEach(party => {
                const cell = document.createElement('td');
                cell.className = 'cell';
                
                // Hent enighetsgrad hvis den finnes
                let agreementLevel = 0;
                if (issue.partyStances && issue.partyStances[party.shorthand]) {
                    agreementLevel = issue.partyStances[party.shorthand].level;
                    console.log(`Sak ${issue.id}, parti ${party.shorthand}, enighet: ${agreementLevel}`);
                }
                
                // Sett celleinnhold basert på visningsmodus
                if (viewMode === 'numbers') {
                    cell.textContent = agreementLevel;
                }
                
                // Sett fargeklasse basert på enighetsgrad
                cell.classList.add(`level-${agreementLevel}`);
                
                // Legg til tooltip-data
                cell.dataset.party = party.shorthand;
                cell.dataset.issue = issue.id;
                cell.dataset.level = agreementLevel;
                
                // Event listener for å vise tooltip
                cell.addEventListener('click', function() {
                    showTooltip(this, issue, party.shorthand, agreementLevel);
                });
                
                row.appendChild(cell);
                
                // Oppdater total hvis helt enig (nivå 2)
                if (agreementLevel === 2) {
                    totalAgreement++;
                }
            });
            
            // Legg til SUM-celle
            const sumCell = document.createElement('td');
            sumCell.textContent = totalAgreement;
            sumCell.style.fontWeight = 'bold';
            // Vurdere flertall
            if (totalAgreement >= 5) { // Med 5+ partier er det god sjanse for flertall
                sumCell.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
            } else if (totalAgreement >= 3) { // 3-4 partier kan være delvis flertall
                sumCell.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
            } else { // 0-2 partier er sannsynligvis ikke flertall
                sumCell.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
            }
            row.appendChild(sumCell);
            
            tbody.appendChild(row);
        });
    });
    
    table.appendChild(tbody);
    matrixContainer.appendChild(table);
    
    // Lag tooltip-container
    if (!document.querySelector('.matrix-tooltip')) {
        const tooltip = document.createElement('div');
        tooltip.className = 'matrix-tooltip';
        document.body.appendChild(tooltip);
    }
}

// Funksjon for å vise tooltip med detaljer
function showTooltip(element, issue, partyCode, level) {
    const tooltip = document.querySelector('.matrix-tooltip');
    const rect = element.getBoundingClientRect();
    
    // Finn partinavn
    const party = parties.find(p => p.shorthand === partyCode);
    const partyName = party ? party.name : partyCode;
    
    // Finn eventuelt sitat
    let quote = '';
    if (issue.partyStances && issue.partyStances[partyCode] && issue.partyStances[partyCode].quote) {
        quote = issue.partyStances[partyCode].quote;
    }
    
    // Sett enighetsgrad-tekst
    let levelText = '';
    if (level === 2) {
        levelText = 'Helt enig';
    } else if (level === 1) {
        levelText = 'Delvis enig';
    } else {
        levelText = 'Ikke enig / ingen standpunkt';
    }
    
    // Bygg tooltip-innhold
    let tooltipContent = `
        <h3>${issue.name}</h3>
        <p><strong>${partyName}</strong> er <strong>${levelText}</strong> med Kreftforeningen i denne saken.</p>
    `;
    
    // Legg til sitat hvis det finnes
    if (quote) {
        tooltipContent += `<div class="quote">"${quote}"</div>`;
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
