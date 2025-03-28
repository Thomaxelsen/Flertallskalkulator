// Oppdatert generateMatrix-funksjon med forbedret områdeoverskrift-generering

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
    sumHeader.title = 'Sum av poeng fra alle partier';
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
        
        // Lag områdeoverskrift - forbedret for bedre synlighet
        const areaRow = document.createElement('tr');
        areaRow.className = 'area-header';
        
        const areaCell = document.createElement('td');
        areaCell.colSpan = parties.length + 2; // +2 for issue-col og SUM
        areaCell.textContent = area;
        
        // Legg til ekstra attributter for styling og tilgjengelighet
        areaCell.setAttribute('role', 'heading');
        areaCell.setAttribute('aria-level', '2');
        
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
            
            // Hold styr på total poengsum for alle partier i denne saken
            let totalPoints = 0;
            
            // Lag en celle for hvert parti
            parties.forEach(party => {
                const cell = document.createElement('td');
                cell.className = 'cell';
                
                // Hent enighetsgrad hvis den finnes
                let agreementLevel = 0;
                if (issue.partyStances && issue.partyStances[party.shorthand]) {
                    agreementLevel = issue.partyStances[party.shorthand].level;
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
                
                // Legg til poengene fra dette partiet til totalen
                totalPoints += agreementLevel;
            });
            
            // Debug: Sjekk at summen blir riktig
            console.log(`Sak "${issue.name}": Total poengsum = ${totalPoints}`);
            
            // Legg til SUM-celle
            const sumCell = document.createElement('td');
            sumCell.textContent = totalPoints;
            sumCell.style.fontWeight = 'bold';
            
            // Fargekode basert på total poengsum (maksimum mulig er parties.length * 2)
            const maxPossiblePoints = parties.length * 2;
            const scoreRatio = totalPoints / maxPossiblePoints;
            
            if (scoreRatio >= 0.6) { // Høy enighet (60%+ av maksimum)
                sumCell.style.backgroundColor = 'rgba(40, 167, 69, 0.2)'; // Grønn
            } else if (scoreRatio >= 0.3) { // Middels enighet (30-60% av maksimum)
                sumCell.style.backgroundColor = 'rgba(255, 193, 7, 0.2)'; // Gul
            } else { // Lav enighet (mindre enn 30% av maksimum)
                sumCell.style.backgroundColor = 'rgba(220, 53, 69, 0.2)'; // Rød
            }
            
            row.appendChild(sumCell);
            tbody.appendChild(row);
        });
    });
    
    table.appendChild(tbody);
    matrixContainer.appendChild(table);
    
    // Lag tooltip-container hvis den ikke finnes
    if (!document.querySelector('.matrix-tooltip')) {
        const tooltip = document.createElement('div');
        tooltip.className = 'matrix-tooltip';
        document.body.appendChild(tooltip);
    }
}
