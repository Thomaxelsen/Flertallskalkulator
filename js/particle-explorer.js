// js/particle-explorer.js (v1.1 - Farger og Kandidatbilde i InfoPanel)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Particle Explorer v1.1: DOM loaded. Waiting for data...");

    // --- Globale variabler ---
    let issuesData = [];
    let partiesData = [];
    let candidatesData = [];
    let partiesMap = {};
    let Graph = null;
    let graphData = { nodes: [], links: [] };
    let isFrozen = false;
    let areaColorMap = {}; // For å lagre farger per saksområde

    // --- DOM Referanser ---
    const graphContainer = document.getElementById('3d-graph-container');
    const loader = graphContainer ? graphContainer.querySelector('.graph-loader') : null;
    const infoPanel = document.getElementById('particle-info-panel');
    const infoPanelContent = document.getElementById('info-panel-content');
    const closeInfoPanelBtn = document.getElementById('close-info-panel');
    const forceStrengthSlider = document.getElementById('force-strength');
    const forceStrengthValue = document.getElementById('force-strength-value');
    const linkDistanceSlider = document.getElementById('link-distance');
    const linkDistanceValue = document.getElementById('link-distance-value');
    const toggleIssuesCheckbox = document.getElementById('toggle-issues');
    const toggleCandidatesCheckbox = document.getElementById('toggle-candidates');
    const toggleLinksIssuesCheckbox = document.getElementById('toggle-links-issues');
    const toggleLinksCandidatesCheckbox = document.getElementById('toggle-links-candidates');
    const resetViewBtn = document.getElementById('reset-view-btn');
    const freezeLayoutBtn = document.getElementById('freeze-layout-btn');

    // --- Datainnlasting ---
    function loadDataAndInitialize() {
        showLoader("Laster data...");

        const candidatesPromise = fetch('data/candidates.json')
            .then(response => response.ok ? response.json() : Promise.reject('Candidates fetch failed'))
            .catch(error => {
                 console.error("Failed to load candidates data:", error);
                 showError("Kunne ikke laste kandidatdata.");
                 return [];
            });

        Promise.all([
             new Promise(resolve => {
                 if (window.issues && window.issues.length > 0) resolve(window.issues);
                 else document.addEventListener('issuesDataLoaded', () => resolve(window.issues), { once: true });
             }),
             new Promise(resolve => {
                 if (window.partiesDataLoaded && window.partiesData && window.partiesData.length > 0) resolve(window.partiesData);
                 else document.addEventListener('partiesDataLoaded', () => resolve(window.partiesData), { once: true });
             }),
             candidatesPromise
        ]).then(([issues, parties, candidates]) => {
            console.log("Particle Explorer: All required data loaded.");
            issuesData = issues || [];
            partiesData = parties || [];
            candidatesData = candidates || [];

             if (issuesData.length === 0 || partiesData.length === 0) {
                 throw new Error("Nødvendig parti- eller saksdata mangler.");
             }

            processDataForGraph(); // Kaller den oppdaterte funksjonen
            initializeGraph();
            setupControls();

        }).catch(error => {
            console.error("Particle Explorer: Error during data loading or initialization:", error);
            showError(`Feil: ${error.message}`);
        });
    }

    // --- Dataprosessering (OPPDATERT med farger) ---
    function processDataForGraph() {
        showLoader("Behandler data...");
        console.log("Processing data for graph...");

        partiesData.forEach(p => partiesMap[p.shorthand] = p);

        const nodes = [];
        const links = [];
        const nodeIds = new Set();

        // Generer farger for saksområder FØR vi lager saknoder
        areaColorMap = generateAreaColors([...new Set(issuesData.map(i => i.area).filter(Boolean))]);
        console.log("Area colors generated:", areaColorMap);

        // 1. Lag Partinoder (som før)
        partiesData.forEach(party => {
            const nodeId = `party-${party.shorthand}`;
            if (!nodeIds.has(nodeId)) {
                nodes.push({
                    id: nodeId,
                    type: 'party',
                    name: party.name,
                    shorthand: party.shorthand,
                    color: party.color || '#cccccc', // Bruker partiets definerte farge
                    size: 5 + Math.sqrt(party.seats || 1) * 1.5,
                    data: party
                });
                nodeIds.add(nodeId);
            }
        });

        // 2. Lag Saknoder og koblinger til Partier (med område-farge)
        issuesData.forEach(issue => {
            const issueNodeId = `issue-${issue.id}`;
            if (!nodeIds.has(issueNodeId)) {
                nodes.push({
                    id: issueNodeId,
                    type: 'issue',
                    name: issue.name,
                    color: areaColorMap[issue.area] || '#a0aec0', // Bruker farge fra map
                    size: 4,
                    data: issue
                });
                nodeIds.add(issueNodeId);
            }

            if (issue.partyStances) {
                for (const partyCode in issue.partyStances) {
                    const stance = issue.partyStances[partyCode];
                    const partyNodeId = `party-${partyCode}`;
                    if (nodeIds.has(partyNodeId) && stance && typeof stance.level !== 'undefined' && stance.level > 0) {
                        links.push({
                            source: partyNodeId,
                            target: issueNodeId,
                            type: 'issue_link',
                            level: stance.level
                        });
                    }
                }
            }
        });

        // 3. Lag Kandidatnoder og koblinger til Partier (med lysere partifarge og bilde-URL)
        candidatesData.forEach(constituency => {
             constituency.parties.forEach(party => {
                 const partyNodeId = `party-${party.partyShorthand}`;
                 if (!nodeIds.has(partyNodeId)) return;

                 party.candidates.forEach(candidate => {
                     const candidateNodeId = `candidate-${party.partyShorthand}-${constituency.constituencyName}-${candidate.rank}`;
                     if (!nodeIds.has(candidateNodeId)) {
                         const partyColor = partiesMap[party.partyShorthand]?.color || '#cccccc';
                         nodes.push({
                             id: candidateNodeId,
                             type: 'candidate',
                             name: candidate.name,
                             color: lightenColor(partyColor, 40), // Lysere farge enn partiet
                             size: 2,
                             data: {
                                 ...candidate,
                                 partyShorthand: party.partyShorthand,
                                 constituencyName: constituency.constituencyName,
                                 imageUrl: candidate.imageUrl || null // Lagre bilde-URL
                             }
                         });
                         nodeIds.add(candidateNodeId);
                     }
                     links.push({
                         source: partyNodeId,
                         target: candidateNodeId,
                         type: 'candidate_link'
                     });
                 });
             });
        });


        graphData = { nodes, links };
        console.log(`Data processed: ${nodes.length} nodes, ${links.length} links.`);
    }

    // Hjelpefunksjon for å generere farger for saksområder (uendret)
    function generateAreaColors(areas) {
        const colors = {};
        // Bruker en annen D3-skala for potensielt flere farger
        const colorScale = d3.scaleOrdinal(d3.schemeTableau10); // Eller schemeSet3 for enda flere
        areas.sort().forEach((area, index) => { // Sorter for konsistent fargelegging
            colors[area] = colorScale(index);
        });
        return colors;
    }

     // Hjelpefunksjon for å lysne farger (uendret)
     function lightenColor(hex, percent) {
        if (!hex || typeof hex !== 'string') return '#cccccc'; // Bedre fallback
         hex = hex.replace('#', '');
         // Håndter 3-tegns hex
         if (hex.length === 3) {
             hex = hex.split('').map(char => char + char).join('');
         }
         if (hex.length !== 6) return '#cccccc'; // Ugyldig format

         const num = parseInt(hex, 16);
         const amt = Math.round(2.55 * percent);
         const R = Math.min(255, Math.max(0, (num >> 16) + amt));
         const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
         const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
         const newColor = (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
         return `#${newColor}`;
     }

    // --- Graf Initialisering (uendret, bruker nå node.color) ---
    function initializeGraph() {
        if (!graphContainer) { /* ... feilhåndtering ... */ return; }
        showLoader("Initialiserer 3D-graf...");
        console.log("Initializing 3D Force Graph...");

        try {
            Graph = ForceGraph3D()(graphContainer)
                .graphData(graphData)
                .backgroundColor('#111827')
                .nodeId('id')
                .nodeLabel('name')
                .nodeVal('size')
                .nodeColor('color') // Denne henter nå fargen satt i processDataForGraph
                .nodeOpacity(0.9)
                .nodeResolution(12)
                .linkSource('source')
                .linkTarget('target')
                .linkWidth(link => link.type === 'issue_link' ? (link.level === 2 ? 0.8 : 0.4) : 0.2)
                .linkColor(link => { /* ... (som før) ... */
                    if (link.type === 'issue_link') {
                        return link.level === 2 ? 'rgba(0, 168, 163, 0.7)' :
                               (link.level === 1 ? 'rgba(255, 190, 44, 0.6)' :
                                                   'rgba(150, 150, 150, 0.5)');
                    }
                    return 'rgba(100, 100, 100, 0.3)';
                })
                .linkOpacity(0.4)
                .linkDirectionalParticles(link => link.type === 'issue_link' ? 1 : 0)
                .linkDirectionalParticleWidth(1.5)
                .linkDirectionalParticleSpeed(0.006)
                .linkDirectionalParticleColor(link => link.level === 2 ? '#00a8a3' : (link.level === 1 ? '#ffbe2c' : '#aaaaaa'))
                .d3Force('charge', d3.forceManyBody().strength(parseFloat(forceStrengthSlider.value)))
                .d3Force('link', d3.forceLink().distance(parseFloat(linkDistanceSlider.value)).id(d => d.id)) // Viktig: Legg til .id() for forceLink
                .onNodeHover(handleNodeHover)
                .onNodeClick(handleNodeClick)
                .onBackgroundClick(handleBackgroundClick);

            // Lys (som før)
            const ambientLight = new THREE.AmbientLight(0xbbbbbb);
            Graph.scene().add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
            directionalLight.position.set(1, 1, 1);
            Graph.scene().add(directionalLight);

            hideLoader();
            console.log("3D Force Graph Initialized.");

        } catch (error) {
            console.error("Error initializing 3D graph:", error);
            showError("Kunne ikke initialisere 3D-graf.");
        }
    }

    // --- Interaksjons-håndterere (uendret) ---
    function handleNodeHover(node) { /* ... */ graphContainer.style.cursor = node ? 'pointer' : 'grab'; }
    function handleNodeClick(node) { /* ... */
        if (!node) return;
        const distance = 80;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        Graph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node,
            1000
        );
        displayNodeInfo(node); // Kaller oppdatert funksjon
     }
    function handleBackgroundClick() { /* ... */ resetHighlightAndInfo(); }

    // --- Info Panel (OPPDATERT med bilde) ---
    function displayNodeInfo(node) {
        if (!infoPanel || !infoPanelContent) return;

        let content = '';
        const iconHtml = `<span class="info-icon" style="background-color:${node.color};">${node.type.charAt(0).toUpperCase()}</span>`;

        if (node.type === 'party') {
            // ... (parti-logikk som før) ...
             const party = node.data;
             const relatedIssues = graphData.links
                 .filter(l => (l.source.id || l.source) === node.id && graphData.nodes.find(n=>n.id === (l.target.id || l.target))?.type === 'issue')
                 .map(l => graphData.nodes.find(n => n.id === (l.target.id || l.target)))
                 .filter(Boolean); // Sørg for at vi bare har gyldige noder
             const relatedCandidates = graphData.links
                 .filter(l => (l.source.id || l.source) === node.id && graphData.nodes.find(n=>n.id === (l.target.id || l.target))?.type === 'candidate')
                 .map(l => graphData.nodes.find(n => n.id === (l.target.id || l.target)))
                 .filter(Boolean); // Sørg for at vi bare har gyldige noder

            content = `
                <h4>${iconHtml} ${party.name} (${party.shorthand})</h4>
                <p><strong>Antall mandater:</strong> ${party.seats}</p>
                <p class="info-label">Saker partiet støtter (Nivå 1 & 2):</p>
                <ul>${relatedIssues.length > 0 ? relatedIssues.map(n => `<li>${n.name}</li>`).join('') : '<li>Ingen i dette utvalget</li>'}</ul>
                <p class="info-label">Listekandidater (topp):</p>
                 <ul>${relatedCandidates.length > 0 ? relatedCandidates.slice(0, 10).map(n => `<li>${n.name} (${n.data.constituencyName}, ${n.data.rank}. plass)</li>`).join('') : '<li>Ingen kandidater funnet</li>'} ${relatedCandidates.length > 10 ? '<li>...og flere</li>' : ''}</ul>
            `;

        } else if (node.type === 'issue') {
            // ... (sak-logikk som før) ...
            const issue = node.data;
            const supportingParties = graphData.links
                .filter(l => (l.target.id || l.target) === node.id)
                .map(l => {
                    const sourceNode = graphData.nodes.find(n => n.id === (l.source.id || l.source));
                    return sourceNode ? { ...sourceNode, level: l.level } : null;
                })
                .filter(Boolean)
                .sort((a, b) => (a.data?.position || 99) - (b.data?.position || 99));
            content = `
                <h4>${iconHtml} Sak: ${issue.name}</h4>
                <p><strong>Saksområde:</strong> ${issue.area || 'Ukjent'}</p>
                <p class="info-label">Partier som støtter denne saken:</p>
                <ul>${supportingParties.length > 0 ? supportingParties.map(n => `<li>${n.name} (Nivå ${n.level})</li>`).join('') : '<li>Ingen i dette utvalget</li>'}</ul>
                ${issue.description ? `<p><strong>Beskrivelse:</strong> ${issue.description}</p>` : ''}
            `;
        } else if (node.type === 'candidate') {
            const candidate = node.data;
            const party = partiesMap[candidate.partyShorthand];
            // --- START: Legg til bilde ---
            const imageUrl = candidate.imageUrl;
            const imageHtml = imageUrl
                ? `<img src="${imageUrl}" alt="Bilde av ${candidate.name}" class="info-panel-candidate-image">`
                : '<p class="no-image-text">(Bilde ikke tilgjengelig)</p>'; // Eller en placeholder
            // --- SLUTT: Legg til bilde ---

            content = `
                <h4>${iconHtml} Kandidat: ${candidate.name}</h4>
                ${imageHtml} <!-- Sett inn bildet her -->
                <p><strong>Parti:</strong> ${party?.name || candidate.partyShorthand}</p>
                <p><strong>Valgkrets:</strong> ${candidate.constituencyName}</p>
                <p><strong>Listeposisjon:</strong> ${candidate.rank}. plass</p>
                ${candidate.age ? `<p><strong>Alder:</strong> ${candidate.age}</p>` : ''}
                ${candidate.location ? `<p><strong>Sted:</strong> ${candidate.location}</p>` : ''}
                <p><strong>Realistisk sjanse:</strong> ${candidate.hasRealisticChance ? 'Ja' : 'Nei'}</p>
            `;
        } else {
            content = `<h4>${node.name || 'Ukjent node'}</h4><p>Type: ${node.type}</p>`;
        }

        infoPanelContent.innerHTML = content;
        infoPanel.style.display = 'block';
    }

    function resetHighlightAndInfo() { /* ... (som før) ... */
         if (infoPanel) infoPanel.style.display = 'none';
         console.log("Resetting info panel and highlights (if any).");
    }

    // --- Kontroller (uendret funksjonalitet) ---
    function setupControls() { /* ... (som før) ... */
        if (!Graph) { console.warn("Graph not initialized..."); return; }
        forceStrengthSlider.addEventListener('input', (e) => { /* ... */ });
        linkDistanceSlider.addEventListener('input', (e) => { /* ... */ });
        [toggleIssuesCheckbox, toggleCandidatesCheckbox, toggleLinksIssuesCheckbox, toggleLinksCandidatesCheckbox].forEach(checkbox => {
             if(checkbox) checkbox.addEventListener('change', updateGraphVisibility);
        });
        if(resetViewBtn) resetViewBtn.addEventListener('click', () => { /* ... */ });
        if(freezeLayoutBtn) freezeLayoutBtn.addEventListener('click', () => { /* ... */ });
        if(closeInfoPanelBtn) closeInfoPanelBtn.addEventListener('click', resetHighlightAndInfo);
        console.log("Controls set up.");
    }
    function updateGraphVisibility() { /* ... (som før) ... */
        if (!Graph) return;
        const showIssues = toggleIssuesCheckbox.checked;
        const showCandidates = toggleCandidatesCheckbox.checked;
        const showIssueLinks = toggleLinksIssuesCheckbox.checked;
        const showCandidateLinks = toggleLinksCandidatesCheckbox.checked;
        console.log("Updating visibility:", { showIssues, showCandidates, showIssueLinks, showCandidateLinks });
        const visibleNodes = graphData.nodes.filter(node => { /* ... */ });
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleLinks = graphData.links.filter(link => { /* ... */ });
        Graph.graphData({ nodes: visibleNodes, links: visibleLinks });
        console.log(`Graph updated: ${visibleNodes.length} nodes, ${visibleLinks.length} links visible.`);
    }

    // --- Hjelpefunksjoner for Loader (uendret) ---
    function showLoader(message = "Laster...") { /* ... */ }
    function hideLoader() { /* ... */ }
    function showError(message) { /* ... */ }

    // --- Start innlasting ---
    loadDataAndInitialize();

}); // End DOMContentLoaded
