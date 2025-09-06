function initializePartyOverview() {
    // Definer partiinformasjon med logoer
    const parties = [
        { name: "Rødt", shorthand: "R", seats: 8, position: 1, color: "#da291c", classPrefix: "r", logo: "images/parties/r.png" },
        { name: "Sosialistisk Venstreparti", shorthand: "SV", seats: 13, position: 2, color: "#eb2e2d", classPrefix: "sv", logo: "images/parties/sv.png" },
        { name: "Arbeiderpartiet", shorthand: "AP", seats: 48, position: 3, color: "#ed1b34", classPrefix: "ap", logo: "images/parties/ap.png" },
        { name: "Senterpartiet", shorthand: "SP", seats: 28, position: 4, color: "#14773c", classPrefix: "sp", logo: "images/parties/sp.png" },
        { name: "Miljøpartiet De Grønne", shorthand: "MDG", seats: 3, position: 5, color: "#439539", classPrefix: "mdg", logo: "images/parties/mdg.png" },
        { name: "Kristelig Folkeparti", shorthand: "KrF", seats: 3, position: 6, color: "#ffbe00", classPrefix: "krf", logo: "images/parties/krf.png" },
        { name: "Venstre", shorthand: "V", seats: 8, position: 7, color: "#00807b", classPrefix: "v", logo: "images/parties/v.png" },
        { name: "Høyre", shorthand: "H", seats: 36, position: 8, color: "#007ac8", classPrefix: "h", logo: "images/parties/h.png" },
        { name: "Fremskrittspartiet", shorthand: "FrP", seats: 21, position: 9, color: "#002e5e", classPrefix: "frp", logo: "images/parties/frp.png" },
    ];
    
    // Hent detaljerte data fra issues.json
    fetch('data/issues.json')
        .then(response => response.json())
        .then(detailedIssues => {
            const partyIssuesMap = {};
            
            parties.forEach(party => {
                partyIssuesMap[party.shorthand] = {
                    fullyAgree: [],
                    partiallyAgree: [],
                    disagree: []
                };
            });
            
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
            
            generatePartyBoxes(parties, partyIssuesMap);
            initializeMobileView(parties, partyIssuesMap);
        })
        .catch(error => {
            console.error('Error loading detailed issues data:', error);
            fallbackPartyOverview(); // Fallback til eksisterende data
        });
}

// Fallback-funksjon
function fallbackPartyOverview() {
    // Denne funksjonaliteten kan beholdes eller tilpasses etter behov
    const parties = [
        { name: "Rødt", shorthand: "R", seats: 8, position: 1, color: "#da291c", classPrefix: "r", logo: "images/parties/r.png" },
        { name: "Sosialistisk Venstreparti", shorthand: "SV", seats: 13, position: 2, color: "#eb2e2d", classPrefix: "sv", logo: "images/parties/sv.png" },
        { name: "Arbeiderpartiet", shorthand: "AP", seats: 48, position: 3, color: "#ed1b34", classPrefix: "ap", logo: "images/parties/ap.png" },
        { name: "Senterpartiet", shorthand: "SP", seats: 28, position: 4, color: "#14773c", classPrefix: "sp", logo: "images/parties/sp.png" },
        { name: "Miljøpartiet De Grønne", shorthand: "MDG", seats: 3, position: 5, color: "#439539", classPrefix: "mdg", logo: "images/parties/mdg.png" },
        { name: "Kristelig Folkeparti", shorthand: "KrF", seats: 3, position: 6, color: "#ffbe00", classPrefix: "krf", logo: "images/parties/krf.png" },
        { name: "Venstre", shorthand: "V", seats: 8, position: 7, color: "#00807b", classPrefix: "v", logo: "images/parties/v.png" },
        { name: "Høyre", shorthand: "H", seats: 36, position: 8, color: "#007ac8", classPrefix: "h", logo: "images/parties/h.png" },
        { name: "Fremskrittspartiet", shorthand: "FrP", seats: 21, position: 9, color: "#002e5e", classPrefix: "frp", logo: "images/parties/frp.png" },
    ];
    
    const partyIssuesMap = {};
    
    parties.forEach(party => {
        partyIssuesMap[party.shorthand] = {
            fullyAgree: [],
            partiallyAgree: [],
            disagree: []
        };
    });
    
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
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            
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

// Lytt etter at dokumentet er ferdig lastet
document.addEventListener('DOMContentLoaded', function() {
    if (window.issues && window.issues.length > 0) {
        initializePartyOverview();
    } else {
        document.addEventListener('issuesDataLoaded', initializePartyOverview);
    }
});
