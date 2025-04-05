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

    // DOM referanser (inkl modal)
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');
    const modalElement = document.getElementById('candidate-modal');
    const modalCloseButton = modalElement?.querySelector('.modal-close-button');
    const modalCandidateName = document.getElementById('modal-candidate-name');
    const modalCandidateParty = document.getElementById('modal-candidate-party');
    const modalCandidateAge = document.getElementById('modal-candidate-age');
    const modalCandidateLocation = document.getElementById('modal-candidate-location');
    const modalCandidateEmail = document.getElementById('modal-candidate-email');
    const modalCandidatePhone = document.getElementById('modal-candidate-phone');

    // Sti til GeoJSON
    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Modal Funksjoner ---
    function showCandidateDetails(candidateData, partyInfo) {
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
    async function loadJson(url) { /* ... */ try { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); } catch (e) { console.error(`Workspace ${url} failed:`, e); throw e; } }
    async function loadData() {
        if (loader) loader.style.display = 'block';
        if (!window.partiesData) { const p = new Promise((res, rej) => { /* ... */ }); partiesMap = await p; } else { partiesMap = window.partiesData; }
        if (!partiesMap) { console.error("Failed parties load"); return; }
        try {
            const [candidates, geoJson] = await Promise.all([loadJson('data/candidates.json'), loadJson(geoJsonPath)]);
            allCandidatesData = candidates; geoJsonData = geoJson;
            console.log("Map Explorer: All data loaded.");
            initMapExplorer();
        } catch (error) { console.error("Map Explorer: Error loading data:", error); }
        finally { if (loader) loader.style.display = 'none'; }
    }

    // Kart initialisering (som før)
    function initMapExplorer() { /* ... uendret ... */
        if (!mapContainer) { console.error("Map container missing"); return; }
        if (map) { map.remove(); map = null; }
        map = L.map(mapContainer).setView([64.5, 17.5], 4.5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OSM contributors' }).addTo(map);
        let features = geoJsonData?.Valgdistrikt?.features || geoJsonData?.features;
        if (features?.length > 0) {
            geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, { style: styleFeature, onEachFeature: onEachFeature }).addTo(map);
            try { if (geoJsonLayer.getBounds().isValid()) map.fitBounds(geoJsonLayer.getBounds()); } catch(e) {}
        } else { console.error("No valid GeoJSON features found."); }
    }

    // Kart interaksjon (som før)
    function styleFeature(feature) { return { fillColor: '#d9d9d9', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.6 }; }
    function onEachFeature(feature, layer) { if (feature.properties?.valgdistriktsnavn) layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: zoomAndShowCandidates }); }
    function highlightFeature(e) { const l = e.target; l.setStyle({ weight: 3, color: '#666', fillOpacity: 0.8 }); if (!L.Browser.ie) l.bringToFront(); }
    function resetHighlight(e) { if (geoJsonLayer && e.target !== selectedLayer) geoJsonLayer.resetStyle(e.target); }
    function zoomAndShowCandidates(e) { /* ... uendret ... */
        const layer = e.target;
        if (selectedLayer && geoJsonLayer) try { geoJsonLayer.resetStyle(selectedLayer); } catch (err) {}
        layer.setStyle({ fillColor: '#add8e6', fillOpacity: 0.9 }); layer.bringToFront(); selectedLayer = layer;
        const rawName = layer.feature.properties.valgdistriktsnavn;
        const constituencyName = geoJsonNameMapping[rawName] || rawName;
        if (constituencyName) displayCandidatesForConstituency(constituencyName, rawName);
        else console.error("Could not get constituency name");
    }

    // Vise kandidater (hovedlogikk som før)
    function displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON) {
        console.log("Map Explorer: Displaying candidates for:", constituencyName);
        if (!allCandidatesData || !partiesMap) return;
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];
        const panelTitle = displayPanel?.querySelector('h2');
        if (panelTitle) panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '('+mandateCount+' mandater)' : '(ukjent)'}`;
        if (!constituencyData?.parties?.length) { listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`; return; }
        listContent.innerHTML = '';
        const sortedParties = constituencyData.parties.sort((a, b) => { /* ... sortering som før ... */
            const pA = partiesMap[a.partyShorthand]; const pB = partiesMap[b.partyShorthand];
            const posA = pA?.position ?? Infinity; const posB = pB?.position ?? Infinity;
            if (posA === posB) return (pA?.name || a.partyName || '').localeCompare(pB?.name || b.partyName || '');
            return posA - posB; });
        const ul = document.createElement('ul'); ul.className = 'candidate-list-by-party';
        sortedParties.forEach(partyData => {
            const partyKey = partyData.partyShorthand; if (!partyData || !partyKey) return;
            let partyInfo = partiesMap[partyKey] || { name: partyData.partyName || `Ukjent (${partyKey})`, color: '#ccc', logo: null };
            // Kall OPPDATERT hjelpefunksjon
            displayPartyCandidates(ul, partyInfo, partyData.candidates);
        });
        listContent.appendChild(ul);
        if (displayPanel) { displayPanel.scrollTop = 0; }
    }

    // === START: OPPDATERT displayPartyCandidates ===
    // Hjelpefunksjon for å bygge HTML for ett parti og dets kandidater
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

                     // Sett partifarge som top-border dynamisk
                     candidateLi.style.borderTop = `4px solid ${partyInfo.color || '#ccc'}`;

                     // Bygg innerHTML for kortet - NÅ MED location og struktur for styling
                     candidateLi.innerHTML = `
                         <div class="card-rank-container">
                              <span class="candidate-rank">${candidate.rank || '?'}</span>
                         </div>
                         <div class="card-details-container">
                              <span class="candidate-name">${candidate.name}</span>
                              ${candidate.location ? `<span class="candidate-location">${candidate.location}</span>` : ''}
                         </div>
                         ${candidate.hasRealisticChance ? `<div class="card-star-container"><span class="realistic-chance-indicator" title="Vurdert til å ha realistisk sjanse for å komme inn">★</span></div>` : ''}
                     `;

                     // Legg til klikk-lytter
                     candidateLi.addEventListener('click', () => {
                         showCandidateDetails(candidate, partyInfo);
                     });

                     candidateUl.appendChild(candidateLi);
                 } else { console.warn('Skipping invalid candidate entry:', candidate); }
             });
         } else { console.warn(`'candidates' not an array for party: ${partyInfo.name}`); }
         partyLi.appendChild(candidateUl);
         mainUl.appendChild(partyLi);
    }
    // === SLUTT: OPPDATERT displayPartyCandidates ===

    // Kall hovedfunksjonen
    loadData();
});
