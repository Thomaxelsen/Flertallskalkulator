// js/map-explorer.js (Versjon 5 - Håndterer navn som "Nordland - Nordlánnda")

document.addEventListener('DOMContentLoaded', () => {
    console.log("Map Explorer JS: DOM loaded.");

    // Globale variabler
    let allCandidatesData = [];
    let partiesMap = {};
    let geoJsonData = null;
    let map = null; // Leaflet map instance
    let geoJsonLayer = null; // Leaflet GeoJSON layer instance
    let selectedLayer = null; // Holder styr på valgt kartlag

    // Mandatdata (basert på image_f51c1f.png)
     const constituencyMandates = {
        "Østfold": 9,"Akershus": 19,"Oslo": 21,"Hedmark": 7,"Oppland": 6,
        "Buskerud": 9,"Vestfold": 8,"Telemark": 6,"Aust-Agder": 4,
        "Vest-Agder": 6,"Rogaland": 15,"Hordaland": 17,"Sogn og Fjordane": 4,
        "Møre og Romsdal": 9,"Sør-Trøndelag": 10,"Nord-Trøndelag": 4,
        "Nordland": 8,"Troms": 5,"Finnmark": 2
        // ^-- Sørg for at disse navnene matcher navnene i candidates.json
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
                style: styleFeature, // Bruker forenklet stil for testing
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
             if (mapContainer) mapContainer.innerHTML = `<p class="error" style="padding: 20px;">GeoJSON-data mangler, er ugyldig eller har uventet struktur.</p>`;
        }
    }

    // --- Kart Styling og Interaksjon ---

    // Bruker FORENKLET stil for feilsøking
    function styleFeature(feature) {
        console.log("Styling feature:", feature?.properties?.valgdistriktsnavn || 'Ukjent');
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

 // Erstatt hele den eksisterende zoomAndShowCandidates-funksjonen med denne:
    function zoomAndShowCandidates(e) {
        const layer = e.target;
        console.log("--- zoomAndShowCandidates START ---"); // Ny logg

        // Tilbakestill stil på forrige valgte lag
        if (selectedLayer && selectedLayer !== layer && geoJsonLayer) {
             try {
                 console.log("Resetting style for previous layer");
                 geoJsonLayer.resetStyle(selectedLayer);
                 selectedLayer.getElement()?.classList.remove('constituency-selected');
             } catch (error) {
                 console.warn("Could not reset style for previous layer:", error);
             }
        }

        // Sett stil på nytt valgt lag
        console.log("Setting style for selected layer");
        layer.getElement()?.classList.add('constituency-selected');
        // Sett stil direkte også for umiddelbar effekt (CSS kan overstyre, men dette sikrer noe)
        layer.setStyle({ weight: 3, color: 'var(--kf-pink)', fillOpacity: 0.5 });
        layer.bringToFront();
        selectedLayer = layer;

        // Hent OG NORMALISER navnet fra GeoJSON properties
        let rawNameFromGeoJSON = null;
        try {
             rawNameFromGeoJSON = layer.feature.properties.valgdistriktsnavn;
             console.log("Raw name from GeoJSON:", rawNameFromGeoJSON); // LOG 1: Hvilket navn fikk vi?
        } catch(err) {
             console.error("Error accessing layer.feature.properties.valgdistriktsnavn:", err);
             if(listContent) listContent.innerHTML = "<p>Feil ved lesing av data fra kartlaget.</p>";
             return; // Avslutt hvis vi ikke kan lese navnet
        }


        let nameToUse = rawNameFromGeoJSON; // Start med det rå navnet

        // *** START: Navne-normalisering med MER LOGGING ***
        if (nameToUse && typeof nameToUse === 'string') {
            console.log("Checking for separator ' - ' in:", nameToUse); // LOG 2: Sjekker vi?
            if (nameToUse.includes(' - ')) {
                console.log("Separator ' - ' found."); // LOG 3: Fant vi den?
                const parts = nameToUse.split(' - ');
                const normalized = parts[0].trim();
                console.log("Normalized part candidate:", normalized); // LOG 4: Hva ble første del?

                // Sjekk om det normaliserte navnet finnes i mandatlisten vår
                console.log("Checking if constituencyMandates has property:", `"${normalized}"`); // LOG 5: Sjekker vi riktig nøkkel?
                if (constituencyMandates.hasOwnProperty(normalized)) {
                    console.log(`Normalization successful! Using '${normalized}' instead of '${rawNameFromGeoJSON}'`); // LOG 6: Suksess!
                    nameToUse = normalized; // Viktig: Overskriv med det normaliserte navnet
                } else {
                    console.warn(`Could not normalize '${rawNameFromGeoJSON}' reliably. Mandate key '${normalized}' not found. Using raw name.`); // LOG 7: Mislykket nøkkelsjekk
                }
            } else {
                 console.log("Separator ' - ' NOT found in raw name."); // LOG 8: Fant ikke separator
            }
        } else {
             console.warn("Raw name from GeoJSON is missing or not a string:", rawNameFromGeoJSON); // LOG 9: Ugyldig rå-navn
        }
        // *** SLUTT: Navne-normalisering med MER LOGGING ***


        if (nameToUse) {
             console.log("Map Explorer JS: Using final name for lookup:", nameToUse); // LOG 10: Endelig navn som brukes
             displayCandidatesForConstituency(nameToUse); // Send det (potensielt normaliserte) navnet videre
        } else {
            console.error("Map Explorer JS: Could not determine a usable constituency name!", layer?.feature?.properties); // Logg hele properties ved feil
            if(listContent) listContent.innerHTML = "<p>Kunne ikke identifisere valgkrets fra kartdata.</p>";
        }
        console.log("--- zoomAndShowCandidates END ---"); // Ny logg
    }

        // Bruker nå CSS-klassen for valgt stil
         if (selectedLayer) selectedLayer.getElement()?.classList.remove('constituency-selected');
         layer.getElement()?.classList.add('constituency-selected');
         // Sett stil direkte også for umiddelbar effekt (CSS kan overstyre, men dette sikrer noe)
         layer.setStyle({ weight: 3, color: 'var(--kf-pink)', fillOpacity: 0.5 });
         layer.bringToFront();
        selectedLayer = layer;

        // Hent OG NORMALISER navnet fra GeoJSON properties
        let constituencyName = layer.feature.properties.valgdistriktsnavn; // Hent rå-navn

        // *** START: Navne-normalisering ***
        if (constituencyName && constituencyName.includes(' - ')) {
            const normalized = constituencyName.split(' - ')[0].trim();
            // Sjekk om det normaliserte navnet finnes i mandatlisten vår
            if (constituencyMandates.hasOwnProperty(normalized)) {
                 console.log(`Normalizing name from '${constituencyName}' to '${normalized}'`);
                 constituencyName = normalized; // Viktig: Overskriv med det normaliserte navnet
            } else {
                console.warn(`Could not normalize '${constituencyName}' reliably based on mandate keys, using raw name.`);
            }
        }
        // *** SLUTT: Navne-normalisering ***


        if (constituencyName) {
             console.log("Map Explorer JS: Using constituency name for lookup:", constituencyName);
             displayCandidatesForConstituency(constituencyName); // Send det (potensielt normaliserte) navnet videre
        } else {
            console.error("Map Explorer JS: Could not determine a usable constituency name!", layer.feature.properties);
            if(listContent) listContent.innerHTML = "<p>Kunne ikke identifisere valgkrets fra kartdata.</p>";
        }
    }

    // --- Vis Kandidater for Valgt Krets ---
    // Denne funksjonen tar nå imot det (potensielt normaliserte) navnet
    function displayCandidatesForConstituency(constituencyName) {
        if (!displayPanel || !listContent) { console.error("Display panel or list content element not found!"); return; }

        // Bruk det mottatte navnet for alle oppslag
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];
        const panelTitle = displayPanel.querySelector('h2');

        // Sett tittelen i panelet (bruk det normaliserte navnet her også for konsistens)
        if (panelTitle) {
            panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '(' + mandateCount + ' mandater)' : '(mandattall ukjent)'}`;
        }

        listContent.innerHTML = ''; // Tøm gammelt innhold

        if (!constituencyData || !constituencyData.parties || constituencyData.parties.length === 0) {
            listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`; // Oppdatert melding
            return;
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
