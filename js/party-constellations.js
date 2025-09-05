document.addEventListener('DOMContentLoaded', () => {

    // --- Globale variabler og DOM-elementer ---
    const partySelectorGrid = document.getElementById('partySelectorGrid');
    const resultsContainer = document.getElementById('resultsContainer');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const agreementLevelSelector = document.getElementById('agreementLevelSelector');

    let parties = [];
    let issues = window.issues || [];
    let selectedPartyShorthands = [];

    // --- Initialisering ---
    function initializeApp() {
        if (issues.length === 0) {
            console.error("Saksdata (issues) er ikke lastet. Sjekk at 'js/issues.js' er inkludert og fungerer.");
            resultsContainer.innerHTML = '<p class="error-message">Kunne ikke laste saksdata. Siden kan ikke vises.</p>';
            return;
        }

        // Henter partidata fra en JSON-fil.
        fetch('data/parties.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Nettverksfeil: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // SJEKK: Sørger for at vi faktisk fikk data og at det er en liste (array).
                if (!data || !Array.isArray(data) || data.length === 0) {
                    throw new Error('Partidata er tomt eller i feil format.');
                }
                parties = data;
                // Når data er hentet, bygger vi opp siden.
                createPartySelectorButtons();
                setupEventListeners();
            })
            .catch(error => {
                // BEDRE FEILHÅNDTERING: Viser feilmeldingen direkte på siden.
                console.error('Feil under lasting av partidata:', error);
                partySelectorGrid.innerHTML = `<p class="error-message"><strong>En feil oppstod:</strong> Kunne ikke laste partiene. (${error.message})</p>`;
            });
    }

    // --- UI (Brukergrensesnitt) ---
    function createPartySelectorButtons() {
        // Tømmer gridden først for sikkerhets skyld.
        partySelectorGrid.innerHTML = '';
        parties.forEach(party => {
            const button = document.createElement('button');
            button.className = `party-selector-btn party-tag-${party.classPrefix}`;
            button.textContent = party.shorthand;
            button.dataset.shorthand = party.shorthand;
            button.addEventListener('click', () => togglePartySelection(button));
            partySelectorGrid.appendChild(button);
        });
    }

    function displayResults(combinations) {
        resultsContainer.innerHTML = '';
        if (selectedPartyShorthands.length < 2) {
            resultsContainer.innerHTML = '<p class="results-placeholder">Velg minst to partier for å se hvilke saker de er enige om.</p>';
            return;
        }

        let foundResults = false;
        combinations.forEach(({ combination, agreedIssues }) => {
            if (agreedIssues.length > 0) {
                foundResults = true;
                const resultCard = document.createElement('div');
                resultCard.className = 'result-card';
                const title = document.createElement('h3');
                const partyTags = combination.map(shorthand => {
                    const partyInfo = parties.find(p => p.shorthand === shorthand);
                    if (!partyInfo) return '';
                    return `<span class="party-tag-small party-tag-${partyInfo.classPrefix}">${shorthand}</span>`;
                }).join(' + ');
                title.innerHTML = `Saker ${partyTags} er enige om (${agreedIssues.length}):`;
                resultCard.appendChild(title);
                const list = document.createElement('ul');
                agreedIssues.forEach(issue => {
                    const listItem = document.createElement('li');
                    listItem.textContent = issue.title;
                    list.appendChild(listItem);
                });
                resultCard.appendChild(list);
                resultsContainer.appendChild(resultCard);
            }
        });

        if (!foundResults) {
            resultsContainer.innerHTML = '<p class="results-placeholder">De valgte partiene har ingen felles standpunkter på det valgte enighetsnivået.</p>';
        }
    }

    // --- Logikk ---
    function handleUpdate() {
        if (selectedPartyShorthands.length < 2) {
            displayResults([]);
            return;
        }
        const agreementLevel = parseInt(document.querySelector('input[name="agreement"]:checked').value);
        const partyCombinations = getCombinations(selectedPartyShorthands);
        const results = [];
        partyCombinations.forEach(combination => {
            const agreedIssues = findAgreedIssues(combination, agreementLevel);
            results.push({ combination, agreedIssues });
        });
        displayResults(results);
    }

    function findAgreedIssues(partyCombination, level) {
        const agreedIssues = [];
        issues.forEach(issue => {
            let allAgree = true;
            for (const partyShorthand of partyCombination) {
                const standpoint = issue.standpoints[partyShorthand];
                if (standpoint === undefined || standpoint < level) {
                    allAgree = false;
                    break;
                }
            }
            if (allAgree) {
                agreedIssues.push(issue);
            }
        });
        return agreedIssues;
    }

    function getCombinations(parties) {
        const result = [];
        for (let i = 0; i < (1 << parties.length); i++) {
            const subset = [];
            for (let j = 0; j < parties.length; j++) {
                if ((i & (1 << j)) > 0) {
                    subset.push(parties[j]);
                }
            }
            if (subset.length >= 2) {
                result.push(subset);
            }
        }
        return result.sort((a, b) => b.length - a.length);
    }

    // --- Event Handlers ---
    function togglePartySelection(button) {
        const shorthand = button.dataset.shorthand;
        button.classList.toggle('selected');
        if (selectedPartyShorthands.includes(shorthand)) {
            selectedPartyShorthands = selectedPartyShorthands.filter(p => p !== shorthand);
        } else {
            selectedPartyShorthands.push(shorthand);
        }
        handleUpdate();
    }

    function setupEventListeners() {
        clearSelectionBtn.addEventListener('click', () => {
            selectedPartyShorthands = [];
            document.querySelectorAll('.party-selector-btn.selected').forEach(btn => {
                btn.classList.remove('selected');
            });
            handleUpdate();
        });
        agreementLevelSelector.addEventListener('change', handleUpdate);
    }

    // --- Kjør applikasjonen ---
    initializeApp();
});
