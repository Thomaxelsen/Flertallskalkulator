document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded (with Block Coloring - Fix Attempt)");

    // --- Definisjoner for Blokk-farging ---
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
    let partiesMap = {};
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null;
    let selectedLayer = null;

    // Mapping GeoJSON -> Standard navn (uendret)
    const geoJsonNameMapping = {
        "Nordland – Nordlánnda": "Nordland",
        "Troms – Romsa – Tromssa": "Troms",
        "Finnmark – Finnmárku – Finmarkku": "Finnmark"
    };
    // Mandatfordeling (uendret)
    const constituencyMandates = {
        "Østfold": 9, "Akershus": 20, "Oslo": 20, "Hedmark": 7, "Oppland": 6,
        "Buskerud": 8, "Vestfold": 7, "Telemark": 6, "Aust-Agder": 4, "Vest-Agder": 6,
        "Rogaland": 14, "Hordaland": 16, "Sogn og Fjordane": 4, "Møre og Romsdal": 8,
        "Sør-Trøndelag": 10, "Nord-Trøndelag": 5, "Nordland": 9, "Troms": 6, "Finnmark": 4
    };

    // DOM referanser (inkl modal) (uendret)
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

    const geoJsonPath = 'data/valgdistrikter.geojson';

    // --- Modal Funksjoner (uendret) ---
    function showCandidateDetails(candidateData, partyInfo) { /* ... (som før) ... */ }
    function closeModal() { /* ... (som før) ... */ }
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modalElement) closeModal(); });
    // --- Slutt Modal Funksjoner ---

    // --- START: Funksjon for å beregne blokk-flertall (NÅ MED BEDRE SJEKK) ---
    function calculateBlockLeanings(candidatesData) {
        console.log("Map Explorer: Calculating block leanings...");
        const leanings = {};
        // ----- FIKS: Sjekker grundigere om candidatesData er et gyldig array -----
        if (!Array.isArray(candidatesData)) {
            console.error("Invalid candidatesData received for block calculation. Expected an array, got:", typeof candidatesData);
            // Prøv å logge hva det faktisk er for debugging:
            // console.log("Actual data received:", candidatesData); 
            return leanings; // Returner tomt objekt ved feil
        }
        // -----------------------------------------------------------------------

        candidatesData.forEach(constituency => {
            // Sjekker også constituency og parties grundigere
            if (!constituency || typeof constituency !== 'object' || !constituency.constituencyName || !Array.isArray(constituency.parties)) {
                 console.warn("Skipping invalid constituency data during block calculation:", constituency);
                 return; 
            }

            let countLeft = 0;
            let countRight = 0;

            constituency.parties.forEach(party => {
                 // Sjekker party og candidates grundigere
                if (!party || typeof party !== 'object' || !party.partyShorthand || !Array.isArray(party.candidates)) {
                     console.warn(`Skipping invalid party data in ${constituency.constituencyName}:`, party);
                     return; 
                 }

                const isLeft = partiesLeft.includes(party.partyShorthand);
                const isRight = partiesRight.includes(party.partyShorthand);

                if (isLeft || isRight) {
                    party.candidates.forEach(candidate => {
                        // Sjekker candidate objektet og hasRealisticChance
                        if (candidate && typeof candidate === 'object' && candidate.hasRealisticChance === true) {
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
                leanings[constituency.constituencyName] = "Tie";
            }
        });
        console.log("Map Explorer: Block leanings calculation finished.");
        return leanings;
    }
    // --- SLUTT: Funksjon for å beregne blokk-flertall ---


    // Hjelpefunksjon for å laste JSON (uendret)
    async function loadJson(url) { /* ... (som før) ... */ }

    // Hovedfunksjon for datalasting (MODIFISERT: Kaller calculateBlockLeanings etter sjekk)
    async function loadData() {
        if (loader) loader.style.display = 'block';
        
        partiesMap = {}; // Nullstill før lasting
        // Last partidata (som før)
        if (!window.partiesDataLoaded) { /* ... (kode for å vente/hente partidta) ... */ }
        if (window.partiesData) { window.partiesData.forEach(p => partiesMap[p.shorthand] = p); }
        /* ... (resten av feilhåndtering for partidata) ... */
        if (!partiesMap || Object.keys(partiesMap).length === 0) {
            // Håndter manglende partidta kritisk
            console.error("CRITICAL: Failed to load partiesMap.");
            if (loader) loader.style.display = 'none';
            if (listContent) listContent.innerHTML = '<p class="error">Kunne ikke laste nødvendige partidatene.</p>';
            return; 
        }

        // Last resten av dataen
        try {
            console.log("Map Explorer: Loading candidates and GeoJSON...");
            const [candidates, geoJson] = await Promise.all([
                loadJson('data/candidates.json'),
                loadJson(geoJsonPath)
            ]);
            allCandidatesData = candidates; // Sett data globalt
            geoJsonData = geoJson;
            console.log("Map Explorer: Candidates and GeoJSON loaded.");

            // ----- FIKS: Sjekk FØR beregning -----
            if (Array.isArray(allCandidatesData)) {
                constituencyBlockLeaning = calculateBlockLeanings(allCandidatesData);
            } else {
                console.error("Loaded candidate data is not an array! Skipping block calculation.");
                constituencyBlockLeaning = {}; // Sett til tomt objekt for å unngå feil videre
            }
            // ------------------------------------

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

    // Kart initialisering (uendret fra forrige versjon med farger)
    function initMapExplorer() {
         console.log("Map Explorer: Initializing map...");
         /* ... (Resten av initMapExplorer som før, bruker styleFeature) ... */
         if (!mapContainer) { console.error("Map container element not found!"); return; }
         if (map) { console.log("Map Explorer: Removing existing map instance."); map.remove(); map = null; }

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
                     style: styleFeature, // Bruker den oppdaterte styleFeature
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

    // --- Kart interaksjon (uendret fra forrige versjon med farger) ---
    function styleFeature(feature) { /* ... (som før, bruker constituencyBlockLeaning) ... */
        const defaultStyle = {
            fillColor: blockColors.Tie, weight: 1, opacity: 1, color: 'white', fillOpacity: blockOpacity
        };
        if (feature.properties?.valgdistriktsnavn) {
            const rawName = feature.properties.valgdistriktsnavn;
            const constituencyName = geoJsonNameMapping[rawName] || rawName;
            const leaning = constituencyBlockLeaning[constituencyName]; 
            if (leaning === "Left") defaultStyle.fillColor = blockColors.Left;
            else if (leaning === "Right") defaultStyle.fillColor = blockColors.Right;
        }
        return defaultStyle;
    }
    function onEachFeature(feature, layer) { /* ... (som før) ... */
         if (feature.properties?.valgdistriktsnavn) {
            layer.on({ mouseover: highlightFeature, mouseout: resetHighlight, click: zoomAndShowCandidates }); 
            const rawName = feature.properties.valgdistriktsnavn;
            const displayName = geoJsonNameMapping[rawName] || rawName;
            layer.bindTooltip(displayName);
        } else { console.warn("GeoJSON feature missing 'valgdistriktsnavn' property:", feature.properties); }
    }
    function highlightFeature(e) { /* ... (som før) ... */
        const layer = e.target; 
        layer.setStyle({ weight: 3, color: '#666', dashArray: '', fillOpacity: 0.8 }); 
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront(); 
    }
    function resetHighlight(e) { /* ... (som før, bruker styleFeature for reset) ... */
        const layer = e.target;
        if (layer !== selectedLayer) layer.setStyle(styleFeature(layer.feature));
    }
    function zoomAndShowCandidates(e) { /* ... (som før, bruker styleFeature for reset) ... */
         const layer = e.target;
         if (selectedLayer && selectedLayer !== layer) {
             try { selectedLayer.setStyle(styleFeature(selectedLayer.feature)); } 
             catch (err) { console.warn("Could not reset style of previous layer:", err); }
         }
         layer.setStyle({ fillColor: '#add8e6', weight: 2, color: '#333', fillOpacity: 0.9 }); 
         if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
         selectedLayer = layer;

         const rawName = layer.feature.properties.valgdistriktsnavn;
         const constituencyName = geoJsonNameMapping[rawName] || rawName;
         if (constituencyName) {
             console.log(`Clicked on: ${constituencyName} (Leaning: ${constituencyBlockLeaning[constituencyName] || 'N/A'})`);
             displayCandidatesForConstituency(constituencyName);
         } else { console.error("Could not get constituency name from clicked feature:", layer.feature.properties); if(listContent) listContent.innerHTML = '<p class="error">Kunne ikke identifisere valgt valgkrets.</p>'; }
    }


    // --- Kandidatvisning (Uendret) ---
    function displayCandidatesForConstituency(constituencyName) { /* ... (som før) ... */
         console.log("Map Explorer: Displaying candidates for:", constituencyName);
         if (!allCandidatesData || !partiesMap) { console.error("Map Explorer: Candidate or party data missing for display."); if(listContent) listContent.innerHTML = '<p class="error">Kunne ikke hente kandidatdata.</p>'; return; }
         const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
         const mandateCount = constituencyMandates[constituencyName];
         const panelTitle = displayPanel?.querySelector('h2');
         if (panelTitle) panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '('+mandateCount+' mandater)' : '(mandattall ukjent)'}`; 

         if (!constituencyData || !Array.isArray(constituencyData.parties)) { // Sjekk også at parties er array
             listContent.innerHTML = `<p>Fant ingen gyldig kandidatdata for ${constituencyName}.</p>`;
             return;
         }
         listContent.innerHTML = ''; 
         const sortedParties = [...constituencyData.parties].sort((a, b) => { // Bruk spread for å unngå å endre originalen
             const pA = partiesMap[a.partyShorthand]; const pB = partiesMap[b.partyShorthand];
             const posA = pA?.position ?? Infinity; const posB = pB?.position ?? Infinity;
             if (posA === posB) return (pA?.name || a.partyName || '').localeCompare(pB?.name || b.partyName || '');
             return posA - posB;
         });

         const ul = document.createElement('ul'); ul.className = 'candidate-list-by-party';
         sortedParties.forEach(partyData => {
             const partyKey = partyData.partyShorthand;
             if (!partyData || !partyKey) { console.warn("Skipping party data due to missing info:", partyData); return; }
             let partyInfo = partiesMap[partyKey] || { name: partyData.partyName || `Ukjent (${partyKey})`, color: '#ccc', classPrefix: partyKey.toLowerCase() };
             if (!Array.isArray(partyData.candidates)) { console.warn(`'candidates' is not an array for party ${partyInfo.name} in ${constituencyName}. Skipping party.`); return; }
             displayPartyCandidates(ul, partyInfo, partyData.candidates);
         });
         listContent.appendChild(ul);
         if (displayPanel) { displayPanel.scrollTop = 0; } 
    }

    function displayPartyCandidates(mainUl, partyInfo, candidatesData) { /* ... (som før) ... */
        const partyLi = document.createElement('li'); partyLi.className = 'party-candidate-group';
        const partyHeader = document.createElement('div'); partyHeader.className = 'party-header'; partyHeader.style.backgroundColor = partyInfo.color || '#ccc'; partyHeader.innerHTML = `<h3>${partyInfo.name}</h3>`; partyLi.appendChild(partyHeader);
        const candidateUl = document.createElement('ul'); candidateUl.className = 'candidates-in-group';
        const sortedCandidates = [...candidatesData].sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity)); // Bruk spread
        sortedCandidates.forEach(candidate => {
             if (candidate?.name) {
                 const candidateLi = document.createElement('li'); candidateLi.className = 'map-candidate-card'; 
                 candidateLi.style.borderTop = `4px solid ${partyInfo.color || '#ccc'}`;
                 candidateLi.innerHTML = `
                     <div class="card-rank-container"><span class="candidate-rank">${candidate.rank || '?'}</span></div>
                     <div class="card-details-container">
                          <span class="candidate-name">${candidate.name}</span>
                          ${candidate.location ? `<span class="candidate-location">${candidate.location}</span>` : ''}
                     </div>
                     ${candidate.hasRealisticChance ? `<div class="card-star-container"><span class="realistic-chance-indicator" title="Vurdert til å ha realistisk sjanse for å komme inn">★</span></div>` : ''}
                 `;
                 candidateLi.addEventListener('click', (event) => { event.stopPropagation(); showCandidateDetails(candidate, partyInfo); });
                 candidateUl.appendChild(candidateLi);
             } else { console.warn('Skipping invalid candidate entry:', candidate); }
         });
        partyLi.appendChild(candidateUl); mainUl.appendChild(partyLi);
    }

    // --- Initialiser ved å laste data ---
    loadData();
});
