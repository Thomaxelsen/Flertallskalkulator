document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded");

    // Globale variabler for data og kartobjekter
    let allCandidatesData = null;
    let partiesMap = null; // Bruker den globale fra partiesData.js hvis tilgjengelig
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping fra GeoJSON-navn til standardnavn
    const geoJsonNameMapping = {
        "Nordland – Nordlánnda": "Nordland",
        "Troms – Romsa – Tromssa": "Troms",
        "Finnmark – Finnmárku – Finmarkku": "Finnmark"
    };

    // Mandatfordeling
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
    };


    // DOM element referanser (inkludert nye for modal)
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');

    // === START: Modal Element Referanser ===
    const modalElement = document.getElementById('candidate-modal');
    const modalCloseButton = modalElement?.querySelector('.modal-close-button');
    const modalCandidateName = document.getElementById('modal-candidate-name');
    const modalCandidateParty = document.getElementById('modal-candidate-party');
    const modalCandidateAge = document.getElementById('modal-candidate-age');
    const modalCandidateLocation = document.getElementById('modal-candidate-location');
    const modalCandidateEmail = document.getElementById('modal-candidate-email');
    const modalCandidatePhone = document.getElementById('modal-candidate-phone');
    // === SLUTT: Modal Element Referanser ===

    // Sti til GeoJSON-filen
    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Funksjoner for Modal --- START ---
    function showCandidateDetails(candidateData, partyInfo) {
        if (!modalElement || !candidateData || !partyInfo) {
            console.error("Modal elements or data missing", { modalElement, candidateData, partyInfo });
            return;
        }

        // Fyll inn data i modalen
        if (modalCandidateName) modalCandidateName.textContent = candidateData.name || 'Ukjent navn';
        if (modalCandidateParty) modalCandidateParty.textContent = partyInfo.name || 'Ukjent parti';
        if (modalCandidateAge) modalCandidateAge.textContent = candidateData.age || 'Ikke oppgitt';
        if (modalCandidateLocation) modalCandidateLocation.textContent = candidateData.location || 'Ikke oppgitt';

        // Gjør e-post klikkbar hvis den finnes
        if (modalCandidateEmail) {
            if (candidateData.email) {
                 modalCandidateEmail.innerHTML = `<a href="mailto:${candidateData.email}">${candidateData.email}</a>`;
             } else {
                modalCandidateEmail.textContent = 'Ikke oppgitt';
             }
        }
        // Gjør telefonnr klikkbar hvis det finnes
        if (modalCandidatePhone) {
             if (candidateData.phone) {
                 modalCandidatePhone.innerHTML = `<a href="tel:${candidateData.phone}">${candidateData.phone}</a>`;
             } else {
                modalCandidatePhone.textContent = 'Ikke oppgitt';
             }
        }
        // Vis modalen
        modalElement.style.display = 'block';
    }

    function closeModal() {
        if (modalElement) modalElement.style.display = 'none';
    }

    // Legg til lytter for lukkeknappen (sjekk at knappen finnes)
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', closeModal);
    } else {
        console.warn("Modal close button not found.");
    }

    // Legg til lytter for å lukke ved klikk utenfor modalens innhold
    window.addEventListener('click', (event) => {
        if (event.target === modalElement) { // Klikket på bakgrunnen
            closeModal();
        }
    });
    // --- Funksjoner for Modal --- SLUTT ---


    // Hjelpefunksjon for å laste JSON-data
    async function loadJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} for ${url}`);
            return await response.json();
        } catch (error) { console.error(`Could not fetch ${url}:`, error); throw error; }
    }

    // Hovedfunksjon for å laste all nødvendig data
    async function loadData() {
        if (loader) loader.style.display = 'block';
        // ... (PartiesMap loading remains the same) ...
        if (typeof partiesDataLoaded === 'undefined' || !window.partiesData) {
            const partiesPromise = new Promise((resolve, reject) => {
                if (window.partiesData) { resolve(window.partiesData); return; }
                const listener = () => { resolve(window.partiesData); window.removeEventListener('partiesDataLoaded', listener); };
                window.addEventListener('partiesDataLoaded', listener);
                setTimeout(() => { window.removeEventListener('partiesDataLoaded', listener); if (!window.partiesData) { loadJson('data/parties.json').then(resolve).catch(reject); } else { resolve(window.partiesData); } }, 2000);
            });
            partiesMap = await partiesPromise;
        } else { partiesMap = window.partiesData; }
        if (!partiesMap) { console.error("Map Explorer: Failed parties data load."); /* ... feilhåndtering ... */ return; }

        try {
            const [candidates, geoJson] = await Promise.all([ loadJson('data/candidates.json'), loadJson(geoJsonPath) ]);
            allCandidatesData = candidates;
            geoJsonData = geoJson;
            console.log("Map Explorer: All data loaded successfully.");
            initMapExplorer();
        } catch (error) { console.error("Map Explorer: Error loading initial data:", error); /* ... feilhåndtering ... */ }
        finally { if (loader) loader.style.display = 'none'; }
    }


    // Funksjon for å initialisere kartutforskeren (som før)
    function initMapExplorer() {
        if (!mapContainer) { console.error("Map Explorer: Map container not found!"); return; }
        if (map) { map.remove(); map = null; }
        map = L.map(mapContainer).setView([64.5, 17.5], 4.5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
        let features = geoJsonData?.features;
        if (!features && geoJsonData?.Valgdistrikt?.features) features = geoJsonData.Valgdistrikt.features;
        if (features?.length > 0) {
            geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, { style: styleFeature, onEachFeature: onEachFeature }).addTo(map);
            try { if (geoJsonLayer.getBounds().isValid()) map.fitBounds(geoJsonLayer.getBounds()); } catch(e) { console.error("Map Explorer: Error fitting bounds:", e); }
        } else { console.error("Map Explorer: No valid GeoJSON features found."); }
    }

    // Style/OnEachFeature/Highlight/ResetHighlight (som før)
    function styleFeature(feature) { return { fillColor: '#d9d9d9', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.6 }; }
    function onEachFeature(feature, layer) { if (feature.properties?.valgdistriktsnavn) layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: zoomAndShowCandidates }); }
    function highlightFeature(e) { const layer = e.target; layer.setStyle({ weight: 3, color: '#666', fillOpacity: 0.8 }); if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront(); }
    function resetHighlight(e) { if (geoJsonLayer && e.target !== selectedLayer) geoJsonLayer.resetStyle(e.target); }

    // zoomAndShowCandidates (som før)
    function zoomAndShowCandidates(e) {
        const layer = e.target;
        if (selectedLayer && geoJsonLayer) try { geoJsonLayer.resetStyle(selectedLayer); } catch (err) {}
        layer.setStyle({ fillColor: '#add8e6', fillOpacity: 0.9 }); layer.bringToFront(); selectedLayer = layer;
        const rawNameFromGeoJSON = layer.feature.properties.valgdistriktsnavn;
        let lookupName = geoJsonNameMapping[rawNameFromGeoJSON] || rawNameFromGeoJSON;
        const constituencyName = lookupName;
        if (constituencyName) {
            console.log(`Map Explorer JS: Using lookup name: '${constituencyName}' (original: '${rawNameFromGeoJSON}')`);
            displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON);
        } else { console.error("Map Explorer JS: Could not determine constituency name!"); /* ... feilhåndtering ... */ }
    }

    // Funksjon for å vise kandidater (hovedlogikk som før)
    function displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON) {
        console.log("Map Explorer: Displaying candidates for:", constituencyName);
        if (!allCandidatesData || !partiesMap) { /* ... feilhåndtering ... */ return; }
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];
        const panelTitle = displayPanel?.querySelector('h2');
        if (panelTitle) panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '('+mandateCount+' mandater)' : '(ukjent)'}`;
        if (!constituencyData?.parties?.length) { /* ... feilhåndtering ... */ listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`; return; }
        listContent.innerHTML = '';
        const sortedParties = constituencyData.parties.sort((a, b) => { /* ... sorteringslogikk ... */
            const partyAInfo = partiesMap[a.partyShorthand]; const partyBInfo = partiesMap[b.partyShorthand];
            const posA = partyAInfo ? partyAInfo.position : Infinity; const posB = partyBInfo ? partyBInfo.position : Infinity;
            if (posA === posB) { const nameA = partyAInfo?.name || a.partyName || ''; const nameB = partyBInfo?.name || b.partyName || ''; return nameA.localeCompare(nameB); }
            return posA - posB;
        });
        const ul = document.createElement('ul'); ul.className = 'candidate-list-by-party';
        sortedParties.forEach(partyData => {
            const partyKey = partyData.partyShorthand;
            if (!partyData || !partyKey) { console.warn('Skipping invalid party entry:', partyData); return; }
            let partyInfo = partiesMap[partyKey];
            if (!partyInfo) {
                console.warn(`Party info not found for key: ${partyKey}. Using fallback.`);
                partyInfo = { name: partyData.partyName || `Ukjent (${partyKey})`, color: '#ccc', logo: null }; // Fallback uten logo
            }
            // Kall hjelpefunksjon som nå legger til event listener
            displayPartyCandidates(ul, partyInfo, partyData.candidates);
        });
        listContent.appendChild(ul);
        if (displayPanel) { displayPanel.scrollTop = 0; }
    }

    // === OPPDATERT Hjelpefunksjon - NÅ MED EVENT LISTENER ===
    function displayPartyCandidates(mainUl, partyInfo, candidatesData) {
         const partyLi = document.createElement('li');
         partyLi.className = 'party-candidate-group';
         const partyHeader = document.createElement('div');
         partyHeader.className = 'party-header';
         partyHeader.style.backgroundColor = partyInfo.color || '#ccc';
         partyHeader.innerHTML = `<h3>${partyInfo.name}</h3>`; // Uten logo
         partyLi.appendChild(partyHeader);
         const candidateUl = document.createElement('ul');
         candidateUl.className = 'candidates-in-group';
         if (Array.isArray(candidatesData)) {
             candidatesData.forEach(candidate => {
                 if (candidate?.name) {
                     const candidateLi = document.createElement('li');
                     candidateLi.className = 'map-candidate-card'; // Kort-klassen
                     candidateLi.innerHTML = `
                         <span class="candidate-rank">${candidate.rank || '?'}.</span>
                         <span class="candidate-name">${candidate.name}</span>
                         ${candidate.hasRealisticChance ? '<span class="realistic-chance-indicator" title="Vurdert til å ha realistisk sjanse for å komme inn">★</span>' : ''}
                     `;
                     // === VIKTIG: Legg til klikk-lytter ===
                     candidateLi.addEventListener('click', () => {
                         showCandidateDetails(candidate, partyInfo); // Kall modal-funksjonen
                     });
                     // =====================================
                     candidateUl.appendChild(candidateLi);
                 } else { console.warn('Skipping invalid candidate entry:', candidate); }
             });
         } else { console.warn(`'candidates' not an array for party: ${partyInfo.name}`); }
         partyLi.appendChild(candidateUl);
         mainUl.appendChild(partyLi);
    }
    // === SLUTT OPPDATERT HJELPEFUNKSJON ===

    // Kall hovedfunksjonen for å starte lasting av data
    loadData();

});
