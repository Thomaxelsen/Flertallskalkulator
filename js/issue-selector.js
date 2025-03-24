// issue-selector.js - Funksjonalitet for å velge saker fra Kreftforeningens program

// Vent til dokumentet er helt lastet
document.addEventListener('DOMContentLoaded', function() {
    // Vent til issues er globalt tilgjengelig og partier er lastet
    const checkLoaded = setInterval(function() {
        if (window.issues && document.querySelectorAll('.party-card').length > 0) {
            clearInterval(checkLoaded);
            initializeIssueSelector();
        }
    }, 100);
});

// Initialiser saksvelgeren
function initializeIssueSelector() {
    addIssueSelectCSS();
    createIssueSelector();
}

// Hent alle unike saksområder fra issues-arrayet
function getUniqueAreas() {
    const areas = window.issues.map(issue => issue.area);
    return [...new Set(areas)];
}

// Opprett saksvelgeren og legg den til i DOM
function createIssueSelector() {
    // Lag container for saksvelgeren
    const issueSelectorContainer = document.createElement('div');
    issueSelectorContainer.className = 'issue-selector-container';
    
    // Hent unike saksområder
    const areas = getUniqueAreas();
    
    // Lag HTML for saksvelgeren
    issueSelectorContainer.innerHTML = `
        <div class="issue-selector">
            <h2 class="section-title">Velg sak fra Kreftforeningens program</h2>
            <p class="issue-description">Velg en sak for å se om det er flertall for Kreftforeningens standpunkt på Stortinget.</p>
            
            <div class="issue-filters">
                <select id="areaFilter" class="area-filter">
                    <option value="">Alle saksområder</option>
                    ${areas.map(area => `<option value="${area}">${area}</option>`).join('')}
                </select>
            </div>
            
            <select id="issueSelect" class="issue-dropdown">
                <option value="">Velg en sak...</option>
                ${window.issues.map(issue => `<option value="${issue.id}">${issue.name}</option>`).join('')}
            </select>
            
            <div id="issueDetails" class="issue-details">
                <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
            </div>
        </div>
    `;
    
// Plasser saksvelgeren på siden
// Legg den i høyre kolonne
const resultContainer = document.querySelector('.result-container');

if (resultContainer) {
    // Legg saksvelgeren etter resultatboksen
    resultContainer.parentNode.insertBefore(issueSelectorContainer, resultContainer.nextSibling);
}
    
    // Legg til hendelseslyttere
    setupIssueSelectionListeners();
}

// Sett opp hendelseslyttere for saksvelgeren
function setupIssueSelectionListeners() {
    const issueSelect = document.getElementById('issueSelect');
    const areaFilter = document.getElementById('areaFilter');
    
    // Når bruker velger saksområde, filtrer sakslisten
    areaFilter.addEventListener('change', function() {
        const selectedArea = this.value;
        updateIssueDropdown(selectedArea);
        
        // Nullstill saksvelgeren og partiutvalget
        issueSelect.value = '';
        resetPartySelection();
        updateIssueDetails();
    });
    
    // Når bruker velger en sak
    issueSelect.addEventListener('change', function() {
        const selectedIssueId = this.value;
        handleIssueSelection(selectedIssueId);
    });
}

// Oppdater saksdropdown basert på valgt saksområde
function updateIssueDropdown(selectedArea) {
    const issueSelect = document.getElementById('issueSelect');
    
    // Filtrer saker basert på valgt område
    let filteredIssues = window.issues;
    if (selectedArea) {
        filteredIssues = window.issues.filter(issue => issue.area === selectedArea);
    }
    
    // Oppdater dropdown-innhold
    issueSelect.innerHTML = `
        <option value="">Velg en sak...</option>
        ${filteredIssues.map(issue => `<option value="${issue.id}">${issue.name}</option>`).join('')}
    `;
}

// Håndter når bruker velger en sak
function handleIssueSelection(issueId) {
    // Nullstill partiutvalget først
    resetPartySelection();
    
    // Hvis ingen sak er valgt, avbryt
    if (!issueId) {
        updateIssueDetails();
        updateResults();
        updateVisualization();
        return;
    }
    
    // Finn den valgte saken
    const selectedIssue = window.issues.find(issue => issue.id == issueId);
    if (!selectedIssue) return;
    
    // Oppdater saksdetaljer
    updateIssueDetails(selectedIssue);
    
    // Marker partier som er enige (score 2)
    selectPartiesThatAgree(selectedIssue.partiesInAgreement);
    
    // Oppdater resultater og visualisering
    if (typeof updateResults === 'function') {
        updateResults();
    }
    if (typeof updateVisualization === 'function') {
        updateVisualization();
    }
}

// Oppdater detaljvisningen for saken
function updateIssueDetails(issue = null) {
    const issueDetails = document.getElementById('issueDetails');
    
    if (!issue) {
        issueDetails.innerHTML = `
            <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
        `;
        return;
    }
    
    // Finn antall mandater for partiene som er enige
    const totalSeats = calculateTotalSeats(issue.partiesInAgreement);
    const hasMajority = totalSeats >= 85;
    
    // Vis saksdetaljer og partiinformasjon
    issueDetails.innerHTML = `
        <h3 class="issue-name">${issue.name}</h3>
        <p class="issue-area">${issue.area}</p>
        
        <div class="issue-status ${hasMajority ? 'majority' : 'no-majority'}">
            ${hasMajority 
                ? `<strong>Flertall!</strong> ${totalSeats} av 169 mandater støtter Kreftforeningens standpunkt.` 
                : `<strong>Ikke flertall.</strong> ${totalSeats} av 169 mandater støtter Kreftforeningens standpunkt. Trenger ${85 - totalSeats} flere for flertall.`
            }
        </div>
        
        <div class="issue-parties">
            <h4>Partier som er helt enige med Kreftforeningen:</h4>
            <div class="issue-parties-list">
                ${issue.partiesInAgreement.length > 0 
                    ? issue.partiesInAgreement.map(partyCode => `<span class="issue-party party-tag-${getPartyClassPrefix(partyCode)}">${partyCode}</span>`).join('') 
                    : '<span class="no-parties">Ingen partier er helt enige</span>'
                }
            </div>
        </div>
    `;
}

// Regn ut totalt antall mandater for partiene som er enige
function calculateTotalSeats(partyShorthands) {
    let totalSeats = 0;
    
    // Gå gjennom alle partikort og sum opp mandater for de valgte partiene
    document.querySelectorAll('.party-card').forEach(card => {
        const shorthand = card.dataset.shorthand;
        if (partyShorthands.includes(shorthand)) {
            totalSeats += parseInt(card.dataset.seats);
        }
    });
    
    return totalSeats;
}

// Velg partiene som er enige (score 2)
function selectPartiesThatAgree(partyShorthands) {
    document.querySelectorAll('.party-card').forEach(card => {
        const shorthand = card.dataset.shorthand;
        
        // Hvis partiet er i listen over partier som er enige
        if (partyShorthands.includes(shorthand)) {
            card.classList.add('selected');
        }
    });
}

// Nullstill partiutvalget
function resetPartySelection() {
    document.querySelectorAll('.party-card').forEach(card => {
        card.classList.remove('selected');
    });
}

// Hjelpefunksjon for å hente classPrefix for et parti
function getPartyClassPrefix(partyShorthand) {
    const partyMap = {
        'R': 'r',
        'SV': 'sv',
        'AP': 'ap',
        'SP': 'sp',
        'MDG': 'mdg',
        'KRF': 'krf',
        'V': 'v',
        'H': 'h',
        'FRP': 'frp',
        'PF': 'pf'
    };
    
    return partyMap[partyShorthand] || partyShorthand.toLowerCase();
}

// CSS-stiler for saksvelgeren legges til via JavaScript for å unngå konflikter
function addIssueSelectCSS() {
    // Sjekk om stilene allerede er lagt til
    if (document.getElementById('issue-selector-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'issue-selector-styles';
    style.textContent = `
        /* Stilene er allerede lagt til i styles.css */
    `;
    
    document.head.appendChild(style);
}
