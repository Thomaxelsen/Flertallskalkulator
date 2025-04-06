// js/candidates.js (Version 10 - Hint under titler)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Candidates JS v10: DOM loaded. Adding interaction hints.");

    // --- Hjelpefunksjon for å sjekke touch-enhet ---
    function isTouchDevice() {
        try {
            return (('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0) ||
                    (navigator.msMaxTouchPoints > 0));
        } catch (e) {
            return false; // Anta ikke-touch hvis sjekken feiler
        }
    }
    const isTouch = isTouchDevice();
    console.log("Candidates JS: Is touch device?", isTouch);
    // ----------------------------------------------

    // *** START: NY KODE for å sette hint-tekst ***
    const hintText = isTouch
        ? "Trykk på en kandidat for mer informasjon."
        : "Hold musepekeren over en kandidat for mer informasjon.";

    const featuredHintElement = document.getElementById('featured-hint');
    const regularHintElement = document.getElementById('regular-hint');

    if (featuredHintElement) {
        featuredHintElement.textContent = hintText;
    }
    if (regularHintElement) {
        regularHintElement.textContent = hintText;
    }
    // *** SLUTT: NY KODE ***

    // Globale variabler
    let allConstituencyData = [];
    let partiesMap = {};
    let hoverTimer = null; // Timer for hover-delay
    let hideTimer = null; // Timer for å skjule tooltip
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
    };

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
    const modal = document.getElementById('candidate-detail-modal');
    const closeBtn = document.getElementById('close-candidate-modal');
    const modalContentContainer = document.getElementById('candidate-detail-content'); // Container for selve innholdet
    const modalContentElement = modal?.querySelector('.quote-modal-content'); // Den posisjonerte boksen

    // --- Datainnlasting (likner v9) ---
    function loadData() {
        console.log("Candidates JS: Loading data...");
        if (loaderRegular) loaderRegular.style.display = 'block';
        if (loaderFeatured) loaderFeatured.style.display = 'block';
        Promise.all([
            fetch('data/candidates.json')
                .then(response => response.ok ? response.json() : Promise.reject('Failed to load candidates.json')),
            // Sikrere lasting av partidata
            (window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0)
                ? Promise.resolve(window.partiesData)
                : fetch('data/parties.json')
                    .then(response => response.ok ? response.json() : Promise.reject('Failed to load parties.json'))
                    .then(parties => {
                         window.partiesData = parties;
                         window.partiesDataLoaded = true;
                         // Ikke nødvendig å sende event her hvis partiesData.js allerede gjør det
                         // document.dispatchEvent(new CustomEvent('partiesDataLoaded'));
                         return parties;
                     })

        ])
        .then(([candidatesConstituencies, parties]) => {
            console.log("Candidates JS: Data fetched successfully.");
            allConstituencyData = candidatesConstituencies;
             // Sørg for at partiesMap bygges riktig, selv om dataen kom fra window
             if (Object.keys(partiesMap).length === 0 && parties && parties.length > 0) {
                parties.forEach(p => { partiesMap[p.shorthand] = p; });
                console.log("Candidates JS: partiesMap created.");
            } else if (Object.keys(partiesMap).length > 0) {
                 console.log("Candidates JS: Using pre-existing partiesMap.");
            } else {
                 console.error("Candidates JS: Failed to create partiesMap, parties data missing or invalid.");
                 return; // Kan ikke fortsette uten partidata
            }

            if (!Array.isArray(allConstituencyData)) throw new Error("Candidates data is not an array.");
            const allConstituencyNames = [...new Set(allConstituencyData.map(c => c.constituencyName))].sort();
            const allUniquePartyShorthands = [...new Set(allConstituencyData.flatMap(c => c.parties?.map(p => p.partyShorthand) || []))].filter(Boolean);

            const partiesInCandidates = allUniquePartyShorthands
                .map(sh => partiesMap[sh])
                .filter(Boolean)
                .sort((a, b) => (a.position || 99) - (b.position || 99));

            populateConstituencyFilter(allConstituencyNames);
            populatePartyFilter(partiesInCandidates);
            setupEventListeners(); // Sett opp lyttere ETTER filtrene er klare
            handleFilteringAndDisplay(); // Vis innhold
        })
        .catch(error => {
            console.error("Candidates JS: Error loading or processing data:", error);
            const errorMsg = `<p class="error">Kunne ikke laste nødvendig data: ${error.message}. Prøv å laste siden på nytt.</p>`;
            if (candidateGrid) candidateGrid.innerHTML = errorMsg; if (featuredGrid) featuredGrid.innerHTML = errorMsg;
            if (featuredViewContainer) featuredViewContainer.style.display = 'none';
            if (regularViewContainer) regularViewContainer.style.display = 'block';
             if (candidateCount) candidateCount.textContent = 'Feil';
        })
        .finally(() => {
             setTimeout(() => { if(loaderRegular) loaderRegular.style.display = 'none'; if(loaderFeatured) loaderFeatured.style.display = 'none'; }, 150);
        });
    }

    // --- Vent på/Last partidata (likner v9) ---
     if (window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) {
         partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
         console.log("Candidates JS: Using pre-loaded parties data."); loadData();
     } else {
         console.log("Candidates JS: Waiting for partiesDataLoaded event...");
         document.addEventListener('partiesDataLoaded', () => {
             console.log("Candidates JS: partiesDataLoaded event received.");
              if (window.partiesData && window.partiesData.length > 0) {
                 partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
                 loadData();
              } else {
                  console.error("Candidates JS: partiesDataLoaded event received, but window.partiesData is empty or invalid!");
                  if (candidateGrid) candidateGrid.innerHTML = '<p class="error">Kunne ikke laste partidatabasen.</p>';
                  if (featuredGrid) featuredGrid.innerHTML = '<p class="error">Kunne ikke laste partidatabasen.</p>';
                  if (loaderRegular) loaderRegular.style.display = 'none';
                  if (loaderFeatured) loaderFeatured.style.display = 'none';
              }
         }, { once: true });
          if (!document.querySelector('script[src="js/partiesData.js"]') && !(window.partiesDataLoaded)) {
               console.warn("Candidates JS: partiesData.js script not found, attempting direct fetch.");
               loadData();
          }
     }


    // --- Populate Filters (uendret) ---
    function populateConstituencyFilter(constituencies) { /* ... uendret ... */
        if (!constituencyFilter) return;
        constituencyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
        constituencies.forEach(name => {
            const option = document.createElement('option'); option.value = name; option.textContent = name; constituencyFilter.appendChild(option);
        });
    }
    function populatePartyFilter(parties) { /* ... uendret ... */
        if (!partyFilter) return;
         partyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
         parties.forEach(party => {
            const option = document.createElement('option'); option.value = party.shorthand; option.textContent = party.name; partyFilter.appendChild(option);
        });
     }

    // --- Event Listeners (uendret fra v9) ---
    function setupEventListeners() {
        constituencyFilter?.addEventListener('change', handleFilteringAndDisplay);
        partyFilter?.addEventListener('change', handleFilteringAndDisplay);
        realisticChanceFilter?.addEventListener('change', handleFilteringAndDisplay);
        nameSearch?.addEventListener('input', debounce(handleFilteringAndDisplay, 300));
        viewModeSelect?.addEventListener('change', handleFilteringAndDisplay);

        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            mainContainer.addEventListener('click', (event) => {
                const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
                if (card && isTouch) {
                     handleCardInteraction(card);
                } else if (card && !isTouch && modal && modal.style.display === 'block' && modal.classList.contains('hover-mode')) {
                    event.preventDefault();
                }
            });

            if (!isTouch) {
                mainContainer.addEventListener('mouseover', (event) => {
                    const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
                    if (card) {
                        handleCardHover(card);
                    }
                });
                mainContainer.addEventListener('mouseout', (event) => {
                    const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
                    if (card) {
                        handleCardLeave();
                    }
                });
                 modalContentElement?.addEventListener('mouseenter', () => {
                     if (hideTimer) clearTimeout(hideTimer);
                 });
                 modalContentElement?.addEventListener('mouseleave', () => {
                    hideCandidateTooltip();
                 });
            }
        }
        closeBtn?.addEventListener('click', hideCandidateTooltip);
         modal?.addEventListener('click', (event) => {
            if (event.target === modal) {
                 hideCandidateTooltip();
            }
         });
    }

    // --- Håndtering av kort-interaksjon (uendret fra v9) ---
    function handleCardInteraction(cardElement, isHover = false) {
         if (!cardElement) return;
         try {
             const info = JSON.parse(cardElement.dataset.candidateInfo);
             const partyInfo = JSON.parse(cardElement.dataset.partyInfo);
             showCandidateDetails(info, partyInfo, isHover ? cardElement : null);
         } catch (e) {
             console.error("Error parsing candidate/party info from card:", e, cardElement.dataset.candidateInfo, cardElement.dataset.partyInfo);
             if (modalContentContainer && modal) {
                 modalContentContainer.innerHTML = '<p class="error">Kunne ikke vise kandidatdetaljer på grunn av en datafeil.</p>';
                 if (!isHover) modal.style.display = 'block';
             }
         }
    }

    // --- Håndtering av hover (uendret fra v9) ---
    function handleCardHover(cardElement) {
         if (hoverTimer) clearTimeout(hoverTimer);
         if (hideTimer) clearTimeout(hideTimer);
         hoverTimer = setTimeout(() => {
             handleCardInteraction(cardElement, true);
         }, 150);
    }
    function handleCardLeave() {
         if (hoverTimer) clearTimeout(hoverTimer);
         hideTimer = setTimeout(() => {
              if (modal && modalContentElement && !modalContentElement.matches(':hover')) {
                 hideCandidateTooltip();
              }
         }, 100);
    }
    function hideCandidateTooltip() {
        if (modal) {
            modal.style.display = 'none';
             modal.classList.remove('hover-mode');
        }
        if (hideTimer) clearTimeout(hideTimer);
        if (hoverTimer) clearTimeout(hoverTimer);
    }

    // --- Hovedfunksjon for filtrering og visning (uendret fra v9) ---
    function handleFilteringAndDisplay() {
        if (!regularViewContainer || !featuredViewContainer || !candidateGrid || !featuredGrid) { console.error("Missing view containers or grids"); return; }
        // ... (resten av funksjonen er uendret fra v9) ...
        console.log("Candidates JS: Handling filtering and display...");
        const selectedConstituency = constituencyFilter?.value || 'all';
        const selectedParty = partyFilter?.value || 'all';
        const showOnlyRealistic = realisticChanceFilter?.checked || false;
        const searchTerm = nameSearch?.value.toLowerCase().trim() || '';
        const selectedViewMode = viewModeSelect?.value || 'normal';
        console.log(`Filters - Constituency: ${selectedConstituency}, Party: ${selectedParty}, Realistic: ${showOnlyRealistic}, ViewMode: ${selectedViewMode}, Search: "${searchTerm}"`);
        let allMatchingCandidates = [];
        if (!Array.isArray(allConstituencyData)) {
             console.error("allConstituencyData is not an array!", allConstituencyData);
             if (candidateCount) candidateCount.textContent = 'Datafeil';
             return;
        }
        allConstituencyData.forEach(constituency => {
            if (!constituency || typeof constituency !== 'object' || !Array.isArray(constituency.parties)) {
                console.warn("Skipping invalid constituency data:", constituency); return;
            }
            if (selectedConstituency === 'all' || constituency.constituencyName === selectedConstituency) {
                constituency.parties.forEach(party => {
                     if (!party || typeof party !== 'object' || !Array.isArray(party.candidates)) {
                         console.warn("Skipping invalid party data within constituency:", party, constituency.constituencyName); return;
                     }
                    if (selectedParty === 'all' || party.partyShorthand === selectedParty) {
                        party.candidates.forEach(candidate => {
                             if (!candidate || typeof candidate !== 'object' || !candidate.name) {
                                 console.warn("Skipping invalid candidate data within party:", candidate, party.partyName); return;
                             }
                            let include = true;
                            if (showOnlyRealistic && !candidate.hasRealisticChance) include = false;
                            if (searchTerm && !candidate.name.toLowerCase().includes(searchTerm)) include = false;
                            if (include) {
                                allMatchingCandidates.push({ ...candidate, constituencyName: constituency.constituencyName, partyShorthand: party.partyShorthand, partyName: party.partyName });
                            }
                        });
                    }
                });
            }
        });
         allMatchingCandidates.sort((a, b) => {
             if (a.constituencyName !== b.constituencyName) return a.constituencyName.localeCompare(b.constituencyName);
             const partyAInfo = partiesMap[a.partyShorthand] || { position: 99 }; const partyBInfo = partiesMap[b.partyShorthand] || { position: 99 };
             if (partyAInfo.position !== partyBInfo.position) return (partyAInfo.position || 99) - (partyBInfo.position || 99);
             return (a.rank || 999) - (b.rank || 999);
         });
        if (selectedViewMode === 'featured') {
            console.log("Displaying featured candidates view."); const featuredCandidatesToShow = allMatchingCandidates.filter(c => c.isFeatured === true);
            displayFeaturedCandidates(featuredCandidatesToShow);
            regularViewContainer.style.display = 'none'; featuredViewContainer.style.display = 'block';
            if (candidateCount) candidateCount.textContent = featuredCandidatesToShow.length;
        } else {
            console.log("Displaying regular candidates view.");
            displayRegularCandidates(allMatchingCandidates);
            featuredViewContainer.style.display = 'none'; regularViewContainer.style.display = 'block';
            if (candidateCount) candidateCount.textContent = allMatchingCandidates.length;
        }
    }

    // --- Visningslogikk (displayFeaturedCandidates, createFeaturedImageCard, displayRegularCandidates, createConstituencySeparator, createCandidateCard) ---
    // --- Disse er uendret fra v9 ---
    function displayFeaturedCandidates(featuredCandidates) { /* ... uendret ... */
        if (!featuredGrid) return;
        featuredGrid.innerHTML = '';
        if (featuredCandidates.length === 0) {
            featuredGrid.innerHTML = '<p class="no-results">Ingen utvalgte kandidater funnet med de valgte filtrene.</p>'; return;
        }
        let currentConstituency = null;
        featuredCandidates.forEach(candidate => {
            const partyInfo = partiesMap[candidate.partyShorthand];
            if (!partyInfo) { console.warn(`Skipping featured candidate ${candidate.name} - party info missing`); return; }
            if (candidate.constituencyName !== currentConstituency) {
                const separator = createConstituencySeparator(candidate.constituencyName); featuredGrid.appendChild(separator); currentConstituency = candidate.constituencyName;
            }
            const card = createFeaturedImageCard(candidate, partyInfo); featuredGrid.appendChild(card);
        });
         console.log(`Candidates JS: Displayed ${featuredCandidates.length} featured candidates.`);
     }
    function createFeaturedImageCard(candidate, partyInfo) { /* ... uendret ... */
        const card = document.createElement('div');
        const partyClass = `party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`;
        card.className = `featured-candidate-card ${partyClass}`;
        card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo);
        card.style.setProperty('--card-party-color', partyInfo.color || '#ccc');
        card.innerHTML = `
            ${candidate.imageUrl ? `<img src="${candidate.imageUrl}" alt="Utvalgt kandidat: ${candidate.name}" loading="lazy">` : '<div class="image-placeholder">Bilde mangler</div>'}
        `;
        card.title = `${candidate.name} (${partyInfo.name}) - ${isTouch ? 'Klikk' : 'Hold over'} for detaljer`;
        return card;
     }
    function displayRegularCandidates(candidates) { /* ... uendret ... */
        if (!candidateGrid) return;
        candidateGrid.innerHTML = '';
        if (candidates.length === 0) {
             candidateGrid.innerHTML = '<p class="no-results">Ingen kandidater funnet med de valgte filtrene.</p>'; return;
        }
        let currentConstituency = null;
        candidates.forEach(candidate => {
            const partyInfo = partiesMap[candidate.partyShorthand];
            if (!partyInfo) { console.warn(`Skipping regular card ${candidate.name} for party ${candidate.partyShorthand}`); return; }
            if (candidate.constituencyName !== currentConstituency) {
                const separator = createConstituencySeparator(candidate.constituencyName); candidateGrid.appendChild(separator); currentConstituency = candidate.constituencyName;
            }
            const card = createCandidateCard(candidate, partyInfo); candidateGrid.appendChild(card);
        });
         console.log(`Candidates JS: Displayed ${candidates.length} total candidates in regular grid.`);
     }
     function createConstituencySeparator(constituencyName) { /* ... uendret ... */
         const separator = document.createElement('div');
         separator.className = 'constituency-separator';
         const mandateCount = constituencyMandates[constituencyName];
         const mandateText = typeof mandateCount === 'number' ? `(${mandateCount} mandater)` : '(mandattall ukjent)';
         separator.innerHTML = `
             <span class="constituency-name">${constituencyName || 'Ukjent Valgkrets'}</span>
             <span class="mandate-count">${mandateText}</span>
         `;
         return separator;
     }
    function createCandidateCard(candidate, partyInfo) { /* ... uendret ... */
        const card = document.createElement('div');
        const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();
        card.className = `candidate-card party-${partyClassPrefix}`;
        if (candidate.hasRealisticChance) card.classList.add('realistic-chance');
        card.style.setProperty('--party-color', partyInfo.color || '#ccc');
        card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo);
        card.innerHTML = `
            <div class="card-header"> <span class="candidate-rank">${candidate.rank || '?'}</span> <div class="candidate-header-info"> <span class="candidate-name">${candidate.name || 'Ukjent navn'}</span> <span class="party-name-header">${partyInfo.name || candidate.partyShorthand || 'Ukjent parti'}</span> </div> <div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'}" title="${partyInfo.name || candidate.partyShorthand || 'Ukjent parti'}"> ${candidate.partyShorthand?.charAt(0) || '?'} </div> </div>
            <div class="card-body"> <div class="candidate-meta"> ${candidate.age ? `<span>Alder: ${candidate.age}</span>` : ''} ${candidate.location ? `<span class="candidate-location"> | Fra: ${candidate.location}</span>` : ''} </div> </div>
            ${candidate.hasRealisticChance ? `<div class="card-footer"><span class="realistic-badge">Realistisk sjanse</span></div>` : '<div class="card-footer"></div>'}
        `;
        card.title = `${candidate.name} (${partyInfo.name}) - ${isTouch ? 'Klikk' : 'Hold over'} for detaljer`;
        return card;
    }


    // --- Modal for Candidate Details (uendret fra v9) ---
    function showCandidateDetails(candidate, partyInfo, targetElement = null) {
         if (!modal || !modalContentContainer || !modalContentElement || !candidate || !partyInfo) { console.error(...); return; }
         const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();
         modalContentContainer.innerHTML = `<h3> ... </h3> <p>...</p> ... <p class="privacy-notice">...</p>`; // (Innhold uendret fra v9)

         if (targetElement && !isTouch) { // Hover-posisjonering
             console.log("Positioning tooltip for desktop hover");
             modal.classList.add('hover-mode');
             const rect = targetElement.getBoundingClientRect();
             const viewportWidth = window.innerWidth; const viewportHeight = window.innerHeight;
             modalContentElement.style.visibility = 'hidden'; modalContentElement.style.position = 'fixed'; modalContentElement.style.left = '0px'; modalContentElement.style.top = '0px'; modal.style.display = 'block';
             const modalRect = modalContentElement.getBoundingClientRect(); const modalHeight = modalRect.height; const modalWidth = modalContentElement.offsetWidth || 350;
             modal.style.display = 'none'; modalContentElement.style.visibility = 'visible';
             let top = rect.top - modalHeight - 10; if (top < 10) { top = rect.bottom + 10; } if (top + modalHeight > viewportHeight - 10) { top = Math.max(10, viewportHeight - modalHeight - 10); }
             let left = rect.left + (rect.width / 2) - (modalWidth / 2); left = Math.max(10, Math.min(left, viewportWidth - modalWidth - 10));
             modalContentElement.style.position = 'fixed'; modalContentElement.style.left = `${left}px`; modalContentElement.style.top = `${top}px`; modalContentElement.style.maxWidth = '350px';
         } else { // Sentrert modal
              console.log("Showing centered modal for touch/click");
             modal.classList.remove('hover-mode');
             modalContentElement.style.position = ''; modalContentElement.style.left = ''; modalContentElement.style.top = ''; modalContentElement.style.maxWidth = '';
         }
         modal.style.display = 'block';
     }

    // --- Debounce Hjelpefunksjon (uendret) ---
    function debounce(func, wait) { /* ... uendret ... */
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

}); // End DOMContentLoaded
