document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded (Final Block Coloring Attempt)");

    // --- Definisjoner for Blokk-farging ---
    const blockColors = { /* ... (som før) ... */ };
    const blockOpacity = 0.7;
    const partiesLeft = ['R', 'SV', 'AP', 'SP', 'MDG'];
    const partiesRight = ['H', 'FrP', 'V', 'KrF'];
    let constituencyBlockLeaning = {};
    // --- SLUTT: Definisjoner ---

    // Globale variabler
    let allCandidatesData = null;
    let partiesMap = {};
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping og Mandater (uendret)
    const geoJsonNameMapping = { /* ... */ };
    const constituencyMandates = { /* ... */ };

    // DOM referanser (uendret)
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');
    const modalElement = document.getElementById('candidate-modal');
    /* ... (resten av modal-referansene) ... */
    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Modal Funksjoner (uendret) ---
    function showCandidateDetails(candidateData, partyInfo) { /* ... */ }
    function closeModal() { /* ... */ }
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modalElement) closeModal(); });
    // --- Slutt Modal ---

    // --- Blokk-beregning (uendret - forutsatt at den får et array) ---
    function calculateBlockLeanings(candidatesData) { /* ... (som i forrige versjon, med interne sjekker) ... */
         console.log("Map Explorer: Calculating block leanings...");
         const leanings = {};
         if (!Array.isArray(candidatesData)) {
             console.error("calculateBlockLeanings: Invalid data received (not an array).");
             return leanings; 
         }
         candidatesData.forEach(constituency => {
             if (!constituency || typeof constituency !== 'object' || !constituency.constituencyName || !Array.isArray(constituency.parties)) { return; }
             let countLeft = 0; let countRight = 0;
             constituency.parties.forEach(party => {
                 if (!party || typeof party !== 'object' || !party.partyShorthand || !Array.isArray(party.candidates)) { return; }
                 const isLeft = partiesLeft.includes(party.partyShorthand);
                 const isRight = partiesRight.includes(party.partyShorthand);
                 if (isLeft || isRight) {
                     party.candidates.forEach(candidate => {
                         if (candidate && typeof candidate === 'object' && candidate.hasRealisticChance === true) {
                             if (isLeft) countLeft++; else if (isRight) countRight++;
                         }
                     });
                 }
             });
             if (countLeft > countRight) leanings[constituency.constituencyName] = "Left";
             else if (countRight > countLeft) leanings[constituency.constituencyName] = "Right";
             else leanings[constituency.constituencyName] = "Tie";
         });
         console.log("Map Explorer: Block leanings calculation finished.");
         return leanings;
     }
    // --- Slutt Blokk-beregning ---

    // Hjelpefunksjon for å laste JSON (uendret)
    async function loadJson(url) { /* ... (som før) ... */ }

    // Hovedfunksjon for datalasting (MODIFISERT med tydeligere sjekk og flagg til init)
    async function loadData() {
        if (loader) loader.style.display = 'block';
        else console.error("Map loader element not found!");

        let blockCalculationSuccessful = false; // Flagg for å sende til init

        partiesMap = {}; // Nullstill
        // Last partidata (som før)
        if (!window.partiesDataLoaded) { /* ... (kode for å vente/hente partidta) ... */ }
        if (window.partiesData) { window.partiesData.forEach(p => partiesMap[p.shorthand] = p); }
        if (!partiesMap || Object.keys(partiesMap).length === 0) { /* ... (kritisk feilhåndtering) ... */ return; }

        try {
            console.log("Map Explorer: Loading candidates and GeoJSON...");
            const [candidates, geoJson] = await Promise.all([
                loadJson('data/candidates.json'),
                loadJson(geoJsonPath)
            ]);
            // ----- FIKS: Lagre og SJEKK data grundigere -----
            allCandidatesData = candidates;
            geoJsonData = geoJson;
            console.log("Map Explorer: Candidates and GeoJSON loaded. Type of allCandidatesData:", typeof allCandidatesData, "Is array:", Array.isArray(allCandidatesData));

            if (Array.isArray(allCandidatesData)) {
                constituencyBlockLeaning = calculateBlockLeanings(allCandidatesData);
                blockCalculationSuccessful = true; // Beregning ok
                 console.log("Map Explorer: Block calculation completed successfully.");
            } else {
                console.error("Loaded candidate data is NOT an array! Skipping block calculation.");
                constituencyBlockLeaning = {};
                blockCalculationSuccessful = false; // Beregning feilet
                 // Vis feil i panelet
                 if(listContent) listContent.innerHTML = '<p class="error">Feil format på kandidatdata. Kan ikke fargelegge kretser.</p>';
            }
            // -----------------------------------------------

            // Kall initMapExplorer og send med status for blokk-beregning
            initMapExplorer(blockCalculationSuccessful); 

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

    // Kart initialisering (MODIFISERT: Tar imot flagg for å legge til GeoJSON)
    function initMapExplorer(addGeoJsonLayer = false) { // Default til false
         console.log(`Map Explorer: Initializing map... (addGeoJsonLayer: ${addGeoJsonLayer})`);
         if (!mapContainer) { console.error("Map container element not found!"); return; }
         if (map) { map.remove(); map = null; }

         try {
             map = L.map(mapContainer).setView([64.5, 17.5], 4.5);
             console.log("Map Explorer: L.map object created.");

             L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                 maxZoom: 18,
                 attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
             }).addTo(map);
             console.log("Map Explorer: Base map tiles added.");

             // ----- FIKS: Legg kun til GeoJSON hvis flagget er true OG data finnes -----
             if (addGeoJsonLayer && geoJsonData) {
                 let features = geoJsonData?.Valgdistrikt?.features || geoJsonData?.features;
                 if (features && Array.isArray(features) && features.length > 0) {
                     console.log("Map Explorer: Adding GeoJSON layer with block colors...");
                     geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                         style: styleFeature,
                         onEachFeature: onEachFeature
                     }).addTo(map);
                     console.log("Map Explorer: GeoJSON layer added.");

                     try {
                         const bounds = geoJsonLayer.getBounds();
                         if (bounds.isValid()) {
                              console.log("Map Explorer: Fitting map bounds...");
                              map.fitBounds(bounds, { padding: [10, 10] });
                         } else { console.warn("Map Explorer: GeoJSON layer bounds are not valid."); }
                     } catch(e) { console.error("Map Explorer: Error getting or fitting bounds:", e); }
                 } else {
                     console.warn("Map Explorer: No valid GeoJSON features found, although addGeoJsonLayer was true.");
                     if (listContent) listContent.innerHTML = '<p class="error">Fant ingen data for valgdistrikter.</p>';
                 }
             } else {
                  console.log("Map Explorer: Skipping GeoJSON layer addition based on flag or missing data.");
                  // Hvis vi ikke legger til laget, vis standard melding (hvis panelet er tomt)
                   if (listContent && listContent.innerHTML === '' && !addGeoJsonLayer) {
                        listContent.innerHTML = '<p>Kunne ikke fargelegge kretser. Klikk på kartet for å velge manuelt (kretsdata kan mangle).</p>';
                   } else if (listContent && listContent.innerHTML === '') {
                         listContent.innerHTML = '<p>Klikk på en valgkrets på kartet for å se kandidatene.</p>';
                   }
             }
             //-----------------------------------------------------------------------

            console.log("Map Explorer: Map initialization complete.");

         } catch (initError) {
             console.error("Map Explorer: CRITICAL ERROR during map initialization:", initError);
              if (mapContainer) mapContainer.innerHTML = `<p class="error" style="padding: 20px; text-align: center;">Kunne ikke laste kartet.<br><small>${initError.message}</small></p>`;
              if (listContent) listContent.innerHTML = '';
         }
    }

    // --- Kart interaksjon (uendret fra forrige versjon med farger) ---
    function styleFeature(feature) { /* ... (som før) ... */ }
    function onEachFeature(feature, layer) { /* ... (som før) ... */ }
    function highlightFeature(e) { /* ... (som før) ... */ }
    function resetHighlight(e) { /* ... (som før) ... */ }
    function zoomAndShowCandidates(e) { /* ... (som før) ... */ }

    // --- Kandidatvisning (Uendret) ---
    function displayCandidatesForConstituency(constituencyName) { /* ... (som før) ... */ }
    function displayPartyCandidates(mainUl, partyInfo, candidatesData) { /* ... (som før) ... */ }

    // --- Initialiser ved å laste data ---
    loadData();
});
