// navigationConfig.js - Sentral konfigurasjon for navigasjon
// Denne filen inneholder alle navigasjonslenker for nettstedet

window.navigationConfig = {
    linkCategories: [
        {
            categoryTitle: "Politiske Saker",
            links: [
                { href: "index.html", title: "Flertallskalkulator" },
                { href: "issue-matrix.html", title: "Saksmatrise" },
                { href: "sakskompass.html", title: "Sakskompass" }
            ]
        },
        {
            categoryTitle: "Partier",
            links: [
                { href: "party-overview.html", title: "Partioversikt" },
                { href: "party-profile.html", title: "Partiprofil" },
                { href: "party-similarity.html", title: "Partilikhet" },
                { href: "party-constellations.html", title: "Partikonstellasjoner" },
                // NY LINJE: Her legger vi til den nye siden
                { href: "party-unique.html", title: "Parti-unike saker" }
            ]
        },
        {
            categoryTitle: "Politikere",
            links: [
                { href: "representatives.html", title: "Stortingsrepresentanter" },
                { href: "quiz.html", title: "Politiker-quiz" }
            ]
        }
    ]
};

// Sjekker om objektet ble opprettet før logging
if (window.navigationConfig && window.navigationConfig.linkCategories) {
    console.log("Navigation config loaded with categories:", window.navigationConfig.linkCategories.length, "categories defined.");
} else {
    console.error("Navigation config failed to load or initialize properly with categories.");
}
