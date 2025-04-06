// js/candidates.js (Version 9 - Hover tooltip på desktop)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Candidates JS v9: DOM loaded. Adding hover tooltip logic.");

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

    // --- Datainnlasting (likner v8, men med sjekker) ---
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
                         document.dispatchEvent(new CustomEvent('partiesDataLoaded')); // Send signal hvis det lastes her
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
                 // Vis feilmelding til bruker?
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

    // --- Vent på/Last partidata (likner v8) ---
     if (window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) {
         partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
         console.log("Candidates JS: Using pre-loaded parties data."); loadData();
     } else {
         console.log("Candidates JS: Waiting for partiesDataLoaded event...");
         document.addEventListener('partiesDataLoaded', () => {
             console.log("Candidates JS: partiesDataLoaded event received.");
             // Sjekk om data faktisk ble lastet
              if (window.partiesData && window.partiesData.length > 0) {
                 partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
                 loadData();
              } else {
                  console.error("Candidates JS: partiesDataLoaded event received, but window.partiesData is empty or invalid!");
                  // Håndter feil, f.eks. vis melding i UI
                  if (candidateGrid) candidateGrid.innerHTML = '<p class="error">Kunne ikke laste partidatabasen.</p>';
                  if (featuredGrid) featuredGrid.innerHTML = '<p class="error">Kunne ikke laste partidatabasen.</p>';
                  if (loaderRegular) loaderRegular.style.display = 'none';
                  if (loaderFeatured) loaderFeatured.style.display = 'none';
              }
         }, { once: true }); // Lytt bare én gang
         // Trigger lasting hvis ikke allerede i gang
          if (!document.querySelector('script[src="js/partiesData.js"]') && !(window.partiesDataLoaded)) {
               console.warn("Candidates JS: partiesData.js script not found, attempting direct fetch.");
               loadData(); // loadData vil nå forsøke å fetche parties.json
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

    // --- Event Listeners (MODIFISERT for hover/touch) ---
    function setupEventListeners() {
        // Filter listeners (uendret)
        constituencyFilter?.addEventListener('change', handleFilteringAndDisplay);
        partyFilter?.addEventListener('change', handleFilteringAndDisplay);
        realisticChanceFilter?.addEventListener('change', handleFilteringAndDisplay);
        nameSearch?.addEventListener('input', debounce(handleFilteringAndDisplay, 300));
        viewModeSelect?.addEventListener('change', handleFilteringAndDisplay);

        // --- START: Modifisert lytter for kort (klikk/hover) ---
        const mainContainer = document.querySelector('.container'); // Eller document.body
        if (mainContainer) {
            // Lytter for klikk (primært for touch)
            mainContainer.addEventListener('click', (event) => {
                const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
                if (card && isTouch) { // Bare reager på klikk på touch-enheter
                     console.log("Touch click detected on card");
                     handleCardInteraction(card);
                } else if (card && !isTouch && modal && modal.style.display === 'block' && modal.classList.contains('hover-mode')) {
                    // Hvis bruker klikker på kortet mens tooltip vises (desktop), ikke gjør noe spesielt
                    event.preventDefault(); // Kan forhindre utilsiktet navigering hvis kortet er en lenke
                }
            });

            // Lytter for mouseover (kun desktop)
            if (!isTouch) {
                mainContainer.addEventListener('mouseover', (event) => {
                    const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
                    if (card) {
                         // console.log("Mouseover detected on card");
                        handleCardHover(card);
                    }
                });

                mainContainer.addEventListener('mouseout', (event) => {
                    const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
                    if (card) {
                         // console.log("Mouseout detected on card");
                        handleCardLeave();
                    }
                });

                 // Håndter hover over selve tooltipen for å holde den åpen
                 modalContentElement?.addEventListener('mouseenter', () => {
                     if (hideTimer) clearTimeout(hideTimer);
                 });
                 modalContentElement?.addEventListener('mouseleave', () => {
                    hideCandidateTooltip();
                 });
            }
        }
        // --- SLUTT: Modifisert lytter for kort ---

        // Modal lukkeknapp (uendret - relevant for touch/klikk)
         closeBtn?.addEventListener('click', hideCandidateTooltip); // Bruker felles lukkefunksjon
         modal?.addEventListener('click', (event) => {
            if (event.target === modal) { // Klikk på bakgrunn
                 hideCandidateTooltip();
            }
         });
    }
    // --- SLUTT: Event Listeners ---

    // --- Håndtering av kort-interaksjon (Ny felles funksjon) ---
    function handleCardInteraction(cardElement, isHover = false) {
         if (!cardElement) return;
         try {
             const info = JSON.parse(cardElement.dataset.candidateInfo);
             const partyInfo = JSON.parse(cardElement.dataset.partyInfo);
             // Send med kortet som targetElement hvis det er hover
             showCandidateDetails(info, partyInfo, isHover ? cardElement : null);
         } catch (e) {
             console.error("Error parsing candidate/party info from card:", e, cardElement.dataset.candidateInfo, cardElement.dataset.partyInfo);
             if (modalContentContainer && modal) {
                 modalContentContainer.innerHTML = '<p class="error">Kunne ikke vise kandidatdetaljer på grunn av en datafeil.</p>';
                 if (!isHover) modal.style.display = 'block'; // Vis feilmelding på klikk
             }
         }
    }

    // --- Håndtering av hover (Nye funksjoner) ---
    function handleCardHover(cardElement) {
         if (hoverTimer) clearTimeout(hoverTimer); // Fjern gammel timer
         if (hideTimer) clearTimeout(hideTimer);   // Ikke gjem hvis vi hoovrer på nytt raskt

         // Start en timer for å vise tooltip etter en kort forsinkelse
         hoverTimer = setTimeout(() => {
             handleCardInteraction(cardElement, true); // Kall fellesfunksjon med hover=true
         }, 150); // 150ms forsinkelse
    }

    function handleCardLeave() {
         if (hoverTimer) clearTimeout(hoverTimer); // Avbryt visning hvis musen forlater før timeren er ferdig
         // Start timer for å skjule tooltipen
         hideTimer = setTimeout(() => {
             // Sjekk om musen er over selve modalen før vi gjemmer
              if (modal && modalContentElement && !modalContentElement.matches(':hover')) {
                 hideCandidateTooltip();
              }
         }, 100); // 100ms forsinkelse før skjuling
    }

    // --- Felles funksjon for å skjule modal/tooltip ---
    function hideCandidateTooltip() {
        if (modal) {
            modal.style.display = 'none';
            // Viktig: Fjern hover-modus klassen når den skjules
             modal.classList.remove('hover-mode');
        }
        if (hideTimer) clearTimeout(hideTimer);
        if (hoverTimer) clearTimeout(hoverTimer);
    }
    // --- SLUTT: Hover-håndtering ---


    // --- Hovedfunksjon for filtrering og visning (uendret fra v8) ---
    function handleFilteringAndDisplay() {
        if (!regularViewContainer || !featuredViewContainer || !candidateGrid || !featuredGrid) { console.error("Missing view containers or grids"); return; }
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
             return; // Kan ikke fortsette uten data
        }
        allConstituencyData.forEach(constituency => { /* ... filtrer som før ... */
            if (!constituency || typeof constituency !== 'object' || !Array.isArray(constituency.parties)) {
                console.warn("Skipping invalid constituency data:", constituency);
                return;
            }
            if (selectedConstituency === 'all' || constituency.constituencyName === selectedConstituency) {
                constituency.parties.forEach(party => {
                     if (!party || typeof party !== 'object' || !Array.isArray(party.candidates)) {
                         console.warn("Skipping invalid party data within constituency:", party, constituency.constituencyName);
                         return;
                     }
                    if (selectedParty === 'all' || party.partyShorthand === selectedParty) {
                        party.candidates.forEach(candidate => {
                             if (!candidate || typeof candidate !== 'object' || !candidate.name) {
                                 console.warn("Skipping invalid candidate data within party:", candidate, party.partyName);
                                 return;
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
         allMatchingCandidates.sort((a, b) => { /* ... sorter som før ... */
             if (a.constituencyName !== b.constituencyName) return a.constituencyName.localeCompare(b.constituencyName);
             const partyAInfo = partiesMap[a.partyShorthand] || { position: 99 }; const partyBInfo = partiesMap[b.partyShorthand] || { position: 99 };
             if (partyAInfo.position !== partyBInfo.position) return (partyAInfo.position || 99) - (partyBInfo.position || 99); // Sørg for fallback
             return (a.rank || 999) - (b.rank || 999); // Sørg for fallback
         });
        if (selectedViewMode === 'featured') { /* ... vis utvalgte som før ... */
            console.log("Displaying featured candidates view."); const featuredCandidatesToShow = allMatchingCandidates.filter(c => c.isFeatured === true);
            displayFeaturedCandidates(featuredCandidatesToShow);
            regularViewContainer.style.display = 'none'; featuredViewContainer.style.display = 'block';
            if (candidateCount) candidateCount.textContent = featuredCandidatesToShow.length;
        } else { /* ... vis normal visning som før ... */
            console.log("Displaying regular candidates view.");
            displayRegularCandidates(allMatchingCandidates);
            featuredViewContainer.style.display = 'none'; regularViewContainer.style.display = 'block';
            if (candidateCount) candidateCount.textContent = allMatchingCandidates.length;
        }
    }

    // --- Visningslogikk for UTVALGTE kandidater (uendret fra v8) ---
    function displayFeaturedCandidates(featuredCandidates) {
        if (!featuredGrid) return;
        featuredGrid.innerHTML = ''; // Tøm

        if (featuredCandidates.length === 0) {
            featuredGrid.innerHTML = '<p class="no-results">Ingen utvalgte kandidater funnet med de valgte filtrene.</p>';
            return;
        }

        let currentConstituency = null; // Holder styr på nåværende valgkrets
        featuredCandidates.forEach(candidate => {
            const partyInfo = partiesMap[candidate.partyShorthand];
            if (!partyInfo) {
                console.warn(`Skipping featured candidate ${candidate.name} - party info missing`);
                return;
            }

            if (candidate.constituencyName !== currentConstituency) {
                const separator = createConstituencySeparator(candidate.constituencyName);
                featuredGrid.appendChild(separator);
                currentConstituency = candidate.constituencyName;
            }

            const card = createFeaturedImageCard(candidate, partyInfo);
            featuredGrid.appendChild(card);
        });
         console.log(`Candidates JS: Displayed ${featuredCandidates.length} featured candidates.`);
    }

    // --- Lag kort for UTVALGTE kandidater (uendret fra v8) ---
    function createFeaturedImageCard(candidate, partyInfo) {
        const card = document.createElement('div');
        const partyClass = `party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`;
        card.className = `featured-candidate-card ${partyClass}`;
        card.dataset.candidateInfo = JSON.stringify(candidate);
        card.dataset.partyInfo = JSON.stringify(partyInfo);
        card.style.setProperty('--card-party-color', partyInfo.color || '#ccc');
        card.innerHTML = `
            ${candidate.imageUrl
                ? `<img src="${candidate.imageUrl}" alt="Utvalgt kandidat: ${candidate.name}" loading="lazy">`
                : '<div class="image-placeholder">Bilde mangler</div>'
            }
        `;
        card.title = `${candidate.name} (${partyInfo.name}) - ${isTouch ? 'Klikk' : 'Hold over'} for detaljer`; // Dynamisk tittel
        return card;
    }

    // --- Visningslogikk for REGULÆRE/ALLE kandidater (uendret fra v8) ---
    function displayRegularCandidates(candidates) {
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
                const separator = createConstituencySeparator(candidate.constituencyName);
                candidateGrid.appendChild(separator);
                currentConstituency = candidate.constituencyName;
            }
            const card = createCandidateCard(candidate, partyInfo);
            candidateGrid.appendChild(card);
        });
         console.log(`Candidates JS: Displayed ${candidates.length} total candidates in regular grid.`);
    }

     // --- Hjelpefunksjon for separator (uendret fra v8) ---
     function createConstituencySeparator(constituencyName) {
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

    // --- Lag standard kandidatkort (uendret fra v8) ---
    function createCandidateCard(candidate, partyInfo) {
        const card = document.createElement('div');
        const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();
        card.className = `candidate-card party-${partyClassPrefix}`;
        if (candidate.hasRealisticChance) card.classList.add('realistic-chance');
        card.style.setProperty('--party-color', partyInfo.color || '#ccc');
        card.dataset.candidateInfo = JSON.stringify(candidate); card.dataset.partyInfo = JSON.stringify(partyInfo);
        card.innerHTML = `
            <div class="card-header">
                <span class="candidate-rank">${candidate.rank || '?'}</span>
                <div class="candidate-header-info">
                     <span class="candidate-name">${candidate.name || 'Ukjent navn'}</span>
                     <span class="party-name-header">${partyInfo.name || candidate.partyShorthand || 'Ukjent parti'}</span>
                 </div>
                <div class="party-icon icon-${partyClassPrefix}" style="background-color: ${partyInfo.color || '#ccc'}" title="${partyInfo.name || candidate.partyShorthand || 'Ukjent parti'}">
                     ${candidate.partyShorthand?.charAt(0) || '?'}
                 </div>
            </div>
            <div class="card-body">
                <div class="candidate-meta">
                    ${candidate.age ? `<span>Alder: ${candidate.age}</span>` : ''}
                    ${candidate.location ? `<span class="candidate-location"> | Fra: ${candidate.location}</span>` : ''}
                </div>
            </div>
            ${candidate.hasRealisticChance ? `<div class="card-footer"><span class="realistic-badge">Realistisk sjanse</span></div>` : '<div class="card-footer"></div>'}
        `;
         // Legg til title-attributt for hover-hint
        card.title = `${candidate.name} (${partyInfo.name}) - ${isTouch ? 'Klikk' : 'Hold over'} for detaljer`;
        return card;
    }


    // --- Modal for Candidate Details (MODIFISERT for posisjonering) ---
    function showCandidateDetails(candidate, partyInfo, targetElement = null) {
         // Sikrer at alle nødvendige elementer og data er tilstede
         if (!modal || !modalContentContainer || !modalContentElement || !candidate || !partyInfo) {
             console.error("Modal/Content/Candidate/PartyInfo missing:", { modal, modalContentContainer, modalContentElement, candidate, partyInfo });
             return;
         }
         const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();

         // Bygg HTML-innholdet (likt som v8)
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

         // --- START: Posisjoneringslogikk for desktop hover ---
         if (targetElement && !isTouch) {
             console.log("Positioning tooltip for desktop hover");
             modal.classList.add('hover-mode'); // Bruk tooltip-stil

             const rect = targetElement.getBoundingClientRect();
             const viewportWidth = window.innerWidth;
             const viewportHeight = window.innerHeight;

             // Midlertidig vis modalen (usynlig) for å måle dimensjoner
             modalContentElement.style.visibility = 'hidden';
             modalContentElement.style.position = 'fixed'; // Nødvendig for måling
             modalContentElement.style.left = '0px';
             modalContentElement.style.top = '0px';
             modal.style.display = 'block'; // Må være synlig i DOM for getBoundingClientRect

             const modalRect = modalContentElement.getBoundingClientRect();
             const modalHeight = modalRect.height;
             // Bruker offsetWidth da getBoundingClientRect kan være 0 hvis innholdet ikke er rendret enda
             const modalWidth = modalContentElement.offsetWidth || 350; // Fallback bredde

             // Tilbakestill display før posisjonering
              modal.style.display = 'none';
              modalContentElement.style.visibility = 'visible';


             // Beregn optimal posisjon
             let top = rect.top - modalHeight - 10; // Prøv over elementet
             if (top < 10) { // Hvis ikke plass over
                 top = rect.bottom + 10; // Prøv under elementet
             }
             // Juster hvis den går utenfor bunnen
             if (top + modalHeight > viewportHeight - 10) {
                  top = Math.max(10, viewportHeight - modalHeight - 10); // Plasser nederst med litt margin
             }

             // Prøv å sentrere horisontalt over/under kortet
             let left = rect.left + (rect.width / 2) - (modalWidth / 2);
             // Juster hvis den går utenfor kantene
             left = Math.max(10, Math.min(left, viewportWidth - modalWidth - 10));

             // Anvend posisjonen
             modalContentElement.style.position = 'fixed'; // Viktig for tooltip
             modalContentElement.style.left = `${left}px`;
             modalContentElement.style.top = `${top}px`;
             modalContentElement.style.maxWidth = '350px'; // Begrens bredde for tooltip

         } else {
              console.log("Showing centered modal for touch/click");
             // Standard sentrert modal for touch/klikk
             modal.classList.remove('hover-mode');
             modalContentElement.style.position = ''; // Tilbakestill til standard (auto/static)
             modalContentElement.style.left = '';
             modalContentElement.style.top = '';
             modalContentElement.style.maxWidth = ''; // Tilbake til CSS default
         }
         // --- SLUTT: Posisjoneringslogikk ---

         modal.style.display = 'block'; // Vis modalen
     }
     // --- SLUTT OPPDATERT MODAL ---

    // --- Debounce Hjelpefunksjon (uendret) ---
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

}); // End DOMContentLoaded
