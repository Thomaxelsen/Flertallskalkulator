document.addEventListener('DOMContentLoaded', function() {
    console.log("Map Explorer JS Loaded (Test Version - GeoJSON Disabled)"); // Endret loggmelding

    // Globale variabler
    let allCandidatesData = null;
    let partiesMap = null;
    // geoJsonData lastes fortsatt, men brukes ikke til å lage laget
    let geoJsonData = null;
    let map = null;
    let geoJsonLayer = null; // Denne vil ikke bli satt nå
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

    // Lasting av data (som før)
    async function loadJson(url) { try { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); } catch (e) { console.error(`Loading ${url} failed:`, e); throw e; } } // Endret feilmelding
    async function loadData() {
        if (loader) loader.style.display = 'block';
        // Partidata lasting
        if (!window.partiesDataLoaded) {
            console.log("Map Explorer: Waiting for partiesDataLoaded event...");
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("Timeout waiting for partiesDataLoaded")), 5000);
                document.addEventListener('partiesDataLoaded', () => {
                    clearTimeout(timeout);
                    partiesMap = {}; // Initialiser map her
                     if (window.partiesData) {
                        window.partiesData.forEach(p => partiesMap[p.shorthand] = p);
                        console.log("Map Explorer: partiesMap created from event.");
                     } else {
                         console.warn("Map Explorer: partiesDataLoaded event received, but window.partiesData is missing.");
                     }
                    resolve();
                }, { once: true }); // Lytt kun én gang
            });
        } else {
             partiesMap = {}; // Initialiser map her
             if (window.partiesData) {
                window.partiesData.forEach(p => partiesMap[p.shorthand] = p);
                console.log("Map Explorer: Using pre-loaded partiesData.");
             } else {
                  console.warn("Map Explorer: partiesDataLoaded was true, but window.partiesData is missing.");
             }
        }

        if (!partiesMap || Object.keys(partiesMap).length === 0) {
            console.error("Map Explorer: Failed to load or create partiesMap. Aborting.");
            if (loader) loader.style.display = 'none'; // Skjul loader ved feil
            listContent.innerHTML = '<p class="error">Kunne ikke laste partidatene.</p>'; // Vis feilmelding
            return;
        }

        try {
            console.log("Map Explorer: Loading candidates and GeoJSON..."); // Logg før fetch
            const [candidates, geoJson] = await Promise.all([
                loadJson('data/candidates.json'),
                loadJson(geoJsonPath)
            ]);
            allCandidatesData = candidates;
            geoJsonData = geoJson;
            console.log("Map Explorer: Candidates and GeoJSON loaded.");
            initMapExplorer(); // Gå videre til kartinit
        } catch (error) {
            console.error("Map Explorer: Error loading main data:", error);
            if(listContent) listContent.innerHTML = '<p class="error">Kunne ikke laste kart- eller kandidatdata.</p>'; // Mer spesifikk feilmelding
            // Ikke skjul loader her, la finally gjøre det
        }
        finally {
            console.log("Map Explorer: Hiding loader."); // Logg før skjuling
            if (loader) loader.style.display = 'none';
        }
    }

    // Kart initialisering (MODIFISERT - GeoJSON legges ikke til)
    function initMapExplorer() {
        console.log("Map Explorer: Initializing map...");
        if (!mapContainer) { console.error("Map container missing"); return; }
        if (map) { map.remove(); map = null; } // Fjerner gammelt kart om det finnes

        try { // Legg til try-catch rundt kartinit
            map = L.map(mapContainer).setView([64.5, 17.5], 4.5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            console.log("Map Explorer: Base map and tiles added.");

            // ------------- TEST: GEOJSON-LAG ER KOMMENTERT UT -------------
            /*
            let features = geoJsonData?.Valgdistrikt?.features || geoJsonData?.features;
            if (features?.length > 0) {
                console.log("Map Explorer: Adding GeoJSON layer...");
                geoJsonLayer = L.geoJSON({ type: "FeatureCollection", features: features }, {
                    style: styleFeature,
                    onEachFeature: onEachFeature
                }).addTo(map);
                console.log("Map Explorer: GeoJSON layer added.");
                try {
                    if (geoJsonLayer.getBounds().isValid()) {
                         console.log("Map Explorer: Fitting map bounds...");
                         map.fitBounds(geoJsonLayer.getBounds());
                    } else {
                         console.warn("Map Explorer: GeoJSON layer bounds are not valid.");
                    }
                } catch(e) {
                    console.error("Map Explorer: Error fitting bounds:", e);
                }
            } else {
                console.error("Map Explorer: No valid GeoJSON features found to add to map.");
                listContent.innerHTML = '<p class="error">Fant ingen data for valgdistrikter.</p>';
            }
            */
           // ------------- SLUTT PÅ UTKOMMENTERT KODE -------------

           console.log("Map Explorer: Map initialization complete (without GeoJSON districts for this test).");
           // Siden GeoJSON er borte, må vi manuelt informere brukeren
           if (listContent) listContent.innerHTML = '<p>Valgkretser er midlertidig deaktivert for testing. Last siden på nytt for å se normal visning.</p>';


        } catch (initError) {
            console.error("Map Explorer: CRITICAL ERROR during map initialization:", initError);
             if (mapContainer) mapContainer.innerHTML = '<p class="error" style="padding: 20px;">Kunne ikke initialisere kartet.</p>';
             if (listContent) listContent.innerHTML = ''; // Tøm kandidatlisten
        }
    }


    // Kart interaksjon (Disse vil ikke bli brukt nå som GeoJSON-laget er borte)
    function styleFeature(feature) { return { fillColor: '#d9d9d9', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.6 }; }
    function onEachFeature(feature, layer) { /* Vil ikke kalles */ }
    function highlightFeature(e) { /* Vil ikke kalles */ }
    function resetHighlight(e) { /* Vil ikke kalles */ }
    function zoomAndShowCandidates(e) { /* Vil ikke kalles, må trigges manuelt eller via annen UI */ }

    // Vise kandidater (hovedlogikk som før, men må trigges på annen måte nå)
    function displayCandidatesForConstituency(constituencyName, rawNameFromGeoJSON = null) { // rawName valgfri
        console.log("Map Explorer: Displaying candidates for:", constituencyName);
        if (!allCandidatesData || !partiesMap) {
             console.error("Map Explorer: Candidate or party data missing for display.");
             listContent.innerHTML = '<p class="error">Kunne ikke hente kandidatdata.</p>';
             return;
        }
        const constituencyData = allCandidatesData.find(c => c.constituencyName === constituencyName);
        const mandateCount = constituencyMandates[constituencyName];
        const panelTitle = displayPanel?.querySelector('h2');
        if (panelTitle) panelTitle.textContent = `${constituencyName} ${typeof mandateCount === 'number' ? '('+mandateCount+' mandater)' : '(ukjent)'}`;

        if (!constituencyData?.parties?.length) {
            listContent.innerHTML = `<p>Fant ingen kandidatdata for ${constituencyName}.</p>`;
            return;
        }
        listContent.innerHTML = ''; // Tøm
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
            let partyInfo = partiesMap[partyKey] || { name: partyData.partyName || `Ukjent (${partyKey})`, color: '#ccc', logo: null, classPrefix: partyKey.toLowerCase() };

            displayPartyCandidates(ul, partyInfo, partyData.candidates);
        });
        listContent.appendChild(ul);
        if (displayPanel) { displayPanel.scrollTop = 0; }
    }

    // Hjelpefunksjon for å bygge HTML for ett parti og dets kandidater (som før)
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

         if (Array.isArray(candidatesData)) {
             candidatesData.forEach(candidate => {
                 if (candidate?.name) {
                     const candidateLi = document.createElement('li');
                     candidateLi.className = 'map-candidate-card'; // Kort-klassen

                     // Sett partifarge som top-border dynamisk
                     candidateLi.style.borderTop = `4px solid ${partyInfo.color || '#ccc'}`;

                     // Bygg innerHTML for kortet - NÅ MED location og struktur for styling
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

                     // Legg til klikk-lytter
                     candidateLi.addEventListener('click', () => {
                         showCandidateDetails(candidate, partyInfo);
                     });

                     candidateUl.appendChild(candidateLi);
                 } else { console.warn('Skipping invalid candidate entry:', candidate); }
             });
         } else { console.warn(`'candidates' not an array for party: ${partyInfo.name}`); }
         partyLi.appendChild(candidateUl);
         mainUl.appendChild(partyLi);
    }


    // Kall hovedfunksjonen for datalasting
    loadData();
});
