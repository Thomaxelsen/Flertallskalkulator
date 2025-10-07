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
    const STANCE_SEGMENT_COLORS = {
        level0: '#d04f4f',
        level1: '#f2a33c',
        level2: '#35a46f'
    };

    // Referanser til DOM-elementer
    const profileContentGrid = document.getElementById('profile-content');
    const partySelect = document.getElementById('party-select');
    const partyLogoBanner = document.getElementById('party-logo-banner');
    const partyHeroSection = document.getElementById('party-hero');
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
                applyInitialPartySelectionFromUrl();
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
        resetPartyHero();

        partySelect.removeEventListener('change', handlePartySelection);
        partySelect.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
        const sortedParties = [...partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));
        sortedParties.forEach(party => {
             if (representativesMapByParty[party.shorthand] && representativesMapByParty[party.shorthand].length > 0) {
                const option = document.createElement('option'); option.value = party.shorthand; option.textContent = party.name; partySelect.appendChild(option);
             } else { console.warn(`Party Profile v2.3: Skipping party ${party.shorthand} in dropdown - no representative data found.`); }
        });
        buildPartyLogoBanner(sortedParties);
        setActivePartyLogo(null);
        partySelect.addEventListener('change', handlePartySelection);

        if (candidateConstituencyFilter) candidateConstituencyFilter.addEventListener('change', () => handleRepresentativeFiltering(partySelect.value));
        if (candidateCommitteeFilter) candidateCommitteeFilter.addEventListener('change', () => handleRepresentativeFiltering(partySelect.value));
        if (closeOverlayButton) closeOverlayButton.addEventListener('click', closeRepresentativeDetailOverlay);
        if (candidateGrid) { candidateGrid.addEventListener('click', handleRepresentativeCardClick); }

        console.log("Party Profile v2.3: Page initialized.");
    }

    function applyInitialPartySelectionFromUrl() {
        if (!partySelect) return;
        const params = new URLSearchParams(window.location.search);
        const requestedParty = params.get('party');
        if (!requestedParty) return;

        const normalizedParty = requestedParty.trim().toLowerCase();
        if (!normalizedParty) return;

        const availablePartyKey = Object.keys(partiesMap).find(key => key.toLowerCase() === normalizedParty);
        if (!availablePartyKey) {
            console.warn(`Party Profile v2.3: Ingen parti med kode som matcher '${requestedParty}' ble funnet.`);
            return;
        }

        const option = partySelect.querySelector(`option[value="${availablePartyKey}"]`);
        if (!option) {
            console.warn(`Party Profile v2.3: Partiet '${availablePartyKey}' er ikke tilgjengelig i listen (mangler data?).`);
            return;
        }

        partySelect.value = availablePartyKey;
        partySelect.dispatchEvent(new Event('change'));
    }

    loadAllData();

    // --- Kjernefunksjoner ---
    function handlePartySelection() {
         const selectedShorthand = this.value;
         if (!selectedShorthand) { placeholderDiv.style.display = 'flex'; profileContentGrid.classList.remove('active'); clearBoxContent(issuesBoxContent); clearBoxContent(candidatesBoxContent, true); clearBoxContent(stanceChartBoxContent); clearBoxContent(areaChartBoxContent); resetPartyHero(); setActivePartyLogo(null); return; }
         placeholderDiv.style.display = 'none'; profileContentGrid.classList.add('active');
         showLoader(issuesBoxContent); showLoader(candidateGrid);
         showLoader(stanceChartBoxContent); showLoader(areaChartBoxContent);
         console.log(`Party Profile v2.3: Party selected: ${selectedShorthand}. Rendering profile...`);

         setTimeout(() => {
             try {
                 const partyInfo = partiesMap[selectedShorthand]; if (!partyInfo) throw new Error(`Party info not found for ${selectedShorthand}`);
                 const partyIssueData = processPartyIssueData(selectedShorthand);
                 setActivePartyLogo(selectedShorthand);
                 updatePartyHero(partyInfo, partyIssueData);
                 renderIssuesBox(partyIssueData.issuesByLevel, partyIssueData.stanceCounts);
                renderStanceChartBox(partyIssueData.stanceCounts);
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
            <div class="issues-header">
                <div class="issues-heading-group">
                    <h3>Detaljert Saksoversikt</h3>
                    <p class="issues-subtitle">Utforsk hva partiet mener i hver sak, og åpne et panel for å sammenligne alle partienes standpunkter.</p>
                </div>
                <div class="issues-stats">
                    <div class="issues-stat">
                        <span class="issues-stat-label">Full enighet</span>
                        <span class="issues-stat-value">${stanceCounts.level2}</span>
                    </div>
                    <div class="issues-stat">
                        <span class="issues-stat-label">Delvis enighet</span>
                        <span class="issues-stat-value">${stanceCounts.level1}</span>
                    </div>
                    <div class="issues-stat">
                        <span class="issues-stat-label">Ingen støtte</span>
                        <span class="issues-stat-value">${stanceCounts.level0}</span>
                    </div>
                </div>
            </div>
            <div class="issues-main" aria-live="polite">
                <div class="issues-tabs" role="tablist">
                    <button class="tab-button active" role="tab" aria-selected="true" aria-controls="tab-content-level2" data-tab="level2">Full enighet (${stanceCounts.level2})</button>
                    <button class="tab-button" role="tab" aria-selected="false" aria-controls="tab-content-level1" data-tab="level1">Delvis enighet (${stanceCounts.level1})</button>
                    <button class="tab-button" role="tab" aria-selected="false" aria-controls="tab-content-level0" data-tab="level0">Ingen støtte (${stanceCounts.level0})</button>
                </div>
                <div class="tab-content active" id="tab-content-level2" role="tabpanel">
                    ${generateIssueListHTML(issuesByLevel.level2, 'agree', 'Full enighet')}
                </div>
                <div class="tab-content" id="tab-content-level1" role="tabpanel">
                    ${generateIssueListHTML(issuesByLevel.level1, 'partial', 'Delvis enighet')}
                </div>
                <div class="tab-content" id="tab-content-level0" role="tabpanel">
                    ${generateIssueListHTML(issuesByLevel.level0, 'disagree', 'Ingen støtte')}
                </div>
            </div>
            <aside class="issue-detail-overlay" aria-hidden="true">
                <div class="issue-detail-panel" role="dialog" aria-modal="false" aria-labelledby="issue-detail-title">
                    <div class="issue-detail-panel-header">
                        <button type="button" class="issue-detail-close" aria-label="Lukk sakspanel">
                            <span aria-hidden="true">×</span>
                        </button>
                    </div>
                    <div class="issue-detail-scroll">
                        <div class="issue-detail-content" id="issue-detail-content"></div>
                    </div>
                </div>
            </aside>
        `;
        issuesBoxContent.appendChild(issuesDiv);
        setupProfileTabs(issuesDiv);
        setupIssueDetailInteractions(issuesDiv);
    }
    function renderStanceChartBox(stanceCounts) {
         clearBoxContent(stanceChartBoxContent); if (!stanceChartBoxContent) return;
         const chartContainer = document.createElement('div'); chartContainer.className = 'chart-container';
         chartContainer.innerHTML = `<h3>Fordeling av Standpunkt</h3><div id="plotly-stance-chart" class="chart-surface"></div>`;
         stanceChartBoxContent.appendChild(chartContainer); createStanceChart(stanceCounts);
    }
    function renderAreaChartBox(sortedAreasData, partyInfo) {
         clearBoxContent(areaChartBoxContent); if (!areaChartBoxContent) return;
         const chartContainer = document.createElement('div'); chartContainer.className = 'chart-container';
         chartContainer.innerHTML = `<h3>Gj.snitt Støtte per Saksområde</h3><div id="plotly-area-chart" class="chart-surface"></div>`;
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
        const normalizedShorthand = (shorthand || '').toLowerCase();
        const partyClassPrefix = safePartyInfo.classPrefix || normalizedShorthand || 'ukjent';
        const placeholderPath = shorthand
            ? `images/candidates/placeholder-${normalizedShorthand}.png`
            : 'images/placeholder-generic.png';
        const imageUrl = representative.imageUrl || placeholderPath;
        const card = document.createElement('div');
        card.className = `candidate-card party-${partyClassPrefix}`;
        card.style.setProperty('--party-color', safePartyInfo.color || '#ccc');
        card.dataset.representativeInfo = JSON.stringify(representative);
        card.innerHTML = `
            <div class="card-header">
                <img src="${imageUrl}" alt="Profilbilde av ${representative.name || 'representant'}" class="candidate-avatar" onerror="this.onerror=null; this.src='${placeholderPath}';">
                <div class="candidate-header-info">
                    <span class="candidate-name">${representative.name || 'Ukjent navn'}</span>
                </div>
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
    function createStanceChart(stanceCounts) {
         const plotDivId = 'plotly-stance-chart'; const plotDiv = document.getElementById(plotDivId); if (!plotDiv) { console.error(`Element with ID ${plotDivId} not found`); return; } plotDiv.innerHTML = ''; const safeCounts = {
            level2: stanceCounts?.level2 ?? 0,
            level1: stanceCounts?.level1 ?? 0,
            level0: stanceCounts?.level0 ?? 0,
            total: stanceCounts?.total ?? ((stanceCounts?.level2 ?? 0) + (stanceCounts?.level1 ?? 0) + (stanceCounts?.level0 ?? 0))
        }; const donutColors = [STANCE_SEGMENT_COLORS.level2, STANCE_SEGMENT_COLORS.level1, STANCE_SEGMENT_COLORS.level0]; const totalStandpoints = safeCounts.total; const totalLabel = totalStandpoints === 1 ? 'Totalt 1 standpunkt' : `Totalt ${totalStandpoints} standpunkter`; const data = [{ values: [safeCounts.level2, safeCounts.level1, safeCounts.level0], labels: ['Full Enighet (2)', 'Delvis Enighet (1)', 'Ingen Støtte (0)'], type: 'pie', hole: 0.6, marker: { colors: donutColors, line: { color: 'rgba(18, 45, 76, 0.12)', width: 6 } }, hoverinfo: 'label+percent+value', textinfo: 'percent', textfont: { size: 15, color: '#23314f' }, pull: [0.05, 0, 0], rotation: -35 }]; const layout = { showlegend: true, legend: { x: 0.5, y: -0.16, xanchor: 'center', orientation: 'h', font: { color: '#34405c', size: 12 } }, height: 340, margin: { l: 10, r: 10, t: 10, b: 70 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', annotations: [{ text: totalLabel, font: { size: 13, color: '#35425f', family: '"Source Sans Pro", "Helvetica Neue", Arial, sans-serif' }, showarrow: false, x: 0.5, y: 0.5 }], hoverlabel: { bgcolor: '#f8fbff', bordercolor: '#dce6f7', font: { color: '#1f2d46' } } }; try { Plotly.newPlot(plotDivId, data, layout, {responsive: true, displayModeBar: false}); } catch (e) { console.error("Plotly error Stance Chart:", e); plotDiv.innerHTML = '<p class="error">Feil ved lasting.</p>'; }
    }
    function createAreaChart(sortedAreasData, partyInfo) {
        const plotDivId = 'plotly-area-chart'; const plotDiv = document.getElementById(plotDivId); if (!plotDiv) { console.error(`Element with ID ${plotDivId} not found`); return; } plotDiv.innerHTML = ''; const labels = sortedAreasData.map(area => area.name); const values = sortedAreasData.map(area => area.score); const palette = buildChartPalette(partyInfo.color); const data = [{ type: 'scatterpolar', r: values, theta: labels, fill: 'toself', name: partyInfo.name, marker: { color: palette.primary, size: 8 }, line: { color: palette.primary, width: 3 }, fillcolor: palette.primarySoft, hovertemplate: '<b>%{theta}</b><br>Score: %{r:.2f}<extra></extra>' }]; const layout = { polar: { radialaxis: { visible: true, range: [0, 2], tickvals: [0, 1, 2], ticktext: ['0', '1', '2'], angle: 90, tickfont: { size: 12, color: '#3b4a66' }, gridcolor: 'rgba(35, 70, 120, 0.12)', gridwidth: 1.4 }, angularaxis: { tickfont: { size: 12, color: '#3b4a66' }, gridcolor: 'rgba(35, 70, 120, 0.14)', gridwidth: 1 }, bgcolor: 'rgba(255,255,255,0.55)' }, showlegend: false, height: 320, margin: { l: 40, r: 40, t: 30, b: 40 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#23314f' } }; try { Plotly.newPlot(plotDivId, data, layout, {responsive: true, displayModeBar: false}); } catch (e) { console.error("Plotly error Area Chart:", e); plotDiv.innerHTML = '<p class="error">Feil ved lasting.</p>'; }
    }
    function generateIssueListHTML(issues, agreementTypeClass, agreementLabel) {
        if (!issues || issues.length === 0) {
            return '<p class="no-issues">Ingen saker i denne kategorien.</p>';
        }

        return `<ul class="issue-list">
            ${issues.map(issue => {
                const quoteMarkup = issue.quote ? `<p class="issue-item-quote">«${issue.quote}»</p>` : '';
                return `
                    <li class="issue-item ${agreementTypeClass}-item" data-issue-id="${issue.id}" tabindex="0" role="button" aria-label="Se alle partiers standpunkt i saken ${issue.name}">
                        <div class="issue-item-sheen"></div>
                        <div class="issue-item-content">
                            <div class="issue-item-top">
                                <span class="issue-item-status">${agreementLabel}</span>
                                <span class="issue-item-area">${issue.area || 'Ukjent område'}</span>
                            </div>
                            <h4 class="issue-item-title">${issue.name}</h4>
                            ${quoteMarkup}
                            <div class="issue-item-footer">
                                <span class="issue-item-action">Se alle partier</span>
                            </div>
                        </div>
                    </li>
                `;
            }).join('')}
        </ul>`;
    }

    function setupIssueDetailInteractions(issuesSectionElement) {
        if (!issuesSectionElement) return;

        const overlay = issuesSectionElement.querySelector('.issue-detail-overlay');
        const overlayContent = overlay?.querySelector('.issue-detail-content');
        const closeButton = overlay?.querySelector('.issue-detail-close');
        const issuesMain = issuesSectionElement.querySelector('.issues-main');

        if (!overlay || !overlayContent || !closeButton || !issuesMain) return;

        let lastFocusedIssue = null;

        const issueItems = issuesSectionElement.querySelectorAll('.issue-item[data-issue-id]');
        issueItems.forEach(item => {
            item.addEventListener('click', () => openIssueDetail(item.dataset.issueId, item));
            item.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openIssueDetail(item.dataset.issueId, item);
                }
            });
        });

        closeButton.addEventListener('click', () => closeIssueDetail());
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeIssueDetail();
            }
        });

        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                closeIssueDetail();
            }
        });

        function openIssueDetail(issueId, triggerElement) {
            if (!issueId || !overlayContent) return;
            const issue = issuesData.find(item => String(item.id) === String(issueId));
            if (!issue) {
                console.warn('Party Profile v2.3: Issue not found for detail panel', issueId);
                return;
            }

            overlayContent.innerHTML = buildIssueDetailMarkup(issue);
            lastFocusedIssue = triggerElement || null;

            issuesSectionElement.classList.add('showing-issue-detail');
            issuesMain.setAttribute('aria-hidden', 'true');
            overlay.setAttribute('aria-hidden', 'false');
            overlay.classList.add('active');

            requestAnimationFrame(() => {
                closeButton.focus();
            });
        }

        function closeIssueDetail() {
            issuesSectionElement.classList.remove('showing-issue-detail');
            issuesMain.removeAttribute('aria-hidden');
            overlay.setAttribute('aria-hidden', 'true');
            overlay.classList.remove('active');
            if (lastFocusedIssue) {
                lastFocusedIssue.focus();
            }
        }
    }

    function buildIssueDetailMarkup(issue) {
        const descriptionMarkup = issue.description ? `<p class="issue-detail-description">${issue.description}</p>` : '';
        const parties = [...partiesData];
        const partyItems = parties.map(party => {
            const stance = issue.partyStances ? issue.partyStances[party.shorthand] : null;
            const stanceMeta = getStanceMeta(stance?.level);
            const quote = stance?.quote ? `<p class="issue-detail-quote">«${stance.quote}»</p>` : '<p class="issue-detail-quote issue-detail-quote--muted">Ingen standpunkt registrert.</p>';
            return `
                <li class="issue-detail-item">
                    <div class="issue-detail-party">
                        <span class="issue-party-indicator" style="--party-color: ${party.color || '#c4c8d0'}"></span>
                        <div class="issue-detail-party-text">
                            <span class="issue-detail-party-name">${party.name}</span>
                            <span class="issue-detail-badge ${stanceMeta.badgeClass}">${stanceMeta.label}</span>
                        </div>
                    </div>
                    ${quote}
                </li>
            `;
        }).join('');

        return `
            <header class="issue-detail-header">
                <div class="issue-detail-meta">
                    <span class="issue-detail-area">${issue.area || 'Ukjent område'}</span>
                </div>
                <h4 id="issue-detail-title">${issue.name}</h4>
                ${descriptionMarkup}
            </header>
            <div class="issue-detail-divider"></div>
            <ul class="issue-detail-list">
                ${partyItems}
            </ul>
        `;
    }

    function getStanceMeta(level) {
        if (level === 2) {
            return { label: 'Full enighet', badgeClass: 'stance-badge--agree' };
        }
        if (level === 1) {
            return { label: 'Delvis enighet', badgeClass: 'stance-badge--partial' };
        }
        if (level === 0) {
            return { label: 'Ingen støtte', badgeClass: 'stance-badge--disagree' };
        }
        return { label: 'Ingen informasjon', badgeClass: 'stance-badge--unknown' };
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
                newTabButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    content.setAttribute('hidden', 'true');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
                const contentToShow = issuesSectionElement.querySelector(`#${tabIdToShow}`);
                if (contentToShow) {
                    contentToShow.classList.add('active');
                    contentToShow.removeAttribute('hidden');
                } else {
                    console.warn(`Could not find tab content with ID: ${tabIdToShow}`);
                }
            });
        });
        tabContents.forEach((content, index) => {
            if (!content.classList.contains('active')) {
                content.setAttribute('hidden', 'true');
            } else {
                content.removeAttribute('hidden');
            }
            if (newTabButtons[index]) {
                newTabButtons[index].setAttribute('aria-selected', content.classList.contains('active') ? 'true' : 'false');
            }
        });
        console.log("Party Profile v2.3: Tab listeners set up.");
    }

    // Hjelpefunksjoner
     function showLoader(element) { if (element) { element.innerHTML = '<div class="loader">Laster...</div>'; } }
     function showError(element, message) { if (element) { element.innerHTML = `<div class="loader error"><p>Feil: ${message}</p></div>`; } }
     function clearBoxContent(element, keepFilters = false) { if (!element) return; if (keepFilters && element.querySelector('.profile-candidate-filters')) { const grid = element.querySelector('#profile-candidate-grid'); if(grid) grid.innerHTML = ''; const count = element.querySelector('#profile-candidate-count'); if(count) count.textContent = '0'; } else { element.innerHTML = ''; } }

    function buildPartyLogoBanner(sortedParties) {
        if (!partyLogoBanner) return;
        partyLogoBanner.innerHTML = '';
        sortedParties.forEach(party => {
            if (!representativesMapByParty[party.shorthand] || representativesMapByParty[party.shorthand].length === 0) {
                return;
            }
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'party-logo-button';
            button.dataset.party = party.shorthand;
            button.setAttribute('aria-label', party.name);
            button.title = party.name;
            button.innerHTML = `
                <img src="${getPartyLogoPath(party.shorthand)}" alt="${party.name} logo">
                <span>${party.shorthand}</span>
            `;
            button.addEventListener('click', () => {
                if (partySelect) {
                    partySelect.value = party.shorthand;
                    partySelect.dispatchEvent(new Event('change'));
                }
            });
            partyLogoBanner.appendChild(button);
        });
    }

    function setActivePartyLogo(shorthand) {
        if (!partyLogoBanner) return;
        const buttons = partyLogoBanner.querySelectorAll('.party-logo-button');
        buttons.forEach(button => {
            const isActive = button.dataset.party === shorthand;
            button.classList.toggle('selected', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function updatePartyHero(partyInfo, partyIssueData) {
        if (!partyHeroSection) return;
        const cardColor = partyInfo.color || '#0d6efd';
        const palette = buildChartPalette(cardColor);
        const reps = representativesMapByParty[partyInfo.shorthand] || [];
        const representativeCount = reps.length;
        const stanceCounts = partyIssueData.stanceCounts;
        const rawTotal = stanceCounts.total ?? 0;
        const denominator = rawTotal > 0 ? rawTotal : 1;
        const fullAgreementPercent = rawTotal > 0 ? Math.round((stanceCounts.level2 / rawTotal) * 100) : 0;
        const partialPercent = rawTotal > 0 ? Math.round((stanceCounts.level1 / rawTotal) * 100) : 0;
        const weightedScore = ((stanceCounts.level2 * 2) + (stanceCounts.level1 * 1)) / denominator;
        const averageScoreNumeric = Number.isFinite(weightedScore) ? weightedScore : 0;
        const averageScore = Number.isFinite(weightedScore) ? weightedScore.toFixed(2) : '0.00';
        const supportTier = getSupportIndexTier(averageScoreNumeric);

        partyHeroSection.innerHTML = `
            <div class="party-hero-card" style="--party-color:${cardColor}; --party-color-soft:${palette.primarySoft}; --party-color-border:${palette.primarySoftBorder}; --party-color-strong:${palette.primary};">
                <div class="party-hero-logo">
                    <img src="${getPartyLogoPath(partyInfo.shorthand)}" alt="${partyInfo.name} logo">
                </div>
                <div class="party-hero-details">
                    <h2 class="party-hero-title">${partyInfo.name}</h2>
                    <div class="party-hero-meta">
                        <span class="party-hero-pill party-hero-pill--support" data-support-tier="${supportTier}">Støtteindeks ${averageScore} / 2</span>
                        <span class="party-hero-pill">${representativeCount} representanter</span>
                    </div>
                    <p class="party-hero-summary">
                        Full enighet i ${fullAgreementPercent}% av sakene og delvis enighet i ${partialPercent}%. Utforsk partiets prioriterte saker, representanter og stemmemønster nedenfor.
                    </p>
                </div>
            </div>
        `;
    }

    function getSupportIndexTier(score) {
        if (!Number.isFinite(score)) {
            return 'unknown';
        }
        if (score <= 0.3) {
            return 'low';
        }
        if (score <= 0.45) {
            return 'mid';
        }
        if (score <= 0.75) {
            return 'elevated';
        }
        return 'high';
    }

    function resetPartyHero() {
        if (!partyHeroSection) return;
        partyHeroSection.innerHTML = `
            <div class="party-hero-placeholder">
                <p>Velg et parti for å låse opp en skreddersydd profil.</p>
            </div>
        `;
    }

    function getPartyLogoPath(shorthand) {
        if (!shorthand) return 'images/Logo.png';
        return `images/parties/${shorthand.toLowerCase()}.png`;
    }

    function buildChartPalette(baseColor) {
        const defaultColor = '#0d6efd';
        const rgb = hexToRgb(baseColor || defaultColor) || hexToRgb(defaultColor);
        const soft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`;
        const softBorder = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.32)`;
        const warning = 'rgba(255, 184, 34, 0.85)';
        const success = `rgba(${Math.max(rgb.r - 20, 0)}, ${Math.min(rgb.g + 60, 255)}, ${Math.max(rgb.b - 20, 0)}, 0.95)`;
        const danger = 'rgba(220, 53, 69, 0.9)';
        return {
            primary: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            primarySoft: soft,
            primarySoftBorder: softBorder,
            warning,
            success,
            danger
        };
    }

    function hexToRgb(hex) {
        if (!hex) return null;
        const normalized = hex.replace('#', '');
        if (![3, 6].includes(normalized.length)) return null;
        const padded = normalized.length === 3 ? normalized.split('').map(ch => ch + ch).join('') : normalized;
        const bigint = parseInt(padded, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

}); // Slutt på DOMContentLoaded
