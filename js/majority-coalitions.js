// majority-coalitions.js (OPPDATERT for å bruke full issue-data)
// Script for å vise flertallskoalisjoner for Kreftforeningens politikk

document.addEventListener('DOMContentLoaded', function() {
    console.log("Majority Coalitions: DOM loaded.");
    // Lytt etter at både issues og parties er lastet
    let issuesLoadedMC = false;
    let partiesLoadedMC = false;

    function checkDataAndInit() {
        if (issuesLoadedMC && partiesLoadedMC) {
             console.log("Majority Coalitions: Both issues and parties loaded. Initializing...");
            initializeCoalitions();
        } else {
             console.log(`Majority Coalitions: Still waiting... Issues: ${issuesLoadedMC}, Parties: ${partiesLoadedMC}`);
        }
    }

    // Håndter issues lasting
    if (window.issues && window.issues.length > 0) {
        console.log("Majority Coalitions: Issues already loaded.");
        issuesLoadedMC = true;
    } else {
        console.log("Majority Coalitions: Waiting for 'issuesDataLoaded' event.");
        document.addEventListener('issuesDataLoaded', () => {
            console.log("Majority Coalitions: 'issuesDataLoaded' event received.");
            issuesLoadedMC = true;
            checkDataAndInit();
        });
    }

    // Håndter parties lasting
    if (window.partiesDataLoaded && window.partiesData) {
         console.log("Majority Coalitions: Parties already loaded.");
        partiesLoadedMC = true;
    } else {
         console.log("Majority Coalitions: Waiting for 'partiesDataLoaded' event.");
        document.addEventListener('partiesDataLoaded', () => {
             console.log("Majority Coalitions: 'partiesDataLoaded' event received.");
            partiesLoadedMC = true;
            checkDataAndInit();
        });
         // Trigger lasting hvis nødvendig (fallback)
        if (!window.partiesDataLoaded) {
             console.log("Majority Coalitions: Triggering party data load (if needed)...");
            if (typeof loadPartiesData === 'function') { // Antar at partiesData.js eksponerer en funksjon
                loadPartiesData();
            } else { // Enkel fetch som backup
                 fetch('data/parties.json')
                    .then(r => r.ok ? r.json() : Promise.reject('fail'))
                    .then(d => { window.partiesData = d; window.partiesDataLoaded = true; document.dispatchEvent(new CustomEvent('partiesDataLoaded')); })
                    .catch(e => console.error("MC fallback fetch failed", e));
            }
        }
    }

    // Prøv å initialisere i tilfelle begge var klare med en gang
    checkDataAndInit();
});

// Koalisjonsdata - vil fylles under initialisering
let coalitionsData = [];
const MAJORITY_THRESHOLD_MC = 85; // Flertallsgrense på Stortinget (unik variabelnavn)
let partiesMapMC = {}; // Map for raskt oppslag

function initializeCoalitions() {
    // Sjekk om data faktisk er klar
    if (!window.issues || !window.partiesData || window.issues.length === 0 || window.partiesData.length === 0) {
        console.error("Majority Coalitions: Cannot initialize, data missing.", {issues: window.issues, parties: window.partiesData});
        const container = document.getElementById('coalitionsContainer');
         if (container) container.innerHTML = '<div class="no-coalitions"><p>Kunne ikke laste nødvendig data for å finne koalisjoner.</p></div>';
        return;
    }

    // Lag map for partidata
    window.partiesData.forEach(party => {
        partiesMapMC[party.shorthand] = party;
    });
     console.log("Majority Coalitions: Parties map created:", partiesMapMC);

    // Nullstill koalisjonsdata før ny beregning
    coalitionsData = [];

    // Finn koalisjoner for hver sak
    window.issues.forEach(issue => {
        // *** ENDRING: Hent nivå 2-partier fra partyStances ***
        let supportingParties = [];
        if (issue.partyStances) {
            for (const partyCode in issue.partyStances) {
                if (issue.partyStances[partyCode]?.level === 2) {
                     // Sjekk om partiet finnes i vår partiliste
                     if(partiesMapMC[partyCode]){
                        supportingParties.push(partyCode);
                     } else {
                         console.warn(`Majority Coalitions: Party code '${partyCode}' found in issue ${issue.id} stance, but not in parties.json map.`);
                     }
                }
            }
        } else {
             console.warn(`Majority Coalitions: Issue ${issue.id} (${issue.name}) has no partyStances object.`);
             return; // Gå til neste sak hvis partyStances mangler
        }

        // Hopp over saker uten støttepartier (nivå 2)
        if (supportingParties.length === 0) {
             // console.log(`Majority Coalitions: Issue ${issue.id} has no supporting parties (Level 2). Skipping.`);
             return;
        }
        // *** SLUTT ENDRING ***

        // Beregn totalt antall seter for støttepartiene
        const totalSeats = supportingParties.reduce((total, partyCode) => {
            // Bruk map for å hente seter, med fallback til 0
            return total + (partiesMapMC[partyCode]?.seats || 0);
        }, 0);

        // Sjekk om denne koalisjonen har flertall
        const hasMajority = totalSeats >= MAJORITY_THRESHOLD_MC;

        // Legg bare til koalisjoner med flertall
        if (hasMajority) {
            // Generer en unik identifikator for denne koalisjonen
            const sortedPartyCodes = [...supportingParties].sort(); // Kopier og sorter for ID
            const coalitionId = sortedPartyCodes.join('-');

            // Sjekk om vi allerede har denne koalisjonen
            let existingCoalition = coalitionsData.find(c => c.id === coalitionId);

            if (existingCoalition) {
                // Legg til denne saken i den eksisterende koalisjonen
                existingCoalition.issues.push(issue);
            } else {
                // Opprett en ny koalisjon
                // Sorter partiene for visning basert på posisjon
                const partiesSortedByPosition = [...supportingParties].sort((a, b) => {
                     return (partiesMapMC[a]?.position || 99) - (partiesMapMC[b]?.position || 99);
                 });

                coalitionsData.push({
                    id: coalitionId,
                    parties: partiesSortedByPosition, // Sortert for visning
                    partyObjects: partiesSortedByPosition.map(code => partiesMapMC[code]).filter(Boolean), // Filtrer ut evt. manglende partier
                    seats: totalSeats,
                    issues: [issue], // Start med denne saken
                    type: classifyCoalition(partiesSortedByPosition, totalSeats) // Klassifiser
                });
            }
        }
    }); // Slutt på window.issues.forEach

     console.log(`Majority Coalitions: Found ${coalitionsData.length} potential majority coalitions.`);

    // Sorter koalisjonene etter antall seter (størst først)
    coalitionsData.sort((a, b) => b.seats - a.seats);

    // Finn unike saksområder for filteret *etter* at koalisjoner er funnet
     const uniqueAreasInCoalitions = [...new Set(coalitionsData.flatMap(c => c.issues.map(i => i.area)))].filter(Boolean).sort();
     populateAreaFilterMC(uniqueAreasInCoalitions);


    // Oppdater UI med *alle* funnede koalisjoner før filtrering
    renderCoalitions(coalitionsData);

    // Legg til event listeners for filtrering (eller re-sett dem)
    setupFilterListenersMC();
}

// Klassifiser koalisjoner (uendret)
function classifyCoalition(parties, seats) { /* ... (som før) ... */
    const redGreen = ['R', 'SV', 'AP', 'SP', 'MDG'];
    const conservative = ['H', 'FrP', 'V', 'KrF'];
    const isRedGreen = parties.every(party => redGreen.includes(party));
    const isConservative = parties.every(party => conservative.includes(party));
    if (isRedGreen) return 'red-green';
    if (isConservative) return 'conservative';
    if (parties.length <= 3 && seats < 95) return 'smallest'; // Justert litt
    if (parties.length >= 5) return 'largest'; // Justert litt
    return 'cross-bloc';
}

// Fyll saksområdefilteret (med unik ID og tømming)
function populateAreaFilterMC(areas) {
    const areaFilter = document.getElementById('issue-area-filter'); // Samme ID som før? Sørg for at den er unik om nødvendig.
     if (!areaFilter) {
         console.error("Majority Coalitions: Area filter dropdown not found.");
         return;
     }
    // Tøm eksisterende (unntatt første)
    areaFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());

    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
     console.log("Majority Coalitions: Populated area filter.");
}

// Sett opp event listeners for filtrene (med unik ID)
function setupFilterListenersMC() {
    const coalitionFilter = document.getElementById('coalition-filter');
    const areaFilter = document.getElementById('issue-area-filter');

     if(coalitionFilter) {
        coalitionFilter.removeEventListener('change', updateFilteredCoalitions); // Fjern gammel
        coalitionFilter.addEventListener('change', updateFilteredCoalitions);
     }
     if(areaFilter) {
        areaFilter.removeEventListener('change', updateFilteredCoalitions); // Fjern gammel
        areaFilter.addEventListener('change', updateFilteredCoalitions);
     }
     console.log("Majority Coalitions: Set up filter listeners.");
}

// Oppdater visningen basert på valgte filtre (ingen store logiske endringer her)
function updateFilteredCoalitions() {
    console.log("Majority Coalitions: Updating filtered coalitions...");
    const coalitionFilter = document.getElementById('coalition-filter')?.value || 'all';
    const areaFilter = document.getElementById('issue-area-filter')?.value || 'all';

    let filteredCoalitions = [...coalitionsData]; // Start med alle funnede

    // Filtrer etter koalisjonstype
    if (coalitionFilter !== 'all') {
        // ... (samme switch-logikk som før) ...
         switch (coalitionFilter) {
            case 'traditional':
                filteredCoalitions = filteredCoalitions.filter(c => c.type === 'red-green' || c.type === 'conservative');
                break;
            case 'smallest':
                filteredCoalitions = filteredCoalitions.filter(c => c.type === 'smallest');
                break;
            case 'largest':
                filteredCoalitions = filteredCoalitions.filter(c => c.type === 'largest');
                break;
             // Legg evt. til 'cross-bloc' hvis ønskelig
        }
    }

    // Filtrer etter saksområde
    if (areaFilter !== 'all') {
        filteredCoalitions = filteredCoalitions.map(coalition => {
            const filteredIssues = coalition.issues.filter(issue => issue.area === areaFilter);
            if (filteredIssues.length > 0) {
                return { ...coalition, issues: filteredIssues }; // Returner kopi med filtrerte saker
            }
            return null; // Fjern koalisjonen hvis ingen saker matcher
        }).filter(Boolean); // Fjern null-verdiene
    }

    console.log(`Majority Coalitions: Rendering ${filteredCoalitions.length} coalitions after filtering.`);
    // Oppdater UI med filtrerte koalisjoner
    renderCoalitions(filteredCoalitions);
}

// Vis koalisjoner i UI (små justeringer for robusthet)
function renderCoalitions(coalitions) {
    const container = document.getElementById('coalitionsContainer');
    if (!container) {
        console.error("Majority Coalitions: Container #coalitionsContainer not found.");
        return;
    }
    const noCoalitionsMessage = container.querySelector('.no-coalitions');
    if (noCoalitionsMessage) noCoalitionsMessage.style.display = 'none'; // Skjul default melding

    container.innerHTML = ''; // Tøm container

    if (!Array.isArray(coalitions) || coalitions.length === 0) {
        container.innerHTML = `
            <div class="no-coalitions" style="display: block;"> <!-- Sørg for at den vises -->
                <h3>Ingen flertallskoalisjoner funnet</h3>
                <p>Ingen koalisjoner samsvarer med gjeldende filtre, eller ingen saker hadde flertall i utgangspunktet.</p>
            </div>
        `;
         console.log("Majority Coalitions: No coalitions to render.");
        return;
    }

    coalitions.forEach(coalition => {
        const card = document.createElement('div');
        card.className = 'coalition-card';

        let coalitionTitle = 'Flertallskoalisjon';
        // ... (samme tittel-logikk som før) ...
        if (coalition.type === 'red-green') coalitionTitle = 'Rødgrønn koalisjon';
        if (coalition.type === 'conservative') coalitionTitle = 'Borgerlig koalisjon';
        if (coalition.type === 'smallest') coalitionTitle = 'Minimalt flertall';
        if (coalition.type === 'largest') coalitionTitle = 'Bred koalisjon';
        if (coalition.type === 'cross-bloc') coalitionTitle = 'Tverrpolitisk koalisjon';


        card.innerHTML = `
            <div class="coalition-header">
                <h2 class="coalition-title">${coalitionTitle}</h2>
                <div class="coalition-seats">
                    <div class="seats-count">${coalition.seats} av 169 mandater</div>
                </div>
                <div class="majority-indicator">Flertall</div>
            </div>

            <div class="coalition-parties">
                <div class="parties-list">
                    ${(coalition.partyObjects || []).map(party => { // Sjekk at partyObjects finnes
                        const partyClass = party.classPrefix || party.shorthand?.toLowerCase() || 'unknown';
                        const partyColor = party.color || '#cccccc';
                        const rgb = hexToRgb(partyColor); // Konverter til RGB for rgba
                        return `<span class="coalition-party-tag party-tag-${partyClass}"
                                      style="background-color: rgba(${rgb}, 0.15); color: ${partyColor}; border: 1px solid ${partyColor}">
                            ${party.name || party.shorthand} (${party.seats || '?'})
                        </span>`;
                    }).join('')}
                </div>
            </div>

            <div class="coalition-issues">
                <h3>Støtter disse sakene (${coalition.issues?.length || 0}):</h3>
                <ul class="issues-list">
                    ${(coalition.issues || []).map(issue => `
                        <li class="issue-card">
                            <h4>${issue.name || 'Ukjent sak'}</h4>
                            <div class="issue-meta">
                                <span class="issue-area-tag">${issue.area || 'Ukjent område'}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="majority-visualization">
                <div class="parliament-seats">
                    <div class="seat-segment coalition-segment" style="width: ${Math.min(100, (coalition.seats / 169) * 100)}%"></div>
                    <div class="seat-segment opposition-segment" style="width: ${Math.max(0, ((169 - coalition.seats) / 169) * 100)}%"></div>
                </div>
                <div class="visualization-legend">
                    <span>Koalisjon: ${coalition.seats}</span>
                    <span>Øvrige: ${169 - coalition.seats}</span>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Hjelpefunksjon for å konvertere hex-farge til RGB (uendret, men sikrere)
function hexToRgb(hex) {
    if (typeof hex !== 'string') return '204, 204, 204'; // Fallback grå hvis ikke string
    hex = hex.replace('#', '');
    if (hex.length !== 6) return '204, 204, 204'; // Fallback grå hvis feil lengde

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return '204, 204, 204'; // Fallback hvis parsing feiler

    return `${r}, ${g}, ${b}`;
}
