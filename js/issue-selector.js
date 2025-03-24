// issue-selector.js - Funksjonalitet for å velge saker fra Kreftforeningens program

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

// Initialiser saksvelgeren
function initializeIssueSelector() {
    addIssueSelectCSS();
    addQuoteStyles(); // Legg til stiler for parti-sitater
    createIssueSelector();
    
    // Gjør showPartyQuote-funksjonen globalt tilgjengelig
    window.showPartyQuote = showPartyQuote;
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
    // Legg den i høyre kolonne etter resultatboksen
    const resultContainer = document.querySelector('.result-container');
    
    if (resultContainer) {
        resultContainer.parentNode.insertBefore(issueSelectorContainer, resultContainer.nextSibling);
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
        handleIssueSelection(selectedIssueId);
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
    
    // Bygg HTML for partier som støtter saken
    const partiesHTML = issue.partiesInAgreement.length > 0 
        ? issue.partiesInAgreement.map(partyCode => {
            // Sjekk om vi har sitat for dette partiet
            const hasQuote = issue.partyQuotes && issue.partyQuotes[partyCode];
            // Legg til klikkbar effekt bare hvis det finnes et sitat
            const clickableClass = hasQuote ? 'clickable-party' : '';
            const clickHandler = hasQuote ? `onclick="showPartyQuote(${issue.id}, '${partyCode}')"` : '';
            // Legg til indikator om at dette partiet har mer informasjon
            const infoIndicator = hasQuote ? '<span class="info-indicator">i</span>' : '';
            
            return `<span class="issue-party party-tag-${getPartyClassPrefix(partyCode)} ${clickableClass}" 
                          data-party="${partyCode}" ${clickHandler}>
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
            <div class="issue-parties-list">
                ${partiesHTML}
            </div>
        </div>
    `;
}

// Funksjon for å vise parti-sitat
function showPartyQuote(issueId, partyCode) {
    // Finn saken
    const issue = window.issues.find(issue => issue.id == issueId);
    if (!issue || !issue.partyQuotes || !issue.partyQuotes[partyCode]) return;
    
    // Hent partiinformasjon
    const partyName = getPartyFullName(partyCode);
    const quote = issue.partyQuotes[partyCode];
    
    // Lag modal hvis den ikke finnes
    if (!document.getElementById('quoteModal')) {
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
        
        // Legg til event listener på lukk-knappen
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Lukk modal hvis man klikker utenfor
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Oppdater modalen med partiets sitat
    const quoteContent = document.getElementById('quoteContent');
    quoteContent.innerHTML = `
        <h3 class="quote-party-title party-tag-${getPartyClassPrefix(partyCode)}">${partyName} vil:</h3>
        <p class="quote-text">"${quote}"</p>
    `;
    
    // Vis modal
    document.getElementById('quoteModal').style.display = 'block';
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
    `;
    
    document.head.appendChild(style);
}

// Legg til CSS for sitater-funksjonalitet
function addQuoteStyles() {
    if (document.getElementById('quote-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'quote-styles';
    style.textContent = `
        /* Klikkbare partier */
        .clickable-party {
            cursor: pointer;
            position: relative;
            padding-right: 20px;
            transition: all 0.2s ease;
        }
        
        .clickable-party:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 10px rgba(0,0,0,0.1);
        }
        
        .info-indicator {
            position: absolute;
            right: 5px;
            top: 4px;
            font-size: 10px;
            width: 14px;
            height: 14px;
            line-height: 14px;
            text-align: center;
            border-radius: 50%;
            background-color: rgba(255,255,255,0.7);
            color: #555;
            font-style: italic;
            font-weight: bold;
        }
        
        /* Modal for partisitater */
        .quote-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
            backdrop-filter: blur(3px);
        }
        
        .quote-modal-content {
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
        
        @keyframes modalFadeIn {
            from {opacity: 0; transform: translateY(-50px);}
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
