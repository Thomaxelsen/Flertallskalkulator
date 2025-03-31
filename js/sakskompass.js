document.addEventListener('DOMContentLoaded', function() {
    // Vent på at både issues og party data er lastet
    // Antar at issues lastes via issues.js og trigger 'issuesDataLoaded'
    // Antar at parties lastes via partiesData.js og trigger 'partiesDataLoaded' (eller lignende)

    let issuesData = [];
    let partiesData = [];
    let partiesMap = {}; // For raskt oppslag

    let issuesLoaded = false;
    let partiesLoaded = false;

    // Funksjon for å initialisere når all data er klar
    function initializeSakskompass() {
        if (!issuesLoaded || !partiesLoaded) return; // Vent på begge
        console.log("Sakskompass: All data loaded. Initializing.");

        // Lag rask oppslags-map for partier
        partiesData.forEach(p => partiesMap[p.shorthand] = p);

        populateAreaFilter();
        setupEventListeners();
        processAndVisualizeData(); // Første visning
    }

    // Lytt etter at issues er lastet
    document.addEventListener('issuesDataLoaded', () => {
        // Hent data fra global variabel eller annen kilde issues.js bruker
        issuesData = window.issues || [];
         if (!Array.isArray(issuesData) || issuesData.length === 0) {
            // Prøv å hente fra issues.json på nytt hvis window.issues er tom
            console.warn("Sakskompass: window.issues var tom, prøver fetch...");
            fetch('data/issues.json')
                .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
                .then(data => {
                    issuesData = data;
                    issuesLoaded = true;
                     console.log("Sakskompass: Fetched issues.json data.");
                    initializeSakskompass();
                })
                .catch(error => console.error("Sakskompass: Error fetching issues.json:", error));
        } else {
            issuesLoaded = true;
            console.log("Sakskompass: Issues data loaded from window.issues.");
            initializeSakskompass();
        }
    });

    // Antar at du har en måte å laste partydata på (f.eks. partiesData.js)
    // Hvis ikke, legg til fetch her:
    if (!window.partiesDataLoaded) { // Sjekk om data allerede er lastet
        fetch('data/parties.json')
            .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
            .then(data => {
                partiesData = data;
                partiesLoaded = true;
                 console.log("Sakskompass: Fetched parties.json data.");
                initializeSakskompass();
                // Lagre evt. globalt hvis andre skript trenger det
                window.partiesData = partiesData;
                window.partiesDataLoaded = true;
                 // Dispatch et event hvis andre lytter
                document.dispatchEvent(new CustomEvent('partiesDataLoaded'));
            })
            .catch(error => console.error("Sakskompass: Error fetching parties.json:", error));
    } else {
        partiesData = window.partiesData; // Bruk eksisterende data
        partiesLoaded = true;
        console.log("Sakskompass: Parties data already loaded.");
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
        const areas = getUniqueAreas();
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            areaFilter.appendChild(option);
        });
    }

    function setupEventListeners() {
        const controls = document.querySelectorAll('.sk-controls select');
        controls.forEach(select => {
            select.addEventListener('change', processAndVisualizeData);
        });
    }

    function processIssueData(supportLevelType) {
        const processedIssues = issuesData.map(issue => {
            let totalMandates = 0;
            const supportingPartiesData = [];

            if (issue.partyStances) {
                for (const partyCode in issue.partyStances) {
                    const stance = issue.partyStances[partyCode];
                    const partyInfo = partiesMap[partyCode];

                    if (partyInfo && stance) {
                        const level = stance.level;
                        let includeParty = false;

                        if (supportLevelType === 'level-2' && level === 2) {
                            includeParty = true;
                        } else if (supportLevelType === 'level-1-2' && (level === 1 || level === 2)) {
                            includeParty = true;
                        }

                        if (includeParty) {
                            totalMandates += partyInfo.seats;
                            supportingPartiesData.push({
                                shorthand: partyCode,
                                name: partyInfo.name,
                                seats: partyInfo.seats,
                                color: partyInfo.color,
                                level: level, // Viktig for opasitet/styling
                                position: partyInfo.position // For sortering av segmenter
                            });
                        }
                    }
                }
            }
            // Sorter partiene internt (f.eks. politisk posisjon) for konsistent segmentrekkefølge
            supportingPartiesData.sort((a, b) => a.position - b.position);

            return {
                id: issue.id,
                name: issue.name,
                area: issue.area,
                totalMandates: totalMandates,
                supportingPartiesData: supportingPartiesData
            };
        });
        return processedIssues;
    }

    function applyFiltersAndSort(processedIssues) {
        const areaFilter = document.getElementById('sk-area-filter').value;
        const sortFilter = document.getElementById('sk-sort-filter').value;

        // 1. Filtrer etter område
        let filtered = processedIssues;
        if (areaFilter !== 'all') {
            filtered = processedIssues.filter(issue => issue.area === areaFilter);
        }

        // 2. Sorter
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
            case 'mandates_desc': // default
            default:
                filtered.sort((a, b) => b.totalMandates - a.totalMandates);
                break;
        }
        return filtered;
    }

    function processAndVisualizeData() {
         console.log("Sakskompass: Processing and visualizing data...");
        const supportLevelType = document.getElementById('sk-support-level-filter').value;
        const viewType = document.getElementById('sk-view-type-filter').value;
        const container = d3.select("#sk-visualization-container");

        container.html('<div class="loader">Behandler data...</div>'); // Vis loader

        // Simuler litt lastetid om nødvendig, eller kjør direkte
        setTimeout(() => {
            const processedIssues = processIssueData(supportLevelType);
            const finalData = applyFiltersAndSort(processedIssues);

             container.html(''); // Fjern loader

            if (finalData.length === 0) {
                container.html('<p class="no-data">Ingen saker funnet for gjeldende filtre.</p>');
                updateLegend([]); // Tøm legende
                return;
            }

            // Oppdater legende basert på *alle* partier
            updateLegend(partiesData);


            if (viewType === 'bar-chart') {
                createHorizontalBarChart(finalData);
            } else if (viewType === 'dot-plot') {
                createDotPlot(finalData); // Implementer denne
            } else if (viewType === 'table') {
                createTable(finalData); // Implementer denne
            }
        }, 50); // Liten forsinkelse for å la loader vises
    }

    // --- Visualiseringsfunksjoner ---

    function createHorizontalBarChart(data) {
        const container = d3.select("#sk-visualization-container");
        container.html(''); // Tøm container

        const margin = { top: 20, right: 50, bottom: 40, left: 300 }; // Økt venstre margin
        const containerWidth = container.node().getBoundingClientRect().width;
        const height = data.length * 30 + margin.top + margin.bottom; // Dynamisk høyde + buffer
        const width = containerWidth - margin.left - margin.right;

        const svg = container.append("svg")
            .attr("width", containerWidth)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Skalaer
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, height - margin.top - margin.bottom])
            .padding(0.2);

        const xScale = d3.scaleLinear()
            .domain([0, 169]) // 0 til maks mandater
            .range([0, width]);

        // Akser
        const yAxis = d3.axisLeft(yScale).tickSizeOuter(0); // Fjern ytterste tick
        svg.append("g")
            .attr("class", "y-axis axis")
            .call(yAxis)
             // Fjern domene-linjen for y-aksen for et renere utseende
            .call(g => g.select(".domain").remove())
            // Wrap long labels (optional but recommended)
            .selectAll(".tick text")
            .call(wrapAxisText, margin.left - 10); // Funksjon for tekstbryting (se under)


        const xAxis = d3.axisBottom(xScale).ticks(10).tickSizeOuter(0);
        svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .call(xAxis)
            .call(g => g.select(".domain").remove()); // Fjern domene-linjen for x-aksen

        // Flertallslinje
        const majorityThreshold = 85;
        svg.append("line")
            .attr("class", "majority-line")
            .attr("x1", xScale(majorityThreshold))
            .attr("x2", xScale(majorityThreshold))
            .attr("y1", 0)
            .attr("y2", height - margin.top - margin.bottom);

        svg.append("text")
            .attr("class", "majority-label")
            .attr("x", xScale(majorityThreshold))
            .attr("y", -5) // Plasser litt over toppen
            .text(`Flertall (${majorityThreshold})`);

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip");

        // Søyler (grupper per sak)
        const barGroups = svg.selectAll(".bar-group")
            .data(data, d => d.id)
            .join("g")
            .attr("class", "bar-group")
            .attr("transform", d => `translate(0,${yScale(d.name)})`);

        // Segmenter inni hver søyle
        barGroups.selectAll(".bar-segment")
            .data(d => {
                // Legg til startposisjon for hvert segment
                let currentX = 0;
                return d.supportingPartiesData.map(p => {
                    const segment = { ...p, startX: currentX };
                    currentX += p.seats;
                    return segment;
                });
            })
            .join("rect")
            .attr("class", "bar-segment")
            .attr("y", 0)
            .attr("height", yScale.bandwidth())
            .attr("x", d => xScale(d.startX))
            .attr("width", d => xScale(d.seats) - xScale(0)) // Korrekt breddeberegning
            .attr("fill", d => d.color)
            .attr("fill-opacity", d => d.level === 1 ? 0.6 : 1.0) // Lavere opasitet for nivå 1
            .on("mouseover", function(event, d) {
                tooltip.classed("visible", true)
                       .html(`<b>${d.name}</b><br>Støtte: Nivå ${d.level}<br>Mandater: ${d.seats}`);
                d3.select(this).attr("stroke-width", 1.5).attr("stroke", "black");
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseout", function() {
                tooltip.classed("visible", false);
                 d3.select(this).attr("stroke-width", 0.5).attr("stroke", "white");
            });

            // Legg til totalt antall mandater på slutten av hver søyle
            barGroups.append("text")
                .attr("class", "total-mandate-label")
                .attr("x", d => xScale(d.totalMandates) + 5) // Litt til høyre for søylen
                .attr("y", yScale.bandwidth() / 2)
                .attr("dy", "0.35em") // Vertikal sentrering
                .attr("font-size", "0.8rem")
                .attr("fill", "#333")
                .text(d => d.totalMandates);
    }

    // Funksjon for å bryte lange aksetekster (fra D3 eksempel)
    function wrapAxisText(text, width) {
      text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy") || 0), // Bruk dy hvis satt, ellers 0
            tspan = text.text(null).append("tspan").attr("x", -10).attr("y", y).attr("dy", dy + "em"); // Start med første tspan
        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          // Sjekk node() for null før getComputedTextLength
          if (tspan.node() && tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", -10).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
          }
        }
      });
    }


    function createDotPlot(data) {
        const container = d3.select("#sk-visualization-container");
        container.html('<p style="padding: 20px; text-align: center;">(Prikkdiagram ikke implementert ennå - viser tabell i stedet)</p>');
        // Fallback til tabell eller en enklere visualisering
        createTable(data); // Vis tabell som fallback
    }

    function createTable(data) {
        const container = d3.select("#sk-visualization-container");
        container.html(''); // Tøm

        const tableContainer = container.append("div")
            .attr("class", "sk-table-container");

        const table = tableContainer.append("table")
            .attr("class", "sk-table");

        // Header
        table.append("thead").append("tr")
            .selectAll("th")
            .data(["Sak", "Saksområde", "Total Støtte", "Støttende Partier (Nivå)"])
            .join("th")
            .text(d => d);

        // Body
        const tbody = table.append("tbody");
        data.forEach(issue => {
            const row = tbody.append("tr");
            row.append("td").text(issue.name);
            row.append("td").text(issue.area);
            row.append("td").attr("class", "mandates-col").text(issue.totalMandates);

            // Partiliste med nivå
            const partiesCell = row.append("td").attr("class", "parties-col");
            if (issue.supportingPartiesData.length > 0) {
                 issue.supportingPartiesData.forEach(p => {
                    partiesCell.append("span")
                        .attr("class", `mini-party-tag level-${p.level} party-tag-${p.shorthand.toLowerCase()}`) // Bruk eksisterende fargeklasser
                        .style("background-color", `${p.color}20`) // Lys bakgrunn basert på farge
                        .style("border", `1px solid ${p.color}80`)
                        .style("color", `${p.color}`)
                        .text(`${p.shorthand} (${p.level})`);
                 });
            } else {
                partiesCell.append("span").style("font-style", "italic").text("Ingen");
            }
        });
    }

    function updateLegend(partyList) {
        const legendContainer = d3.select("#sk-legend-container");
        legendContainer.html(''); // Tøm

         // Sorter partier etter posisjon for konsistent rekkefølge
        const sortedParties = [...partyList].sort((a, b) => a.position - b.position);

        sortedParties.forEach(party => {
            const item = legendContainer.append("div")
                .attr("class", "legend-item"); // Bruker klasse fra styles.css

            item.append("div")
                .attr("class", "legend-color")
                .style("background-color", party.color);

            item.append("span")
                .text(`${party.name} (${party.seats})`);
        });
    }


}); // Slutt på DOMContentLoaded
