function initializePartyOverview() {
    // Definer partiinformasjon
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
     
    ];
    
    // Hent detaljerte data fra issues.json
    fetch('data/issues.json')
        .then(response => response.json())
        .then(detailedIssues => {
            // Analyser issues-data for å kategorisere partienes standpunkter
            const partyIssuesMap = {};
            
            // Initialiser tomt array for hvert parti
            parties.forEach(party => {
                partyIssuesMap[party.shorthand] = {
                    fullyAgree: [], // nivå 2
                    partiallyAgree: [], // nivå 1
                    disagree: [] // nivå 0
                };
            });
            
            // Gå gjennom alle saker og kategoriser hvert partis standpunkt
            detailedIssues.forEach(issue => {
                for (const partyCode in issue.partyStances) {
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
            });
            
            // Nå har vi en komplett oversikt over hvert partis standpunkter
            generatePartyBoxes(parties, partyIssuesMap);
            initializeMobileView(parties, partyIssuesMap);
        })
        .catch(error => {
            console.error('Error loading detailed issues data:', error);
            // Fallback til eksisterende data
            fallbackPartyOverview();
        });
}

// Fallback-funksjon som bruker eksisterende (konverterte) data
function fallbackPartyOverview() {
    // Bruk den eksisterende logikken for å vise bare full enighet
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

    ];
    
    // Analyser issues-data for å finne ut hvilke partier som støtter hvilke saker
    const partyIssuesMap = {};
    
    // Initialiser tomt array for hvert parti
    parties.forEach(party => {
        partyIssuesMap[party.shorthand] = {
            fullyAgree: [],
            partiallyAgree: [],
            disagree: []
        };
    });
    
    // Gå gjennom alle saker og legg til i riktig parti
    window.issues.forEach(issue => {
        if (issue.partiesInAgreement) {
            issue.partiesInAgreement.forEach(partyCode => {
                if (partyIssuesMap[partyCode]) {
                    partyIssuesMap[partyCode].fullyAgree.push({
                        id: issue.id,
                        name: issue.name,
                        area: issue.area
                    });
                }
            });
        }
    });
    
    generatePartyBoxes(parties, partyIssuesMap);
    initializeMobileView(parties, partyIssuesMap);
}

// Generer HTML for partiboksene
function generatePartyBoxes(parties, partyIssuesMap) {
    const partyOverviewContainer = document.querySelector('.party-overview-container');
    partyOverviewContainer.innerHTML = ''; // Tøm eksisterende innhold
    
    parties.forEach(party => {
        // Beregn prosentandel av saker partiet støtter fullt ut
        const supportedIssues = partyIssuesMap[party.shorthand].fullyAgree;
        const partialIssues = partyIssuesMap[party.shorthand].partiallyAgree;
        const disagreedIssues = partyIssuesMap[party.shorthand].disagree;
        
        // Beregn total antall saker
        const totalIssues = supportedIssues.length + partialIssues.length + disagreedIssues.length;
        const supportPercentage = Math.round((supportedIssues.length / totalIssues) * 100);
        
        // Opprett partiboks
        const partyBox = document.createElement('div');
        partyBox.className = 'party-box';
        partyBox.dataset.party = party.shorthand;
        
        // HTML for partiboksen
        partyBox.innerHTML = `
            <div class="party-header">
                <div class="party-icon icon-${party.classPrefix}" style="background-color: ${party.color}">
                    ${party.shorthand.charAt(0)}
                </div>
                <h2 class="party-name">${party.name}</h2>
                <div class="party-seat-count">${party.seats}</div>
            </div>
            
            <div class="party-stats">
                <div class="agreement-percentage">${supportPercentage}%</div>
                <div class="agreement-text">full enighet med Kreftforeningens politikk</div>
                <div class="agreement-bars">
                    <div class="bar-container">
                        <div class="label">Full enighet (${supportedIssues.length})</div>
                        <div class="bar">
                            <div class="bar-fill agree" style="width: ${(supportedIssues.length / totalIssues) * 100}%"></div>
                        </div>
                    </div>
                    <div class="bar-container">
                        <div class="label">Delvis enighet (${partialIssues.length})</div>
                        <div class="bar">
                            <div class="bar-fill partial" style="width: ${(partialIssues.length / totalIssues) * 100}%"></div>
                        </div>
                    </div>
                    <div class="bar-container">
                        <div class="label">Ingen støtte (${disagreedIssues.length})</div>
                        <div class="bar">
                            <div class="bar-fill disagree" style="width: ${(disagreedIssues.length / totalIssues) * 100}%"></div>
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
        
        // Legg til partiboks i container
        partyOverviewContainer.appendChild(partyBox);
        
        // Legg til event listeners for faner
        setupTabButtons(partyBox);
    });
}

// Generer HTML for saksliste
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

// Sett opp event listeners for fanene
function setupTabButtons(partyBox) {
    const tabButtons = partyBox.querySelectorAll('.tab-button');
    const tabContents = partyBox.querySelectorAll('.tab-content');
    const partyShorthand = partyBox.dataset.party;
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Fjern aktiv klasse fra alle knapper og innhold
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Legg til aktiv klasse på valgt knapp
            button.classList.add('active');
            
            // Vis tilhørende innhold
            const tabId = button.dataset.tab;
            document.getElementById(`${tabId}-${partyShorthand}`).classList.add('active');
        });
    });
}

// Initialiser mobilvisning
function initializeMobileView(parties, partyIssuesMap) {
    const partyDropdown = document.getElementById('party-dropdown');
    partyDropdown.innerHTML = '<option value="">Velg parti...</option>';
    
    parties.forEach(party => {
        const option = document.createElement('option');
        option.value = party.shorthand;
        option.textContent = party.name;
        partyDropdown.appendChild(option);
    });
    
    // Event listener for dropdown på mobil
    partyDropdown.addEventListener('change', function() {
        const selectedParty = this.value;
        
        // Skjul alle partibokser
        document.querySelectorAll('.party-box').forEach(box => {
            box.classList.remove('active');
        });
        
        // Vis valgt partiboks
        if (selectedParty) {
            const selectedBox = document.querySelector(`.party-box[data-party="${selectedParty}"]`);
            if (selectedBox) {
                selectedBox.classList.add('active');
            }
        }
    });
}

// Lytt etter at dokumentet er ferdig lastet
document.addEventListener('DOMContentLoaded', function() {
    // Lytt etter issues-data
    if (window.issues && window.issues.length > 0) {
        initializePartyOverview(); // Issues allerede lastet
    } else {
        document.addEventListener('issuesDataLoaded', initializePartyOverview);
    }
});
