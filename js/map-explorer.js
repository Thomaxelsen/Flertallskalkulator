document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded (Hardcoded Block Colors)");

    // --- START: Definisjoner og HARDKODET Blokk-resultat ---
    const blockColors = {
        Left: '#ed1b34',    // Rød (AP's farge)
        Right: '#007ac8',   // Blå (Høyre's farge)
        Tie: '#a9a9a9'     // Nøytral Grå (DarkGray)
    };
    const blockOpacity = 0.7;

    // Resultat fra forhåndsberegning basert på candidates.json
    const hardcodedBlockLeanings = {
        "Aust-Agder": "Right",
        "Akershus": "Right",
        "Buskerud": "Left",
        "Finnmark": "Left",
        "Hedmark": "Left",
        "Hordaland": "Right",
        "Møre og Romsdal": "Left",
        "Nord-Trøndelag": "Left",
        "Nordland": "Left",
        "Oppland": "Left",
        "Oslo": "Left",
        "Rogaland": "Right",
        "Sogn og Fjordane": "Tie",
        "Sør-Trøndelag": "Left",
        "Telemark": "Left",
        "Troms": "Left",
        "Vest-Agder": "Right",
        "Vestfold": "Tie",
        "Østfold": "Right"
     };
    // --- SLUTT: Definisjoner ---

    // Globale variabler
    let allCandidatesData = null; // Trengs fortsatt for sidepanelet
    let partiesMap = {};
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping og Mandater (uendret)
    const geoJsonNameMapping = {
        "Nordland – Nordlánnda": "Nordland",
        "Troms – Romsa – Tromssa": "Troms",
        "Finnmark – Finnmárku – Finmarkku": "Finnmark"
    };
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
    };

    // DOM referanser (hentes NÅ INNI DOMContentLoaded)
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');
    const modalElement = document.getElementById('candidate-modal');
    // ----- FIKS: Hent og legg til listener ETTER at DOM er klar -----
    let modalCloseButton = null; 
    if (modalElement) { // Sjekk om modal finnes før vi leter inni den
        modalCloseButton = modalElement.querySelector('.modal-close-button');
        if (modalCloseButton) {
             modalCloseButton.addEventListener('click', closeModal);
        } else {
             console.warn("Modal close button (.modal-close-button) not found inside #candidate-modal.");
        }
        // Listener for klikk utenfor modal
        window.addEventListener('click', (event) => { if (event.target === modalElement) closeModal(); });
    } else {
         console.warn("Modal element (#candidate-modal) not found.");
    }
    // ---------------------------------------------------------------

    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Modal Funksjoner (uendret) ---
    function showCandidateDetails(candidateData, partyInfo) { /* ... (som før) ... */ }
    function closeModal() { if (modalElement) modalElement.style.display = 'none'; }
    // --- Slutt Modal ---

    // Hjelpefunksjon for å laste JSON (uendret)
    async function loadJson(url) { /* ... (som før) ... */ }

    // Hovedfunksjon for datalasting (NÅ UTEN kall til calculateBlockLeanings)
    async function loadData() {
        if (loader) loader.style.display = 'block';
        else console.error("Map loader element not found!");

        partiesMap = {}; // Nullstill
        // Last partidata (som før)
        if (!window.partiesDataLoaded) { /* ... (kode for å vente/hente partidta) ... */ }
        if (window.partiesData) { window.partiesData.forEach(p => partiesMap[p.shorthand] = p); }
        if (!partiesMap || Object.keys(partiesMap).length === 0) { /* ... (kritisk feilhåndtering) ... */ return; }

        try {
            console.log("Map Explorer: Loading candidates and GeoJSON...");
            // Laster fortsatt candidates.json for sidepanelet
            const [candidates, geoJson] = await Promise.all([
                loadJson('data/candidates.json'),
                loadJson(geoJsonPath)
            ]);
            allCandidatesData = candidates; // Lagre for sidepanelet
            geoJsonData = geoJson;
            console.log("Map Explorer: Candidates and GeoJSON loaded.");

            // Ingen blokk-beregning her lenger

            initMapExplorer(); // Gå direkte til kartinit

        } catch (error) {
            console.error("Map Explorer: Error loading main data (candidates/GeoJSON):", error);
            if(listContent) listContent.innerHTML = `<p class="error">Kunne ikke laste kart- eller kandidatdata: ${error.message}</p>`;
            initMapExplorer(false); // Prøv å initialisere kartet uten GeoJSON ved feil
        }
        finally {
            console.log("Map Explorer: Hiding loader.");
            if (loader) loader.style.display = 'none';
        }
    }

    // Kart initialisering (Bruker nå hardkodet data i styleFeature)
    function initMapExplorer() { // Fjernet flagget, legger alltid til GeoJSON hvis data finnes
         console.log(`Map Explorer: Initializing map...`);
         if (!mapContainer) { console.error("Map container element not found!"); return; }
         if (map) { map.remove(); map = null; }

         try {
             map = L.map(mapContainer).setView([64.5, 17.5], 4.5);
             console.log("Map Explorer: L.map object created.");

             L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { /* ... */ }).addTo(map);
             console.log("Map Explorer: Base map tiles added.");

             // Legg til GeoJSON laget (hvis data finnes)
             if (geoJsonData) {
                 let features = geoJsonData?.Valgdistrikt?.features || geoJsonData?.features;
                 if (features && Array.isArray(features) && features.length > 0) {
                     console.log("Map Explorer: Adding GeoJSON layer using hardcoded block colors...");
                     geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                         style: styleFeature, // Denne bruker nå hardcodedBlockLeanings
                         onEachFeature: onEachFeature
                     }).addTo(map);
                     console.log("Map Explorer: GeoJSON layer added.");

                     try { /* ... (fitBounds logikk som før) ... */ } 
                     catch(e) { console.error("Map Explorer: Error getting or fitting bounds:", e); }
                 } else {
                     console.warn("Map Explorer: No valid GeoJSON features found.");
                     if (listContent) listContent.innerHTML = '<p class="error">Fant ingen data for valgdistrikter.</p>';
                 }
             } else {
                  console.warn("Map Explorer: geoJsonData is missing, cannot add district layer.");
                  if (listContent) listContent.innerHTML = '<p class="error">Kunne ikke laste data for valgdistrikter.</p>';
             }

            console.log("Map Explorer: Map initialization complete.");
             if (listContent && listContent.innerHTML === '') { 
                 listContent.innerHTML = '<p>Klikk på en valgkrets på kartet for å se kandidatene.</p>';
             }

         } catch (initError) { /* ... (feilhåndtering) ... */ }
    }

    // --- Kart interaksjon (MODIFISERT: Bruker hardcoded data) ---

    // StyleFeature bruker nå hardkodet objekt
    function styleFeature(feature) {
        const defaultStyle = {
            fillColor: blockColors.Tie, weight: 1, opacity: 1, color: 'white', fillOpacity: blockOpacity
        };
        if (feature.properties?.valgdistriktsnavn) {
            const rawName = feature.properties.valgdistriktsnavn;
            const constituencyName = geoJsonNameMapping[rawName] || rawName;
            // ----- FIKS: Bruker hardcoded data -----
            const leaning = hardcodedBlockLeanings[constituencyName]; 
            // -------------------------------------
            if (leaning === "Left") defaultStyle.fillColor = blockColors.Left;
            else if (leaning === "Right") defaultStyle.fillColor = blockColors.Right;
        }
        return defaultStyle;
    }

    function onEachFeature(feature, layer) { /* ... (som før, bindTooltip etc.) ... */ }
    function highlightFeature(e) { /* ... (som før) ... */ }
    // resetHighlight bruker også styleFeature, som nå bruker hardkodet data
    function resetHighlight(e) { /* ... (som før) ... */ }
    // zoomAndShowCandidates bruker også styleFeature for reset
    function zoomAndShowCandidates(e) { /* ... (som før) ... */ }

    // --- Kandidatvisning (Uendret) ---
    function displayCandidatesForConstituency(constituencyName) { /* ... (som før) ... */ }
    function displayPartyCandidates(mainUl, partyInfo, candidatesData) { /* ... (som før) ... */ }

    // --- Initialiser ved å laste data ---
    loadData();

}); // Slutt på DOMContentLoaded
