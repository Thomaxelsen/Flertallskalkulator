// js/candidates.js (Version 8 - Fikset modal-visning)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Candidates JS v8: DOM loaded.");

    // Globale variabler (uendret)
    let allConstituencyData = [];
    let partiesMap = {};
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
    };

    // DOM-element referanser (uendret fra v6)
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
    const modalContent = document.getElementById('candidate-detail-content');


    // --- Datainnlasting (uendret fra v6) ---
    function loadData() {
        console.log("Candidates JS: Loading data...");
        if (loaderRegular) loaderRegular.style.display = 'block';
        if (loaderFeatured) loaderFeatured.style.display = 'block';
        Promise.all([ /* ... datainnlasting som før ... */
            fetch('data/candidates.json')
                .then(response => response.ok ? response.json() : Promise.reject('Failed to load candidates.json')),
            window.partiesDataLoaded && window.partiesData
                ? Promise.resolve(window.partiesData)
                : fetch('data/parties.json').then(response => response.ok ? response.json() : Promise.reject('Failed to load parties.json'))
        ])
        .then(([candidatesConstituencies, parties]) => {
            console.log("Candidates JS: Data fetched successfully.");
            allConstituencyData = candidatesConstituencies;
            if (Object.keys(partiesMap).length === 0 && parties) { /* ... lag partiesMap som før ... */
                parties.forEach(p => { partiesMap[p.shorthand] = p; });
                window.partiesData = parties; window.partiesDataLoaded = true;
                console.log("Candidates JS: partiesMap created from fetch.");
            } else { console.log("Candidates JS: Using pre-loaded partiesMap."); }
            if (!Array.isArray(allConstituencyData)) throw new Error("Candidates data is not an array.");
            const allConstituencyNames = [...new Set(allConstituencyData.map(c => c.constituencyName))].sort();
            const allUniquePartyShorthands = [...new Set(allConstituencyData.flatMap(c => c.parties.map(p => p.partyShorthand)))];
            // Filtrer ut null/undefined partier før sortering
            const partiesInCandidates = allUniquePartyShorthands
                .map(sh => partiesMap[sh])
                .filter(Boolean) // Fjerner undefined/null partier
                .sort((a, b) => (a.position || 99) - (b.position || 99));
            populateConstituencyFilter(allConstituencyNames);
            populatePartyFilter(partiesInCandidates);
            setupEventListeners();
            handleFilteringAndDisplay();
        })
        .catch(error => { /* ... feilhåndtering som før ... */
            console.error("Candidates JS: Error loading data:", error);
            const errorMsg = `<p class="error">Kunne ikke laste kandidatdata: ${error.message}. Prøv å laste siden på nytt.</p>`;
            if (candidateGrid) candidateGrid.innerHTML = errorMsg; if (featuredGrid) featuredGrid.innerHTML = errorMsg;
            if (featuredViewContainer) featuredViewContainer.style.display = 'none';
            if (regularViewContainer) regularViewContainer.style.display = 'block';
        })
        .finally(() => { /* ... skjul loadere som før ... */
             setTimeout(() => { if(loaderRegular) loaderRegular.style.display = 'none'; if(loaderFeatured) loaderFeatured.style.display = 'none'; }, 150);
        });
    }
     // Vent på partidata (som før)
     if (window.partiesDataLoaded && window.partiesData) { /* ... initialiser som før ... */
         partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
         console.log("Candidates JS: Using pre-loaded parties data."); loadData();
     } else { /* ... vent på event som før ... */
         console.log("Candidates JS: Waiting for partiesDataLoaded event...");
         document.addEventListener('partiesDataLoaded', () => {
             console.log("Candidates JS: partiesDataLoaded event received.");
             partiesMap = {}; if (window.partiesData) window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
             loadData();
         });
         setTimeout(() => { if (Object.keys(partiesMap).length === 0 && !window.partiesDataLoaded) { console.warn("Parties data timeout, attempting load anyway."); loadData(); } }, 3000); // Økt timeout litt
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

    // --- Event Listeners (uendret fra v6) ---
    function setupEventListeners() {
        constituencyFilter?.addEventListener('change', handleFilteringAndDisplay);
        partyFilter?.addEventListener('change', handleFilteringAndDisplay);
        realisticChanceFilter?.addEventListener('change', handleFilteringAndDisplay);
        nameSearch?.addEventListener('input', debounce(handleFilteringAndDisplay, 300));
        viewModeSelect?.addEventListener('change', handleFilteringAndDisplay); // Lytter til rullemeny
        document.body.addEventListener('click', (event) => { /* ... modal-listener som før ... */
             const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
             if (card && modal && modalContent) { /* ... vis modal som før ... */
                 try {
                     const info = JSON.parse(card.dataset.candidateInfo);
                     const partyInfo = JSON.parse(card.dataset.partyInfo);
                     showCandidateDetails(info, partyInfo);
                 }
                 catch (e) {
                     console.error("Error parsing candidate/party info from card:", e, card.dataset.candidateInfo, card.dataset.partyInfo);
                     modalContent.innerHTML = '<p class="error">Kunne ikke vise kandidatdetaljer på grunn av en datafeil.</p>';
                     if (modal) modal.style.display = 'block';
                    }
             }
         });
         closeBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
         modal?.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
    }

    // --- Hovedfunksjon for filtrering og visning (uendret fra v6) ---
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
             if (partyAInfo.position !== partyBInfo.position) return partyAInfo.position - partyBInfo.position;
             return a.rank - b.rank;
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

    // --- Visningslogikk for UTVALGTE kandidater (Oppdatert med separator) ---
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

            // --- NY: Sjekk og legg til separator ---
            if (candidate.constituencyName !== currentConstituency) {
                const separator = createConstituencySeparator(candidate.constituencyName);
                featuredGrid.appendChild(separator);
                currentConstituency = candidate.constituencyName;
            }
            // --- SLUTT NY ---

            // Lag bildekort
            const card = createFeaturedImageCard(candidate, partyInfo);
            featuredGrid.appendChild(card);
        });
         console.log(`Candidates JS: Displayed ${featuredCandidates.length} featured candidates.`);
    }

    // --- Lag kort for UTVALGTE kandidater (Oppdatert med partifarge-variabel) ---
    function createFeaturedImageCard(candidate, partyInfo) {
        const card = document.createElement('div');
        // Legg til partiklasse for SV-gradient
        const partyClass = `party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`;
        card.className = `featured-candidate-card ${partyClass}`;
        card.dataset.candidateInfo = JSON.stringify(candidate);
        card.dataset.partyInfo = JSON.stringify(partyInfo);

        // --- NY: Sett CSS variabel for ramme-farge ---
        card.style.setProperty('--card-party-color', partyInfo.color || '#ccc');
        // --- SLUTT NY ---

        card.innerHTML = `
            ${candidate.imageUrl
                ? `<img src="${candidate.imageUrl}" alt="Utvalgt kandidat: ${candidate.name}" loading="lazy">`
                : '<div class="image-placeholder">Bilde mangler</div>'
            }
        `;
        card.title = `${candidate.name} (${partyInfo.name}) - Klikk for detaljer`;
        return card;
    }

    // --- Visningslogikk for REGULÆRE/ALLE kandidater (Uendret, men bruker createConstituencySeparator) ---
    function displayRegularCandidates(candidates) {
        if (!candidateGrid) return;
        candidateGrid.innerHTML = '';
        if (candidates.length === 0) { /* ... vis no-results som før ... */
             candidateGrid.innerHTML = '<p class="no-results">Ingen kandidater funnet med de valgte filtrene.</p>'; return;
        }
        let currentConstituency = null;
        candidates.forEach(candidate => {
            const partyInfo = partiesMap[candidate.partyShorthand];
            if (!partyInfo) { console.warn(`Skipping regular card ${candidate.name} for party ${candidate.partyShorthand}`); return; }
            // Bruker nå hjelpefunksjonen for separator
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

     // --- NY Hjelpefunksjon for å lage separator ---
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
     // --- SLUTT NY ---


    // --- Lag standard kandidatkort (uendret fra v6) ---
    function createCandidateCard(candidate, partyInfo) { /* ... uendret ... */
        const card = document.createElement('div');
        const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();
        card.className = `candidate-card party-${partyClassPrefix}`;
        if (candidate.hasRealisticChance) card.classList.add('realistic-chance');
        card.style.setProperty('--party-color', partyInfo.color || '#ccc'); // For top border
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
        return card;
    }

   // --- Modal for Candidate Details (OPPDATERT) ---
    function showCandidateDetails(candidate, partyInfo) {
         if (!modal || !modalContent || !candidate || !partyInfo) {
             console.error("Modal, content, candidate, or partyInfo missing for showCandidateDetails", modal, modalContent, candidate, partyInfo);
             return;
         }
         const partyClassPrefix = partyInfo.classPrefix || partyInfo.shorthand.toLowerCase();

         // *** FJERN hardkodet (...) og inline style ***
         modalContent.innerHTML = `
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
         modal.style.display = 'block';
     }
     // --- SLUTT OPPDATERT MODAL ---

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
