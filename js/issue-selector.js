// issue-selector.js - Funksjonalitet for å velge saker fra Kreftforeningens program

// Hent alle unike saksområder fra issues-arrayet
function getUniqueAreas() {
    const areas = issues.map(issue => issue.area);
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
                ${issues.map(issue => `<option value="${issue.id}">${issue.name}</option>`).join('')}
            </select>
            
            <div id="issueDetails" class="issue-details">
                <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
            </div>
        </div>
    `;
    
    // Plasser saksvelgeren på siden
    // Legg den mellom partilisten og blokkvisualiseringen
    const partySection = document.querySelector('.party-section');
    const sectionDivider = document.querySelector('.section-divider');
    
    if (partySection && sectionDivider) {
        partySection.parentNode.insertBefore(issueSelectorContainer, sectionDivider);
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
    let filteredIssues = issues;
    if (selectedArea) {
        filteredIssues = issues.filter(issue => issue.area === selectedArea);
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
    const selectedIssue = issues.find(issue => issue.id == issueId);
    if (!selectedIssue) return;
    
    // Oppdater saksdetaljer
    updateIssueDetails(selectedIssue);
    
    // Marker partier som er enige (score 2)
    selectPartiesThatAgree(selectedIssue.partiesInAgreement);
    
    // Oppdater resultater og visualisering
    updateResults();
    updateVisualization();
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

// Legg til CSS-stiler for saksvelgeren
function addIssueSelectCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .issue-selector-container {
            margin: 30px 0;
        }
        
        .issue-selector {
            background-color: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        }
        
        .issue-filters {
            margin-bottom: 15px;
        }
        
        .area-filter,
        .issue-dropdown {
            width: 100%;
            padding: 12px 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            font-size: 1rem;
            margin: 10px 0;
            background-color: white;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            transition: all 0.2s ease;
        }
        
        .area-filter:focus,
        .issue-dropdown:focus {
            outline: none;
            border-color: var(--kf-pink);
            box-shadow: 0 0 0 2px rgba(230, 60, 140, 0.2);
        }
        
        .issue-details {
            background-color: #f8f1f8;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            border-left: 4px solid var(--kf-purple);
            transition: all 0.3s ease;
        }
        
        .issue-name {
            color: var(--kf-purple);
            margin-bottom: 5px;
            font-size: 1.3rem;
        }
        
        .issue-area {
            color: #555;
            font-style: italic;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .issue-status {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 1.1rem;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .issue-status.majority {
            background: linear-gradient(90deg, var(--kf-light-green), var(--kf-green));
            color: white;
        }
        
        .issue-status.no-majority {
            background: linear-gradient(90deg, var(--kf-pink), var(--kf-purple));
            color: white;
        }
        
        .issue-parties {
            margin-top: 20px;
        }
        
        .issue-parties h4 {
            color: var(--kf-blue);
            margin-bottom: 10px;
        }
        
        .issue-parties-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .issue-party {
            padding: 5px 10px;
            border-radius: 20px;
            font-weight: 500;
            font-size: 0.9rem;
            background-color: #f0f0f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .no-parties {
            color: #777;
            font-style: italic;
        }
        
        @media (max-width: 768px) {
            .issue-selector {
                padding: 15px;
            }
            
            .issue-details {
                padding: 15px;
            }
            
            .issue-name {
                font-size: 1.2rem;
            }
            
            .issue-status {
                font-size: 1rem;
                padding: 12px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Initialiser saksvelgeren etter at siden er lastet
document.addEventListener('DOMContentLoaded', function() {
    // Vent til hovedapplikasjonen er initialisert
    setTimeout(() => {
        addIssueSelectCSS();
        createIssueSelector();
    }, 500);
});
