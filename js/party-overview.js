// Hovedfunksjon som kjøres når siden lastes
function initializePartyOverview() {
    // Bruk Promise.all for å hente både parti- og saksdata samtidig
    Promise.all([
        fetch('data/parties.json').then(response => response.json()),
        fetch('data/issues.json').then(response => response.json())
    ])
    .then(([partiesData, detailedIssues]) => {
        // Legg til logostien dynamisk til hvert parti basert på shorthand
        const parties = partiesData.map(party => ({
            ...party,
            logo: `images/parties/${party.shorthand.toLowerCase()}.png`
        }));

        // Sorter partiene etter deres 'position'-egenskap
        parties.sort((a, b) => a.position - b.position);

        // Prosesser saksdataene for å mappe dem til hvert parti
        const partyIssuesMap = processIssueData(parties, detailedIssues);
        
        // Generer HTML for partiboksene og mobilvisningen
        generatePartyBoxes(parties, partyIssuesMap);
        initializeMobileView(parties, partyIssuesMap);
    })
    .catch(error => {
        console.error('Feil ved lasting av data:', error);
        // Her kan du legge inn en feilmelding til brukeren på selve siden
        const container = document.querySelector('.party-overview-container');
        if (container) {
            container.innerHTML = '<p class="error-message">Kunne ikke laste inn partidata. Vennligst prøv igjen senere.</p>';
        }
    });
}

// Funksjon for å prosessere og mappe saksdata til partiene
function processIssueData(parties, detailedIssues) {
    const partyIssuesMap = {};

    // Initialiser en tom struktur for hvert parti
    parties.forEach(party => {
        partyIssuesMap[party.shorthand] = {
            fullyAgree: [],
            partiallyAgree: [],
            disagree: []
        };
    });

    // Fyll strukturen med data fra issues.json
    detailedIssues.forEach(issue => {
        for (const partyCode in issue.partyStances) {
            // Sjekk at partiet fra saken eksisterer i vår partiliste
            if (partyIssuesMap[partyCode]) {
                const level = issue.partyStances[partyCode].level;
                const issueInfo = {
                    id: issue.id,
                    name: issue.name,
                    area: issue.area,
                    quote: issue.partyStances[partyCode].quote
                };

                if (level === 2) {
                    partyIssuesMap[partyCode].fullyAgree.push(issueInfo);
                } else if (level === 1) {
                    partyIssuesMap[partyCode].partiallyAgree.push(issueInfo);
                } else {
                    partyIssuesMap[partyCode].disagree.push(issueInfo);
                }
            }
        }
    });

    return partyIssuesMap;
}


// Generer HTML for partiboksene (samme som før)
function generatePartyBoxes(parties, partyIssuesMap) {
    const partyOverviewContainer = document.querySelector('.party-overview-container');
    partyOverviewContainer.innerHTML = '';
    
    parties.forEach(party => {
        const supportedIssues = partyIssuesMap[party.shorthand].fullyAgree;
        const partialIssues = partyIssuesMap[party.shorthand].partiallyAgree;
        const disagreedIssues = partyIssuesMap[party.shorthand].disagree;
        
        const totalIssues = supportedIssues.length + partialIssues.length + disagreedIssues.length;
        const supportPercentage = totalIssues > 0 ? Math.round((supportedIssues.length / totalIssues) * 100) : 0;
        
        const partyBox = document.createElement('div');
        partyBox.className = 'party-box';
        partyBox.dataset.party = party.shorthand;
        
        partyBox.innerHTML = `
            <div class="party-header">
                <img src="${party.logo}" alt="${party.name} logo" class="party-logo">
                <div class="party-info">
                    <h2 class="party-name">${party.name}</h2>
                    <div class="party-seat-count">${party.seats} mandater</div>
                </div>
            </div>
            
            <div class="party-stats">
                <div class="agreement-percentage">${supportPercentage}%</div>
                <div class="agreement-text">full enighet med Kreftforeningens politikk</div>
                <div class="agreement-bars">
                    <div class="bar-container">
                        <div class="label">Full enighet (${supportedIssues.length})</div>
                        <div class="bar">
                            <div class="bar-fill agree" style="width: ${totalIssues > 0 ? (supportedIssues.length / totalIssues) * 100 : 0}%"></div>
                        </div>
                    </div>
                    <div class="bar-container">
                        <div class="label">Delvis enighet (${partialIssues.length})</div>
                        <div class="bar">
                            <div class="bar-fill partial" style="width: ${totalIssues > 0 ? (partialIssues.length / totalIssues) * 100 : 0}%"></div>
                        </div>
                    </div>
                    <div class="bar-container">
                        <div class="label">Ingen støtte (${disagreedIssues.length})</div>
                        <div class="bar">
                            <div class="bar-fill disagree" style="width: ${totalIssues > 0 ? (disagreedIssues.length / totalIssues) * 100 : 0}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="issues-section">
                <div class="issues-tabs">
                    <button class="tab-button active" data-tab="fullyAgree">Full enighet (${supportedIssues.length})</button>
                    <button class="tab-button" data-tab="partiallyAgree">Delvis enighet (${partialIssues.length})</button>
                    <button class="tab-button" data-tab="disagree">Ingen støtte (${disagreedIssues.length})</button>
                </div>
                
                <div class="tab-content active" id="fullyAgree-${party.shorthand}">
                    ${generateIssueList(supportedIssues, 'agree')}
                </div>
                
                <div class="tab-content" id="partiallyAgree-${party.shorthand}">
                    ${generateIssueList(partialIssues, 'partial')}
                </div>
                
                <div class="tab-content" id="disagree-${party.shorthand}">
                    ${generateIssueList(disagreedIssues, 'disagree')}
                </div>
            </div>
        `;
        
        partyOverviewContainer.appendChild(partyBox);
        setupTabButtons(partyBox);
    });
}

// Generer HTML for saksliste (samme som før)
function generateIssueList(issues, agreementType) {
    if (issues.length === 0) {
        return '<p class="no-issues">Ingen saker i denne kategorien</p>';
    }
    
    return `<ul class="issue-list ${agreementType}-list">
        ${issues.map(issue => `
            <li class="issue-item ${agreementType}-item">
                <strong>${issue.name}</strong>
                <div class="issue-area">${issue.area}</div>
                ${issue.quote ? `<div class="issue-quote">"${issue.quote}"</div>` : ''}
            </li>
        `).join('')}
    </ul>`;
}

// Sett opp event listeners for fanene (samme som før)
function setupTabButtons(partyBox) {
    const tabButtons = partyBox.querySelectorAll('.tab-button');
    const tabContents = partyBox.querySelectorAll('.tab-content');
    const partyShorthand = partyBox.dataset.party;
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            
            const tabId = button.dataset.tab;
            document.getElementById(`${tabId}-${partyShorthand}`).classList.add('active');
        });
    });
}

// Initialiser mobilvisning (samme som før)
function initializeMobileView(parties, partyIssuesMap) {
    const partyDropdown = document.getElementById('party-dropdown');
    partyDropdown.innerHTML = '<option value="">Velg parti...</option>';
    
    parties.forEach(party => {
        const option = document.createElement('option');
        option.value = party.shorthand;
        option.textContent = party.name;
        partyDropdown.appendChild(option);
    });
    
    partyDropdown.addEventListener('change', function() {
        const selectedParty = this.value;
        
        document.querySelectorAll('.party-box').forEach(box => {
            box.classList.remove('active');
        });
        
        if (selectedParty) {
            const selectedBox = document.querySelector(`.party-box[data-party="${selectedParty}"]`);
            if (selectedBox) {
                selectedBox.classList.add('active');
            }
        }
    });
}

// Lytt etter at dokumentet er ferdig lastet og kjør hovedfunksjonen
document.addEventListener('DOMContentLoaded', initializePartyOverview);
