document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded");

    // Globale variabler
    let allCandidatesData = null;
    let partiesMap = null;
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping GeoJSON -> Standard navn
    const geoJsonNameMapping = { /* ... som før ... */
        "Nordland – Nordlánnda": "Nordland", "Troms – Romsa – Tromssa": "Troms", "Finnmark – Finnmárku – Finmarkku": "Finnmark" };

    // Mandatfordeling
    const constituencyMandates = { /* ... som før ... */
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6, "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6, "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8, "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4 };

    // DOM referanser (inkl modal)
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');
    const modalElement = document.getElementById('candidate-modal');
    const modalCloseButton = modalElement?.querySelector('.modal-close-button');
    const modalCandidateName = document.getElementById('modal-candidate-name'); // etc. for alle modal-felter...
    const modalCandidateParty = document.getElementById('modal-candidate-party');
    const modalCandidateAge = document.getElementById('modal-candidate-age');
    const modalCandidateLocation = document.getElementById('modal-candidate-location');
    const modalCandidateEmail = document.getElementById('modal-candidate-email');
    const modalCandidatePhone = document.getElementById('modal-candidate-phone');

    // Sti til GeoJSON
    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Modal Funksjoner (som før) ---
    function showCandidateDetails(candidateData, partyInfo) { /* ... uendret ... */
        if (!modalElement || !candidateData || !partyInfo) return;
        if (modalCandidateName) modalCandidateName.textContent = candidateData.name || 'Ukjent';
        if (modalCandidateParty) modalCandidateParty.textContent = partyInfo.name || 'Ukjent';
        if (modalCandidateAge) modalCandidateAge.textContent = candidateData.age || 'Ukjent';
        if (modalCandidateLocation) modalCandidateLocation.textContent = candidateData.location || 'Ukjent';
        if (modalCandidateEmail) modalCandidateEmail.innerHTML = candidateData.email ? `<a href="mailto:${candidateData.email}">${candidateData.email}</a>` : 'Ikke oppgitt';
        if (modalCandidatePhone) modalCandidatePhone.innerHTML = candidateData.phone ? `<a href="tel:${candidateData.phone}">${candidateData.phone}</a>` : 'Ikke oppgitt';
        modalElement.style.display = 'block';
     }
    function closeModal() { if (modalElement) modalElement.style.display = 'none'; }
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modalElement) closeModal(); });
    // --- Slutt Modal Funksjoner ---

    // Lasting av data (som før)
    async function loadJson(url) { /* ... uendret ... */ try{const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}catch(e){console.error(`Workspace ${url} failed:`,e);throw e;}}
    async function loadData() {
        if (loader) loader.style.display = 'block';
        if (!window.partiesData) {
             console.log("Map Explorer: Waiting for partiesData..."); // Logg venting
             const partiesPromise = new Promise((resolve, reject) => { /* ... timeout logic som før ... */ });
             partiesMap = await partiesPromise;
             console.log("Map Explorer: partiesData received/loaded:", partiesMap ? 'OK' : 'FAILED'); // Logg resultat
        } else {
            partiesMap = window.partiesData;
            console.log("Map Explorer: Using existing global partiesData.");
        }
        if (!partiesMap) { console.error("Failed parties load"); return; }
        try {
            const [candidates, geoJson] = await Promise.all([loadJson('data/candidates.json'), loadJson(geoJsonPath)]);
            allCandidatesData = candidates; geoJsonData = geoJson;
            console.log("Map Explorer: Candidate and GeoJSON data loaded.");
            initMapExplorer();
        } catch (error) { console.error("Map Explorer: Error loading data:", error); }
        finally { if (loader) loader.style.display = 'none'; }
    }

    // Kart initialisering (som før)
    function initMapExplorer() { /* ... uendret ... */ }

    // Kart interaksjon (som før)
    function styleFeature(feature) { return { fillColor: '#d9d9d9', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.6 }; }
    function onEachFeature(feature, layer) { if (feature.properties?.valgdistriktsnavn) layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: zoomAndShowCandidates }); }
    function highlightFeature(e) { /* ... */ }
    function resetHighlight(e) { /* ... */ }
    function zoomAndShowCandidates(e) { /* ... uendret ... */ }

    // === START: Oppdatert Vise kandidater med MER LOGGING ===
    function displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON) {
        console.log("--- Starting displayCandidatesForConstituency for:", constituencyName, "---"); // Start-markør

        // !!! EKSTRA LOGG: Sjekk partiesMap her !!!
        console.log("DEBUG: partiesMap available at start of displayCandidates:", partiesMap ? 'Yes, keys: ' + Object.keys(partiesMap).join(', ') : 'NO / EMPTY');

        if (!allCandidatesData || !partiesMap) { console.error("Data not available."); listContent.innerHTML = '<p>Data mangler.</p>'; return; }

        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];
        const panelTitle = displayPanel?.querySelector('h2');
        if (panelTitle) panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '('+mandateCount+' mandater)' : '(ukjent)'}`;

        if (!constituencyData?.parties?.length) { console.warn(`No party data for ${constituencyName}`); listContent.innerHTML = `<p>Fant ingen kandidatdata.</p>`; return; }

        listContent.innerHTML = '';
        const sortedParties = constituencyData.parties.sort((a, b) => { /* ... sortering ... */ });
        const ul = document.createElement('ul'); ul.className = 'candidate-list-by-party';

        console.log(`DEBUG: Processing ${sortedParties.length} parties for ${constituencyName}`); // Log antall partier

        sortedParties.forEach((partyData, index) => {
            const partyKey = partyData.partyShorthand; // Nøkkelen fra candidates.json
             console.log(`DEBUG [Party ${index+1}/${sortedParties.length}]: Trying key (partyShorthand) >>${partyKey}<<`); // Log nøkkelen

            if (!partyData || !partyKey) { console.warn('Skipping invalid party entry:', partyData); return; }

            let partyInfo = partiesMap ? partiesMap[partyKey] : undefined; // Gjør oppslaget

             // !!! EKSTRA LOGG: Sjekk resultatet av oppslaget !!!
             console.log(`DEBUG [Party ${index+1}]: Lookup result for key "${partyKey}":`, partyInfo ? 'Found object' : 'NOT FOUND');

            if (!partyInfo) {
                console.warn(`Party info not found for key: ${partyKey}. Using fallback.`);
                partyInfo = { name: partyData.partyName || `Ukjent (${partyKey})`, color: '#ccc', logo: null }; // Fallback
            } else {
                 console.log(`DEBUG [Party ${index+1}]: Color found for ${partyKey}: ${partyInfo.color}`); // Logg fargen hvis funnet
            }

            displayPartyCandidates(ul, partyInfo, partyData.candidates);
        });
        listContent.appendChild(ul);
        if (displayPanel) { displayPanel.scrollTop = 0; }
        console.log("--- Finished displayCandidatesForConstituency for:", constituencyName, "---"); // Slutt-markør
    }
     // === SLUTT: Oppdatert Vise kandidater ===


    // === Hjelpefunksjon displayPartyCandidates (som før, bruker partyInfo.color) ===
    function displayPartyCandidates(mainUl, partyInfo, candidatesData) {
         const partyLi = document.createElement('li');
         partyLi.className = 'party-candidate-group';
         const partyHeader = document.createElement('div');
         partyHeader.className = 'party-header';
         // Bruker fargen fra partyInfo (enten funnet eller fallback)
         partyHeader.style.backgroundColor = partyInfo.color || '#ccc';
         partyHeader.innerHTML = `<h3>${partyInfo.name}</h3>`;
         partyLi.appendChild(partyHeader);
         const candidateUl = document.createElement('ul');
         candidateUl.className = 'candidates-in-group';
         if (Array.isArray(candidatesData)) {
             candidatesData.forEach(candidate => {
                 if (candidate?.name) {
                     const candidateLi = document.createElement('li');
                     candidateLi.className = 'map-candidate-card';
                     // Bruker fargen fra partyInfo (enten funnet eller fallback)
                     candidateLi.style.borderTop = `4px solid ${partyInfo.color || '#ccc'}`;
                     candidateLi.innerHTML = `
                         <div class="card-rank-container"><span class="candidate-rank">${candidate.rank || '?'}</span></div>
                         <div class="card-details-container">
                              <span class="candidate-name">${candidate.name}</span>
                              ${candidate.location ? `<span class="candidate-location">${candidate.location}</span>` : ''}
                         </div>
                         ${candidate.hasRealisticChance ? `<div class="card-star-container"><span class="realistic-chance-indicator" title="Vurdert til å ha realistisk sjanse for å komme inn">★</span></div>` : ''}
                     `;
                     candidateLi.addEventListener('click', () => { showCandidateDetails(candidate, partyInfo); });
                     candidateUl.appendChild(candidateLi);
                 } else { console.warn('Skipping invalid candidate entry:', candidate); }
             });
         } else { console.warn(`'candidates' not an array for party: ${partyInfo.name}`); }
         partyLi.appendChild(candidateUl);
         mainUl.appendChild(partyLi);
    }
    // === Slutt hjelpefunksjon ===

    // Kall hovedfunksjonen
    loadData();
});
