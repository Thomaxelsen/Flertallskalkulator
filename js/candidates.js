// js/candidates.js (Version 11.3 - Erstatter parti-ikoner med logoer)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Candidates JS v11.3: DOM loaded. Replacing party icons with logos.");

    // --- Hjelpefunksjon for å sjekke touch-enhet ---
    function isTouchDevice() {
        try { return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)); } catch (e) { return false; }
    }
    const isTouch = isTouchDevice();
    console.log("Candidates JS: Is touch device?", isTouch);

    // --- Hint-tekst kode ---
    const hintText = "Klikk på en kandidat for mer informasjon.";
    const featuredHintElement = document.getElementById('featured-hint');
    const regularHintElement = document.getElementById('regular-hint');
    if (featuredHintElement) { featuredHintElement.textContent = hintText; }
    if (regularHintElement) { regularHintElement.textContent = hintText; }

    // Globale variabler
    let allConstituencyData = []; let partiesMap = {}; let currentlySelectedCard = null;
    const constituencyMandates = { "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6, "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6, "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8, "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4 };

    // DOM-element referanser
    const constituencyFilter = document.getElementById('constituency-filter'); const partyFilter = document.getElementById('party-filter'); const realisticChanceFilter = document.getElementById('realistic-chance-filter'); const nameSearch = document.getElementById('name-search'); const candidateCount = document.getElementById('candidate-count'); const viewModeSelect = document.getElementById('view-mode-select'); const regularViewContainer = document.getElementById('regular-candidates-view'); const candidateGrid = document.getElementById('candidate-grid'); const loaderRegular = candidateGrid ? candidateGrid.querySelector('.loader') : null; const featuredViewContainer = document.getElementById('featured-candidates-view'); const featuredGrid = document.getElementById('featured-candidates-grid'); const loaderFeatured = featuredGrid ? featuredGrid.querySelector('.loader') : null; const detailPanel = document.getElementById('candidate-detail-panel'); const detailPanelContent = detailPanel?.querySelector('.panel-content'); const modal = document.getElementById('candidate-detail-modal'); const modalContentContainer = document.getElementById('candidate-detail-content'); const closeBtn = document.getElementById('close-candidate-modal');

    // --- Datainnlasting ---
    function loadData() {
        console.log("Loading data..."); if (loaderRegular) loaderRegular.style.display = 'block'; if (loaderFeatured) loaderFeatured.style.display = 'block';
        Promise.all([ fetch('data/candidates.json').then(r => r.ok ? r.json() : Promise.reject('candidate load fail')), ((window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) ? Promise.resolve(window.partiesData) : fetch('data/parties.json').then(r => r.ok ? r.json() : Promise.reject('party load fail')).then(p => { window.partiesData = p; window.partiesDataLoaded = true; return p; })) ])
        .then(([candidatesConstituencies, parties]) => { console.log("Data fetched."); allConstituencyData = candidatesConstituencies; if (Object.keys(partiesMap).length === 0 && parties && parties.length > 0) { parties.forEach(p => { partiesMap[p.shorthand] = p; }); console.log("partiesMap created."); } else if (Object.keys(partiesMap).length === 0) { throw new Error("Party data missing."); } if (!Array.isArray(allConstituencyData)) throw new Error("Candidates data invalid."); const allConstituencyNames = [...new Set(allConstituencyData.map(c => c.constituencyName))].sort(); const allUniquePartyShorthands = [...new Set(allConstituencyData.flatMap(c => c.parties?.map(p => p.partyShorthand) || []))].filter(Boolean); const partiesInCandidates = allUniquePartyShorthands.map(sh => partiesMap[sh]).filter(Boolean).sort((a, b) => (a.position || 99) - (b.position || 99)); populateConstituencyFilter(allConstituencyNames); populatePartyFilter(partiesInCandidates); setupEventListeners(); handleFilteringAndDisplay();
        }).catch(error => { console.error("Error load/process:", error); const errorMsg = `<p>Load error: ${error.message}</p>`; if (candidateGrid) candidateGrid.innerHTML = errorMsg; if (featuredGrid) featuredGrid.innerHTML = errorMsg; if (candidateCount) candidateCount.textContent = 'Feil';
        }).finally(() => { setTimeout(() => { if(loaderRegular) loaderRegular.style.display = 'none'; if(loaderFeatured) loaderFeatured.style.display = 'none'; }, 150); });
    }

    // --- Vent på/Last partidata ---
     if (window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) { partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; }); console.log("Using pre-loaded parties."); loadData(); }
     else { console.log("Waiting for partiesDataLoaded..."); document.addEventListener('partiesDataLoaded', () => { console.log("partiesDataLoaded received."); if (window.partiesData && window.partiesData.length > 0) { partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; }); loadData(); } else { console.error("Parties data still missing!"); const errorMsg = '<p>Party DB load error.</p>'; if (candidateGrid) candidateGrid.innerHTML = errorMsg; if (featuredGrid) featuredGrid.innerHTML = errorMsg; } }, { once: true }); if (!document.querySelector('script[src="js/partiesData.js"]') && !(window.partiesDataLoaded)) { console.warn("partiesData.js missing, trying direct fetch."); loadData(); } }

    // --- Populate Filters ---
    function populateConstituencyFilter(constituencies) { if (!constituencyFilter) return; constituencyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove()); constituencies.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; constituencyFilter.appendChild(option); }); }
    function populatePartyFilter(parties) { if (!partyFilter) return; partyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove()); parties.forEach(party => { const option = document.createElement('option'); option.value = party.shorthand; option.textContent = party.name; partyFilter.appendChild(option); }); }

    // --- Event Listeners ---
    function setupEventListeners() {
        constituencyFilter?.addEventListener('change', handleFilteringAndDisplay); partyFilter?.addEventListener('change', handleFilteringAndDisplay); realisticChanceFilter?.addEventListener('change', handleFilteringAndDisplay); nameSearch?.addEventListener('input', debounce(handleFilteringAndDisplay, 300)); viewModeSelect?.addEventListener('change', handleFilteringAndDisplay);
        const mainContainer = document.querySelector('.content-layout-wrapper'); if (mainContainer) { mainContainer.addEventListener('click', (event) => { const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]'); if (card) { handleCardInteraction(card); } }); }
        closeBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; }); modal?.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
        resetDetailPanel();
    }

    // --- Håndtering av kort-interaksjon ---
    function handleCardInteraction(cardElement) {
         if (!cardElement) return; if (currentlySelectedCard && currentlySelectedCard !== cardElement) { currentlySelectedCard.classList.remove('selected-detail'); } cardElement.classList.add('selected-detail'); currentlySelectedCard = cardElement;
         try { const info = JSON.parse(cardElement.dataset.candidateInfo); const partyInfo = JSON.parse(cardElement.dataset.partyInfo); const usePanel = window.innerWidth >= 1024; if (usePanel && detailPanelContent) { console.log("Displaying in panel"); displayCandidateInPanel(info, partyInfo); if(modal) modal.style.display = 'none'; } else if (modal && modalContentContainer) { console.log("Displaying in modal"); displayCandidateInModal(info, partyInfo); } else { console.error("No display target."); }
         } catch (e) { console.error("Error parsing/displaying:", e); const errorHtml = '<p>Error display.</p>'; if (window.innerWidth >= 1024 && detailPanelContent) { detailPanelContent.innerHTML = errorHtml; } else if (modalContentContainer && modal) { modalContentContainer.innerHTML = errorHtml; modal.style.display = 'block'; } }
    }

     // --- Funksjon for å vise i Sidepanel ---
     function displayCandidateInPanel(candidate, partyInfo) {
         if (!detailPanelContent || !candidate || !partyInfo) return;

         const imageHtml = candidate.imageUrl
            ? `<img src="${candidate.imageUrl}" alt="${candidate.name || 'Kandidatbilde'}" class="detail-image">`
            : `<img src="images/candidates/placeholder-${partyInfo.shorthand.toLowerCase()}.png" alt="Placeholder-bilde for ${partyInfo.name || 'partiet'}" class="detail-image placeholder-image" onerror="this.onerror=null; this.src='images/placeholder-generic.png';">`;
        
         // === ENDRING 1: Bytter ut .party-icon div med en img-tag ===
         detailPanelContent.innerHTML = `
             <div class="detail-image-container">
                 ${imageHtml}
             </div>
             <div class="detail-header">
                 <img src="images/parties/${partyInfo.shorthand.toLowerCase()}.png" class="party-icon" alt="${partyInfo.name}">
                 <h3>${candidate.name || '?'}</h3>
             </div>
             <div class="detail-info">
                 <p><strong>Rangering:</strong> ${candidate.rank || '?'}. plass</p>
                 <p><strong>Parti:</strong> ${partyInfo.name || '?'}</p>
                 <p><strong>Valgkrets:</strong> ${candidate.constituencyName || '?'}</p>
                 ${candidate.age ? `<p><strong>Alder:</strong> ${candidate.age}</p>` : ''}
                 ${candidate.location ? `<p><strong>Fra:</strong> ${candidate.location}</p>` : ''}
                 <p><strong>Realistisk sjanse:</strong> ${typeof candidate.hasRealisticChance !== 'undefined' ? (candidate.hasRealisticChance ? 'Ja' : 'Nei') : '?'}</p>
                 ${candidate.email ? `<p><strong>E-post:</strong> <a href="mailto:${candidate.email}">${candidate.email}</a></p>` : ''}
                 ${candidate.phone ? `<p><strong>Telefon:</strong> <a href="tel:${candidate.phone}">${candidate.phone}</a></p>` : ''}
             </div>
             <p class="privacy-notice-panel">Husk personvern ved bruk av kontaktinformasjon.</p>
         `;
         // === SLUTT ENDRING 1 ===

        if (detailPanel) detailPanel.scrollTop = 0;
     }

     function displayCandidateInModal(candidate, partyInfo) {
         if (!modal || !modalContentContainer || !candidate || !partyInfo) return;
         modalContentContainer.innerHTML = `
             <h3> <img src="images/parties/${partyInfo.shorthand.toLowerCase()}.png" class="party-icon" alt="${partyInfo.name}" style="width: 28px; height: 28px; margin-right: 8px; vertical-align: middle;"> ${candidate.name || '?'} </h3>
             <p><strong>Rangering:</strong> ${candidate.rank || '?'}. plass</p> <p><strong>Parti:</strong> ${partyInfo.name || '?'}</p> <p><strong>Valgkrets:</strong> ${candidate.constituencyName || '?'}</p> ${candidate.age ? `<p><strong>Alder:</strong> ${candidate.age}</p>` : ''} ${candidate.location ? `<p><strong>Fra:</strong> ${candidate.location}</p>` : ''} <p><strong>Realistisk sjanse:</strong> ${typeof candidate.hasRealisticChance !== 'undefined' ? (candidate.hasRealisticChance ? 'Ja' : 'Nei') : '?'}</p> ${candidate.email ? `<p><strong>E-post:</strong> <a href="mailto:${candidate.email}">${candidate.email}</a></p>` : ''} ${candidate.phone ? `<p><strong>Telefon:</strong> <a href="tel:${candidate.phone}">${candidate.phone}</a></p>` : ''}
             <p class="privacy-notice">Husk personvern ved bruk av kontaktinformasjon.</p>
         `;
          modal.classList.remove('hover-mode'); modal.style.display = 'block';
     }

    function resetDetailPanel() { if (detailPanelContent) { detailPanelContent.innerHTML = `<div class="placeholder-text"><h3>Kandidatinformasjon</h3><p>Velg en kandidat...</p></div>`; } if (currentlySelectedCard) { currentlySelectedCard.classList.remove('selected-detail'); currentlySelectedCard = null; } }

    function handleFilteringAndDisplay() {
        if (!regularViewContainer || !featuredViewContainer || !candidateGrid || !featuredGrid) return; console.log("Handling filtering...");
        resetDetailPanel();
        const selectedConstituency = constituencyFilter?.value || 'all'; const selectedParty = partyFilter?.value || 'all'; const showOnlyRealistic = realisticChanceFilter?.checked || false; const searchTerm = nameSearch?.value.toLowerCase().trim() || ''; const selectedViewMode = viewModeSelect?.value || 'normal';
        let allMatchingCandidates = []; if (!Array.isArray(allConstituencyData)) { console.error("Data error!"); if (candidateCount) candidateCount.textContent = 'Feil'; return; }
        allConstituencyData.forEach(c => { if (!c || !Array.isArray(c.parties)) return; if (selectedConstituency === 'all' || c.constituencyName === selectedConstituency) { c.parties.forEach(p => { if (!p || !Array.isArray(p.candidates)) return; if (selectedParty === 'all' || p.partyShorthand === selectedParty) { p.candidates.forEach(cand => { if (!cand || !cand.name) return; let include = true; if (showOnlyRealistic && !cand.hasRealisticChance) include = false; if (searchTerm && !cand.name.toLowerCase().includes(searchTerm)) include = false; if (include) { allMatchingCandidates.push({ ...cand, constituencyName: c.constituencyName, partyShorthand: p.partyShorthand, partyName: p.partyName }); } }); } }); } });
        allMatchingCandidates.sort((a, b) => { if (a.constituencyName !== b.constituencyName) return a.constituencyName.localeCompare(b.constituencyName); const pA = partiesMap[a.partyShorthand] || { pos: 99 }; const pB = partiesMap[b.partyShorthand] || { pos: 99 }; if (pA.position !== pB.position) return (pA.position || 99) - (pB.position || 99); return (a.rank || 999) - (b.rank || 999); });
        if (selectedViewMode === 'featured') { const featured = allMatchingCandidates.filter(c => c.isFeatured); displayFeaturedCandidates(featured); regularViewContainer.style.display = 'none'; featuredViewContainer.style.display = 'block'; if (candidateCount) candidateCount.textContent = featured.length; }
        else { displayRegularCandidates(allMatchingCandidates); featuredViewContainer.style.display = 'none'; regularViewContainer.style.display = 'block'; if (candidateCount) candidateCount.textContent = allMatchingCandidates.length; }
    }

    function displayFeaturedCandidates(featuredCandidates) {
        if (!featuredGrid) return; featuredGrid.innerHTML = ''; if (featuredCandidates.length === 0) { featuredGrid.innerHTML = '<p>Ingen funnet.</p>'; return; } let currentConstituency = null;
        featuredCandidates.forEach(candidate => { const partyInfo = partiesMap[candidate.partyShorthand]; if (!partyInfo) return; if (candidate.constituencyName !== currentConstituency) { const sep = createConstituencySeparator(candidate.constituencyName); featuredGrid.appendChild(sep); currentConstituency = candidate.constituencyName; } const card = createFeaturedImageCard(candidate, partyInfo); featuredGrid.appendChild(card); });
     }

    function createFeaturedImageCard(candidate, partyInfo) {
        const card = document.createElement('div'); const partyClass = `party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`; card.className = `featured-candidate-card ${partyClass}`; card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo); card.style.setProperty('--card-party-color', partyInfo.color || '#ccc');
        card.innerHTML = `
            ${candidate.imageUrl ? `<img src="${candidate.imageUrl}" alt="${candidate.name || ''}" loading="lazy">` : '<div class="image-placeholder">Bilde mangler</div>'}
        `;
        card.title = `${candidate.name || '?'} (${partyInfo.name || '?'}) - Klikk for detaljer`; return card;
    }

    function displayRegularCandidates(candidates) {
        if (!candidateGrid) return; candidateGrid.innerHTML = ''; if (candidates.length === 0) { candidateGrid.innerHTML = '<p>Ingen funnet.</p>'; return; } let currentConstituency = null;
        candidates.forEach(candidate => { const partyInfo = partiesMap[candidate.partyShorthand]; if (!partyInfo) return; if (candidate.constituencyName !== currentConstituency) { const sep = createConstituencySeparator(candidate.constituencyName); candidateGrid.appendChild(sep); currentConstituency = candidate.constituencyName; } const card = createCandidateCard(candidate, partyInfo); candidateGrid.appendChild(card); });
     }

    function createConstituencySeparator(constituencyName) { const separator = document.createElement('div'); separator.className = 'constituency-separator'; const count = constituencyMandates[constituencyName]; const text = typeof count === 'number' ? `(${count} mandater)` : '(?)'; separator.innerHTML = `<span class="name">${constituencyName || '?'}</span> <span class="count">${text}</span>`; return separator; }

    function createCandidateCard(candidate, partyInfo) {
        const card = document.createElement('div'); card.className = `candidate-card party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`; if (candidate.hasRealisticChance) card.classList.add('realistic-chance'); card.style.setProperty('--party-color', partyInfo.color || '#ccc'); card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo);
        
        // === ENDRING 2: Bytter ut .party-icon div med en img-tag ===
        card.innerHTML = `
            <div class="card-header">
                <span class="candidate-rank">${candidate.rank || '?'}</span>
                <div class="candidate-header-info">
                     <span class="candidate-name">${candidate.name || 'Ukjent navn'}</span>
                     <span class="party-name-header">${partyInfo.name || candidate.partyShorthand || 'Ukjent parti'}</span>
                 </div>
                 <img src="images/parties/${partyInfo.shorthand.toLowerCase()}.png" class="party-icon" alt="${partyInfo.name}" title="${partyInfo.name}">
            </div>
            <div class="card-body">
                <div class="candidate-meta">
                    ${candidate.age ? `<span>Alder: ${candidate.age}</span>` : ''}
                    ${candidate.location ? `<span class="candidate-location"> | Fra: ${candidate.location}</span>` : ''}
                </div>
            </div>
            ${candidate.hasRealisticChance ? `<div class="card-footer"><span class="realistic-badge">Realistisk sjanse</span></div>` : '<div class="card-footer"></div>'}
        `;
        // === SLUTT ENDRING 2 ===

        card.title = `${candidate.name || '?'} (${partyInfo.name || '?'}) - Klikk for detaljer`; return card;
    }

    function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; }

}); // End DOMContentLoaded
