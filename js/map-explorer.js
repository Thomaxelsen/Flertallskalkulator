document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded (Hardcoded Block Colors - Based on Working Version)");

    // --- START: Definisjoner og HARDKODET Blokk-resultat ---
    const blockColors = {
        Left: '#ed1b34',    // Rød (AP's farge)
        Right: '#007ac8',   // Blå (Høyre's farge)
        Tie: '#a9a9a9'     // Nøytral Grå (DarkGray)
    };
    const blockOpacity = 0.7; // Gjør fargen litt tydeligere

    // Resultat fra forhåndsberegning basert på candidates.json
    const hardcodedBlockLeanings = {
        "Aust-Agder": "Right", "Akershus": "Right", "Buskerud": "Left",
        "Finnmark": "Left", "Hedmark": "Left", "Hordaland": "Right",
        "Møre og Romsdal": "Left", "Nord-Trøndelag": "Left", "Nordland": "Left",
        "Oppland": "Left", "Oslo": "Left", "Rogaland": "Right",
        "Sogn og Fjordane": "Tie", "Sør-Trøndelag": "Left", "Telemark": "Left",
        "Troms": "Left", "Vest-Agder": "Right", "Vestfold": "Tie",
        "Østfold": "Right"
     };
    // --- SLUTT: Definisjoner ---

    // Globale variabler (fra din fungerende versjon)
    let allCandidatesData = null;
    let partiesMap = null; // Blir et objekt senere
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping GeoJSON -> Standard navn (fra din fungerende versjon)
    const geoJsonNameMapping = {
        "Nordland – Nordlánnda": "Nordland",
        "Troms – Romsa – Tromssa": "Troms",
        "Finnmark – Finnmárku – Finmarkku": "Finnmark"
    };

    // Mandatfordeling (fra din fungerende versjon)
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
    };

    // DOM referanser (fra din fungerende versjon - hentes etter DOM er klar)
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');
    const modalElement = document.getElementById('candidate-modal');
    // Henter referanser til modal-knapper etc. her inne
    const modalCloseButton = modalElement?.querySelector('.modal-close-button');
    const modalCandidateName = document.getElementById('modal-candidate-name');
    const modalCandidateParty = document.getElementById('modal-candidate-party');
    const modalCandidateAge = document.getElementById('modal-candidate-age');
    const modalCandidateLocation = document.getElementById('modal-candidate-location');
    const modalCandidateEmail = document.getElementById('modal-candidate-email');
    const modalCandidatePhone = document.getElementById('modal-candidate-phone');

    // Sti til GeoJSON (fra din fungerende versjon)
    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Modal Funksjoner (fra din fungerende versjon) ---
    function showCandidateDetails(candidateData, partyInfo) {
        if (!modalElement || !candidateData || !partyInfo) return;
        if (modalCandidateName) modalCandidateName.textContent = candidateData.name || 'Ukjent';
        if (modalCandidateParty) modalCandidateParty.textContent = partyInfo.name || 'Ukjent';
        if (modalCandidateAge) modalCandidateAge.textContent = candidateData.age || 'Ukjent';
        if (modalCandidateLocation) modalCandidateLocation.textContent = candidateData.location || 'Ukjent';
        if (modalCandidateEmail) modalCandidateEmail.innerHTML = candidateData.email ? `<a href="mailto:<span class="math-inline">\{candidateData\.email\}"\></span>{candidateData.email}</a>` : 'Ikke oppgitt';
        if (modalCandidatePhone) modalCandidatePhone.innerHTML = candidateData.phone ? `<a href="tel:<span class="math-inline">\{candidateData\.phone\}"\></span>{candidateData.phone}</a>` : 'Ikke oppgitt';
        modalElement.style.display = 'block';
    }
    function closeModal() { if (modalElement) modalElement.style.display = 'none'; }
    // Event listeners for modal (fra din fungerende versjon)
    if (modalCloseButton) {
         modalCloseButton.addEventListener('click', closeModal);
         console.log("Modal close button listener added."); // Bekreftelse
    } else {
         console.warn("Modal close button not found on DOMContentLoaded.");
    }
    window.addEventListener('click', (event) => { if (event.target === modalElement) closeModal(); });
    // --- Slutt Modal Funksjoner ---

    // Hjelpefunksjon for å laste JSON (fra din fungerende versjon)
    async function loadJson(url) {
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${url}`);
            return await r.json();
        } catch (e) {
            console.error(`Loading ${url} failed:`, e);
            throw e; // Kast feilen videre
        }
    }

    // Hovedfunksjon for datalasting (fra din fungerende versjon - UTEN blokk-kalkulering)
    async function loadData() {
        if (!loader) {
             console.error("Map loader element not found!");
        } else {
            loader.style.display = 'block';
        }

        // Last partidata (venter på event om nødvendig)
        if (!window.partiesDataLoaded) {
            console.log("Map Explorer: Waiting for partiesDataLoaded event...");
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error("Timeout waiting for partiesDataLoaded")), 5000);
                    document.addEventListener('partiesDataLoaded', () => {
                        clearTimeout(timeout);
                        resolve();
                    }, { once: true });
                });
            } catch (err) {
                console.error("Map Explorer: Error waiting for partiesData:", err);
                try {
                    console.log("Map Explorer: Attempting manual fetch of parties.json as fallback...");
                    const partyDataFallback = await loadJson('data/parties.json');
                    window.partiesData = partyDataFallback;
                    window.partiesDataLoaded = true;
                } catch (fallbackError) {
                     console.error("Map Explorer: Fallback fetch of parties.json also failed:", fallbackError);
                     if (loader) loader.style.display = 'none';
                     if (listContent) listContent.innerHTML = '<p class="error">Kunne ikke laste partidatene. Siden kan ikke vises.</p>';
                     return;
                }
            }
        }

        // Opprett partiesMap
        partiesMap = {};
        if (window.partiesData) {
            window.partiesData.forEach(p => partiesMap[p.shorthand] = p);
            console.log("Map Explorer: partiesMap created/updated.");
        } else {
            console.error("Map Explorer: window.partiesData is missing after loading attempt!");
             if (loader) loader.style.display = 'none';
             if (listContent) listContent.innerHTML = '<p class="error">Kritisk feil med partidatene.</p>';
             return;
        }

        // Last resten av dataen
        try {
            console.log("Map Explorer: Loading candidates and GeoJSON...");
            const [candidates, geoJson] = await Promise.all([
                loadJson('data/candidates.json'),
                loadJson(geoJsonPath)
            ]);
            allCandidatesData = candidates;
            geoJsonData = geoJson;
            console.log("Map Explorer: Candidates and GeoJSON loaded.");
            // INGEN calculateBlockLeanings her
            initMapExplorer(); // Gå videre til kartinit
        } catch (error) {
            console.error("Map Explorer: Error loading main data (candidates/GeoJSON):", error);
            if(listContent) listContent.innerHTML = `<p class="error">Kunne ikke laste kart- eller kandidatdata: ${error.message}</p>`;
        }
        finally {
            console.log("Map Explorer: Hiding loader.");
            if (loader) loader.style.display = 'none';
        }
    }

    // Kart initialisering (fra din fungerende versjon)
    function initMapExplorer() {
        console.log("Map Explorer: Initializing map...");
        if (!mapContainer) { console.error("Map container element not found!"); return; }
        if (map) { console.log("Map Explorer: Removing existing map instance."); map.remove(); map = null; }

        try {
            map = L.map(mapContainer).setView([64.5, 17.5], 4.5);
            console.log("Map Explorer: L.map object created.");

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { /* ... options ... */ }).addTo(map);
            console.log("Map Explorer: Base map tiles added.");

            let features = geoJsonData?.Valgdistrikt?.features || geoJsonData?.features;
            if (features && Array.isArray(features) && features.length > 0) {
                console.log("Map Explorer: Adding GeoJSON layer with", features.length, "features...");
                geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                    // ----- ENDRING: Bruker styleFeature for hardkodet farge -----
                    style: styleFeature, 
                    onEachFeature: onEachFeature 
                }).addTo(map);
                // -----------------------------------------------------------------
                console.log("Map Explorer: GeoJSON layer added.");
                try { /* ... (fitBounds logikk som før) ... */ } 
                catch(e) { console.error("Map Explorer: Error getting or fitting bounds:", e); }
            } else { /* ... (håndter manglende features) ... */ }

           console.log("Map Explorer: Map initialization complete.");
           if (listContent && listContent.innerHTML === '') { /* ... (standard melding) ... */ }

        } catch (initError) { /* ... (feilhåndtering for init) ... */ }
    }

    // --- Kart interaksjon (MODIFISERT for hardkodede farger) ---

    // NY styleFeature bruker hardkodet objekt
    function styleFeature(feature) {
        const defaultStyle = {
            fillColor: blockColors.Tie, // Default til grå
            weight: 1,
            opacity: 1,
            color: 'white', // Kantlinjefarge
            fillOpacity: blockOpacity // Bruker definert opacity
        };
        if (feature.properties?.valgdistriktsnavn) {
            const rawName = feature.properties.valgdistriktsnavn;
            const constituencyName = geoJsonNameMapping[rawName] || rawName;
            // Bruker hardkodet data:
            const leaning = hardcodedBlockLeanings[constituencyName]; 
            if (leaning === "Left") {
                defaultStyle.fillColor = blockColors.Left;
            } else if (leaning === "Right") {
                defaultStyle.fillColor = blockColors.Right;
            }
            // Hvis leaning er "Tie" eller ukjent, brukes default gråfarge
        }
        return defaultStyle;
    }

    // onEachFeature (fra din fungerende versjon)
    function onEachFeature(feature, layer) {
        if (feature.properties?.valgdistriktsnavn) {
            layer.on({ 
                mouseover: highlightFeature, 
                mouseout: resetHighlight, 
                click: zoomAndShowCandidates 
            }); 
            const rawName = feature.properties.valgdistriktsnavn;
            const displayName = geoJsonNameMapping[rawName] || rawName;
            layer.bindTooltip(displayName);
        } else {
             console.warn("GeoJSON feature missing 'valgdistriktsnavn' property:", feature.properties);
        }
    }
    // highlightFeature (fra din fungerende versjon)
    function highlightFeature(e) { 
        const layer = e.target; 
        layer.setStyle({ weight: 3, color: '#666', dashArray: '', fill
