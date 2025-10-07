// js/party-profile.js (Version 2.3 - viser aktive representanter i partiprofilen)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Party Profile v2.3: DOM loaded. Waiting for data...");

    // Globale variabler
    let issuesData = [];
    let partiesData = [];
    let representativesData = [];
    let partiesMap = {};
    let representativesMapByParty = {};
    const NO_COMMITTEE_VALUE = '__none__';

    // Referanser til DOM-elementer
    const profileContentGrid = document.getElementById('profile-content');
    const partySelect = document.getElementById('party-select');
    const placeholderDiv = document.querySelector('.profile-placeholder');
    const issuesBoxContent = document.getElementById('profile-issues-content');
    const candidatesBox = document.querySelector('.box-candidates');
    const candidatesBoxContent = candidatesBox?.querySelector('.profile-inner-content');
    const stanceChartBoxContent = document.getElementById('profile-stance-chart-content');
    const areaChartBoxContent = document.getElementById('profile-area-chart-content');
    const candidateConstituencyFilter = document.getElementById('candidate-constituency-filter');
    const candidateCommitteeFilter = document.getElementById('candidate-committee-filter');
    const candidateCountSpan = document.getElementById('profile-candidate-count');
    const candidateGrid = document.getElementById('profile-candidate-grid');
    const candidateGridArea = document.querySelector('.profile-candidate-grid-area'); // For å bytte klasse
    const candidateOverlay = document.getElementById('profile-candidate-detail-overlay');
    const candidateOverlayContent = document.getElementById('profile-candidate-detail-content');
    const closeOverlayButton = document.getElementById('close-candidate-overlay');

    // --- Datainnlasting og Initialisering ---

    function loadAllData() {
        console.log("Party Profile v2.3: Loading all data...");
        const issuesPromise = fetch('data/issues.json').then(r => r.ok ? r.json() : Promise.reject('Issues fetch failed'));
        const partiesPromise = fetch('data/parties.json').then(r => r.ok ? r.json() : Promise.reject('Parties fetch failed'));
        const representativesPromise = fetch('data/representatives.json').then(r => r.ok ? r.json() : Promise.reject('Representatives fetch failed'));

        Promise.all([issuesPromise, partiesPromise, representativesPromise])
            .then(([issues, parties, representatives]) => {
                console.log("Party Profile v2.3: All data fetched.");
                issuesData = issues;
                partiesData = parties;
                representativesData = representatives.filter(rep => rep.isActive === true);

                processInitialData();
                initializeProfilePage();
            })
            .catch(error => {
                console.error("Party Profile v2.3: Failed to load required data:", error);
                if (profileContentGrid) {
                    profileContentGrid.innerHTML = '<div class="profile-placeholder error full-grid-placeholder"><p>Kunne ikke laste all nødvendig data. Prøv å laste siden på nytt.</p></div>';
                }
            });
    }

    function processInitialData() {
        partiesData.forEach(p => partiesMap[p.shorthand] = p);
        representativesMapByParty = {};
        representativesData.forEach(rep => {
            if (!representativesMapByParty[rep.partyShorthand]) {
                representativesMapByParty[rep.partyShorthand] = [];
            }
            representativesMapByParty[rep.partyShorthand].push(rep);
        });
        console.log("Party Profile v2.3: Initial data processed.");
    }

    function initializeProfilePage() {
        if (!partySelect || !profileContentGrid || !placeholderDiv) {
             console.error("Party Profile v2.3: Essential elements missing, cannot initialize."); return;
         }
        placeholderDiv.style.display = 'flex';
        profileContentGrid.classList.remove('active');

        partySelect.removeEventListener('change', handlePartySelection);
        partySelect.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
        const sortedParties = [...partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));
        sortedParties.forEach(party => {
             if (representativesMapByParty[party.shorthand] && representativesMapByParty[party.shorthand].length > 0) {
                const option = document.createElement('option'); option.value = party.shorthand; option.textContent = party.name; partySelect.appendChild(option);
             } else { console.warn(`Party Profile v2.3: Skipping party ${party.shorthand} in dropdown - no representative data found.`); }
        });
        partySelect.addEventListener('change', handlePartySelection);

        if (candidateConstituencyFilter) candidateConstituencyFilter.addEventListener('change', () => handleRepresentativeFiltering(partySelect.value));
        if (candidateCommitteeFilter) candidateCommitteeFilter.addEventListener('change', () => handleRepresentativeFiltering(partySelect.value));
        if (closeOverlayButton) closeOverlayButton.addEventListener('click', closeRepresentativeDetailOverlay);
        if (candidateGrid) { candidateGrid.addEventListener('click', handleRepresentativeCardClick); }

        console.log("Party Profile v2.3: Page initialized.");
    }

    loadAllData();

    // --- Kjernefunksjoner ---
    function handlePartySelection() {
         const selectedShorthand = this.value;
         if (!selectedShorthand) { placeholderDiv.style.display = 'flex'; profileContentGrid.classList.remove('active'); clearBoxContent(issuesBoxContent); clearBoxContent(candidatesBoxContent, true); clearBoxContent(stanceChartBoxContent); clearBoxContent(areaChartBoxContent); return; }
         placeholderDiv.style.display = 'none'; profileContentGrid.classList.add('active');
         showLoader(issuesBoxContent); showLoader(candidateGrid);
         showLoader(stanceChartBoxContent); showLoader(areaChartBoxContent);
         console.log(`Party Profile v2.3: Party selected: ${selectedShorthand}. Rendering profile...`);

         setTimeout(() => {
             try {
                 const partyInfo = partiesMap[selectedShorthand]; if (!partyInfo) throw new Error(`Party info not found for ${selectedShorthand}`);
                 const partyIssueData = processPartyIssueData(selectedShorthand);
                 renderIssuesBox(partyIssueData.issuesByLevel, partyIssueData.stanceCounts);
                 renderStanceChartBox(partyIssueData.stanceCounts, partyInfo);
                 renderAreaChartBox(partyIssueData.sortedAreas, partyInfo);
                 initializeRepresentativesBox(selectedShorthand);
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
    function initializeRepresentativesBox(partyShorthand) {
         clearBoxContent(candidatesBoxContent, true);
         if (!candidatesBoxContent || !candidateGrid || !candidateGridArea) return;
         candidateGridArea.classList.add('candidate-grid');
         candidateGridArea.classList.remove('featured-candidates-grid');
         populateRepresentativeFilters(partyShorthand);
         handleRepresentativeFiltering(partyShorthand);
    }

    // --- Funksjoner for representanthåndtering ---
    function populateRepresentativeFilters(partyShorthand) {
         const partyRepresentatives = representativesMapByParty[partyShorthand] || [];

         if (candidateConstituencyFilter) {
             candidateConstituencyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
             candidateConstituencyFilter.value = 'all';
             const relevantConstituencies = [...new Set(partyRepresentatives.map(rep => rep.constituencyName).filter(Boolean))].sort();
             relevantConstituencies.forEach(name => {
                 const option = document.createElement('option');
                 option.value = name;
                 option.textContent = name;
                 candidateConstituencyFilter.appendChild(option);
             });
         }

         if (candidateCommitteeFilter) {
             candidateCommitteeFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
             candidateCommitteeFilter.value = 'all';
             const committeeValues = [...new Set(partyRepresentatives.map(rep => normalizeCommitteeValue(rep.committee)))];
             committeeValues
                 .sort((a, b) => {
                     if (a === NO_COMMITTEE_VALUE) return 1;
                     if (b === NO_COMMITTEE_VALUE) return -1;
                     return a.localeCompare(b);
                 })
                 .forEach(value => {
                     const option = document.createElement('option');
                     option.value = value;
                     option.textContent = value === NO_COMMITTEE_VALUE ? 'Ikke tildelt komité' : value;
                     candidateCommitteeFilter.appendChild(option);
                 });
         }

         console.log(`Party Profile v2.3: Populated representative filters for ${partyShorthand}`);
    }

    function handleRepresentativeFiltering(partyShorthand) {
        if (!candidateGrid || !candidateCountSpan || !candidateConstituencyFilter || !candidateGridArea) { console.error("Party Profile v2.3: Missing elements for representative filtering."); return; }
        if (!partyShorthand || !representativesMapByParty[partyShorthand]) { candidateGrid.innerHTML = '<p class="no-results">Velg et parti først.</p>'; candidateCountSpan.textContent = '0'; return; }

        if (candidateGrid) {
            candidateGrid.innerHTML = '<div class="loader">Laster representanter...</div>';
        }

        const selectedConstituency = candidateConstituencyFilter.value;
        const selectedCommittee = candidateCommitteeFilter ? candidateCommitteeFilter.value : 'all';
        const partyInfo = partiesMap[partyShorthand];
        const allPartyRepresentatives = representativesMapByParty[partyShorthand];

        let filteredRepresentatives = allPartyRepresentatives;
        if (selectedConstituency !== 'all') {
            filteredRepresentatives = filteredRepresentatives.filter(rep => rep.constituencyName === selectedConstituency);
        }
        if (selectedCommittee !== 'all') {
            filteredRepresentatives = filteredRepresentatives.filter(rep => normalizeCommitteeValue(rep.committee) === selectedCommittee);
        }

        filteredRepresentatives.sort((a, b) => {
            const committeeA = getCommitteeDisplayName(a);
            const committeeB = getCommitteeDisplayName(b);
            if (committeeA !== committeeB) {
                if (committeeA === 'Ikke tildelt komité') return 1;
                if (committeeB === 'Ikke tildelt komité') return -1;
                return committeeA.localeCompare(committeeB);
            }
            return a.name.localeCompare(b.name);
        });

        console.log(`Party Profile v2.3: Filtering representatives for ${partyShorthand}. Constituency: ${selectedConstituency}, Committee: ${selectedCommittee}. Found ${filteredRepresentatives.length}`);

        displayPartyRepresentativesList(filteredRepresentatives, partyInfo);
        candidateCountSpan.textContent = filteredRepresentatives.length;
    }

    function displayPartyRepresentativesList(representatives, partyInfo) {
         if (!candidateGrid) return;
         candidateGrid.innerHTML = '';

         if (representatives.length === 0) { candidateGrid.innerHTML = '<p class="no-results">Ingen representanter funnet.</p>'; return; }

         const groupedByCommittee = representatives.reduce((acc, rep) => {
             const committeeName = getCommitteeDisplayName(rep);
             if (!acc[committeeName]) {
                 acc[committeeName] = [];
             }
             acc[committeeName].push(rep);
             return acc;
         }, {});

         const sortedCommittees = Object.keys(groupedByCommittee).sort((a, b) => {
             if (a === 'Ikke tildelt komité') return 1;
             if (b === 'Ikke tildelt komité') return -1;
             return a.localeCompare(b);
         });

         sortedCommittees.forEach(committeeName => {
             const separator = createCommitteeSeparator(committeeName, groupedByCommittee[committeeName].length);
             candidateGrid.appendChild(separator);
             groupedByCommittee[committeeName]
                 .sort((a, b) => a.name.localeCompare(b.name))
                 .forEach(rep => {
                     const card = createRepresentativeCard(rep, partyInfo);
                     candidateGrid.appendChild(card);
                 });
         });
     }

     function createCommitteeSeparator(committeeName, count) {
         const separator = document.createElement('div');
         separator.className = 'constituency-separator';
         const displayName = committeeName || 'Ikke tildelt komité';
         const countText = typeof count === 'number' ? `${count} representant${count === 1 ? '' : 'er'}` : '';
         separator.innerHTML = `<span class="name">${displayName}</span> <span class="count">${countText}</span>`;
         return separator;
     }

     function createRepresentativeCard(representative, partyInfo) {
         const safePartyInfo = partyInfo || partiesMap[representative.partyShorthand] || {};
         const shorthand = safePartyInfo.shorthand || representative.partyShorthand || '';
         const partyClassPrefix = safePartyInfo.classPrefix || shorthand.toLowerCase() || 'ukjent';
         const card = document.createElement('div');
         card.className = `candidate-card party-${partyClassPrefix}`;
         card.style.setProperty('--party-color', safePartyInfo.color || '#ccc');
         card.dataset.representativeInfo = JSON.stringify(representative);
         card.innerHTML = `
            <div class="card-header">
                <span class="candidate-name">${representative.name || 'Ukjent navn'}</span>
                <div class="party-icon icon-${partyClassPrefix}" style="background-color:${safePartyInfo.color || '#ccc'}" title="${safePartyInfo.name || representative.partyShorthand || '?'}">${(shorthand || '?').charAt(0) || '?'}</div>
            </div>
            <div class="card-body">
                <div class="candidate-meta">
                    <span>${representative.committee && representative.committee.trim() ? representative.committee : 'Ikke tildelt komité'}</span>
                    ${representative.constituencyName ? `<span class="candidate-location"> | Valgkrets: ${representative.constituencyName}</span>` : ''}
                </div>
            </div>
         `;
         card.title = `${representative.name || '?'} (${safePartyInfo.name || representative.partyShorthand || '?'}) - Klikk for detaljer`;
         return card;
     }

     function normalizeCommitteeValue(rawCommittee) {
         if (!rawCommittee || !rawCommittee.trim()) {
             return NO_COMMITTEE_VALUE;
         }
         return rawCommittee.trim();
     }

     function getCommitteeDisplayName(representative) {
         const normalized = normalizeCommitteeValue(representative.committee);
         return normalized === NO_COMMITTEE_VALUE ? 'Ikke tildelt komité' : normalized;
     }

    // --- Funksjoner for Representant Detalj Overlay ---
    function handleRepresentativeCardClick(event) {
        const card = event.target.closest('.candidate-card[data-representative-info]');
        if (card && card.dataset.representativeInfo) {
             console.log("Party Profile v2.3: Representative card clicked.");
             try {
                 const representative = JSON.parse(card.dataset.representativeInfo);
                 const partyInfo = partiesMap[representative.partyShorthand];
                 displayRepresentativeDetailOverlay(representative, partyInfo);
             } catch (e) {
                 console.error("Party Profile v2.3: Error parsing representative data from card:", e);
                 if (candidateOverlayContent) candidateOverlayContent.innerHTML = "<p>Kunne ikke laste representantdata.</p>";
                 if (candidateOverlay) candidateOverlay.classList.add('active');
             }
        }
    }
    function displayRepresentativeDetailOverlay(representative, partyInfo) {
         if (!candidateOverlay || !candidateOverlayContent) return;
         const effectivePartyInfo = partyInfo || partiesMap[representative.partyShorthand] || {};
         const shorthand = effectivePartyInfo.shorthand || representative.partyShorthand || '';
         const normalizedShorthand = shorthand.toLowerCase();
         const partyClassPrefix = effectivePartyInfo.classPrefix || normalizedShorthand || 'ukjent';
         const placeholderPath = shorthand ? `images/candidates/placeholder-${normalizedShorthand}.png` : 'images/placeholder-generic.png';
         const imageHtml = representative.imageUrl
             ? `<img src="${representative.imageUrl}" alt="${representative.name || 'Representantbilde'}" class="detail-image">`
             : `<img src="${placeholderPath}" alt="Placeholder for ${effectivePartyInfo.name || 'partiet'}" class="detail-image placeholder-image" onerror="this.onerror=null; this.src='images/placeholder-generic.png';">`;
         candidateOverlayContent.innerHTML = `
             <div class="detail-image-container">${imageHtml}</div>
             <div class="detail-header">
                 <div class="party-icon icon-${partyClassPrefix}" style="background-color: ${effectivePartyInfo.color || '#ccc'};">${(shorthand || '?').charAt(0) || '?'}</div>
                 <h3>${representative.name || '?'}</h3>
             </div>
             <div class="detail-info">
                 <p><strong>Parti:</strong> ${effectivePartyInfo.name || representative.partyShorthand || '?'}</p>
                 <p><strong>Valgkrets:</strong> ${representative.constituencyName || '?'}</p>
                 ${representative.committee ? `<p><strong>Komité:</strong> ${representative.committee}</p>` : ''}
                 ${representative.phone ? `<p><strong>Telefon:</strong> <a href="tel:${representative.phone}">${representative.phone}</a></p>` : ''}
                 ${representative.email ? `<p><strong>E-post:</strong> <a href="mailto:${representative.email}">${representative.email}</a></p>` : ''}
                 ${representative.regionOffice ? `<p><strong>Regionkontor:</strong> ${representative.regionOffice}</p>` : ''}
                 ${representative.kfContact ? `<p><strong>KF-kontakt:</strong> ${representative.kfContact}</p>` : ''}
             </div>
             ${representative.profileUrl ? `<a href="${representative.profileUrl}" class="profile-link-btn" target="_blank" rel="noopener noreferrer">Se profil i Microsoft Lists</a>` : ''}
             <p class="privacy-notice-panel">Husk personvern ved bruk av kontaktinformasjon.</p>
         `;
         candidateOverlay.classList.add('active'); candidateOverlay.scrollTop = 0;
    }
    function closeRepresentativeDetailOverlay() {
        if (candidateOverlay) {
            candidateOverlay.classList.remove('active');
            setTimeout(() => { if (candidateOverlayContent) candidateOverlayContent.innerHTML = ''; }, 400);
        }
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
             console.warn("Party Profile v2.3: Could not find tab buttons or content to set up listeners.");
             return;
         }
          console.log(`Party Profile v2.3: Setting up ${tabButtons.length} tab buttons.`);
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
         console.log("Party Profile v2.3: Tab listeners set up.");
    }

    // Hjelpefunksjoner
     function showLoader(element) { if (element) { element.innerHTML = '<div class="loader">Laster...</div>'; } }
     function showError(element, message) { if (element) { element.innerHTML = `<div class="loader error"><p>Feil: ${message}</p></div>`; } }
     function clearBoxContent(element, keepFilters = false) { if (!element) return; if (keepFilters && element.querySelector('.profile-candidate-filters')) { const grid = element.querySelector('#profile-candidate-grid'); if(grid) grid.innerHTML = ''; const count = element.querySelector('#profile-candidate-count'); if(count) count.textContent = '0'; } else { element.innerHTML = ''; } }

}); // Slutt på DOMContentLoaded
