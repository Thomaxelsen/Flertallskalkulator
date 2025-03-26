// party-overview.js - Genererer partioversikt basert på issues.js data

document.addEventListener('DOMContentLoaded', function() {
    // Vent til issues-objektet er lastet
    const checkLoaded = setInterval(function() {
        if (window.issues) {
            clearInterval(checkLoaded);
            initializePartyOverview();
        }
    }, 100);
});

function initializePartyOverview() {
    // Definer partiinformasjon (samme som i din eksisterende kode)
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
    
    // Analyser issues-data for å finne ut hvilke partier som støtter hvilke saker
    const partyIssuesMap = {};
    
    // Initialiser tomt array for hvert parti
    parties.forEach(party => {
        partyIssuesMap[party.shorthand] = [];
    });
    
    // Gå gjennom alle saker og legg til i riktig parti
    window.issues.forEach(issue => {
        if (issue.partiesInAgreement) {
            issue.partiesInAgreement.forEach(partyCode => {
                if (partyIssuesMap[partyCode]) {
                    partyIssuesMap[partyCode].push({
                        id: issue.id,
                        name: issue.name,
                        area: issue.area
                    });
                }
            });
        }
    });
    
    // Generer HTML for hver partiboks
    const partyOverviewContainer = document.querySelector('.party-overview-container');
    const partyDropdown = document.getElementById('party-dropdown');
    
    parties.forEach(party => {
        // Beregn prosentandel av saker partiet støtter
        const supportedIssues = partyIssuesMap[party.shorthand];
        const supportPercentage = Math.round((supportedIssues.length / window.issues.length) * 100);
        
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
                <div class="agreement-text">enighet med Kreftforeningens politikk</div>
            </div>
            
            <h3>Støtter disse sakene:</h3>
            <ul class="issue-list">
                ${supportedIssues.map(issue => `
                    <li class="issue-item">
                        <strong>${issue.name}</strong>
                        <div class="issue-area">${issue.area}</div>
                    </li>
                `).join('')}
            </ul>
            
            ${supportedIssues.length === 0 ? '<p class="no-issues">Ingen saker med full støtte</p>' : ''}
        `;
        
        // Legg til partiboks i container
        partyOverviewContainer.appendChild(partyBox);
        
        // Legg til parti i dropdown-menyen
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