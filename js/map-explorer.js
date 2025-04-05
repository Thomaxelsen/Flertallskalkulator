document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded");

    // Globale variabler for data og kartobjekter
    let allCandidatesData = null;
    let partiesMap = null; // Bruker den globale fra partiesData.js hvis tilgjengelig
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping fra GeoJSON-navn (slik de står i valgdistrikter.geojson)
    // til standardnavn (slik de brukes i candidates.json og constituencyMandates)
    const geoJsonNameMapping = {
        "Nordland - Nordlánnda": "Nordland",
        "Troms - Romsa": "Troms",
        "Finnmark - Finnmárku": "Finnmark"
        // Legg til flere linjer her hvis andre valgkretser har lignende skrivemåter i GeoJSON
    };

    // Hardkodet mandattall per valgkrets (basert på standardiserte navn)
     const constituencyMandates = {
        "Østfold": 9,
        "Akershus": 19, // Erstattet Follo, Romerike basert på diskusjon
        "Oslo": 21,
        "Hedmark": 7,
        "Oppland": 6,
        "Buskerud": 9, // Erstattet Drammen basert på diskusjon
        "Vestfold": 8,
        "Telemark": 6,
        "Aust-Agder": 4,
        "Vest-Agder": 6,
        "Rogaland": 15,
        "Hordaland": 17, // Erstattet Bergen basert på diskusjon
        "Sogn og Fjordane": 4,
        "Møre og Romsdal": 9,
        "Sør-Trøndelag": 10, // Erstattet Trondheim basert på diskusjon
        "Nord-Trøndelag": 4,
        "Nordland": 8,
        "Troms": 5,
        "Finnmark": 2
    };


    // DOM element referanser
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');

    // Sti til GeoJSON-filen
    const geoJsonPath = 'data/valgdistrikter.geojson'; // Korrekt sti

    // Hjelpefunksjon for å laste JSON-data
    async function loadJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} for ${url}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Could not fetch ${url}:`, error);
            throw error; // Kast feilen videre
        }
    }

    // Hovedfunksjon for å laste all nødvendig data
    async function loadData() {
        if (loader) loader.style.display = 'block'; // Vis lasteindikator

        // Vent på at partiesData er lastet (fra partiesData.js) eller hent på nytt
        if (typeof partiesDataLoaded === 'undefined' || !window.partiesData) {
            console.log("Map Explorer: partiesData not ready, waiting or fetching...");
            // Enkel timeout mekanisme hvis partiesData.js aldri signaliserer
            const partiesPromise = new Promise((resolve, reject) => {
                if (window.partiesData) {
                     console.log("Map Explorer: partiesData found immediately.");
                    resolve(window.partiesData);
                    return;
                }
                const listener = () => {
                    console.log("Map Explorer: partiesDataLoaded event received.");
                    resolve(window.partiesData);
                    window.removeEventListener('partiesDataLoaded', listener);
                };
                window.addEventListener('partiesDataLoaded', listener);
                setTimeout(() => {
                    window.removeEventListener('partiesDataLoaded', listener);
                     // Prøv å hente hvis den ikke ble lastet innen rimelig tid
                     if (!window.partiesData) {
                        console.warn("Map Explorer: Timeout waiting for partiesDataLoaded event. Fetching parties.json directly.");
                        loadJson('data/parties.json').then(resolve).catch(reject);
                    } else {
                        resolve(window.partiesData); // Den kom akkurat i tide
                    }
                }, 2000); // Vent i 2 sekunder
            });
             partiesMap = await partiesPromise; // Vent på at kartet blir klart
        } else {
            console.log("Map Explorer: partiesData already available globally.");
            partiesMap = window.partiesData;
        }


         // Sjekk om partiesMap ble lastet korrekt
         if (!partiesMap) {
            console.error("Map Explorer: Failed to load parties data. Cannot proceed.");
            if (listContent) listContent.innerHTML = '<p>Kunne ikke laste partidata. Siden kan ikke vises.</p>';
            if (loader) loader.style.display = 'none';
            return; // Stopp videre lasting
        }


        try {
            // Last kandidatdata og GeoJSON parallelt
            const [candidates, geoJson] = await Promise.all([
                loadJson('data/candidates.json'),
                loadJson(geoJsonPath)
            ]);

            allCandidatesData = candidates;
            geoJsonData = geoJson;

            console.log("Map Explorer: All data loaded successfully.", { allCandidatesData, geoJsonData, partiesMap });

            // Initialiser kartutforskeren når all data er lastet
            initMapExplorer();

        } catch (error) {
            console.error("Map Explorer: Error loading initial data:", error);
            if (mapContainer && !map) { // Hvis kartet ikke er initialisert
                 mapContainer.innerHTML = `<p style="color: red; padding: 10px;">Kunne ikke laste nødvendige data for kartet (${error.message}). Prøv å laste siden på nytt.</p>`;
            } else if (listContent) {
                 listContent.innerHTML = `<p style="color: red;">Kunne ikke laste kandidatdata (${error.message}).</p>`;
            }
        } finally {
            if (loader) loader.style.display = 'none'; // Skjul lasteindikator
        }
    }


    // Funksjon for å initialisere kartutforskeren
    function initMapExplorer() {
         if (!mapContainer) {
            console.error("Map Explorer: Map container element not found!");
            return;
        }
        if (map) { // Hvis kartet allerede er initialisert (f.eks. ved resize/reload)
             console.log("Map Explorer: Map already initialized. Removing old instance.");
             map.remove();
             map = null;
        }


        // Initialiser Leaflet-kartet
         map = L.map(mapContainer).setView([64.5, 17.5], 4.5); // Startutsnitt over Norge

        // Legg til bakgrunnskart (TileLayer)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Sjekk om GeoJSON-dataen er gyldig og har features
         // Håndterer mulig nestet struktur fra QGIS eksport
        let features = geoJsonData && geoJsonData.features;
        if (!features && geoJsonData && geoJsonData.Valgdistrikt && geoJsonData.Valgdistrikt.features) {
             console.warn("Map Explorer: GeoJSON features found under 'Valgdistrikt' key. Using those.");
             features = geoJsonData.Valgdistrikt.features;
        }


        if (features && features.length > 0) {
            geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, { // Sikrer at vi gir en FeatureCollection
                style: styleFeature,
                onEachFeature: onEachFeature
            }).addTo(map);

            // Tilpass kartutsnittet til GeoJSON-laget
             try {
                 if (geoJsonLayer.getBounds().isValid()) {
                    map.fitBounds(geoJsonLayer.getBounds());
                 } else {
                    console.warn("Map Explorer: GeoJSON layer bounds are not valid, using default view.");
                 }
             } catch(e) {
                  console.error("Map Explorer: Error fitting bounds:", e);
             }


        } else {
            console.error("Map Explorer: No valid GeoJSON features found to display.");
            if (listContent) listContent.innerHTML = "<p>Kunne ikke laste kartdata (GeoJSON).</p>";
        }
    }

    // Funksjon for å style hvert kartområde (feature)
    function styleFeature(feature) {
        // Her kan du legge til mer avansert styling basert på properties hvis ønskelig
        return {
            fillColor: '#d9d9d9', // Nøytral farge
            weight: 1,
            opacity: 1,
            color: 'white', // Grensefarge
            fillOpacity: 0.6
        };
    }

    // Funksjon som kjøres for hvert kartområde
    function onEachFeature(feature, layer) {
        // Sjekk om nødvendige properties finnes
        if (feature.properties && feature.properties.valgdistriktsnavn) {
             layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: zoomAndShowCandidates
            });
         } else {
              console.warn("Map Explorer: Feature is missing expected properties (valgdistriktsnavn):", feature);
         }
    }

    // Funksjon for å utheve område ved mouseover
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#666',
            fillOpacity: 0.8
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
         // Vis tooltip eller lignende hvis ønskelig
         // layer.bindTooltip(layer.feature.properties.valgdistriktsnavn).openTooltip();
    }

    // Funksjon for å resette stil ved mouseout
    function resetHighlight(e) {
         if (geoJsonLayer && e.target !== selectedLayer) { // Ikke resett stilen til det valgte laget
            geoJsonLayer.resetStyle(e.target);
         }
         // e.target.closeTooltip();
    }

    // Funksjon for å håndtere klikk på et område
    function zoomAndShowCandidates(e) {
        const layer = e.target;

        // Resett stil på tidligere valgt lag (hvis det finnes)
        if (selectedLayer && geoJsonLayer) {
             try {
                geoJsonLayer.resetStyle(selectedLayer);
             } catch (err) { console.warn("Map Explorer: Could not reset style on previous layer", err); }
        }

        // Sett stil for nytt valgt lag
        layer.setStyle({
             // weight: 3, // Kan gjerne ha annen stil for valgt lag
             // color: '#f00', // Rød f.eks.
             fillColor: '#add8e6', // Lys blå for valgt
             fillOpacity: 0.9
         });
         layer.bringToFront();
         selectedLayer = layer; // Oppdater valgt lag

        // --- START: NY MAPPING-LOGIKK ---
        // Hent rå-navnet fra GeoJSON slik det står i filen
        const rawNameFromGeoJSON = layer.feature.properties.valgdistriktsnavn;

        // Bruk mapping-objektet for å finne det standardiserte navnet
        // Hvis navnet ikke finnes i mappingen (for vanlige valgkretser), bruk rå-navnet direkte
        let lookupName = geoJsonNameMapping[rawNameFromGeoJSON] || rawNameFromGeoJSON;

        // Bruk 'lookupName' som det endelige navnet for videre oppslag
        const constituencyName = lookupName;
        // --- SLUTT: NY MAPPING-LOGIKK ---

        if (constituencyName) {
             console.log(`Map Explorer JS: Using lookup name: '${constituencyName}' (original GeoJSON name was '${rawNameFromGeoJSON}')`);
             // Vis kandidater for valgkretsen
             displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON); // Send med begge navnene
        } else {
            console.error("Map Explorer JS: Could not determine a usable constituency name!", layer?.feature?.properties);
            if(listContent) listContent.innerHTML = "<p>Kunne ikke identifisere valgkrets fra kartdata.</p>";
             // Nullstill tittel hvis navnet ikke kan bestemmes
             const panelTitle = displayPanel?.querySelector('h2');
             if (panelTitle) panelTitle.textContent = "Velg valgkrets";
        }

         // Zoom inn på området (valgfritt)
         // map.fitBounds(e.target.getBounds());
    }

    // Funksjon for å vise kandidater for en gitt valgkrets
    function displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON) { // Mottar standardisert navn for oppslag, rått navn for visning
        console.log("Map Explorer: Displaying candidates for:", constituencyName, `(Original: ${rawNameFromGeoJSON})`);
        if (!allCandidatesData || !partiesMap) {
            console.error("Map Explorer: Candidate or parties data not available for display.");
             listContent.innerHTML = '<p>Nødvendig data er ikke lastet inn.</p>';
            return;
        }

        // Finn data for den aktuelle valgkretsen ved å bruke standardnavnet
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
         // Finn mandattall ved å bruke standardnavnet
         const mandateCount = constituencyMandates[constituencyName];

         // Oppdater tittel - bruk rå-navnet hvis det finnes, ellers standardnavnet
        const displayTitle = rawNameFromGeoJSON || constituencyName;
        const panelTitle = displayPanel?.querySelector('h2');
         if (panelTitle) {
            panelTitle.textContent = `${displayTitle} ${typeof mandateCount === 'number' ? '(' + mandateCount + ' mandater)' : '(mandattall ukjent)'}`;
         } else {
             console.warn("Map Explorer: Panel title element (h2) not found.");
         }


        // Sjekk om data ble funnet
        if (!constituencyData || !constituencyData.parties || constituencyData.parties.length === 0) {
            console.warn(`Map Explorer: No candidate data found for constituency: ${constituencyName}`);
            listContent.innerHTML = `<p>Fant ingen kandidatdata for ${displayTitle}.</p>`;
            return;
        }

        // Tøm tidligere innhold
        listContent.innerHTML = '';

        // Sorter partiene basert på 'position' i partiesMap for konsistent rekkefølge
        const sortedParties = constituencyData.parties.sort((a, b) => {
            const partyAInfo = partiesMap[a.partyId];
            const partyBInfo = partiesMap[b.partyId];
            const posA = partyAInfo ? partyAInfo.position : Infinity;
            const posB = partyBInfo ? partyBInfo.position : Infinity;
            return posA - posB;
        });

        // Bygg HTML for kandidatlisten
        const ul = document.createElement('ul');
        ul.className = 'candidate-list-by-party'; // Bruk en klasse for styling

        sortedParties.forEach(partyData => {
            const partyInfo = partiesMap[partyData.partyId];
            if (!partyInfo) {
                console.warn(`Map Explorer: Party info not found for partyId: ${partyData.partyId}`);
                return; // Hopp over partier vi ikke har info om
            }

            // Lag et listeelement for partiet
            const partyLi = document.createElement('li');
            partyLi.className = 'party-candidate-group';

            // Partioverskrift
            const partyHeader = document.createElement('div');
            partyHeader.className = 'party-header';
            partyHeader.style.backgroundColor = partyInfo.color || '#ccc'; // Bruk partiets farge
            partyHeader.innerHTML = `
                 <img src="img/logoer/${partyInfo.logo}" alt="${partyInfo.name} logo" class="party-logo-small">
                 <h3>${partyInfo.name}</h3>
             `;
            partyLi.appendChild(partyHeader);

            // Liste over kandidater for dette partiet
             const candidateUl = document.createElement('ul');
             candidateUl.className = 'candidates-in-group';
             partyData.candidates.forEach(candidate => {
                 const candidateLi = document.createElement('li');
                 candidateLi.className = 'candidate-item';
                 candidateLi.innerHTML = `
                     <span class="candidate-rank">${candidate.rank}.</span>
                     <span class="candidate-name">${candidate.name}</span>
                     ${candidate.realistic_chance ? '<span class="realistic-chance-indicator" title="Vurdert til å ha realistisk sjanse for å komme inn">★</span>' : ''}
                 `;
                 candidateUl.appendChild(candidateLi);
             });
            partyLi.appendChild(candidateUl);


            ul.appendChild(partyLi);
        });

        listContent.appendChild(ul);

        // Scroll panelet til toppen
         if (displayPanel) {
           displayPanel.scrollTop = 0;
         }
    }

    // Kall hovedfunksjonen for å starte lasting av data
    loadData();

});
