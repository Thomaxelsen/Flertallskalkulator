// issues.js - Laster og lagrer fullstendig data om saker

// Global array for å holde fullstendige issue-data
const issues = [];

// Funksjon for å laste inn issues-data
function loadIssuesData() {
    console.log("issues.js: Fetching data/issues.json...");
    fetch('data/issues.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Tøm arrayen (i tilfelle denne funksjonen kjøres flere ganger)
            issues.length = 0;

            // *** ENDRING: Lagre den RÅ dataen direkte ***
            // Vi legger bare til hvert objekt fra JSON-filen slik det er.
            // Ingen forenkling/transformasjon her lenger.
            data.forEach(issueData => {
                // Validering (valgfritt, men nyttig)
                if (issueData.id && issueData.name && issueData.partyStances) {
                     issues.push(issueData); // Legg til det komplette objektet
                } else {
                    console.warn("issues.js: Skipping invalid issue data object:", issueData);
                }
            });
            // *** SLUTT ENDRING ***

            // Gjør den komplette dataen tilgjengelig globalt
             window.issues = issues; // Nå inneholder denne FULLSTENDIG data

            // Signaliser at data er lastet
            console.log(`issues.js: Issues data loaded successfully. ${issues.length} issues stored globally.`);

            // Trigge et event som andre scripts kan lytte på
            const event = new CustomEvent('issuesDataLoaded');
            document.dispatchEvent(event);
        })
        .catch(error => {
            console.error('issues.js: Error loading issues data:', error);
            // Send event selv om det feilet, slik at andre scripts vet at forsøket er gjort
             window.issues = []; // Sørg for at det er et tomt array
             const event = new CustomEvent('issuesDataLoaded');
            document.dispatchEvent(event);
        });
}

// Last inn data når siden lastes (eller når DOM er klar)
document.addEventListener('DOMContentLoaded', loadIssuesData);

// window.issues blir satt inne i loadIssuesData
