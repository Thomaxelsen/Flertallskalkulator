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

            parties.sort((a, b) => a.position - b.position);
            createPartyButtons();
        } catch (error) {
            console.error('Klarte ikke å laste inn data:', error);
            resultsOutput.innerHTML = '<p>En feil oppstod under lasting av data.</p>';
        }
    }

    // Funksjon for å lage partiknappene
    function createPartyButtons() {
        parties.forEach(party => {
            const button = document.createElement('button');
            button.className = `party-button ${party.classPrefix}`;
            button.textContent = party.shorthand;
            button.dataset.partyShorthand = party.shorthand;
            button.title = party.name;

            button.addEventListener('click', () => {
                togglePartySelection(party.shorthand);
                button.classList.toggle('selected');
            });
            partySelector.appendChild(button);
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
        document.querySelectorAll('.party-button').forEach(btn => {
            selectedParties.add(btn.dataset.partyShorthand);
            btn.classList.add('selected');
        });
        updateResults();
    });
    clearAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.party-button').forEach(btn => {
            btn.classList.remove('selected');
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

    // Funksjon for å vise resultatet for én partikombinasjon
    function displayCombinationResult(combo, issues) {
        issues.sort((a, b) => a.area.localeCompare(b.area));

        const resultDiv = document.createElement('div');
        resultDiv.className = 'constellation-result';

        const header = document.createElement('div');
        header.className = 'constellation-header';
        combo.forEach(shorthand => {
            const partyInfo = parties.find(p => p.shorthand === shorthand);
            if (!partyInfo) return;
            const tag = document.createElement('span');
            tag.className = 'party-tag';
            tag.textContent = partyInfo.name;
            tag.style.backgroundColor = partyInfo.color;
            header.appendChild(tag);
        });
        const agreementText = document.createElement('span');
        agreementText.textContent = ` er enige om ${issues.length} sak${issues.length > 1 ? 'er' : ''}:`;
        header.appendChild(agreementText);

        const issueList = document.createElement('ul');
        issueList.className = 'issue-list';

        issues.forEach(issue => {
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
                wrapper.tabIndex = 0; // Gjør den "fokus-bar" for mobil-klikk

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

            const issueAreaSpan = document.createElement('span');
            issueAreaSpan.className = 'issue-area';
            issueAreaSpan.textContent = issue.area;

            controlsDiv.appendChild(buttonsContainer);
            controlsDiv.appendChild(issueAreaSpan);

            listItem.appendChild(issueNameSpan);
            listItem.appendChild(controlsDiv);

            issueList.appendChild(listItem);
        });

        resultDiv.appendChild(header);
        resultDiv.appendChild(issueList);
        resultsOutput.appendChild(resultDiv);
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

    fetchData();
});
