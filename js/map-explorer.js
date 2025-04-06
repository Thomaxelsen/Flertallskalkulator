document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded"); // Tilbake til normal melding

    // Globale variabler
    let allCandidatesData = null;
    let partiesMap = null;
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping GeoJSON -> Standard navn
    const geoJsonNameMapping = {
        "Nordland – Nordlánnda": "Nordland",
        "Troms – Romsa – Tromssa": "Troms",
        "Finnmark – Finnmárku – Finmarkku": "Finnmark"
    };

    // Mandatfordeling
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
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

    // --- Modal Funksjoner ---
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

    // Hjelpefunksjon for å laste JSON
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

    // Hovedfunksjon for datalasting
    async function loadData() {
        if (!loader) {
             console.error("Map loader element not found!");
             // Prøv å fortsette uten loader? Eller vis feil i panelet.
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
                // Vurder om vi skal avbryte her, eller prøve å laste manuelt
                try {
                    console.log("Map Explorer: Attempting manual fetch of parties.json as fallback...");
                    const partyDataFallback = await loadJson('data/parties.json');
                    window.partiesData = partyDataFallback;
                    window.partiesDataLoaded = true; // Sett flagget manuelt
                } catch (fallbackError) {
                     console.error("Map Explorer: Fallback fetch of parties.json also failed:", fallbackError);
                     if (loader) loader.style.display = 'none';
                     if (listContent) listContent.innerHTML = '<p class="error">Kunne ikke laste partidatene. Siden kan ikke vises.</p>';
                     return; // Avbryt hvis partidatene feilet helt
                }
            }
        }
        
        // Opprett partiesMap etter at data er garantert (eller forsøkt) lastet
        partiesMap = {};
        if (window.partiesData) {
            window.partiesData.forEach(p => partiesMap[p.shorthand] = p);
            console.log("Map Explorer: partiesMap created/updated.");
        } else {
            console.error("Map Explorer: window.partiesData is missing after loading attempt!");
             if (loader) loader.style.display = 'none';
             if (listContent) listContent.innerHTML = '<p class="error">Kritisk feil med partidatene.</p>';
             return; // Avbryt
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

    // Kart initialisering (Tilbake til original med feilhåndtering)
    function initMapExplorer() {
        console.log("Map Explorer: Initializing map...");
        if (!mapContainer) { console.error("Map container element not found!"); return; }
        if (map) { // Fjern gammelt kart hvis det finnes (f.eks. ved re-init)
             console.log("Map Explorer: Removing existing map instance.");
             map.remove(); 
             map = null; 
        }

        try {
            map = L.map(mapContainer, { // Initialiser kartet
                 // Evt. legg til flere Leaflet options her om nødvendig
            }).setView([64.5, 17.5], 4.5); // Sett startposisjon
            console.log("Map Explorer: L.map object created.");

            // Legg til bakgrunnskart (Tile layer)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            console.log("Map Explorer: Base map tiles added.");

            // Legg til GeoJSON laget
            let features = geoJsonData?.Valgdistrikt?.features || geoJsonData?.features; // Håndterer begge mulige strukturer
            if (features && Array.isArray(features) && features.length > 0) {
                console.log("Map Explorer: Adding GeoJSON layer with", features.length, "features...");
                geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                    style: styleFeature, // Funksjon for å style lagene
                    onEachFeature: onEachFeature // Funksjon for å legge til interaksjon
                }).addTo(map);
                console.log("Map Explorer: GeoJSON layer added.");

                // Prøv å tilpasse kartutsnittet til dataen
                try {
                    const bounds = geoJsonLayer.getBounds();
                    if (bounds.isValid()) {
                         console.log("Map Explorer: Fitting map bounds...");
                         map.fitBounds(bounds, { padding: [10, 10] }); // Litt padding
                    } else {
                         console.warn("Map Explorer: GeoJSON layer bounds are not valid. Skipping fitBounds.");
                    }
                } catch(e) {
                    console.error("Map Explorer: Error getting or fitting bounds:", e);
                }
            } else {
                console.warn("Map Explorer: No valid GeoJSON features found to add to map.");
                 if (listContent) listContent.innerHTML = '<p class="error">Fant ingen data for valgdistrikter.</p>'; // Vis feil i panelet
            }

           console.log("Map Explorer: Map initialization complete.");
           if (listContent && listContent.innerHTML === '') { // Hvis panelet er tomt, vis standardmelding
                listContent.innerHTML = '<p>Klikk på en valgkrets på kartet for å se kandidatene.</p>';
           }

        } catch (initError) {
            console.error("Map Explorer: CRITICAL ERROR during map initialization:", initError);
            // Vis en tydelig feilmelding i stedet for kartet
             if (mapContainer) {
                 mapContainer.innerHTML = `<p class="error" style="padding: 20px; text-align: center;">Kunne ikke laste kartet.<br><small>${initError.message}</small></p>`;
             }
             if (listContent) listContent.innerHTML = ''; // Tøm panelet ved kritisk feil
        }
    }

    // --- Kart interaksjon (Uendret) ---
    function styleFeature(feature) { return { fillColor: '#d9d9d9', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.6 }; }
    function onEachFeature(feature, layer) { 
        if (feature.properties?.valgdistriktsnavn) {
            layer.on({ 
                mouseover: highlightFeature, 
                mouseout: resetHighlight, 
                click: zoomAndShowCandidates 
            }); 
            // Legg til tooltip (valgfritt men nyttig)
            const rawName = feature.properties.valgdistriktsnavn;
            const displayName = geoJsonNameMapping[rawName] || rawName;
            layer.bindTooltip(displayName);
        } else {
             console.warn("GeoJSON feature missing 'valgdistriktsnavn' property:", feature.properties);
        }
    }
    function highlightFeature(e) { 
        const layer = e.target; 
        layer.setStyle({ weight: 3, color: '#666', dashArray: '', fillOpacity: 0.8 }); 
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
             layer.bringToFront(); 
        }
        // Vis info i panelet på hover? (Valgfritt)
        // const rawName = layer.feature.properties.valgdistriktsnavn;
        // const constituencyName = geoJsonNameMapping[rawName] || rawName;
        // if(displayPanel?.querySelector('h2')) displayPanel.querySelector('h2').textContent = constituencyName;
    }
    function resetHighlight(e) { 
        if (geoJsonLayer && e.target !== selectedLayer) { // Ikke reset den valgte
             geoJsonLayer.resetStyle(e.target); 
        }
        // Tilbakestill panel-tittel hvis den ble endret på hover
        // if(displayPanel?.querySelector('h2') && !selectedLayer) displayPanel.querySelector('h2').textContent = "Velg valgkrets";
        // else if (displayPanel?.querySelector('h2') && selectedLayer) { /* Vis den valgte kretsens navn */ }
    }
    function zoomAndShowCandidates(e) {
         const layer = e.target;
         // Reset stil for forrige valgte lag
         if (selectedLayer && geoJsonLayer) {
             try { 
                 geoJsonLayer.resetStyle(selectedLayer); 
             } catch (err) { 
                 console.warn("Could not reset style of previous layer:", err); 
             }
         }
         // Sett stil og flytt nytt valgt lag til toppen
         layer.setStyle({ fillColor: '#add8e6', weight: 2, color: '#333', fillOpacity: 0.9 }); 
         if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
         }
         selectedLayer = layer; // Oppdater valgt lag

         // Finn navnet og vis kandidater
         const rawName = layer.feature.properties.valgdistriktsnavn;
         const constituencyName = geoJsonNameMapping[rawName] || rawName;
         if (constituencyName) {
             console.log(`Clicked on: ${constituencyName}`);
             displayCandidatesForConstituency(constituencyName); // Vis kandidatene
             // Zoom til valgt krets (valgfritt)
             // map.fitBounds(layer.getBounds()); 
         } else {
             console.error("Could not get constituency name from clicked feature:", layer.feature.properties);
              if(listContent) listContent.innerHTML = '<p class="error">Kunne ikke identifisere valgt valgkrets.</p>';
         }
    }

    // --- Kandidatvisning (Uendret) ---
    function displayCandidatesForConstituency(constituencyName) { // Fjernet rawName, ikke nødvendig her
        console.log("Map Explorer: Displaying candidates for:", constituencyName);
        if (!allCandidatesData || !partiesMap) {
             console.error("Map Explorer: Candidate or party data missing for display.");
             if(listContent) listContent.innerHTML = '<p class="error">Kunne ikke hente kandidatdata.</p>';
             return;
        }
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];
        const panelTitle = displayPanel?.querySelector('h2');
        if (panelTitle) panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '('+mandateCount+' mandater)' : '(mandattall ukjent)'}`; // Oppdatert for å vise mandater

        if (!constituencyData?.parties?.length) {
            listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`;
            return;
        }
        listContent.innerHTML = ''; // Tøm
        // Sorter partier etter posisjon
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
             // Bruk map for å finne info, fallback til data fra kandidatfilen
            let partyInfo = partiesMap[partyKey] || { 
                name: partyData.partyName || `Ukjent (${partyKey})`, 
                color: '#ccc', 
                classPrefix: partyKey.toLowerCase() // Lag fallback classPrefix
            };
            
            // Sjekk om kandidatdata er et array
            if (!Array.isArray(partyData.candidates)) {
                console.warn(`'candidates' is not an array for party ${partyInfo.name} in ${constituencyName}. Skipping party.`);
                return; // Hopp over dette partiet hvis kandidatlisten mangler/er feil
            }

            displayPartyCandidates(ul, partyInfo, partyData.candidates);
        });
        listContent.appendChild(ul);
        if (displayPanel) { displayPanel.scrollTop = 0; } // Scroll til toppen av panelet
    }

    // Hjelpefunksjon for å bygge HTML for ett parti og dets kandidater (Uendret)
    function displayPartyCandidates(mainUl, partyInfo, candidatesData) {
         const partyLi = document.createElement('li');
         partyLi.className = 'party-candidate-group';

         const partyHeader = document.createElement('div');
         partyHeader.className = 'party-header';
         partyHeader.style.backgroundColor = partyInfo.color || '#ccc';
         partyHeader.innerHTML = `<h3>${partyInfo.name}</h3>`; // Uten logo
         partyLi.appendChild(partyHeader);

         const candidateUl = document.createElement('ul');
         candidateUl.className = 'candidates-in-group';

         // Sorter kandidater etter rank før visning
         const sortedCandidates = candidatesData.sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity));

         sortedCandidates.forEach(candidate => {
             if (candidate?.name) {
                 const candidateLi = document.createElement('li');
                 candidateLi.className = 'map-candidate-card'; // Kort-klassen

                 // Sett partifarge som top-border dynamisk
                 candidateLi.style.borderTop = `4px solid ${partyInfo.color || '#ccc'}`;

                 // Bygg innerHTML for kortet
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

                 // Legg til klikk-lytter for å vise modal
                 candidateLi.addEventListener('click', (event) => {
                     event.stopPropagation(); // Hindre at klikket går videre til kartet e.l.
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
