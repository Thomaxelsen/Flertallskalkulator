/*
 * party-unique.js
 * Denne filen implementerer logikken for siden som viser saker hvor bare ett parti
 * (innenfor en valgt gruppe) støtter forslaget.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Vent på at både issues og partier skal være lastet inn
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

    const partiesMap = {};
    window.partiesData.forEach(p => {
        partiesMap[p.shorthand] = p;
    });

    const selectedParties = new Set();
    let agreementThreshold = 2; // Startverdi: "Kun helt enig"

    // Hjelpefunksjon for å konvertere HEX til RGBA for bakgrunnsfarger
    function hexToRgba(hex, alpha) {
        if (!hex) return 'rgba(200, 200, 200, 0.1)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    renderPartyButtons();
    attachAgreementListeners();
    attachActionButtons();
    updateResults(); // Kjør en gang ved start for å vise meldingen

    /**
     * Rendrer knappene for hvert parti.
     */
    function renderPartyButtons() {
        if (!partySelectorDiv) return;
        partySelectorDiv.innerHTML = '';
        const sortedParties = [...window.partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));

        sortedParties.forEach(party => {
            const btn = document.createElement('button');
            btn.classList.add('party-button');
            btn.dataset.shorthand = party.shorthand;
            if (selectedParties.has(party.shorthand)) {
                btn.classList.add('selected');
            }
            btn.innerHTML = `
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" alt="${party.name} logo" class="party-logo">
                <div class="party-name">${party.shorthand}</div>
            `;
            btn.addEventListener('click', () => {
                const code = party.shorthand;
                if (selectedParties.has(code)) {
                    selectedParties.delete(code);
                } else {
                    selectedParties.add(code);
                }
                renderPartyButtons();
                updateResults();
            });
            partySelectorDiv.appendChild(btn);
        });
    }

    function attachAgreementListeners() {
        agreementRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                agreementThreshold = parseInt(radio.value, 10);
                updateResults();
            });
        });
    }

    function attachActionButtons() {
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

    /**
     * Beregner og oppdaterer resultatseksjonen.
     */
    function updateResults() {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '';

        if (selectedParties.size < 3) {
            const info = document.createElement('p');
            info.className = 'info-message';
            info.textContent = 'Velg minst tre partier for å se unike saker.';
            resultsContainer.appendChild(info);
            return;
        }

        const heading = document.createElement('h2');
        heading.textContent = 'Resultater for valgte partier:';
        resultsContainer.appendChild(heading);

        // FIX PROBLEM 1: Lager brikker med logo og tekst for valgte partier.
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'selected-parties-badges';
        selectedParties.forEach(code => {
            const party = partiesMap[code];
            if (!party) return;
            const tag = document.createElement('div');
            tag.className = 'party-tag-small';
            tag.innerHTML = `
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="party-tag-logo" alt="${party.name}">
                <span>${party.shorthand}</span>
            `;
            tag.style.backgroundColor = hexToRgba(party.color, 0.15);
            tag.style.borderColor = party.color;
            badgesContainer.appendChild(tag);
        });
        resultsContainer.appendChild(badgesContainer);
        // SLUTT FIX 1

        let anyResultsFound = false;

        selectedParties.forEach(code => {
            const party = partiesMap[code];
            if (!party) return;

            const uniqueIssuesByArea = {};
            window.issues.forEach(issue => {
                const stances = issue.partyStances || {};
                const thisLevel = stances[code]?.level ?? -1;

                if (thisLevel >= agreementThreshold) {
                    let isUnique = true;
                    for (const otherCode of selectedParties) {
                        if (otherCode === code) continue;
                        const otherLevel = stances[otherCode]?.level ?? -1;
                        if (otherLevel >= agreementThreshold) {
                            isUnique = false;
                            break;
                        }
                    }
                    if (isUnique) {
                        const area = issue.area || 'Ukjent område';
                        if (!uniqueIssuesByArea[area]) {
                            uniqueIssuesByArea[area] = [];
                        }
                        uniqueIssuesByArea[area].push(issue);
                    }
                }
            });

            const uniqueCount = Object.values(uniqueIssuesByArea).flat().length;
            if (uniqueCount > 0) {
                anyResultsFound = true;
                const card = createResultCard(party, uniqueIssuesByArea, uniqueCount);
                resultsContainer.appendChild(card);
            }
        });

        if (!anyResultsFound) {
            const noResults = document.createElement('p');
            noResults.className = 'info-message';
            noResults.textContent = 'Fant ingen unike saker for de valgte partiene med gjeldende filter.';
            resultsContainer.appendChild(noResults);
        }
    }

    /**
     * Lager et resultat-kort for et gitt parti og dets unike saker.
     */
    function createResultCard(party, issuesByArea, count) {
        const card = document.createElement('div');
        card.className = 'party-unique-card';

        // FIX PROBLEM 2: Sørger for at logoen er en del av overskriften.
        const cardHeader = document.createElement('h3');
        cardHeader.innerHTML = `
            <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="party-logo-header" alt="${party.name}">
            <span>${party.name} har ${count} unike sak${count === 1 ? '' : 'er'}</span>
        `;
        card.appendChild(cardHeader);
        // SLUTT FIX 2

        Object.keys(issuesByArea).sort().forEach(areaName => {
            const section = document.createElement('div');
            section.className = 'area-section';
            section.innerHTML = `<h4>${areaName}</h4>`;
            const list = document.createElement('ul');

            issuesByArea[areaName].forEach(issue => {
                const li = document.createElement('li');
                li.className = 'issue-item';
                li.innerHTML = `<span class="issue-name">${issue.name}</span>`;

                const controls = document.createElement('div');
                controls.style.display = 'flex';
                controls.style.alignItems = 'center';

                const logoImg = document.createElement('img');
                logoImg.src = `images/parties/${party.shorthand.toLowerCase()}.png`;
                logoImg.alt = party.shorthand;
                logoImg.className = 'party-icon-small';
                controls.appendChild(logoImg);

                const quote = issue.partyStances[party.shorthand]?.quote;
                if (quote) {
                    const quoteBtn = createQuoteButton(issue, party, quote);
                    controls.appendChild(quoteBtn);
                }

                li.appendChild(controls);
                list.appendChild(li);
            });
            section.appendChild(list);
            card.appendChild(section);
        });
        return card;
    }

    /**
     * FIX PROBLEM 3: Lager en "sitat-knapp" med en innebygd tooltip
     * i stedet for en modal.
     */
    function createQuoteButton(issue, party, quote) {
        const quoteBtn = document.createElement('div');
        quoteBtn.className = 'quote-btn';
        quoteBtn.textContent = 'i';
        quoteBtn.title = 'Vis sitat';

        const tooltip = document.createElement('div');
        tooltip.className = 'quote-tooltip';
        tooltip.innerHTML = `
            <h5 class="quote-tooltip-title">
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="quote-tooltip-logo" alt="${party.name}">
                ${party.name}
            </h5>
            <p class="quote-tooltip-text">"${quote}"</p>
        `;
        
        quoteBtn.appendChild(tooltip);
        return quoteBtn;
    }
    // SLUTT FIX 3
}
