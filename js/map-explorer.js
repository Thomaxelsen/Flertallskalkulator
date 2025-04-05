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

    // Mandatfordeling (sist oppdatert basert på bildet ditt)
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
    };


    // DOM element referanser
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');

    // Sti til GeoJSON-filen
    const geoJsonPath = 'data/valgdistrikter.geojson';

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
            throw error;
        }
    }

    // Hovedfunksjon for å laste all nødvendig data
    async function loadData() {
        if (loader) loader.style.display = 'block';

        // Håndter lasting av partiesMap (som før)
        if (typeof partiesDataLoaded === 'undefined' || !window.partiesData) {
            console.log("Map Explorer: partiesData not ready, waiting or fetching...");
            const partiesPromise = new Promise((resolve, reject) => {
                if (window.partiesData) {
                    resolve(window.partiesData); return;
                }
                const listener = () => { resolve(window.partiesData); window.removeEventListener('partiesDataLoaded', listener); };
                window.addEventListener('partiesDataLoaded', listener);
                setTimeout(() => {
                    window.removeEventListener('partiesDataLoaded', listener);
                    if (!window.partiesData) {
                        loadJson('data/parties.json').then(resolve).catch(reject);
                    } else { resolve(window.partiesData); }
                }, 2000);
            });
            partiesMap = await partiesPromise;
        } else {
            partiesMap = window.partiesData;
        }
        if (!partiesMap) {
            console.error("Map Explorer: Failed to load parties data. Cannot proceed.");
            // ... feilhåndtering ...
            return;
        }

        try {
            const [candidates, geoJson] = await Promise.all([
                loadJson('data/candidates.json'),
                loadJson(geoJsonPath)
            ]);
            allCandidatesData = candidates;
            geoJsonData = geoJson;
            console.log("Map Explorer: All data loaded successfully.");
            initMapExplorer();
        } catch (error) {
            console.error("Map Explorer: Error loading initial data:", error);
            // ... feilhåndtering ...
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }


    // Funksjon for å initialisere kartutforskeren
    function initMapExplorer() {
         if (!mapContainer) { console.error("Map Explorer: Map container element not found!"); return; }
        if (map) { map.remove(); map = null; }
         map = L.map(mapContainer).setView([64.5, 17.5], 4.5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        let features = geoJsonData?.features;
        if (!features && geoJsonData?.Valgdistrikt?.features) {
             features = geoJsonData.Valgdistrikt.features;
        }
        if (features?.length > 0) {
            geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                style: styleFeature, onEachFeature: onEachFeature
            }).addTo(map);
             try {
                 if (geoJsonLayer.getBounds().isValid()) { map.fitBounds(geoJsonLayer.getBounds()); }
             } catch(e) { console.error("Map Explorer: Error fitting bounds:", e); }
        } else {
            console.error("Map Explorer: No valid GeoJSON features found.");
        }
    }

    // Funksjon for å style hvert kartområde (feature)
    function styleFeature(feature) { return { fillColor: '#d9d9d9', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.6 }; }

    // Funksjon som kjøres for hvert kartområde
    function onEachFeature(feature, layer) {
        if (feature.properties?.valgdistriktsnavn) {
             layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: zoomAndShowCandidates });
         } else { console.warn("Map Explorer: Feature missing valgdistriktsnavn:", feature); }
    }

    // Funksjon for å utheve område ved mouseover
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({ weight: 3, color: '#666', fillOpacity: 0.8 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) { layer.bringToFront(); }
    }

    // Funksjon for å resette stil ved mouseout
    function resetHighlight(e) {
         if (geoJsonLayer && e.target !== selectedLayer) { geoJsonLayer.resetStyle(e.target); }
    }

    // Funksjon for å håndtere klikk på et område
    function zoomAndShowCandidates(e) {
        const layer = e.target;
        if (selectedLayer && geoJsonLayer) { try { geoJsonLayer.resetStyle(selectedLayer); } catch (err) {} }
        layer.setStyle({ fillColor: '#add8e6', fillOpacity: 0.9 });
        layer.bringToFront();
        selectedLayer = layer;

        const rawNameFromGeoJSON = layer.feature.properties.valgdistriktsnavn;
        let lookupName = geoJsonNameMapping[rawNameFromGeoJSON] || rawNameFromGeoJSON;
        const constituencyName = lookupName;

        if (constituencyName) {
             console.log(`Map Explorer JS: Using lookup name: '${constituencyName}' (original GeoJSON name was '${rawNameFromGeoJSON}')`);
             displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON);
        } else {
            console.error("Map Explorer JS: Could not determine usable constituency name!", layer?.feature?.properties);
            if(listContent) listContent.innerHTML = "<p>Kunne ikke identifisere valgkrets.</p>";
             const panelTitle = displayPanel?.querySelector('h2');
             if (panelTitle) panelTitle.textContent = "Velg valgkrets";
        }
    }

    // Funksjon for å vise kandidater for en gitt valgkrets
    function displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON) {
        console.log("Map Explorer: Displaying candidates for:", constituencyName, `(Original: ${rawNameFromGeoJSON})`);
        if (!allCandidatesData || !partiesMap) {
            console.error("Map Explorer: Candidate or parties data not available for display.");
             listContent.innerHTML = '<p>Nødvendig data er ikke lastet inn.</p>';
            return;
        }

        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];

        const panelTitle = displayPanel?.querySelector('h2');
         if (panelTitle) {
            panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '(' + mandateCount + ' mandater)' : '(mandattall ukjent)'}`;
         }

        if (!constituencyData || !constituencyData.parties || constituencyData.parties.length === 0) {
            console.warn(`Map Explorer: No candidate data found or parties array empty for: ${constituencyName}`);
            listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`;
            return;
        }

        listContent.innerHTML = ''; // Tømmer innhold

        // Sorter partiene (som før)
        const sortedParties = constituencyData.parties.sort((a, b) => {
             // Bruker partyShorthand for å finne posisjon
             const partyAInfo = partiesMap[a.partyShorthand];
             const partyBInfo = partiesMap[b.partyShorthand];
             const posA = partyAInfo ? partyAInfo.position : Infinity;
             const posB = partyBInfo ? partyBInfo.position : Infinity;
            if (posA === posB) {
                 const nameA = partyAInfo ? partyAInfo.name : (a.partyName || ''); // Fallback til partyName
                 const nameB = partyBInfo ? partyBInfo.name : (b.partyName || '');
                 return nameA.localeCompare(nameB);
            }
            return posA - posB;
        });

        const ul = document.createElement('ul');
        ul.className = 'candidate-list-by-party';

        sortedParties.forEach(partyData => {
             // === ENDRING 1: Sjekk og bruk partyShorthand for oppslag ===
             const partyKey = partyData.partyShorthand; // Bruk shorthand som nøkkel
             if (!partyData || typeof partyKey === 'undefined' || !partyKey) {
                 console.warn('Map Explorer: Skipping invalid party entry (missing partyShorthand):', partyData, 'in constituency:', constituencyName);
                 return; // Hopp over denne
             }

            const partyInfo = partiesMap[partyKey]; // Slå opp med shorthand

            if (!partyInfo) {
                 // Bruk partyName fra candidates.json som fallback hvis partyInfo ikke finnes
                 console.warn(`Map Explorer: Party info not found in partiesMap using key (partyShorthand): ${partyKey}. Using partyName from candidates.json as fallback.`);
                 // Lag et midlertidig partyInfo-objekt for visning
                 const fallbackPartyInfo = {
                    name: partyData.partyName || `Ukjent parti (${partyKey})`,
                    logo: 'default.png', // Sett inn en standard logo-sti
                    color: '#cccccc'     // Sett en standardfarge
                 };
                 displayPartyCandidates(ul, fallbackPartyInfo, partyData.candidates); // Kall hjelpefunksjon
                 return; // Gå til neste parti
             }
             // === SLUTT ENDRING 1 ===

             displayPartyCandidates(ul, partyInfo, partyData.candidates); // Kall hjelpefunksjon
        });

        listContent.appendChild(ul);

         if (displayPanel) { displayPanel.scrollTop = 0; }
    }

    // Hjelpefunksjon for å bygge HTML for ett parti og dets kandidater
    function displayPartyCandidates(mainUl, partyInfo, candidatesData) {
         const partyLi = document.createElement('li');
         partyLi.className = 'party-candidate-group';

         const partyHeader = document.createElement('div');
         partyHeader.className = 'party-header';
         partyHeader.style.backgroundColor = partyInfo.color || '#ccc';
         partyHeader.innerHTML = `
             <img src="img/logoer/${partyInfo.logo || 'default.png'}" alt="${partyInfo.name} logo" class="party-logo-small">
             <h3>${partyInfo.name}</h3>
         `;
         partyLi.appendChild(partyHeader);

         const candidateUl = document.createElement('ul');
         candidateUl.className = 'candidates-in-group';
         if (Array.isArray(candidatesData)) {
             candidatesData.forEach(candidate => {
                 if (candidate && candidate.name) {
                     const candidateLi = document.createElement('li');
                     candidateLi.className = 'candidate-item';
                     // === ENDRING 2: Bruk hasRealisticChance ===
                     candidateLi.innerHTML = `
                         <span class="candidate-rank">${candidate.rank || '?'}.</span>
                         <span class="candidate-name">${candidate.name}</span>
                         ${candidate.hasRealisticChance ? '<span class="realistic-chance-indicator" title="Vurdert til å ha realistisk sjanse for å komme inn">★</span>' : ''}
                     `;
                     // === SLUTT ENDRING 2 ===
                     candidateUl.appendChild(candidateLi);
                 } else {
                     console.warn('Map Explorer: Skipping invalid candidate entry:', candidate, 'in party:', partyInfo.name);
                 }
             });
         } else {
             console.warn(`Map Explorer: 'candidates' property is not an array for party: ${partyInfo.name}`, candidatesData);
         }
         partyLi.appendChild(candidateUl);
         mainUl.appendChild(partyLi);
    }


    // Kall hovedfunksjonen for å starte lasting av data
    loadData();

});
