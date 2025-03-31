// js/partiesData.js
fetch('data/parties.json')
    .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
    .then(data => {
        window.partiesData = data; // Lagre globalt
        window.partiesDataLoaded = true; // Flagg for å indikere at data er klar
        console.log("Parties data loaded and stored globally.");
        // Send et signal om at data er klar
        document.dispatchEvent(new CustomEvent('partiesDataLoaded'));
    })
    .catch(error => {
        console.error("Error loading parties data:", error);
        window.partiesData = []; // Sett til tomt array ved feil
        window.partiesDataLoaded = true; // Sett flagg uansett for å unngå heng
         document.dispatchEvent(new CustomEvent('partiesDataLoaded')); // Send signal selv ved feil
    });
