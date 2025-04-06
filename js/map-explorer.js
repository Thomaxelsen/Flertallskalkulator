document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded");

    // Globale variabler
    let allCandidatesData = null;
    let partiesMap = null;
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping GeoJSON -> Standard navn (som før)
    const geoJsonNameMapping = {
        "Nordland – Nordlánnda": "Nordland",
        "Troms – Romsa – Tromssa": "Troms",
        "Finnmark – Finnmárku – Finmarkku": "Finnmark"
        // Legg til flere her hvis GeoJSON bruker samiske/kvenske navn for andre distrikter
    };

    // Mandatfordeling (som før)
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
    };

    // *** NYTT: Farger for politisk sannsynlighet ***
    const leaningColors = {
        "Sikker venstre": "#D32F2F",    // Sterk rød
        "Heller mot venstre": "#FFCDD2", // Lys rød/rosa
        "Sikker sentrum": "#388E3C",    // Sterk grønn
        "Heller mot sentrum": "#C8E6C9", // Lys grønn
        "Sikker høyre": "#1976D2",      // Sterk blå
        "Heller mot høyre": "#BBDEFB",   // Lys blå
        "Helt uavklart": "#BDBDBD"      // Nøytral grå
    };
    const defaultLeaningColor = leaningColors["Helt uavklart"]; // Fallback-farge

    // *** NYTT: Data for politisk sannsynlighet per valgkrets ***
    // Bruker standardiserte navn som nøkler (samme som i constituencyMandates)
    const constituencyLeaning = {
        "Aust-Agder": "Heller mot høyre",
        "Akershus": "Sikker høyre",
        "Buskerud": "Heller mot høyre",
        "Finnmark": "Helt uavklart",
        "Hedmark": "Sikker venstre",
        "Hordaland": "Heller mot høyre",
        "Møre og Romsdal": "Sikker høyre",
        "Nord-Trøndelag": "Heller mot venstre",
        "Nordland": "Heller mot venstre",
        "Oppland": "Heller mot venstre", // Rettet fra "Opland"
        "Oslo": "Helt uavklart",
        "Rogaland": "Sikker høyre",
        "Sogn og Fjordane": "Helt uavklart",
        "Sør-Trøndelag": "Sikker venstre",
        "Telemark": "Helt uavklart",    // Rettet fra "Telemarks"
        "Troms": "Heller mot høyre",
        "Vest-Agder": "Sikker høyre",
        "Vestfold": "Sikker høyre",
        "Østfold": "Heller mot høyre"
    };


    // DOM referanser (inkl modal)
    const mapContainer = document.getElementById('map-container');
    const displayPanel = document.getElementById('candidate-display-panel');
    const listContent = document.getElementById('candidate-list-content');
    const loader = document.getElementById('map-loader');
    const modalElement = document.getElementById('candidate-modal');
    const modalCloseButton = modalElement?.querySelector('.modal-close-button');
    const modalCandidateName = document.getElementById('modal-candidate-name');
    const modalCandidateParty = document.getElementById('modal-candidate-party');
    const modalCandidateAge = document.getElementById('modal-candidate-age');
    const modalCandidateLocation = document.getElementById('modal-candidate-location');
    const modalCandidateEmail = document.getElementById('modal-candidate-email');
    const modalCandidatePhone = document.getElementById('modal-candidate-phone');

    // Sti til GeoJSON
    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Modal Funksjoner (uendret) ---
    function showCandidateDetails(candidateData, partyInfo) {
        if (!modalElement || !candidateData || !partyInfo) return;
        if (modalCandidateName) modalCandidateName.textContent = candidateData.name || 'Ukjent';
        if (modalCandidateParty) modalCandidateParty.textContent = partyInfo.name || 'Ukjent';
        if (modalCandidateAge) modalCandidateAge.textContent = candidateData.age || 'Ukjent';
        if (modalCandidateLocation) modalCandidateLocation.textContent = candidateData.location || 'Ukjent';
        if (modalCandidateEmail) modalCandidateEmail.innerHTML = candidateData.email ? `<a href="mailto:${candidateData.email}">${candidateData.email}</a>` : 'Ikke oppgitt';
        if (modalCandidatePhone) modalCandidatePhone.innerHTML = candidateData.phone ? `<a href="tel:${candidateData.phone}">${candidateData.phone}</a>` : 'Ikke oppgitt';
        modalElement.style.display = 'block';
    }
    function closeModal() { if (modalElement) modalElement.style.display = 'none'; }
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modalElement) closeModal(); });
    // --- Slutt Modal Funksjoner ---

    // Hjelpefunksjon for å laste JSON (uendret)
    async function loadJson(url) {
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${url}`);
            return await r.json();
        } catch (e) {
            console.error(`Loading ${url} failed:`, e);
            throw e;
        }
    }

    // Hovedfunksjon for datalasting (uendret)
    async function loadData() {
        if (!loader) {
             console.error("Map loader element not found!");
        } else {
            loader.style.display = 'block';
        }
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
        try {
            console.log("Map Explorer: Loading candidates and GeoJSON...");
            const [candidates, geoJson] = await Promise.all([
                loadJson('data/candidates.json'),
                loadJson(geoJsonPath)
            ]);
            allCandidatesData = candidates;
            geoJsonData = geoJson;
            console.log("Map Explorer: Candidates and GeoJSON loaded.");
            initMapExplorer();
        } catch (error) {
            console.error("Map Explorer: Error loading main data (candidates/GeoJSON):", error);
            if(listContent) listContent.innerHTML = `<p class="error">Kunne ikke laste kart- eller kandidatdata: ${error.message}</p>`;
        }
        finally {
            console.log("Map Explorer: Hiding loader.");
            if (loader) loader.style.display = 'none';
        }
    }

    // Kart initialisering (uendret)
    function initMapExplorer() {
        console.log("Map Explorer: Initializing map...");
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
            let features = geoJsonData?.Valgdistrikt?.features || geoJsonData?.features;
            if (features && Array.isArray(features) && features.length > 0) {
                console.log("Map Explorer: Adding GeoJSON layer with", features.length, "features...");
                geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                    // *** ENDRING: styleFeature KALLER NÅ DEN NYE FUNKSJONEN ***
                    style: styleFeatureWithLeaning,
                    onEachFeature: onEachFeature
                }).addTo(map);
                console.log("Map Explorer: GeoJSON layer added.");
                try {
                    const bounds = geoJsonLayer.getBounds();
                    if (bounds.isValid()) {
                         console.log("Map Explorer: Fitting map bounds...");
                         map.fitBounds(bounds, { padding: [10, 10] });
                    } else {
                         console.warn("Map Explorer: GeoJSON layer bounds are not valid. Skipping fitBounds.");
                    }
                } catch(e) {
                    console.error("Map Explorer: Error getting or fitting bounds:", e);
                }
            } else {
                console.warn("Map Explorer: No valid GeoJSON features found to add to map.");
                 if (listContent) listContent.innerHTML = '<p class="error">Fant ingen data for valgdistrikter.</p>';
            }
           console.log("Map Explorer: Map initialization complete.");
           if (listContent && listContent.innerHTML === '') {
                listContent.innerHTML = '<p>Klikk på en valgkrets på kartet for å se kandidatene.</p>';
           }
        } catch (initError) {
            console.error("Map Explorer: CRITICAL ERROR during map initialization:", initError);
             if (mapContainer) {
                 mapContainer.innerHTML = `<p class="error" style="padding: 20px; text-align: center;">Kunne ikke laste kartet.<br><small>${initError.message}</small></p>`;
             }
             if (listContent) listContent.innerHTML = '';
        }
    }

    // *** NY FUNKSJON: Bestemmer stil basert på politisk sannsynlighet ***
    function styleFeatureWithLeaning(feature) {
        const rawName = feature?.properties?.valgdistriktsnavn;
        // Bruk mapping for å få standardisert navn (viktig for oppslag)
        const standardName = geoJsonNameMapping[rawName] || rawName;
        // Finn sannsynligheten fra vår data-objekt
        const leaning = constituencyLeaning[standardName];
        // Finn riktig farge, bruk default hvis ikke funnet
        const fillColor = leaning ? leaningColors[leaning] : defaultLeaningColor;

        // Returner stil-objektet
        return {
            fillColor: fillColor, // Fargen basert på sannsynlighet
            weight: 1,            // Tynn hvit kant mellom distriktene
            opacity: 1,
            color: 'white',
            fillOpacity: 0.70     // Gjør fargen litt transparent så kartet under synes
        };
    }

    // --- Kart interaksjon (MODIFISERT for hover og klikk) ---
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

    // Hover-effekt: Gjør fargen sterkere og legg til mørkere kant
    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 2,          // Tykkere kant
            color: '#555',      // Mørk grå kant
            dashArray: '',      // Hel linje
            fillOpacity: 0.85   // Mer solid farge
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
             layer.bringToFront();
        }
    }

    // Reset hover: Tilbakestill til den originale stilen definert av styleFeatureWithLeaning
    function resetHighlight(e) {
        if (geoJsonLayer && e.target !== selectedLayer) {
             geoJsonLayer.resetStyle(e.target); // resetStyle bruker automatisk den originale style-funksjonen
        }
    }

    // Klikk-effekt: Legg til en tydelig svart kant for å markere valgt distrikt
    function zoomAndShowCandidates(e) {
         const layer = e.target;
         // Tilbakestill forrige valgte lag
         if (selectedLayer && geoJsonLayer && selectedLayer !== layer) {
             try {
                 geoJsonLayer.resetStyle(selectedLayer);
             } catch (err) {
                 console.warn("Could not reset style of previous layer:", err);
             }
         }

         // Sett stil for det NYE valgte laget
         layer.setStyle({
            weight: 3,          // Tykk, tydelig kant
            color: '#000000',   // Svart kant
            dashArray: '',
            fillOpacity: 0.80   // Litt mer solid farge enn standard
         });
         if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
         }
         selectedLayer = layer; // Oppdater referansen til valgt lag

         // Vis kandidater (som før)
         const rawName = layer.feature.properties.valgdistriktsnavn;
         const constituencyName = geoJsonNameMapping[rawName] || rawName;
         if (constituencyName) {
             console.log(`Clicked on: ${constituencyName}`);
             displayCandidatesForConstituency(constituencyName);
             // map.fitBounds(layer.getBounds()); // Zoom kan beholdes om ønskelig
         } else {
             console.error("Could not get constituency name from clicked feature:", layer.feature.properties);
              if(listContent) listContent.innerHTML = '<p class="error">Kunne ikke identifisere valgt valgkrets.</p>';
         }
    }

    // --- Kandidatvisning (uendret) ---
    function displayCandidatesForConstituency(constituencyName) {
        console.log("Map Explorer: Displaying candidates for:", constituencyName);
        if (!allCandidatesData || !partiesMap) {
             console.error("Map Explorer: Candidate or party data missing for display.");
             if(listContent) listContent.innerHTML = '<p class="error">Kunne ikke hente kandidatdata.</p>';
             return;
        }
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];
        const panelTitle = displayPanel?.querySelector('h2');
        if (panelTitle) panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '('+mandateCount+' mandater)' : '(mandattall ukjent)'}`;

        if (!constituencyData?.parties?.length) {
            listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`;
            return;
        }
        listContent.innerHTML = '';
        const sortedParties = constituencyData.parties.sort((a, b) => {
            const pA = partiesMap[a.partyShorthand]; const pB = partiesMap[b.partyShorthand];
            const posA = pA?.position ?? Infinity; const posB = pB?.position ?? Infinity;
            if (posA === posB) return (pA?.name || a.partyName || '').localeCompare(pB?.name || b.partyName || '');
            return posA - posB;
        });

        const ul = document.createElement('ul'); ul.className = 'candidate-list-by-party';
        sortedParties.forEach(partyData => {
            const partyKey = partyData.partyShorthand;
            if (!partyData || !partyKey) {
                console.warn("Skipping party data due to missing info:", partyData);
                return;
            }
            let partyInfo = partiesMap[partyKey] || {
                name: partyData.partyName || `Ukjent (${partyKey})`,
                color: '#ccc',
                classPrefix: partyKey.toLowerCase()
            };
            if (!Array.isArray(partyData.candidates)) {
                console.warn(`'candidates' is not an array for party ${partyInfo.name} in ${constituencyName}. Skipping party.`);
                return;
            }
            displayPartyCandidates(ul, partyInfo, partyData.candidates);
        });
        listContent.appendChild(ul);
        if (displayPanel) { displayPanel.scrollTop = 0; }
    }

    // Hjelpefunksjon for å bygge HTML for ett parti og dets kandidater (uendret)
    function displayPartyCandidates(mainUl, partyInfo, candidatesData) {
         const partyLi = document.createElement('li');
         partyLi.className = 'party-candidate-group';
         const partyHeader = document.createElement('div');
         partyHeader.className = 'party-header';
         partyHeader.style.backgroundColor = partyInfo.color || '#ccc';
         partyHeader.innerHTML = `<h3>${partyInfo.name}</h3>`;
         partyLi.appendChild(partyHeader);
         const candidateUl = document.createElement('ul');
         candidateUl.className = 'candidates-in-group';
         const sortedCandidates = candidatesData.sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity));
         sortedCandidates.forEach(candidate => {
             if (candidate?.name) {
                 const candidateLi = document.createElement('li');
                 candidateLi.className = 'map-candidate-card';
                 candidateLi.style.borderTop = `4px solid ${partyInfo.color || '#ccc'}`;
                 candidateLi.innerHTML = `
                     <div class="card-rank-container">
                          <span class="candidate-rank">${candidate.rank || '?'}</span>
                     </div>
                     <div class="card-details-container">
                          <span class="candidate-name">${candidate.name}</span>
                          ${candidate.location ? `<span class="candidate-location">${candidate.location}</span>` : ''}
                     </div>
                     ${candidate.hasRealisticChance ? `<div class="card-star-container"><span class="realistic-chance-indicator" title="Vurdert til å ha realistisk sjanse for å komme inn">★</span></div>` : ''}
                 `;
                 candidateLi.addEventListener('click', (event) => {
                     event.stopPropagation();
                     showCandidateDetails(candidate, partyInfo);
                 });
                 candidateUl.appendChild(candidateLi);
             } else { console.warn('Skipping invalid candidate entry:', candidate); }
         });
         partyLi.appendChild(candidateUl);
         mainUl.appendChild(partyLi);
    }

    // --- Initialiser ved å laste data ---
    loadData();
});
