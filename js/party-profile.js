// js/party-profile.js (Version 2.2 - Minimal JS change for class toggle)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Party Profile v2.2: DOM loaded. Waiting for data...");

    // Globale variabler (som før)
    let issuesData = [];
    let partiesData = [];
    let candidatesData = [];
    let partiesMap = {};
    let candidatesMapByParty = {};
    let constituencyMandates = {};
    let allConstituencyNames = [];
    let issuesReady = false;
    let partiesReady = false;
    let candidatesReady = false;

    // Referanser til DOM-elementer (som før)
    const profileContentGrid = document.getElementById('profile-content');
    const partySelect = document.getElementById('party-select');
    const placeholderDiv = document.querySelector('.profile-placeholder');
    const issuesBoxContent = document.getElementById('profile-issues-content');
    const candidatesBox = document.querySelector('.box-candidates');
    const candidatesBoxContent = candidatesBox?.querySelector('.profile-inner-content');
    const stanceChartBoxContent = document.getElementById('profile-stance-chart-content');
    const areaChartBoxContent = document.getElementById('profile-area-chart-content');
    const candidateViewModeSelect = document.getElementById('candidate-view-mode-select');
    const candidateConstituencyFilter = document.getElementById('candidate-constituency-filter');
    const candidateCountSpan = document.getElementById('profile-candidate-count');
    const candidateGrid = document.getElementById('profile-candidate-grid');
    const candidateGridArea = document.querySelector('.profile-candidate-grid-area'); // Viktig referanse
    const candidateOverlay = document.getElementById('profile-candidate-detail-overlay');
    const candidateOverlayContent = document.getElementById('profile-candidate-detail-content');
    const closeOverlayButton = document.getElementById('close-candidate-overlay');

    // --- Datainnlasting og Initialisering ---
    function loadAllData() {
        // (Som i V2.1 - laster issues, parties, candidates, mandates)
        console.log("Party Profile v2.2: Loading all data...");
        const issuesPromise = fetch('data/issues.json').then(r => r.ok ? r.json() : Promise.reject('Issues fetch failed'));
        const partiesPromise = fetch('data/parties.json').then(r => r.ok ? r.json() : Promise.reject('Parties fetch failed'));
        const candidatesPromise = fetch('data/candidates.json').then(r => r.ok ? r.json() : Promise.reject('Candidates fetch failed'));
        const mandatesPromise = fetch('data/constituency_mandates.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));

        Promise.all([issuesPromise, partiesPromise, candidatesPromise, mandatesPromise])
            .then(([issues, parties, candidates, mandates]) => {
                console.log("Party Profile v2.2: All data fetched.");
                issuesData = issues; partiesData = parties; candidatesData = candidates; constituencyMandates = mandates;
                issuesReady = true; partiesReady = true; candidatesReady = true;
                processInitialData();
                initializeProfilePage();
            })
            .catch(error => {
                console.error("Party Profile v2.2: Failed to load required data:", error);
                if (profileContentGrid) { profileContentGrid.innerHTML = '<div class="profile-placeholder error full-grid-placeholder"><p>Kunne ikke laste data.</p></div>'; }
            });
    }

    function processInitialData() {
        // (Som i V2.1 - lager maps og lister)
        partiesData.forEach(p => partiesMap[p.shorthand] = p);
        candidatesMapByParty = {}; let uniqueConstituencyNames = new Set();
        candidatesData.forEach(constituency => {
            uniqueConstituencyNames.add(constituency.constituencyName);
            constituency.parties.forEach(party => {
                if (!candidatesMapByParty[party.partyShorthand]) { candidatesMapByParty[party.partyShorthand] = []; }
                party.candidates.forEach(candidate => {
                    candidatesMapByParty[party.partyShorthand].push({ ...candidate, constituencyName: constituency.constituencyName, partyShorthand: party.partyShorthand, partyName: party.partyName || partiesMap[party.partyShorthand]?.name || party.partyShorthand });
                });
            });
        });
        allConstituencyNames = [...uniqueConstituencyNames].sort();
        console.log("Party Profile v2.2: Initial data processed.");
    }

    function initializeProfilePage() {
        // (Som i V2.1 - setter opp select og listeners)
         if (!partySelect || !profileContentGrid || !placeholderDiv) { console.error("Party Profile v2.2: Essential elements missing."); return; }
         placeholderDiv.style.display = 'flex'; profileContentGrid.classList.remove('active');
         partySelect.removeEventListener('change', handlePartySelection);
         partySelect.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
         const sortedParties = [...partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));
         sortedParties.forEach(party => { if (candidatesMapByParty[party.shorthand] && candidatesMapByParty[party.shorthand].length > 0) { const option = document.createElement('option'); option.value = party.shorthand; option.textContent = party.name; partySelect.appendChild(option); } else { console.warn(`Skipping party ${party.shorthand}`); } });
         partySelect.addEventListener('change', handlePartySelection);
         if (candidateViewModeSelect) candidateViewModeSelect.addEventListener('change', () => handleCandidateFiltering(partySelect.value));
         if (candidateConstituencyFilter) candidateConstituencyFilter.addEventListener('change', () => handleCandidateFiltering(partySelect.value));
         if (closeOverlayButton) closeOverlayButton.addEventListener('click', closeCandidateDetailOverlay);
         if (candidateGrid) { candidateGrid.addEventListener('click', handleCandidateCardClick); }
         console.log("Party Profile v2.2: Page initialized.");
    }

    loadAllData();

    // --- Kjernefunksjoner ---
    function handlePartySelection() {
        // (Som i V2.1 - viser grid og loaders)
        const selectedShorthand = this.value;
        if (!selectedShorthand) { placeholderDiv.style.display = 'flex'; profileContentGrid.classList.remove('active'); clearBoxContent(issuesBoxContent); clearBoxContent(candidatesBoxContent, true); clearBoxContent(stanceChartBoxContent); clearBoxContent(areaChartBoxContent); return; }
        placeholderDiv.style.display = 'none'; profileContentGrid.classList.add('active');
        showLoader(issuesBoxContent); showLoader(candidateGrid); showLoader(stanceChartBoxContent); showLoader(areaChartBoxContent);
        console.log(`Party Profile v2.2: Party selected: ${selectedShorthand}. Rendering profile...`);
        setTimeout(() => {
            try {
                const partyInfo = partiesMap[selectedShorthand]; if (!partyInfo) throw new Error(`Party info not found`);
                const partyIssueData = processPartyIssueData(selectedShorthand);
                renderIssuesBox(partyIssueData.issuesByLevel, partyIssueData.stanceCounts);
                renderStanceChartBox(partyIssueData.stanceCounts, partyInfo);
                renderAreaChartBox(partyIssueData.sortedAreas, partyInfo);
                initializeCandidatesBox(selectedShorthand);
            } catch(error) { console.error("Error displaying party profile:", error); showError(issuesBoxContent, error.message); showError(candidatesBoxContent, error.message); showError(stanceChartBoxContent, error.message); showError(areaChartBoxContent, error.message); }
        }, 50);
    }

    // --- RENDER-FUNKSJONER (Som i V2.1) ---
    function renderIssuesBox(issuesByLevel, stanceCounts) {
        clearBoxContent(issuesBoxContent); if (!issuesBoxContent) return;
        const issuesDiv = document.createElement('div'); issuesDiv.className = 'profile-issues-section';
        issuesDiv.innerHTML = `<h3>Detaljert Saksoversikt</h3> <div class="issues-tabs"> <button class="tab-button active" data-tab="level2">Full enighet (${stanceCounts.level2})</button> <button class="tab-button" data-tab="level1">Delvis enighet (${stanceCounts.level1})</button> <button class="tab-button" data-tab="level0">Ingen støtte (${stanceCounts.level0})</button> </div> <div class="tab-content active" id="tab-content-level2"> ${generateIssueListHTML(issuesByLevel.level2, 'agree')} </div> <div class="tab-content" id="tab-content-level1"> ${generateIssueListHTML(issuesByLevel.level1, 'partial')} </div> <div class="tab-content" id="tab-content-level0"> ${generateIssueListHTML(issuesByLevel.level0, 'disagree')} </div> `;
        issuesBoxContent.appendChild(issuesDiv); setupProfileTabs(issuesDiv);
    }
    function renderStanceChartBox(stanceCounts, partyInfo) { /* (som før) */
         clearBoxContent(stanceChartBoxContent); if (!stanceChartBoxContent) return; const chartContainer = document.createElement('div'); chartContainer.className = 'chart-container'; chartContainer.innerHTML = `<h3>Fordeling av Standpunkt</h3><div id="plotly-stance-chart"></div>`; stanceChartBoxContent.appendChild(chartContainer); createStanceChart(stanceCounts, partyInfo);
    }
    function renderAreaChartBox(sortedAreasData, partyInfo) { /* (som før) */
         clearBoxContent(areaChartBoxContent); if (!areaChartBoxContent) return; const chartContainer = document.createElement('div'); chartContainer.className = 'chart-container'; chartContainer.innerHTML = `<h3>Gj.snitt Støtte per Saksområde</h3><div id="plotly-area-chart"></div>`; areaChartBoxContent.appendChild(chartContainer); createAreaChart(sortedAreasData, partyInfo);
    }
    function initializeCandidatesBox(partyShorthand) { /* (som før) */
         clearBoxContent(candidatesBoxContent, true); if (!candidatesBoxContent || !candidateGrid) return; populateCandidateConstituencyFilter(partyShorthand); handleCandidateFiltering(partyShorthand);
    }

    // --- Funksjoner for Kandidathåndtering ---
    function populateCandidateConstituencyFilter(partyShorthand) { /* (som før) */
        if (!candidateConstituencyFilter) return; candidateConstituencyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove()); candidateConstituencyFilter.value = 'all'; const partyCandidates = candidatesMapByParty[partyShorthand] || []; const relevantConstituencies = [...new Set(partyCandidates.map(c => c.constituencyName))].sort(); relevantConstituencies.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; candidateConstituencyFilter.appendChild(option); }); console.log(`Populated constituency filter for ${partyShorthand}`);
    }

    function handleCandidateFiltering(partyShorthand) {
        // (Oppdatert for klasse-bytte)
        if (!candidateGrid || !candidateCountSpan || !candidateViewModeSelect || !candidateConstituencyFilter || !candidateGridArea) { console.error("Missing elements for candidate filtering."); return; }
        if (!partyShorthand || !candidatesMapByParty[partyShorthand]) { candidateGrid.innerHTML = '<p class="no-results">Velg parti.</p>'; candidateCountSpan.textContent = '0'; return; }

        showLoader(candidateGrid);

        const selectedViewMode = candidateViewModeSelect.value;
        const selectedConstituency = candidateConstituencyFilter.value;
        const partyInfo = partiesMap[partyShorthand];
        const allPartyCandidates = candidatesMapByParty[partyShorthand];

        let filteredCandidates = allPartyCandidates;
        if (selectedConstituency !== 'all') { filteredCandidates = filteredCandidates.filter(c => c.constituencyName === selectedConstituency); }

        // FIX: Bytt klasse på container og filter før sortering
        if (selectedViewMode === 'featured') {
            filteredCandidates = filteredCandidates.filter(c => c.isFeatured);
            candidateGridArea.classList.add('featured-view');
            candidateGridArea.classList.remove('candidate-grid'); // Fjern normal grid klasse
        } else {
            candidateGridArea.classList.remove('featured-view');
            candidateGridArea.classList.add('candidate-grid'); // Legg til normal grid klasse
        }

        filteredCandidates.sort((a, b) => { if (a.constituencyName !== b.constituencyName) { return a.constituencyName.localeCompare(b.constituencyName); } return (a.rank || 999) - (b.rank || 999); });
        console.log(`Filtering candidates for ${partyShorthand}. Mode: ${selectedViewMode}, Constituency: ${selectedConstituency}. Found ${filteredCandidates.length}`);

        displayPartyCandidatesList(filteredCandidates, partyInfo, selectedViewMode);
        candidateCountSpan.textContent = filteredCandidates.length;
    }

    function displayPartyCandidatesList(candidates, partyInfo, viewMode) {
        // (Som i V2.1 - kaller riktig kort-funksjon)
         if (!candidateGrid) return; candidateGrid.innerHTML = '';
         if (candidates.length === 0) { candidateGrid.innerHTML = '<p class="no-results">Ingen kandidater funnet.</p>'; return; }
         let currentConstituency = null;
         candidates.forEach(candidate => {
             if (candidate.constituencyName !== currentConstituency) { const separator = createConstituencySeparator(candidate.constituencyName); candidateGrid.appendChild(separator); currentConstituency = candidate.constituencyName; }
             let card = (viewMode === 'featured') ? createProfileFeaturedImageCard(candidate, partyInfo) : createCandidateCard(candidate, partyInfo);
             candidateGrid.appendChild(card);
         });
     }

    function createConstituencySeparator(constituencyName) {
        // (Som i V2.1 - bruker global constituencyMandates)
        const separator = document.createElement('div'); separator.className = 'constituency-separator';
        const count = constituencyMandates[constituencyName]; const text = typeof count === 'number' ? `(${count} mandater)` : '(?)';
        separator.innerHTML = `<span class="name">${constituencyName || '?'}</span> <span class="count">${text}</span>`; return separator;
    }

    function createProfileFeaturedImageCard(candidate, partyInfo) {
        // (Som i V2.1 - lager bildekort)
        const card = document.createElement('div'); const partyClass = `party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`;
        card.className = `featured-candidate-card ${partyClass}`; card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo); card.style.setProperty('--card-party-color', partyInfo.color || '#ccc');
        // Legg til loading="lazy"
        card.innerHTML = ` ${candidate.imageUrl ? `<img src="${candidate.imageUrl}" alt="${candidate.name || ''}" loading="lazy">` : '<div class="image-placeholder">Bilde mangler</div>'} `;
        card.title = `${candidate.name || '?'} (${partyInfo.name || '?'}) - Klikk for detaljer`;
        card.addEventListener('click', (event) => { handleCandidateCardClick(event); }); return card;
    }

    function createCandidateCard(candidate, partyInfo) {
        // (Som i V2.1 - lager vanlig kort, la til loading="lazy")
         const card = document.createElement('div'); const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();
         card.className = `candidate-card party-${partyClassPrefix}`; if (candidate.hasRealisticChance) card.classList.add('realistic-chance'); card.style.setProperty('--party-color', partyInfo.color || '#ccc');
         card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo);
         // Minimal endring: Legg til loading="lazy" hvis det skulle komme bilder her senere
         card.innerHTML = `
            <div class="card-header"><span class="candidate-rank">${candidate.rank || '?'}</span><div class="candidate-header-info"><span class="candidate-name">${candidate.name || 'Ukjent navn'}</span><span class="party-name-header">${partyInfo.name || candidate.partyShorthand || 'Ukjent parti'}</span></div><div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'}" title="${partyInfo.name || '?'}">${candidate.partyShorthand?.charAt(0) || '?'}</div></div>
            <div class="card-body"><div class="candidate-meta">${candidate.age ? `<span>Alder: ${candidate.age}</span>` : ''}${candidate.location ? `<span class="candidate-location"> | Fra: ${candidate.location}</span>` : ''}</div></div>
            ${candidate.hasRealisticChance ? `<div class="card-footer"><span class="realistic-badge">Realistisk sjanse</span></div>` : '<div class="card-footer"></div>'} `;
         card.title = `${candidate.name || '?'} (${partyInfo.name || '?'}) - Klikk for detaljer`; return card;
     }

    // --- Funksjoner for Kandidat Detalj Overlay (Som i V2.1) ---
    function handleCandidateCardClick(event) {
        const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]'); if (card && card.dataset.candidateInfo && card.dataset.partyInfo) { console.log("Card clicked."); try { const candidate = JSON.parse(card.dataset.candidateInfo); const partyInfo = JSON.parse(card.dataset.partyInfo); displayCandidateDetailOverlay(candidate, partyInfo); } catch (e) { console.error("Error parsing data:", e); if(candidateOverlayContent) candidateOverlayContent.innerHTML = "<p>Feil.</p>"; if(candidateOverlay) candidateOverlay.classList.add('active'); } }
    }
    function displayCandidateDetailOverlay(candidate, partyInfo) {
         if (!candidateOverlay || !candidateOverlayContent) return; const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();
         // Lagt til loading="lazy"
         const imageHtml = candidate.imageUrl ? `<img src="${candidate.imageUrl}" alt="${candidate.name || 'Kandidatbilde'}" class="detail-image" loading="lazy">` : `<img src="images/candidates/placeholder-${partyInfo.shorthand.toLowerCase()}.png" alt="Placeholder for ${partyInfo.name || 'partiet'}" class="detail-image placeholder-image" loading="lazy" onerror="this.onerror=null; this.src='images/placeholder-generic.png';">`;
         candidateOverlayContent.innerHTML = ` <div class="detail-image-container">${imageHtml}</div> <div class="detail-header"><div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'};">${partyInfo.shorthand?.charAt(0) || '?'}</div><h3>${candidate.name || '?'}</h3></div> <div class="detail-info"><p><strong>Rangering:</strong> ${candidate.rank || '?'}. plass</p><p><strong>Parti:</strong> ${partyInfo.name || '?'}</p><p><strong>Valgkrets:</strong> ${candidate.constituencyName || '?'}</p>${candidate.age ? `<p><strong>Alder:</strong> ${candidate.age}</p>` : ''}${candidate.location ? `<p><strong>Fra:</strong> ${candidate.location}</p>` : ''}<p><strong>Realistisk sjanse:</strong> ${typeof candidate.hasRealisticChance !== 'undefined' ? (candidate.hasRealisticChance ? 'Ja' : 'Nei') : '?'}</p>${candidate.email ? `<p><strong>E-post:</strong> <a href="mailto:${candidate.email}">${candidate.email}</a></p>` : ''}${candidate.phone ? `<p><strong>Telefon:</strong> <a href="tel:${candidate.phone}">${candidate.phone}</a></p>` : ''}</div> <p class="privacy-notice-panel">Husk personvern.</p> `;
         candidateOverlay.classList.add('active'); candidateOverlay.scrollTop = 0;
    }
    function closeCandidateDetailOverlay() { if (candidateOverlay) { candidateOverlay.classList.remove('active'); setTimeout(() => { if(candidateOverlayContent) candidateOverlayContent.innerHTML = ''; }, 400); } }

    // --- Funksjoner for Issues og Charts (Uendret fra V2.1) ---
    function processPartyIssueData(partyShorthand) { /* (som før) */ }
    function createStanceChart(stanceCounts, partyInfo) { /* (som før) */ }
    function createAreaChart(sortedAreasData, partyInfo) { /* (som før) */ }
    function generateIssueListHTML(issues, agreementTypeClass) { /* (som før) */ }
    function setupProfileTabs(issuesSectionElement) {
        // (Som i V2.1 - robustert fjerning/legging til av listeners)
        const tabButtons = issuesSectionElement?.querySelectorAll('.tab-button'); const tabContents = issuesSectionElement?.querySelectorAll('.tab-content'); if (!tabButtons || !tabContents || tabButtons.length === 0 || tabContents.length === 0) { console.warn("Could not find tabs."); return; }
        const clonedButtons = []; // Lag en liste for å holde klonede knapper midlertidig
        tabButtons.forEach(button => { const clone = button.cloneNode(true); button.parentNode.replaceChild(clone, button); clonedButtons.push(clone); }); // Erstatt med klone
        console.log(`Setting up ${clonedButtons.length} tab buttons.`);
        clonedButtons.forEach(button => { button.addEventListener('click', function() { const tabIdToShow = `tab-content-${this.dataset.tab}`; clonedButtons.forEach(btn => btn.classList.remove('active')); tabContents.forEach(content => content.classList.remove('active')); this.classList.add('active'); const contentToShow = issuesSectionElement.querySelector(`#${tabIdToShow}`); if (contentToShow) { contentToShow.classList.add('active'); } else { console.warn(`No content for ${tabIdToShow}`); } }); }); console.log("Tab listeners set up.");
     }

    // Hjelpefunksjoner for loader/error/clear (Uendret fra V2.1)
    function showLoader(element) { /* ... */ }
    function showError(element, message) { /* ... */ }
    function clearBoxContent(element, keepFilters = false) { /* ... */ }

}); // Slutt på DOMContentLoaded
