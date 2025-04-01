// js/party-similarity.js (OPPDATERT FOR LESBARHET v2 - Ny fargeskala)

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

            const hasStanceA = stanceA && typeof stanceA.level !== 'undefined';
            const hasStanceB = stanceB && typeof stanceB.level !== 'undefined';

            if (hasStanceA && hasStanceB) {
                commonIssuesCount++; // Begge har tatt standpunkt

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

    // Genererer data og tegner heatmapen (Oppdatert versjon)
    function generateSimilarityHeatmap() {
        const heatmapContainer = document.getElementById('heatmap-container');
        const loader = heatmapContainer.querySelector('.heatmap-loader');

        if (!heatmapContainer) { /* ... (feilmelding som før) ... */ return; }
        if (partiesListSorted.length === 0) { /* ... (feilmelding som før) ... */ return; }

        console.log("Party Similarity: Generating heatmap data...");
        if(loader) loader.textContent = "Beregner likhetsscore...";

        const partyCodes = partiesListSorted.map(p => p.shorthand);
        const partyNamesLookup = partiesListSorted.reduce((acc, p) => { acc[p.shorthand] = p.name; return acc; }, {});

        const similarityMatrix = [];
         partyCodes.forEach(partyY => {
            const row = [];
            partyCodes.forEach(partyX => {
                if (partyX === partyY) {
                    // For Viridis (mørk lilla -> lys gul), sett diagonal til en lav verdi (0) for mørk farge,
                    // men vi vil ikke vise teksten "0%". Alternativt, sett til null/NaN for ingen farge.
                    // Vi setter til -1 og justerer hovertemplate
                     row.push(-1); // Bruk en verdi utenfor [0, 100] for å identifisere diagonalen
                } else {
                    const score = calculateSimilarityScore(partyX, partyY, 'agreement_level2');
                    row.push(parseFloat(score.toFixed(1)));
                }
            });
            similarityMatrix.push(row);
        });

        console.log("Party Similarity: Heatmap matrix calculated.");

        const plotData = [{
            z: similarityMatrix,
            x: partyCodes,
            y: partyCodes,
            type: 'heatmap',
            colorscale: 'Viridis', // <-- ENDRET HER
            reversescale: false,   // Viridis går fra mørk (lav) til lys (høy) som standard
            hoverongaps: false,
            hovertemplate: (data) => {
                const codeX = data.points[0].x;
                const codeY = data.points[0].y;
                const nameX = partyNamesLookup[codeX] || codeX;
                const nameY = partyNamesLookup[codeY] || codeY;
                const z = data.points[0].z;
                // Sjekk om det er diagonalen (satt til -1)
                if (z < 0) {
                    return `<b>${nameY}</b><extra></extra>`; // Vis kun partiets navn
                }
                return `<b>${nameY}</b> vs <b>${nameX}</b><br>Enighet: ${z}%<extra></extra>`;
            },
            zmin: 0, // Sikrer at fargeskalaen starter på 0 for ikke-diagonale celler
            zmax: 100,
             // Vis tekst, men kun hvis den er over en viss verdi OG ikke diagonalen
            text: similarityMatrix.map(row => row.map(val => (val >= 10 ? `${val}%` : ''))), // Vis kun score >= 10%
            texttemplate: "%{text}",
            hoverinfo: "none",
            colorbar: {
                title: 'Enighet (%)',
                titleside: 'right',
                tickvals: [0, 20, 40, 60, 80, 100],
                ticktext: ['0%', '20%', '40%', '60%', '80%', '100%']
            }
        }];

        // Definer fargen for tekst i cellene (prøver dynamisk)
        const cellTextFontColors = similarityMatrix.map(row => row.map(value => {
             if (value < 0) return 'transparent'; // Ingen tekst på diagonal
            // 'Viridis' blir gul (lys) rundt 80-100, mørk lilla/blå rundt 0-40
            return value > 60 ? '#333' : 'white'; // Mørk tekst på lys bakgrunn, lys tekst på mørk
         }));


        const layout = {
            title: 'Partienes Enighet om Kreftforeningens Saker',
            xaxis: {
                tickangle: -45,
                automargin: true,
                 side: 'top',
                 tickfont: { size: 11 }
            },
            yaxis: {
                automargin: true,
                autorange: 'reversed',
                 tickfont: { size: 11 }
            },
            margin: { l: 60, r: 80, b: 20, t: 120 },
            autosize: true,
            annotations: [] // Nullstill evt. gamle, teksten styres via 'text' og 'font' under nå
            /*
            font: { // Standardfont for *alt* hvis ikke overstyrt
                 size: 9
                 // Color settes dynamisk for cellene, så ikke sett globalt her
             }
             */
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
                 plotDiv.innerHTML = ''; // Tøm for å være sikker
                 heatmapContainer.innerHTML = '';
                 heatmapContainer.appendChild(plotDiv);
            }

             // Legg til den dynamiske fontfargen for teksten i cellene
             // Plotly's `textfont` på selve trace (plotData) ser ikke ut til å støtte en 2D-array for farger.
             // Derfor bruker vi IKKE `layout.font` eller `plotData[0].textfont`, men lar det være null.
             // Vi satser på at standardkontrasten er OK, eller så må vi bruke `layout.annotations` som er mer komplisert.
             // Fjerner cellTextFontColors inntil videre for enkelhet.

            Plotly.newPlot('plotly-heatmap-div', plotData, layout, {responsive: true});
            console.log("Party Similarity: Heatmap drawn successfully with 'Viridis' colorscale.");
             if(loader) loader.style.display = 'none';
         } catch(error) {
             console.error("Error drawing Plotly heatmap:", error);
              if(loader) loader.style.display = 'none';
             heatmapContainer.innerHTML = `<div class="heatmap-loader error" style="display: block;">Kunne ikke vise heatmap: ${error.message}</div>`;
         }
    }

    // calculateSimilarityScore funksjonen (uendret)
    function calculateSimilarityScore(partyCodeA, partyCodeB, metric = 'agreement_level2') {
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

}); // Slutt på DOMContentLoaded
