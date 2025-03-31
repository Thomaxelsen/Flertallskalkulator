// navigationConfig.js - Sentral konfigurasjon for navigasjon
// Denne filen inneholder alle navigasjonslenker for nettstedet

// Definer alle navigasjonslenker i denne sentrale konfigurasjonsfilen
window.navigationConfig = {
    // Array av lenker som skal vises i navigasjonen
    navLinks: [
        // Viktig: Bytt rekkefølge om ønskelig. Den første brukes ofte som "hjem".
        { href: "index.html", title: "Flertallskalkulator" },
        { href: "party-overview.html", title: "Partioversikt" },
        { href: "majority-coalitions.html", title: "Flertallskoalisjoner" },
        { href: "issue-matrix.html", title: "Saksmatrise" }, // <--- KOMMA LAGT TIL HER
        { href: "sakskompass.html", title: "Sakskompass" }
        // Legg til nye sider her i fremtiden, f.eks.:
        // { href: "om-prosjektet.html", title: "Om Prosjektet" }
    ]
};

// Sjekker om objektet ble opprettet før logging for å unngå følgefeil hvis det fortsatt er feil
if (window.navigationConfig && window.navigationConfig.navLinks) {
    console.log("Navigation config loaded:", window.navigationConfig.navLinks.length, "links defined.");
} else {
    console.error("Navigation config failed to load or initialize properly.");
}
