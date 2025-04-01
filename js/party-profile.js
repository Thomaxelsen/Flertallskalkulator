// js/party-profile.js

document.addEventListener('DOMContentLoaded', function() {
    console.log("Party Profile: DOM loaded. Waiting for data...");

    // Globale variabler for å holde data
    let issuesData = [];
    let partiesData = [];
    let partiesMap = {}; // Map for raskt oppslag <shorthand, partyObject>

    // Flagg for å vite når data er klar
    let issuesReady = false;
    let partiesReady = false;

    // --- Datainnlasting og Initialisering ---

    // Sjekk om data allerede er lastet globalt
    if (window.issues && window.issues.length > 0) {
        console.log("Party Profile: Issues data found globally.");
        issuesData = window.issues;
        issuesReady = true;
    }
    if (window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) {
        console.log("Party Profile: Parties data found globally.");
        partiesData = window.partiesData;
        partiesReady = true;
    }

    // Lytt etter at data blir lastet hvis ikke klar
    document.addEventListener('issuesDataLoaded', () => {
        if (!issuesReady) {
            console.log("Party Profile: 'issuesDataLoaded' event received.");
            issuesData = window.issues || [];
            if (issuesData.length > 0) issuesReady = true;
            else console.error("Party Profile: Issues data loaded, but is empty!");
            checkAndInitialize();
        }
    });

    document.addEventListener('partiesDataLoaded', () => {
        if (!partiesReady) {
            console.log("Party Profile: 'partiesDataLoaded' event received.");
            partiesData = window.partiesData || [];
             if (partiesData.length > 0) partiesReady = true;
             else console.error("Party Profile: Parties data loaded, but is empty!");
            checkAndInitialize();
        }
    });

    // Hjelpefunksjon for å starte når alt er klart
    function checkAndInitialize() {
        if (issuesReady && partiesReady) {
            console.log("Party Profile: Both issues and parties ready. Initializing.");
            // Lag parti-map for raskere oppslag
            partiesData.forEach(p => partiesMap[p.shorthand] = p);
            initializeProfilePage();
        } else {
             console.log(`Party Profile: Still waiting... Issues: ${issuesReady}, Parties: ${partiesReady}`);
             // Hvis en mangler, forsikre at laste-scriptene kjører
             if (!issuesReady && typeof loadIssuesData === 'function') {
                // console.log("Triggering issues load"); loadIssuesData(); // Kan være nødvendig i noen scenarioer
             }
              if (!partiesReady && typeof loadPartiesData === 'function') {
                 // console.log("Triggering parties load"); loadPartiesData(); // Sikrer at partiesData.js funksjonen kjøres
             } else if (!partiesReady && !document.querySelector('script[src="js/partiesData.js"]')) {
                 // Fallback hvis partiesData.js ikke er inkludert/funksjonen ikke finnes
                  fetch('data/parties.json').then(r=>r.json()).then(data => {
                     window.partiesData = data; window.partiesDataLoaded = true; document.dispatchEvent(new CustomEvent('partiesDataLoaded'));
                 }).catch(e => console.error("PP Fallback fetch parties failed", e));
             }
        }
    }

    // Kalles når data er klar - setter opp dropdown og lytter
    function initializeProfilePage() {
        const partySelect = document.getElementById('party-select');
        if (!partySelect) {
            console.error("Party select dropdown (#party-select) not found!");
            return;
        }

        // Fjern eventuell gammel lytter før vi legger til ny
        partySelect.removeEventListener('change', handlePartySelection);

        // Tøm dropdown (unntatt placeholder)
        partySelect.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

        // Fyll partivelger, sortert etter posisjon
        const sortedParties = [...partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));
        sortedParties.forEach(party => {
            const option = document.createElement('option');
            option.value = party.shorthand;
            option.textContent = party.name;
            partySelect.appendChild(option);
        });

        // Legg til lytter for valg
        partySelect.addEventListener('change', handlePartySelection);

        console.log("Party Profile: Page initialized, dropdown populated.");
    }

    // Kjører sjekk med en gang i tilfelle data var klar
    checkAndInitialize();


    // --- Kjernefunksjoner ---

    // Kalles når brukeren velger et parti i dropdown
    function handlePartySelection() {
        const selectedShorthand = this.value;
        const profileContent = document.getElementById('profile-content');
        if (!profileContent) {
            console.error("Profile content container (#profile-content) not found!");
            return;
        }

        // Nullstill hvis "Velg parti..." er valgt
        if (!selectedShorthand) {
            profileContent.innerHTML = `<div class="profile-placeholder"><p>Velg et parti fra menyen over for å se detaljer.</p></div>`;
            return;
        }

        // Vis en enkel loader
        profileContent.innerHTML = `<div class="profile-placeholder"><p>Laster profil for ${partiesMap[selectedShorthand]?.name || selectedShorthand}...</p></div>`;
        profileContent.style.opacity = '0.5'; // Gjør litt transparent mens den laster

        // Bruk setTimeout for å la nettleseren rendre loaderen før potensiell tung prosessering
        setTimeout(() => {
            try {
                 displayPartyProfile(selectedShorthand);
                 profileContent.style.opacity = '1'; // Vis innholdet
            } catch(error) {
                 console.error("Error displaying party profile:", error);
                 profileContent.innerHTML = `<div class="profile-placeholder error"><p>Beklager, en feil oppstod under lasting av profilen. Prøv igjen senere.</p><p><small>${error.message}</small></p></div>`;
                 profileContent.style.opacity = '1';
            }
        }, 50); // 50ms er vanligvis nok
    }

    // Analyserer all issue-data for ETT spesifikt parti
    function processPartyData(partyShorthand) {
        // Initialiser et objekt for å holde partiets profildata
        const partyProfile = {
            shorthand: partyShorthand,
            info: partiesMap[partyShorthand] || {}, // Partiets grunninfo (navn, farge, seter etc.)
            stanceCounts: { level2: 0, level1: 0, level0: 0, total: 0 }, // Teller for hver standpunkttype
            issuesByLevel: { level2: [], level1: [], level0: [] }, // Lister med saker for hver standpunkttype
            scoresByArea: {} // Objekt for å holde score per saksområde
        };

        // Sikkerhetssjekk hvis partiet mot formodning ikke finnes i mapen
        if (!partyProfile.info.shorthand) {
            console.warn(`Party Profile: Could not find complete party info for ${partyShorthand} in partiesMap.`);
            partyProfile.info = { shorthand: partyShorthand, name: partyShorthand }; // Fallback
        }

        const areasTemp = {}; // Midlertidig objekt for å samle data per område

        // Gå gjennom alle saker i datasettet
        issuesData.forEach(issue => {
            partyProfile.stanceCounts.total++; // Øk totalt antall saker sjekket
            let level = 0; // Standard: Anta ingen støtte hvis ikke annet er spesifisert
            let quote = null; // Standard: Ingen sitat

            // Sjekk om det finnes et standpunkt for dette partiet i denne saken
            if (issue.partyStances && issue.partyStances[partyShorthand]) {
                const stance = issue.partyStances[partyShorthand];
                level = stance.level ?? 0; // Bruk 0 hvis level er undefined/null
                quote = stance.quote;
            }

            // Oppdater tellinger basert på nivå
            if (level === 2) partyProfile.stanceCounts.level2++;
            else if (level === 1) partyProfile.stanceCounts.level1++;
            else partyProfile.stanceCounts.level0++;

            // Lag et objekt med nødvendig info om saken for listevisning
            const issueDetails = { id: issue.id, name: issue.name, area: issue.area, quote: quote };
            // Legg saken til i riktig liste basert på nivå
            if (level === 2) partyProfile.issuesByLevel.level2.push(issueDetails);
            else if (level === 1) partyProfile.issuesByLevel.level1.push(issueDetails);
            else partyProfile.issuesByLevel.level0.push(issueDetails);

            // Hvis saken har et definert område, samle data for område-score
            if (issue.area) {
                if (!areasTemp[issue.area]) {
                    // Initialiser hvis dette er første sak i området
                    areasTemp[issue.area] = { totalPoints: 0, count: 0 };
                }
                // Legg til nivå-poeng (0, 1 eller 2) og øk telleren for antall saker
                areasTemp[issue.area].totalPoints += level;
                areasTemp[issue.area].count++;
            }
        });

        // Beregn endelig score per område etter å ha gått gjennom alle saker
        for (const areaName in areasTemp) {
            const areaData = areasTemp[areaName];
            partyProfile.scoresByArea[areaName] = {
                totalPoints: areaData.totalPoints,
                count: areaData.count,
                // Regn ut gjennomsnittlig score (mellom 0 og 2)
                averageScore: areaData.count > 0 ? (areaData.totalPoints / areaData.count) : 0
            };
        }

        // Sorter områdedata alfabetisk på navn for konsistent visning i radar chart
         const sortedAreaEntries = Object.entries(partyProfile.scoresByArea)
                                        .sort((a, b) => a[0].localeCompare(b[0]));
         // Lag et format Plotly forstår bedre for radar chart (liste med objekter)
         partyProfile.sortedAreas = sortedAreaEntries.map(([areaName, data]) => ({ name: areaName, score: data.averageScore }));

        // Returner det ferdigbehandlede profilobjektet
        return partyProfile;
    }

    // Bygger og viser HTML-innholdet for det valgte partiets profil
    function displayPartyProfile(partyShorthand) {
        // 1. Behandle data for det valgte partiet
        const profileData = processPartyData(partyShorthand);
        const profileContent = document.getElementById('profile-content');
        if (!profileContent) return; // Dobbeltsjekk at container finnes

        // 2. Tøm eksisterende innhold
        profileContent.innerHTML = '';

        // 3. Lag Header-delen av profilen
        const headerDiv = document.createElement('div');
        headerDiv.className = 'profile-header';
        const party = profileData.info; // Hent partiinfo fra profildata
        // Bruker CSS-klasser fra styles.css og party-profile.css
        headerDiv.innerHTML = `
            <div class="party-icon icon-${party.classPrefix || party.shorthand.toLowerCase()}" style="background-color: ${party.color || '#ccc'}">
                ${party.shorthand?.charAt(0) || '?'}
            </div>
            <h2>${party.name || partyShorthand}</h2>
            <div class="party-seat-count">${party.seats != null ? party.seats : '?'}</div>
        `;
        profileContent.appendChild(headerDiv);

        // 4. Lag seksjon for diagrammer
        const chartsDiv = document.createElement('div');
        chartsDiv.className = 'profile-charts';
        // Legg til plassholdere (divs) hvor Plotly skal tegne diagrammene
        chartsDiv.innerHTML = `
            <div class="chart-container">
                <h3>Fordeling av Standpunkt</h3>
                <div id="plotly-stance-chart"></div>
            </div>
            <div class="chart-container">
                <h3>Gjennomsnittlig Støtte per Saksområde</h3>
                <div id="plotly-area-chart"></div>
            </div>
        `;
        profileContent.appendChild(chartsDiv);

        // 5. Kall Plotly-funksjoner for å tegne diagrammene
        // Sender med nødvendig data (tellinger for kakediagram, områdescore for radar)
        createStanceChart(profileData.stanceCounts, profileData.info);
        createAreaChart(profileData.sortedAreas, profileData.info);

        // 6. Lag seksjon for saksdetaljer (med faner)
        const issuesDiv = document.createElement('div');
        issuesDiv.className = 'profile-issues-section';
        // Bygg HTML for faneknapper og innholds-divs (som starter skjult, unntatt den første)
        issuesDiv.innerHTML = `
            <h3>Detaljert Saksoversikt</h3>
            <div class="issues-tabs">
                 <button class="tab-button active" data-tab="level2">Full enighet (${profileData.stanceCounts.level2})</button>
                 <button class="tab-button" data-tab="level1">Delvis enighet (${profileData.stanceCounts.level1})</button>
                 <button class="tab-button" data-tab="level0">Ingen støtte (${profileData.stanceCounts.level0})</button>
            </div>
             <div class="tab-content active" id="tab-content-level2">
                ${generateIssueListHTML(profileData.issuesByLevel.level2, 'agree')}
            </div>
            <div class="tab-content" id="tab-content-level1">
                 ${generateIssueListHTML(profileData.issuesByLevel.level1, 'partial')}
             </div>
             <div class="tab-content" id="tab-content-level0">
                 ${generateIssueListHTML(profileData.issuesByLevel.level0, 'disagree')}
            </div>
        `;
        profileContent.appendChild(issuesDiv);

        // 7. Aktiver fane-funksjonalitet for den nettopp opprettede seksjonen
        setupProfileTabs(issuesDiv);
        console.log(`Party Profile: Displayed profile for ${partyShorthand}`);
    }


    // --- Plotly Diagram Funksjoner ---

    // Lager kake/doughnut-diagram for standpunktfordeling
    function createStanceChart(stanceCounts, partyInfo) {
        const plotDivId = 'plotly-stance-chart'; // ID for div hvor diagrammet skal tegnes
        const data = [{
            // Data for diagrammet: verdier og etiketter
            values: [stanceCounts.level2, stanceCounts.level1, stanceCounts.level0],
            labels: ['Full Enighet (2)', 'Delvis Enighet (1)', 'Ingen Støtte (0)'],
            type: 'pie',
            hole: .4, // Gjør det til et doughnut chart
            marker: {
                // Definer farger for hver del (bør matche resten av UI)
                colors: ['#28a745', '#ffc107', '#dc3545'],
                line: { // Linje mellom segmenter
                  color: '#ffffff',
                  width: 1
                }
            },
            hoverinfo: 'label+percent', // Vis etikett og prosent ved hover
            textinfo: 'value',          // Vis antall (verdi) inne i segmentet
            textfont_size: 14,
            insidetextorientation: 'radial' // Orienter teksten inne i segmentene
        }];

        const layout = {
            // title: { text: `Standpunktfordeling for ${partyInfo.name}`, font: { size: 16 } }, // Kan ha tittel her eller i H3 over
            showlegend: true, // Vis forklaring (legend)
            legend: { x: 0.5, y: -0.1, xanchor: 'center', orientation: 'h' }, // Plasser legend under
            height: 350, // Kan justeres
            margin: { l: 20, r: 20, t: 30, b: 40 }, // Juster marger
            paper_bgcolor: 'rgba(0,0,0,0)', // Gjør bakgrunnen transparent
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        // Forsøk å tegne diagrammet, med feilhåndtering
        try {
            const plotDiv = document.getElementById(plotDivId);
            if (plotDiv) {
                 Plotly.newPlot(plotDivId, data, layout, {responsive: true}); // responsive: true justerer ved vindusendring
            } else {
                console.error(`Element with ID ${plotDivId} not found for Plotly chart.`);
            }
        } catch (e) {
             console.error("Plotly error creating Stance Chart:", e);
             const plotDiv = document.getElementById(plotDivId);
             if (plotDiv) plotDiv.innerHTML = '<p class="error">Kunne ikke laste diagram.</p>';
        }
    }

    // Lager radardiagram for gjennomsnittlig score per saksområde
    function createAreaChart(sortedAreasData, partyInfo) {
        const plotDivId = 'plotly-area-chart';
        // Hent ut etiketter (områdenavn) og verdier (score) fra den sorterte dataen
        const labels = sortedAreasData.map(area => area.name);
        const values = sortedAreasData.map(area => area.score);

        const data = [{
            type: 'scatterpolar', // Typen for radardiagram i Plotly
            r: values,      // Verdiene (score fra 0 til 2) som bestemmer avstand fra sentrum
            theta: labels,  // Kategoriene/aksene (saksområder)
            fill: 'toself', // Fyll området innenfor linjen
            name: partyInfo.name, // Navn som vises i hover/tooltip
             marker: {
                 color: partyInfo.color || '#003087' // Bruk partiets farge, fallback til blå
             },
             line: {
                  color: partyInfo.color || '#003087' // Samme farge for linjen
             }
        }];

        const layout = {
            // title: { text: `Områdeprofil for ${partyInfo.name}`, font: { size: 16 } },
            polar: { // Innstillinger for det polare koordinatsystemet
                radialaxis: { // Aksene som går fra sentrum og utover (våre verdier 0-2)
                    visible: true,
                    range: [0, 2], // Definer at skalaen går fra 0 til 2
                    tickvals: [0, 1, 2], // Vis tydelige markeringer for 0, 1, og 2
                     angle: 90, // Start 0-aksen øverst
                     tickfont: { size: 10 } // Liten font for tallene
                },
                 angularaxis: { // Aksene rundt sirkelen (våre saksområder)
                    tickfont: { size: 10 } // Liten font for områdenavn
                },
                bgcolor: 'rgba(255, 255, 255, 0.6)' // Litt dus hvit bakgrunn for selve sirkelen
            },
            showlegend: false, // Skjul legend (vi har bare én dataserie)
            height: 350,
            margin: { l: 40, r: 40, t: 50, b: 40 }, // Marger for å gi plass til etiketter
            paper_bgcolor: 'rgba(0,0,0,0)', // Transparent papirbakgrunn
            plot_bgcolor: 'rgba(0,0,0,0)'   // Transparent plotbakgrunn
        };

        try {
            const plotDiv = document.getElementById(plotDivId);
             if (plotDiv) {
                Plotly.newPlot(plotDivId, data, layout, {responsive: true});
             } else {
                 console.error(`Element with ID ${plotDivId} not found for Plotly chart.`);
             }
        } catch (e) {
             console.error("Plotly error creating Area Chart:", e);
              const plotDiv = document.getElementById(plotDivId);
              if (plotDiv) plotDiv.innerHTML = '<p class="error">Kunne ikke laste diagram.</p>';
        }
    }

    // --- Hjelpefunksjoner ---

    // Genererer HTML for en liste med saker (likner den i party-overview.js)
    function generateIssueListHTML(issues, agreementTypeClass) {
        // Hvis listen er tom, vis en melding
        if (!issues || issues.length === 0) {
            return '<p class="no-issues">Ingen saker i denne kategorien.</p>';
        }

        // Bygg HTML-strengen for listen
        // Bruker CSS-klasser definert i party-profile.css
        return `<ul class="issue-list">
            ${issues.map(issue => `
                <li class="issue-item ${agreementTypeClass}-item">
                    <strong>${issue.name}</strong>
                    <div class="issue-area">${issue.area || 'Ukjent område'}</div>
                    ${issue.quote ? `<div class="issue-quote">"${issue.quote}"</div>` : ''}
                </li>
            `).join('')}
        </ul>`;
    }

    // Setter opp klikk-hendelser for faneknappene (tabs)
    function setupProfileTabs(issuesSectionElement) {
        const tabButtons = issuesSectionElement.querySelectorAll('.tab-button');
        const tabContents = issuesSectionElement.querySelectorAll('.tab-content');

        // Gå ut hvis vi ikke finner knapper eller innhold
        if (!tabButtons.length || !tabContents.length) return;

        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Finn ID-en til innholdet som skal vises basert på knappens 'data-tab'-attributt
                const tabIdToShow = `tab-content-${this.dataset.tab}`;

                // 1. Fjern 'active'-klassen fra alle knapper og alt innhold
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // 2. Legg 'active'-klassen til den klikkede knappen
                this.classList.add('active');

                // 3. Finn og vis det korresponderende innholdspanelet
                const contentToShow = issuesSectionElement.querySelector(`#${tabIdToShow}`);
                if (contentToShow) {
                    contentToShow.classList.add('active');
                } else {
                     // Skriv ut advarsel hvis innholdet ikke ble funnet (bør ikke skje)
                     console.warn(`Could not find tab content with ID: ${tabIdToShow}`);
                }
            });
        });
    }

}); // Slutt på DOMContentLoaded-lytteren
