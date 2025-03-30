// issue-matrix.js - Håndterer visualisering av saksmatrisen med quote-modal

// --- Start: Kopiert fra issue-selector.js (eller lag en felles utils.js) ---

// Detect if we're on a touch device (mobile/tablet)
function isTouchDevice() {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
}

// Create the popup modal that will be used for both hover and click
function createPopupModal() {
    // Check if modal already exists
    if (document.getElementById('quoteModal')) return;

    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'quoteModal';
    modal.className = 'quote-modal'; // Styles from styles.css
    modal.innerHTML = `
        <div class="quote-modal-content">
            <span class="close-modal">×</span>
            <div id="quoteContent"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listener to close button (for click mode)
    const closeButton = modal.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Close modal when clicking outside it (for click mode)
    window.addEventListener('click', (event) => {
        if (event.target === modal && !modal.classList.contains('hover-mode')) {
            modal.style.display = 'none';
        }
    });

     // Allow hovering over the popup without it disappearing (for hover mode)
     modal.addEventListener('mouseleave', () => {
        if (modal.classList.contains('hover-mode')) {
             modal.style.display = 'none';
        }
     });
     modal.addEventListener('mouseenter', (e) => {
         // Keep modal open if mouse enters it
     });

    console.log("Matrix: Popup modal created.");
}

// Show party quote in hover mode (positions near the target element)
function showPartyQuoteHover(issue, partyCode, targetElement) {
    // Ensure quote exists
    if (!issue || !issue.partyStances || !issue.partyStances[partyCode] || !issue.partyStances[partyCode].quote) {
        // console.log(`Matrix Hover: No quote for ${partyCode} on issue ${issue?.id}`);
        return; // Do nothing if no quote
    }
    // console.log(`Matrix Hover: Showing quote for issue ${issue.id}, party ${partyCode}`);

    const partyName = getPartyFullName(partyCode);
    const quote = issue.partyStances[partyCode].quote;
    const partyClass = getPartyClassPrefix(partyCode);

    // Get modal and content area
    const modal = document.getElementById('quoteModal');
    const quoteContent = document.getElementById('quoteContent');
    if (!modal || !quoteContent) return;

    // Update popup content
    quoteContent.innerHTML = `
        <h3 class="quote-party-title party-tag-${partyClass}">${partyName} sier:</h3>
        <p class="quote-text">"${quote}"</p>
    `;

    // Prepare for hover mode
    modal.classList.add('hover-mode');

    // Get dimensions and position
    const rect = targetElement.getBoundingClientRect();
    const modalContentEl = modal.querySelector('.quote-modal-content');

    // Temporarily show modal to measure dimensions
    modalContentEl.style.visibility = 'hidden';
    modal.style.display = 'block';
    const modalHeight = modalContentEl.offsetHeight;
    const modalWidth = modalContentEl.offsetWidth;
    modal.style.display = 'none'; // Hide again before positioning

    // Calculate position (try right, then left, adjust vertically)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;
    const gap = 10; // Space between element and modal

    let left = rect.right + scrollX + gap;
    let top = rect.top + scrollY;

    // Adjust horizontal position
    if (left + modalWidth > viewportWidth + scrollX - gap) { // Not enough space on right
        left = rect.left + scrollX - modalWidth - gap; // Try left
        if (left < scrollX + gap) { // Not enough space on left either
             left = scrollX + (viewportWidth - modalWidth) / 2; // Center horizontally
        }
    }

     // Adjust vertical position
    if (top + modalHeight > viewportHeight + scrollY - gap) { // Not enough space below
        top = rect.bottom + scrollY - modalHeight; // Try above bottom edge
        if (top < scrollY + gap) { // Not enough space above either
             top = scrollY + gap; // Place near top of viewport
        }
    }
     // Ensure it doesn't go off the top
     if (top < scrollY + gap) {
         top = scrollY + gap;
     }


    // Apply position to the outer modal container (which is fixed)
    modalContentEl.style.left = `${left}px`;
    modalContentEl.style.top = `${top}px`;
    modalContentEl.style.visibility = 'visible';

    // Show the modal
    modal.style.display = 'block';
}

// Show party quote in click mode (centered modal)
function showPartyQuoteClick(issue, partyCode) {
     // Ensure quote exists
    if (!issue || !issue.partyStances || !issue.partyStances[partyCode] || !issue.partyStances[partyCode].quote) {
        console.log(`Matrix Click: No quote for ${partyCode} on issue ${issue?.id}`);
        // Optional: Show a simple message? For now, do nothing.
        return;
    }
    // console.log(`Matrix Click: Showing quote for issue ${issue.id}, party ${partyCode}`);

    const partyName = getPartyFullName(partyCode);
    const quote = issue.partyStances[partyCode].quote;
    const partyClass = getPartyClassPrefix(partyCode);

    // Get modal and content area
    const modal = document.getElementById('quoteModal');
    const quoteContent = document.getElementById('quoteContent');
    if (!modal || !quoteContent) return;

    // Update content
    quoteContent.innerHTML = `
        <h3 class="quote-party-title party-tag-${partyClass}">${partyName} sier:</h3>
        <p class="quote-text">"${quote}"</p>
    `;

    // Ensure click mode styling (remove hover mode class)
    modal.classList.remove('hover-mode');

    // Reset potentially fixed position styles from hover mode
    const modalContentEl = modal.querySelector('.quote-modal-content');
    modalContentEl.style.left = '';
    modalContentEl.style.top = '';
    modalContentEl.style.position = ''; // Reset if it was fixed

    // Show modal (CSS handles centering for non-hover-mode)
    modal.style.display = 'block';
}

// Hjelpefunksjon for å hente classPrefix for et parti
function getPartyClassPrefix(partyShorthand) {
    // Denne må matche klassene brukt i styles.css
    const partyMap = { 'R': 'r', 'SV': 'sv', 'AP': 'ap', 'SP': 'sp', 'MDG': 'mdg', 'KrF': 'krf', 'V': 'v', 'H': 'h', 'FrP': 'frp', 'PF': 'pf' };
    return partyMap[partyShorthand] || partyShorthand.toLowerCase();
}

// Hjelpefunksjon for å få fullt partinavn
function getPartyFullName(partyCode) {
    // Denne bør ideelt sett hente data fra parties.json, men en enkel map fungerer her
    const partyNames = { 'R': 'Rødt', 'SV': 'Sosialistisk Venstreparti', 'AP': 'Arbeiderpartiet', 'SP': 'Senterpartiet', 'MDG': 'Miljøpartiet De Grønne', 'KrF': 'Kristelig Folkeparti', 'V': 'Venstre', 'H': 'Høyre', 'FrP': 'Fremskrittspartiet', 'PF': 'Pasientfokus' };
    return partyNames[partyCode] || partyCode;
}

// --- Slutt: Kopiert fra issue-selector.js ---


// Global variabel for å holde data og partidefinisjoner
let matrixIssues = [];
const matrixParties = [ // Bruker egen definisjon her for konsistens med matrise-layout
    { name: "Rødt", shorthand: "R", position: 1, color: "#da291c" },
    { name: "Sosialistisk Venstreparti", shorthand: "SV", position: 2, color: "#eb2e2d" },
    { name: "Arbeiderpartiet", shorthand: "AP", position: 3, color: "#ed1b34" },
    { name: "Senterpartiet", shorthand: "SP", position: 4, color: "#14773c" },
    { name: "Miljøpartiet De Grønne", shorthand: "MDG", position: 5, color: "#439539" },
    { name: "Kristelig Folkeparti", shorthand: "KrF", position: 6, color: "#ffbe00" },
    { name: "Venstre", shorthand: "V", position: 7, color: "#00807b" },
    { name: "Høyre", shorthand: "H", position: 8, color: "#007ac8" },
    { name: "Fremskrittspartiet", shorthand: "FrP", position: 9, color: "#002e5e" }
    // PF er ikke med i issues.json pt, utelates fra matrisen
];

// Farger for enighetsgrad (kan justeres)
const agreementColors = {
    0: { background: "rgba(230, 60, 140, 0.1)", color: "#e63c8c", border: "#e63c8c" },
    1: { background: "rgba(255, 190, 44, 0.1)", color: "#a67c00", border: "#ffbe2c" }, // Mørkere gul tekst
    2: { background: "rgba(0, 168, 163, 0.1)", color: "#00807b", border: "#00a8a3" } // Dusere grønn tekst
};

// Initialisering når DOM er klar
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM lastet i issue-matrix.js");
    loadMatrixData(); // Start datalasting
});

// Last data fra issues.json
function loadMatrixData() {
    console.log("Laster matrixdata direkte fra issues.json");
    const loader = document.querySelector('.matrix-loader');
    if (loader) loader.textContent = 'Laster inn data...';

    fetch('data/issues.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok: ' + response.statusText);
            return response.json();
        })
        .then(data => {
            console.log("Data lastet fra issues.json:", data.length, "saker");
            matrixIssues = data; // Lagre den detaljerte dataen
            initializeMatrix(); // Start oppbygging av UI
        })
        .catch(error => {
            console.error("Feil ved henting av data:", error);
            if (loader) loader.textContent = 'Kunne ikke laste data: ' + error.message + '. Vennligst oppdater siden.';
        });
}

// Hovedfunksjon for å initialisere matrisen
function initializeMatrix() {
    console.log("Initialiserer matrix med", matrixIssues.length, "saker");
    if (!matrixIssues || matrixIssues.length === 0) {
        console.error("Ingen issues-data funnet!");
        // Feilmelding vises allerede av loadMatrixData
        return;
    }

    const loader = document.querySelector('.matrix-loader');
    if (loader) loader.style.display = 'none'; // Skjul lasteindikator

    createPopupModal(); // Sørg for at modalen finnes FØR vi lager cellene

    const areas = [...new Set(matrixIssues.map(issue => issue.area))]; // Unike områder
    populateAreaFilter(areas);
    setupFilterListeners();
    generateMatrix('all', 'heatmap'); // Generer den initielle visningen

    // Lytt etter vindusendringer for responsivitet (hvis nødvendig)
    // window.addEventListener('resize', debounce(() => generateMatrix(document.getElementById('area-filter').value, document.getElementById('view-mode').value), 250));
}

// Fyll area-filteret
function populateAreaFilter(areas) {
    const areaFilter = document.getElementById('area-filter');
    if (!areaFilter) return;
    // Beholder "Alle" option, legger til resten
    areas.sort().forEach(area => { // Sorter områdene alfabetisk
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
}

// Sett opp filter-lyttere
function setupFilterListeners() {
    const areaFilter = document.getElementById('area-filter');
    const viewMode = document.getElementById('view-mode');
    if (areaFilter) areaFilter.addEventListener('change', () => generateMatrix(areaFilter.value, viewMode?.value || 'heatmap'));
    if (viewMode) viewMode.addEventListener('change', () => generateMatrix(areaFilter?.value || 'all', viewMode.value));
}

// --- SLETT DENNE FUNKSJONEN (hexToRgb) hvis den finnes fra før ---
// Funksjon for å konvertere hex farge til RGB
// function hexToRgb(hex) { ... } // Denne trengs ikke lenger her

// --- SLETT DENNE FUNKSJONEN (updateLegendStyles) ---
// function updateLegendStyles() { ... }

// Generer selve matrisen
function generateMatrix(areaFilter, viewMode) {
    console.log(`Genererer matrise: Område='${areaFilter}', Visning='${viewMode}'`);
    const matrixContainer = document.getElementById('matrix-visualization');
    if (!matrixContainer) return;
    matrixContainer.innerHTML = ''; // Tøm forrige innhold

    const matrixWrapper = document.createElement('div');
    matrixWrapper.className = 'matrix-container'; // Bruker class fra styles.css for overflow etc.
    matrixContainer.appendChild(matrixWrapper);

    // Filtrer saker
    const filteredIssues = areaFilter === 'all'
        ? [...matrixIssues]
        : matrixIssues.filter(issue => issue.area === areaFilter);

    console.log("Filtrerte saker:", filteredIssues.length);

    // Sorter saker innenfor filteret
    const areaOrder = ["Arbeidsliv", "Diagnostikk og tidlig oppdagelse", "Folkehelse og forebygging", "Forskning og innovasjon", "Frivillig sektor", "Kreftomsorg", "Rettigheter", "Tilgang til behandling", "Økt investeringer i helse"];
    filteredIssues.sort((a, b) => {
        const areaAIndex = areaOrder.indexOf(a.area);
        const areaBIndex = areaOrder.indexOf(b.area);
        if (areaAIndex !== areaBIndex) return areaAIndex - areaBIndex;
        return a.name.localeCompare(b.name);
    });

    const table = document.createElement('table');
    table.className = 'matrix-table'; // Bruker class fra styles.css

    // Lag Table Head (thead)
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const issueHeader = document.createElement('th');
    issueHeader.className = 'issue-col';
    issueHeader.textContent = 'Sak';
    headerRow.appendChild(issueHeader);

    matrixParties.forEach(party => {
        const partyHeader = document.createElement('th');
        // partyHeader.className = 'party-col'; // Kan fjernes hvis ikke brukt i CSS
        partyHeader.textContent = party.shorthand;
        partyHeader.title = party.name;
        // Farge hentes fra styles.css basert på <th> inni .matrix-table thead
        headerRow.appendChild(partyHeader);
    });

    const sumHeader = document.createElement('th');
    sumHeader.textContent = 'SUM';
    sumHeader.title = 'Sum poeng (0-2 per parti)';
    headerRow.appendChild(sumHeader);

    // Lag Table Body (tbody)
    const tbody = table.createTBody();
    let currentArea = null;

    filteredIssues.forEach(issue => {
        // Legg til område-header hvis området endres
        if (issue.area !== currentArea) {
            currentArea = issue.area;
            const areaRow = tbody.insertRow();
            areaRow.className = 'area-header'; // Bruker class fra styles.css
            const areaCell = areaRow.insertCell();
            areaCell.colSpan = matrixParties.length + 2;
            areaCell.textContent = currentArea;
        }

        // Lag rad for saken
        const row = tbody.insertRow();
        const issueCell = row.insertCell();
        issueCell.className = 'issue-col';
        issueCell.textContent = issue.name;
        issueCell.title = issue.name; // Tooltip for lange navn

        let totalPoints = 0;

        // Celler for hvert parti
        matrixParties.forEach(party => {
            const cellContainer = row.insertCell();
            const agreementLevel = issue.partyStances?.[party.shorthand]?.level ?? 0; // Hent nivå, default 0
            totalPoints += agreementLevel;

            const cell = document.createElement('div');
            cell.className = `cell level-${agreementLevel}`; // Bruker class for styling fra CSS
            cell.title = `${party.name}: ${agreementLevel === 2 ? 'Helt enig' : agreementLevel === 1 ? 'Delvis enig' : 'Ingen støtte'}`; // Standard tooltip

            if (viewMode === 'numbers') {
                cell.textContent = agreementLevel;
            } else {
                cell.innerHTML = ' '; // For å beholde høyde uten tall
            }

            // --- NY EVENT LOGIKK ---
            const issueId = issue.id; // Må lagres for listener
            const partyCode = party.shorthand;
            const hasQuote = !!(issue.partyStances?.[partyCode]?.quote); // Sjekk om sitat finnes

            if (hasQuote) { // Legg kun til listeners hvis det er et sitat
                if (isTouchDevice()) {
                    cell.addEventListener('click', function() {
                        const clickedIssue = matrixIssues.find(iss => iss.id == issueId); // Finn issue-objektet
                        if(clickedIssue) showPartyQuoteClick(clickedIssue, partyCode);
                    });
                } else { // Desktop hover
                    let hoverTimer = null;
                    cell.addEventListener('mouseenter', function(e) {
                        clearTimeout(hoverTimer); // Fjern eventuell tidligere timer
                        hoverTimer = setTimeout(() => {
                             const hoveredIssue = matrixIssues.find(iss => iss.id == issueId);
                             if(hoveredIssue) showPartyQuoteHover(hoveredIssue, partyCode, e.currentTarget);
                        }, 150); // Liten forsinkelse
                    });
                    cell.addEventListener('mouseleave', function() {
                        clearTimeout(hoverTimer); // Fjern timer hvis musen forlater fort
                        const modal = document.getElementById('quoteModal');
                        if (modal && modal.classList.contains('hover-mode')) {
                             setTimeout(() => { // Liten forsinkelse før skjuling
                                 if (modal && !modal.matches(':hover') && !cell.matches(':hover')) { // Skjul kun hvis musen ikke er over modalen eller cellen
                                     modal.style.display = 'none';
                                 }
                             }, 100);
                         }
                    });
                }
            } else {
                cell.style.cursor = 'default'; // Ingen handling hvis ikke sitat
            }
            // --- SLUTT NY EVENT LOGIKK ---

            cellContainer.appendChild(cell);
        });

        // SUM-celle
        const sumCellContainer = row.insertCell();
        const sumCellContent = document.createElement('div');
        sumCellContent.className = 'sum-cell-content'; // Bruker class for styling
        sumCellContent.textContent = totalPoints;

        // Legg til klasse for farge basert på score
        const maxPoints = matrixParties.length * 2;
        const scoreRatio = maxPoints > 0 ? totalPoints / maxPoints : 0;
        if (scoreRatio >= 0.6) sumCellContent.classList.add('high-score');
        else if (scoreRatio >= 0.3) sumCellContent.classList.add('medium-score');
        else sumCellContent.classList.add('low-score');

        sumCellContainer.appendChild(sumCellContent);
    });

    matrixWrapper.appendChild(table);

    // VIKTIG: Ingen kall til updateLegendStyles() her lenger
}

// --- SLETT DEN GAMLE showTooltip FUNKSJONEN HER ---
// function showTooltip(element, issue, partyCode, level) { ... }