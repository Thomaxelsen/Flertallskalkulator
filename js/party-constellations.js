document.addEventListener('DOMContentLoaded', () => {
    // Globale variabler for å holde på dataene
    let parties = [];
    let issues = [];
    let selectedParties = new Set(); // Bruker Set for å unngå duplikater

    // Henter elementer fra HTML-siden
    const partySelector = document.getElementById('partySelector');
    const resultsOutput = document.getElementById('resultsOutput');
    const agreementRadios = document.querySelectorAll('input[name="agreement"]');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Funksjon for å hete data fra JSON-filer
    async function fetchData() {
        try {
            const partiesResponse = await fetch('data/parties.json');
            parties = await partiesResponse.json();

            const issuesResponse = await fetch('data/issues.json');
            issues = await issuesResponse.json();

            // Sorterer partiene basert på rekkefølgen definert i JSON
            parties.sort((a, b) => a.position - b.position);
            
            // Kaller den oppdaterte funksjonen for å lage partikort
            createPartyCards();
        } catch (error) {
            console.error('Klarte ikke å laste inn data:', error);
            resultsOutput.innerHTML = '<p>En feil oppstod under lasting av data.</p>';
        }
    }

    // Funksjon for å lage partikortene
    function createPartyCards() {
        parties.forEach(party => {
            const card = document.createElement('div');
            card.className = 'party-card';
            card.dataset.partyShorthand = party.shorthand;
            card.title = party.name;

            const img = document.createElement('img');
            img.src = `images/parties/${party.shorthand.toLowerCase()}.png`;
            img.alt = party.name;
            img.className = 'party-logo';

            const name = document.createElement('span');
            name.className = 'party-name';
            name.textContent = party.shorthand;

            card.appendChild(img);
            card.appendChild(name);
            partySelector.appendChild(card);

            card.addEventListener('click', () => {
                togglePartySelection(party.shorthand);
                card.classList.toggle('selected');
            });
        });
    }

    // Funksjon for å håndtere valg/fjerning av et parti
    function togglePartySelection(partyShorthand) {
        if (selectedParties.has(partyShorthand)) {
            selectedParties.delete(partyShorthand);
        } else {
            selectedParties.add(partyShorthand);
        }
        updateResults();
    }

    // Lytter til endringer
    agreementRadios.forEach(radio => radio.addEventListener('change', updateResults));
    
    selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.party-card').forEach(card => {
            selectedParties.add(card.dataset.partyShorthand);
            card.classList.add('selected');
        });
        updateResults();
    });

    clearAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.party-card').forEach(card => {
            card.classList.remove('selected');
        });
        selectedParties.clear();
        updateResults();
    });

    // Hovedfunksjonen som oppdaterer resultatvisningen
    function updateResults() {
        const minAgreementLevel = parseInt(document.querySelector('input[name="agreement"]:checked').value);
        if (selectedParties.size < 2) {
            resultsOutput.innerHTML = '<p class="placeholder-text">Velg minst to partier for å se hva de er enige om.</p>';
            return;
        }
        resultsOutput.innerHTML = '';
        const partyArray = Array.from(selectedParties);
        const combinations = getCombinations(partyArray);
        let resultsFound = false;
        combinations.forEach(combo => {
            const agreedIssues = findAgreedIssues(combo, minAgreementLevel);
            if (agreedIssues.length > 0) {
                resultsFound = true;
                displayCombinationResult(combo, agreedIssues);
            }
        });
        if (!resultsFound) {
            resultsOutput.innerHTML = '<p class="placeholder-text">Fant ingen saker som de valgte partiene er enige om med det gitte kriteriet.</p>';
        }
    }

    // Funksjon for å finne saker en gruppe partier er enige om
    function findAgreedIssues(partyCombo, minLevel) {
        return issues.filter(issue => {
            return partyCombo.every(partyShorthand => {
                const stance = issue.partyStances[partyShorthand];
                return stance && stance.level >= minLevel;
            });
        });
    }

    // Funksjon for å vise resultatet for én partikombinasjon (MODIFISERT)
    function displayCombinationResult(combo, issues) {
        const issuesByArea = issues.reduce((acc, issue) => {
            if (!acc[issue.area]) {
                acc[issue.area] = [];
            }
            acc[issue.area].push(issue);
            return acc;
        }, {});

        const sortedAreas = Object.keys(issuesByArea).sort();
        const resultDiv = document.createElement('div');
        resultDiv.className = 'constellation-result';
        const header = document.createElement('div');
        header.className = 'constellation-header';

        const seatCount = combo.reduce((total, shorthand) => {
            const partyInfo = parties.find(p => p.shorthand === shorthand);
            return partyInfo ? total + (partyInfo.seats || 0) : total;
        }, 0);

        // *** START PÅ ENDRING ***
        combo.forEach(shorthand => {
            const partyInfo = parties.find(p => p.shorthand === shorthand);
            if (!partyInfo) return;

            const tag = document.createElement('div');
            tag.className = 'party-tag';

            const logo = document.createElement('img');
            logo.src = `images/parties/${partyInfo.shorthand.toLowerCase()}.png`;
            logo.className = 'party-tag-logo';
            logo.alt = partyInfo.name;

            const name = document.createElement('span');
            name.textContent = partyInfo.name;

            tag.appendChild(logo);
            tag.appendChild(name);

            const color = partyInfo.color.startsWith('#') ? hexToRgba(partyInfo.color, 0.15) : 'rgba(200, 200, 200, 0.15)';
            tag.style.backgroundColor = color;
            tag.style.borderColor = partyInfo.color;

            header.appendChild(tag);
        });
        // *** SLUTT PÅ ENDRING ***

        const seatBadge = document.createElement('div');
        seatBadge.className = 'constellation-seat-badge';
        seatBadge.innerHTML = `<strong>${seatCount}</strong> representanter`;
        header.appendChild(seatBadge);

        const agreementText = document.createElement('span');
        agreementText.textContent = ` er enige om ${issues.length} sak${issues.length > 1 ? 'er' : ''}:`;
        header.appendChild(agreementText);
        resultDiv.appendChild(header);

        sortedAreas.forEach(area => {
            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'issue-category-group';
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'issue-category-header';
            categoryHeader.textContent = area;
            categoryGroup.appendChild(categoryHeader);
            const issueList = document.createElement('ul');
            issueList.className = 'issue-list';
            issuesByArea[area].sort((a, b) => a.name.localeCompare(b.name));
            issuesByArea[area].forEach(issue => {
                const listItem = document.createElement('li');
                const issueNameSpan = document.createElement('span');
                issueNameSpan.className = 'issue-name';
                issueNameSpan.textContent = issue.name;
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'issue-controls';
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'issue-party-buttons-container';
                combo.forEach(shorthand => {
                    const partyInfo = parties.find(p => p.shorthand === shorthand);
                    const quote = issue.partyStances[shorthand]?.quote || 'Sitat ikke tilgjengelig.';
                    if (!partyInfo) return;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'issue-party-button-wrapper';
                    wrapper.tabIndex = 0;
                    const button = document.createElement('span');
                    button.className = 'issue-party-button';
                    button.style.backgroundColor = partyInfo.color;
                    button.textContent = shorthand;
                    const tooltip = document.createElement('div');
                    tooltip.className = 'issue-quote-tooltip';
                    tooltip.textContent = quote;
                    wrapper.appendChild(button);
                    wrapper.appendChild(tooltip);
                    buttonsContainer.appendChild(wrapper);
                });
                controlsDiv.appendChild(buttonsContainer);
                listItem.appendChild(issueNameSpan);
                listItem.appendChild(controlsDiv);
                issueList.appendChild(listItem);
            });
            categoryGroup.appendChild(issueList);
            resultDiv.appendChild(categoryGroup);
        });
        
        resultsOutput.appendChild(resultDiv);
    }

    // Hjelpefunksjon for å konvertere HEX til RGBA
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Funksjon for å generere alle mulige kombinasjoner
    function getCombinations(arr) {
        const result = [];
        const n = arr.length;
        for (let size = n; size >= 2; size--) {
            const combosOfSize = [];
            function findCombos(start, currentCombo) {
                if (currentCombo.length === size) {
                    combosOfSize.push([...currentCombo]);
                    return;
                }
                for (let i = start; i < n; i++) {
                    currentCombo.push(arr[i]);
                    findCombos(i + 1, currentCombo);
                    currentCombo.pop();
                }
            }
            findCombos(0, []);
            result.push(...combosOfSize);
        }
        return result;
    }

    // Starter datainnhentingen
    fetchData();
});
