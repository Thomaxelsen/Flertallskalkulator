// js/sakskompass.js - v4 MED DETALJPANEL

document.addEventListener('DOMContentLoaded', function() {
    console.log("Sakskompass (v4 with Panel): DOM Loaded. Waiting for data...");

    const TOTAL_SEATS = 169;
    const MAJORITY_THRESHOLD = 85;

    // NYE DOM-elementer for panelet
    const detailPanel = document.getElementById('sk-detail-panel');
    const panelContent = document.getElementById('panel-content');
    const panelIssueName = document.getElementById('panel-issue-name');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const panelOverlay = document.getElementById('sk-panel-overlay');

    let issuesData = [], partiesData = [], partiesMap = {};
    let issuesLoaded = false, partiesLoaded = false;

    function initializeSakskompass() {
        if (!issuesLoaded || !partiesLoaded) return;
        console.log("Sakskompass: All data loaded. Initializing.");
        partiesData.forEach(p => partiesMap[p.shorthand] = p);
        populateAreaFilter();
        setupEventListeners();
        setupPanelEventListeners(); // NYTT KALL
        processAndVisualizeData();
    }

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
    initializeSakskompass();

    // --- Panel-funksjoner (NY SEKSJON) ---
    function setupPanelEventListeners() {
        if (closePanelBtn) closePanelBtn.addEventListener('click', hideIssueDetails);
        if (panelOverlay) panelOverlay.addEventListener('click', hideIssueDetails);
    }

    function showIssueDetails(issueDataFromChart) {
        if (!detailPanel || !panelContent || !panelIssueName) return;

        // Finn den komplette saken fra den globale datalisten
        const fullIssue = issuesData.find(i => i.id === issueDataFromChart.id);
        if (!fullIssue) {
            console.error("Fant ikke saksdetaljer for ID:", issueDataFromChart.id);
            panelContent.innerHTML = "<p>Kunne ikke laste saksdetaljer.</p>";
            return;
        }

        panelIssueName.textContent = fullIssue.name;

        // Grupper partiene etter standpunkt
        const stances = { level2: [], level1: [], level0: [] };
        partiesData.forEach(party => {
            const stance = fullIssue.partyStances ? (fullIssue.partyStances[party.shorthand] || { level: 0 }) : { level: 0 };
            const partyDataWithStance = { ...party, quote: stance.quote };

            if (stance.level === 2) stances.level2.push(partyDataWithStance);
            else if (stance.level === 1) stances.level1.push(partyDataWithStance);
            else stances.level0.push(partyDataWithStance);
        });

        // Bygg HTML for panelet
        let html = `<p class="issue-area">${fullIssue.area || 'Ukjent saksområde'}</p>`;
        html += createPartyListHTML(stances.level2, 'Full enighet', 'level-2');
        html += createPartyListHTML(stances.level1, 'Delvis enighet', 'level-1');
        html += createPartyListHTML(stances.level0, 'Ingen støtte / Uenig', 'level-0');
        
        panelContent.innerHTML = html;
        
        // Vis panelet
        detailPanel.classList.add('active');
        panelOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Forhindre scrolling av bakgrunnen
    }

    function createPartyListHTML(partiesArray, title, className) {
        if (partiesArray.length === 0) return '';
        
        // Sorter partier etter posisjon
        partiesArray.sort((a, b) => (a.position || 99) - (b.position || 99));

        let listItems = partiesArray.map(party => `
            <div class="stance-party-item">
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" alt="${party.name}" class="party-logo">
                <div class="party-details">
                    <div class="party-name">${party.name}</div>
                    ${party.quote 
                        ? `<div class="party-quote">«${party.quote}»</div>` 
                        : `<div class="party-quote no-quote">(Ingen utdypende begrunnelse)</div>`
                    }
                </div>
            </div>
        `).join('');

        return `
            <div class="stance-group ${className}">
                <h4>${title} (${partiesArray.length})</h4>
                ${listItems}
            </div>
        `;
    }

    function hideIssueDetails() {
        if (detailPanel && panelOverlay) {
            detailPanel.classList.remove('active');
            panelOverlay.classList.remove('active');
            document.body.style.overflow = ''; // Tillat scrolling igjen
        }
    }

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
        if (!Array.isArray(issuesData) || issuesData.length === 0 || Object.keys(partiesMap).length === 0) return [];
        return issuesData.map(issue => {
            let totalMandates = 0;
            const supportingPartiesData = [];
            if (issue.partyStances) {
                for (const partyCode in issue.partyStances) {
                    const stance = issue.partyStances[partyCode];
                    const partyInfo = partiesMap[partyCode];
                    if (partyInfo && stance && typeof stance.level !== 'undefined') {
                        const level = stance.level;
                        let includeParty = (supportLevelType === 'level-2' && level === 2) || (supportLevelType === 'level-1-2' && (level === 1 || level === 2));
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
        const visContainer = d3.select("#sk-visualization-container");
        if (!issuesLoaded || !partiesLoaded) {
            visContainer.html('<div class="loader">Laster data...</div>');
            return;
        }
        visContainer.html('<div class="loader">Behandler data...</div>');
        setTimeout(() => {
            const processedIssues = processIssueData(supportLevelType);
            const finalData = applyFiltersAndSort(processedIssues);
            visContainer.html('');
            if (!finalData || finalData.length === 0) {
                visContainer.html('<p class="no-data">Ingen saker funnet for gjeldende filtre.</p>');
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
        const container = d3.select("#sk-visualization-area");
        const visContainer = d3.select("#sk-visualization-container");
        visContainer.html('');
        
        const containerWidth = visContainer.node().getBoundingClientRect().width;
        
        let dynamicMarginLeft = (containerWidth < 500) ? 150 : (containerWidth < 768) ? 200 : 300;
        const margin = { top: 20, right: 40, bottom: 40, left: dynamicMarginLeft };
        const width = containerWidth - margin.left - margin.right;
        
        const svg = visContainer.append("svg").attr("width", containerWidth);
        
        const defs = svg.append("defs");
        const dropShadow = defs.append("filter").attr("id", "drop-shadow").attr("height", "130%");
        dropShadow.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 2);
        dropShadow.append("feOffset").attr("dx", 1).attr("dy", 1).attr("result", "offsetblur");
        dropShadow.append("feComponentTransfer").append("feFuncA").attr("type", "linear").attr("slope", 0.3);
        const feMerge = dropShadow.append("feMerge");
        feMerge.append("feMergeNode");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        
        let calculatedPositions = [], currentY = 0, itemPadding = 15, minItemHeight = 28;
        const tempG = g.append("g").style("opacity", 0);
        const tempYScale = d3.scaleBand().domain(data.map(d => d.name)).range([0, data.length * 40]);
        const tempYAxis = tempG.call(d3.axisLeft(tempYScale)).call(g => g.selectAll(".tick text").call(wrapAxisText, margin.left - 15));
        
        tempYAxis.selectAll(".tick").each(function(d, i) {
            const textHeight = Math.max(minItemHeight, this.getBBox().height);
            calculatedPositions[i] = { y: currentY, height: textHeight };
            currentY += textHeight + itemPadding;
        });
        tempG.remove();
        
        const height = currentY > 0 ? currentY - itemPadding : 0;
        svg.attr("height", height + margin.top + margin.bottom);
        
        const yScale = d3.scaleBand().domain(data.map(d => d.name)).range([0, height]).paddingOuter(0.1);
        const xScale = d3.scaleLinear().domain([0, TOTAL_SEATS]).range([0, width]);
        
        g.append("g").attr("class", "x-axis axis").attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).tickSize(-height).ticks(Math.max(5, Math.floor(width / 80))));

        const yAxis = g.append("g").attr("class", "y-axis axis")
            .call(d3.axisLeft(yScale).tickSize(0).tickPadding(10))
            .call(g => g.select(".domain").remove());
        yAxis.selectAll(".tick text").call(wrapAxisText, margin.left - 15);
        yAxis.selectAll(".tick").attr("transform", (d, i) => `translate(0, ${calculatedPositions[i].y + calculatedPositions[i].height / 2})`);
        
        g.append("line").attr("class", "majority-line").attr("x1", xScale(MAJORITY_THRESHOLD)).attr("x2", xScale(MAJORITY_THRESHOLD)).attr("y1", -5).attr("y2", height);
        g.append("text").attr("class", "majority-label").attr("x", xScale(MAJORITY_THRESHOLD)).attr("y", -8).text(`Flertall`);
        
        const tooltip = d3.select("body").select(".d3-tooltip").empty() ? d3.select("body").append("div").attr("class", "d3-tooltip") : d3.select("body").select(".d3-tooltip");
        
        const barGroups = g.selectAll(".bar-group").data(data, d => d.id).join("g")
            .attr("class", "bar-group")
            .attr("transform", (d, i) => `translate(0, ${calculatedPositions[i].y})`)
            .style("filter", "url(#drop-shadow)")
            .style("cursor", "pointer") // NYTT: Viser at raden er klikkbar
            .on("mouseover", (event, d) => {
                container.classed("is-interacting", true);
                barGroups.classed("highlighted", other_d => d === other_d);
                yAxis.selectAll(".tick").classed("highlighted", tick_d => d.name === tick_d);
            })
            .on("mouseout", () => {
                container.classed("is-interacting", false);
                barGroups.classed("highlighted", false);
                yAxis.selectAll(".tick").classed("highlighted", false);
            })
            .on("click", (event, d) => { // NYTT: Klikk-hendelse
                showIssueDetails(d);
            });
            
        barGroups.selectAll(".bar-segment").data(d => {
            let currentX = 0;
            return d.supportingPartiesData.map(p => ({ ...p, startX: currentX, issueName: d.name, seats: (currentX += p.seats) - p.seats }));
        }).join("rect")
            .attr("class", "bar-segment")
            .attr("y", 0)
            .attr("height", (d, i, nodes) => calculatedPositions[data.findIndex(issue => issue.name === d.issueName)].height)
            .attr("x", d => xScale(d.startX))
            .attr("rx", 3)
            .attr("width", 0)
            .attr("fill", d => d.color || "#cccccc")
            .attr("fill-opacity", d => d.level === 1 ? 0.7 : 1.0)
            .on("mouseover", (event, d) => {
                tooltip.classed("visible", true).html(`<b>${d.name}</b>Mandater: ${d.seats}<br>Støtte: Nivå ${d.level}`);
                event.stopPropagation(); // Hindrer at barGroup sin mouseover trigges
            })
            .on("mousemove", event => tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 10) + "px"))
            .on("mouseout", () => tooltip.classed("visible", false));

        barGroups.selectAll(".bar-segment")
            .transition().duration(800).delay((d, i) => i * 10)
            .attr("width", d => xScale(d.seats));
        
        barGroups.append("text")
            .attr("class", "total-mandate-label")
            .attr("x", d => xScale(d.totalMandates) + 5)
            .attr("y", (d, i) => calculatedPositions[i].height / 2)
            .attr("dy", "0.35em")
            .attr("fill", "#333")
            .attr("font-size", "0.8rem")
            .style("opacity", 0)
            .text(d => d.totalMandates)
            .transition().duration(800).delay(500).style("opacity", 1);
            
        yAxis.selectAll(".tick")
             .style("cursor", "pointer") // NYTT: Viser at teksten er klikkbar
             .on("mouseover", (event, d) => {
                container.classed("is-interacting", true);
                barGroups.classed("highlighted", bar_d => d === bar_d.name);
                yAxis.selectAll(".tick").classed("highlighted", tick_d => d === tick_d);
            })
            .on("mouseout", () => {
                container.classed("is-interacting", false);
                barGroups.classed("highlighted", false);
                yAxis.selectAll(".tick").classed("highlighted", false);
            })
            .on("click", (event, d_name) => { // NYTT: Klikk-hendelse for tekst
                const correspondingData = data.find(issue => issue.name === d_name);
                if (correspondingData) showIssueDetails(correspondingData);
            });
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
