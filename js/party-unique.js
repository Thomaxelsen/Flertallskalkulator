/*
 * party-unique.js
 * Denne filen implementerer logikken for siden som viser saker hvor bare ett parti
 * (innenfor en valgt gruppe) støtter forslaget.
 * --- OPPGRADERT DESIGN ---
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.issues && window.partiesData) {
        initPartyUniquePage();
    } else {
        let issuesLoaded = !!window.issues;
        let partiesLoaded = !!window.partiesData;
        document.addEventListener('issuesDataLoaded', () => {
            issuesLoaded = true;
            if (issuesLoaded && partiesLoaded) initPartyUniquePage();
        });
        document.addEventListener('partiesDataLoaded', () => {
            partiesLoaded = true;
            if (issuesLoaded && partiesLoaded) initPartyUniquePage();
        });
    }
});

function initPartyUniquePage() {
    const partySelectorDiv = document.getElementById('partySelector');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const agreementRadios = document.querySelectorAll('input[name="agreement"]');
    const resultsContainer = document.getElementById('resultsContainer');

    const partiesMap = Object.fromEntries(window.partiesData.map(p => [p.shorthand, p]));
    const selectedParties = new Set();
    let agreementThreshold = 2;

    function hexToRgba(hex, alpha) {
        if (!hex) return 'rgba(200, 200, 200, 0.1)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // === FIX 1: Oppdaterer til å lage de nye "party-card"-elementene ===
    function renderPartyButtons() {
        if (!partySelectorDiv) return;
        partySelectorDiv.innerHTML = '';
        const sortedParties = [...window.partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));

        sortedParties.forEach(party => {
            const card = document.createElement('div');
            card.className = 'party-card';
            card.dataset.shorthand = party.shorthand;
            if (selectedParties.has(party.shorthand)) {
                card.classList.add('selected');
            }
            card.innerHTML = `
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" alt="${party.name} logo" class="party-logo">
                <span class="party-name">${party.shorthand}</span>
            `;
            card.addEventListener('click', () => {
                const code = party.shorthand;
                selectedParties.has(code) ? selectedParties.delete(code) : selectedParties.add(code);
                renderPartyButtons();
                updateResults();
            });
            partySelectorDiv.appendChild(card);
        });
    }
    // === SLUTT FIX 1 ===

    function attachEventListeners() {
        agreementRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                agreementThreshold = parseInt(radio.value, 10);
                updateResults();
            });
        });
        selectAllBtn.addEventListener('click', () => {
            window.partiesData.forEach(p => selectedParties.add(p.shorthand));
            renderPartyButtons();
            updateResults();
        });
        clearAllBtn.addEventListener('click', () => {
            selectedParties.clear();
            renderPartyButtons();
            updateResults();
        });
    }

    function updateResults() {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '';

        if (selectedParties.size < 3) {
            resultsContainer.innerHTML = `<p class="info-message">Velg minst tre partier for å se unike saker.</p>`;
            return;
        }

        const heading = document.createElement('h2');
        heading.textContent = 'Resultater';
        resultsContainer.appendChild(heading);

        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'selected-parties-badges';
        selectedParties.forEach(code => {
            const party = partiesMap[code];
            if (!party) return;
            const tag = document.createElement('div');
            tag.className = 'party-tag-small';
            tag.innerHTML = `<img src="images/parties/${party.shorthand.toLowerCase()}.png" class="party-tag-logo" alt="${party.name}"><span>${party.shorthand}</span>`;
            tag.style.backgroundColor = hexToRgba(party.color, 0.15);
            tag.style.borderColor = party.color;
            badgesContainer.appendChild(tag);
        });
        resultsContainer.appendChild(badgesContainer);

        let anyResultsFound = false;
        selectedParties.forEach(code => {
            const uniqueIssues = findUniqueIssuesForParty(code);
            if (uniqueIssues.length > 0) {
                anyResultsFound = true;
                const card = createResultCard(partiesMap[code], uniqueIssues);
                resultsContainer.appendChild(card);
            }
        });

        if (!anyResultsFound) {
            resultsContainer.innerHTML += `<p class="info-message">Fant ingen unike saker for de valgte partiene med gjeldende filter.</p>`;
        }
    }

    function findUniqueIssuesForParty(partyCode) {
        return window.issues.filter(issue => {
            const stances = issue.partyStances || {};
            const thisLevel = stances[partyCode]?.level ?? -1;
            if (thisLevel < agreementThreshold) return false;

            for (const otherCode of selectedParties) {
                if (otherCode === partyCode) continue;
                if ((stances[otherCode]?.level ?? -1) >= agreementThreshold) {
                    return false; // Another selected party also agrees
                }
            }
            return true; // It's unique
        });
    }

    // === FIX 2: Oppdaterer til å bygge den nye visuelle strukturen ===
    function createResultCard(party, uniqueIssues) {
        const card = document.createElement('div');
        card.className = 'party-unique-card';
        card.innerHTML = `
            <h3>
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="party-logo-header" alt="${party.name}">
                <span>${party.name} har ${uniqueIssues.length} unike sak${uniqueIssues.length === 1 ? '' : 'er'}</span>
            </h3>
        `;

        const issuesByArea = uniqueIssues.reduce((acc, issue) => {
            const area = issue.area || 'Ukjent område';
            if (!acc[area]) acc[area] = [];
            acc[area].push(issue);
            return acc;
        }, {});

        Object.keys(issuesByArea).sort().forEach(areaName => {
            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'issue-category-group';
            
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'issue-category-header';
            categoryHeader.textContent = areaName;
            categoryGroup.appendChild(categoryHeader);

            const issueList = document.createElement('ul');
            issueList.className = 'issue-list';

            issuesByArea[areaName].forEach(issue => {
                const li = document.createElement('li');
                li.className = 'issue-item';
                
                const issueNameSpan = document.createElement('span');
                issueNameSpan.className = 'issue-name';
                issueNameSpan.textContent = issue.name;
                li.appendChild(issueNameSpan);

                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'issue-controls';

                const logoImg = document.createElement('img');
                logoImg.src = `images/parties/${party.shorthand.toLowerCase()}.png`;
                logoImg.alt = party.shorthand;
                logoImg.className = 'party-icon-small';
                controlsDiv.appendChild(logoImg);

                const quote = issue.partyStances[party.shorthand]?.quote;
                if (quote) {
                    controlsDiv.appendChild(createQuoteButton(issue, party, quote));
                }
                
                li.appendChild(controlsDiv);
                issueList.appendChild(li);
            });

            categoryGroup.appendChild(issueList);
            card.appendChild(categoryGroup);
        });

        return card;
    }
    // === SLUTT FIX 2 ===

    function createQuoteButton(issue, party, quote) {
        const quoteBtn = document.createElement('div');
        quoteBtn.className = 'quote-btn';
        quoteBtn.textContent = 'i';
        quoteBtn.title = 'Vis sitat';
        quoteBtn.innerHTML += `
            <div class="quote-tooltip">
                <h5 class="quote-tooltip-title">
                    <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="quote-tooltip-logo" alt="${party.name}">
                    ${party.name}
                </h5>
                <p class="quote-tooltip-text">"${quote}"</p>
            </div>
        `;
        return quoteBtn;
    }

    // Initialiser siden
    renderPartyButtons();
    attachEventListeners();
    updateResults();
}
