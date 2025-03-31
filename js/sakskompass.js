// js/sakskompass.js (MED DOT PLOT, Y-AKSE FIKS, OG ID-SORTERING)

document.addEventListener('DOMContentLoaded', function() {
    // Vent på at både issues og party data er lastet
    console.log("Sakskompass: DOM Loaded. Waiting for data...");

    let issuesData = [];
    let partiesData = [];
    let partiesMap = {}; // For raskt oppslag

    let issuesLoaded = false;
    let partiesLoaded = false;

    // Funksjon for å initialisere når all data er klar
    function initializeSakskompass() {
        // EKSTRA SJEKK: Kjør kun hvis begge er klare
        if (!issuesLoaded || !partiesLoaded) {
            console.log(`Sakskompass: Still waiting... Issues: ${issuesLoaded}, Parties: ${partiesLoaded}`);
            return;
        }
        console.log("Sakskompass: All data loaded. Initializing.");

        // Lag rask oppslags-map for partier
        partiesData.forEach(p => partiesMap[p.shorthand] = p);
        console.log("Sakskompass: partiesMap created:", partiesMap); // DEBUG: Sjekk at map er ok

        // Legg til ID-sorteringsvalg hvis det mangler (burde være i HTML nå)
         const sortFilter = document.getElementById('sk-sort-filter');
         if (sortFilter && !sortFilter.querySelector('option[value="id_asc"]')) {
             const idOption = document.createElement('option');
             idOption.value = "id_asc";
             idOption.textContent = "Original rekkefølge (ID)";
             sortFilter.appendChild(idOption);
             console.log("Sakskompass: Added 'id_asc' sort option dynamically (should be in HTML).");
         }


        populateAreaFilter();
        setupEventListeners();
        processAndVisualizeData(); // Første visning
    }

    // Lytt etter at issues er lastet
    document.addEventListener('issuesDataLoaded', () => {
        console.log("Sakskompass: 'issuesDataLoaded' event received.");
        issuesData = window.issues || [];
         if (!Array.isArray(issuesData) || issuesData.length === 0) {
            console.warn("Sakskompass: window.issues was empty after event, trying fetch...");
            fetch('data/issues.json')
                .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
                .then(data => {
                    issuesData = data;
                    console.log(`Sakskompass: Fetched ${issuesData.length} issues from issues.json.`);
                    issuesLoaded = true;
                    initializeSakskompass();
                })
                .catch(error => console.error("Sakskompass: Error fetching issues.json:", error));
        } else {
            console.log(`Sakskompass: ${issuesData.length} issues loaded from window.issues.`);
            issuesLoaded = true;
            initializeSakskompass();
        }
    });

    // Lasting av partydata (justert logging)
    if (!window.partiesDataLoaded) {
         console.log("Sakskompass: partiesData not pre-loaded, fetching parties.json...");
        fetch('data/parties.json')
            .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
            .then(data => {
                partiesData = data;
                window.partiesData = partiesData; // Lagre globalt
                window.partiesDataLoaded = true; // Sett flagg
                partiesLoaded = true;
                 console.log(`Sakskompass: Fetched and stored ${partiesData.length} parties globally.`);
                document.dispatchEvent(new CustomEvent('partiesDataLoaded')); // Send signal
                initializeSakskompass(); // Prøv å initialisere
            })
            .catch(error => {
                console.error("Sakskompass: Error fetching parties.json:", error);
                partiesData = [];
                window.partiesData = partiesData;
                window.partiesDataLoaded = true;
                partiesLoaded = true; // Sett flagg uansett
                document.dispatchEvent(new CustomEvent('partiesDataLoaded')); // Send signal selv ved feil
                initializeSakskompass(); // Prøv å initialisere
            });
    } else {
        console.log("Sakskompass: Parties data already loaded globally.");
        partiesData = window.partiesData;
        partiesLoaded = true;
        initializeSakskompass(); // Prøv å initialisere
    }


    // --- Hjelpefunksjoner ---
    function getUniqueAreas() { /* ... (uendret) ... */
        if (!Array.isArray(issuesData)) return [];
        const areas = issuesData.map(issue => issue.area).filter(area => area);
        return [...new Set(areas)].sort();
    }
    function populateAreaFilter() { /* ... (uendret) ... */
        const areaFilter = document.getElementById('sk-area-filter');
        if (!areaFilter) return;
        areaFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
        const areas = getUniqueAreas();
        areas.forEach(area => { const option = document.createElement('option'); option.value = area; option.textContent = area; areaFilter.appendChild(option); });
        console.log("Sakskompass: Area filter populated.");
    }
    function setupEventListeners() { /* ... (uendret) ... */
        const controls = document.querySelectorAll('.sk-controls select');
        controls.forEach(select => { select.removeEventListener('change', processAndVisualizeData); select.addEventListener('change', processAndVisualizeData); });
         console.log("Sakskompass: Event listeners set up.");
     }

    function processIssueData(supportLevelType) { /* ... (uendret fra forrige versjon) ... */
        console.log(`Sakskompass: Processing issue data for support level: ${supportLevelType}`);
        if (!Array.isArray(issuesData) || issuesData.length === 0) { console.error("Sakskompass: issuesData is empty or not an array in processIssueData!"); return []; }
        if (Object.keys(partiesMap).length === 0) { console.error("Sakskompass: partiesMap is empty in processIssueData!"); return []; }
        const processedIssues = issuesData.map(issue => {
            let totalMandates = 0; const supportingPartiesData = [];
            if (issue.partyStances) {
                for (const partyCode in issue.partyStances) {
                    const stance = issue.partyStances[partyCode]; const partyInfo = partiesMap[partyCode];
                    if (partyInfo && stance && typeof stance.level !== 'undefined') {
                        const level = stance.level; let includeParty = false;
                        if (supportLevelType === 'level-2' && level === 2) { includeParty = true; }
                        else if (supportLevelType === 'level-1-2' && (level === 1 || level === 2)) { includeParty = true; }
                        if (includeParty) { if (typeof partyInfo.seats === 'number') { totalMandates += partyInfo.seats; supportingPartiesData.push({ shorthand: partyCode, name: partyInfo.name, seats: partyInfo.seats, color: partyInfo.color, level: level, position: partyInfo.position }); } else { console.warn(`      -> Party ${partyCode} included but 'seats' is not a number:`, partyInfo.seats); } }
                    } // Ingen logging av manglende data for å redusere støy nå
                }
            } else { console.warn(`  Issue ID ${issue.id} (${issue.name}) has no partyStances object.`); }
            supportingPartiesData.sort((a, b) => a.position - b.position);
            return { id: issue.id, name: issue.name, area: issue.area, totalMandates: totalMandates, supportingPartiesData: supportingPartiesData };
        });
        console.log(`Sakskompass: Finished processing ${processedIssues.length} issues.`);
        return processedIssues;
     }

    // --- Filtrering og Sortering (oppdatert med ID-sortering) ---
    function applyFiltersAndSort(processedIssues) {
        const areaFilter = document.getElementById('sk-area-filter').value;
        const sortFilter = document.getElementById('sk-sort-filter').value;
        console.log(`Sakskompass: Applying filters - Area: ${areaFilter}, Sort: ${sortFilter}`);

        let filtered = processedIssues;
        if (areaFilter !== 'all') {
            filtered = processedIssues.filter(issue => issue.area === areaFilter);
             console.log(`  -> Filtered by area, ${filtered.length} issues remaining.`);
        }

        // *** OPPDATERT SORTERINGSLOGIKK ***
        switch (sortFilter) {
            case 'mandates_asc':
                filtered.sort((a, b) => a.totalMandates - b.totalMandates);
                break;
            case 'name_asc':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'id_asc': // <-- NY CASE
                filtered.sort((a, b) => (a.id || 0) - (b.id || 0)); // Sorter etter ID stigende
                break;
            case 'mandates_desc': default:
                filtered.sort((a, b) => b.totalMandates - a.totalMandates);
                break;
        }
         console.log("  -> Sorting applied.");
        return filtered;
    }
    // *** SLUTT PÅ OPPDATERT SORTERINGSLOGIKK ***


    function processAndVisualizeData() { /* ... (uendret kall-logikk) ... */
        console.log("=============================================");
        console.log("Sakskompass: processAndVisualizeData CALLED");
        console.log("=============================================");
       const supportLevelType = document.getElementById('sk-support-level-filter').value;
       const viewType = document.getElementById('sk-view-type-filter').value;
       const container = d3.select("#sk-visualization-container");
        if (!issuesLoaded || !partiesLoaded || Object.keys(partiesMap).length === 0) {
            console.error("Sakskompass: Cannot visualize - data not fully ready.", { issuesLoaded, partiesLoaded, partiesMapSize: Object.keys(partiesMap).length });
            container.html('<p class="error">Kunne ikke laste nødvendig data for visualisering.</p>'); return;
        }
       container.html('<div class="loader">Behandler data...</div>');
       setTimeout(() => {
           const processedIssues = processIssueData(supportLevelType);
           const finalData = applyFiltersAndSort(processedIssues);
           // console.log("Sakskompass: Final data for visualization:", finalData); // Kan skrus på ved behov
           container.html('');
           if (!Array.isArray(finalData) || finalData.length === 0) {
               console.warn("Sakskompass: No data to visualize after processing and filtering.");
               container.html('<p class="no-data">Ingen saker funnet for gjeldende filtre.</p>'); updateLegend([]); return;
           }
           updateLegend(partiesData);
           console.log(`Sakskompass: Rendering view type: ${viewType}`);
           if (viewType === 'bar-chart') { createHorizontalBarChart(finalData); }
           else if (viewType === 'dot-plot') { createDotPlot(finalData); }
           else if (viewType === 'table') { createTable(finalData); }
       }, 0);
    }

    // --- Visualiseringsfunksjoner ---

    function createHorizontalBarChart(data) { /* ... (uendret fra forrige versjon) ... */ }

    function createDotPlot(data) { /* ... (uendret fra forrige versjon - MED Y-AKSE FIKS) ... */
        console.log("Sakskompass: createDotPlot called with data:", data);
        const container = d3.select("#sk-visualization-container");
        container.html('');
        const margin = { top: 20, right: 60, bottom: 40, left: 300 };
        const containerWidth = container.node().getBoundingClientRect().width;
        const effectiveChartWidth = Math.max(100, containerWidth - margin.left - margin.right);
        const dotPlotItemHeight = 35; // Økt høyde
        const height = data.length * dotPlotItemHeight + margin.top + margin.bottom;
        const svg = container.append("svg").attr("width", containerWidth).attr("height", height).append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const yScale = d3.scaleBand().domain(data.map(d => d.name)).range([0, height - margin.top - margin.bottom]).padding(0.5); // Økt padding
        const xScale = d3.scaleLinear().domain([0, 169]).range([0, effectiveChartWidth]);
        const yAxis = d3.axisLeft(yScale).tickSize(0); // Fjernet tick marks
        svg.append("g").attr("class", "y-axis axis").call(yAxis).call(g => g.select(".domain").remove()).selectAll(".tick text").call(wrapAxisText, margin.left - 10);
        const xAxis = d3.axisBottom(xScale).ticks(Math.max(5, Math.floor(effectiveChartWidth / 80))).tickSizeOuter(0);
        svg.append("g").attr("class", "x-axis axis").attr("transform", `translate(0,${height - margin.top - margin.bottom})`).call(xAxis).call(g => g.select(".domain").remove());
        const majorityThreshold = 85;
        if (xScale(majorityThreshold) >= 0 && xScale(majorityThreshold) <= effectiveChartWidth) {
            svg.append("line").attr("class", "majority-line").attr("x1", xScale(majorityThreshold)).attr("x2", xScale(majorityThreshold)).attr("y1", 0).attr("y2", height - margin.top - margin.bottom);
            svg.append("text").attr("class", "majority-label").attr("x", xScale(majorityThreshold)).attr("y", -5).text(`Flertall (${majorityThreshold})`);
        }
        const tooltip = d3.select("body").select(".d3-tooltip").empty() ? d3.select("body").append("div").attr("class", "d3-tooltip") : d3.select("body").select(".d3-tooltip");
        const dotRadius = 5;
        svg.selectAll(".issue-dot").data(data, d => d.id).join("circle").attr("class", "issue-dot").attr("cx", d => xScale(d.totalMandates)).attr("cy", d => yScale(d.name) + yScale.bandwidth() / 2).attr("r", dotRadius).attr("fill", d => { if (d.supportingPartiesData.length > 0) { return d.supportingPartiesData[0].color || '#cccccc'; } return '#cccccc'; }).style("cursor", "pointer").on("mouseover", function(event, d) { tooltip.classed("visible", true).html(`<b>${d.name}</b><br>Total støtte: ${d.totalMandates} mandater`); d3.select(this).transition().duration(150).attr("r", dotRadius * 1.5).attr("stroke", "black").attr("stroke-width", 1.5); }).on("mousemove", function(event) { tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 10) + "px"); }).on("mouseout", function() { tooltip.classed("visible", false); d3.select(this).transition().duration(150).attr("r", dotRadius).attr("stroke", "none"); });
        svg.selectAll(".dot-label").data(data, d => d.id).join("text").attr("class", "dot-label").attr("x", d => xScale(d.totalMandates) + dotRadius + 4).attr("y", d => yScale(d.name) + yScale.bandwidth() / 2).attr("dy", "0.35em").attr("font-size", "0.75rem").attr("fill", "#555").text(d => d.totalMandates);
    }

    function createTable(data) { /* ... (uendret) ... */ }
    function updateLegend(partyList) { /* ... (uendret) ... */ }
    function wrapAxisText(text, width) { /* ... (uendret) ... */ }

}); // Slutt på DOMContentLoaded
