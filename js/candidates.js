// js/candidates.js (Version 11 - Alltid synlig sidepanel på desktop)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Candidates JS v11: DOM loaded. Implementing side panel.");

    // --- Hjelpefunksjon for å sjekke touch-enhet ---
    function isTouchDevice() { /* ... uendret ... */
        try { return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)); } catch (e) { return false; }
    }
    const isTouch = isTouchDevice();
    console.log("Candidates JS: Is touch device?", isTouch);

    // --- Hint-tekst kode (Nå basert på klikk for begge) ---
    const hintText = "Klikk på en kandidat for mer informasjon."; // Lik for begge nå
    const featuredHintElement = document.getElementById('featured-hint');
    const regularHintElement = document.getElementById('regular-hint');
    if (featuredHintElement) { featuredHintElement.textContent = hintText; }
    if (regularHintElement) { regularHintElement.textContent = hintText; }

    // Globale variabler
    let allConstituencyData = [];
    let partiesMap = {};
    let currentlySelectedCard = null; // Holder styr på hvilket kort som er valgt
    const constituencyMandates = { /* ... uendret ... */ };

    // DOM-element referanser
    const constituencyFilter = document.getElementById('constituency-filter');
    const partyFilter = document.getElementById('party-filter');
    const realisticChanceFilter = document.getElementById('realistic-chance-filter');
    const nameSearch = document.getElementById('name-search');
    const candidateCount = document.getElementById('candidate-count');
    const viewModeSelect = document.getElementById('view-mode-select');
    const regularViewContainer = document.getElementById('regular-candidates-view');
    const candidateGrid = document.getElementById('candidate-grid');
    const loaderRegular = candidateGrid ? candidateGrid.querySelector('.loader') : null;
    const featuredViewContainer = document.getElementById('featured-candidates-view');
    const featuredGrid = document.getElementById('featured-candidates-grid');
    const loaderFeatured = featuredGrid ? featuredGrid.querySelector('.loader') : null;

    // Referanser for NYTT panel og GAMMEL modal
    const detailPanel = document.getElementById('candidate-detail-panel');
    const detailPanelContent = detailPanel?.querySelector('.panel-content'); // Innholdet i panelet
    const modal = document.getElementById('candidate-detail-modal'); // Beholdes for mobil
    const modalContentContainer = document.getElementById('candidate-detail-content'); // Innhold i modal
    const closeBtn = document.getElementById('close-candidate-modal'); // Lukkeknapp for modal

    // --- Datainnlasting (uendret fra v10.1) ---
    function loadData() { /* ... uendret ... */
        console.log("Loading data..."); if (loaderRegular) loaderRegular.style.display = 'block'; if (loaderFeatured) loaderFeatured.style.display = 'block';
        Promise.all([ fetch('data/candidates.json').then(r => r.ok ? r.json() : Promise.reject('candidate load fail')), ((window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) ? Promise.resolve(window.partiesData) : fetch('data/parties.json').then(r => r.ok ? r.json() : Promise.reject('party load fail')).then(p => { window.partiesData = p; window.partiesDataLoaded = true; return p; })) ])
        .then(([candidatesConstituencies, parties]) => { console.log("Data fetched."); allConstituencyData = candidatesConstituencies; if (Object.keys(partiesMap).length === 0 && parties && parties.length > 0) { parties.forEach(p => { partiesMap[p.shorthand] = p; }); console.log("partiesMap created."); } else if (Object.keys(partiesMap).length === 0) { throw new Error("Party data missing."); } if (!Array.isArray(allConstituencyData)) throw new Error("Candidates data invalid."); const allConstituencyNames = [...new Set(allConstituencyData.map(c => c.constituencyName))].sort(); const allUniquePartyShorthands = [...new Set(allConstituencyData.flatMap(c => c.parties?.map(p => p.partyShorthand) || []))].filter(Boolean); const partiesInCandidates = allUniquePartyShorthands.map(sh => partiesMap[sh]).filter(Boolean).sort((a, b) => (a.position || 99) - (b.position || 99)); populateConstituencyFilter(allConstituencyNames); populatePartyFilter(partiesInCandidates); setupEventListeners(); handleFilteringAndDisplay();
        }).catch(error => { console.error("Error load/process:", error); const errorMsg = `<p>Load error: ${error.message}</p>`; if (candidateGrid) candidateGrid.innerHTML = errorMsg; if (featuredGrid) featuredGrid.innerHTML = errorMsg; if (candidateCount) candidateCount.textContent = 'Feil';
        }).finally(() => { setTimeout(() => { if(loaderRegular) loaderRegular.style.display = 'none'; if(loaderFeatured) loaderFeatured.style.display = 'none'; }, 150); });
    }

    // --- Vent på/Last partidata (uendret fra v10.1) ---
    if (window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) { partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; }); console.log("Using pre-loaded parties."); loadData(); }
    else { console.log("Waiting for partiesDataLoaded..."); document.addEventListener('partiesDataLoaded', () => { console.log("partiesDataLoaded received."); if (window.partiesData && window.partiesData.length > 0) { partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; }); loadData(); } else { console.error("Parties data still missing!"); const errorMsg = '<p>Party DB load error.</p>'; if (candidateGrid) candidateGrid.innerHTML = errorMsg; if (featuredGrid) featuredGrid.innerHTML = errorMsg; } }, { once: true }); if (!document.querySelector('script[src="js/partiesData.js"]') && !(window.partiesDataLoaded)) { console.warn("partiesData.js missing, trying direct fetch."); loadData(); } }

    // --- Populate Filters (uendret) ---
    function populateConstituencyFilter(constituencies) { /* ... uendret ... */ }
    function populatePartyFilter(parties) { /* ... uendret ... */ }

    // --- Event Listeners (MODIFISERT) ---
    function setupEventListeners() {
        // Filter listeners (uendret)
        constituencyFilter?.addEventListener('change', handleFilteringAndDisplay); partyFilter?.addEventListener('change', handleFilteringAndDisplay); realisticChanceFilter?.addEventListener('change', handleFilteringAndDisplay); nameSearch?.addEventListener('input', debounce(handleFilteringAndDisplay, 300)); viewModeSelect?.addEventListener('change', handleFilteringAndDisplay);

        // --- Klikk-lytter for kort (både mobil og desktop) ---
        const mainContainer = document.querySelector('.content-layout-wrapper'); // Mer spesifikk container
        if (mainContainer) {
            mainContainer.addEventListener('click', (event) => {
                const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
                if (card) {
                     console.log("Card clicked. isTouch:", isTouch);
                     handleCardInteraction(card); // Felles funksjon for klikk
                }
            });
        }

        // Lukkeknapp for mobil-modal
         closeBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
         modal?.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });

         // Sett opp initial state for panelet
         resetDetailPanel();
    }

    // --- Håndtering av kort-interaksjon (MODIFISERT) ---
    function handleCardInteraction(cardElement) {
         if (!cardElement) return;

         // Fjern markering fra forrige valgte kort
         if (currentlySelectedCard && currentlySelectedCard !== cardElement) {
             currentlySelectedCard.classList.remove('selected-detail');
         }
         // Legg til markering på nytt kort
         cardElement.classList.add('selected-detail');
         currentlySelectedCard = cardElement; // Oppdater referansen

         try {
             const info = JSON.parse(cardElement.dataset.candidateInfo);
             const partyInfo = JSON.parse(cardElement.dataset.partyInfo);

             // Sjekk skjermbredde eller isTouch for å bestemme visning
             const usePanel = window.innerWidth >= 1024; // Bruk samme grense som i CSS

             if (usePanel && detailPanelContent) {
                 console.log("Displaying in side panel");
                 displayCandidateInPanel(info, partyInfo);
                 if(modal) modal.style.display = 'none'; // Skjul modal hvis den var åpen
             } else if (modal && modalContentContainer) {
                 console.log("Displaying in modal");
                 displayCandidateInModal(info, partyInfo); // Bruk dedikert funksjon for modal
                 // Ikke tøm panelet, det er skjult via CSS
             } else {
                  console.error("Could not determine display target (panel or modal).");
             }

         } catch (e) {
             console.error("Error parsing or displaying candidate info:", e);
             // Vis feil enten i panel eller modal avhengig av kontekst
              const errorHtml = '<p class="error">Kunne ikke vise detaljer (datafeil).</p>';
              if (window.innerWidth >= 1024 && detailPanelContent) {
                   detailPanelContent.innerHTML = errorHtml;
              } else if (modalContentContainer && modal) {
                   modalContentContainer.innerHTML = errorHtml;
                   modal.style.display = 'block';
              }
         }
    }

     // --- Funksjon for å vise i Sidepanel (NY) ---
     function displayCandidateInPanel(candidate, partyInfo) {
         if (!detailPanelContent || !candidate || !partyInfo) return;
         const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();

         detailPanelContent.innerHTML = `
             <div class="detail-image-container">
                 ${candidate.imageUrl
                     ? `<img src="${candidate.imageUrl}" alt="${candidate.name}" class="detail-image">`
                     : '<div class="image-placeholder-panel">Bilde ikke tilgjengelig</div>'
                 }
             </div>
             <div class="detail-header">
                  <div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'};">
                      ${partyInfo.shorthand?.charAt(0) || '?'}
                  </div>
                  <h3>${candidate.name || 'Ukjent navn'}</h3>
             </div>
             <div class="detail-info">
                 <p><strong>Rangering:</strong> ${candidate.rank || 'Ukjent'}. plass</p>
                 <p><strong>Parti:</strong> ${partyInfo.name || 'Ukjent parti'}</p>
                 <p><strong>Valgkrets:</strong> ${candidate.constituencyName || 'Ukjent valgkrets'}</p>
                 ${candidate.age ? `<p><strong>Alder:</strong> ${candidate.age}</p>` : ''}
                 ${candidate.location ? `<p><strong>Fra:</strong> ${candidate.location}</p>` : ''}
                 <p><strong>Realistisk sjanse:</strong> ${typeof candidate.hasRealisticChance !== 'undefined' ? (candidate.hasRealisticChance ? 'Ja' : 'Nei') : 'Ukjent'}</p>
                 ${candidate.email ? `<p><strong>E-post:</strong> <a href="mailto:${candidate.email}">${candidate.email}</a></p>` : ''}
                 ${candidate.phone ? `<p><strong>Telefon:</strong> <a href="tel:${candidate.phone}">${candidate.phone}</a></p>` : ''}
            </div>
            <p class="privacy-notice-panel">Husk personvern ved bruk av kontaktinformasjon.</p>
        `;
        // Scroll panelet til toppen
        if (detailPanel) detailPanel.scrollTop = 0;
     }

     // --- Funksjon for å vise i Modal (Mobil) (Tidl. showCandidateDetails) ---
     function displayCandidateInModal(candidate, partyInfo) {
         if (!modal || !modalContentContainer || !candidate || !partyInfo) return;
         const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();

         // Bygg HTML for modal (likt som før, men uten posisjoneringslogikk)
         modalContentContainer.innerHTML = `
             <h3>
                 <div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'}; width: 28px; height: 28px; font-size: 14px;">${partyInfo.shorthand?.charAt(0) || '?'}</div>
                 ${candidate.name || 'Ukjent navn'}
             </h3>
             <p><strong>Rangering:</strong> ${candidate.rank || 'Ukjent'}. plass</p>
             <p><strong>Parti:</strong> ${partyInfo.name || 'Ukjent parti'}</p>
             <p><strong>Valgkrets:</strong> ${candidate.constituencyName || 'Ukjent valgkrets'}</p>
             ${candidate.age ? `<p><strong>Alder:</strong> ${candidate.age}</p>` : ''}
             ${candidate.location ? `<p><strong>Fra:</strong> ${candidate.location}</p>` : ''}
             <p><strong>Realistisk sjanse:</strong> ${typeof candidate.hasRealisticChance !== 'undefined' ? (candidate.hasRealisticChance ? 'Ja' : 'Nei') : 'Ukjent'}</p>
             ${candidate.email ? `<p><strong>E-post:</strong> <a href="mailto:${candidate.email}">${candidate.email}</a></p>` : ''}
             ${candidate.phone ? `<p><strong>Telefon:</strong> <a href="tel:${candidate.phone}">${candidate.phone}</a></p>` : ''}
             <p class="privacy-notice">Husk personvern ved bruk av kontaktinformasjon.</p>
         `;
          modal.classList.remove('hover-mode'); // Sikrer at den ikke er i hover-modus
          modal.style.display = 'block'; // Vis modalen
     }

    // --- Funksjon for å resette panelet ---
    function resetDetailPanel() {
         if (detailPanelContent) {
            detailPanelContent.innerHTML = `
                <div class="placeholder-text">
                    <h3>Kandidatinformasjon</h3>
                    <p>Velg en kandidat fra listen til venstre for å se detaljer.</p>
                </div>
            `;
         }
         if (currentlySelectedCard) {
            currentlySelectedCard.classList.remove('selected-detail');
            currentlySelectedCard = null;
         }
    }

    // --- Hovedfunksjon for filtrering og visning (Oppdaterer reset) ---
    function handleFilteringAndDisplay() {
        if (!regularViewContainer || !featuredViewContainer || !candidateGrid || !featuredGrid) { console.error("Missing containers"); return; }
        console.log("Handling filtering...");
        const selectedConstituency = constituencyFilter?.value || 'all';
        const selectedParty = partyFilter?.value || 'all';
        const showOnlyRealistic = realisticChanceFilter?.checked || false;
        const searchTerm = nameSearch?.value.toLowerCase().trim() || '';
        const selectedViewMode = viewModeSelect?.value || 'normal';

        // *** VIKTIG: Reset panelet når filtre endres ***
        resetDetailPanel();
        // *** SLUTT RESET ***

        let allMatchingCandidates = [];
        // ... (resten av filtrering og sortering uendret) ...
        if (!Array.isArray(allConstituencyData)) { console.error("Data error!"); if (candidateCount) candidateCount.textContent = 'Feil'; return; }
        allConstituencyData.forEach(constituency => { if (!constituency || !Array.isArray(constituency.parties)) return; if (selectedConstituency === 'all' || constituency.constituencyName === selectedConstituency) { constituency.parties.forEach(party => { if (!party || !Array.isArray(party.candidates)) return; if (selectedParty === 'all' || party.partyShorthand === selectedParty) { party.candidates.forEach(candidate => { if (!candidate || !candidate.name) return; let include = true; if (showOnlyRealistic && !candidate.hasRealisticChance) include = false; if (searchTerm && !candidate.name.toLowerCase().includes(searchTerm)) include = false; if (include) { allMatchingCandidates.push({ ...candidate, constituencyName: constituency.constituencyName, partyShorthand: party.partyShorthand, partyName: party.partyName }); } }); } }); } });
        allMatchingCandidates.sort((a, b) => { if (a.constituencyName !== b.constituencyName) return a.constituencyName.localeCompare(b.constituencyName); const partyAInfo = partiesMap[a.partyShorthand] || { position: 99 }; const partyBInfo = partiesMap[b.partyShorthand] || { position: 99 }; if (partyAInfo.position !== partyBInfo.position) return (partyAInfo.position || 99) - (partyBInfo.position || 99); return (a.rank || 999) - (b.rank || 999); });

        if (selectedViewMode === 'featured') {
            const featuredCandidatesToShow = allMatchingCandidates.filter(c => c.isFeatured === true);
            displayFeaturedCandidates(featuredCandidatesToShow);
            regularViewContainer.style.display = 'none'; featuredViewContainer.style.display = 'block';
            if (candidateCount) candidateCount.textContent = featuredCandidatesToShow.length;
        } else {
            displayRegularCandidates(allMatchingCandidates);
            featuredViewContainer.style.display = 'none'; regularViewContainer.style.display = 'block';
            if (candidateCount) candidateCount.textContent = allMatchingCandidates.length;
        }
    }

    // --- Visningslogikk (uendret, brukerne kaller nå riktig display-funksjon) ---
    function displayFeaturedCandidates(featuredCandidates) { /* ... uendret fra v10.2 ... */ }
    function createFeaturedImageCard(candidate, partyInfo) { /* ... uendret fra v10.2, men hint-tekst er nå bare 'Klikk' */
        const card = document.createElement('div'); const partyClass = `party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`; card.className = `featured-candidate-card ${partyClass}`; card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo); card.style.setProperty('--card-party-color', partyInfo.color || '#ccc'); card.innerHTML = `${candidate.imageUrl ? `<img src="${candidate.imageUrl}" alt="${candidate.name}" loading="lazy">` : '<div class="image-placeholder">Bilde mangler</div>'}`; card.title = `${candidate.name} (${partyInfo.name}) - Klikk for detaljer`; return card; // Title endret
    }
    function displayRegularCandidates(candidates) { /* ... uendret fra v10.2 ... */ }
    function createConstituencySeparator(constituencyName) { /* ... uendret fra v10.2 ... */ }
    function createCandidateCard(candidate, partyInfo) { /* ... uendret fra v10.2, men hint-tekst er nå bare 'Klikk' */
        const card = document.createElement('div'); const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase(); card.className = `candidate-card party-${partyClassPrefix}`; if (candidate.hasRealisticChance) card.classList.add('realistic-chance'); card.style.setProperty('--party-color', partyInfo.color || '#ccc'); card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo); card.innerHTML = `<div class="card-header"><span class="candidate-rank">${candidate.rank || '?'}</span><div class="candidate-header-info"><span class="candidate-name">${candidate.name || '?'}</span><span class="party-name-header">${partyInfo.name || '?'}</span></div><div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'}" title="${partyInfo.name || '?'}">${candidate.partyShorthand?.charAt(0) || '?'}</div></div><div class="card-body"><div class="candidate-meta">${candidate.age ? `<span>Alder: ${candidate.age}</span>` : ''}${candidate.location ? `<span class="candidate-location"> | Fra: ${candidate.location}</span>` : ''}</div></div>${candidate.hasRealisticChance ? `<div class="card-footer"><span class="realistic-badge">Realistisk sjanse</span></div>` : '<div class="card-footer"></div>'}`; card.title = `${candidate.name} (${partyInfo.name}) - Klikk for detaljer`; return card; // Title endret
    }


    // --- Debounce Hjelpefunksjon (uendret) ---
    function debounce(func, wait) { /* ... uendret ... */ }

}); // End DOMContentLoaded
