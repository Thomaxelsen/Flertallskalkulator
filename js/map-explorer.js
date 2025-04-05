// js/map-explorer.js (Versjon 6 - Mer robust navne-normalisering)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Map Explorer JS: DOM loaded.");

    // Globale variabler
    let allCandidatesData = [];
    let partiesMap = {};
    let geoJsonData = null;
    let map = null; // Leaflet map instance
    let geoJsonLayer = null; // Leaflet GeoJSON layer instance
    let selectedLayer = null; // Holder styr på valgt kartlag

    // Mandatdata
     const constituencyMandates = {
        "Østfold": 9,"Akershus": 19,"Oslo": 21,"Hedmark": 7,"Oppland": 6,
        "Buskerud": 9,"Vestfold": 8,"Telemark": 6,"Aust-Agder": 4,
        "Vest-Agder": 6,"Rogaland": 15,"Hordaland": 17,"Sogn og Fjordane": 4,
        "Møre og Romsdal": 9,"Sør-Trøndelag": 10,"Nord-Trøndelag": 4,
        "Nordland": 8,"Troms": 5,"Finnmark": 2
    };

    // DOM-element referanser
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const mapLoader = mapContainer ? mapContainer.querySelector('.map-loader') : null;

    // Sti til GeoJSON-filen
    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Datainnlasting ---
    function loadData() {
        console.log("Map Explorer JS: Loading data...");
        if (mapLoader) mapLoader.textContent = 'Laster data...';

        Promise.all([
            fetch('data/candidates.json').then(res => res.ok ? res.json() : Promise.reject('Failed to load candidates.json')),
            window.partiesDataLoaded ? Promise.resolve(window.partiesData) : fetch('data/parties.json').then(res => res.ok ? res.json() : Promise.reject('Failed to load parties.json')),
            fetch(geoJsonPath).then(res => {
                if (!res.ok) { return Promise.reject(`Failed to load GeoJSON from ${geoJsonPath}. Status: ${res.status}`); }
                return res.json();
            })
        ])
        .then(([candidates, parties, geoJson]) => {
            console.log("Map Explorer JS: All data fetched successfully.");
            allCandidatesData = candidates;
            geoJsonData = geoJson;

            if (Object.keys(partiesMap).length === 0 && parties) {
                parties.forEach(p => { partiesMap[p.shorthand] = p; });
                window.partiesData = parties; window.partiesDataLoaded = true;
            } else if (window.partiesDataLoaded && Object.keys(partiesMap).length === 0) {
                 window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; });
            }

            initMapExplorer();
        })
        .catch(error => {
            console.error("Map Explorer JS: Error loading data:", error);
            const errorMessage = typeof error === 'string' ? error : error.message;
             if (mapContainer && !map) {
                 mapContainer.innerHTML = `<p class="error" style="padding: 20px;">Kunne ikke laste nødvendig data for kartvisning: ${errorMessage}<br>Sjekk konsollen for detaljer og at filstien '${geoJsonPath}' er korrekt.</p>`;
            } else if (mapContainer) {
                 console.error("Feil oppstod etter kartinit, viser ikke i kartcontainer.");
            }
            if (displayPanel) displayPanel.innerHTML = `<p>Kartet kunne ikke lastes på grunn av en feil ved datainnlasting.</p>`;
        })
        .finally(() => {
            if (mapLoader) mapLoader.style.display = 'none';
        });
    }

    // Vent på partidata
     if (window.partiesDataLoaded) { partiesMap = {}; window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; }); loadData(); }
     else { document.addEventListener('partiesDataLoaded', () => { partiesMap = {}; if (window.partiesData) window.partiesData.forEach(p => { partiesMap[p.shorthand] = p; }); loadData(); });
         setTimeout(() => { if (Object.keys(partiesMap).length === 0 && !window.partiesDataLoaded) { console.warn("Fallback: Fetching parties again"); loadData(); }}, 2000);
     }

    // --- Kart Initialisering ---
    function initMapExplorer() {
        if (!mapContainer) { console.error("Map container not found"); return; }
        if (map) { map.remove(); map = null; }

        console.log("Map Explorer JS: Initializing Leaflet map...");
        map = L.map('map-container').setView([65, 15], 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Håndter mulig ekstra nivå i GeoJSON ("Valgdistrikt")
        let featureCollectionData = null;
        if (geoJsonData) {
            if (geoJsonData.type === "FeatureCollection") {
                featureCollectionData = geoJsonData;
            } else if (geoJsonData.Valgdistrikt && geoJsonData.Valgdistrikt.type === "FeatureCollection") {
                console.log("Map Explorer JS: Found data nested under 'Valgdistrikt'. Using that.");
                featureCollectionData = geoJsonData.Valgdistrikt;
            }
        }

        if (featureCollectionData && featureCollectionData.features) {
            console.log(`Map Explorer JS: Adding GeoJSON layer with ${featureCollectionData.features.length} features...`);
            geoJsonLayer = L.geoJSON(featureCollectionData, {
                style: styleFeature, // Bruker fortsatt forenklet stil
                onEachFeature: onEachFeature
            }).addTo(map);

            if (geoJsonLayer.getBounds().isValid()) {
                map.fitBounds(geoJsonLayer.getBounds().pad(0.1));
                console.log("Map Explorer JS: Map bounds fitted to GeoJSON.");
            } else {
                 console.warn("Map Explorer JS: GeoJSON bounds are not valid.");
            }
        } else {
            console.error("Map Explorer JS: GeoJSON data is missing, invalid, or structure is unexpected.", geoJsonData);
             if (mapContainer && !map) {
                 mapContainer.innerHTML = `<p class="error" style="padding: 20px;">GeoJSON-data mangler, er ugyldig eller har uventet struktur.</p>`;
             } else {
                  console.error("GeoJSON data missing/invalid AFTER map init - check data source.");
             }
        }
    }

    // --- Kart Styling og Interaksjon ---

    // Bruker FORENKLET stil for feilsøking
    function styleFeature(feature) {
        // console.log("Styling feature:", feature?.properties?.valgdistriktsnavn || 'Ukjent');
        return {
            fillColor: 'red', weight: 2, opacity: 1, color: 'black', fillOpacity: 0.7
        };
    }

    function onEachFeature(feature, layer) {
         const constituencyNameProp = feature.properties.valgdistriktsnavn;
         if (constituencyNameProp) {
            layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: zoomAndShowCandidates });
         } else { console.warn("Feature missing 'valgdistriktsnavn' property:", feature.properties); }
    }

    function highlightFeature(e) {
        const layer = e.target;
        if (layer !== selectedLayer) { layer.setStyle({ weight: 2, color: '#666', fillOpacity: 0.8 }); layer.bringToFront(); }
    }

    function resetHighlight(e) {
         if (e.target !== selectedLayer && geoJsonLayer) {
             try { geoJsonLayer.resetStyle(e.target); }
             catch (error) { console.warn("Could not reset style:", error); }
         }
    }

    // Denne funksjonen inkluderer den MER ROBUSTE navne-normaliseringen
    function zoomAndShowCandidates(e) {
        const layer = e.target;

        if (selectedLayer && selectedLayer !== layer && geoJsonLayer) {
             try { geoJsonLayer.resetStyle(selectedLayer); }
             catch (error) { console.warn("Could not reset style for previous layer:", error); }
        }

        if (selectedLayer) selectedLayer.getElement()?.classList.remove('constituency-selected');
         layer.getElement()?.classList.add('constituency-selected');
         layer.setStyle({ weight: 3, color: 'var(--kf-pink)', fillOpacity: 0.5 }); // Stil for klikk
         layer.bringToFront();
        selectedLayer = layer;

        // Hent OG NORMALISER navnet fra GeoJSON properties
        let constituencyName = layer.feature.properties.valgdistriktsnavn;
        const rawNameFromGeoJSON = constituencyName; // Behold rå-navnet for logging

        // *** START: Mer Robust Navne-normalisering ***
        // Alltid prøv å normalisere hvis " - " finnes
        if (constituencyName && typeof constituencyName === 'string' && constituencyName.includes(' - ')) {
            const normalized = constituencyName.split(' - ')[0].trim();
            console.log(`Normalizing name from '${constituencyName}' to '${normalized}' (Removed hasOwnProperty check)`);
            // Bruk ALLTID den normaliserte hvis separatoren finnes
            constituencyName = normalized;
        }
        // *** SLUTT: Mer Robust Navne-normalisering ***


        if (constituencyName) {
             console.log(`Map Explorer JS: Using final name for lookup: '${constituencyName}' (original was '${rawNameFromGeoJSON}')`); // Logg begge for klarhet
             displayCandidatesForConstituency(constituencyName); // Send det normaliserte navnet videre
        } else {
            console.error("Map Explorer JS: Could not determine a usable constituency name!", layer?.feature?.properties);
            if(listContent) listContent.innerHTML = "<p>Kunne ikke identifisere valgkrets fra kartdata.</p>";
        }
    }

    // --- Vis Kandidater for Valgt Krets ---
    // Denne funksjonen bruker det (potensielt normaliserte) navnet
    function displayCandidatesForConstituency(constituencyName) {
        if (!displayPanel || !listContent) { console.error("Display panel or list content element not found!"); return; }
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];
        const panelTitle = displayPanel.querySelector('h2');
        if (panelTitle) { panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '(' + mandateCount + ' mandater)' : '(mandattall ukjent)'}`; }
        listContent.innerHTML = '';
        if (!constituencyData || !constituencyData.parties || constituencyData.parties.length === 0) {
            listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`; return;
        }
        const sortedParties = constituencyData.parties
            .map(p => ({ ...p, partyInfo: partiesMap[p.shorthand] })).filter(p => p.partyInfo)
             .sort((a, b) => (a.partyInfo.position || 99) - (b.partyInfo.position || 99));
        sortedParties.forEach(party => {
             const partyInfo = party.partyInfo;
             const partyHeader = document.createElement('div');
             partyHeader.className = 'party-header';
             partyHeader.innerHTML = `<div class="party-icon icon-${partyInfo.classPrefix || 'default'}" style="background-color: ${partyInfo.color || '#ccc'}; color: white;" title="${partyInfo.name}">${party.partyShorthand.charAt(0)}</div><span>${partyInfo.name}</span>`;
             listContent.appendChild(partyHeader);
             const candidateList = document.createElement('ul');
            party.candidates.sort((a, b) => a.rank - b.rank).forEach(candidate => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `${candidate.rank}. ${candidate.name} ${candidate.hasRealisticChance ? '<span class="realistic-chance-indicator" title="Har realistisk sjanse">R</span>' : ''}`;
                candidateList.appendChild(listItem);
            });
            listContent.appendChild(candidateList);
        });
    }

    // --- Helper Functions ---
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

}); // End DOMContentLoaded
