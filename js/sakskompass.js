// js/sakskompass.js (MED DYNAMISK RADHØYDE + HJELPELINJER/HOVER)

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
        if (!issuesLoaded || !partiesLoaded) {
            console.log(`Sakskompass: Still waiting... Issues: ${issuesLoaded}, Parties: ${partiesLoaded}`);
            return;
        }
        console.log("Sakskompass: All data loaded. Initializing.");

        partiesData.forEach(p => partiesMap[p.shorthand] = p);
        console.log("Sakskompass: partiesMap created:", partiesMap);

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

    // Lasting av partydata
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
                partiesData = [];
                window.partiesData = partiesData;
                window.partiesDataLoaded = true;
                partiesLoaded = true;
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
    function getUniqueAreas() {
        if (!Array.isArray(issuesData)) return [];
        const areas = issuesData.map(issue => issue.area).filter(area => area);
        return [...new Set(areas)].sort();
    }

    function populateAreaFilter() {
        const areaFilter = document.getElementById('sk-area-filter');
        if (!areaFilter) return;
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
            select.removeEventListener('change', processAndVisualizeData);
            select.addEventListener('change', processAndVisualizeData);
        });
         console.log("Sakskompass: Event listeners set up.");
    }

    function processIssueData(supportLevelType) {
        // ... (Denne funksjonen er uendret fra forrige versjon) ...
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
                         // console.warn(`    Party code '${partyCode}' from issue ${issue.id} not found in partiesMap.`);
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
        // ... (Denne funksjonen er uendret fra forrige versjon) ...
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
                createHorizontalBarChart(finalData); // <--- DENNE ER ENDRET
            } else if (viewType === 'dot-plot') {
                createDotPlot(finalData); // Denne bruker fortsatt dynamisk margin
            } else if (viewType === 'table') {
                createTable(finalData);
            }
        }, 10); // Liten timeout for å la loader vises
    }

    // --- Visualiseringsfunksjoner ---

    // *** START: createHorizontalBarChart med DYNAMISK RADHØYDE ***
    function createHorizontalBarChart(data) {
        console.log("Sakskompass: createHorizontalBarChart (dynamic height) called with data:", data.length);
        const container = d3.select("#sk-visualization-container");
        container.html('');

        const containerWidth = container.node().getBoundingClientRect().width;

        // --- Dynamisk venstremarg ---
        let dynamicMarginLeft;
        if (containerWidth < 500) { dynamicMarginLeft = 120; }
        else if (containerWidth < 768) { dynamicMarginLeft = 180; }
        else { dynamicMarginLeft = 300; }
        const margin = { top: 20, right: 30, bottom: 40, left: dynamicMarginLeft };
        // --- Slutt dynamisk venstremarg ---

        const effectiveChartWidth = Math.max(100, containerWidth - margin.left - margin.right);

        // --- Definer minimumshøyde og padding for dynamisk beregning ---
        const minItemHeight = 25; // Minimum høyde for en søyle/tekst-område
        const itemPadding = 15;   // Vertikal luft mellom hver sak

        // --- Start SVG uten fast høyde ---
        const svg = container.append("svg")
            .attr("width", containerWidth)
            // Høyde settes senere
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- Y-akse (skala og tegning uten tekstbryting) ---
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            // Bruk en foreløpig høy range, justeres senere
            .range([0, data.length * (minItemHeight + itemPadding)])
            .paddingOuter(0.1);

        const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(10); // Ingen tick linjer, litt padding

        const yAxisGroup = svg.append("g")
            .attr("class", "y-axis axis")
            .call(yAxis)
            .call(g => g.select(".domain").remove()); // Fjern selve akselinjen

        // Velg tekstetikettene
        const yAxisTextLabels = yAxisGroup.selectAll(".tick text");

        // --- Bryt teksten NÅ ---
        yAxisTextLabels.call(wrapAxisText, margin.left - 15); // Bruk dynamisk margin for bredde

        // --- Mål høyder og beregn posisjoner ---
        let calculatedPositions = []; // Array for { name: "...", y: ..., height: ... }
        let currentY = 0; // Start Y-posisjon

        yAxisGroup.selectAll(".tick").each(function(d) { // Gå gjennom hver tick <g>
            const tickElement = d3.select(this);
            const textElement = tickElement.select("text");
            let textHeight = minItemHeight; // Start med minimum
            try {
                const bbox = textElement.node().getBBox();
                if (bbox && bbox.height > 0) {
                    // Bruk målt høyde, men aldri mindre enn minimum
                    textHeight = Math.max(minItemHeight, bbox.height);
                }
            } catch (e) {
                console.warn("Could not get BBox for text:", textElement.text(), e);
            }

            const itemStartY = currentY; // Hvor denne raden starter
            const itemTotalHeight = textHeight; // Total høyde for denne radens tekst
            const itemCenterY = itemStartY + itemTotalHeight / 2; // Vertikalt senter for denne raden

            // Lagre beregnet posisjon og høyde
            calculatedPositions.push({ name: d, y: itemCenterY, height: itemTotalHeight });

            // Oppdater Y for neste element
            currentY += itemTotalHeight + itemPadding;
        });

        // Beregn total høyde for innholdet
        const totalContentHeight = currentY > 0 ? currentY - itemPadding : 0;

        // --- Oppdater SVG og X-akse ---
        container.select("svg").attr("height", totalContentHeight + margin.top + margin.bottom);

        const xScale = d3.scaleLinear() // Definer xScale her
            .domain([0, 169])
            .range([0, effectiveChartWidth]);

        const xAxis = d3.axisBottom(xScale).ticks(Math.max(5, Math.floor(effectiveChartWidth / 80))).tickSizeOuter(0);
        svg.append("g") // Tegn X-aksen nå som vi vet høyden
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${totalContentHeight})`)
            .call(xAxis)
            .call(g => g.select(".domain").remove());


        // --- Oppdater Y-akse tick posisjoner ---
        yAxisGroup.selectAll(".tick")
            .attr("transform", function(d) {
                const posData = calculatedPositions.find(p => p.name === d);
                return `translate(0, ${posData ? posData.y : 0})`; // Flytt til beregnet senter Y
            });

        // --- Tegn Hjelpelinjer på riktig sted ---
        svg.selectAll(".guideline").remove(); // Fjern evt gamle
        svg.selectAll(".guideline")
           .data(calculatedPositions, d => d.name) // Bruk beregnede posisjoner
           .join("line")
           .attr("class", "guideline")
           .attr("x1", 0)
           .attr("x2", -6)
           .attr("y1", d => d.y) // Bruk senter Y
           .attr("y2", d => d.y);

        // --- Flertallslinje ---
        const majorityThreshold = 85;
        if (xScale(majorityThreshold) >= 0 && xScale(majorityThreshold) <= effectiveChartWidth) {
            svg.selectAll(".majority-line").remove(); // Fjern evt gammel
            svg.append("line")
                .attr("class", "majority-line")
                .attr("x1", xScale(majorityThreshold))
                .attr("x2", xScale(majorityThreshold))
                .attr("y1", 0)
                .attr("y2", totalContentHeight); // Strekk til ny bunn
            svg.selectAll(".majority-label").remove(); // Fjern evt gammel
            svg.append("text")
                .attr("class", "majority-label")
                .attr("x", xScale(majorityThreshold))
                .attr("y", -5)
                .text(`Flertall (${majorityThreshold})`);
        } else {
            console.log("Sakskompass: Majority line outside chart area.");
        }

        // --- Tooltip ---
        const tooltip = d3.select("body").select(".d3-tooltip").empty()
            ? d3.select("body").append("div").attr("class", "d3-tooltip")
            : d3.select("body").select(".d3-tooltip");

        // --- Tegn Søylegrupper på riktig sted ---
        const barGroups = svg.selectAll(".bar-group")
            .data(data, d => d.id)
            .join("g")
            .attr("class", "bar-group")
            .attr("transform", d => {
                const posData = calculatedPositions.find(p => p.name === d.name);
                // Søylen (med minItemHeight) skal sentreres vertikalt i sin tildelte plass
                const barY = posData ? posData.y - minItemHeight / 2 : 0;
                return `translate(0, ${barY})`;
            })
            // --- Hover-logikk (som før, men med oppdatert guideline filter) ---
            .on("mouseover", function(event, d) {
                d3.select(this).classed("highlighted", true);
                yAxisGroup.selectAll(".tick")
                    .filter(tickData => tickData === d.name)
                    .classed("highlighted", true);
                svg.selectAll(".guideline")
                    .filter(lineData => lineData.name === d.name) // Filter på navn
                    .classed("highlighted", true);
            })
            .on("mouseout", function(event, d) {
                d3.select(this).classed("highlighted", false);
                yAxisGroup.selectAll(".tick.highlighted")
                    .filter(tickData => tickData === d.name)
                    .classed("highlighted", false);
                svg.selectAll(".guideline.highlighted")
                    .filter(lineData => lineData.name === d.name) // Filter på navn
                    .classed("highlighted", false);
            });


        // --- Tegn Segmenter og Label INNI gruppene ---
        barGroups.selectAll(".bar-segment")
            .data(d => {
                let currentX = 0;
                const segments = d.supportingPartiesData.map(p => {
                    const startXValue = currentX;
                    const segmentWidthValue = p.seats;
                    const segment = {
                        ...p,
                        startX: xScale(startXValue),
                        width: Math.max(0, xScale(startXValue + segmentWidthValue) - xScale(startXValue)),
                        startXMandates: startXValue
                    };
                    currentX += segmentWidthValue;
                    return segment;
                });
                return segments;
            })
            .join("rect")
            .attr("class", "bar-segment")
            .attr("y", 0) // Start på toppen av gruppen (<g>)
            .attr("height", minItemHeight) // Bruk minimumshøyden for selve søylen
            .attr("x", d => d.startX)
            .attr("width", d => d.width)
            .attr("fill", d => d.color || "#cccccc")
            .attr("fill-opacity", d => d.level === 1 ? 0.6 : 1.0)
            .on("mouseover", function(event, d) {
                tooltip.classed("visible", true)
                    .html(`<b>${d.name}</b><br>Støtte: Nivå ${d.level}<br>Mandater: ${d.seats}`);
                d3.select(this).attr("stroke-width", 1.5).attr("stroke", "black");
                event.stopPropagation();
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 10) + "px");
                event.stopPropagation();
            })
            .on("mouseout", function(event) {
                tooltip.classed("visible", false);
                d3.select(this).attr("stroke-width", 0.5).attr("stroke", "white");
                event.stopPropagation();
            });

        // Legg til totalt mandat-label (sentrert i søylehøyden)
        barGroups.append("text")
            .attr("class", "total-mandate-label")
            .attr("x", d => {
                const labelX = xScale(d.totalMandates) + 5;
                return Math.min(labelX, effectiveChartWidth - 15);
            })
            .attr("y", minItemHeight / 2) // Senter i søylens høyde
            .attr("dy", "0.35em")
            .attr("font-size", "0.8rem")
            .attr("fill", "#333")
            .text(d => d.totalMandates);

        // --- Oppdater Y-akse tick hover-logikk (plassert etter alt er tegnet) ---
         yAxisGroup.selectAll(".tick") // Velg ticks igjen for å legge til hover
            .on("mouseover", function(event, d) {
                const issueName = d;
                d3.select(this).classed("highlighted", true);
                svg.selectAll(".bar-group")
                    .filter(barData => barData.name === issueName)
                    .classed("highlighted", true);
                svg.selectAll(".guideline")
                    .filter(lineData => lineData.name === issueName)
                    .classed("highlighted", true);
            })
            .on("mouseout", function(event, d) {
                const issueName = d;
                d3.select(this).classed("highlighted", false);
                svg.selectAll(".bar-group.highlighted")
                    .filter(barData => barData.name === issueName)
                    .classed("highlighted", false);
                svg.selectAll(".guideline.highlighted")
                    .filter(lineData => lineData.name === issueName)
                    .classed("highlighted", false);
            });

    }
    // *** SLUTT: createHorizontalBarChart med DYNAMISK RADHØYDE ***


    // Dot plot (bruker fortsatt dynamisk margin, men ikke dynamisk radhøyde)
    function createDotPlot(data) {
        // ... (Denne funksjonen er uendret fra forrige 'fullstendig fil'-svar) ...
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

    // Tabellvisning (uendret)
    function createTable(data) {
        // ... (uendret fra forrige 'fullstendig fil'-svar) ...
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

    // Oppdater legende (uendret)
    function updateLegend(partyList) {
        // ... (uendret fra forrige 'fullstendig fil'-svar) ...
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

    // Funksjon for å bryte lange aksetekster (justert text-anchor)
    function wrapAxisText(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"), // y-posisjon er relativt til tick-gruppen (<g>)
                dy = parseFloat(text.attr("dy") || 0), // Hent eksisterende dy
                // Juster x for høyrejustering, y settes av D3, dy håndterer linjeskift
                tspan = text.text(null).append("tspan")
                           .attr("x", -10) // Negativ x for høyrejustering fra tick-punktet
                           .attr("dy", dy + "em") // Bruk original dy for første linje
                           .style("text-anchor", "end"); // Høyrejuster teksten

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node() && tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                                .attr("x", -10) // Samme x for alle linjer
                                .attr("dy", lineHeight + "em") // Bruk lineHeight for påfølgende linjer
                                .style("text-anchor", "end")
                                .text(word);
                }
            }
        });
    }


}); // Slutt på DOMContentLoaded
