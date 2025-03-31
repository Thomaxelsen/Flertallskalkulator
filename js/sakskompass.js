// js/sakskompass.js (MED FIKS FOR MOBIL SØYLEDIAGRAM + HJELPELINJER/HOVER)

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
    function getUniqueAreas() {
        if (!Array.isArray(issuesData)) return [];
        const areas = issuesData.map(issue => issue.area).filter(area => area);
        return [...new Set(areas)].sort();
    }

    function populateAreaFilter() {
        const areaFilter = document.getElementById('sk-area-filter');
        if (!areaFilter) return;
        // Tøm eksisterende (unntatt første) før fylling
        areaFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
        const areas = getUniqueAreas();
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            areaFilter.appendChild(option);
        });
        console.log("Sakskompass: Area filter populated.");
    }

    function setupEventListeners() {
        const controls = document.querySelectorAll('.sk-controls select');
        controls.forEach(select => {
            // Fjern gammel lytter før vi legger til ny, for sikkerhets skyld
            select.removeEventListener('change', processAndVisualizeData);
            select.addEventListener('change', processAndVisualizeData);
        });
         console.log("Sakskompass: Event listeners set up.");
    }

    function processIssueData(supportLevelType) {
        console.log(`Sakskompass: Processing issue data for support level: ${supportLevelType}`);
        if (!Array.isArray(issuesData) || issuesData.length === 0) {
             console.error("Sakskompass: issuesData is empty or not an array in processIssueData!");
             return [];
        }
         if (Object.keys(partiesMap).length === 0) {
             console.error("Sakskompass: partiesMap is empty in processIssueData!");
             return [];
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

                        if (supportLevelType === 'level-2' && level === 2) {
                            includeParty = true;
                        } else if (supportLevelType === 'level-1-2' && (level === 1 || level === 2)) {
                            includeParty = true;
                        }

                        if (includeParty) {
                            if (typeof partyInfo.seats === 'number') {
                                totalMandates += partyInfo.seats;
                                supportingPartiesData.push({
                                    shorthand: partyCode,
                                    name: partyInfo.name,
                                    seats: partyInfo.seats,
                                    color: partyInfo.color,
                                    level: level,
                                    position: partyInfo.position
                                });
                            } else {
                                console.warn(`      -> Party ${partyCode} included but 'seats' is not a number:`, partyInfo.seats);
                            }
                        }
                    } else if (!partyInfo) {
                         // console.warn(`    Party code '${partyCode}' from issue ${issue.id} not found in partiesMap.`); // Skru av for mindre støy
                    } else if (!stance) {
                         // console.warn(`    Stance data missing for party '${partyCode}' in issue ${issue.id}.`);
                    } else if (typeof stance.level === 'undefined') {
                        // console.warn(`    Stance 'level' missing for party '${partyCode}' in issue ${issue.id}.`);
                    }
                }
            } else {
                 console.warn(`  Issue ID ${issue.id} (${issue.name}) has no partyStances object.`);
            }

            supportingPartiesData.sort((a, b) => a.position - b.position);

             // DEBUG: Logg resultatet for *hver* sak
             // console.log(`  -> Issue: ${issue.name}, Calculated Mandates: ${totalMandates}, Supporting Parties Count: ${supportingPartiesData.length}`);

            return {
                id: issue.id,
                name: issue.name,
                area: issue.area,
                totalMandates: totalMandates,
                supportingPartiesData: supportingPartiesData
            };
        });
        console.log(`Sakskompass: Finished processing ${processedIssues.length} issues.`);
        return processedIssues;
    }

    function applyFiltersAndSort(processedIssues) {
        const areaFilter = document.getElementById('sk-area-filter').value;
        const sortFilter = document.getElementById('sk-sort-filter').value;
        console.log(`Sakskompass: Applying filters - Area: ${areaFilter}, Sort: ${sortFilter}`);

        let filtered = processedIssues;
        if (areaFilter !== 'all') {
            filtered = processedIssues.filter(issue => issue.area === areaFilter);
             console.log(`  -> Filtered by area, ${filtered.length} issues remaining.`);
        }

        // Fjernet area_mandates_desc sortering inntil videre
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
            case 'mandates_desc': default:
                filtered.sort((a, b) => b.totalMandates - a.totalMandates);
                break;
        }
         console.log("  -> Sorting applied.");
        return filtered;
    }

    function processAndVisualizeData() {
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

            // console.log("Sakskompass: Final data for visualization:", finalData); // Skru av for mindre støy

            container.html('');

            if (!Array.isArray(finalData) || finalData.length === 0) {
                console.warn("Sakskompass: No data to visualize after processing and filtering.");
                container.html('<p class="no-data">Ingen saker funnet for gjeldende filtre.</p>');
                updateLegend([]);
                return;
            }

            updateLegend(partiesData);

            console.log(`Sakskompass: Rendering view type: ${viewType}`);
            if (viewType === 'bar-chart') {
                createHorizontalBarChart(finalData);
            } else if (viewType === 'dot-plot') {
                createDotPlot(finalData);
            } else if (viewType === 'table') {
                createTable(finalData);
            }
        }, 0);
    }

    // --- Visualiseringsfunksjoner ---

    // *** START: createHorizontalBarChart med ALLE OPPDATERINGER ***
    function createHorizontalBarChart(data) {
        console.log("Sakskompass: createHorizontalBarChart called with data:", data.length);
        const container = d3.select("#sk-visualization-container");
        container.html(''); // Tøm container

        const containerWidth = container.node().getBoundingClientRect().width;

        // Bestem venstremarg basert på bredde
        let dynamicMarginLeft;
        if (containerWidth < 500) { // Små skjermer (mobil portrett)
            dynamicMarginLeft = 120; // Mindre marg
        } else if (containerWidth < 768) { // Mellomstore skjermer (mobil landskap / små nettbrett)
            dynamicMarginLeft = 180; // Litt mer marg
        } else { // Større skjermer (desktop)
            dynamicMarginLeft = 300; // Original marg
        }

        // Definer margin-objektet med den dynamiske venstremargen
        const margin = { top: 20, right: 30, bottom: 40, left: dynamicMarginLeft };

        // Beregn bredde og høyde
        const effectiveChartWidth = Math.max(100, containerWidth - margin.left - margin.right);
        const barHeight = 20;
        const barPadding = 10;
        const height = data.length * (barHeight + barPadding) + margin.top + margin.bottom;

        const svg = container.append("svg")
            .attr("width", containerWidth)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Skalaer
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, height - margin.top - margin.bottom])
            .paddingInner(barPadding / (barHeight + barPadding))
            .paddingOuter(0.1);

        const xScale = d3.scaleLinear()
            .domain([0, 169])
            .range([0, effectiveChartWidth]);

        // Akser
        const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);
        const yAxisGroup = svg.append("g") // Lagre referanse til y-akse gruppen
            .attr("class", "y-axis axis")
            .call(yAxis)
            .call(g => g.select(".domain").remove());

        yAxisGroup.selectAll(".tick") // Velg alle ticks innenfor y-aksen
            .selectAll("text") // Velg teksten innenfor hver tick
            .call(wrapAxisText, margin.left - 15) // Bruker dynamisk margin og litt mer padding
            // --- START: Hover-lytter på Y-akse ticks ---
            .each(function(d) {
                // Gå opp til forelder (<g class="tick">) for å legge til datum og lytter
                d3.select(this.parentNode).datum(d); // Legg saksnavnet til <g class="tick">
            });

        // Legg lyttere til tick-gruppene (<g class="tick">)
        yAxisGroup.selectAll(".tick")
            .on("mouseover", function(event, d) { // 'd' her er saksnavnet
                const issueName = d;
                // console.log("Over tick:", issueName); // DEBUG
                d3.select(this).classed("highlighted", true); // Uthev tick-gruppen (inkl tekst)

                // Finn og uthev tilhørende søylegruppe og hjelpelinje
                svg.selectAll(".bar-group")
                    .filter(barData => barData.name === issueName)
                    .classed("highlighted", true);
                svg.selectAll(".guideline")
                    .filter(lineData => lineData.name === issueName)
                    .classed("highlighted", true);
            })
            .on("mouseout", function(event, d) {
                const issueName = d;
                // console.log("Out tick:", issueName); // DEBUG
                d3.select(this).classed("highlighted", false); // Fjern utheving fra tick

                // Fjern utheving fra tilhørende elementer
                svg.selectAll(".bar-group.highlighted")
                    .filter(barData => barData.name === issueName)
                    .classed("highlighted", false);
                svg.selectAll(".guideline.highlighted")
                    .filter(lineData => lineData.name === issueName)
                    .classed("highlighted", false);
            });
            // --- SLUTT: Hover-lytter på Y-akse ticks ---


        const xAxis = d3.axisBottom(xScale).ticks(Math.max(5, Math.floor(effectiveChartWidth / 80))).tickSizeOuter(0);
        svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .call(xAxis)
            .call(g => g.select(".domain").remove());

        // --- START: Legg til hjelpelinjer ---
        svg.selectAll(".guideline")
            .data(data, d => d.id) // Bruk samme data som for søyler/akse
            .join("line")
            .attr("class", "guideline")
            .attr("x1", 0) // Start ved x=0 (der søylene starter)
            .attr("x2", -6) // Gå litt inn på y-aksens område
            .attr("y1", d => yScale(d.name) + yScale.bandwidth() / 2) // Midt på søylens høyde
            .attr("y2", d => yScale(d.name) + yScale.bandwidth() / 2); // Rett linje
        // --- SLUTT: Legg til hjelpelinjer ---

        // Flertallslinje
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
        } else {
            console.log("Sakskompass: Majority line outside chart area.");
        }

        // Tooltip
        const tooltip = d3.select("body").select(".d3-tooltip").empty()
            ? d3.select("body").append("div").attr("class", "d3-tooltip")
            : d3.select("body").select(".d3-tooltip");

        // Tegn søyler (grupper og segmenter)
        const barGroups = svg.selectAll(".bar-group")
            .data(data, d => d.id)
            .join("g")
            .attr("class", "bar-group")
            .attr("transform", d => `translate(0,${yScale(d.name)})`)
            // --- START: Hover-lytter på Bar Groups ---
            .on("mouseover", function(event, d) { // 'd' her er hele dataobjektet for saken
                // console.log("Over bar group:", d.name); // DEBUG
                d3.select(this).classed("highlighted", true); // Uthev selve søylegruppen

                // Finn og uthev tilhørende Y-akse tick og hjelpelinje
                yAxisGroup.selectAll(".tick") // Bruk referansen yAxisGroup
                    .filter(tickData => tickData === d.name) // Sammenlign med navnet
                    .classed("highlighted", true);
                svg.selectAll(".guideline")
                    .filter(lineData => lineData.id === d.id) // Sammenlign med ID
                    .classed("highlighted", true);
            })
            .on("mouseout", function(event, d) {
                // console.log("Out bar group:", d.name); // DEBUG
                d3.select(this).classed("highlighted", false); // Fjern utheving fra søylegruppe

                // Fjern utheving fra tilhørende elementer
                yAxisGroup.selectAll(".tick.highlighted") // Bruk referansen yAxisGroup
                    .filter(tickData => tickData === d.name)
                    .classed("highlighted", false);
                svg.selectAll(".guideline.highlighted")
                    .filter(lineData => lineData.id === d.id)
                    .classed("highlighted", false);
            });
            // --- SLUTT: Hover-lytter på Bar Groups ---

        // Tegn segmentene INNI gruppene
        barGroups.selectAll(".bar-segment")
            .data(d => {
                let currentX = 0;
                // Beregn startposisjon for hvert segment basert på *akkumulerte* mandater
                const segments = d.supportingPartiesData.map(p => {
                    const startXValue = currentX; // Hvor segmentet starter på x-aksen (i mandater)
                    const segmentWidthValue = p.seats; // Bredden på segmentet (i mandater)
                    const segment = {
                        ...p,
                        startX: xScale(startXValue), // Startposisjon i piksler
                        width: Math.max(0, xScale(startXValue + segmentWidthValue) - xScale(startXValue)), // Bredde i piksler
                        startXMandates: startXValue // Lagre start i mandater for tooltip
                    };
                    currentX += segmentWidthValue; // Oppdater akkumulert sum
                    return segment;
                });
                return segments;
            })
            .join("rect")
            .attr("class", "bar-segment")
            .attr("y", 0)
            .attr("height", yScale.bandwidth())
            .attr("x", d => d.startX)
            .attr("width", d => d.width)
            .attr("fill", d => d.color || "#cccccc")
            .attr("fill-opacity", d => d.level === 1 ? 0.6 : 1.0) // Dusere farge for nivå 1
            .on("mouseover", function(event, d) { // Hover på segment for tooltip
                tooltip.classed("visible", true)
                    .html(`<b>${d.name}</b><br>Støtte: Nivå ${d.level}<br>Mandater: ${d.seats}`);
                d3.select(this).attr("stroke-width", 1.5).attr("stroke", "black");
                // Stopp event propagering så ikke barGroup sin mouseover trigger unødvendig
                event.stopPropagation();
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 10) + "px");
                event.stopPropagation();
            })
            .on("mouseout", function(event) { // Mouseout fra segment
                tooltip.classed("visible", false);
                d3.select(this).attr("stroke-width", 0.5).attr("stroke", "white");
                event.stopPropagation();
            });

        // Legg til totalt mandat-label
        barGroups.append("text")
            .attr("class", "total-mandate-label")
            .attr("x", d => {
                const labelX = xScale(d.totalMandates) + 5; // Plasser litt til høyre for søylen
                // Sørg for at labelen ikke går utenfor kanten
                return Math.min(labelX, effectiveChartWidth - 15); // Gi litt luft til høyre
            })
            .attr("y", yScale.bandwidth() / 2)
            .attr("dy", "0.35em") // Sentrer vertikalt
            .attr("font-size", "0.8rem")
            .attr("fill", "#333")
            .text(d => d.totalMandates);

    }
    // *** SLUTT: createHorizontalBarChart med ALLE OPPDATERINGER ***


    // Dot plot (bruker samme dynamiske margin)
    function createDotPlot(data) {
        console.log("Sakskompass: createDotPlot called with data:", data);
        const container = d3.select("#sk-visualization-container");
        container.html(''); // Tøm container

        // --- START: Bruker samme dynamiske marginlogikk som bar chart ---
        const containerWidth = container.node().getBoundingClientRect().width;
        let dynamicMarginLeft;
        if (containerWidth < 500) {
            dynamicMarginLeft = 120;
        } else if (containerWidth < 768) {
            dynamicMarginLeft = 180;
        } else {
            dynamicMarginLeft = 300;
        }
        const margin = { top: 20, right: 30, bottom: 40, left: dynamicMarginLeft };
        const effectiveChartWidth = Math.max(100, containerWidth - margin.left - margin.right);
        // --- SLUTT: Dynamisk marginlogikk ---

        const dotPlotItemHeight = 35; // Høyde per sak
        const height = data.length * dotPlotItemHeight + margin.top + margin.bottom; // Dynamisk høyde

        const svg = container.append("svg")
            .attr("width", containerWidth)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Skalaer
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, height - margin.top - margin.bottom])
            .padding(0.5); // Padding mellom bånd

        const xScale = d3.scaleLinear()
            .domain([0, 169])
            .range([0, effectiveChartWidth]);

        // Akser
        const yAxis = d3.axisLeft(yScale).tickSize(0); // Fjernet tick marks
        svg.append("g")
            .attr("class", "y-axis axis")
            .call(yAxis)
            .call(g => g.select(".domain").remove())
            .selectAll(".tick text")
            .call(wrapAxisText, margin.left - 15); // Bruker dynamisk margin for tekstbryting

        const xAxis = d3.axisBottom(xScale).ticks(Math.max(5, Math.floor(effectiveChartWidth / 80))).tickSizeOuter(0);
        svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .call(xAxis)
            .call(g => g.select(".domain").remove());

        // Flertallslinje (uendret)
        const majorityThreshold = 85;
        if (xScale(majorityThreshold) >= 0 && xScale(majorityThreshold) <= effectiveChartWidth) {
            svg.append("line").attr("class", "majority-line").attr("x1", xScale(majorityThreshold)).attr("x2", xScale(majorityThreshold)).attr("y1", 0).attr("y2", height - margin.top - margin.bottom);
            svg.append("text").attr("class", "majority-label").attr("x", xScale(majorityThreshold)).attr("y", -5).text(`Flertall (${majorityThreshold})`);
        }

        // Tooltip (uendret)
        const tooltip = d3.select("body").select(".d3-tooltip").empty()
            ? d3.select("body").append("div").attr("class", "d3-tooltip")
            : d3.select("body").select(".d3-tooltip");

        // Tegn Prikkene (Dots)
        const dotRadius = 5;
        svg.selectAll(".issue-dot")
            .data(data, d => d.id)
            .join("circle")
            .attr("class", "issue-dot")
            .attr("cx", d => xScale(d.totalMandates))
            .attr("cy", d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr("r", dotRadius)
            .attr("fill", d => { // Farge basert på fargen til det "første" (mest venstreorienterte) støttepartiet
                 if (d.supportingPartiesData.length > 0) { return d.supportingPartiesData[0].color || '#cccccc'; }
                 return '#cccccc'; // Fallback grå
             })
             .attr("fill-opacity", d => { // Gjør prikker for saker som kun har nivå 1-støtte dusere
                 const onlyLevel1 = d.supportingPartiesData.length > 0 && d.supportingPartiesData.every(p => p.level === 1);
                 return onlyLevel1 ? 0.6 : 1.0;
             })
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                 const partyDetails = d.supportingPartiesData.map(p => `${p.shorthand} (${p.seats}, Nivå ${p.level})`).join('<br>');
                tooltip.classed("visible", true)
                    .html(`<b>${d.name}</b><br>Total støtte: ${d.totalMandates} mandater<br><small>${partyDetails || 'Ingen detaljer'} </small>`);
                d3.select(this).transition().duration(150).attr("r", dotRadius * 1.5).attr("stroke", "black").attr("stroke-width", 1.5);
            })
            .on("mousemove", function(event) { tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 10) + "px"); })
            .on("mouseout", function() {
                tooltip.classed("visible", false);
                d3.select(this).transition().duration(150).attr("r", dotRadius).attr("stroke", "none");
            });

        // Valgfri Tekst ved siden av prikkene
         svg.selectAll(".dot-label")
            .data(data, d => d.id)
            .join("text")
            .attr("class", "dot-label")
            .attr("x", d => xScale(d.totalMandates) + dotRadius + 4)
            .attr("y", d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("font-size", "0.75rem") // Juster størrelse etter behov
            .attr("fill", "#555")
            .text(d => d.totalMandates);
    }


    function createTable(data) {
         console.log("Sakskompass: createTable called with data:", data);
        const container = d3.select("#sk-visualization-container");
        container.html('');
        const tableContainer = container.append("div").attr("class", "sk-table-container"); // For scrolling
        const table = tableContainer.append("table").attr("class", "sk-table");

        // Tabellhode
        table.append("thead").append("tr")
            .selectAll("th")
            .data(["Sak", "Saksområde", "Total Støtte", "Støttende Partier (Nivå)"])
            .join("th")
            .text(d => d);

        // Tabellkropp
        const tbody = table.append("tbody");
        data.forEach(issue => {
            const row = tbody.append("tr");
            row.append("td").text(issue.name || 'Mangler navn');
            row.append("td").text(issue.area || 'Mangler område');
            row.append("td").attr("class", "mandates-col").text(issue.totalMandates);

            const partiesCell = row.append("td").attr("class", "parties-col");
            if (Array.isArray(issue.supportingPartiesData) && issue.supportingPartiesData.length > 0) {
                issue.supportingPartiesData.forEach(p => {
                    const partyClass = p.shorthand ? p.shorthand.toLowerCase() : 'unknown';
                    // Bruk rgba for bakgrunn med lav opasitet, og full farge for border/tekst
                    const partyColor = p.color || '#cccccc';
                    partiesCell.append("span")
                        .attr("class", `mini-party-tag level-${p.level} party-tag-${partyClass}`)
                        .style("background-color", `${partyColor}20`) // Lav opasitet bakgrunn (hex + alpha)
                        .style("border", `1px solid ${partyColor}80`) // Medium opasitet border
                        .style("color", `${partyColor}`) // Full opasitet tekstfarge
                        .text(`${p.shorthand || '?'} (${p.level})`); // Vis partikode og nivå
                });
            } else {
                partiesCell.append("span").style("font-style", "italic").text("Ingen");
            }
        });
    }

    function updateLegend(partyList) {
         console.log("Sakskompass: updateLegend called.");
        const legendContainer = d3.select("#sk-legend-container");
        legendContainer.html(''); // Tøm eksisterende

        if (!Array.isArray(partyList) || partyList.length === 0) {
            console.log("  -> No parties to show in legend.");
            return;
        }

        // Sorter partier etter posisjon for konsistent rekkefølge
        const sortedParties = [...partyList].sort((a, b) => (a.position || 99) - (b.position || 99));

        // Lag legendeelementer
        sortedParties.forEach(party => {
            const item = legendContainer.append("div")
                .attr("class", "legend-item"); // Bruker felles legend-item stil

            item.append("div")
                .attr("class", "legend-color")
                .style("background-color", party.color || '#cccccc');

            item.append("span")
                 // .attr("class", "legend-text") // Kan bruke egen klasse om nødvendig
                 .text(`${party.name || 'Ukjent'} (${party.seats || '?'})`);
        });
         console.log(`  -> Legend updated with ${sortedParties.length} parties.`);
    }

    // Funksjon for å bryte lange aksetekster
    function wrapAxisText(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy") || 0),
                // Sentrer teksten vertikalt mot ticken (juster x etter behov)
                tspan = text.text(null).append("tspan").attr("x", -10).attr("y", y).attr("dy", dy + "em").style("text-anchor", "end"); // Juster ankerpunkt

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                // Sjekk om noden faktisk finnes før getComputedTextLength
                if (tspan.node() && tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                                .attr("x", -10) // Sørg for lik x-posisjon
                                .attr("y", y)
                                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                                .style("text-anchor", "end") // Juster ankerpunkt
                                .text(word);
                }
            }
        });
    }


}); // Slutt på DOMContentLoaded
