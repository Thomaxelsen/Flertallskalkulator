/* 
 * party-unique.js
 * Denne filen implementerer logikken for siden som viser saker hvor bare ett parti
 * (innenfor en valgt gruppe) støtter forslaget. Brukeren kan velge minimum tre partier
 * og velge om bare nivå 2 (full enighet) eller både nivå 1 og 2 skal regnes med.
 *
 * Skriptet baserer seg på at issues.js og partiesData.js har lastet sine data
 * og satt globale variabler window.issues og window.partiesData. Dersom disse
 * ikke er tilgjengelige umiddelbart, lytter skriptet på events for å starte
 * initialisering når dataene er klare.
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

    // Map fra shorthand til partiobjekt for rask lookup
    const partiesMap = {};
    window.partiesData.forEach(p => {
        partiesMap[p.shorthand] = p;
    });

    // Holder styr på hvilke partier som er valgt
    const selectedParties = new Set();

    // Nåværende minstekrav til enighetsnivå. 2 betyr kun nivå 2,
    // 1 betyr nivå 1 eller 2.
    let agreementThreshold = 2;

    // Opprett modal for sitatvisning
    setupQuoteModal();

    renderPartyButtons();
    attachAgreementListeners();
    attachActionButtons();

    /**
     * Oppretter sitatmodalelementet om det ikke finnes fra før.
     */
    function setupQuoteModal() {
        if (document.getElementById('quoteModal')) return;
        const modal = document.createElement('div');
        modal.id = 'quoteModal';
        modal.className = 'quote-modal';
        modal.innerHTML = `
            <div class="quote-modal-content">
                <span class="close-modal">×</span>
                <h3 class="quote-title"></h3>
                <p class="quote-text"></p>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            // Lukk hvis du klikker på overlay eller kryss
            if (e.target === modal || e.target.classList.contains('close-modal')) {
                modal.style.display = 'none';
            }
        });
    }

    /**
     * Viser modal med sitat for gitt sak og parti.
     */
    function showQuoteModal(issue, partyCode) {
        const modal = document.getElementById('quoteModal');
        if (!modal) return;
        const party = partiesMap[partyCode];
        if (!party) return;
        const stance = issue.partyStances && issue.partyStances[partyCode];
        const quote = stance && stance.quote ? stance.quote : null;
        const titleEl = modal.querySelector('.quote-title');
        const textEl = modal.querySelector('.quote-text');
        titleEl.textContent = `${party.name} – ${issue.name}`;
        // Farget kant på toppen for å identifisere parti
        titleEl.style.backgroundColor = party.color || '#7d5ba6';
        titleEl.style.color = '#fff';
        titleEl.style.padding = '0.5rem';
        titleEl.style.borderRadius = '6px 6px 0 0';
        textEl.textContent = quote ? quote : 'Ingen sitat tilgjengelig.';
        modal.style.display = 'block';
    }

    /**
     * Rendrer knappene for hvert parti med logo og navn.
     */
    function renderPartyButtons() {
        if (!partySelectorDiv) return;
        partySelectorDiv.innerHTML = '';
        // Sorter partiene etter politisk posisjon (om tilgjengelig) for konsist ordning
        const sortedParties = [...window.partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));
        sortedParties.forEach(party => {
            const btn = document.createElement('button');
            btn.classList.add('party-button');
            btn.dataset.shorthand = party.shorthand;
            // Legg til valgt-klasse hvis allerede valgt
            if (selectedParties.has(party.shorthand)) {
                btn.classList.add('selected');
            }
            // Innhold: logo og tekst
            const img = document.createElement('img');
            img.src = `images/parties/${party.shorthand.toLowerCase()}.png`;
            img.alt = `${party.name} logo`;
            img.className = 'party-logo';
            const nameDiv = document.createElement('div');
            nameDiv.className = 'party-name';
            nameDiv.textContent = party.shorthand;
            btn.appendChild(img);
            btn.appendChild(nameDiv);
            // Klikk: toggle valgt status
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

    /**
     * Lyttere på radio-knappene som styrer enighetsnivå.
     */
    function attachAgreementListeners() {
        agreementRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const val = parseInt(radio.value, 10);
                if (!isNaN(val)) {
                    agreementThreshold = val;
                    updateResults();
                }
            });
        });
    }

    /**
     * Velg alle / fjern alle-knapper.
     */
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
     * Beregner og oppdaterer resultatseksjonen basert på valgte partier og threshold.
     */
    function updateResults() {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '';

        const partyCount = selectedParties.size;
        if (partyCount < 3) {
            const info = document.createElement('p');
            info.className = 'info-message';
            info.textContent = 'Velg minst tre partier for å se unike saker.';
            resultsContainer.appendChild(info);
            return;
        }

        // Vis hvilke partier som er valgt (badges)
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'selected-parties-badges';
        selectedParties.forEach(code => {
            const party = partiesMap[code];
            if (!party) return;
            const span = document.createElement('span');
            span.className = `party-tag party-tag-${party.classPrefix}`;
            span.textContent = party.shorthand;
            badgesContainer.appendChild(span);
        });
        const heading = document.createElement('h2');
        heading.textContent = 'Resultater';
        resultsContainer.appendChild(heading);
        resultsContainer.appendChild(badgesContainer);

        // For hver valgt parti: finn unike saker
        selectedParties.forEach(code => {
            const party = partiesMap[code];
            if (!party) return;

            // Finn alle saker der dette partiet har nivå >= threshold og alle andre valgte partier har nivå < threshold
            const uniqueIssuesByArea = {};
            window.issues.forEach(issue => {
                const partyStances = issue.partyStances || {};
                const thisStance = partyStances[code];
                const thisLevel = thisStance && typeof thisStance.level === 'number' ? thisStance.level : 0;
                // Må ha støtte (>= threshold)
                if (thisLevel < agreementThreshold) return;
                // Sjekk at ingen andre utvalgte partier har nivå >= threshold
                let isUnique = true;
                selectedParties.forEach(otherCode => {
                    if (otherCode === code) return;
                    const otherStance = partyStances[otherCode];
                    const otherLevel = otherStance && typeof otherStance.level === 'number' ? otherStance.level : 0;
                    if (otherLevel >= agreementThreshold) {
                        isUnique = false;
                    }
                });
                if (!isUnique) return;
                // Kategoriser etter område
                const area = issue.area || 'Ukjent område';
                if (!uniqueIssuesByArea[area]) {
                    uniqueIssuesByArea[area] = [];
                }
                uniqueIssuesByArea[area].push(issue);
            });

            // Lag et kort hvis partiet har noen unike saker
            const uniqueCount = Object.values(uniqueIssuesByArea).reduce((acc, arr) => acc + arr.length, 0);
            const card = document.createElement('div');
            card.className = 'party-unique-card';
            // Kortoverskrift
            const cardHeader = document.createElement('h3');
            cardHeader.innerHTML = `<span class="party-tag party-tag-${party.classPrefix}">${party.shorthand}</span> har ${uniqueCount} unike sak${uniqueCount === 1 ? '' : 'er'}`;
            card.appendChild(cardHeader);

            // Legg til områdeseksjoner
            Object.keys(uniqueIssuesByArea).sort().forEach(areaName => {
                const section = document.createElement('div');
                section.className = 'area-section';
                const areaHeader = document.createElement('h4');
                areaHeader.textContent = areaName;
                section.appendChild(areaHeader);
                const list = document.createElement('ul');
                uniqueIssuesByArea[areaName].forEach(issue => {
                    const li = document.createElement('li');
                    li.className = 'issue-item';
                    const issueNameSpan = document.createElement('span');
                    issueNameSpan.className = 'issue-name';
                    issueNameSpan.textContent = issue.name;
                    li.appendChild(issueNameSpan);
                    // Logo for partiet
                    const logoImg = document.createElement('img');
                    logoImg.src = `images/parties/${party.shorthand.toLowerCase()}.png`;
                    logoImg.alt = party.shorthand;
                    logoImg.className = 'party-icon-small';
                    li.appendChild(logoImg);
                    // Knapp for å vise sitat
                    const quoteBtn = document.createElement('button');
                    quoteBtn.className = 'quote-btn';
                    // Tooltip som fallback dersom modalen ikke er åpen
                    const stance = issue.partyStances && issue.partyStances[party.shorthand];
                    const quoteText = stance && stance.quote ? stance.quote : '';
                    if (quoteText) {
                        // Sett HTML "title" for nettleserens innebygde verktøytips
                        quoteBtn.title = quoteText;
                    } else {
                        quoteBtn.title = 'Ingen sitat tilgjengelig';
                    }
                    // Vis anførselstegn som ikon
                    quoteBtn.innerHTML = '“';
                    // På klikk eller hover: åpne modal
                    const showFn = (e) => {
                        // Hindre at eventen bobler til listen
                        e.stopPropagation();
                        showQuoteModal(issue, party.shorthand);
                    };
                    // Ved klikk
                    quoteBtn.addEventListener('click', showFn);
                    // Ved hover: åpne modal, og lukk når musen forlater knappen
                    quoteBtn.addEventListener('mouseenter', showFn);
                    quoteBtn.addEventListener('mouseleave', () => {
                        const modal = document.getElementById('quoteModal');
                        if (modal) modal.style.display = 'none';
                    });
                    li.appendChild(quoteBtn);
                    list.appendChild(li);
                });
                section.appendChild(list);
                card.appendChild(section);
            });
            resultsContainer.appendChild(card);
        });
    }
}
