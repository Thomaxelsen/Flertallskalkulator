// js/party-similarity.js (OPPDATERT FOR LESBARHET)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Party Similarity: DOM loaded. Waiting for data...");

    // Globale variabler
    let issuesData = [];
    let partiesData = [];
    let partiesMap = {}; // Map <shorthand, partyObject>
    let partiesListSorted = []; // Liste med partier sortert etter posisjon

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
            console.log("Party Similarity: Both issues and parties ready. Initializing.");
            // Lag map og sortert liste
            partiesData.forEach(p => partiesMap[p.shorthand] = p);
            partiesListSorted = [...partiesData].sort((a, b) => (a.position || 99) - (b.position || 99));
            // Start hovedlogikken for å lage heatmapen
            generateSimilarityHeatmap();
        } else {
            console.log(`Party Similarity: Still waiting... Issues: ${issuesReady}, Parties: ${partiesReady}`);
            // Eventuell fallback-logikk for å trigge lasting kan legges her om nødvendig
        }
    }

    // Kjør sjekk med en gang
    checkAndInitialize();


    // --- Hovedfunksjoner ---

    /**
     * Beregner likhetsscore mellom to partier basert på saker.
     * Metric 'agreement_level2': % av saker hvor begge har level 2,
     * av de sakene hvor begge har *tatt et standpunkt* (level 0, 1 eller 2).
     */
    function calculateSimilarityScore(partyCodeA, partyCodeB, metric = 'agreement_level2') {
        let commonIssuesCount = 0; // Antall saker hvor begge har tatt standpunkt
        let agreementCount = 0;    // Antall saker hvor de er enige (avh av metric)

        if (!issuesData || issuesData.length === 0) return 0;

        issuesData.forEach(issue => {
            const stanceA = issue.partyStances ? issue.partyStances[partyCodeA] : undefined;
            const stanceB = issue.partyStances ? issue.partyStances[partyCodeB] : undefined;

            // Sjekk om BEGGE partier har et definert standpunkt (level 0, 1, eller 2) for denne saken
            const hasStanceA = stanceA && typeof stanceA.level !== 'undefined';
            const hasStanceB = stanceB && typeof stanceB.level !== 'undefined';

            if (hasStanceA && hasStanceB) {
                commonIssuesCount++; // Begge har tatt standpunkt

                // Beregn enighet basert på valgt metrikk
                if (metric === 'agreement_level2') {
                    if (stanceA.level === 2 && stanceB.level === 2) {
                        agreementCount++;
                    }
                }
                // TODO: Implementer 'weighted_agreement' eller andre metrikker her
                // else if (metric === 'weighted_agreement') { ... }
            }
        });

        // Beregn prosentscore (0-100)
        const score = (commonIssuesCount > 0) ? (agreementCount / commonIssuesCount) * 100 : 0;
        return score; // Returner score (vi fikser desimaler for Plotly senere)
    }

    // Genererer data og tegner heatmapen (Oppdatert versjon)
    function generateSimilarityHeatmap() {
        const heatmapContainer = document.getElementById('heatmap-container');
        const loader = heatmapContainer.querySelector('.heatmap-loader');

        if (!heatmapContainer) {
             console.error("Heatmap container not found!");
             return;
        }
        if (partiesListSorted.length === 0) {
            console.error("Parties list is empty, cannot generate heatmap.");
             if(loader) loader.textContent = "Kunne ikke laste partidata.";
            return;
        }

        console.log("Party Similarity: Generating heatmap data...");
        if(loader) loader.textContent = "Beregner likhetsscore...";

        // --- Bruk forkortelser for akser og lag map for navn ---
        const partyCodes = partiesListSorted.map(p => p.shorthand);
        const partyNamesLookup = partiesListSorted.reduce((acc, p) => { acc[p.shorthand] = p.name; return acc; }, {});
        // ---------------------------------------------------------

        // Beregn likhetsmatrisen
        const similarityMatrix = [];
        partyCodes.forEach(partyY => {
            const row = [];
            partyCodes.forEach(partyX => {
                if (partyX === partyY) {
                    row.push(100);
                } else {
                    const score = calculateSimilarityScore(partyX, partyY, 'agreement_level2');
                    row.push(parseFloat(score.toFixed(1))); // Begrens til 1 desimal for visning
                }
            });
            similarityMatrix.push(row);
        });

        console.log("Party Similarity: Heatmap matrix calculated.");

        // Konfigurer data for Plotly heatmap
        const plotData = [{
            z: similarityMatrix,
            x: partyCodes, // <-- Bruk forkortelser
            y: partyCodes, // <-- Bruk forkortelser
            type: 'heatmap',
            colorscale: 'Blues', // <-- Byttet til Blå skala (mørk = høy score)
            // Andre alternativer: 'Greens', 'Viridis', 'Plasma'
            reversescale: false, // <-- Viktig hvis du bruker skalaer som starter mørkt
            hoverongaps: false,
            // Oppdatert hovertemplate for å vise fulle navn
            hovertemplate: (data) => {
                const codeX = data.points[0].x;
                const codeY = data.points[0].y;
                const nameX = partyNamesLookup[codeX] || codeX;
                const nameY = partyNamesLookup[codeY] || codeY;
                const z = data.points[0].z;
                // Vis ikke % for diagonalen (seg selv)
                if (codeX === codeY) {
                     return `<b>${nameY}</b><extra></extra>`;
                }
                return `<b>${nameY}</b> vs <b>${nameX}</b><br>Enighet: ${z}%<extra></extra>`;
            },
            zmin: 0,
            zmax: 100,
            // Tekst i celler
            text: similarityMatrix.map(row => row.map(val => (val === 100 ? '' : `${val}%`))), // Vis prosent, ikke for 100%
            texttemplate: "%{text}",
            hoverinfo: "none", // Bruk kun custom hovertemplate
            colorbar: { // Justeringer for fargelegenden
                title: 'Enighet (%)',
                titleside: 'right',
                tickvals: [0, 20, 40, 60, 80, 100], // Tydelige tick verdier
                ticktext: ['0%', '20%', '40%', '60%', '80%', '100%'] // Formaterte labels
            }
        }];

        // Konfigurer layout for Plotly heatmap
        const layout = {
            title: 'Partienes Enighet om Kreftforeningens Saker',
            xaxis: {
                tickangle: -45, // Vinkle etiketter
                automargin: true,
                 side: 'top', // Flytt til toppen
                 tickfont: { size: 11 } // Juster størrelse ved behov
            },
            yaxis: {
                automargin: true,
                autorange: 'reversed', // Viser Rødt øverst
                 tickfont: { size: 11 } // Juster størrelse ved behov
            },
            margin: { // Justerte marger for kortere etiketter
                l: 60,  // Plass for Y-akse (kan reduseres)
                r: 80,  // Plass for colorbar
                b: 20,
                t: 120 // Plass for X-akse og tittel
            },
            autosize: true,
             font: { // Font for tekst i celler
                 size: 9, // Liten font for prosenter
                 color: null // La Plotly bestemme farge basert på bakgrunn (null)
             },
            // Forbedre kontrast mellom tekst og bakgrunn dynamisk (krever mer avansert oppsett)
            // annotations: createContrastAnnotations(similarityMatrix, partyCodes), // Se eksempel under (valgfritt)
        };

        // Tegn heatmapen
        if(loader) loader.textContent = "Tegner heatmap...";
        try {
            let plotDiv = document.getElementById('plotly-heatmap-div');
            if (!plotDiv) {
                plotDiv = document.createElement('div');
                plotDiv.id = 'plotly-heatmap-div';
                heatmapContainer.innerHTML = '';
                heatmapContainer.appendChild(plotDiv);
            } else {
                plotDiv.innerHTML = '';
                heatmapContainer.innerHTML = '';
                heatmapContainer.appendChild(plotDiv);
            }

            Plotly.newPlot('plotly-heatmap-div', plotData, layout, {responsive: true});
            console.log("Party Similarity: Heatmap drawn successfully with updates.");
            if(loader) loader.style.display = 'none';
        } catch(error) {
            console.error("Error drawing Plotly heatmap:", error);
             if(loader) loader.style.display = 'none'; // Skjul loader uansett
            heatmapContainer.innerHTML = `<div class="heatmap-loader error" style="display: block;">Kunne ikke vise heatmap: ${error.message}</div>`;
        }
    }

/* --- Eksempel på funksjon for bedre tekstkontrast (Valgfri/Avansert) ---
   Denne funksjonen prøver å bestemme om teksten skal være lys eller mørk
   basert på bakgrunnsfargen Plotly sannsynligvis vil bruke.
   Krever at du kjenner til hvordan fargeskalaen mapper til verdier.
*/
/*
function createContrastAnnotations(matrix, codes) {
    const annotations = [];
    const threshold = 50; // Grense for å bytte tekstfarge (juster etter skala)

    matrix.forEach((row, i) => {
        row.forEach((value, j) => {
            if (i === j) return; // Hopp over diagonalen

            const textColor = value > threshold ? 'white' : '#333'; // Lys tekst på mørk bakgrunn, mørk på lys

            annotations.push({
                x: codes[j],
                y: codes[i],
                text: `${value}%`,
                font: {
                    family: 'Segoe UI, sans-serif',
                    size: 9,
                    color: textColor
                },
                showarrow: false
            });
        });
    });
    return annotations;
}
// Hvis du bruker denne, må du fjerne text/texttemplate fra plotData og legge til 'annotations: createContrastAnnotations(...)' i layout.
*/


}); // Slutt på DOMContentLoaded
