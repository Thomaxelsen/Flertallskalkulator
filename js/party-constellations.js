document.addEventListener('DOMContentLoaded', () => {
    // Henter inn data fra de globale variablene (definert i .js-filene lastet i HTML)
    const parties = window.partiesData;
    const issues = window.issuesData;

    // Finner HTML-elementene vi trenger å jobbe med
    const partyButtonsContainer = document.getElementById('party-buttons');
    const agreementButtons = document.querySelectorAll('#agreement-buttons .button');
    const resultContainer = document.getElementById('constellations-result');

    // Holder styr på hvilke partier og hvilket enighetsnivå som er valgt
    let selectedParties = [];
    let selectedAgreementLevel = '1_2'; // Standard nivå

    // Funksjon for å lage knappene for hvert parti
    function createPartyButtons() {
        parties.forEach(party => {
            const button = document.createElement('button');
            button.className = 'button';
            button.dataset.partyId = party.id;
            button.textContent = party.name;
            button.addEventListener('click', () => togglePartySelection(party.id, button));
            partyButtonsContainer.appendChild(button);
        });
    }

    // Funksjon for å håndtere valg/fjerning av partier
    function togglePartySelection(partyId, button) {
        button.classList.toggle('active'); // Viser visuelt at knappen er aktiv

        if (selectedParties.includes(partyId)) {
            // Hvis partiet allerede er valgt, fjern det
            selectedParties = selectedParties.filter(id => id !== partyId);
        } else {
            // Hvis ikke, legg det til
            selectedParties.push(partyId);
        }

        // Sjekk om nok partier er valgt for å aktivere enighetsnivå-knappene
        updateAgreementButtonsState();
        // Oppdater resultatvisningen
        renderConstellations();
    }

    // Funksjon for å aktivere/deaktivere enighetsnivå-knappene
    function updateAgreementButtonsState() {
        if (selectedParties.length >= 2) {
            agreementButtons.forEach(button => button.disabled = false);
        } else {
            agreementButtons.forEach(button => button.disabled = true);
        }
    }

    // Legger til lyttere på enighetsnivå-knappene
    agreementButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Fjerner 'active' klassen fra alle knapper
            agreementButtons.forEach(btn => btn.classList.remove('active'));
            // Legger til 'active' på den klikkede knappen
            button.classList.add('active');
            selectedAgreementLevel = button.dataset.level;
            renderConstellations();
        });
    });

    // Hovedfunksjon for å finne og vise konstellasjonene
    function renderConstellations() {
        resultContainer.innerHTML = ''; // Tømmer resultatfeltet

        if (selectedParties.length < 2) {
            resultContainer.innerHTML = '<p>Velg minst to partier for å se enigheter.</p>';
            return;
        }

        // Finner alle mulige kombinasjoner (konstellasjoner) av de valgte partiene
        const combinations = getCombinations(selectedParties, 2);

        // Går gjennom hver kombinasjon og viser enige saker
        combinations.forEach(combo => {
            const agreedIssues = findAgreedIssues(combo);
            displayConstellation(combo, agreedIssues);
        });
    }

    // Funksjon for å finne enige saker for en gitt partikombinasjon
    function findAgreedIssues(partyIds) {
        const agreedIssues = [];

        issues.forEach(issue => {
            const firstPartyStance = issue.stances[partyIds[0]];
            if (!firstPartyStance) return; // Hopper over hvis partiet ikke har en mening

            const isAgreed = partyIds.every(partyId => {
                const stance = issue.stances[partyId];
                if (!stance) return false;

                // Sjekker enighetsnivået
                if (selectedAgreementLevel === '2') {
                    // Streng enighet: Kun nivå 2 teller
                    return stance.level === 2 && firstPartyStance.level === 2 && stance.agreement === firstPartyStance.agreement;
                } else {
                    // Myk enighet: Nivå 1 og 2 teller
                    return stance.agreement === firstPartyStance.agreement;
                }
            });

            if (isAgreed) {
                agreedIssues.push(issue);
            }
        });

        return agreedIssues;
    }

    // Funksjon for å vise resultatet for en konstellasjon på siden
    function displayConstellation(partyIds, issues) {
        const partyNames = partyIds.map(id => parties.find(p => p.id === id).name).join(' og ');
        
        const constellationDiv = document.createElement('div');
        constellationDiv.className = 'constellation';

        let content = `<h3>Enighet mellom ${partyNames}</h3>`;

        if (issues.length > 0) {
            content += '<ul class="issue-list">';
            issues.forEach(issue => {
                content += `
                    <li class="issue-item">
                        <span class="issue-title">${issue.title}</span>
                        <span class="issue-category">${issue.category}</span>
                    </li>
                `;
            });
            content += '</ul>';
        } else {
            content += `<p>Ingen felles enighet funnet for disse partiene på det valgte nivået.</p>`;
        }

        constellationDiv.innerHTML = content;
        resultContainer.appendChild(constellationDiv);
    }

    // Hjelpefunksjon for å generere alle mulige kombinasjoner av partier
    function getCombinations(array, minSize) {
        const result = [];
        for (let i = minSize; i <= array.length; i++) {
            const combinations = k_combinations(array, i);
            result.push(...combinations);
        }
        return result.sort((a, b) => b.length - a.length); // Sorterer slik at de største gruppene vises først
    }

    // Rekursiv hjelpefunksjon for å finne k-kombinasjoner
    function k_combinations(set, k) {
        if (k > set.length || k <= 0) {
            return [];
        }
        if (k === set.length) {
            return [set];
        }
        if (k === 1) {
            return set.map(item => [item]);
        }
        const combs = [];
        for (let i = 0; i < set.length - k + 1; i++) {
            const head = set.slice(i, i + 1);
            const tailcombs = k_combinations(set.slice(i + 1), k - 1);
            for (let j = 0; j < tailcombs.length; j++) {
                combs.push(head.concat(tailcombs[j]));
            }
        }
        return combs;
    }


    // Initialiserer siden
    createPartyButtons();
    // Setter en standard aktiv knapp for enighetsnivå
    document.querySelector('#agreement-buttons .button[data-level="1_2"]').classList.add('active');

});
