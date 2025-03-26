// issue-selector.js - Funksjonalitet for å velge saker fra Kreftforeningens program

// Map over saker som har påvirkningsnotater
const issueDocuments = {
  // Rettigheter
  "36": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/785645577/Pasientreiser",
  "35": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/772571163/Avkortning+av+sosialhjelp+ved+konomisk+st+tte",
  "34": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/801734657/Pasient+og+brukerrettighetsloven+total+revisjon",
  
  // Arbeidsliv
  "1": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/849707012/Fleksibel+sykepengeordning+ny",
  
  // Diagnostikk og tidlig oppdagelse
  "7": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/772603925/Gentest+til+flere+tidligere+i+forl+pet",
  
  // Folkehelse og forebygging
  "17": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/786104324/Raskere+utryddelse+av+HPV",
  "14": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/785907717/Strengere+regulering+av+solarium",
  "10": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/786300939/R+ykeslutt+til+alle+som+trenger+det",
  
  // Forskning og innovasjon
  "20": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/819494913/Opprettelse+av+en+helsekatapult",
  
  // Kreftomsorg
  "30": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/812089354/Pakkeforl+p+hjem",
  "33": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/803700775/Ern+ringsstrategi+i+alle+sykehus",
  "32": "https://kreftforeningen.atlassian.net/wiki/spaces/POS/pages/891584514/Spesialisering+i+palliasjon"
};

// Vent til dokumentet er helt lastet
document.addEventListener('DOMContentLoaded', function() {
    // Vent til issues er globalt tilgjengelig og partier er lastet
    const checkLoaded = setInterval(function() {
        if (window.issues && document.querySelectorAll('.party-card').length > 0) {
            clearInterval(checkLoaded);
            initializeIssueSelector();
        }
    }, 100);
});

// Detect if we're on a touch device (mobile/tablet)
function isTouchDevice() {
    return (('ontouchstart' in window) || 
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
}

// Global variable to store current issue id (used by hover functionality)
let currentIssueId = null;
let hoverTimer = null;
let currentHoveredParty = null;

// Initialiser saksvelgeren
function initializeIssueSelector() {
    addIssueSelectCSS();
    addQuoteStyles();
    createIssueSelector();
    createPopupModal();
    
    // Gjør showPartyQuote-funksjonen globalt tilgjengelig
    window.showPartyQuote = showPartyQuote;
}

// Create the popup modal that will be used for both hover and click
function createPopupModal() {
    // Check if modal already exists
    if (document.getElementById('quoteModal')) return;
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'quoteModal';
    modal.className = 'quote-modal';
    modal.innerHTML = `
        <div class="quote-modal-content">
            <span class="close-modal">&times;</span>
            <div id="quoteContent"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listener to close button
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // On touch devices, set up click event delegation for party buttons
    if (isTouchDevice()) {
        document.addEventListener('click', (e) => {
            // Find closest clickable-party if we clicked on a child element
            const partyElement = e.target.closest('.clickable-party');
            if (partyElement) {
                const partyCode = partyElement.dataset.party;
                if (currentIssueId && partyCode) {
                    e.preventDefault();
                    e.stopPropagation();
                    showPartyQuote(currentIssueId, partyCode);
                }
            }
        });
    } 
    // På desktop, sett opp hover
    else {
        // Legg til debugging
        console.log("Setting up hover handlers for desktop");
        
        // Direkte hover-håndtering for partielementer
        setupInitialHoverListeners();
        
        // Watch for new elements being added after issue selection
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0) {
                    setupHoverListeners();
                }
            }
        });
        
        // Start observing the document for added nodes
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        // Allow hovering over the popup without it disappearing
        const modal = document.getElementById('quoteModal');
        if (modal) {
            modal.addEventListener('mouseleave', () => {
                modal.style.display = 'none';
                currentHoveredParty = null;
            });
        }
    }
}

// Setup hover listeners when the page first loads
function setupInitialHoverListeners() {
    // Add a small delay to ensure DOM is fully loaded
    setTimeout(setupHoverListeners, 500);
}

// Setup or refresh all hover listeners
function setupHoverListeners() {
    // Find all hoverable party elements
    const partyElements = document.querySelectorAll('.hoverable-party[data-party]');
    console.log(`Found ${partyElements.length} hoverable party elements`);
    
    partyElements.forEach(element => {
        // Remove existing listeners first to prevent duplicates
        element.removeEventListener('mouseenter', handlePartyHover);
        element.removeEventListener('mouseleave', handlePartyLeave);
        
        // Add hover listeners
        element.addEventListener('mouseenter', handlePartyHover);
        element.addEventListener('mouseleave', handlePartyLeave);
    });
}

// Handle mouseenter on party elements
function handlePartyHover(e) {
    const partyElement = e.currentTarget;
    const partyCode = partyElement.dataset.party;
    console.log("Mouse enter:", partyCode);
    
    if (currentIssueId && partyCode) {
        // Clear existing timer
        if (hoverTimer) clearTimeout(hoverTimer);
        
        // Set a small delay
        hoverTimer = setTimeout(() => {
            showPartyQuoteHover(currentIssueId, partyCode, partyElement);
            currentHoveredParty = partyElement;
        }, 100);
    }
}

// Handle mouseleave on party elements
function handlePartyLeave(e) {
    console.log("Mouse leave");
    if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
    }
    
    // Small delay to prevent flickering when moving to modal
    setTimeout(() => {
        const modal = document.getElementById('quoteModal');
        if (modal && !modal.matches(':hover')) {
            modal.style.display = 'none';
            currentHoveredParty = null;
        }
    }, 100);
}

// Hent alle unike saksområder fra issues-arrayet
function getUniqueAreas() {
    const areas = window.issues.map(issue => issue.area);
    return [...new Set(areas)];
}

// Opprett saksvelgeren og legg den til i DOM
function createIssueSelector() {
    // Lag container for saksvelgeren
    const issueSelectorContainer = document.createElement('div');
    issueSelectorContainer.className = 'issue-selector-container';
    
    // Hent unike saksområder
    const areas = getUniqueAreas();
    
    // Lag HTML for saksvelgeren
    issueSelectorContainer.innerHTML = `
        <div class="issue-selector">
            <h2 class="section-title">Velg sak fra Kreftforeningens program</h2>
            <p class="issue-description">Velg en sak for å se om det er flertall for Kreftforeningens standpunkt på Stortinget.</p>
            
            <div class="issue-filters">
                <select id="areaFilter" class="area-filter">
                    <option value="">Alle saksområder</option>
                    ${areas.map(area => `<option value="${area}">${area}</option>`).join('')}
                </select>
            </div>
            
            <select id="issueSelect" class="issue-dropdown">
                <option value="">Velg en sak...</option>
                ${window.issues.map(issue => `<option value="${issue.id}">${issue.name}</option>`).join('')}
            </select>
            
            <div id="issueDetails" class="issue-details">
                <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
            </div>
        </div>
    `;
    
   // Plasser saksvelgeren på siden
// Legg den i venstre kolonne øverst
const issueContainerPlaceholder = document.getElementById('issue-selector-container');

if (issueContainerPlaceholder) {
    issueContainerPlaceholder.appendChild(issueSelectorContainer);
}
    
    // Legg til hendelseslyttere
    setupIssueSelectionListeners();
}

// Sett opp hendelseslyttere for saksvelgeren
function setupIssueSelectionListeners() {
    const issueSelect = document.getElementById('issueSelect');
    const areaFilter = document.getElementById('areaFilter');
    
    // Når bruker velger saksområde, filtrer sakslisten
    areaFilter.addEventListener('change', function() {
        const selectedArea = this.value;
        updateIssueDropdown(selectedArea);
        
        // Nullstill saksvelgeren og partiutvalget
        issueSelect.value = '';
        resetPartySelection();
        updateIssueDetails();
    });
    
    // Når bruker velger en sak
    issueSelect.addEventListener('change', function() {
        const selectedIssueId = this.value;
        currentIssueId = selectedIssueId; // Store for hover functionality
        handleIssueSelection(selectedIssueId);
        
        // Etter at innholdet er oppdatert, sjekk etter hoverable elementer
        setTimeout(setupHoverListeners, 100);
    });
}

// Oppdater saksdropdown basert på valgt saksområde
function updateIssueDropdown(selectedArea) {
    const issueSelect = document.getElementById('issueSelect');
    
    // Filtrer saker basert på valgt område
    let filteredIssues = window.issues;
    if (selectedArea) {
        filteredIssues = window.issues.filter(issue => issue.area === selectedArea);
    }
    
    // Oppdater dropdown-innhold
    issueSelect.innerHTML = `
        <option value="">Velg en sak...</option>
        ${filteredIssues.map(issue => `<option value="${issue.id}">${issue.name}</option>`).join('')}
    `;
}

// Håndter når bruker velger en sak
function handleIssueSelection(issueId) {
    // Nullstill partiutvalget først
    resetPartySelection();
    
    // Hvis ingen sak er valgt, avbryt
    if (!issueId) {
        updateIssueDetails();
        updateResults();
        updateVisualization();
        return;
    }
    
    // Finn den valgte saken
    const selectedIssue = window.issues.find(issue => issue.id == issueId);
    if (!selectedIssue) return;
    
    // Oppdater saksdetaljer
    updateIssueDetails(selectedIssue);
    
    // Marker partier som er enige (score 2)
    selectPartiesThatAgree(selectedIssue.partiesInAgreement);
    
    // Oppdater resultater og visualisering
    if (typeof updateResults === 'function') {
        updateResults();
    }
    if (typeof updateVisualization === 'function') {
        updateVisualization();
    }
}

// Oppdater detaljvisningen for saken
function updateIssueDetails(issue = null) {
    const issueDetails = document.getElementById('issueDetails');
    
    if (!issue) {
        issueDetails.innerHTML = `
            <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
        `;
        return;
    }
    
    // Finn antall mandater for partiene som er enige
    const totalSeats = calculateTotalSeats(issue.partiesInAgreement);
    const hasMajority = totalSeats >= 85;
    
    // Determine device type to set correct CSS class and interaction method
    const isTouch = isTouchDevice();
    const interactionClass = isTouch ? 'clickable-party' : 'hoverable-party';
    const interactionTip = isTouch ? '(Trykk for detaljer)' : '(Hold musepeker over for detaljer)';
    
    // Bygg HTML for partier som støtter saken
    const partiesHTML = issue.partiesInAgreement.length > 0 
        ? issue.partiesInAgreement.map(partyCode => {
            // Sjekk om vi har sitat for dette partiet
            const hasQuote = issue.partyQuotes && issue.partyQuotes[partyCode];
            // Legg til klikkbar/hover effekt bare hvis det finnes et sitat
            const interactiveClass = hasQuote ? interactionClass : '';
            // For touch devices, we'll use click events via event delegation
            const interactionAttr = isTouch && hasQuote ? 'data-has-quote="true"' : '';
            // Legg til indikator om at dette partiet har mer informasjon
            const infoIndicator = hasQuote ? '<span class="info-indicator">i</span>' : '';
            
            return `<span class="issue-party party-tag-${getPartyClassPrefix(partyCode)} ${interactiveClass}" 
                          data-party="${partyCode}" ${interactionAttr}>
                        ${partyCode} ${infoIndicator}
                    </span>`;
        }).join('') 
        : '<span class="no-parties">Ingen partier er helt enige</span>';
    
    // Vis saksdetaljer og partiinformasjon
    issueDetails.innerHTML = `
        <h3 class="issue-name">${issue.name}</h3>
        <p class="issue-area">${issue.area}</p>
        
        <div class="issue-status ${hasMajority ? 'majority' : 'no-majority'}">
            ${hasMajority 
                ? `<strong>Flertall!</strong> ${totalSeats} av 169 mandater støtter Kreftforeningens standpunkt.` 
                : `<strong>Ikke flertall.</strong> ${totalSeats} av 169 mandater støtter Kreftforeningens standpunkt. Trenger ${85 - totalSeats} flere for flertall.`
            }
        </div>
        
        <div class="issue-parties">
            <h4>Partier som er helt enige med Kreftforeningen:</h4>
            <p class="interaction-tip">${issue.partiesInAgreement.some(party => issue.partyQuotes && issue.partyQuotes[party]) ? interactionTip : ''}</p>
            <div class="issue-parties-list">
                ${partiesHTML}
            </div>
        </div>
    `;
    
// Etter at HTML er oppdatert, oppdater hover-lytterne
    if (!isTouch) {
        setTimeout(setupHoverListeners, 100);
    }
    
    // Sjekk om vi har et påvirkningsnotat for denne saken etter at HTML er satt
    if (issue && issueDocuments[issue.id]) {
        // Opprett knapp-elementet
        const docButton = document.createElement('a');
        docButton.href = issueDocuments[issue.id];
        docButton.target = '_blank'; // Åpner i ny fane
        docButton.className = 'document-link-btn';
        docButton.textContent = 'Lenke til påvirkningsnotat';
        
        // Legg til knappen i DOM
        // Finn en god container å plassere den i
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'issue-buttons';
        buttonsContainer.appendChild(docButton);
        
        // Legg til container etter issue-parties
        const issueParties = issueDetails.querySelector('.issue-parties');
        if (issueParties) {
            issueParties.after(buttonsContainer);
        } else {
            // Alternativt legg den til på slutten av issueDetails
            issueDetails.appendChild(buttonsContainer);
        }
    }
}

// Show party quote in hover mode (positions near the party button)
function showPartyQuoteHover(issueId, partyCode, targetElement) {
    console.log(`Showing quote for issue ${issueId}, party ${partyCode}`);
    
    // Find issue
    const issue = window.issues.find(issue => issue.id == issueId);
    if (!issue) {
        console.error("Issue not found:", issueId);
        return;
    }
    
    if (!issue.partyQuotes) {
        console.error("No party quotes for issue:", issueId);
        return;
    }
    
    if (!issue.partyQuotes[partyCode]) {
        console.error("No quote for party:", partyCode);
        return;
    }
    
    // Get party info
    const partyName = getPartyFullName(partyCode);
    const quote = issue.partyQuotes[partyCode];
    
    // Update popup content
    const quoteContent = document.getElementById('quoteContent');
    quoteContent.innerHTML = `
        <h3 class="quote-party-title party-tag-${getPartyClassPrefix(partyCode)}">${partyName} vil:</h3>
        <p class="quote-text">"${quote}"</p>
    `;
    
    // Get modal and position it near the party button
    const modal = document.getElementById('quoteModal');
    modal.classList.add('hover-mode');
    
    // Get dimensions and position
    const rect = targetElement.getBoundingClientRect();
    const modalContent = modal.querySelector('.quote-modal-content');
    
    // Position the modal - try to place it near the party button
    // but ensure it stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Show the modal first but with visibility hidden so we can measure its height
    modalContent.style.visibility = 'hidden';
    modal.style.display = 'block';
    
    // Get the modal's height after content is set
    const modalHeight = modalContent.offsetHeight;
    const modalWidth = modalContent.offsetWidth || 400; // Default or measured width
    
    // Default position (right of button)
    let left = rect.right + 10;
    let top = rect.top;
    
    // If not enough space on right, place it on left
    if (left + modalWidth > viewportWidth - 20) {
        left = Math.max(10, rect.left - modalWidth - 10);
    }
    
    // Check vertical position - if not enough space below, place it above
    if (top + modalHeight > viewportHeight - 20) {
        // Try positioning above the element
        if (rect.top - modalHeight > 10) {
            top = rect.top - modalHeight;
        } else {
            // If not enough space above either, position it in the middle of viewport
            // with enough space to see the full content
            top = Math.max(10, viewportHeight - modalHeight - 20);
        }
    }
    
    // Apply position
    modalContent.style.left = `${left}px`;
    modalContent.style.top = `${top}px`;
    modalContent.style.position = 'fixed';
    modalContent.style.maxHeight = `${viewportHeight - 40}px`;
    modalContent.style.overflowY = 'auto'; // Add scrolling for very long content
    
    // Make visible and show the modal
    modalContent.style.visibility = 'visible';
}

// Funksjon for å vise parti-sitat (for click mode)
function showPartyQuote(issueId, partyCode) {
    // If we're in touch mode, use click functionality
    if (isTouchDevice()) {
        showPartyQuoteClick(issueId, partyCode);
    } else {
        // For non-touch devices, we use the hover handler which is triggered by mouseover
        const partyElement = document.querySelector(`.issue-party[data-party="${partyCode}"]`);
        if (partyElement) {
            showPartyQuoteHover(issueId, partyCode, partyElement);
        }
    }
}

// Show party quote in click mode (centered modal)
function showPartyQuoteClick(issueId, partyCode) {
    // Find issue
    const issue = window.issues.find(issue => issue.id == issueId);
    if (!issue || !issue.partyQuotes || !issue.partyQuotes[partyCode]) return;
    
    // Get party info
    const partyName = getPartyFullName(partyCode);
    const quote = issue.partyQuotes[partyCode];
    
    // Get modal
    const modal = document.getElementById('quoteModal');
    modal.classList.remove('hover-mode');
    
    // Reset styles for click mode (centered)
    const modalContent = modal.querySelector('.quote-modal-content');
    modalContent.style.left = '';
    modalContent.style.top = '';
    modalContent.style.position = '';
    modalContent.style.maxWidth = '';
    
    // Update content
    const quoteContent = document.getElementById('quoteContent');
    quoteContent.innerHTML = `
        <h3 class="quote-party-title party-tag-${getPartyClassPrefix(partyCode)}">${partyName} vil:</h3>
        <p class="quote-text">"${quote}"</p>
    `;
    
    // Show modal
    modal.style.display = 'block';
}

// Regn ut totalt antall mandater for partiene som er enige
function calculateTotalSeats(partyShorthands) {
    let totalSeats = 0;
    
    // Gå gjennom alle partikort og sum opp mandater for de valgte partiene
    document.querySelectorAll('.party-card').forEach(card => {
        const shorthand = card.dataset.shorthand;
        if (partyShorthands.includes(shorthand)) {
            totalSeats += parseInt(card.dataset.seats);
        }
    });
    
    return totalSeats;
}

// Velg partiene som er enige (score 2)
function selectPartiesThatAgree(partyShorthands) {
    document.querySelectorAll('.party-card').forEach(card => {
        const shorthand = card.dataset.shorthand;
        
        // Hvis partiet er i listen over partier som er enige
        if (partyShorthands.includes(shorthand)) {
            card.classList.add('selected');
        }
    });
}

// Nullstill partiutvalget
function resetPartySelection() {
    document.querySelectorAll('.party-card').forEach(card => {
        card.classList.remove('selected');
    });
}

// Hjelpefunksjon for å hente classPrefix for et parti
function getPartyClassPrefix(partyShorthand) {
    const partyMap = {
        'R': 'r',
        'SV': 'sv',
        'AP': 'ap',
        'SP': 'sp',
        'MDG': 'mdg',
        'KrF': 'krf',
        'V': 'v',
        'H': 'h',
        'FrP': 'frp',
        'PF': 'pf'
    };
    
    return partyMap[partyShorthand] || partyShorthand.toLowerCase();
}

// Hjelpefunksjon for å få fullt partinavn
function getPartyFullName(partyCode) {
    const partyNames = {
        'R': 'Rødt',
        'SV': 'Sosialistisk Venstreparti',
        'AP': 'Arbeiderpartiet',
        'SP': 'Senterpartiet',
        'MDG': 'Miljøpartiet De Grønne',
        'KrF': 'Kristelig Folkeparti',
        'V': 'Venstre',
        'H': 'Høyre',
        'FrP': 'Fremskrittspartiet',
        'PF': 'Pasientfokus'
    };
    
    return partyNames[partyCode] || partyCode;
}

// CSS-stiler for saksvelgeren legges til via JavaScript for å unngå konflikter
function addIssueSelectCSS() {
    // Sjekk om stilene allerede er lagt til
    if (document.getElementById('issue-selector-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'issue-selector-styles';
    style.textContent = `
        /* Stilene er allerede lagt til i styles.css */
        
        /* Stil for dokumentlenke-knappen */
        .issue-buttons {
            margin-top: 15px;
            display: flex;
            justify-content: center;
        }

        .document-link-btn {
            display: inline-block;
            padding: 8px 15px;
            background-color: #ff5f7c; /* Kreftforeningens rosa farge */
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            text-align: center;
            transition: background-color 0.2s;
        }

        .document-link-btn:hover {
            background-color: #e94867; /* Mørkere versjon for hover */
        }
    `;
    
    document.head.appendChild(style);
}

// Legg til CSS for sitater-funksjonalitet
function addQuoteStyles() {
    if (document.getElementById('quote-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'quote-styles';
    style.textContent = `
        /* Responsive interaksjoner */
        /* For klikkbare/hoverbare partielementer */
        .clickable-party, .hoverable-party {
            position: relative;
            cursor: pointer;
            padding-right: 8px;  /* Litt mer plass på høyre side */
        }
        
        .clickable-party {
            padding-right: 20px; /* Space for the indicator */
        }
        
        /* Hover effects only on non-touch devices */
        @media (hover: hover) and (pointer: fine) {
            .hoverable-party:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 10px rgba(0,0,0,0.1);
                transition: all 0.2s ease;
            }
        }
        
        /* Always show click effect */
        .clickable-party:active {
            transform: translateY(1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .info-indicator {
            position: absolute;
            right: -6px;
            top: -6px;
            font-size: 10px;
            width: 14px;
            height: 14px;
            line-height: 14px;
            text-align: center;
            border-radius: 50%;
            background-color: rgba(255,255,255,0.95);
            color: #555;
            font-style: italic;
            font-weight: bold;
            border: 1px solid #ddd;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .interaction-tip {
            font-size: 0.8rem;
            color: #666;
            font-style: italic;
            margin-bottom: 8px;
            text-align: center;
        }
        
        /* Modal styling */
        .quote-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
        }
        
        /* Regular modal (for click) */
        .quote-modal:not(.hover-mode) {
            background-color: rgba(0,0,0,0.4);
            backdrop-filter: blur(3px);
        }
        
        /* Hover modal (transparent background) */
        .quote-modal.hover-mode {
            background-color: transparent;
            pointer-events: none;
        }
        
        .quote-modal.hover-mode .quote-modal-content {
            pointer-events: auto;
        }
        
        /* Regular modal content styling (centered) */
        .quote-modal:not(.hover-mode) .quote-modal-content {
            background-color: white;
            margin: 15% auto;
            padding: 25px;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 25px rgba(0,0,0,0.2);
            animation: modalFadeIn 0.3s;
            position: relative;
        }
        
      /* Hover modal content styling (positioned near element) */
        .quote-modal.hover-mode .quote-modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
            animation: modalFadeIn 0.2s;
            position: fixed;
            width: auto;
            max-width: 400px;
            z-index: 1001;
        }
        
        @keyframes modalFadeIn {
            from {opacity: 0; transform: translateY(-10px);}
            to {opacity: 1; transform: translateY(0);}
        }
        
        .close-modal {
            color: #aaa;
            position: absolute;
            right: 15px;
            top: 10px;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.2s;
        }
        
        .hover-mode .close-modal {
            display: none;
        }
        
        .close-modal:hover {
            color: #333;
        }
        
        .quote-party-title {
            font-size: 1.4rem;
            margin-bottom: 15px;
            padding: 8px 15px;
            border-radius: 8px;
            display: inline-block;
        }
        
        .quote-text {
            font-size: 1.1rem;
            line-height: 1.6;
            color: #333;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 4px solid #ddd;
            margin: 15px 0;
            border-radius: 4px;
        }
    `;
    
    document.head.appendChild(style);
}
