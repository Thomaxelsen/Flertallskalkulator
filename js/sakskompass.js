// js/sakskompass.js (MED DOT PLOT, Y-AKSE FIKS, OMRÅDESORTERING, SPREDNINGSFARGE)

document.addEventListener('DOMContentLoaded', function() {
    // ... (starten av filen, datalasting etc. forblir uendret) ...
    console.log("Sakskompass: DOM Loaded. Waiting for data...");

    let issuesData = [];
    let partiesData = [];
    let partiesMap = {}; // For raskt oppslag

    let issuesLoaded = false;
    let partiesLoaded = false;

    function initializeSakskompass() {
        if (!issuesLoaded || !partiesLoaded) {
            console.log(`Sakskompass: Still waiting... Issues: ${issuesLoaded}, Parties: ${partiesLoaded}`);
            return;
        }
        console.log("Sakskompass: All data loaded. Initializing.");
        partiesData.forEach(p => partiesMap[p.shorthand] = p);
        console.log("Sakskompass: partiesMap created:", partiesMap);

        // Legg til det nye sorteringsvalget
        const sortFilter = document.getElementById('sk-sort-filter');
        if (sortFilter && !sortFilter.querySelector('option[value="area_mandates_desc"]')) {
             const areaOption = document.createElement('option');
             areaOption.value = "area_mandates_desc";
             areaOption.textContent = "Saksområde (så høyest støtte)";
             sortFilter.appendChild(areaOption);
             // Legg til flere område-sorteringer ved behov (f.eks. area_name_asc)
        }


        populateAreaFilter();
        setupEventListeners();
        processAndVisualizeData();
    }

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

    if (!window.partiesDataLoaded) {
         console.log("Sakskompass: partiesData not pre-loaded, fetching parties.json...");
        fetch('data/parties.json')
            .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
            .then(data => {
                partiesData = data;
                window.partiesData = partiesData;
                window.partiesDataLoaded = true;
                partiesLoaded = true;
                 console.log(`Sakskompass: Fetched and stored ${partiesData.length} parties globally.`);
                document.dispatchEvent(new CustomEvent('partiesDataLoaded'));
                initializeSakskompass();
            })
            .catch(error => {
                console.error("Sakskompass: Error fetching parties.json:", error);
                partiesData = []; window.partiesData = partiesData;
                window.partiesDataLoaded = true; partiesLoaded = true;
                document.dispatchEvent(new CustomEvent('partiesDataLoaded'));
                initializeSakskompass();
            });
    } else {
        console.log("Sakskompass: Parties data already loaded globally.");
        partiesData = window.partiesData;
        partiesLoaded = true;
        initializeSakskompass();
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
        areas.forEach(area => {
            const option = document.createElement('option'); option.value = area; option.textContent = area; areaFilter.appendChild(option);
        });
        console.log("Sakskompass: Area filter populated.");
    }
    function setupEventListeners() { /* ... (uendret) ... */
        const controls = document.querySelectorAll('.sk-controls select');
        controls.forEach(select => {
            select.removeEventListener('change', processAndVisualizeData); select.addEventListener('change', processAndVisualizeData);
        });
         console.log("Sakskompass: Event listeners set up.");
    }

    // --- Databehandling (beregn politisk spredning) ---
    function calculatePoliticalSpread(supportingParties) {
        if (!supportingParties || supportingParties.length < 2) {
            return { mean: -1, stdDev: 0, type: 'single_or_none' }; // Ingen spredning med 0 eller 1 parti
        }

        // Bruk 'position' fra partidata
        const positions = supportingParties.map(p => p.position).filter(pos => typeof pos === 'number');
        if (positions.length === 0) return { mean: -1, stdDev: 0, type: 'unknown_pos' };

        // Enkel gjennomsnittlig posisjon
        const meanPosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;

        // Standardavvik for posisjon (et mål på spredning)
        const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - meanPosition, 2), 0) / positions.length;
        const stdDev = Math.sqrt(variance);

        // Kategoriser spredningen (juster terskler etter behov)
        let type = 'moderate_spread';
        if (stdDev < 1.5) type = 'narrow_support'; // Partier ligger tett politisk
        else if (stdDev > 3.0) type = 'broad_support'; // Partier er veldig spredt

        // Verifiser om det er kun venstre/høyre (juster posisjonsgrensene)
        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);
        if (type === 'narrow_support') {
             if (maxPos <= 5) type = 'narrow_left'; // Juster 5 om nødvendig (SP er 5 i din data)
             else if (minPos >= 6) type = 'narrow_right'; // Juster 6 om nødvendig (V er 6)
        }


        return { mean: meanPosition, stdDev: stdDev, type: type };
    }

    function processIssueData(supportLevelType) {
        // ... (starten av funksjonen uendret, henter mandater og partier) ...
        console.log(`Sakskompass: Processing issue data for support level: ${supportLevelType}`);
         if (!Array.isArray(issuesData) || issuesData.length === 0 || Object.keys(partiesMap).length === 0) {
             console.error("Sakskompass: Data missing in processIssueData!"); return [];
         }

        const processedIssues = issuesData.map(issue => {
            let totalMandates = 0;
            const supportingPartiesData = [];

            if (issue.partyStances) {
                for (const partyCode in issue.partyStances) {
                    const stance = issue.partyStances[partyCode];
                    const partyInfo = partiesMap[partyCode];
                    if (partyInfo && stance && typeof stance.level !== 'undefined') {
                        const level = stance.level;
                        let includeParty = false;
                        if (supportLevelType === 'level-2' && level === 2) includeParty = true;
                        else if (supportLevelType === 'level-1-2' && (level === 1 || level === 2)) includeParty = true;

                        if (includeParty && typeof partyInfo.seats === 'number') {
                            totalMandates += partyInfo.seats;
                            supportingPartiesData.push({ /* ... (som før, viktig med position) ... */
                                shorthand: partyCode, name: partyInfo.name, seats: partyInfo.seats,
                                color: partyInfo.color, level: level, position: partyInfo.position
                             });
                        }
                    }
                }
            }

            supportingPartiesData.sort((a, b) => a.position - b.position);

            // *** NYTT: Beregn politisk spredning ***
            const politicalSpread = calculatePoliticalSpread(supportingPartiesData);

            // console.log(`  -> Issue: ${issue.name}, Mandates: ${totalMandates}, Spread: ${politicalSpread.type} (StdDev: ${politicalSpread.stdDev.toFixed(2)})`);

            return {
                id: issue.id,
                name: issue.name,
                area: issue.area,
                totalMandates: totalMandates,
                supportingPartiesData: supportingPartiesData,
                politicalSpread: politicalSpread // Legg til spredningsinfo
            };
        });
        console.log(`Sakskompass: Finished processing ${processedIssues.length} issues.`);
        return processedIssues;
    }

    // --- Filtrering og Sortering (oppdatert med områdesortering) ---
    function applyFiltersAndSort(processedIssues) {
        const areaFilter = document.getElementById('sk-area-filter').value;
        const sortFilter = document.getElementById('sk-sort-filter').value;
        console.log(`Sakskompass: Applying filters - Area: ${areaFilter}, Sort: ${sortFilter}`);

        let filtered = processedIssues;
        if (areaFilter !== 'all') {
            filtered = processedIssues.filter(issue => issue.area === areaFilter);
             console.log(`  -> Filtered by area, ${filtered.length} issues remaining.`);
        }

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
            // *** NY SORTERING ***
            case 'area_mandates_desc':
                filtered.sort((a, b) => {
                    // Først sorter på område
                    const areaCompare = (a.area || "").localeCompare(b.area || "");
                    if (areaCompare !== 0) {
                        return areaCompare;
                    }
                    // Deretter på mandater synkende innenfor samme område
                    return b.totalMandates - a.totalMandates;
                });
                break;
            case 'mandates_desc': default:
                filtered.sort((a, b) => b.totalMandates - a.totalMandates);
                break;
        }
         console.log("  -> Sorting applied.");
        return filtered;
    }

    function processAndVisualizeData() { /* ... (uendret kall-logikk) ... */
        console.log("=============================================");
        console.log("Sakskompass: processAndVisualizeData CALLED");
        console.log("=============================================");
       const supportLevelType = document.getElementById('sk-support-level-filter').value;
       const viewType = document.getElementById('sk-view-type-filter').value;
       const container = d3.select("#sk-visualization-container");

        if (!issuesLoaded || !partiesLoaded || Object.keys(partiesMap).length === 0) {
            console.error("Sakskompass: Cannot visualize - data not fully ready.", { issuesLoaded, partiesLoaded, partiesMapSize: Object.keys(partiesMap).length });
            container.html('<p class="error">Kunne ikke laste nødvendig data for visualisering.</p>');
            return;
        }
       container.html('<div class="loader">Behandler data...</div>');
       setTimeout(() => {
           const processedIssues = processIssueData(supportLevelType);
           const finalData = applyFiltersAndSort(processedIssues);
           console.log("Sakskompass: Final data for visualization:", finalData);
           container.html('');
           if (!Array.isArray(finalData) || finalData.length === 0) {
               console.warn("Sakskompass: No data to visualize after processing and filtering.");
               container.html('<p class="no-data">Ingen saker funnet for gjeldende filtre.</p>');
               updateLegend([]); return;
           }
           updateLegend(partiesData);
           console.log(`Sakskompass: Rendering view type: ${viewType}`);
           if (viewType === 'bar-chart') { createHorizontalBarChart(finalData); }
           else if (viewType === 'dot-plot') { createDotPlot(finalData); }
           else if (viewType === 'table') { createTable(finalData); }
       }, 0);
    }

    // --- Visualiseringsfunksjoner ---

    function createHorizontalBarChart(data) { /* ... (uendret) ... */ }

    // *** OPPGRADERT createDotPlot funksjon ***
    function createDotPlot(data) {
        console.log("Sakskompass: createDotPlot called with data:", data);
        const container = d3.select("#sk-visualization-container");
        container.html('');

        const margin = { top: 20, right: 60, bottom: 40, left: 300 };
        const containerWidth = container.node().getBoundingClientRect().width;
        const effectiveChartWidth = Math.max(100, containerWidth - margin.left - margin.right);
        const dotPlotItemHeight = 30; // *** ØKT HØYDE ***
        const height = data.length * dotPlotItemHeight + margin.top + margin.bottom;

        const svg = container.append("svg")
            .attr("width", containerWidth)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const yScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, height - margin.top - margin.bottom])
            .padding(0.5); // *** ØKT PADDING ***

        const xScale = d3.scaleLinear()
            .domain([0, 169])
            .range([0, effectiveChartWidth]);

        // Fargeskala basert på politisk spredning
        const colorScale = d3.scaleOrdinal()
             // Definer typer og tilhørende farger
             .domain(['narrow_left', 'narrow_right', 'narrow_support', 'moderate_spread', 'broad_support', 'single_or_none', 'unknown_pos'])
             .range([
                 '#d73027', // Rød (Venstre)
                 '#4575b4', // Blå (Høyre)
                 '#fdae61', // Oransje (Smal - sentrum?)
                 '#fee090', // Gul (Moderat spredning)
                 '#91bfdb', // Lyseblå (Bred støtte) -> ENDRET til '#abdda4' (grønn) for tydeligere tverrpolitisk
                 // '#abdda4', // Grønn (Bred støtte)
                 '#e0e0e0', // Grå (Kun ett parti/ingen)
                 '#bdbdbd'  // Mørk grå (Ukjent posisjon)
             ]);
         // *** OPPDATERT: Byttet ut Lyseblå med Grønn for bred støtte ***
         colorScale.range([
                '#d73027', // Rød (Venstre)
                 '#4575b4', // Blå (Høyre)
                 '#fdae61', // Oransje (Smal - sentrum?)
                 '#fee090', // Gul (Moderat spredning)
                 '#abdda4', // GRØNN (Bred støtte) <-- ENDRING
                 '#e0e0e0', // Grå (Kun ett parti/ingen)
                 '#bdbdbd'  // Mørk grå (Ukjent posisjon)
         ])


        const yAxis = d3.axisLeft(yScale).tickSize(0); // Fjern tick marks
        svg.append("g")
            .attr("class", "y-axis axis")
            .call(yAxis)
            .call(g => g.select(".domain").remove())
            .selectAll(".tick text")
            .call(wrapAxisText, margin.left - 10); // Tekstbryting

        const xAxis = d3.axisBottom(xScale).ticks(Math.max(5, Math.floor(effectiveChartWidth / 80))).tickSizeOuter(0);
        svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .call(xAxis)
            .call(g => g.select(".domain").remove());

        // Grid lines (valgfritt, for lesbarhet)
         svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .call(d3.axisBottom(xScale)
                .ticks(10)
                .tickSize(-(height - margin.top - margin.bottom)) // Linjer opp til toppen
                .tickFormat("") // Ingen tekst på grid-aksen
            )
            .selectAll("line")
            .attr("stroke", "#e9ecef"); // Lys grå linjer


        const majorityThreshold = 85;
        if (xScale(majorityThreshold) >= 0 && xScale(majorityThreshold) <= effectiveChartWidth) {
            svg.append("line")
                .attr("class", "majority-line")
                .attr("x1", xScale(majorityThreshold))
                .attr("x2", xScale(majorityThreshold))
                .attr("y1", 0)
                .attr("y2", height - margin.top - margin.bottom);

            svg.append("text")
                .attr("class", "majority-label")
                .attr("x", xScale(majorityThreshold))
                .attr("y", -5)
                .text(`Flertall (${majorityThreshold})`);
        }

        const tooltip = d3.select("body").select(".d3-tooltip").empty()
            ? d3.select("body").append("div").attr("class", "d3-tooltip")
            : d3.select("body").select(".d3-tooltip");

        const dotRadius = 6; // Litt større prikker
        svg.selectAll(".issue-dot")
            .data(data, d => d.id)
            .join("circle")
            .attr("class", "issue-dot")
            .attr("cx", d => xScale(d.totalMandates))
            .attr("cy", d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr("r", dotRadius)
            // *** NY FARGELEGGING ***
            .attr("fill", d => colorScale(d.politicalSpread.type))
            .attr("stroke", d => d3.rgb(colorScale(d.politicalSpread.type)).darker(0.7)) // Mørkere kant
            .attr("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                // Tooltip med mer info
                 const partyList = d.supportingPartiesData.map(p => `${p.shorthand} (${p.level})`).join(', ');
                tooltip.classed("visible", true)
                       .html(`<b>${d.name}</b><br>
                              Total støtte: ${d.totalMandates} mandater<br>
                              Område: ${d.area}<br>
                              Politisk spredning: ${d.politicalSpread.type}<br>
                              Partier: ${partyList || 'Ingen'}`);
                d3.select(this)
                    .transition().duration(150)
                    .attr("r", dotRadius * 1.7) // Mer forstørrelse
                    .attr("stroke-width", 2);
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 15) + "px")
                       .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.classed("visible", false);
                d3.select(this)
                    .transition().duration(150)
                    .attr("r", dotRadius)
                    .attr("stroke-width", 1);
            });

         svg.selectAll(".dot-label")
            .data(data, d => d.id)
            .join("text")
            .attr("class", "dot-label")
            .attr("x", d => xScale(d.totalMandates) + dotRadius + 4)
            .attr("y", d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("font-size", "0.75rem")
            .attr("fill", "#555")
            .text(d => d.totalMandates);

         // *** LEGENDE FOR FARGER ***
         const legendColorContainer = d3.select("#sk-legend-container"); // Bruk samme kontainer
         legendColorContainer.append("div").attr("class", "legend-divider").html("<strong>Fargebetydning (Dot Plot):</strong>"); // Tittel

         colorScale.domain().forEach(type => {
             // Ikke vis legende for 'single_or_none' eller 'unknown_pos' hvis de er grå/like
             if (type !== 'single_or_none' && type !== 'unknown_pos') {
                 const item = legendColorContainer.append("div")
                    .attr("class", "legend-item");
                 item.append("div")
                    .attr("class", "legend-color")
                    .style("background-color", colorScale(type));
                 item.append("span")
                    // Gjør typenavn mer leselig
                    .text(type.replace(/_/g, ' ').replace('support', '').replace('narrow ', 'smal ').replace('broad ', 'bred ').replace('left', 'venstre').replace('right', 'høyre').trim() );
             }
         });

    }

    function createTable(data) { /* ... (uendret) ... */ }

    function updateLegend(partyList) { /* ... (uendret, viser partilegende) ... */
         console.log("Sakskompass: updateLegend called.");
        const legendContainer = d3.select("#sk-legend-container");
        legendContainer.html(''); // Tøm for å unngå duplikater

         // Legg til partilegende først
         legendContainer.append("div").attr("class", "legend-divider").html("<strong>Partier (farge i søylediagram):</strong>");

        if (!Array.isArray(partyList) || partyList.length === 0) {
             console.log("  -> No parties to show in legend.");
             return;
        }
        const sortedParties = [...partyList].sort((a, b) => (a.position || 99) - (b.position || 99));
        sortedParties.forEach(party => {
            const item = legendContainer.append("div").attr("class", "legend-item");
            item.append("div").attr("class", "legend-color").style("background-color", party.color || '#cccccc');
            item.append("span").text(`${party.name || 'Ukjent'} (${party.seats || '?'})`);
        });
         console.log(`  -> Party Legend updated with ${sortedParties.length} parties.`);
         // Fargelegenden for Dot Plot legges til *etterpå* i createDotPlot
    }

    // Funksjon for å bryte lange aksetekster (uendret)
    function wrapAxisText(text, width) { /* ... (uendret) ... */ }

}); // Slutt på DOMContentLoaded
