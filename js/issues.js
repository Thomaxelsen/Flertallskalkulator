// issues.js - Data om saker og partiers standpunkter
const issues = [];

// Funksjon for å laste inn issues-data
function loadIssuesData() {
    fetch('issues.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Tøm arrayen (i tilfelle denne funksjonen kjøres flere ganger)
            issues.length = 0;
            
            // Konverter fra den nye formateringen til det eksisterende formatet
            data.forEach(issueData => {
                // Finn alle partier med score 2 (helt enige)
                const partiesInAgreement = [];
                const partyQuotes = {};
                
                // Gå gjennom alle partier i partyStances
                for (const partyCode in issueData.partyStances) {
                    const stance = issueData.partyStances[partyCode];
                    
                    // Legg til partiet i partiesInAgreement hvis level er 2
                    if (stance.level === 2) {
                        partiesInAgreement.push(partyCode);
                    }
                    
                    // Legg til sitat hvis det finnes
                    if (stance.quote) {
                        partyQuotes[partyCode] = stance.quote;
                    }
                }
                
                // Lag issue-objekt i samme format som det eksisterende
                const issue = {
                    id: issueData.id,
                    area: issueData.area,
                    name: issueData.name,
                    partiesInAgreement: partiesInAgreement,
                    partyQuotes: partyQuotes
                };
                
                // Legg til i issues-arrayen
                issues.push(issue);
            });
            
            // Signaliser at data er lastet
            console.log("Issues data loaded successfully:", issues.length, "issues loaded");
            
            // Trigge et event som andre scripts kan lytte på
            const event = new CustomEvent('issuesDataLoaded');
            document.dispatchEvent(event);
        })
        .catch(error => {
            console.error('Error loading issues data:', error);
        });
}

// Last inn data når siden lastes
document.addEventListener('DOMContentLoaded', loadIssuesData);

// Gjør issues-arrayen tilgjengelig globalt
window.issues = issues;
