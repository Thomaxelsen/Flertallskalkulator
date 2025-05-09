// js/candidatesData.js
// Laster inn kandidatdata fra JSON og gjør den tilgjengelig globalt.

fetch('data/candidates.json') // Henter data fra data/candidates.json
    .then(response => {
        // Sjekker om nettverksforespørselen var vellykket
        if (!response.ok) {
            // Hvis ikke OK, kast en feil for å gå til .catch()
            return Promise.reject(`Network response was not ok: ${response.statusText} (Status: ${response.status})`);
        }
        // Hvis OK, konverter responsen til JSON
        return response.json();
    })
    .then(data => {
        // Lagre den hentede dataen i en global variabel
        window.candidatesData = data;
        // Sett et flagg for å indikere at dataen er lastet og klar
        window.candidatesDataLoaded = true;
        console.log("Candidates data loaded and stored globally.", window.candidatesData); // Logg suksess og dataen

        // Send et signal (Custom Event) til andre scripts om at kandidatdataen nå er klar
        document.dispatchEvent(new CustomEvent('candidatesDataLoaded'));
        console.log("Dispatched 'candidatesDataLoaded' event.");
    })
    .catch(error => {
        // Håndterer eventuelle feil under fetch eller JSON-konvertering
        console.error("Error loading candidates data:", error);
        // Sett til tomt array som en fallback ved feil
        window.candidatesData = [];
        // Sett flagget uansett, slik at andre scripts som venter på flagget ikke henger evig
        window.candidatesDataLoaded = true;

        // Send signalet selv om det feilet, slik at andre scripts vet at forsøket er gjort
        document.dispatchEvent(new CustomEvent('candidatesDataLoaded'));
        console.log("Dispatched 'candidatesDataLoaded' event even after error.");
    });
