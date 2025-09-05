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

    // Funksjon for å hente data fra JSON-filer
    async function fetchData() {
        try {
            // Riktig sti: relativt til HTML-filen i rotmappen
            const partiesResponse = await fetch('data/parties.json');
            parties = await partiesResponse.json();

            // Riktig sti: relativt til HTML-filen i rotmappen
            const issuesResponse = await fetch('data/issues.json');
            issues = await issuesResponse.json();

            // Sorterer partiene etter 'position' for konsistent rekkefølge
            parties.sort((a, b) => a.position - b.position);

            // Når data er lastet, bygg partivelgeren
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
            button.dataset.partyShorthand = party.shorthand; // Lagrer kortnavnet i data-attributt
            button.title = party.name; // Viser fullt navn ved hover

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
        // Oppdater resultatene hver gang et parti velges/fjernes
        updateResults();
    }

    // Lytter til endringer i enighetsnivå
    agreementRadios.forEach(radio => {
        radio.addEventListener('change', updateResults);
    });
    
    // Funksjonalitet for "Velg alle" og "Fjern alle"
    selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.party-button').forEach(btn => {
            selectedParties.add(btn.dataset.partyShorthand);
            btn.classList.add('selected');
        });
        updateResults();
    });

    clearAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.party-button').forEach(btn => {
            selectedParties.delete(btn.dataset.partyShorthand);
            btn.classList.remove('selected');
        });
        updateResults();
    });


    // Hovedfunksjonen som oppdaterer resultatvisningen
    function updateResults() {
        // Henter valgt enighetsnivå
        const minAgreementLevel = parseInt(document.querySelector('input[name="agreement"]:checked').value);
        
        // Sjekker om nok partier er valgt
        if (selectedParties.size < 2) {
            resultsOutput.innerHTML = '<p class="placeholder-text">Velg minst to partier for å se hva de er enige om.</p>';
            return;
        }

        // Tømmer forrige resultat
        resultsOutput.innerHTML = '';

        // Finner alle kombinasjoner (konstellasjoner) av de valgte partiene
        const partyArray = Array.from(selectedParties);
        const combinations = getCombinations(partyArray);

        let resultsFound = false;

        // Går gjennom hver kombinasjon og finner enigheter
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
            // Sjekker om *alle* partiene i kombinasjonen er enige
            return partyCombo.every(partyShorthand => {
                const stance = issue.partyStances[partyShorthand];
                return stance && stance.level >= minLevel;
            });
        });
    }

    // Funksjon for å vise resultatet for én partikombinasjon
    function displayCombinationResult(combo, issues) {
        // *** NY LINJE FOR FORBEDRING ***
        // Sorterer sakene alfabetisk basert på saksområde ('area')
        issues.sort((a, b) => a.area.localeCompare(b.area));

        const resultDiv = document.createElement('div');
        resultDiv.className = 'constellation-result';

        // Lager overskriften med partinavn
        const header = document.createElement('div');
        header.className = 'constellation-header';
        
        combo.forEach(shorthand => {
            const partyInfo = parties.find(p => p.shorthand === shorthand);
            const tag = document.createElement('span');
            tag.className = 'party-tag';
            tag.textContent = partyInfo.name;
            tag.style.backgroundColor = partyInfo.color;
            header.appendChild(tag);
        });

        const agreementText = document.createElement('span');
        agreementText.textContent = ` er enige om ${issues.length} sak${issues.length > 1 ? 'er' : ''}:`;
        header.appendChild(agreementText);

        // Lager listen over saker
        const issueList = document.createElement('ul');
        issueList.className = 'issue-list';
        issues.forEach(issue => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${issue.name}</span>
                <span class="issue-area">${issue.area}</span>
            `;
            issueList.appendChild(listItem);
        });

        resultDiv.appendChild(header);
        resultDiv.appendChild(issueList);
        resultsOutput.appendChild(resultDiv);
    }

    // Funksjon for å generere alle mulige kombinasjoner av partier (fra 2 og oppover)
    function getCombinations(arr) {
        const result = [];
        const n = arr.length;
        // Går gjennom alle mulige størrelser på kombinasjoner (fra n ned til 2)
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

    // Starter datainnhentingen når siden er lastet
    fetchData();
});
