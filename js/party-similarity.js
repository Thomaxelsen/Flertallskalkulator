// js/party-similarity.js

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
        // console.log(`Sim(${partyCodeA}, ${partyCodeB}): Agreed=${agreementCount}, Common=${commonIssuesCount}, Score=${score.toFixed(1)}%`);
        return score;
    }

    // Genererer data og tegner heatmapen
    function generateSimilarityHeatmap() {
        const heatmapContainer = document.getElementById('heatmap-container');
        const loader = heatmapContainer.querySelector('.heatmap-loader');

        if (!heatmapContainer) {
             console.error("Heatmap container not found!");
             return;
        }
        if (partiesListSorted.length === 0) {
            console.error("Parties list is empty, cannot generate heatmap.");
             loader.textContent = "Kunne ikke laste partidata.";
            return;
        }

        console.log("Party Similarity: Generating heatmap data...");
        loader.textContent = "Beregner likhetsscore...";

        // Hent partikoder i sortert rekkefølge for akser
        const partyCodes = partiesListSorted.map(p => p.shorthand);
        const partyNames = partiesListSorted.map(p => p.name); // For hover-tekst

        // Beregn likhetsmatrisen (z-data for Plotly)
        const similarityMatrix = [];
        partyCodes.forEach(partyY => { // Y-akse (rader)
            const row = [];
            partyCodes.forEach(partyX => { // X-akse (kolonner)
                if (partyX === partyY) {
                    row.push(100); // Parti er 100% enig med seg selv
                } else {
                    // Bruk standard metrikk for nå
                    const score = calculateSimilarityScore(partyX, partyY, 'agreement_level2');
                    row.push(parseFloat(score.toFixed(1))); // Legg til score med 1 desimal
                }
            });
            similarityMatrix.push(row);
        });

        console.log("Party Similarity: Heatmap matrix calculated:", similarityMatrix);

        // Konfigurer data for Plotly heatmap
        const plotData = [{
            z: similarityMatrix,       // Selve score-matrisen
            x: partyNames, //partyCodes, // Partinavn på X-aksen
            y: partyNames, //partyCodes, // Partinavn på Y-aksen
            type: 'heatmap',
            colorscale: 'YlGnBu', // Fargeskala (Grønn/Blå = høy enighet, Gul = lav) - kan endres
            // Alternative: 'Viridis', 'Blues', 'Greens', 'RdBu' (for +/- korrelasjon)
            hoverongaps: false,
            // Definer hva som vises når man holder over en celle
            hovertemplate:
                `<b>%{y}</b> vs <b>%{x}</b><br>` +
                `Enighet: %{z}%<extra></extra>`, // <extra></extra> fjerner ekstra info
            zmin: 0,   // Sørger for at fargeskalaen starter på 0
            zmax: 100, // Sørger for at fargeskalaen går til 100
        }];

        // Konfigurer layout for Plotly heatmap
        const layout = {
            title: 'Partienes Enighet om Kreftforeningens Saker',
            xaxis: {
                tickangle: -45, // Vri etikettene for lesbarhet
                automargin: true,
                 side: 'top' // Flytt X-aksen til toppen for bedre lesbarhet med vridde etiketter
            },
            yaxis: {
                automargin: true,
                autorange: 'reversed' // Viser vanligvis første parti øverst
            },
            margin: { // Gi god plass til etiketter
                l: 150, // Venstre (Y-akse etiketter)
                r: 50,
                b: 50,  // Bunn
                t: 100  // Topp (X-akse etiketter og tittel)
            },
             autosize: true // La Plotly prøve å tilpasse størrelsen
             // Man kan sette fast 'width' og 'height' hvis ønskelig
        };

        // Tegn heatmapen
        loader.textContent = "Tegner heatmap..."; // Oppdater loader
        try {
             // Opprett en div spesifikt for Plotly hvis den ikke finnes
             let plotDiv = document.getElementById('plotly-heatmap-div');
             if (!plotDiv) {
                 plotDiv = document.createElement('div');
                 plotDiv.id = 'plotly-heatmap-div';
                 heatmapContainer.innerHTML = ''; // Fjern loader
                 heatmapContainer.appendChild(plotDiv);
             } else {
                heatmapContainer.innerHTML = ''; // Fjern loader hvis div'en fantes
                 heatmapContainer.appendChild(plotDiv); // Sørg for at den er der
             }

            Plotly.newPlot('plotly-heatmap-div', plotData, layout, {responsive: true});
            console.log("Party Similarity: Heatmap drawn successfully.");
            // Skjul loader (selv om den teknisk sett ble fjernet over)
            loader.style.display = 'none';
        } catch(error) {
            console.error("Error drawing Plotly heatmap:", error);
            heatmapContainer.innerHTML = `<div class="heatmap-loader error">Kunne ikke vise heatmap: ${error.message}</div>`;
        }
    }

}); // Slutt på DOMContentLoaded
