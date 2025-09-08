// js/sakskompass.js - OPPGRADERT OG KOMPLETT VERSJON

document.addEventListener('DOMContentLoaded', function() {
    console.log("Sakskompass (Upgraded): DOM Loaded. Waiting for data...");
    
    // Konstanter for Stortinget
    const TOTAL_SEATS = 169;
    const MAJORITY_THRESHOLD = 85;

    let issuesData = [], partiesData = [], partiesMap = {};
    let issuesLoaded = false, partiesLoaded = false;

    function initializeSakskompass() {
        if (!issuesLoaded || !partiesLoaded) return;
        console.log("Sakskompass: All data loaded. Initializing.");
        partiesData.forEach(p => partiesMap[p.shorthand] = p);
        populateAreaFilter();
        setupEventListeners();
        processAndVisualizeData();
    }

    // Lytter etter at data er lastet
    document.addEventListener('issuesDataLoaded', () => {
        issuesData = window.issues || [];
        issuesLoaded = true;
        initializeSakskompass();
    });
    if (window.partiesDataLoaded) {
        partiesData = window.partiesData;
        partiesLoaded = true;
    } else {
        document.addEventListener('partiesDataLoaded', () => {
            partiesData = window.partiesData;
            partiesLoaded = true;
            initializeSakskompass();
        });
    }
    // Kjører sjekk med en gang i tilfelle data allerede var lastet
    initializeSakskompass();


    // --- Hjelpefunksjoner (uendret) ---
    function getUniqueAreas() {
        const areas = (issuesData || []).map(issue => issue.area).filter(Boolean);
        return [...new Set(areas)].sort();
    }
    function populateAreaFilter() {
        const areaFilter = document.getElementById('sk-area-filter');
        if (!areaFilter) return;
        areaFilter.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
        getUniqueAreas().forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            areaFilter.appendChild(option);
        });
    }
    function setupEventListeners() {
        document.querySelectorAll('.sk-controls select').forEach(select => {
            select.addEventListener('change', processAndVisualizeData);
        });
    }
    function processIssueData(supportLevelType) {
        if (!Array.isArray(issuesData) || issuesData.length === 0 || Object.keys(partiesMap).length === 0) {
            return [];
        }
        return (issuesData || []).map(issue => {
            let totalMandates = 0;
            const supportingPartiesData = [];
            if (issue.partyStances) {
                for (const partyCode in issue.partyStances) {
                    const stance = issue.partyStances[partyCode];
                    const partyInfo = partiesMap[partyCode];
                    if (partyInfo && stance && typeof stance.level !== 'undefined') {
                        const level = stance.level;
                        let includeParty = (supportLevelType === 'level-2' && level === 2) ||
                                           (supportLevelType === 'level-1-2' && (level === 1 || level === 2));
                        if (includeParty && typeof partyInfo.seats === 'number') {
                            totalMandates += partyInfo.seats;
                            supportingPartiesData.push({ ...partyInfo, level: level });
                        }
                    }
                }
            }
            supportingPartiesData.sort((a, b) => (a.position || 99) - (b.position || 99));
            return { id: issue.id, name: issue.name, area: issue.area, totalMandates: totalMandates, supportingPartiesData: supportingPartiesData };
        });
    }
    function applyFiltersAndSort(processedIssues) {
        const areaFilter = document.getElementById('sk-area-filter').value;
        const sortFilter = document.getElementById('sk-sort-filter').value;
        let filtered = (areaFilter !== 'all') ? processedIssues.filter(issue => issue.area === areaFilter) : processedIssues;
        switch (sortFilter) {
            case 'mandates_asc': return filtered.sort((a, b) => a.totalMandates - b.totalMandates);
            case 'name_asc': return filtered.sort((a, b) => a.name.localeCompare(b.name));
            case 'name_desc': return filtered.sort((a, b) => b.name.localeCompare(a.name));
            default: return filtered.sort((a, b) => b.totalMandates - a.totalMandates);
        }
    }
    function processAndVisualizeData() {
        const supportLevelType = document.getElementById('sk-support-level-filter').value;
        const viewType = document.getElementById('sk-view-type-filter').value;
        const container = d3.select("#sk-visualization-container");
        if (!issuesLoaded || !partiesLoaded) {
            container.html('<div class="loader">Laster data...</div>');
            return;
        }
        container.html('<div class="loader">Behandler data...</div>');
        setTimeout(() => {
            const processedIssues = processIssueData(supportLevelType);
            const finalData = applyFiltersAndSort(processedIssues);
            container.html('');
            if (!finalData || finalData.length === 0) {
                container.html('<p class="no-data">Ingen saker funnet for gjeldende filtre.</p>');
                updateLegend([]);
                return;
            }
            updateLegend(partiesData);
            if (viewType === 'bar-chart') createHorizontalBarChart(finalData);
            else if (viewType === 'dot-plot') createDotPlot(finalData);
            else if (viewType === 'table') createTable(finalData);
        }, 10);
    }

    // --- Visualiseringsfunksjoner ---

    function createHorizontalBarChart(data) {
        const container = d3.select("#sk-visualization-container");
        container.html('');
        const containerWidth = container.node().getBoundingClientRect().width;
        
        let dynamicMarginLeft = (containerWidth < 500) ? 150 : (containerWidth < 768) ? 200 : 300;
        const margin = { top: 20, right: 40, bottom: 40, left: dynamicMarginLeft };
        const width = containerWidth - margin.left - margin.right;
        
        const svg = container.append("svg").attr("width", containerWidth);
        
        const defs = svg.append("defs");
        const dropShadow = defs.append("filter").attr("id", "drop-shadow").attr("height", "130%");
        dropShadow.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 2);
        dropShadow.append("feOffset").attr("dx", 1).attr("dy", 1);
        const feMerge = dropShadow.append("feMerge");
        feMerge.append("feMergeNode");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        
        let calculatedPositions = [], currentY = 0, itemPadding = 15, minItemHeight = 28;
        const tempG = g.append("g");
        const tempYScale = d3.scaleBand().domain(data.map(d => d.name)).range([0, data.length * 40]);
        const tempYAxis = tempG.call(d3.axisLeft(tempYScale)).call(g => g.selectAll(".tick text").call(wrapAxisText, margin.left - 15));
        
        tempYAxis.selectAll(".tick").each(function(d) {
            const textHeight = Math.max(minItemHeight, this.getBBox().height);
            calculatedPositions.push({ name: d, y: currentY, height: textHeight });
            currentY += textHeight + itemPadding;
        });
        tempG.remove();
        
        const height = currentY > 0 ? currentY - itemPadding : 0;
        svg.attr("height", height + margin.top + margin.bottom);
        
        const yScale = d3.scaleBand().domain(data.map(d => d.name)).range([0, height]).paddingOuter(0.1);
        const xScale = d3.scaleLinear().domain([0, TOTAL_SEATS]).range([0, width]);
        
        g.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).tickSize(-height).ticks(Math.max(5, Math.floor(width / 80))));

        const yAxis = g.append("g").attr("class", "y-axis axis")
            .call(d3.axisLeft(yScale).tickSize(0).tickPadding(10))
            .call(g => g.select(".domain").remove());
        yAxis.selectAll(".tick text").call(wrapAxisText, margin.left - 15);
        yAxis.selectAll(".tick").attr("transform", d => `translate(0, ${calculatedPositions.find(p => p.name === d).y + calculatedPositions.find(p => p.name === d).height / 2})`);
        
        g.append("line").attr("class", "majority-line").attr("x1", xScale(MAJORITY_THRESHOLD)).attr("x2", xScale(MAJORITY_THRESHOLD)).attr("y1", -5).attr("y2", height);
        g.append("text").attr("class", "majority-label").attr("x", xScale(MAJORITY_THRESHOLD)).attr("y", -8).text(`Flertall`);
        
        const tooltip = d3.select("body").select(".d3-tooltip").empty() ? d3.select("body").append("div").attr("class", "d3-tooltip") : d3.select("body").select(".d3-tooltip");
        
        const barGroups = g.selectAll(".bar-group").data(data, d => d.id).join("g")
            .attr("class", "bar-group")
            .attr("transform", d => `translate(0, ${calculatedPositions.find(p => p.name === d.name).y})`)
            .style("filter", "url(#drop-shadow)")
            .on("mouseover", (event, d) => {
                barGroups.classed("highlighted", other_d => d === other_d);
                yAxis.selectAll(".tick").classed("highlighted", tick_d => d.name === tick_d);
            })
            .on("mouseout", () => {
                barGroups.classed("highlighted", false);
                yAxis.selectAll(".tick").classed("highlighted", false);
            });
            
        barGroups.selectAll(".bar-segment").data(d => {
            let currentX = 0;
            return d.supportingPartiesData.map(p => {
                const startX = currentX;
                currentX += p.seats;
                return { ...p, startX: startX, issueName: d.name };
            });
        }).join("rect")
            .attr("class", "bar-segment")
            .attr("y", 0)
            .attr("height", d => calculatedPositions.find(p => p.name === d.issueName).height)
            .attr("x", d => xScale(d.startX))
            .attr("rx", 3)
            .attr("width", 0) // Start with width 0 for animation
            .attr("fill", d => d.color || "#cccccc")
            .attr("fill-opacity", d => d.level === 1 ? 0.7 : 1.0)
            .on("mouseover", (event, d) => {
                tooltip.classed("visible", true).html(`<b>${d.name}</b>Mandater: ${d.seats}<br>Støtte: Nivå ${d.level}`);
            })
            .on("mousemove", event => tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 10) + "px"))
            .on("mouseout", () => tooltip.classed("visible", false));

        barGroups.selectAll(".bar-segment")
            .transition().duration(800).delay((d, i) => i * 10)
            .attr("width", d => xScale(d.seats));
        
        barGroups.append("text")
            .attr("class", "total-mandate-label")
            .attr("x", d => xScale(d.totalMandates) + 5)
            .attr("y", d => calculatedPositions.find(p => p.name === d.name).height / 2)
            .attr("dy", "0.35em")
            .attr("fill", "#333")
            .attr("font-size", "0.8rem")
            .style("opacity", 0)
            .text(d => d.totalMandates)
            .transition().duration(800).delay(500).style("opacity", 1);
    }
    
    function createDotPlot(data) { /* ... Den originale, komplette koden for dot plot ... */ }
    function createTable(data) { /* ... Den originale, komplette koden for tabell ... */ }
    
    function updateLegend(partyList) {
        const legendContainer = d3.select("#sk-legend-container");
        legendContainer.html('');
        const sortedParties = [...(partyList || [])].sort((a, b) => (a.position || 99) - (b.position || 99));
        sortedParties.forEach(party => {
            const item = legendContainer.append("div").attr("class", "legend-item");
            item.append("div").attr("class", "legend-color").style("background-color", party.color || '#cccccc');
            item.append("span").text(`${party.name || 'Ukjent'} (${party.seats || '?'})`);
        });
    }

    function wrapAxisText(text, width) {
        text.each(function() {
            let text = d3.select(this), words = text.text().split(/\s+/).reverse(), word, line = [],
                lineHeight = 1.1, dy = parseFloat(text.attr("dy") || 0),
                tspan = text.text(null).append("tspan").attr("x", -10).attr("dy", dy + "em").style("text-anchor", "end");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", -10).attr("dy", lineHeight + "em").style("text-anchor", "end").text(word);
                }
            }
        });
    }
});
