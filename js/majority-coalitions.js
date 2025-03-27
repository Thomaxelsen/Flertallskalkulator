// majority-coalitions.js
// Script for å vise flertallskoalisjoner for Kreftforeningens politikk

document.addEventListener('DOMContentLoaded', function() {
    // Vent til issues-objektet er lastet
    const checkLoaded = setInterval(function() {
        if (window.issues) {
            clearInterval(checkLoaded);
            initializeCoalitions();
        }
    }, 100);
});

// Koalisjonsdata - vil fylles under initialisering
let coalitionsData = [];
const MAJORITY_THRESHOLD = 85; // Flertallsgrense på Stortinget

function initializeCoalitions() {
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
        { name: "Pasientfokus", shorthand: "PF", seats: 1, position: 10, color: "#a04d94", classPrefix: "pf" }
    ];
    
    // Lag en map for rask tilgang til partiinformasjon
    const partyMap = {};
    parties.forEach(party => {
        partyMap[party.shorthand] = party;
    });
    
    // Finn unike saksområder for filteret
    const uniqueAreas = [...new Set(window.issues.map(issue => issue.area))];
    populateAreaFilter(uniqueAreas);
    
    // Finn koalisjoner for hver sak
    window.issues.forEach(issue => {
        // Hopp over saker uten definerte støttepartier
        if (!issue.partiesInAgreement || issue.partiesInAgreement.length === 0) return;
        
        // Beregn totalt antall seter for støttepartiene
        const supportingParties = issue.partiesInAgreement;
        const totalSeats = supportingParties.reduce((total, partyCode) => {
            return total + (partyMap[partyCode]?.seats || 0);
        }, 0);
        
        // Sjekk om denne koalisjonen har flertall
        const hasMajority = totalSeats >= MAJORITY_THRESHOLD;
        
        // Legg bare til koalisjoner med flertall
        if (hasMajority) {
            // Generer en unik identifikator for denne koalisjonen
            const coalitionId = supportingParties.sort().join('-');
            
            // Sjekk om vi allerede har denne koalisjonen
            let existingCoalition = coalitionsData.find(c => c.id === coalitionId);
            
            if (existingCoalition) {
                // Legg til denne saken i den eksisterende koalisjonen
                existingCoalition.issues.push(issue);
            } else {
                // Opprett en ny koalisjon
                coalitionsData.push({
                    id: coalitionId,
                    parties: supportingParties.sort((a, b) => {
                        return (partyMap[a]?.position || 0) - (partyMap[b]?.position || 0);
                    }),
                    partyObjects: supportingParties.map(code => partyMap[code]),
                    seats: totalSeats,
                    issues: [issue],
                    // Klassifiser koalisjonen
                    type: classifyCoalition(supportingParties, totalSeats)
                });
            }
        }
    });
    
    // Sorter koalisjonene etter antall seter (størst først)
    coalitionsData.sort((a, b) => b.seats - a.seats);
    
    // Oppdater UI
    renderCoalitions(coalitionsData);
    
    // Legg til event listeners for filtrering
    setupFilterListeners();
}

// Klassifiser koalisjoner basert på partisammensetning
function classifyCoalition(parties, seats) {
    // Rødgrønn blokk (R, SV, AP, SP, MDG)
    const redGreen = ['R', 'SV', 'AP', 'SP', 'MDG'];
    // Borgerlig blokk (H, FrP, V, KrF)
    const conservative = ['H', 'FrP', 'V', 'KrF'];
    
    // Sjekk om alle partiene er fra samme blokk
    const isRedGreen = parties.every(party => redGreen.includes(party));
    const isConservative = parties.every(party => conservative.includes(party));
    
    if (isRedGreen) return 'red-green';
    if (isConservative) return 'conservative';
    
    // Hvis koalisjonen er nær flertall (mindre enn 90 seter), kategoriser som minimalt flertall
    if (seats < 90) return 'smallest';
    
    // Hvis koalisjonen har mange partier (mer enn 5), kategoriser som bred koalisjon
    if (parties.length > 5) return 'largest';
    
    // Ellers er det en kryssblokk-koalisjon
    return 'cross-bloc';
}

// Fyll saksområdefilteret
function populateAreaFilter(areas) {
    const areaFilter = document.getElementById('issue-area-filter');
    
    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
}

// Sett opp event listeners for filtrene
function setupFilterListeners() {
    const coalitionFilter = document.getElementById('coalition-filter');
    const areaFilter = document.getElementById('issue-area-filter');
    
    coalitionFilter.addEventListener('change', updateFilteredCoalitions);
    areaFilter.addEventListener('change', updateFilteredCoalitions);
}

// Oppdater visningen basert på valgte filtre
function updateFilteredCoalitions() {
    const coalitionFilter = document.getElementById('coalition-filter').value;
    const areaFilter = document.getElementById('issue-area-filter').value;
    
    let filteredCoalitions = [...coalitionsData];
    
    // Filtrer etter koalisjonstype
    if (coalitionFilter !== 'all') {
        switch (coalitionFilter) {
            case 'traditional':
                filteredCoalitions = filteredCoalitions.filter(c => 
                    c.type === 'red-green' || c.type === 'conservative');
                break;
            case 'smallest':
                filteredCoalitions = filteredCoalitions.filter(c => c.type === 'smallest');
                break;
            case 'largest':
                filteredCoalitions = filteredCoalitions.filter(c => c.type === 'largest');
                break;
        }
    }
    
    // Filtrer etter saksområde
    if (areaFilter !== 'all') {
        filteredCoalitions = filteredCoalitions.map(coalition => {
            // Lag en kopi av koalisjonen, men inkluder bare saker i valgt område
            const filteredIssues = coalition.issues.filter(issue => issue.area === areaFilter);
            
            // Bare behold koalisjoner som har minst én sak i det valgte området
            if (filteredIssues.length > 0) {
                return { ...coalition, issues: filteredIssues };
            }
            return null;
        }).filter(c => c !== null); // Fjern null-elementer
    }
    
    // Oppdater UI med filtrerte koalisjoner
    renderCoalitions(filteredCoalitions);
}

// Vis koalisjoner i UI
function renderCoalitions(coalitions) {
    const container = document.getElementById('coalitionsContainer');
    container.innerHTML = '';
    
    if (coalitions.length === 0) {
        container.innerHTML = `
            <div class="no-coalitions">
                <h3>Ingen flertallskoalisjoner funnet</h3>
                <p>Ingen koalisjoner samsvarer med gjeldende filtre. Prøv å endre filtrene for å se flere resultater.</p>
            </div>
        `;
        return;
    }
    
    coalitions.forEach(coalition => {
        const card = document.createElement('div');
        card.className = 'coalition-card';
        
        // Tittel basert på koalisjonstype
        let coalitionTitle = 'Flertallskoalisjon';
        if (coalition.type === 'red-green') coalitionTitle = 'Rødgrønn koalisjon';
        if (coalition.type === 'conservative') coalitionTitle = 'Borgerlig koalisjon';
        if (coalition.type === 'smallest') coalitionTitle = 'Minimalt flertall';
        if (coalition.type === 'largest') coalitionTitle = 'Bred koalisjon';
        if (coalition.type === 'cross-bloc') coalitionTitle = 'Tverrpolitisk koalisjon';
        
        // Header
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
                    ${coalition.parties.map(partyCode => {
                        const party = coalition.partyObjects.find(p => p.shorthand === partyCode);
                        return `<span class="coalition-party-tag party-tag-${party.classPrefix}" style="background-color: rgba(${hexToRgb(party.color)}, 0.15); color: ${party.color}; border: 1px solid ${party.color}">
                            ${party.name} (${party.seats})
                        </span>`;
                    }).join('')}
                </div>
            </div>
            
            <div class="coalition-issues">
                <h3>Støtter disse sakene (${coalition.issues.length}):</h3>
                <ul class="issues-list">
                    ${coalition.issues.map(issue => `
                        <li class="issue-card">
                            <h4>${issue.name}</h4>
                            <div class="issue-meta">
                                <span class="issue-area-tag">${issue.area}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="majority-visualization">
                <div class="parliament-seats">
                    <div class="seat-segment coalition-segment" style="width: ${(coalition.seats / 169) * 100}%"></div>
                    <div class="seat-segment opposition-segment" style="width: ${((169 - coalition.seats) / 169) * 100}%"></div>
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

// Hjelpefunksjon for å konvertere hex-farge til RGB
function hexToRgb(hex) {
    // Fjern # hvis den finnes
    hex = hex.replace('#', '');
    
    // Konverter til RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
}
