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

    // === START: OPPDATERT MANDATFORDELING ===
    // Tall hentet fra bildet image_e58d97.png (kolonne "Ny fordeling")
    const constituencyMandates = {
        "Østfold": 9,
        "Akershus": 20,    // Fra 19
        "Oslo": 20,        // Fra 21/20
        "Hedmark": 7,
        "Oppland": 6,
        "Buskerud": 8,     // Fra 9/8
        "Vestfold": 7,     // Fra 8/7
        "Telemark": 6,
        "Aust-Agder": 4,
        "Vest-Agder": 6,
        "Rogaland": 14,    // Fra 15/14
        "Hordaland": 16,   // Fra 17/16
        "Sogn og Fjordane": 4,
        "Møre og Romsdal": 8, // Fra 9/8
        "Sør-Trøndelag": 10,
        "Nord-Trøndelag": 5, // Fra 4
        "Nordland": 9,     // Fra 8
        "Troms": 6,        // Fra 5
        "Finnmark": 4      // Fra 2/5
    };
    // === SLUTT: OPPDATERT MANDATFORDELING ===


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

        if (typeof partiesDataLoaded === 'undefined' || !window.partiesData) {
            console.log("Map Explorer: partiesData not ready, waiting or fetching...");
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
                     if (!window.partiesData) {
                        console.warn("Map Explorer: Timeout waiting for partiesDataLoaded event. Fetching parties.json directly.");
                        loadJson('data/parties.json').then(resolve).catch(reject);
                    } else {
                        resolve(window.partiesData);
                    }
                }, 2000);
            });
             partiesMap = await partiesPromise;
        } else {
            console.log("Map Explorer: partiesData already available globally.");
            partiesMap = window.partiesData;
        }


         if (!partiesMap) {
            console.error("Map Explorer: Failed to load parties data. Cannot proceed.");
            if (listContent) listContent.innerHTML = '<p>Kunne ikke laste partidata. Siden kan ikke vises.</p>';
            if (loader) loader.style.display = 'none';
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
            if (mapContainer && !map) {
                 mapContainer.innerHTML = `<p style="color: red; padding: 10px;">Kunne ikke laste nødvendige data for kartet (${error.message}). Prøv å laste siden på nytt.</p>`;
            } else if (listContent) {
                 listContent.innerHTML = `<p style="color: red;">Kunne ikke laste kandidatdata (${error.message}).</p>`;
            }
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }


    // Funksjon for å initialisere kartutforskeren
    function initMapExplorer() {
         if (!mapContainer) {
            console.error("Map Explorer: Map container element not found!");
            return;
        }
        if (map) {
             console.log("Map Explorer: Map already initialized. Removing old instance.");
             map.remove();
             map = null;
        }


         map = L.map(mapContainer).setView([64.5, 17.5], 4.5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        let features = geoJsonData && geoJsonData.features;
        if (!features && geoJsonData && geoJsonData.Valgdistrikt && geoJsonData.Valgdistrikt.features) {
             console.warn("Map Explorer: GeoJSON features found under 'Valgdistrikt' key. Using those.");
             features = geoJsonData.Valgdistrikt.features;
        }


        if (features && features.length > 0) {
            geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                style: styleFeature,
                onEachFeature: onEachFeature
            }).addTo(map);

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
        return {
            fillColor: '#d9d9d9',
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.6
        };
    }

    // Funksjon som kjøres for hvert kartområde
    function onEachFeature(feature, layer) {
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
    }

    // Funksjon for å resette stil ved mouseout
    function resetHighlight(e) {
         if (geoJsonLayer && e.target !== selectedLayer) {
            geoJsonLayer.resetStyle(e.target);
         }
    }

    // Funksjon for å håndtere klikk på et område
    function zoomAndShowCandidates(e) {
        const layer = e.target;

        if (selectedLayer && geoJsonLayer) {
             try {
                geoJsonLayer.resetStyle(selectedLayer);
             } catch (err) { console.warn("Map Explorer: Could not reset style on previous layer", err); }
        }

        layer.setStyle({
             fillColor: '#add8e6',
             fillOpacity: 0.9
         });
         layer.bringToFront();
         selectedLayer = layer;

        const rawNameFromGeoJSON = layer.feature.properties.valgdistriktsnavn;
        let lookupName = geoJsonNameMapping[rawNameFromGeoJSON] || rawNameFromGeoJSON;
        const constituencyName = lookupName;

        if (constituencyName) {
             console.log(`Map Explorer JS: Using lookup name: '${constituencyName}' (original GeoJSON name was '${rawNameFromGeoJSON}')`);
             displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON);
        } else {
            console.error("Map Explorer JS: Could not determine a usable constituency name!", layer?.feature?.properties);
            if(listContent) listContent.innerHTML = "<p>Kunne ikke identifisere valgkrets fra kartdata.</p>";
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
        // Henter det OPPDATERTE mandattallet fra det oppdaterte objektet
        const mandateCount = constituencyMandates[constituencyName];

        const panelTitle = displayPanel?.querySelector('h2');
         if (panelTitle) {
            // Viser standardnavnet og det NYE mandattallet
            panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '(' + mandateCount + ' mandater)' : '(mandattall ukjent)'}`;
         } else {
             console.warn("Map Explorer: Panel title element (h2) not found.");
         }


        if (!constituencyData || !constituencyData.parties || constituencyData.parties.length === 0) {
            console.warn(`Map Explorer: No candidate data found for constituency: ${constituencyName}`);
            listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`;
            return;
        }

        listContent.innerHTML = '';

        const sortedParties = constituencyData.parties.sort((a, b) => {
            const partyAInfo = partiesMap[a.partyId];
            const partyBInfo = partiesMap[b.partyId];
            const posA = partyAInfo ? partyAInfo.position : Infinity;
            const posB = partyBInfo ? partyBInfo.position : Infinity;
            if (posA === posB) {
                 const nameA = partyAInfo ? partyAInfo.name : '';
                 const nameB = partyBInfo ? partyBInfo.name : '';
                 return nameA.localeCompare(nameB);
            }
            return posA - posB;
        });

        const ul = document.createElement('ul');
        ul.className = 'candidate-list-by-party';

        sortedParties.forEach(partyData => {
             if (!partyData || typeof partyData.partyId === 'undefined') {
                 console.warn('Map Explorer: Skipping invalid party entry in candidates.json (missing partyId):', partyData, 'in constituency:', constituencyName);
                 return;
             }

            const partyInfo = partiesMap[partyData.partyId];
            if (!partyInfo) {
                console.warn(`Map Explorer: Party info not found in partiesMap for partyId: ${partyData.partyId}`);
                return;
            }

            const partyLi = document.createElement('li');
            partyLi.className = 'party-candidate-group';

            const partyHeader = document.createElement('div');
            partyHeader.className = 'party-header';
            partyHeader.style.backgroundColor = partyInfo.color || '#ccc';
            partyHeader.innerHTML = `
                 <img src="img/logoer/${partyInfo.logo}" alt="${partyInfo.name} logo" class="party-logo-small">
                 <h3>${partyInfo.name}</h3>
             `;
            partyLi.appendChild(partyHeader);

             const candidateUl = document.createElement('ul');
             candidateUl.className = 'candidates-in-group';
             if (Array.isArray(partyData.candidates)) {
                  partyData.candidates.forEach(candidate => {
                       if (candidate && candidate.name) {
                            const candidateLi = document.createElement('li');
                            candidateLi.className = 'candidate-item';
                            candidateLi.innerHTML = `
                                <span class="candidate-rank">${candidate.rank || '?'}.</span>
                                <span class="candidate-name">${candidate.name}</span>
                                ${candidate.realistic_chance ? '<span class="realistic-chance-indicator" title="Vurdert til å ha realistisk sjanse for å komme inn">★</span>' : ''}
                            `;
                            candidateUl.appendChild(candidateLi);
                         } else {
                              console.warn('Map Explorer: Skipping invalid candidate entry:', candidate, 'in party:', partyInfo.name);
                         }
                  });
             } else {
                  console.warn(`Map Explorer: 'candidates' property is not an array for party: ${partyInfo.name}`, partyData);
             }
            partyLi.appendChild(candidateUl);

            ul.appendChild(partyLi);
        });

        listContent.appendChild(ul);

         if (displayPanel) {
           displayPanel.scrollTop = 0;
         }
    }

    // Kall hovedfunksjonen for å starte lasting av data
    loadData();

});
