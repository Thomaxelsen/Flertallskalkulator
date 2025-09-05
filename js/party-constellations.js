// venter på at alt innholdet på siden er lastet inn før vi kjører koden.
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Globale variabler og DOM-elementer ---

    // henter referanser til de viktigste HTML-elementene vi trenger å jobbe med.
    const partySelectorGrid = document.getElementById('partySelectorGrid');
    const resultsContainer = document.getElementById('resultsContainer');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const agreementLevelSelector = document.getElementById('agreementLevelSelector');

    // variabler for å holde på dataene vi henter inn.
    let parties = []; // vil inneholde informasjon om alle partiene.
    let issues = window.issues || []; // henter saksdata som allerede er lastet av issues.js.

    // variabel for å holde styr på hvilke partier brukeren har valgt.
    let selectedPartyShorthands = [];

    
    // --- Initialisering ---

    // funksjon for å starte applikasjonen.
    function initializeApp() {
        // sjekker om saksdata er tilgjengelig.
        if (issues.length === 0) {
            console.error("Saksdata (issues) er ikke lastet. Sjekk at 'js/issues.js' er inkludert og fungerer.");
            resultsContainer.innerHTML = '<p class="error-message">Kunne ikke laste saksdata. Siden kan ikke vises.</p>';
            return;
        }
        
        // henter partidata fra en JSON-fil.
        fetch('data/parties.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Nettverksfeil ved lasting av partidata.');
                }
                return response.json();
            })
            .then(data => {
                parties = data; // lagrer partidataene.
                
                // når data er hentet, bygger vi opp siden.
                createPartySelectorButtons();
                setupEventListeners();
            })
            .catch(error => {
                console.error('Feil under lasting av partidata:', error);
                partySelectorGrid.innerHTML = '<p class="error-message">Kunne ikke laste partiene.</p>';
            });
    }


    // --- UI (Brukergrensesnitt) ---

    // funksjon for å lage knappene for hvert parti.
    function createPartySelectorButtons() {
        parties.forEach(party => {
            const button = document.createElement('button');
            button.className = `party-selector-btn party-tag-${party.classPrefix}`;
            button.textContent = party.shorthand;
            button.dataset.shorthand = party.shorthand; // lagrer kortnavnet i knappen for senere bruk.
            
            // legger til en lytter som reagerer når knappen klikkes.
            button.addEventListener('click', () => togglePartySelection(button));
            
            partySelectorGrid.appendChild(button);
        });
    }

    // funksjon for å vise resultatene på siden.
    function displayResults(combinations) {
        // tømmer resultat-containeren for gammelt innhold.
        resultsContainer.innerHTML = '';

        if (combinations.length === 0) {
            resultsContainer.innerHTML = '<p class="results-placeholder">Velg minst to partier for å se hvilke saker de er enige om.</p>';
            return;
        }
        
        let foundResults = false;
        
        // går gjennom hver kombinasjon av partier.
        combinations.forEach(({ combination, agreedIssues }) => {
            if (agreedIssues.length > 0) {
                foundResults = true;
                const resultCard = document.createElement('div');
                resultCard.className = 'result-card';

                // lager overskriften med partinavnene.
                const title = document.createElement('h3');
                const partyTags = combination.map(shorthand => {
                    const partyInfo = parties.find(p => p.shorthand === shorthand);
                    return `<span class="party-tag-small party-tag-${partyInfo.classPrefix}">${shorthand}</span>`;
                }).join(' + ');
                
                title.innerHTML = `Saker ${partyTags} er enige om (${agreedIssues.length}):`;
                resultCard.appendChild(title);

                // lager en liste over sakene de er enige om.
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
        
        // hvis ingen kombinasjoner hadde noen felles saker, vis en melding.
        if (!foundResults && selectedPartyShorthands.length >= 2) {
             resultsContainer.innerHTML = '<p class="results-placeholder">De valgte partiene har ingen felles standpunkter på det valgte enighetsnivået.</p>';
        }
    }


    // --- Logikk ---

    // funksjon som kjøres hver gang brukeren endrer noe (velger parti, endrer nivå).
    function handleUpdate() {
        if (selectedPartyShorthands.length < 2) {
            displayResults([]); // vis startmeldingen hvis færre enn 2 partier er valgt.
            return;
        }

        // henter valgt enighetsnivå fra radio-knappene.
        const agreementLevel = parseInt(document.querySelector('input[name="agreement"]:checked').value);
        
        // finner alle mulige kombinasjoner av de valgte partiene.
        const partyCombinations = getCombinations(selectedPartyShorthands);

        const results = [];
        
        // for hver kombinasjon, finn ut hvilke saker de er enige om.
        partyCombinations.forEach(combination => {
            const agreedIssues = findAgreedIssues(combination, agreementLevel);
            results.push({ combination, agreedIssues });
        });
        
        // vis resultatene på siden.
        displayResults(results);
    }
    
    // funksjon for å finne felles saker for en gitt kombinasjon av partier.
    function findAgreedIssues(partyCombination, level) {
        const agreedIssues = [];
        
        issues.forEach(issue => {
            let allAgree = true; // anta at alle er enige inntil det motsatte er bevist.
            
            for (const partyShorthand of partyCombination) {
                const standpoint = issue.standpoints[partyShorthand];
                
                // sjekker om partiet er uenig eller ikke har et standpunkt.
                // nivå 1 = "ganske enig", nivå 2 = "helt enig".
                if (standpoint === undefined || standpoint < level) {
                    allAgree = false;
                    break; // unødvendig å sjekke flere partier for denne saken.
                }
            }
            
            if (allAgree) {
                agreedIssues.push(issue);
            }
        });
        
        return agreedIssues;
    }

    // funksjon for å generere alle mulige kombinasjoner av partier (fra 2 og oppover).
    function getCombinations(parties) {
        const result = [];
        // vi starter med en 'power set' algoritme, men filtrerer for å kun få kombinasjoner på 2 eller flere.
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
        // sorterer slik at de største gruppene (flest partier) vises først.
        return result.sort((a, b) => b.length - a.length);
    }


    // --- Event Handlers (Håndtering av brukerinteraksjon) ---

    // funksjon for å håndtere klikk på en partiknapp.
    function togglePartySelection(button) {
        const shorthand = button.dataset.shorthand;
        button.classList.toggle('selected'); // slår av/på 'selected'-klassen for visuell feedback.

        if (selectedPartyShorthands.includes(shorthand)) {
            // fjerner partiet fra listen hvis det allerede var valgt.
            selectedPartyShorthands = selectedPartyShorthands.filter(p => p !== shorthand);
        } else {
            // legger til partiet i listen hvis det ikke var valgt.
            selectedPartyShorthands.push(shorthand);
        }
        
        handleUpdate(); // oppdaterer resultatene.
    }

    // setter opp alle 'lyttere' som venter på brukerinput.
    function setupEventListeners() {
        // lytter etter klikk på "fjern alle valg"-knappen.
        clearSelectionBtn.addEventListener('click', () => {
            selectedPartyShorthands = [];
            document.querySelectorAll('.party-selector-btn.selected').forEach(btn => {
                btn.classList.remove('selected');
            });
            handleUpdate();
        });

        // lytter etter endringer i valg av enighetsnivå.
        agreementLevelSelector.addEventListener('change', handleUpdate);
    }
    

    // --- Kjør applikasjonen ---
    initializeApp();

});
