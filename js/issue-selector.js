// issue-selector.js (OPPDATERT for å bruke full issue-data)

// Map over saker som har påvirkningsnotater (uendret)
const issueDocuments = { /* ... (din eksisterende map) ... */ };

document.addEventListener('DOMContentLoaded', function() {
    console.log("Issue Selector: DOM loaded.");
    // Sjekk om issues er lastet (av den NYE issues.js)
    if (window.issues && window.issues.length > 0) {
         // Trenger også partidata for å få fullt navn/prefix i sitater
        if (window.partiesDataLoaded && window.partiesData) {
            initializeIssueSelector();
        } else {
            console.log("Issue Selector: Issues loaded, waiting for parties...");
            document.addEventListener('partiesDataLoaded', initializeIssueSelector);
            // Kjør initialize hvis partier allerede *var* lastet
             if (window.partiesDataLoaded) initializeIssueSelector();
        }
    } else {
        console.log("Issue Selector: Waiting for issues data...");
        document.addEventListener('issuesDataLoaded', function() {
            console.log("Issue Selector: Issues data loaded event received.");
            // Nå vent på partidata
             if (window.partiesDataLoaded && window.partiesData) {
                initializeIssueSelector();
            } else {
                console.log("Issue Selector: Issues loaded, waiting for parties...");
                document.addEventListener('partiesDataLoaded', initializeIssueSelector);
                 // Kjør initialize hvis partier allerede *var* lastet
                 if (window.partiesDataLoaded) initializeIssueSelector();
            }
        });
    }

     // Sørg for at partidata lastes (hvis ikke allerede gjort av f.eks. sakskompass.js)
     if (!window.partiesDataLoaded) {
         console.log("Issue Selector: Triggering party data load (if needed)...");
         // Inkluder eller referer til logikken i partiesData.js eller fetch her
          fetch('data/parties.json') // Enkel fallback fetch
            .then(response => response.ok ? response.json() : Promise.reject('Fetch parties failed'))
            .then(data => {
                if (!window.partiesData) window.partiesData = data; // Sett hvis ikke satt
                if (!window.partiesDataLoaded) window.partiesDataLoaded = true;
                console.log("Issue Selector: Fallback fetch completed for parties.");
                document.dispatchEvent(new CustomEvent('partiesDataLoaded'));
            }).catch(e => console.error("Issue Selector: Fallback fetch failed:", e));
     }

});

// --- Globale variabler og hjelpefunksjoner (uendret) ---
function isTouchDevice() { /* ... (som før) ... */
    try {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    } catch (e) {
        return false; // Anta ikke-touch hvis sjekken feiler
    }
 }
let currentIssueId = null;
let hoverTimer = null;
let currentHoveredParty = null;
let partiesMapSelector = {}; // Map for raskt oppslag av partidata

// Initialiser saksvelgeren
function initializeIssueSelector() {
     // Sjekk om allerede initialisert
     if (document.getElementById('issueSelect')) {
         console.log("Issue Selector: Already initialized.");
         return;
     }
    console.log("Issue Selector: Initializing...");

     // Lag map for partidata hvis det ikke finnes
     if (Object.keys(partiesMapSelector).length === 0 && window.partiesData) {
         window.partiesData.forEach(p => partiesMapSelector[p.shorthand] = p);
         console.log("Issue Selector: Created partiesMapSelector:", partiesMapSelector);
     } else if (Object.keys(partiesMapSelector).length === 0) {
          console.error("Issue Selector: Cannot initialize - partiesData not available.");
          return;
     }


    addIssueSelectCSS();
    addQuoteStyles(); // Denne legger til CSS for modal
    createIssueSelector();
    // createPopupModal(); // Denne lager selve modal-elementet
    // Modal lages nå av issue-matrix eller her hvis den ikke finnes
    if (!document.getElementById('quoteModal')) {
        createPopupModal(); // Lag modal kun hvis den ikke finnes
    } else {
        console.log("Issue Selector: quoteModal already exists.");
        // Sørg for at event listeners settes opp på nytt/korrekt
        setupModalInteraction();
    }
    window.showPartyQuote = showPartyQuote; // Gjør globalt tilgjengelig
    console.log("Issue Selector: Initialization complete.");
}

// Funksjon for å lage popup modal (uendret, men kalt fra initialize)
function createPopupModal() {
    if (document.getElementById('quoteModal')) return;
    const modal = document.createElement('div');
    modal.id = 'quoteModal';
    modal.className = 'quote-modal';
    modal.innerHTML = `
        <div class="quote-modal-content">
            <span class="close-modal">×</span>
            <div id="quoteContent"></div>
        </div>
    `;
    document.body.appendChild(modal);
    setupModalInteraction(); // Sett opp lyttere
     console.log("Issue Selector: Created quoteModal.");
}

// Sett opp interaksjon for modal (separert funksjon)
function setupModalInteraction() {
    const modal = document.getElementById('quoteModal');
    if (!modal) return;

    // Lukkeknapp
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeModalHandler); // Fjern gammel lytter
        closeBtn.addEventListener('click', closeModalHandler);
    }

    // Klikk utenfor
    window.removeEventListener('click', closeClickHandler); // Fjern gammel lytter
    window.addEventListener('click', closeClickHandler);

    // Hover over popup (desktop)
    const modalContent = modal.querySelector('.quote-modal-content');
     if (modalContent && !isTouchDevice()) {
         modalContent.removeEventListener('mouseleave', modalMouseLeaveHandler); // Fjern gammel
         modalContent.addEventListener('mouseleave', modalMouseLeaveHandler);
         modalContent.addEventListener('mouseenter', () => {
            if (hoverTimer) clearTimeout(hoverTimer); // Stopp eventuell lukketime
         });
     }

     // Event delegation for klikk på partielementer (Touch)
     document.body.removeEventListener('click', partyElementClickHandler); // Fjern gammel
     document.body.addEventListener('click', partyElementClickHandler);

     // Setup hover for desktop
     setupInitialHoverListeners(); // Sørger for at hover er aktivt
}
// Håndterere for modal-lukking
function closeModalHandler() { document.getElementById('quoteModal').style.display = 'none'; }
function closeClickHandler(event) { if (event.target === document.getElementById('quoteModal')) { closeModalHandler(); } }
function modalMouseLeaveHandler() { closeModalHandler(); currentHoveredParty = null; }

// Håndterer klikk på body for å fange klikk på partielementer (touch)
function partyElementClickHandler(e) {
    if (!isTouchDevice()) return; // Bare for touch
    const partyElement = e.target.closest('.clickable-party[data-party][data-has-quote="true"]');
    if (partyElement) {
        const partyCode = partyElement.dataset.party;
        if (currentIssueId && partyCode) {
            e.preventDefault();
            e.stopPropagation();
            showPartyQuote(currentIssueId, partyCode);
        }
    }
}


// Setup hover listeners (uendret logikk, men kalt fra initialize)
function setupInitialHoverListeners() { setTimeout(setupHoverListeners, 500); }
function setupHoverListeners() {
    if (isTouchDevice()) return; // Ikke sett opp hover på touch
    const partyElements = document.querySelectorAll('.hoverable-party[data-party][data-has-quote="true"]'); // Bare de med sitat
    // console.log(`Issue Selector: Setting up hover for ${partyElements.length} elements`);
    partyElements.forEach(element => {
        element.removeEventListener('mouseenter', handlePartyHover);
        element.removeEventListener('mouseleave', handlePartyLeave);
        element.addEventListener('mouseenter', handlePartyHover);
        element.addEventListener('mouseleave', handlePartyLeave);
    });
}
function handlePartyLeave(e) {
    if (isTouchDevice()) return;
    // console.log("Mouse leave:", e.currentTarget.dataset.party);
    if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
    }
    // Sett en liten timeout før vi skjuler, slik at brukeren kan flytte musen til popupen
    setTimeout(() => {
        const modal = document.getElementById('quoteModal');
        // Sjekk om musen er over selve popupen eller over partielementet vi nettopp forlot
        if (modal && !modal.matches(':hover') && !(currentHoveredParty && currentHoveredParty.matches(':hover')) && !modal.querySelector('.quote-modal-content').matches(':hover')) {
            modal.style.display = 'none';
            currentHoveredParty = null;
        }
    }, 100); // 100ms delay
}


// --- Henting og oppretting av UI (Stort sett uendret) ---
function getUniqueAreas() {
     if (!window.issues) return [];
     const areas = window.issues.map(issue => issue.area).filter(Boolean);
     return [...new Set(areas)].sort();
}
function createIssueSelector() {
    // ... (inne i createIssueSelector)
    const issueSelectorContainer = document.getElementById('issue-selector-container');
    if (!issueSelectorContainer) {
        console.error("Issue Selector: Placeholder #issue-selector-container not found!");
        return;
    }
    // Sjekk om innhold allerede finnes
    if (issueSelectorContainer.querySelector('.issue-selector')) {
        console.log("Issue Selector: Content already exists in placeholder.");
        // Sett opp lyttere på nytt i tilfelle de ble borte
        setupIssueSelectionListeners();
        return;
    }

    const containerDiv = document.createElement('div');
    containerDiv.className = 'issue-selector';
    const areas = getUniqueAreas();

    // Sorter saker alfabetisk for default visning
    const sortedIssues = (window.issues || []).slice().sort((a, b) => a.name.localeCompare(b.name));

    containerDiv.innerHTML = `
        <p class="issue-description">Velg en sak for å se om det er flertall for Kreftforeningens standpunkt på Stortinget.</p>
        <div class="issue-filters">
            <select id="areaFilter" class="area-filter">
                <option value="">Alle saksområder</option>
                ${areas.map(area => `<option value="${area}">${area}</option>`).join('')}
            </select>
        </div>
        <select id="issueSelect" class="issue-dropdown">
            <option value="">Velg en sak...</option>
            ${sortedIssues.map(issue => `<option value="${issue.id}">${issue.name}</option>`).join('')}
        </select>
        <div id="issueDetails" class="issue-details">
            <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
        </div>
    `;
    issueSelectorContainer.appendChild(containerDiv);
    setupIssueSelectionListeners();
}
function setupIssueSelectionListeners() {
    const issueSelect = document.getElementById('issueSelect');
    const areaFilter = document.getElementById('areaFilter');

    if (issueSelect) {
         issueSelect.removeEventListener('change', issueSelectChangeHandler); // Fjern gammel
         issueSelect.addEventListener('change', issueSelectChangeHandler);
    }
    if (areaFilter) {
        areaFilter.removeEventListener('change', areaFilterChangeHandler); // Fjern gammel
        areaFilter.addEventListener('change', areaFilterChangeHandler);
    }
}
// Separerte handlers for lyttere
function issueSelectChangeHandler() {
    const selectedIssueId = this.value;
    currentIssueId = selectedIssueId;
    handleIssueSelection(selectedIssueId);
    setTimeout(setupHoverListeners, 100); // Refresh hover listeners
}
function areaFilterChangeHandler() {
    const selectedArea = this.value;
    updateIssueDropdown(selectedArea);
    document.getElementById('issueSelect').value = ''; // Nullstill sak
    resetPartySelection();
    updateIssueDetails(); // Vis default melding
}


// *** HER ER ENDRINGEN ***
function updateIssueDropdown(selectedArea) {
    const issueSelect = document.getElementById('issueSelect');
    if (!issueSelect) return;

    let filteredIssues = window.issues || [];
    // Kun filtrer hvis selectedArea IKKE er en tom streng
    if (selectedArea !== "") {
        filteredIssues = filteredIssues.filter(issue => issue.area === selectedArea);
    }
    // Hvis selectedArea ER en tom streng (Alle), beholdes alle issues i filteredIssues

    // Sort filtered issues alphabetically by name
    filteredIssues.sort((a, b) => a.name.localeCompare(b.name));

    // Generate options HTML
    const optionsHTML = [
        '<option value="">Velg en sak...</option>', // Default option
        ...filteredIssues.map(issue => `<option value="${issue.id}">${issue.name}</option>`)
    ].join('');

    // Update the dropdown's inner HTML
    issueSelect.innerHTML = optionsHTML;

    console.log(`Issue Selector: Updated issue dropdown for area: ${selectedArea || 'Alle'}, ${filteredIssues.length} issues shown.`);
}
// *** SLUTT PÅ ENDRINGEN ***


// --- Håndtering av saksvalg (MODIFISERT) ---
function handleIssueSelection(issueId) {
    resetPartySelection();
    if (!issueId) {
        updateIssueDetails(); // Vis default melding
        // Ikke oppdater resultater/visualisering her, la manuell valg styre det
        return;
    }

    const selectedIssue = window.issues.find(issue => issue.id == issueId);
    if (!selectedIssue || !selectedIssue.partyStances) { // Sjekk for partyStances
        console.error("Issue Selector: Selected issue or partyStances not found for ID:", issueId);
        updateIssueDetails(); // Vis default
        return;
    }

    // *** ENDRING: Hent ut nivå 2-partier fra partyStances ***
    const partiesLevel2 = [];
    for (const partyCode in selectedIssue.partyStances) {
        if (selectedIssue.partyStances[partyCode]?.level === 2) {
            partiesLevel2.push(partyCode);
        }
    }
    console.log(`Issue Selector: Parties with level 2 for issue ${issueId}:`, partiesLevel2);
    // *** SLUTT ENDRING ***

    // Oppdater detaljer og velg partier basert på den *nye* listen
    updateIssueDetails(selectedIssue, partiesLevel2); // Send med listen
    selectPartiesThatAgree(partiesLevel2); // Bruk listen

    // Oppdater resultater og visualisering på hovedsiden
    if (typeof updateResults === 'function') updateResults();
    if (typeof updateVisualization === 'function') updateVisualization();
}

// --- Oppdatering av UI (MODIFISERT) ---
// Tar nå imot listen over nivå 2-partier som argument
function updateIssueDetails(issue = null, partiesLevel2 = []) {
    const issueDetails = document.getElementById('issueDetails');
    if (!issueDetails) return;

    if (!issue) {
        issueDetails.innerHTML = `<p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>`;
        return;
    }

     // Bruk mottatt liste for å kalkulere seter
    const totalSeats = calculateTotalSeats(partiesLevel2);
    const hasMajority = totalSeats >= 85;

    const isTouch = isTouchDevice();
    const interactionClass = isTouch ? 'clickable-party' : 'hoverable-party';
    const interactionTip = isTouch ? '(Trykk for detaljer)' : '(Hold musepeker over for detaljer)';

    let hasAnyQuote = false; // Sjekk om noen i det hele tatt har sitat

    // *** ENDRING: Bruk partiesLevel2 og hent sitat fra partyStances ***
    const partiesHTML = partiesLevel2.length > 0
        ? partiesLevel2.map(partyCode => {
            const hasQuote = issue.partyStances[partyCode]?.quote; // Sjekk direkte
            if (hasQuote) hasAnyQuote = true; // Sett flagg hvis minst en har sitat
            const interactiveClass = hasQuote ? interactionClass : '';
            const interactionAttr = hasQuote ? 'data-has-quote="true"' : ''; // Merk de med sitat
            const infoIndicator = hasQuote ? '<span class="info-indicator">i</span>' : '';
            const partyClassPrefix = getPartyClassPrefix(partyCode); // Hent prefix

            // Sjekk om partiet finnes i mappen vår for å unngå feil
             if (!partiesMapSelector[partyCode]) {
                console.warn(`Issue Selector: Party code '${partyCode}' in issue ${issue.id} not found in partiesMapSelector. Skipping tag.`);
                return ''; // Hopp over dette partiet hvis det ikke er i mappen
            }

            return `<span class="issue-party party-tag-${partyClassPrefix} ${interactiveClass}"
                          data-party="${partyCode}" ${interactionAttr}>
                        ${partyCode} ${infoIndicator}
                    </span>`;
        }).join('')
        : '<span class="no-parties">Ingen partier er helt enige</span>';
    // *** SLUTT ENDRING ***

    issueDetails.innerHTML = `
        <h3 class="issue-name">${issue.name}</h3>
        <p class="issue-area">${issue.area || 'Ukjent område'}</p>
        <div class="issue-status ${hasMajority ? 'majority' : 'no-majority'}">
            ${hasMajority
                ? `<strong>Flertall!</strong> ${totalSeats} av 169 mandater støtter Kreftforeningens standpunkt.`
                : `<strong>Ikke flertall.</strong> ${totalSeats} av 169 mandater støtter. Trenger ${Math.max(0, 85 - totalSeats)} flere for flertall.`
            }
        </div>
        <div class="issue-parties">
            <h4>Partier som er helt enige med Kreftforeningen (Nivå 2):</h4>
            ${partiesLevel2.length > 0 && hasAnyQuote ? `<p class="interaction-tip">${interactionTip}</p>` : ''}
            <div class="issue-parties-list">
                ${partiesHTML}
            </div>
        </div>
    `;

    // Legg til dokument-knapp (uendret logikk)
    if (issue && issueDocuments[issue.id]) {
        const docButton = document.createElement('a');
        docButton.href = issueDocuments[issue.id];
        docButton.target = '_blank';
        docButton.rel = 'noopener noreferrer';
        docButton.className = 'button document-link-btn'; // Bruker knappestiler
        docButton.textContent = 'Les påvirkningsnotat';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'issue-buttons';
        buttonsContainer.appendChild(docButton);
        const issuePartiesDiv = issueDetails.querySelector('.issue-parties');
        if (issuePartiesDiv) issuePartiesDiv.after(buttonsContainer);
        else issueDetails.appendChild(buttonsContainer);
    }

    // Refresh hover listeners hvis ikke touch
    if (!isTouch) {
        setTimeout(setupHoverListeners, 100);
    }
}

// --- Visning av sitater (MODIFISERT) ---
// Felles funksjon for å hente og vise sitat
function showPartyQuote(issueId, partyCode) {
    const issue = window.issues.find(iss => iss.id == issueId);
    if (!issue || !issue.partyStances || !issue.partyStances[partyCode]) {
        console.error("Issue Selector: Could not find issue or stance for quote:", issueId, partyCode);
        return;
    }
    const stance = issue.partyStances[partyCode];
    const quote = stance.quote;

    if (!quote) {
         console.log("Issue Selector: No quote available for", partyCode, "on issue", issueId);
         return; // Ikke vis modal hvis det ikke er sitat
    }

    const partyName = getPartyFullName(partyCode); // Bruker hjelpefunksjon
    const partyClassPrefix = getPartyClassPrefix(partyCode); // Bruker hjelpefunksjon

    const quoteContentEl = document.getElementById('quoteContent');
    if (!quoteContentEl) return;
    quoteContentEl.innerHTML = `
        <h3 class="quote-party-title party-tag-${partyClassPrefix}">${partyName} vil:</h3>
        <p class="quote-text">"${quote}"</p>
    `;

    const modal = document.getElementById('quoteModal');
    if (!modal) return;

    const targetElement = document.querySelector(`.issue-party[data-party="${partyCode}"]`); // Finn elementet for posisjonering

    if (isTouchDevice()) {
        // Klikk-modus (sentrert)
        modal.classList.remove('hover-mode');
        const modalContent = modal.querySelector('.quote-modal-content');
        modalContent.style.left = '';
        modalContent.style.top = '';
        modalContent.style.position = '';
        modalContent.style.maxWidth = '';
        modal.style.display = 'block';
    } else if (targetElement) {
        // Hover-modus (posisjonert) - bruker eksisterende logikk
        showPartyQuoteHoverPosition(modal, targetElement);
    }
}

// Egen funksjon for hover-posisjonering (brukt av showPartyQuote og handlePartyHover)
function showPartyQuoteHoverPosition(modal, targetElement) {
     if (!modal || !targetElement) return;
     modal.classList.add('hover-mode');
     const rect = targetElement.getBoundingClientRect();
     const modalContent = modal.querySelector('.quote-modal-content');
     const viewportWidth = window.innerWidth;
     const viewportHeight = window.innerHeight;

     // Vis midlertidig for å måle
     modalContent.style.visibility = 'hidden';
     modal.style.display = 'block';
     const modalHeight = modalContent.offsetHeight;
     const modalWidth = modalContent.offsetWidth || 350; // Antatt bredde

     // Posisjonsberegning (som før)
     let top = rect.top - modalHeight - 10; // Prøv over
     if (top < 10) top = rect.bottom + 10; // Prøv under
     if (top + modalHeight > viewportHeight - 10) top = Math.max(10, viewportHeight - modalHeight - 10); // Juster bunn
     let left = rect.left + (rect.width / 2) - (modalWidth / 2); // Prøv sentrert
     left = Math.max(10, Math.min(left, viewportWidth - modalWidth - 10)); // Juster sider

     // Anvend posisjon
     modalContent.style.position = 'fixed';
     modalContent.style.left = `${left}px`;
     modalContent.style.top = `${top}px`;
     modalContent.style.visibility = 'visible';
     modalContent.style.maxHeight = `${viewportHeight - 40}px`;
     modalContent.style.overflowY = 'auto';
}

// Kall showPartyQuote fra hover handler
function handlePartyHover(e) {
    if (isTouchDevice()) return;
    const partyElement = e.currentTarget;
    const partyCode = partyElement.dataset.party;
    // console.log("Mouse enter:", partyCode);
    if (currentIssueId && partyCode) {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
            // Sjekk om musen fortsatt er over elementet
            if (partyElement.matches(':hover')) {
                showPartyQuote(currentIssueId, partyCode); // Kaller nå fellesfunksjonen
                currentHoveredParty = partyElement;
            }
        }, 150); // Litt lengre delay
    }
}
// handlePartyLeave er uendret

// --- Hjelpefunksjoner ---
// Kalkuler seter (tar nå en liste med partikoder)
function calculateTotalSeats(partyShorthands) {
    let totalSeats = 0;
    partyShorthands.forEach(shorthand => {
        const partyCard = document.querySelector(`.party-card[data-shorthand="${shorthand}"]`);
        if (partyCard) {
            totalSeats += parseInt(partyCard.dataset.seats || 0);
        } else {
            // Fallback to using the map if party card isn't found (e.g., if it hasn't been rendered yet)
             const partyInfo = partiesMapSelector[shorthand];
             if (partyInfo && typeof partyInfo.seats === 'number') {
                 totalSeats += partyInfo.seats;
             } else {
                  console.warn(`calculateTotalSeats: Could not find seats for party '${shorthand}' either in DOM or map.`);
             }
        }
    });
    return totalSeats;
}

// Velg partier (tar liste med partikoder) - uendret logikk
function selectPartiesThatAgree(partyShorthands) {
    document.querySelectorAll('.party-card').forEach(card => {
        if (partyShorthands.includes(card.dataset.shorthand)) {
            card.classList.add('selected');
        } else {
            // Fjern også valgt hvis partiet IKKE er i listen for den valgte saken
            card.classList.remove('selected');
        }
    });
}

// Nullstill valg - uendret
function resetPartySelection() {
    document.querySelectorAll('.party-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
     // Viktig: Oppdater også resultatene når vi nullstiller manuelt
     if (typeof updateResults === 'function') updateResults();
     if (typeof updateVisualization === 'function') updateVisualization();
}

// Hent partinavn (bruker nå map)
function getPartyFullName(partyCode) {
    return partiesMapSelector[partyCode]?.name || partyCode;
}

// Hent class prefix (bruker nå map)
function getPartyClassPrefix(partyCode) {
     return partiesMapSelector[partyCode]?.classPrefix || partyCode.toLowerCase();
}


// --- CSS injeksjon (uendret) ---
function addIssueSelectCSS() {
    if (document.getElementById('issue-selector-styles')) return; // Unngå duplikat
    const style = document.createElement('style');
    style.id = 'issue-selector-styles';
    style.textContent = `
        /* issue-selector.css */
        .issue-selector {
            /* Styles for the main container if needed */
        }
        .issue-description {
            font-size: 0.95rem;
            color: #555;
            margin-bottom: 1rem;
        }
        .issue-filters {
            margin-bottom: 1rem;
        }
        .area-filter,
        .issue-dropdown {
            width: 100%;
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            font-size: 0.95rem;
            margin-top: 5px; /* Added margin top */
            background-color: white;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            transition: all 0.2s ease;
        }
        .area-filter:hover, .issue-dropdown:hover {
            border-color: var(--kf-purple);
            box-shadow: 0 2px 5px rgba(0,0,0,0.06);
        }
         .area-filter:focus, .issue-dropdown:focus {
            outline: none;
            border-color: var(--kf-pink);
            box-shadow: 0 0 0 2px rgba(230, 60, 140, 0.2);
        }
        .issue-details {
            background-color: #f0f4f8;
            border-radius: 6px;
            padding: 15px;
            margin-top: 1rem;
            border-left: 4px solid var(--kf-blue);
             transition: all 0.3s ease;
             min-height: 150px; /* Default height */
        }
        .issue-details:hover { box-shadow: 0 3px 8px rgba(0,0,0,0.06); }
        .issue-explainer {
            color: #666;
            font-style: italic;
            text-align: center;
            font-size: 0.9rem;
            padding: 20px 0;
        }
        .issue-name {
            color: var(--kf-blue);
            margin-bottom: 5px;
            font-size: 1.1rem;
            font-weight: 600;
        }
        .issue-area {
            color: #555;
            font-style: italic;
            font-size: 0.85rem;
            margin-bottom: 10px;
             padding-bottom: 8px;
             border-bottom: 1px solid #e0e0e0;
        }
        .issue-status {
             padding: 12px;
             border-radius: 6px;
             margin: 15px 0;
             font-size: 1rem;
             text-align: center;
             box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .issue-status strong { font-weight: 600; }
        .issue-status.majority { background: linear-gradient(90deg, var(--kf-light-green), var(--kf-green)); color: white; }
        .issue-status.no-majority { background: linear-gradient(90deg, var(--kf-pink), var(--kf-purple)); color: white; }

        .issue-parties { margin-top: 15px; }
        .issue-parties h4 { color: var(--kf-blue); margin-bottom: 8px; font-size: 1rem; }
        .issue-parties-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
        .issue-party {
            padding: 4px 10px;
            border-radius: 15px;
            font-weight: 500;
            font-size: 0.85rem;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
            border: 1px solid #eee;
            position: relative;
        }
         .issue-party.clickable-party, .issue-party.hoverable-party {
            cursor: pointer;
        }
        .issue-party:hover { transform: translateY(-2px); box-shadow: 0 2px 5px rgba(0,0,0,0.15); }
        .no-parties { color: #777; font-style: italic; font-size: 0.9rem; }

         /* Farger for issue-party tags */
        .issue-party.party-tag-ap { background-color: rgba(237, 27, 52, 0.1); border-color: #ed1b34; color: #b81628; }
        .issue-party.party-tag-h { background-color: rgba(0, 122, 200, 0.1); border-color: #007ac8; color: #005a93; }
        .issue-party.party-tag-sp { background-color: rgba(20, 119, 60, 0.1); border-color: #14773c; color: #0e5329; }
        .issue-party.party-tag-frp { background-color: rgba(0, 46, 94, 0.1); border-color: #002e5e; color: #001f3f; }
        .issue-party.party-tag-sv { background-color: rgba(235, 46, 45, 0.1); border-color: #eb2e2d; color: #c42625; }
        .issue-party.party-tag-v { background-color: rgba(0, 128, 123, 0.1); border-color: #00807b; color: #005f5b; }
        .issue-party.party-tag-r { background-color: rgba(218, 41, 28, 0.1); border-color: #da291c; color: #a51f15; }
        .issue-party.party-tag-krf { background-color: rgba(255, 190, 0, 0.1); border-color: #ffbe00; color: #b08400; }
        .issue-party.party-tag-mdg { background-color: rgba(67, 149, 57, 0.1); border-color: #439539; color: #2d6426; }
        .issue-party.party-tag-pf { background-color: rgba(160, 77, 148, 0.1); border-color: #a04d94; color: #703668; }

        /* Info indicator 'i' */
        .issue-party .info-indicator {
           position: absolute;
           top: -4px;
           right: -4px;
           width: 14px;
           height: 14px;
           line-height: 14px;
           font-size: 9px;
           font-weight: bold;
           font-style: normal;
           text-align: center;
           border-radius: 50%;
           background-color: var(--kf-blue);
           color: white;
           border: 1px solid white;
           box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
           z-index: 1;
           pointer-events: none;
        }
        .interaction-tip {
            font-size: 0.8rem;
            color: #666;
            font-style: italic;
            margin: 5px 0 8px 0;
            text-align: left;
        }
        .issue-buttons {
            margin-top: 15px;
            display: flex;
            justify-content: flex-start;
        }
        .document-link-btn { /* Gjenbruker .button stil fra styles.css */
            padding: 6px 12px;
            font-size: 0.85rem;
            background-color: var(--kf-pink);
            color: white;
            border-radius: 6px;
            text-decoration: none;
            display: inline-block;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
        }
        .document-link-btn:hover {
            background-color: var(--kf-purple);
             box-shadow: 0 3px 6px rgba(0,0,0,0.15);
             transform: translateY(-1px);
        }
    `;
    document.head.appendChild(style);
}
function addQuoteStyles() {
    if (document.getElementById('quote-styles')) return;
    const style = document.createElement('style');
    style.id = 'quote-styles';
    style.textContent = `
        /* Modal styling */
        .quote-modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; }
        .quote-modal:not(.hover-mode) { background-color: rgba(0,0,0,0.4); backdrop-filter: blur(3px); }
        /* Hover mode specific */
        .quote-modal.hover-mode { background-color: transparent; pointer-events: none; }
        .quote-modal.hover-mode .quote-modal-content { pointer-events: auto; }

        /* Content Box */
        .quote-modal-content {
            background-color: white;
            border-radius: 8px; /* Default for hover */
            box-shadow: 0 5px 20px rgba(0,0,0,0.15); /* Default for hover */
            animation: modalFadeIn 0.2s;
        }
        /* Click mode specific */
        .quote-modal:not(.hover-mode) .quote-modal-content {
            margin: 10% auto; padding: 25px; width: 90%; max-width: 500px; position: relative; border-radius: 12px; box-shadow: 0 4px 25px rgba(0,0,0,0.2);
        }
        /* Hover mode specific */
        .quote-modal.hover-mode .quote-modal-content {
             padding: 15px 20px; position: fixed; width: auto; max-width: 350px; z-index: 1001;
        }

        @keyframes modalFadeIn { from {opacity: 0; transform: translateY(-10px);} to {opacity: 1; transform: translateY(0);} }

        /* Close Button (Click mode only) */
        .close-modal { color: #aaa; position: absolute; right: 15px; top: 10px; font-size: 28px; font-weight: bold; cursor: pointer; transition: color 0.2s; }
        .hover-mode .close-modal { display: none; }
        .close-modal:hover { color: #333; }

        /* Party Title */
        .quote-party-title {
            font-size: 1.2rem; margin-bottom: 10px; padding: 5px 12px; border-radius: 6px; display: inline-block; color: white; font-weight: 600;
        }
        /* Background colors for party title */
        .quote-party-title.party-tag-ap { background-color: #ed1b34; }
        .quote-party-title.party-tag-h { background-color: #007ac8; }
        .quote-party-title.party-tag-sp { background-color: #14773c; }
        .quote-party-title.party-tag-frp { background-color: #002e5e; }
        .quote-party-title.party-tag-sv { background-color: #eb2e2d; }
        .quote-party-title.party-tag-v { background-color: #00807b; }
        .quote-party-title.party-tag-r { background-color: #da291c; }
        .quote-party-title.party-tag-krf { background-color: #ffbe00; color: #333; } /* Dark text for KrF */
        .quote-party-title.party-tag-mdg { background-color: #439539; }
        .quote-party-title.party-tag-pf { background-color: #a04d94; }

        /* Quote Text */
        .quote-text {
            font-size: 1rem; line-height: 1.5; color: #333; padding: 12px; background-color: #f8f9fa; border-left: 3px solid var(--kf-purple); margin: 10px 0 0 0; border-radius: 4px; font-style: italic;
        }
         .no-quote-text { font-style: italic; color: #777; } /* Stil for melding om manglende sitat */
    `;
    document.head.appendChild(style);
}
