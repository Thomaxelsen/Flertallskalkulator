// js/issue-matrix.js - Håndterer visualisering av saksmatrisen

// --- START: Popup-logikk (inspirert av issue-selector.js) ---

// Detect if we're on a touch device (mobile/tablet)
function isTouchDevice() {
    try { // Inkluderer try-catch for eldre nettlesere
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    } catch (e) {
        return false; // Anta ikke-touch hvis sjekken feiler
    }
}

// Global variables for popup logic within this script
let hoverTimerMatrix = null;
let currentHoveredCell = null;

// Create the popup modal (if it doesn't exist from another script)
function createPopupModalMatrix() {
    if (document.getElementById('quoteModalMatrix')) return; // Unikt ID for matrisen

    const modal = document.createElement('div');
    modal.id = 'quoteModalMatrix';
    // Bruker eksisterende CSS-klasser, men med unikt ID
    modal.className = 'quote-modal'; // Klassen 'quote-modal' definerer generell modal-styling
    modal.innerHTML = `
        <div class="quote-modal-content">
            <span class="close-modal">×</span>
            <div id="quoteContentMatrix"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listener to close button (for click/touch mode)
    modal.querySelector('.close-modal').addEventListener('click', (e) => {
        e.stopPropagation(); // Hindre at klikket propagerer til window listener under
        modal.style.display = 'none';
    });

    // Close modal when clicking outside its content area
    modal.addEventListener('click', (event) => {
        // Lukk kun hvis man klikker på selve overlayet (modal), ikke innholdet
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Allow hovering over the popup itself without it disappearing (for desktop hover mode)
    const modalContent = modal.querySelector('.quote-modal-content');
    if (modalContent && !isTouchDevice()) {
         modalContent.addEventListener('mouseenter', () => {
            // Når musen går inn i popupen, ikke lukk den
            if (hoverTimerMatrix) clearTimeout(hoverTimerMatrix); // Stopp eventuell lukketime
         });
         modalContent.addEventListener('mouseleave', () => {
            // Når musen forlater popupen, lukk den
            modal.style.display = 'none';
            currentHoveredCell = null;
         });
    }
}

// Add CSS for quotes/modal (if not already added by another script)
// Dette sikrer at stilene er tilgjengelige selv om brukeren går direkte til matrix-siden
function addQuoteStylesMatrix() {
    if (document.getElementById('quote-styles-matrix')) return; // Sjekk om stil-elementet allerede finnes

    const style = document.createElement('style');
    style.id = 'quote-styles-matrix';
    // Bruker samme CSS-regler som i issue-selector.js addQuoteStyles
    // Limt inn her for å sikre at de finnes
    style.textContent = `
        /* Modal styling (kopiert fra issue-selector.js addQuoteStyles for redundans) */
        .quote-modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; }
        .quote-modal:not(.hover-mode) { background-color: rgba(0,0,0,0.4); backdrop-filter: blur(3px); }
        .quote-modal.hover-mode { background-color: transparent; pointer-events: none; }
        .quote-modal.hover-mode .quote-modal-content { pointer-events: auto; }
        .quote-modal:not(.hover-mode) .quote-modal-content { background-color: white; margin: 10% auto; padding: 25px; border-radius: 12px; width: 90%; max-width: 500px; box-shadow: 0 4px 25px rgba(0,0,0,0.2); animation: modalFadeIn 0.3s; position: relative; }
        .quote-modal.hover-mode .quote-modal-content { background-color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 5px 20px rgba(0,0,0,0.15); animation: modalFadeIn 0.2s; position: fixed; width: auto; max-width: 350px; z-index: 1001; }
        @keyframes modalFadeIn { from {opacity: 0; transform: translateY(-10px);} to {opacity: 1; transform: translateY(0);} }
        .close-modal { color: #aaa; position: absolute; right: 15px; top: 10px; font-size: 28px; font-weight: bold; cursor: pointer; transition: color 0.2s; }
        .hover-mode .close-modal { display: none; }
        .close-modal:hover { color: #333; }
        .quote-party-title { font-size: 1.2rem; margin-bottom: 10px; padding: 5px 12px; border-radius: 6px; display: inline-block; color: white; font-weight: 600; }
        /* Bakgrunnsfarger for modal-tittel (kopiert) */
        .quote-party-title.party-tag-ap { background-color: #ed1b34; } .quote-party-title.party-tag-h { background-color: #007ac8; }
        .quote-party-title.party-tag-sp { background-color: #14773c; } .quote-party-title.party-tag-frp { background-color: #002e5e; }
        .quote-party-title.party-tag-sv { background-color: #eb2e2d; } .quote-party-title.party-tag-v { background-color: #00807b; }
        .quote-party-title.party-tag-r { background-color: #da291c; } .quote-party-title.party-tag-krf { background-color: #ffbe00; color: #333; }
        .quote-party-title.party-tag-mdg { background-color: #439539; } .quote-party-title.party-tag-pf { background-color: #a04d94; }
        .quote-text { font-size: 1rem; line-height: 1.5; color: #333; padding: 12px; background-color: #f8f9fa; border-left: 3px solid var(--kf-purple); margin: 10px 0 0 0; border-radius: 4px; font-style: italic; }
        .no-quote-text { font-style: italic; color: #777; } /* Stil for melding om manglende sitat */
    `;
    document.head.appendChild(style);
}

// Hjelpefunksjon for å få fullt partinavn
function getPartyFullNameMatrix(partyCode) {
    const party = parties.find(p => p.shorthand === partyCode);
    return party ? party.name : partyCode;
}

// Hjelpefunksjon for å hente classPrefix
function getPartyClassPrefixMatrix(partyShorthand) {
    const party = parties.find(p => p.shorthand === partyShorthand);
    return party ? party.classPrefix : partyShorthand.toLowerCase();
}

// Funksjon for å vise sitat (tilpasset for matrisen)
// targetElement er cellen som ble klikket/hoveret over
function showPartyQuoteMatrix(issue, partyCode, level, quote, targetElement) {
    const modal = document.getElementById('quoteModalMatrix');
    if (!modal) {
        console.error("Modal #quoteModalMatrix ikke funnet.");
        return;
    }

    const partyName = getPartyFullNameMatrix(partyCode);
    const partyClassPrefix = getPartyClassPrefixMatrix(partyCode);
    const colors = agreementColors[level]; // Bruker farger definert i issue-matrix.js

    // Bestem enighetsnivå-tekst
    let levelText = '';
    if (level === 2) levelText = 'Helt enig';
    else if (level === 1) levelText = 'Delvis enig';
    else levelText = 'Ingen støtte / ingen standpunkt';

    // Bygg innhold
    const quoteContentEl = document.getElementById('quoteContentMatrix');
    if (!quoteContentEl) {
        console.error("Innholdselement #quoteContentMatrix ikke funnet.");
        return;
    }
    quoteContentEl.innerHTML = `
        <h3 class="quote-party-title party-tag-${partyClassPrefix}">${partyName}</h3>
        <p style="margin-bottom: 5px;"><strong>Sak:</strong> ${issue.name}</p>
        <p style="margin-bottom: 15px;"><strong>Standpunkt:</strong> <strong style="display: inline-block; padding: 3px 8px; border-radius: 12px; background-color: ${colors.background}; color: ${colors.color}; border: 1px solid ${colors.border}; font-size: 0.9em;">${levelText}</strong></p>
        ${quote
            ? `<p class="quote-text">"${quote}"</p>`
            : '<p class="no-quote-text">Ingen utdypende begrunnelse tilgjengelig.</p>'
        }
    `;

    // Posisjoner og vis modal
    const modalContent = modal.querySelector('.quote-modal-content');
    modal.style.display = 'block';

    if (isTouchDevice()) {
        // Sentrert for touch
        modal.classList.remove('hover-mode');
        modalContent.style.left = '';
        modalContent.style.top = '';
        modalContent.style.position = '';
        modalContent.style.maxWidth = '';
    } else {
        // Posisjonert for hover
        modal.classList.add('hover-mode');
        const rect = targetElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Vis midlertidig for å måle
        modalContent.style.visibility = 'hidden';
        const modalHeight = modalContent.offsetHeight;
        const modalWidth = modalContent.offsetWidth || 350; // Antatt bredde

        // Beregn posisjon (prioriter over, så under, så til høyre/venstre)
        let top = rect.top - modalHeight - 10; // Prøv over
        if (top < 10) { // Hvis ikke plass over
            top = rect.bottom + 10; // Prøv under
        }
        // Juster hvis den går utenfor bunnen
        if (top + modalHeight > viewportHeight - 10) {
            top = Math.max(10, viewportHeight - modalHeight - 10);
        }

        let left = rect.left + (rect.width / 2) - (modalWidth / 2); // Prøv sentrert over/under
        // Juster hvis den går utenfor kantene
        left = Math.max(10, Math.min(left, viewportWidth - modalWidth - 10));

        modalContent.style.position = 'fixed';
        modalContent.style.left = `${left}px`;
        modalContent.style.top = `${top}px`;
        modalContent.style.visibility = 'visible';
        modalContent.style.maxHeight = `${viewportHeight - 40}px`; // Begrens høyde
        modalContent.style.overflowY = 'auto'; // Scroll ved behov
    }
}

// --- SLUTT: Popup-logikk ---


document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM lastet i issue-matrix.js");
    loadMatrixData(); // Starter datainnlasting
});

// Party data (som før)
const parties = [
    { name: "Rødt", shorthand: "R", seats: 8, position: 1, color: "#da291c", classPrefix: "r" },
    { name: "Sosialistisk Venstreparti", shorthand: "SV", seats: 13, position: 2, color: "#eb2e2d", classPrefix: "sv" },
    { name: "Arbeiderpartiet", shorthand: "AP", seats: 48, position: 3, color: "#ed1b34", classPrefix: "ap" },
    { name: "Senterpartiet", shorthand: "SP", seats: 28, position: 4, color: "#14773c", classPrefix: "sp" },
    { name: "Miljøpartiet De Grønne", shorthand: "MDG", seats: 3, position: 5, color: "#439539", classPrefix: "mdg" },
    { name: "Kristelig Folkeparti", shorthand: "KrF", seats: 3, position: 6, color: "#ffbe00", classPrefix: "krf" },
    { name: "Venstre", shorthand: "V", seats: 8, position: 7, color: "#00807b", classPrefix: "v" },
    { name: "Høyre", shorthand: "H", seats: 36, position: 8, color: "#007ac8", classPrefix: "h" },
    { name: "Fremskrittspartiet", shorthand: "FrP", seats: 21, position: 9, color: "#002e5e", classPrefix: "frp" }
];

// Farger for enighetsgrad (som før)
const agreementColors = {
    0: { background: "rgba(230, 60, 140, 0.1)", color: "#e63c8c", border: "#e63c8c" },
    1: { background: "rgba(255, 190, 44, 0.1)", color: "#ffbe2c", border: "#ffbe2c" },
    2: { background: "rgba(0, 168, 163, 0.1)", color: "#00a8a3", border: "#00a8a3" }
};

// Global variabel for å holde data og popup-status
let matrixIssues = [];
let showQuotesEnabled = true; // Start med popups aktivert

// Last data (som før)
function loadMatrixData() {
    console.log("Laster matrixdata direkte fra issues.json");
    const loader = document.querySelector('.matrix-loader');
    if(loader) loader.textContent = 'Laster inn data...';

    fetch('data/issues.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data lastet fra issues.json:", data.length, "saker");
            matrixIssues = data;
            initializeMatrix(); // Initialiserer alt etter at data er lastet
        })
        .catch(error => {
            console.error("Feil ved henting av data:", error);
            if(loader) loader.textContent = 'Kunne ikke laste data: ' + error.message + '. Vennligst oppdater siden.';
        });
}

// Hovedfunksjon for å initalisere matrisen
function initializeMatrix() {
    console.log("Initialiserer matrix med", matrixIssues.length, "saker");
    if (!matrixIssues || matrixIssues.length === 0) {
        console.error("Ingen issues-data funnet!");
        const loader = document.querySelector('.matrix-loader');
        if(loader) loader.textContent = 'Ingen data funnet.';
        return;
    }

    // Skjul lasteindikator
    const loader = document.querySelector('.matrix-loader');
    if(loader) loader.style.display = 'none';

    // Opprett modal og legg til stiler FØR matrisen genereres
    createPopupModalMatrix();
    addQuoteStylesMatrix();

    // Fyll filter og generer matrise
    const areas = getUniqueAreas();
    populateAreaFilter(areas);
    const initialViewMode = document.getElementById('view-mode')?.value || 'heatmap';
    generateMatrix('all', initialViewMode);

    // Sett opp lyttere ETTER at elementene er i DOM
    setupFilterListeners();
    setupToggleListener();

    // Re-generer matrisen ved vindusendring
    window.addEventListener('resize', function() {
        const areaFilter = document.getElementById('area-filter')?.value || 'all';
        const viewMode = document.getElementById('view-mode')?.value || 'heatmap';
        generateMatrix(areaFilter, viewMode);
    });
}

// Hent unike saksområder (som før)
function getUniqueAreas() {
    if (!Array.isArray(matrixIssues)) return [];
    const areas = matrixIssues.map(issue => issue.area).filter(area => area); // Filtrer ut undefined/null
    return [...new Set(areas)];
}

// Fyll area-filter (som før, men med sjekk)
function populateAreaFilter(areas) {
    const areaFilter = document.getElementById('area-filter');
    if (!areaFilter) return;

    // Fjern gamle options (unntatt "Alle") før vi legger til nye
    areaFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
    areas.sort((a, b) => a.localeCompare(b)); // Sorter alfabetisk
    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
}

// Sett opp lyttere for filtrene
function setupFilterListeners() {
    const areaFilter = document.getElementById('area-filter');
    const viewMode = document.getElementById('view-mode');

    if (areaFilter) {
        areaFilter.addEventListener('change', function() {
            const currentViewMode = document.getElementById('view-mode')?.value || 'heatmap';
            generateMatrix(this.value, currentViewMode);
        });
    }

    if (viewMode) {
        viewMode.addEventListener('change', function() {
            const currentArea = document.getElementById('area-filter')?.value || 'all';
            generateMatrix(currentArea, this.value);
        });
    }
}

// Sett opp lytter for checkboxen
function setupToggleListener() {
    const toggleCheckbox = document.getElementById('show-quotes-toggle');
    if (toggleCheckbox) {
        // Sett initiell status basert på global variabel
        toggleCheckbox.checked = showQuotesEnabled;
        // Legg til lytter for endringer
        toggleCheckbox.addEventListener('change', function() {
            showQuotesEnabled = this.checked;
            console.log("Vis detaljer satt til:", showQuotesEnabled);
            // Lukk eventuell åpen modal når man skrur av
            if (!showQuotesEnabled) {
                const modal = document.getElementById('quoteModalMatrix');
                if (modal) modal.style.display = 'none';
            }
        });
    } else {
        console.warn("Kunne ikke finne #show-quotes-toggle");
    }
}


// === START: Endret generateMatrix funksjon ===
function generateMatrix(areaFilter, viewMode) {
    console.log("Genererer matrise med filter:", areaFilter, "visning:", viewMode);
    const matrixVisualizationDiv = document.getElementById('matrix-visualization');
    if (!matrixVisualizationDiv) {
        console.error("Matrix container #matrix-visualization ikke funnet.");
        return;
    }
    matrixVisualizationDiv.innerHTML = ''; // Tøm den ytre containeren først

    let filteredIssues = matrixIssues;
    if (areaFilter !== 'all') {
        filteredIssues = matrixIssues.filter(issue => issue.area === areaFilter);
    }
    console.log("Filtrerte saker:", filteredIssues.length);

    const areaOrder = [
        "Arbeidsliv", "Diagnostikk og tidlig oppdagelse", "Folkehelse og forebygging",
        "Forskning og innovasjon", "Frivillig sektor", "Kreftomsorg", "Rettigheter",
        "Tilgang til behandling", "Økt investeringer i helse"
    ];
    const issuesByArea = {};
    areaOrder.forEach(area => issuesByArea[area] = []);
    filteredIssues.forEach(issue => {
        if (issuesByArea[issue.area]) {
            issuesByArea[issue.area].push(issue);
        } else {
            if (!issuesByArea["Andre saker"]) issuesByArea["Andre saker"] = [];
            issuesByArea["Andre saker"].push(issue);
        }
    });
    if (issuesByArea["Andre saker"] && issuesByArea["Andre saker"].length > 0) {
        areaOrder.push("Andre saker");
    }
    for (const area in issuesByArea) {
        issuesByArea[area].sort((a, b) => a.name.localeCompare(b.name));
    }

    const table = document.createElement('table');
    table.className = 'matrix-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const issueHeader = document.createElement('th');
    issueHeader.className = 'issue-col';
    issueHeader.textContent = 'Sak';
    headerRow.appendChild(issueHeader);
    parties.forEach(party => {
        const partyHeader = document.createElement('th');
        partyHeader.className = 'party-col'; partyHeader.textContent = party.shorthand; partyHeader.title = party.name;
        const rgbColor = hexToRgb(party.color);
        partyHeader.style.backgroundColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.8)`;
        partyHeader.style.color = '#fff';
        headerRow.appendChild(partyHeader);
    });
    const sumHeader = document.createElement('th');
    sumHeader.className = 'party-col'; sumHeader.textContent = 'SUM'; sumHeader.title = 'Sum av poeng';
    sumHeader.style.backgroundColor = "#e9ecef";
    headerRow.appendChild(sumHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    areaOrder.forEach(area => {
        if (!issuesByArea[area]) return;
        const areaRow = document.createElement('tr');
        areaRow.className = 'area-header';
        const areaCell = document.createElement('td');
        areaCell.colSpan = parties.length + 2;
        areaCell.textContent = area;
        areaRow.appendChild(areaCell);
        tbody.appendChild(areaRow);

        if (issuesByArea[area].length > 0) {
            issuesByArea[area].forEach(issue => {
                const row = document.createElement('tr');
                const issueCell = document.createElement('td');
                issueCell.className = 'issue-col';
                issueCell.textContent = issue.name;
                issueCell.title = issue.name;
                row.appendChild(issueCell);
                let totalPoints = 0;
                parties.forEach(party => {
                    const cellContainer = document.createElement('td');
                    let agreementLevel = 0;
                    let quote = null;
                    if (issue.partyStances && issue.partyStances[party.shorthand]) {
                        agreementLevel = issue.partyStances[party.shorthand].level ?? 0;
                        quote = issue.partyStances[party.shorthand].quote;
                    }
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    const colors = agreementColors[agreementLevel] || agreementColors[0];
                    cell.style.backgroundColor = colors.background;
                    cell.style.color = colors.color;
                    cell.style.border = `1px solid ${colors.border}`;
                    if (viewMode === 'numbers') {
                        cell.textContent = agreementLevel;
                    } else {
                        cell.innerHTML = ' ';
                    }
                    cell.dataset.party = party.shorthand;
                    cell.dataset.issueId = issue.id;
                    cell.dataset.level = agreementLevel;
                    if (quote) {
                        cell.dataset.quote = quote;
                        cell.classList.add('has-quote');
                        cell.style.cursor = "pointer";
                        const infoIndicator = document.createElement('span');
                        infoIndicator.className = 'info-indicator';
                        infoIndicator.innerHTML = 'i';
                        cell.appendChild(infoIndicator);
                        if (isTouchDevice()) {
                            cell.addEventListener('click', handleMatrixCellInteraction);
                        } else {
                            cell.addEventListener('mouseenter', handleMatrixCellInteraction);
                            cell.addEventListener('mouseleave', handleMatrixCellLeave);
                        }
                    } else {
                        cell.style.cursor = "default";
                    }
                    cellContainer.appendChild(cell);
                    row.appendChild(cellContainer);
                    totalPoints += agreementLevel;
                });
                const sumCellContainer = document.createElement('td');
                const sumCell = document.createElement('div');
                sumCell.className = 'sum-cell-content';
                sumCell.textContent = totalPoints;
                const maxPossiblePoints = parties.length * 2;
                const scoreRatio = maxPossiblePoints > 0 ? totalPoints / maxPossiblePoints : 0;
                if (scoreRatio >= 0.6) { sumCell.style.backgroundColor = agreementColors[2].background; sumCell.style.color = agreementColors[2].color; sumCell.style.border = `1px solid ${agreementColors[2].border}`; }
                else if (scoreRatio >= 0.3) { sumCell.style.backgroundColor = agreementColors[1].background; sumCell.style.color = agreementColors[1].color; sumCell.style.border = `1px solid ${agreementColors[1].border}`; }
                else { sumCell.style.backgroundColor = agreementColors[0].background; sumCell.style.color = agreementColors[0].color; sumCell.style.border = `1px solid ${agreementColors[0].border}`; }
                sumCellContainer.appendChild(sumCell);
                row.appendChild(sumCellContainer);
                tbody.appendChild(row);
            });
        }
    });
    table.appendChild(tbody);

    // Lag scroll-wrapperen NÅ og legg tabellen inni
    const tableScrollWrapper = document.createElement('div');
    tableScrollWrapper.className = 'matrix-table-scroll-wrapper';
    tableScrollWrapper.appendChild(table); // Legg den ferdigbygde tabellen inn i wrapperen
    matrixVisualizationDiv.appendChild(tableScrollWrapper); // Legg wrapperen til den ytre div-en

    updateLegendStyles();
}
// === SLUTT: Endret generateMatrix funksjon ===


// Funksjon for å håndtere interaksjon med matrisecelle (som før)
function handleMatrixCellInteraction(event) {
    if (!showQuotesEnabled) return;

    const cell = event.currentTarget;
    const partyCode = cell.dataset.party;
    const issueId = cell.dataset.issueId;
    const level = parseInt(cell.dataset.level, 10);
    const quote = cell.dataset.quote;

    if (!quote || quote === "null" || quote === "") {
         console.log("Ingen sitat å vise for", partyCode, "på sak", issueId);
         return;
    }

    const issue = matrixIssues.find(iss => iss.id == issueId);
    if (!issue) {
        console.error("Fant ikke sak med ID:", issueId);
        return;
    }

    if (isTouchDevice()) {
        showPartyQuoteMatrix(issue, partyCode, level, quote, cell);
    } else {
        if (hoverTimerMatrix) clearTimeout(hoverTimerMatrix);
        hoverTimerMatrix = setTimeout(() => {
            if (cell.matches(':hover')) {
                showPartyQuoteMatrix(issue, partyCode, level, quote, cell);
                currentHoveredCell = cell;
            }
        }, 150);
    }
}

// Funksjon for å håndtere mouseleave (kun desktop) (som før)
function handleMatrixCellLeave(event) {
     if (hoverTimerMatrix) {
        clearTimeout(hoverTimerMatrix);
        hoverTimerMatrix = null;
    }
    setTimeout(() => {
        const modal = document.getElementById('quoteModalMatrix');
        if (modal && !modal.matches(':hover') && !(currentHoveredCell && currentHoveredCell.matches(':hover'))) {
            modal.style.display = 'none';
            currentHoveredCell = null;
        }
    }, 100);
}


// Konverter hex til RGB (som før)
function hexToRgb(hex) {
    if (!hex) return { r: 200, g: 200, b: 200 }; // Fallback grå
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return { r, g, b };
}

// Oppdater legend-stil (som før)
function updateLegendStyles() {
    const legendItems = document.querySelectorAll('.legend-container .legend-item');
    legendItems.forEach(item => {
        const colorElement = item.querySelector('.legend-color');
        if (!colorElement) return;

        let level = -1;
        if (item.classList.contains('level-2')) level = 2;
        else if (item.classList.contains('level-1')) level = 1;
        else if (item.classList.contains('level-0')) level = 0;

        if (level !== -1) {
            const colors = agreementColors[level];
            if (!colors) return;

            item.style.backgroundColor = colors.background;
            item.style.border = `1px solid ${colors.border}`;
            colorElement.style.backgroundColor = colors.border;
            colorElement.style.border = 'none';
            const textElement = item.querySelector('.legend-text');
            if (textElement) { textElement.style.color = colors.color; }
        }
    });
}
