// js/party-similarity.js (v3 - Inkluderer Heatmap OG Radar Sammenligning)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Party Similarity & Radar: DOM loaded. Waiting for data...");

    // Globale variabler
    let issuesData = [];
    let partiesData = [];
    let partiesMap = {}; // Map <shorthand, partyObject>
    let partiesListSorted = []; // Liste med partier sortert etter posisjon
    let areaNamesSorted = []; // Liste med saksområder, sortert

    // Flagg for datastatus
    let issuesReady = false;
    let partiesReady = false;

    // --- Datainnlasting og Initialisering ---

    // Sjekk om data er globalt tilgjengelig
    if (window.issues && window.issues.length > 0) {
        console.log("Party Similarity: Issues data found globally.");
        issuesData = window.issues;
        issuesReady = true;
    }
    if (window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) {
        console.log("Party Similarity: Parties data found globally.");
        partiesData = window.partiesData;
        partiesReady = true;
    }

    // Lytt etter events hvis data mangler
    document.addEventListener('issuesDataLoaded', () => {
        if (!issuesReady) {
            console.log("Party Similarity: 'issuesDataLoaded' event received.");
            issuesData = window.issues || [];
            if (issuesData.length > 0) issuesReady = true;
            checkAndInitialize();
        }
    });
    document.addEventListener('partiesDataLoaded', () => {
        if (!partiesReady) {
            console.log("Party Similarity: 'partiesDataLoaded' event received.");
            partiesData = window.partiesData || [];
             if (partiesData.length > 0) partiesReady = true;
            checkAndInitialize();
        }
    });

    // Hjelpefunksjon for å sjekke om alt er klart
    function checkAndInitialize() {
        if (issuesReady && partiesReady) {
            console.log("Party Similarity: Both issues and parties ready. Initializing page.");
            // Klargjør partidata
            partiesData.forEach(p => partiesMap[p.shorthand] = p);
            partiesListSorted = [...partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));

            // Klargjør sortert liste over saksområder (for radar)
            const uniqueAreas = [...new Set(issuesData.map(i => i.area).filter(Boolean))];
            areaNamesSorted = uniqueAreas.sort((a, b) => a.localeCompare(b)); // Alfabetisk sortering

            // Start generering av innhold
            generateSimilarityHeatmap();
            populateRadarPartyCheckboxes();
            setupRadarUpdateButton();

        } else {
            console.log(`Party Similarity: Still waiting... Issues: ${issuesReady}, Parties: ${partiesReady}`);
        }
    }

    // Kjør sjekk med en gang
    checkAndInitialize();


    // --- Heatmap Funksjoner ---

    // Beregner likhetsscore for heatmap
    function calculateSimilarityScore(partyCodeA, partyCodeB, metric = 'agreement_level2') {
        // ... (Denne funksjonen er uendret fra forrige svar) ...
        let commonIssuesCount = 0;
        let agreementCount = 0;
        if (!issuesData || issuesData.length === 0) return 0;
        issuesData.forEach(issue => {
            const stanceA = issue.partyStances ? issue.partyStances[partyCodeA] : undefined;
            const stanceB = issue.partyStances ? issue.partyStances[partyCodeB] : undefined;
            const hasStanceA = stanceA && typeof stanceA.level !== 'undefined';
            const hasStanceB = stanceB && typeof stanceB.level !== 'undefined';
            if (hasStanceA && hasStanceB) {
                commonIssuesCount++;
                if (metric === 'agreement_level2') {
                    if (stanceA.level === 2 && stanceB.level === 2) {
                        agreementCount++;
                    }
                }
            }
        });
        const score = (commonIssuesCount > 0) ? (agreementCount / commonIssuesCount) * 100 : 0;
        return score;
    }

    // Genererer data og tegner heatmapen
    function generateSimilarityHeatmap() {
        // ... (Denne funksjonen er uendret fra forrige svar, bruker Viridis) ...
        const heatmapContainer = document.getElementById('heatmap-container');
        const loader = heatmapContainer ? heatmapContainer.querySelector('.heatmap-loader') : null; // Sjekk om container finnes
        if (!heatmapContainer) { console.error("Heatmap container (#heatmap-container) not found!"); return; }
        if (partiesListSorted.length === 0) { if(loader) loader.textContent = "Partidata mangler."; return; }

        if(loader) loader.textContent = "Beregner heatmap...";

        const partyCodes = partiesListSorted.map(p => p.shorthand);
        const partyNamesLookup = partiesListSorted.reduce((acc, p) => { acc[p.shorthand] = p.name; return acc; }, {});

        const similarityMatrix = [];
        partyCodes.forEach(partyY => {
            const row = [];
            partyCodes.forEach(partyX => {
                if (partyX === partyY) row.push(-1); // Identifiserer diagonal
                else row.push(parseFloat(calculateSimilarityScore(partyX, partyY).toFixed(1)));
            });
            similarityMatrix.push(row);
        });

        const plotData = [{
            z: similarityMatrix, x: partyCodes, y: partyCodes, type: 'heatmap',
            colorscale: 'Viridis', reversescale: false, hoverongaps: false,
            hovertemplate: (data) => {
                const codeX = data.points[0].x, codeY = data.points[0].y, z = data.points[0].z;
                const nameX = partyNamesLookup[codeX] || codeX, nameY = partyNamesLookup[codeY] || codeY;
                if (z < 0) return `<b>${nameY}</b><extra></extra>`;
                return `<b>${nameY}</b> vs <b>${nameX}</b><br>Enighet: ${z}%<extra></extra>`;
            },
            zmin: 0, zmax: 100,
            text: similarityMatrix.map(row => row.map(val => (val >= 10 ? `${val}%` : ''))),
            texttemplate: "%{text}", hoverinfo: "none",
            colorbar: { title: 'Enighet (%)', titleside: 'right', tickvals: [0, 20, 40, 60, 80, 100], ticktext: ['0%', '20%', '40%', '60%', '80%', '100%'] }
        }];

        const layout = {
            title: 'Partienes Enighet om Kreftforeningens Saker (Heatmap)', // Tydeliggjort tittel
            xaxis: { tickangle: -45, automargin: true, side: 'top', tickfont: { size: 11 } },
            yaxis: { automargin: true, autorange: 'reversed', tickfont: { size: 11 } },
            margin: { l: 60, r: 80, b: 20, t: 120 }, autosize: true
        };

        if(loader) loader.textContent = "Tegner heatmap...";
        try {
            let plotDiv = document.getElementById('plotly-heatmap-div');
            if (!plotDiv) {
                plotDiv = document.createElement('div'); plotDiv.id = 'plotly-heatmap-div';
                heatmapContainer.innerHTML = ''; heatmapContainer.appendChild(plotDiv);
            } else { plotDiv.innerHTML = ''; } // Tøm eventuelt gammelt heatmap

            Plotly.newPlot('plotly-heatmap-div', plotData, layout, {responsive: true});
            console.log("Party Similarity: Heatmap drawn/updated successfully.");
            if(loader) loader.style.display = 'none'; // Skjul loader når ferdig
        } catch(error) {
            console.error("Error drawing Plotly heatmap:", error);
            if(loader) loader.style.display = 'none';
            heatmapContainer.innerHTML = `<div class="heatmap-loader error" style="display: block; color: red;">Kunne ikke vise heatmap: ${error.message}</div>`;
        }
    }


    // --- Radar Chart Funksjoner ---

    // Fyller div#radar-party-checkboxes med checkboxes for hvert parti
    function populateRadarPartyCheckboxes() {
        const container = document.getElementById('radar-party-checkboxes');
        if (!container) { console.error("Checkbox container (#radar-party-checkboxes) not found!"); return; }

        container.innerHTML = ''; // Tøm loader/gammelt innhold

        partiesListSorted.forEach(party => {
            const div = document.createElement('div');
            div.className = 'checkbox-item'; // For evt. spesifikk styling

            const label = document.createElement('label');
            label.htmlFor = `radar-check-${party.shorthand}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `radar-check-${party.shorthand}`;
            checkbox.value = party.shorthand;
            checkbox.name = 'radarparties';

            const colorBox = document.createElement('span');
            colorBox.className = 'party-color-box';
            colorBox.style.backgroundColor = party.color || '#ccc';

            const labelText = document.createElement('span');
            labelText.className = 'party-label-text';
            labelText.textContent = party.name;

            label.appendChild(checkbox);
            label.appendChild(colorBox);
            label.appendChild(labelText);
            div.appendChild(label);
            container.appendChild(div);
        });
        console.log("Party Similarity: Populated radar party checkboxes.");
    }

    // Setter opp lytter for "Oppdater sammenligning"-knappen
    function setupRadarUpdateButton() {
        const button = document.getElementById('update-radar-chart-btn');
        if (button) {
             // Fjern gammel lytter for sikkerhets skyld
             button.removeEventListener('click', handleRadarUpdateClick);
            button.addEventListener('click', handleRadarUpdateClick);
        } else {
            console.error("Update radar chart button (#update-radar-chart-btn) not found!");
        }
    }

    // Håndterer klikk på oppdateringsknappen for radar
    function handleRadarUpdateClick() {
        const checkboxes = document.querySelectorAll('#radar-party-checkboxes input[type="checkbox"]:checked');
        const selectedPartyCodes = Array.from(checkboxes).map(cb => cb.value);
        const radarContainer = document.getElementById('radar-chart-container');
        if (!radarContainer) return;

        if (selectedPartyCodes.length < 2) {
            radarContainer.innerHTML = `<div class="radar-placeholder">Velg minst to partier for å sammenligne.</div>`;
            // Fjern eventuelt gammelt plot hvis det finnes
             let plotDiv = document.getElementById('plotly-radar-chart-div');
             if (plotDiv) plotDiv.remove();
            return;
        }

        console.log("Party Similarity: Updating radar chart for:", selectedPartyCodes);
        radarContainer.innerHTML = `<div class="radar-placeholder">Beregner data for radardiagram...</div>`; // Vis loader

        // Bruk setTimeout for å la loader vises
        setTimeout(() => {
            try {
                const radarData = getRadarDataForSelectedParties(selectedPartyCodes);
                createOrUpdateRadarChart(radarData);
            } catch (error) {
                console.error("Error creating radar chart:", error);
                radarContainer.innerHTML = `<div class="radar-placeholder error" style="color: red;">Kunne ikke lage radardiagram: ${error.message}</div>`;
            }
        }, 50);
    }

    // Beregner gj.snittlig områdescore for en liste med valgte partier
    function getRadarDataForSelectedParties(selectedPartyCodes) {
        const traces = []; // Array for å holde Plotly trace-objekter (ett per parti)

        selectedPartyCodes.forEach(partyCode => {
            const partyInfo = partiesMap[partyCode];
            if (!partyInfo) return; // Hopp over hvis partiinfo mangler

            const scoresByArea = {}; // { areaName: { totalPoints: X, count: Y, avgScore: Z }, ... }

            issuesData.forEach(issue => {
                if (!issue.area) return; // Hopp over saker uten område

                let level = 0;
                if (issue.partyStances && issue.partyStances[partyCode]) {
                    level = issue.partyStances[partyCode].level ?? 0;
                }

                if (!scoresByArea[issue.area]) {
                    scoresByArea[issue.area] = { totalPoints: 0, count: 0 };
                }
                scoresByArea[issue.area].totalPoints += level;
                scoresByArea[issue.area].count++;
            });

            // Beregn gjennomsnitt og klargjør data for den sorterte listen av områder
            const radialValues = []; // Listen 'r' for Plotly
            areaNamesSorted.forEach(areaName => {
                const areaData = scoresByArea[areaName];
                let avgScore = 0;
                if (areaData && areaData.count > 0) {
                    avgScore = parseFloat((areaData.totalPoints / areaData.count).toFixed(2)); // 2 desimaler for snitt
                }
                radialValues.push(avgScore);
            });

            // Lag trace-objektet for dette partiet
            traces.push({
                type: 'scatterpolar',
                r: radialValues,
                theta: areaNamesSorted, // Bruk den globale sorterte listen
                fill: 'toself', // Fyll området
                name: partyInfo.name, // Partinavn for legend/hover
                marker: { color: partyInfo.color || '#ccc' },
                line: { color: partyInfo.color || '#ccc' }
                // Legg til hovertemplate hvis ønskelig
                // hovertemplate: `<b>${partyInfo.name}</b><br>${areaName}: %{r:.1f}<extra></extra>` // Krever litt mer logikk for areaName
            });
        });

        return traces; // Returner listen med traces
    }

    // Tegner eller oppdaterer radardiagrammet
    function createOrUpdateRadarChart(plotDataTraces) {
         const radarContainer = document.getElementById('radar-chart-container');
         if (!radarContainer) return;

        const layout = {
            // title: 'Sammenligning av Støtte per Saksområde', // Kan settes, men vi har H2 over
            polar: {
                radialaxis: {
                    visible: true,
                    range: [0, 2], // Skala fra 0 til 2
                    tickvals: [0, 1, 2], // Ticks for nivåene
                    angle: 90, // Start øverst
                    tickfont: { size: 10 }
                },
                 angularaxis: {
                     tickfont: { size: 11 } // Font for områdenavn
                 },
                 bgcolor: 'rgba(255, 255, 255, 0.7)' // Lett bakgrunn for selve plot-området
            },
            showlegend: true, // Vis legend for å se partifarger/-navn
            legend: {traceorder: 'normal'}, // Vis i samme rekkefølge som valgt
            height: 500, // Juster høyde ved behov
            margin: { l: 50, r: 50, t: 50, b: 50 }, // Mer generøse marger for radar
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        // Finn eller lag div for Plotly
        let plotDiv = document.getElementById('plotly-radar-chart-div');
         if (!plotDiv) {
             plotDiv = document.createElement('div');
             plotDiv.id = 'plotly-radar-chart-div';
             radarContainer.innerHTML = ''; // Fjern loader/placeholder
             radarContainer.appendChild(plotDiv);
         } else {
              plotDiv.innerHTML = ''; // Tøm gammelt innhold
         }

        // Bruk Plotly.newPlot for å tegne (eller tegne på nytt hvis den finnes)
        Plotly.newPlot('plotly-radar-chart-div', plotDataTraces, layout, {responsive: true});
        console.log("Party Similarity: Radar chart created/updated.");
    }

}); // Slutt på DOMContentLoaded
