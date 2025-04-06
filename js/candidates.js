// js/candidates.js (Version 5 - Med veksling mellom standard- og bildekortvisning)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Candidates JS v5: DOM loaded.");

    // Globale variabler
    let allConstituencyData = [];
    let partiesMap = {};
    const constituencyMandates = { // Beholdt fra forrige versjon
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

    // --- NYE/OPPDATERTE Referanser ---
    const featuredToggle = document.getElementById('featured-toggle'); // Den nye checkboxen

    const regularViewContainer = document.getElementById('regular-candidates-view');
    const candidateGrid = document.getElementById('candidate-grid'); // Standard grid
    const loaderRegular = candidateGrid ? candidateGrid.querySelector('.loader') : null;

    const featuredViewContainer = document.getElementById('featured-candidates-view');
    const featuredGrid = document.getElementById('featured-candidates-grid'); // Ny grid for bildekort
    const loaderFeatured = featuredGrid ? featuredGrid.querySelector('.loader') : null;
    // --- Slutt nye/oppdaterte referanser ---

    const modal = document.getElementById('candidate-detail-modal');
    const closeBtn = document.getElementById('close-candidate-modal');
    const modalContent = document.getElementById('candidate-detail-content');


    // --- Datainnlasting (lik forrige versjon) ---
    function loadData() {
        console.log("Candidates JS: Loading data...");
        if (loaderRegular) loaderRegular.style.display = 'block';
        if (loaderFeatured) loaderFeatured.style.display = 'block'; // Vis begge loadere

        Promise.all([
            fetch('data/candidates.json')
                .then(response => response.ok ? response.json() : Promise.reject('Failed to load candidates.json')),
            window.partiesDataLoaded && window.partiesData
                ? Promise.resolve(window.partiesData)
                : fetch('data/parties.json').then(response => response.ok ? response.json() : Promise.reject('Failed to load parties.json'))
        ])
        .then(([candidatesConstituencies, parties]) => {
            console.log("Candidates JS: Data fetched successfully.");
            allConstituencyData = candidatesConstituencies;

            if (Object.keys(partiesMap).length === 0) {
                parties.forEach(p => { partiesMap[p.shorthand] = p; });
                window.partiesData = parties;
                window.partiesDataLoaded = true;
                console.log("Candidates JS: partiesMap created from fetch.");
            } else {
                 console.log("Candidates JS: Using pre-loaded partiesMap.");
            }

            if (!Array.isArray(allConstituencyData)) {
                throw new Error("Candidates constituency data is not an array.");
            }

            const allConstituencyNames = [...new Set(allConstituencyData.map(c => c.constituencyName))].sort();
            const allUniquePartyShorthands = [...new Set(allConstituencyData.flatMap(c => c.parties.map(p => p.partyShorthand)))];
             const partiesInCandidates = allUniquePartyShorthands
                .map(sh => partiesMap[sh])
                .filter(Boolean)
                .sort((a, b) => (a.position || 99) - (b.position || 99));

            populateConstituencyFilter(allConstituencyNames);
            populatePartyFilter(partiesInCandidates);
            setupEventListeners();
            handleFilteringAndDisplay(); // Kall hovedfunksjonen ved start
        })
        .catch(error => {
            console.error("Candidates JS: Error loading data:", error);
            const errorMsg = `<p class="error">Kunne ikke laste kandidatdata: ${error.message}. Prøv å laste siden på nytt.</p>`;
            if (candidateGrid) candidateGrid.innerHTML = errorMsg;
            if (featuredGrid) featuredGrid.innerHTML = errorMsg;
            if (featuredViewContainer) featuredViewContainer.style.display = 'none'; // Skjul ved feil
            if (regularViewContainer) regularViewContainer.style.display = 'block'; // Vis standard (med feilmelding)
        })
        .finally(() => {
             setTimeout(() => {
                if(loaderRegular) loaderRegular.style.display = 'none';
                if(loaderFeatured) loaderFeatured.style.display = 'none';
            }, 150);
        });
    }
     // Vent på partidata (som før)
     if (window.partiesDataLoaded) {
         partiesMap = {};
         window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
         console.log("Candidates JS: Using pre-loaded parties data.");
         loadData();
     } else {
         console.log("Candidates JS: Waiting for partiesDataLoaded event...");
         document.addEventListener('partiesDataLoaded', () => {
             console.log("Candidates JS: partiesDataLoaded event received.");
             partiesMap = {};
             if (window.partiesData) {
                 window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
             }
             loadData();
         });
         setTimeout(() => {
             if (Object.keys(partiesMap).length === 0 && !window.partiesDataLoaded) {
                 console.warn("Candidates JS: partiesDataLoaded event never received, attempting fetch anyway.");
                 loadData();
             }
         }, 2000);
     }

    // --- Populate Filters (uendret) ---
    function populateConstituencyFilter(constituencies) { /* ... uendret ... */
        if (!constituencyFilter) return;
        constituencyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
        constituencies.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            constituencyFilter.appendChild(option);
        });
    }
    function populatePartyFilter(parties) { /* ... uendret ... */
        if (!partyFilter) return;
         partyFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
         parties.forEach(party => {
            const option = document.createElement('option');
            option.value = party.shorthand;
            option.textContent = party.name;
            partyFilter.appendChild(option);
        });
     }

    // --- Event Listeners (Oppdatert) ---
    function setupEventListeners() {
        // Eksisterende filtre kaller nå hovedfunksjonen
        constituencyFilter?.addEventListener('change', handleFilteringAndDisplay);
        partyFilter?.addEventListener('change', handleFilteringAndDisplay);
        realisticChanceFilter?.addEventListener('change', handleFilteringAndDisplay);
        nameSearch?.addEventListener('input', debounce(handleFilteringAndDisplay, 300));

        // --- NY: Listener for den nye checkboxen ---
        featuredToggle?.addEventListener('change', handleFilteringAndDisplay);
        // --- SLUTT NY ---

        // Felles event listener for detaljmodal (som før)
        document.body.addEventListener('click', (event) => {
             const card = event.target.closest('.candidate-card[data-candidate-info], .featured-candidate-card[data-candidate-info]');
             if (card && modal && modalContent) {
                 try {
                     const info = JSON.parse(card.dataset.candidateInfo);
                     const partyInfo = JSON.parse(card.dataset.partyInfo);
                     showCandidateDetails(info, partyInfo);
                 } catch (e) { console.error("Failed to parse candidate info from card:", e); }
             }
         });

         // Lukkeknapp modal (som før)
         closeBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
         modal?.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
    }

    // --- Hovedfunksjon for filtrering og visning (Oppdatert) ---
    function handleFilteringAndDisplay() {
        // Sjekk om nødvendige elementer finnes
        if (!regularViewContainer || !featuredViewContainer || !candidateGrid || !featuredGrid) {
             console.error("Error: One or more view containers or grids are missing.");
             return;
        }
        console.log("Candidates JS: Handling filtering and display...");

        // Hent filterverdier
        const selectedConstituency = constituencyFilter?.value || 'all';
        const selectedParty = partyFilter?.value || 'all';
        const showOnlyRealistic = realisticChanceFilter?.checked || false;
        const searchTerm = nameSearch?.value.toLowerCase().trim() || '';
        const showOnlyFeatured = featuredToggle?.checked || false; // Les av den nye checkboxen

        console.log(`Filters - Constituency: ${selectedConstituency}, Party: ${selectedParty}, Realistic: ${showOnlyRealistic}, Featured: ${showOnlyFeatured}, Search: "${searchTerm}"`);

        let allMatchingCandidates = [];

        // Filtrer kandidater basert på valgrets, parti, sjanse og søk (som før)
        allConstituencyData.forEach(constituency => {
            if (selectedConstituency === 'all' || constituency.constituencyName === selectedConstituency) {
                constituency.parties.forEach(party => {
                    if (selectedParty === 'all' || party.partyShorthand === selectedParty) {
                        party.candidates.forEach(candidate => {
                            let include = true;
                            if (showOnlyRealistic && !candidate.hasRealisticChance) include = false;
                            if (searchTerm && !candidate.name.toLowerCase().includes(searchTerm)) include = false;

                            if (include) {
                                allMatchingCandidates.push({
                                    ...candidate,
                                    constituencyName: constituency.constituencyName,
                                    partyShorthand: party.partyShorthand,
                                    partyName: party.partyName
                                });
                            }
                        });
                    }
                });
            }
        });

         // Sorter *alle* matchende kandidater FØR vi evt. deler dem opp
         allMatchingCandidates.sort((a, b) => {
             if (a.constituencyName !== b.constituencyName) return a.constituencyName.localeCompare(b.constituencyName);
             const partyAInfo = partiesMap[a.partyShorthand] || { position: 99 };
             const partyBInfo = partiesMap[b.partyShorthand] || { position: 99 };
             if (partyAInfo.position !== partyBInfo.position) return partyAInfo.position - partyBInfo.position;
             return a.rank - b.rank;
         });


        // --- NY LOGIKK: Velg visning basert på toggle ---
        if (showOnlyFeatured) {
            console.log("Displaying featured candidates view.");
            // Filtrer ut KUN de utvalgte fra de som allerede matchet filtrene
            const featuredCandidatesToShow = allMatchingCandidates.filter(c => c.isFeatured === true);

            displayFeaturedCandidates(featuredCandidatesToShow); // Vis bildekortene
            regularViewContainer.style.display = 'none'; // Skjul standardvisning
            featuredViewContainer.style.display = 'block'; // Vis utvalgt-visning
            if (candidateCount) candidateCount.textContent = featuredCandidatesToShow.length; // Oppdater teller

        } else {
            console.log("Displaying regular candidates view.");
            // Vis ALLE som matchet filtrene i standardvisningen
            displayRegularCandidates(allMatchingCandidates); // Vis standardkortene
            featuredViewContainer.style.display = 'none'; // Skjul utvalgt-visning
            regularViewContainer.style.display = 'block'; // Vis standardvisning
            if (candidateCount) candidateCount.textContent = allMatchingCandidates.length; // Oppdater teller
        }
        // --- SLUTT PÅ NY LOGIKK ---
    }

    // --- Visningslogikk for UTVALGTE kandidater (Oppdatert) ---
    function displayFeaturedCandidates(featuredCandidates) {
        if (!featuredGrid) return;
        featuredGrid.innerHTML = ''; // Tøm

        if (featuredCandidates.length === 0) {
            featuredGrid.innerHTML = '<p class="no-results">Ingen utvalgte kandidater funnet med de valgte filtrene.</p>';
            return;
        }

        featuredCandidates.forEach(candidate => {
            const partyInfo = partiesMap[candidate.partyShorthand];
            if (partyInfo) {
                // Bruker den nye funksjonen for å lage bildekort
                const card = createFeaturedImageCard(candidate, partyInfo);
                featuredGrid.appendChild(card);
            } else {
                console.warn(`Skipping featured candidate ${candidate.name} - party info missing for ${candidate.partyShorthand}`);
            }
        });
         console.log(`Candidates JS: Displayed ${featuredCandidates.length} featured candidates.`);
    }

    // --- NY: Lag kort for UTVALGTE kandidater (som viser bildet) ---
    function createFeaturedImageCard(candidate, partyInfo) {
        const card = document.createElement('div');
        // Bruk en generell klasse + evt. partiklasse
        card.className = `featured-candidate-card party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`;
        card.dataset.candidateInfo = JSON.stringify(candidate); // Viktig for modal
        card.dataset.partyInfo = JSON.stringify(partyInfo);     // Viktig for modal

        // Selve innholdet er kun bildet (eller placeholder)
        card.innerHTML = `
            ${candidate.imageUrl
                ? `<img src="${candidate.imageUrl}" alt="Utvalgt kandidat: ${candidate.name}" loading="lazy">` // Bruk lazy loading
                : '<div class="image-placeholder">Bilde mangler</div>'
            }
        `;
        // Legg til tittel-attributt for tilgjengelighet/info ved hover
        card.title = `${candidate.name} (${partyInfo.name}) - Klikk for detaljer`;

        return card;
    }


    // --- Visningslogikk for REGULÆRE/ALLE kandidater (lik forrige versjon) ---
    function displayRegularCandidates(candidates) {
        if (!candidateGrid) return;
        candidateGrid.innerHTML = ''; // Tøm

        if (candidates.length === 0) {
            candidateGrid.innerHTML = '<p class="no-results">Ingen kandidater funnet med de valgte filtrene.</p>';
            return;
        }

        let currentConstituency = null;
        candidates.forEach(candidate => {
            const partyInfo = partiesMap[candidate.partyShorthand];
            if (!partyInfo) {
                 console.warn(`Skipping regular candidate card for ${candidate.name} - party info missing for ${candidate.partyShorthand}`);
                 return;
            }
            if (candidate.constituencyName !== currentConstituency) {
                const separator = document.createElement('div');
                separator.className = 'constituency-separator';
                const mandateCount = constituencyMandates[candidate.constituencyName];
                const mandateText = typeof mandateCount === 'number' ? `(${mandateCount} mandater)` : '(mandattall ukjent)';
                separator.innerHTML = `
                    <span class="constituency-name">${candidate.constituencyName}</span>
                    <span class="mandate-count">${mandateText}</span>
                `;
                candidateGrid.appendChild(separator);
                currentConstituency = candidate.constituencyName;
            }
            const card = createCandidateCard(candidate, partyInfo);
            candidateGrid.appendChild(card);
        });
         console.log(`Candidates JS: Displayed ${candidates.length} total candidates in regular grid.`);
    }

    // --- Lag standard kandidatkort (uendret) ---
    function createCandidateCard(candidate, partyInfo) {
        const card = document.createElement('div');
        card.className = `candidate-card party-${partyInfo.classPrefix || partyInfo.shorthand.toLowerCase()}`;
        if (candidate.hasRealisticChance) {
            card.classList.add('realistic-chance');
        }
        card.style.setProperty('--party-color', partyInfo.color || '#ccc');
        card.dataset.candidateInfo = JSON.stringify(candidate);
        card.dataset.partyInfo = JSON.stringify(partyInfo);
        card.innerHTML = `
            <div class="card-header">
                <span class="candidate-rank">${candidate.rank}.</span>
                <div class="candidate-header-info">
                     <span class="candidate-name">${candidate.name}</span>
                     <span class="party-name-header">${partyInfo.name || candidate.partyShorthand}</span>
                 </div>
                <div class="party-icon icon-${partyInfo.classPrefix || 'default'}" style="background-color: ${partyInfo.color || '#ccc'}" title="${partyInfo.name || candidate.partyShorthand}">
                     ${candidate.partyShorthand?.charAt(0) || '?'}
                 </div>
            </div>
            <div class="card-body">
                <div class="candidate-meta">
                    ${candidate.age ? `<span>Alder: ${candidate.age}</span>` : ''}
                    ${candidate.location ? `<span class="candidate-location"> | Fra: ${candidate.location}</span>` : ''}
                </div>
            </div>
            ${candidate.hasRealisticChance ? `
             <div class="card-footer">
                 <span class="realistic-badge">Realistisk sjanse</span>
             </div>
             ` : '<div class="card-footer"></div>'}
        `;
        return card;
    }

   // --- Modal for Candidate Details (Oppdatert for å håndtere manglende extraInfoPoints) ---
     function showCandidateDetails(candidate, partyInfo) {
         if (!modal || !modalContent) {
              console.error("Modal or modal content not found!");
              return;
         }
         // Fjerner logikk for extraInfoPoints siden de er i bildet
         modalContent.innerHTML = `
             <h3>
                 <div class="party-icon icon-${partyInfo.classPrefix || 'default'}" style="background-color: ${partyInfo.color || '#ccc'}">
                     ${candidate.partyShorthand?.charAt(0) || '?'}
                 </div>
                 ${candidate.name} (${candidate.partyShorthand})
             </h3>
             <p><strong>Rangering:</strong> ${candidate.rank}. plass</p>
             <p><strong>Parti:</strong> ${partyInfo.name}</p>
             <p><strong>Valgkrets:</strong> ${candidate.constituencyName}</p>
             ${candidate.age ? `<p><strong>Alder:</strong> ${candidate.age}</p>` : ''}
             ${candidate.location ? `<p><strong>Fra:</strong> ${candidate.location}</p>` : ''}
             <p><strong>Realistisk sjanse:</strong> ${candidate.hasRealisticChance ? 'Ja' : 'Nei'}</p>
             ${candidate.email ? `<p><strong>E-post:</strong> <a href="mailto:${candidate.email}">${candidate.email}</a></p>` : ''}
              ${candidate.phone ? `<p><strong>Telefon:</strong> <a href="tel:${candidate.phone}">${candidate.phone}</a></p>` : ''}
             <p style="font-size: 0.8em; color: #777; margin-top: 15px;">Husk personvern ved bruk av kontaktinformasjon.</p>
         `;
         modal.style.display = 'block';
     }

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
