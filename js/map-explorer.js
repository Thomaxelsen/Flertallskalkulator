// js/map-explorer.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Map Explorer JS: DOM loaded.");

    // Globale variabler
    let allCandidatesData = [];
    let partiesMap = {};
    let geoJsonData = null;
    let map = null; // Leaflet map instance
    let geoJsonLayer = null; // Leaflet GeoJSON layer instance
    let selectedLayer = null; // Holder styr på valgt kartlag

    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const mapLoader = mapContainer ? mapContainer.querySelector('.map-loader') : null;

    // --- VIKTIG: Sti til din GeoJSON-fil ---
    // --- DU MÅ FINNE ELLER LAGE DENNE FILEN SELV ---
    const geoJsonPath = 'data/norway-constituencies.geojson'; // ERSTATT MED KORREKT STI!

    // --- Datainnlasting ---
    function loadData() {
        console.log("Map Explorer JS: Loading data...");
        if (mapLoader) mapLoader.textContent = 'Laster data...';

        Promise.all([
            fetch('data/candidates.json').then(res => res.ok ? res.json() : Promise.reject('Failed to load candidates.json')),
            window.partiesDataLoaded ? Promise.resolve(window.partiesData) : fetch('data/parties.json').then(res => res.ok ? res.json() : Promise.reject('Failed to load parties.json')),
            fetch(geoJsonPath).then(res => res.ok ? res.json() : Promise.reject(`Failed to load GeoJSON from ${geoJsonPath}`))
        ])
        .then(([candidates, parties, geoJson]) => {
            console.log("Map Explorer JS: All data fetched.");
            allCandidatesData = candidates;
            geoJsonData = geoJson;

            if (Object.keys(partiesMap).length === 0) {
                parties.forEach(p => { partiesMap[p.shorthand] = p; });
                window.partiesData = parties; window.partiesDataLoaded = true;
                console.log("Map Explorer JS: partiesMap created.");
            }

            initMapExplorer(); // Initialiser kart og panel
        })
        .catch(error => {
            console.error("Map Explorer JS: Error loading data:", error);
            if (mapContainer) mapContainer.innerHTML = `<p class="error">Kunne ikke laste nødvendig data for kartvisning: ${error.message}.<br>Sjekk at GeoJSON-filen '${geoJsonPath}' finnes og er gyldig.</p>`;
            if (displayPanel) displayPanel.innerHTML = `<p>Kartet kunne ikke lastes.</p>`;
        })
        .finally(() => {
            if (mapLoader) mapLoader.style.display = 'none';
        });
    }

    // Vent på partidata (liknende logikk som i candidates.js)
     if (window.partiesDataLoaded) {
         partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
         loadData();
     } else {
         document.addEventListener('partiesDataLoaded', () => {
             partiesMap = {}; if (window.partiesData) window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
             loadData();
         });
         setTimeout(() => { if (Object.keys(partiesMap).length === 0 && !window.partiesDataLoaded) { loadData(); }}, 2000);
     }

    // --- Kart Initialisering ---
    function initMapExplorer() {
        if (!mapContainer) { console.error("Map container not found"); return; }
        if (map) { // Fjerner gammelt kart hvis det finnes (ved f.eks. re-init)
             map.remove();
             map = null;
        }

        console.log("Map Explorer JS: Initializing Leaflet map...");
        // Opprett kartet sentrert over Norge
        map = L.map('map-container').setView([65, 15], 4); // Lat/Lon for Norge, zoom nivå 4

        // Legg til et bakgrunnskartlag (f.eks. OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Legg til GeoJSON-laget
        if (geoJsonData) {
            console.log("Map Explorer JS: Adding GeoJSON layer...");
            geoJsonLayer = L.geoJSON(geoJsonData, {
                style: styleFeature,       // Funksjon for standard stil
                onEachFeature: onEachFeature // Funksjon for å legge til interaksjon
            }).addTo(map);
            console.log("Map Explorer JS: GeoJSON layer added.");
             // Tilpass kartutsnittet til GeoJSON-dataene
             if (geoJsonLayer.getBounds().isValid()) {
                 map.fitBounds(geoJsonLayer.getBounds().pad(0.1)); // Legg til litt padding
             } else {
                  console.warn("Map Explorer JS: GeoJSON bounds are not valid, cannot fit bounds.");
             }

        } else {
            console.error("Map Explorer JS: GeoJSON data is missing, cannot add layer.");
             if (mapContainer) mapContainer.innerHTML = `<p class="error">GeoJSON-data mangler.</p>`;
        }
    }

    // --- Kart Styling og Interaksjon ---

    // Standard stil for fylkene
    function styleFeature(feature) {
        return {
            fillColor: '#9ecae1', // En lys blåfarge
            weight: 1,          // Kantlinje tykkelse
            opacity: 1,
            color: 'white',     // Kantlinje farge
            fillOpacity: 0.6
        };
    }

    // Funksjon som kjøres for hver valgkrets (feature) i GeoJSON
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomAndShowCandidates
        });
    }

    // Uthev ved mouseover
    function highlightFeature(e) {
        const layer = e.target;
        if (layer !== selectedLayer) { // Ikke endre stil på den som er valgt
            layer.setStyle({
                weight: 2,
                color: '#666',
                fillOpacity: 0.8
            });
             layer.bringToFront(); // Sørg for at den er over andre
        }
    }

    // Tilbakestill stil ved mouseout
    function resetHighlight(e) {
         if (e.target !== selectedLayer) { // Ikke tilbakestill den valgte
             geoJsonLayer.resetStyle(e.target);
         }
    }

    // Håndter klikk på en valgkrets
    function zoomAndShowCandidates(e) {
        const layer = e.target;

        // Tilbakestill stil på forrige valgte lag
        if (selectedLayer && selectedLayer !== layer) {
             geoJsonLayer.resetStyle(selectedLayer);
        }

        // Sett ny stil på valgt lag
        layer.setStyle({
             weight: 3,
             color: 'var(--kf-pink)', // Bruk en tydelig farge
             fillOpacity: 0.5
        });
         selectedLayer = layer; // Oppdater hvilket lag som er valgt

        // map.fitBounds(layer.getBounds()); // Zoom til valgt krets

        // --- VIKTIG: Hent navnet fra GeoJSON-properties ---
        // --- Du må tilpasse 'feature.properties.navn' til det faktiske navnet på egenskapen i DIN GeoJSON-fil ---
        const constituencyName = feature.properties.navn || feature.properties.name || feature.properties.fylkesnavn; // Prøv vanlige navn

        if (constituencyName) {
             console.log("Map Explorer JS: Constituency clicked:", constituencyName);
            displayCandidatesForConstituency(constituencyName);
        } else {
            console.error("Map Explorer JS: Could not find constituency name in GeoJSON properties!", feature.properties);
            if(listContent) listContent.innerHTML = "<p>Kunne ikke identifisere valgkrets fra kartdata.</p>";
        }
    }


    // --- Vis Kandidater for Valgt Krets ---
    function displayCandidatesForConstituency(constituencyName) {
        if (!displayPanel || !listContent) return;

        // Finn data for den valgte kretsen
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName]; // Hent fra mandat-objektet

         // Oppdater panel-tittel
         displayPanel.querySelector('h2').textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '(' + mandateCount + ' mandater)' : ''}`;


        listContent.innerHTML = ''; // Tøm gammelt innhold

        if (!constituencyData || !constituencyData.parties || constituencyData.parties.length === 0) {
            listContent.innerHTML = '<p>Fant ingen kandidatdata for denne valgkretsen.</p>';
            return;
        }

        // Sorter partier etter posisjon
         const sortedParties = constituencyData.parties
            .map(p => ({ ...p, partyInfo: partiesMap[p.partyShorthand] })) // Legg til full partiinfo
             .sort((a, b) => (a.partyInfo?.position || 99) - (b.partyInfo?.position || 99));


        // Vis kandidater gruppert etter parti
        sortedParties.forEach(party => {
             const partyInfo = party.partyInfo || { name: party.partyName, color: '#ccc', classPrefix: 'default' }; // Fallback

             const partyHeader = document.createElement('div');
             partyHeader.className = 'party-header';
             partyHeader.innerHTML = `
                 <div class="party-icon icon-${partyInfo.classPrefix}" style="background-color: ${partyInfo.color}; color: white;">
                     ${party.partyShorthand.charAt(0)}
                 </div>
                 <span>${partyInfo.name}</span>
             `;
             listContent.appendChild(partyHeader);

             const candidateList = document.createElement('ul');
            // Sorter kandidater etter rank
            party.candidates.sort((a, b) => a.rank - b.rank).forEach(candidate => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    ${candidate.rank}. ${candidate.name}
                    ${candidate.hasRealisticChance ? '<span class="realistic-chance-indicator">(R)</span>' : ''}
                 `;
                candidateList.appendChild(listItem);
            });
            listContent.appendChild(candidateList);
        });
    }

    // --- Helper Functions ---
    function debounce(func, wait) { /* ... (som før) ... */ }


}); // End DOMContentLoaded
