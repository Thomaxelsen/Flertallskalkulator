// js/party-profile.js (Version 2.2 - Bruker klasser fra candidates.css for grid)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Party Profile v2.2: DOM loaded. Waiting for data..."); // Oppdatert versjonsnummer

    // Globale variabler
    let issuesData = [];
    let partiesData = [];
    let candidatesData = [];
    let partiesMap = {};
    let candidatesMapByParty = {};
    let constituencyMandates = {};
    let allConstituencyNames = [];

    // Flagg for datastatus
    let issuesReady = false;
    let partiesReady = false;
    let candidatesReady = false;

    // Referanser til DOM-elementer
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
    const candidateGridArea = document.querySelector('.profile-candidate-grid-area'); // For å bytte klasse
    const candidateOverlay = document.getElementById('profile-candidate-detail-overlay');
    const candidateOverlayContent = document.getElementById('profile-candidate-detail-content');
    const closeOverlayButton = document.getElementById('close-candidate-overlay');

    // --- Datainnlasting og Initialisering ---

    function loadAllData() {
        console.log("Party Profile v2.2: Loading all data...");
        const issuesPromise = fetch('data/issues.json').then(r => r.ok ? r.json() : Promise.reject('Issues fetch failed'));
        const partiesPromise = fetch('data/parties.json').then(r => r.ok ? r.json() : Promise.reject('Parties fetch failed'));
        const candidatesPromise = fetch('data/candidates.json').then(r => r.ok ? r.json() : Promise.reject('Candidates fetch failed'));
        const mandatesPromise = fetch('data/constituency_mandates.json')
            .then(r => r.ok ? r.json() : {})
             .catch(() => ({}));

        Promise.all([issuesPromise, partiesPromise, candidatesPromise, mandatesPromise])
            .then(([issues, parties, candidates, mandates]) => {
                console.log("Party Profile v2.2: All data fetched.");
                issuesData = issues;
                partiesData = parties;
                candidatesData = candidates;
                constituencyMandates = mandates;

                issuesReady = true;
                partiesReady = true;
                candidatesReady = true;

                processInitialData();
                initializeProfilePage();
            })
            .catch(error => {
                console.error("Party Profile v2.2: Failed to load required data:", error);
                if (profileContentGrid) {
                    profileContentGrid.innerHTML = '<div class="profile-placeholder error full-grid-placeholder"><p>Kunne ikke laste all nødvendig data. Prøv å laste siden på nytt.</p></div>';
                }
            });
    }

    function processInitialData() {
        partiesData.forEach(p => partiesMap[p.shorthand] = p);
        candidatesMapByParty = {};
        let uniqueConstituencyNames = new Set();
        candidatesData.forEach(constituency => {
            uniqueConstituencyNames.add(constituency.constituencyName);
            constituency.parties.forEach(party => {
                if (!candidatesMapByParty[party.partyShorthand]) {
                    candidatesMapByParty[party.partyShorthand] = [];
                }
                party.candidates.forEach(candidate => {
                    candidatesMapByParty[party.partyShorthand].push({
                        ...candidate,
                        constituencyName: constituency.constituencyName,
                        partyShorthand: party.partyShorthand,
                        partyName: party.partyName || partiesMap[party.partyShorthand]?.name || party.partyShorthand
                    });
                });
            });
        });
        allConstituencyNames = [...uniqueConstituencyNames].sort();
        console.log("Party Profile v2.2: Initial data processed.");
    }

    function initializeProfilePage() {
        if (!partySelect || !profileContentGrid || !placeholderDiv) {
             console.error("Party Profile v2.2: Essential elements missing, cannot initialize."); return;
         }
        placeholderDiv.style.display = 'flex';
        profileContentGrid.classList.remove('active');

        partySelect.removeEventListener('change', handlePartySelection);
        partySelect.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
        const sortedParties = [...partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));
        sortedParties.forEach(party => {
             if (candidatesMapByParty[party.shorthand] && candidatesMapByParty[party.shorthand].length > 0) {
                const option = document.createElement('option'); option.value = party.shorthand; option.textContent = party.name; partySelect.appendChild(option);
             } else { console.warn(`Party Profile v2.2: Skipping party ${party.shorthand} in dropdown - no candidate data found.`); }
        });
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
         const selectedShorthand = this.value;
         if (!selectedShorthand) { placeholderDiv.style.display = 'flex'; profileContentGrid.classList.remove('active'); clearBoxContent(issuesBoxContent); clearBoxContent(candidatesBoxContent, true); clearBoxContent(stanceChartBoxContent); clearBoxContent(areaChartBoxContent); return; }
         placeholderDiv.style.display = 'none'; profileContentGrid.classList.add('active');
         showLoader(issuesBoxContent); showLoader(candidateGrid);
         showLoader(stanceChartBoxContent); showLoader(areaChartBoxContent);
         console.log(`Party Profile v2.2: Party selected: ${selectedShorthand}. Rendering profile...`);

         setTimeout(() => {
             try {
                 const partyInfo = partiesMap[selectedShorthand]; if (!partyInfo) throw new Error(`Party info not found for ${selectedShorthand}`);
                 const partyIssueData = processPartyIssueData(selectedShorthand);
                 renderIssuesBox(partyIssueData.issuesByLevel, partyIssueData.stanceCounts);
                 renderStanceChartBox(partyIssueData.stanceCounts, partyInfo);
                 renderAreaChartBox(partyIssueData.sortedAreas, partyInfo);
                 initializeCandidatesBox(selectedShorthand);
             } catch(error) { console.error("Error displaying party profile:", error); showError(issuesBoxContent, error.message); showError(candidatesBoxContent, error.message); showError(stanceChartBoxContent, error.message); showError(areaChartBoxContent, error.message); }
         }, 50);
    }

    // --- RENDER-FUNKSJONER ---
    function renderIssuesBox(issuesByLevel, stanceCounts) {
        clearBoxContent(issuesBoxContent);
        if (!issuesBoxContent) return;
        const issuesDiv = document.createElement('div');
        issuesDiv.className = 'profile-issues-section';
        issuesDiv.innerHTML = `
            <h3>Detaljert Saksoversikt</h3>
            <div class="issues-tabs">
                 <button class="tab-button active" data-tab="level2">Full enighet (${stanceCounts.level2})</button>
                 <button class="tab-button" data-tab="level1">Delvis enighet (${stanceCounts.level1})</button>
                 <button class="tab-button" data-tab="level0">Ingen støtte (${stanceCounts.level0})</button>
            </div>
             <div class="tab-content active" id="tab-content-level2">
                ${generateIssueListHTML(issuesByLevel.level2, 'agree')}
            </div>
            <div class="tab-content" id="tab-content-level1">
                 ${generateIssueListHTML(issuesByLevel.level1, 'partial')}
             </div>
             <div class="tab-content" id="tab-content-level0">
                 ${generateIssueListHTML(issuesByLevel.level0, 'disagree')}
            </div>
        `;
        issuesBoxContent.appendChild(issuesDiv);
        setupProfileTabs(issuesDiv);
    }
    function renderStanceChartBox(stanceCounts, partyInfo) {
         clearBoxContent(stanceChartBoxContent); if (!stanceChartBoxContent) return;
         const chartContainer = document.createElement('div'); chartContainer.className = 'chart-container';
         chartContainer.innerHTML = `<h3>Fordeling av Standpunkt</h3><div id="plotly-stance-chart"></div>`;
         stanceChartBoxContent.appendChild(chartContainer); createStanceChart(stanceCounts, partyInfo);
    }
    function renderAreaChartBox(sortedAreasData, partyInfo) {
         clearBoxContent(areaChartBoxContent); if (!areaChartBoxContent) return;
         const chartContainer = document.createElement('div'); chartContainer.className = 'chart-container';
         chartContainer.innerHTML = `<h3>Gj.snitt Støtte per Saksområde</h3><div id="plotly-area-chart"></div>`;
         areaChartBoxContent.appendChild(chartContainer); createAreaChart(sortedAreasData, partyInfo);
    }
    function initializeCandidatesBox(partyShorthand) {
         clearBoxContent(candidatesBoxContent, true); if (!candidatesBoxContent || !candidateGrid) return;
         populateCandidateConstituencyFilter(partyShorthand); handleCandidateFiltering(partyShorthand);
    }

    // --- Funksjoner for Kandidathåndtering ---
    function populateCandidateConstituencyFilter(partyShorthand) {
         if (!candidateConstituencyFilter) return;
         candidateConstituencyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove()); candidateConstituencyFilter.value = 'all';
         const partyCandidates = candidatesMapByParty[partyShorthand] || [];
         const relevantConstituencies = [...new Set(partyCandidates.map(c => c.constituencyName))].sort();
         relevantConstituencies.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; candidateConstituencyFilter.appendChild(option); });
         console.log(`Party Profile v2.2: Populated constituency filter for ${partyShorthand}`);
    }

    function handleCandidateFiltering(partyShorthand) {
        if (!candidateGrid || !candidateCountSpan || !candidateViewModeSelect || !candidateConstituencyFilter || !candidateGridArea) { console.error("Party Profile v2.2: Missing elements for candidate filtering."); return; }
        if (!partyShorthand || !candidatesMapByParty[partyShorthand]) { candidateGrid.innerHTML = '<p class="no-results">Velg et parti først.</p>'; candidateCountSpan.textContent = '0'; return; }

        showLoader(candidateGrid);

        const selectedViewMode = candidateViewModeSelect.value;
        const selectedConstituency = candidateConstituencyFilter.value;
        const partyInfo = partiesMap[partyShorthand];
        const allPartyCandidates = candidatesMapByParty[partyShorthand];

        let filteredCandidates = allPartyCandidates;
        if (selectedConstituency !== 'all') { filteredCandidates = filteredCandidates.filter(c => c.constituencyName === selectedConstituency); }

        // === HER ER ENDRINGEN ===
        if (selectedViewMode === 'featured') {
            filteredCandidates = filteredCandidates.filter(c => c.isFeatured);
            // Bruk klassene fra candidates.css:
            candidateGridArea.classList.remove('candidate-grid'); // Fjern normal grid klasse
            candidateGridArea.classList.add('featured-candidates-grid'); // Legg til featured grid klasse
        } else {
            // Bruk klassene fra candidates.css:
            candidateGridArea.classList.remove('featured-candidates-grid'); // Fjern featured grid klasse
            candidateGridArea.classList.add('candidate-grid'); // Legg til normal grid klasse
        }
        // === SLUTT PÅ ENDRING ===

        filteredCandidates.sort((a, b) => { if (a.constituencyName !== b.constituencyName) { return a.constituencyName.localeCompare(b.constituencyName); } return (a.rank || 999) - (b.rank || 999); });
        console.log(`Party Profile v2.2: Filtering candidates for ${partyShorthand}. Mode: ${selectedViewMode}, Constituency: ${selectedConstituency}. Found ${filteredCandidates.length}`);

        displayPartyCandidatesList(filteredCandidates, partyInfo, selectedViewMode);
        candidateCountSpan.textContent = filteredCandidates.length;
    }

    function displayPartyCandidatesList(candidates, partyInfo, viewMode) {
         if (!candidateGrid) return;
         candidateGrid.innerHTML = '';

         if (candidates.length === 0) { candidateGrid.innerHTML = '<p class="no-results">Ingen kandidater funnet.</p>'; return; }

         let currentConstituency = null;
         candidates.forEach(candidate => {
             if (candidate.constituencyName !== currentConstituency) {
                 const separator = createConstituencySeparator(candidate.constituencyName);
                 candidateGrid.appendChild(separator);
                 currentConstituency = candidate.constituencyName;
             }
             let card;
             if (viewMode === 'featured') {
                 card = createProfileFeaturedImageCard(candidate, partyInfo); // Bruker nå styles fra candidates.css
             } else {
                 card = createCandidateCard(candidate, partyInfo);
             }
             candidateGrid.appendChild(card);
         });
     }

     function createConstituencySeparator(constituencyName) {
         const separator = document.createElement('div');
         separator.className = 'constituency-separator';
         const count = constituencyMandates[constituencyName];
         const text = typeof count === 'number' ? `(${count} mandater)` : '(?)';
         separator.innerHTML = `<span class="name">${constituencyName || '?'}</span> <span class="count">${text}</span>`;
         return separator;
     }

     // Denne funksjonen lager HTML for featured-kortet.
     // Stylingen (utseendet) kommer nå fra candidates.css via klassen 'featured-candidate-card'
     function createProfileFeaturedImageCard(candidate, partyInfo) {
        const card = document.createElement('div');
        const partyClass = `party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`;
        // VIKTIG: Bruker klassen fra candidates.css
        card.className = `featured-candidate-card ${partyClass}`;
        card.dataset.candidateInfo = JSON.stringify(candidate);
        card.dataset.partyInfo = JSON.stringify(partyInfo);
        // Setter CSS-variabel som brukes av candidates.css for border-color
        card.style.setProperty('--card-party-color', partyInfo.color || '#ccc');

        card.innerHTML = `
            ${candidate.imageUrl
                ? `<img src="${candidate.imageUrl}" alt="${candidate.name || ''}" loading="lazy">`
                : '<div class="image-placeholder">Bilde mangler</div>'}
        `;
        card.title = `${candidate.name || '?'} (${partyInfo.name || '?'}) - Klikk for detaljer`;

        // Ingen egen listener her, bruker den på parent 'candidateGrid'
        return card;
     }

     function createCandidateCard(candidate, partyInfo) {
         const card = document.createElement('div'); const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();
         card.className = `candidate-card party-${partyClassPrefix}`; if (candidate.hasRealisticChance) card.classList.add('realistic-chance'); card.style.setProperty('--party-color', partyInfo.color || '#ccc');
         card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo);
         card.innerHTML = `
            <div class="card-header"><span class="candidate-rank">${candidate.rank || '?'}</span><div class="candidate-header-info"><span class="candidate-name">${candidate.name || 'Ukjent navn'}</span><span class="party-name-header">${partyInfo.name || candidate.partyShorthand || 'Ukjent parti'}</span></div><div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'}" title="${partyInfo.name || '?'}">${candidate.partyShorthand?.charAt(0) || '?'}</div></div>
            <div class="card-body"><div class="candidate-meta">${candidate.age ? `<span>Alder: ${candidate.age}</span>` : ''}${candidate.location ? `<span class="candidate-location"> | Fra: ${candidate.location}</span>` : ''}</div></div>
            ${candidate.hasRealisticChance ? `<div class="card-footer"><span class="realistic-badge">Realistisk sjanse</span></div>` : '<div class="card-footer"></div>'} `;
         card.title = `${candidate.name || '?'} (${partyInfo.name || '?'}) - Klikk for detaljer`; return card;
     }

    // --- Funksjoner for Kandidat Detalj Overlay ---
    function handleCandidateCardClick(event) {
        const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
        if (card && card.dataset.candidateInfo && card.dataset.partyInfo) {
             console.log("Party Profile v2.2: Candidate card clicked.");
             try {
                 const candidate = JSON.parse(card.dataset.candidateInfo); const partyInfo = JSON.parse(card.dataset.partyInfo); displayCandidateDetailOverlay(candidate, partyInfo);
             } catch (e) { console.error("Party Profile v2.2: Error parsing candidate data from card:", e); if(candidateOverlayContent) candidateOverlayContent.innerHTML = "<p>Kunne ikke laste kandidatdata.</p>"; if(candidateOverlay) candidateOverlay.classList.add('active'); }
        }
    }
    function displayCandidateDetailOverlay(candidate, partyInfo) {
         if (!candidateOverlay || !candidateOverlayContent) return;
         const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();
         const imageHtml = candidate.imageUrl ? `<img src="${candidate.imageUrl}" alt="${candidate.name || 'Kandidatbilde'}" class="detail-image">` : `<img src="images/candidates/placeholder-${partyInfo.shorthand.toLowerCase()}.png" alt="Placeholder for ${partyInfo.name || 'partiet'}" class="detail-image placeholder-image" onerror="this.onerror=null; this.src='images/placeholder-generic.png';">`;
         candidateOverlayContent.innerHTML = `
             <div class="detail-image-container">${imageHtml}</div> <div class="detail-header"><div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'};">${partyInfo.shorthand?.charAt(0) || '?'}</div><h3>${candidate.name || '?'}</h3></div>
             <div class="detail-info"><p><strong>Rangering:</strong> ${candidate.rank || '?'}. plass</p><p><strong>Parti:</strong> ${partyInfo.name || '?'}</p><p><strong>Valgkrets:</strong> ${candidate.constituencyName || '?'}</p>${candidate.age ? `<p><strong>Alder:</strong> ${candidate.age}</p>` : ''}${candidate.location ? `<p><strong>Fra:</strong> ${candidate.location}</p>` : ''}<p><strong>Realistisk sjanse:</strong> ${typeof candidate.hasRealisticChance !== 'undefined' ? (candidate.hasRealisticChance ? 'Ja' : 'Nei') : '?'}</p>${candidate.email ? `<p><strong>E-post:</strong> <a href="mailto:${candidate.email}">${candidate.email}</a></p>` : ''}${candidate.phone ? `<p><strong>Telefon:</strong> <a href="tel:${candidate.phone}">${candidate.phone}</a></p>` : ''}</div>
             <p class="privacy-notice-panel">Husk personvern ved bruk av kontaktinformasjon.</p> `;
         candidateOverlay.classList.add('active'); candidateOverlay.scrollTop = 0;
    }
    function closeCandidateDetailOverlay() {
        if (candidateOverlay) { candidateOverlay.classList.remove('active'); setTimeout(() => { if(candidateOverlayContent) candidateOverlayContent.innerHTML = ''; }, 400); }
    }

    // --- Funksjoner for Issues og Charts ---
    function processPartyIssueData(partyShorthand) {
        const partyProfile = { stanceCounts: { level2: 0, level1: 0, level0: 0, total: 0 }, issuesByLevel: { level2: [], level1: [], level0: [] }, scoresByArea: {} }; const areasTemp = {};
        issuesData.forEach(issue => { partyProfile.stanceCounts.total++; let level = 0; let quote = null; if (issue.partyStances && issue.partyStances[partyShorthand]) { const stance = issue.partyStances[partyShorthand]; level = stance.level ?? 0; quote = stance.quote; } if (level === 2) partyProfile.stanceCounts.level2++; else if (level === 1) partyProfile.stanceCounts.level1++; else partyProfile.stanceCounts.level0++; const issueDetails = { id: issue.id, name: issue.name, area: issue.area, quote: quote }; if (level === 2) partyProfile.issuesByLevel.level2.push(issueDetails); else if (level === 1) partyProfile.issuesByLevel.level1.push(issueDetails); else partyProfile.issuesByLevel.level0.push(issueDetails); if (issue.area) { if (!areasTemp[issue.area]) areasTemp[issue.area] = { totalPoints: 0, count: 0 }; areasTemp[issue.area].totalPoints += level; areasTemp[issue.area].count++; } });
        for (const areaName in areasTemp) { const areaData = areasTemp[areaName]; partyProfile.scoresByArea[areaName] = { totalPoints: areaData.totalPoints, count: areaData.count, averageScore: areaData.count > 0 ? (areaData.totalPoints / areaData.count) : 0 }; } const sortedAreaEntries = Object.entries(partyProfile.scoresByArea).sort((a, b) => a[0].localeCompare(b[0])); partyProfile.sortedAreas = sortedAreaEntries.map(([areaName, data]) => ({ name: areaName, score: data.averageScore })); return partyProfile;
    }
    function createStanceChart(stanceCounts, partyInfo) {
         const plotDivId = 'plotly-stance-chart'; const plotDiv = document.getElementById(plotDivId); if (!plotDiv) { console.error(`Element with ID ${plotDivId} not found`); return; } plotDiv.innerHTML = ''; const data = [{ values: [stanceCounts.level2, stanceCounts.level1, stanceCounts.level0], labels: ['Full Enighet (2)', 'Delvis Enighet (1)', 'Ingen Støtte (0)'], type: 'pie', hole: .4, marker: { colors: ['#28a745', '#ffc107', '#dc3545'], line: { color: '#ffffff', width: 1 } }, hoverinfo: 'label+percent', textinfo: 'value', textfont_size: 14, insidetextorientation: 'radial' }]; const layout = { showlegend: true, legend: { x: 0.5, y: -0.1, xanchor: 'center', orientation: 'h' }, height: 300, margin: { l: 20, r: 20, t: 0, b: 40 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }; try { Plotly.newPlot(plotDivId, data, layout, {responsive: true}); } catch (e) { console.error("Plotly error Stance Chart:", e); plotDiv.innerHTML = '<p class="error">Feil ved lasting.</p>'; }
    }
    function createAreaChart(sortedAreasData, partyInfo) {
        const plotDivId = 'plotly-area-chart'; const plotDiv = document.getElementById(plotDivId); if (!plotDiv) { console.error(`Element with ID ${plotDivId} not found`); return; } plotDiv.innerHTML = ''; const labels = sortedAreasData.map(area => area.name); const values = sortedAreasData.map(area => area.score); const data = [{ type: 'scatterpolar', r: values, theta: labels, fill: 'toself', name: partyInfo.name, marker: { color: partyInfo.color || '#003087' }, line: { color: partyInfo.color || '#003087' } }]; const layout = { polar: { radialaxis: { visible: true, range: [0, 2], tickvals: [0, 1, 2], angle: 90, tickfont: { size: 10 } }, angularaxis: { tickfont: { size: 10 } }, bgcolor: 'rgba(255, 255, 255, 0.6)' }, showlegend: false, height: 300, margin: { l: 40, r: 40, t: 20, b: 40 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }; try { Plotly.newPlot(plotDivId, data, layout, {responsive: true}); } catch (e) { console.error("Plotly error Area Chart:", e); plotDiv.innerHTML = '<p class="error">Feil ved lasting.</p>'; }
    }
    function generateIssueListHTML(issues, agreementTypeClass) {
        if (!issues || issues.length === 0) { return '<p class="no-issues">Ingen saker i denne kategorien.</p>'; } return `<ul class="issue-list"> ${issues.map(issue => ` <li class="issue-item ${agreementTypeClass}-item"> <strong>${issue.name}</strong> <div class="issue-area">${issue.area || 'Ukjent område'}</div> ${issue.quote ? `<div class="issue-quote">"${issue.quote}"</div>` : ''} </li> `).join('')} </ul>`;
    }

    function setupProfileTabs(issuesSectionElement) {
         const tabButtons = issuesSectionElement?.querySelectorAll('.tab-button');
         const tabContents = issuesSectionElement?.querySelectorAll('.tab-content');
         if (!tabButtons || !tabContents || tabButtons.length === 0 || tabContents.length === 0) {
             console.warn("Party Profile v2.2: Could not find tab buttons or content to set up listeners.");
             return;
         }
          console.log(`Party Profile v2.2: Setting up ${tabButtons.length} tab buttons.`);
         tabButtons.forEach(button => {
             button.replaceWith(button.cloneNode(true));
         });
          const newTabButtons = issuesSectionElement.querySelectorAll('.tab-button');
         newTabButtons.forEach(button => {
             button.addEventListener('click', function() {
                 const tabIdToShow = `tab-content-${this.dataset.tab}`;
                 newTabButtons.forEach(btn => btn.classList.remove('active'));
                 tabContents.forEach(content => content.classList.remove('active'));
                 this.classList.add('active');
                 const contentToShow = issuesSectionElement.querySelector(`#${tabIdToShow}`);
                 if (contentToShow) {
                     contentToShow.classList.add('active');
                 } else { console.warn(`Could not find tab content with ID: ${tabIdToShow}`); }
             });
         });
         console.log("Party Profile v2.2: Tab listeners set up.");
    }

    // Hjelpefunksjoner
     function showLoader(element) { if (element) { element.innerHTML = '<div class="loader">Laster...</div>'; } }
     function showError(element, message) { if (element) { element.innerHTML = `<div class="loader error"><p>Feil: ${message}</p></div>`; } }
     function clearBoxContent(element, keepFilters = false) { if (!element) return; if (keepFilters && element.querySelector('.profile-candidate-filters')) { const grid = element.querySelector('#profile-candidate-grid'); if(grid) grid.innerHTML = ''; const count = element.querySelector('#profile-candidate-count'); if(count) count.textContent = '0'; } else { element.innerHTML = ''; } }

}); // Slutt på DOMContentLoaded
