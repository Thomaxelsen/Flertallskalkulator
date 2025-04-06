document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded (with Block Coloring)");

    // --- START: Definisjoner for Blokk-farging ---
    const blockColors = {
        Left: '#ed1b34',    // Rød (AP's farge)
        Right: '#007ac8',   // Blå (Høyre's farge)
        Tie: '#a9a9a9'     // Nøytral Grå (DarkGray)
    };
    const blockOpacity = 0.7; // Gjør fargen litt tydeligere enn default 0.6

    const partiesLeft = ['R', 'SV', 'AP', 'SP', 'MDG'];
    const partiesRight = ['H', 'FrP', 'V', 'KrF'];

    let constituencyBlockLeaning = {}; // Objekt for å lagre resultat: { "Constituency Name": "Left" | "Right" | "Tie" }
    // --- SLUTT: Definisjoner for Blokk-farging ---

    // Globale variabler
    let allCandidatesData = null;
    let partiesMap = {}; // Endret til objekt for raskere oppslag
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping GeoJSON -> Standard navn (uendret)
    const geoJsonNameMapping = { /* ... */ };
    // Mandatfordeling (uendret)
    const constituencyMandates = { /* ... */ };

    // DOM referanser (inkl modal) (uendret)
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
    /* ... (event listeners for modal) ... */

    // --- START: Funksjon for å beregne blokk-flertall ---
    function calculateBlockLeanings(candidatesData) {
        console.log("Map Explorer: Calculating block leanings...");
        const leanings = {};
        if (!candidatesData || !Array.isArray(candidatesData)) {
            console.error("Invalid candidatesData format for block calculation.");
            return leanings; // Returner tomt objekt ved feil
        }

        candidatesData.forEach(constituency => {
            if (!constituency.constituencyName || !Array.isArray(constituency.parties)) return; // Hopp over ugyldige

            let countLeft = 0;
            let countRight = 0;

            constituency.parties.forEach(party => {
                if (!party.partyShorthand || !Array.isArray(party.candidates)) return; // Hopp over ugyldige

                const isLeft = partiesLeft.includes(party.partyShorthand);
                const isRight = partiesRight.includes(party.partyShorthand);

                if (isLeft || isRight) {
                    party.candidates.forEach(candidate => {
                        if (candidate.hasRealisticChance === true) {
                            if (isLeft) {
                                countLeft++;
                            } else if (isRight) {
                                countRight++;
                            }
                        }
                    });
                }
            });

            if (countLeft > countRight) {
                leanings[constituency.constituencyName] = "Left";
            } else if (countRight > countLeft) {
                leanings[constituency.constituencyName] = "Right";
            } else {
                leanings[constituency.constituencyName] = "Tie"; // Inkluderer 0-0
            }
             // console.log(` - ${constituency.constituencyName}: Left=${countLeft}, Right=${countRight} -> ${leanings[constituency.constituencyName]}`);
        });
        console.log("Map Explorer: Block leanings calculated.");
        return leanings;
    }
    // --- SLUTT: Funksjon for å beregne blokk-flertall ---


    // Hjelpefunksjon for å laste JSON (uendret)
    async function loadJson(url) { /* ... */ }

    // Hovedfunksjon for datalasting (MODIFISERT: Kaller calculateBlockLeanings)
    async function loadData() {
        if (loader) loader.style.display = 'block';

        // Last partidata (som før)
        if (!window.partiesDataLoaded) { /* ... (kode for å vente/hente partidta) ... */ }
        partiesMap = {}; // Populer partiesMap
        if (window.partiesData) { window.partiesData.forEach(p => partiesMap[p.shorthand] = p); }
        /* ... (resten av feilhåndtering for partidata) ... */

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

            // ------>>> NYTT: Beregn blokk-flertall <<<------
            constituencyBlockLeaning = calculateBlockLeanings(allCandidatesData);
            // ------------------------------------------------

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

    // Kart initialisering (uendret - stylingen skjer i styleFeature)
    function initMapExplorer() {
         console.log("Map Explorer: Initializing map...");
        if (!mapContainer) { console.error("Map container element not found!"); return; }
        if (map) { map.remove(); map = null; }

        try {
            map = L.map(mapContainer).setView([64.5, 17.5], 4.5);
            console.log("Map Explorer: L.map object created.");

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { /* ... options ... */ }).addTo(map);
            console.log("Map Explorer: Base map tiles added.");

            let features = geoJsonData?.Valgdistrikt?.features || geoJsonData?.features;
            if (features && Array.isArray(features) && features.length > 0) {
                console.log("Map Explorer: Adding GeoJSON layer with", features.length, "features...");
                // Viktig: styleFeature brukes her for å sette fargen initiellt
                geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                    style: styleFeature,
                    onEachFeature: onEachFeature
                }).addTo(map);
                console.log("Map Explorer: GeoJSON layer added.");

                try { /* ... (fitBounds logikk som før) ... */ } catch (e) { /* ... */ }
            } else { /* ... (håndter manglende features) ... */ }

           console.log("Map Explorer: Map initialization complete.");
            if (listContent && listContent.innerHTML === '') { /* ... (standard melding) ... */ }

        } catch (initError) { /* ... (feilhåndtering for init) ... */ }
    }

    // --- Kart interaksjon (MODIFISERT: styleFeature og resetHighlight) ---

    // Funksjon for å style kretser basert på blokk-flertall
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
            const leaning = constituencyBlockLeaning[constituencyName]; // Hent beregnet flertall

            if (leaning === "Left") {
                defaultStyle.fillColor = blockColors.Left;
            } else if (leaning === "Right") {
                defaultStyle.fillColor = blockColors.Right;
            }
            // Hvis leaning er "Tie" eller ukjent, brukes default gråfarge
        }
        return defaultStyle;
    }

    // Legger til listeners (uendret)
    function onEachFeature(feature, layer) { /* ... (som før, legger til mouseover, mouseout, click) ... */ }

    // Hover-effekt (uendret - overstyrer fargen midlertidig)
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({ weight: 3, color: '#666', dashArray: '', fillOpacity: 0.8 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
             layer.bringToFront();
        }
    }

    // Tilbakestill til korrekt blokkfarge (MODIFISERT)
    function resetHighlight(e) {
        const layer = e.target;
        if (layer !== selectedLayer) { // Ikke reset den valgte
            // Bruker styleFeature for å få tilbake den korrekte blokkfargen
            layer.setStyle(styleFeature(layer.feature));
        }
    }

    // Håndterer klikk (MODIFISERT: resetter forrige valgte lag korrekt)
    function zoomAndShowCandidates(e) {
         const layer = e.target;
         // Reset stil for forrige valgte lag
         if (selectedLayer && selectedLayer !== layer) {
             try {
                 // Bruk styleFeature for å resette til riktig blokkfarge
                 selectedLayer.setStyle(styleFeature(selectedLayer.feature));
             } catch (err) {
                 console.warn("Could not reset style of previous layer:", err);
             }
         }
         // Sett stil for nytt valgt lag
         layer.setStyle({ fillColor: '#add8e6', weight: 2, color: '#333', fillOpacity: 0.9 }); // Standard blåaktig valgfarge
         if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
         }
         selectedLayer = layer;

         // Finn navnet og vis kandidater (som før)
         const rawName = layer.feature.properties.valgdistriktsnavn;
         const constituencyName = geoJsonNameMapping[rawName] || rawName;
         if (constituencyName) {
             console.log(`Clicked on: ${constituencyName} (Leaning: ${constituencyBlockLeaning[constituencyName] || 'N/A'})`);
             displayCandidatesForConstituency(constituencyName);
         } else { /* ... (feilhåndtering) ... */ }
    }

    // --- Kandidatvisning (Uendret) ---
    function displayCandidatesForConstituency(constituencyName) { /* ... (som før) ... */ }
    function displayPartyCandidates(mainUl, partyInfo, candidatesData) { /* ... (som før) ... */ }

    // --- Initialiser ved å laste data ---
    loadData();
});
