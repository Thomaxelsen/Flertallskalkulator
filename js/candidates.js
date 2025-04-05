// js/candidates.js (Version 3 - Med mandater per valgkrets)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Candidates JS: DOM loaded.");

    // Globale variabler for data og tilstand
    let allCandidatesData = [];
    let partiesMap = {}; // { shorthand: { name, color, classPrefix, ... } }
    let constituenciesList = [];

    // *** NYTT: Oppslag for mandater per valgkrets (basert på image_f51c1f.png) ***
    const constituencyMandates = {
        "Østfold": 9,
        "Akershus": 19,
        "Oslo": 21,
        "Hedmark": 7,
        "Oppland": 6,
        "Buskerud": 9,
        "Vestfold": 8,
        "Telemark": 6,
        "Aust-Agder": 4,
        "Vest-Agder": 6,
        "Rogaland": 15,
        "Hordaland": 17,
        "Sogn og Fjordane": 4,
        "Møre og Romsdal": 9,
        "Sør-Trøndelag": 10,
        "Nord-Trøndelag": 4,
        "Nordland": 8, // Fra bildet
        "Troms": 5,   // Fra bildet
        "Finnmark": 2 // Fra bildet
        // Legg til flere her hvis 'candidates.json' inneholder flere/andre navn
    };
    // *** SLUTT PÅ NYTT OBJEKT ***


    // DOM-element referanser
    const constituencyFilter = document.getElementById('constituency-filter');
    const partyFilter = document.getElementById('party-filter');
    const realisticChanceFilter = document.getElementById('realistic-chance-filter');
    const nameSearch = document.getElementById('name-search');
    const candidateGrid = document.getElementById('candidate-grid');
    const candidateCount = document.getElementById('candidate-count');
    const loader = candidateGrid ? candidateGrid.querySelector('.loader') : null;

    // --- Datainnlasting (uendret) ---
    function loadData() {
        console.log("Candidates JS: Loading data...");
        if (!loader) {
            console.error("Candidates JS: Loader element not found.");
            candidateGrid.innerHTML = '<p class="error">Kritisk feil: Kan ikke vise lasteindikator.</p>';
            return;
        }
        loader.style.display = 'block';

        Promise.all([
            fetch('data/candidates.json')
                .then(response => response.ok ? response.json() : Promise.reject('Failed to load candidates.json')),
            window.partiesDataLoaded && window.partiesData
                ? Promise.resolve(window.partiesData)
                : fetch('data/parties.json').then(response => response.ok ? response.json() : Promise.reject('Failed to load parties.json'))
        ])
        .then(([candidates, parties]) => {
            console.log("Candidates JS: Data fetched successfully.");
            allCandidatesData = candidates;

            if (Object.keys(partiesMap).length === 0) {
                parties.forEach(p => { partiesMap[p.shorthand] = p; });
                window.partiesData = parties;
                window.partiesDataLoaded = true;
                console.log("Candidates JS: partiesMap created from fetch.");
            } else {
                 console.log("Candidates JS: Using pre-loaded partiesMap.");
            }

            if (!Array.isArray(allCandidatesData)) {
                throw new Error("Candidates data is not an array.");
            }

            const constituencyNames = [...new Set(allCandidatesData.map(c => c.constituencyName))].sort();
            const uniquePartyShorthands = [...new Set(allCandidatesData.flatMap(c => c.parties.map(p => p.partyShorthand)))];
             const partiesInCandidates = uniquePartyShorthands
                .map(sh => partiesMap[sh])
                .filter(Boolean)
                .sort((a, b) => (a.position || 99) - (b.position || 99));

            populateConstituencyFilter(constituencyNames);
            populatePartyFilter(partiesInCandidates);
            setupEventListeners();
            filterAndDisplayCandidates();
        })
        .catch(error => {
            console.error("Candidates JS: Error loading data:", error);
            if (candidateGrid) {
                 candidateGrid.innerHTML = `<p class="error">Kunne ikke laste kandidatdata: ${error.message}. Prøv å laste siden på nytt.</p>`;
            }
        })
        .finally(() => {
             setTimeout(() => {
                if(loader) loader.style.display = 'none';
            }, 100);
        });
    }
     // Vent på partidata (uendret)
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

    // --- Event Listeners (uendret) ---
    function setupEventListeners() { /* ... uendret ... */
        constituencyFilter?.addEventListener('change', filterAndDisplayCandidates);
        partyFilter?.addEventListener('change', filterAndDisplayCandidates);
        realisticChanceFilter?.addEventListener('change', filterAndDisplayCandidates);
        nameSearch?.addEventListener('input', debounce(filterAndDisplayCandidates, 300));

        candidateGrid.addEventListener('click', (event) => {
             const card = event.target.closest('.candidate-card[data-candidate-info]');
             if (card) {
                 try {
                     const info = JSON.parse(card.dataset.candidateInfo);
                     const partyInfo = JSON.parse(card.dataset.partyInfo);
                     showCandidateDetails(info, partyInfo);
                 } catch (e) { console.error("Failed to parse candidate info from card:", e); }
             }
         });

         const modal = document.getElementById('candidate-detail-modal');
         const closeBtn = document.getElementById('close-candidate-modal');
         closeBtn?.addEventListener('click', () => modal.style.display = 'none');
         modal?.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
    }

    // --- Filtering Logic (uendret) ---
    function filterAndDisplayCandidates() { /* ... uendret ... */
        if (!candidateGrid) return;
        console.log("Candidates JS: Filtering candidates...");
        const selectedConstituency = constituencyFilter?.value || 'all';
        const selectedParty = partyFilter?.value || 'all';
        const showOnlyRealistic = realisticChanceFilter?.checked || false;
        const searchTerm = nameSearch?.value.toLowerCase().trim() || '';

        let filteredCandidates = [];
        allCandidatesData.forEach(constituency => {
            if (selectedConstituency === 'all' || constituency.constituencyName === selectedConstituency) {
                constituency.parties.forEach(party => {
                    if (selectedParty === 'all' || party.partyShorthand === selectedParty) {
                        party.candidates.forEach(candidate => {
                            let include = true;
                            if (showOnlyRealistic && !candidate.hasRealisticChance) include = false;
                            if (searchTerm && !candidate.name.toLowerCase().includes(searchTerm)) include = false;
                            if (include) {
                                filteredCandidates.push({ ...candidate, constituencyName: constituency.constituencyName, partyShorthand: party.partyShorthand, partyName: party.partyName });
                            }
                        });
                    }
                });
            }
        });

        filteredCandidates.sort((a, b) => {
             if (a.constituencyName !== b.constituencyName) return a.constituencyName.localeCompare(b.constituencyName);
             const partyAInfo = partiesMap[a.partyShorthand] || { position: 99 };
             const partyBInfo = partiesMap[b.partyShorthand] || { position: 99 };
             if (partyAInfo.position !== partyBInfo.position) return partyAInfo.position - partyBInfo.position;
             return a.rank - b.rank;
         });

        displayCandidates(filteredCandidates);
    }

    // --- Display Logic (MODIFISERT med mandattall i separator) ---
    function displayCandidates(candidates) {
        if (!candidateGrid) return;
        candidateGrid.innerHTML = ''; // Tøm

        if (candidates.length === 0) {
            candidateGrid.innerHTML = '<p class="no-results">Ingen kandidater funnet med de valgte filtrene.</p>';
            if (candidateCount) candidateCount.textContent = '0';
            return;
        }

        if (candidateCount) candidateCount.textContent = candidates.length;

        let currentConstituency = null;

        candidates.forEach(candidate => {
            const partyInfo = partiesMap[candidate.partyShorthand];
            if (!partyInfo) {
                 console.warn(`Skipping candidate card for ${candidate.name} because party info for ${candidate.partyShorthand} is missing.`);
                 return;
            }

            // Sjekk om valgkretsen har endret seg
            if (candidate.constituencyName !== currentConstituency) {
                const separator = document.createElement('div');
                separator.className = 'constituency-separator';

                // *** NYTT: Hent mandattall og legg til i teksten ***
                const mandateCount = constituencyMandates[candidate.constituencyName];
                const mandateText = typeof mandateCount === 'number' ? `(${mandateCount} mandater)` : '(mandattall ukjent)';
                separator.innerHTML = `
                    <span class="constituency-name">${candidate.constituencyName}</span>
                    <span class="mandate-count">${mandateText}</span>
                `;
                // *** SLUTT PÅ NYTT INNHOLD ***

                candidateGrid.appendChild(separator);
                currentConstituency = candidate.constituencyName;
            }

            const card = createCandidateCard(candidate, partyInfo);
            candidateGrid.appendChild(card);
        });
         console.log(`Candidates JS: Displayed ${candidates.length} candidates with separators.`);
    }

    // --- Card Creation (uendret fra forrige versjon) ---
    function createCandidateCard(candidate, partyInfo) { /* ... uendret ... */
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

   // --- Modal for Candidate Details (KORRIGERT VERSJON) ---
     function showCandidateDetails(candidate, partyInfo) {
         const modal = document.getElementById('candidate-detail-modal');
         const content = document.getElementById('candidate-detail-content');
         if (!modal || !content) {
              console.error("Modal or modal content not found!");
              return;
         }

         // Bygg HTML-innholdet for modalen
         content.innerHTML = `
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

         modal.style.display = 'block'; // Viser modalen
         // modal.classList.add('active'); // Alternativ hvis du bruker 'active' klasse for å vise
     }

    // --- Helper Functions (uendret) ---
    function debounce(func, wait) { /* ... uendret ... */
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

}); // End DOMContentLoaded
