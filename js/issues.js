// issues.js - Data om saker og partiers standpunkter
const issues = [
  {
    id: 1,
    area: "Arbeidsliv",
    name: "Fleksibel sykepengeordning",
    partiesInAgreement: ["SP", "FrP"] // Partier som har score 2 (helt enig)
  },
  {
    id: 2,
    area: "Arbeidsliv",
    name: "Styrking av kompetansen i NAV",
    partiesInAgreement: ["R", "AP", "FrP"]
  },
  {
    id: 3,
    area: "Arbeidsliv",
    name: "Økt bruk av tiltak som Individuell jobbstøtte (IPS) og Arbeid med støtte (AMS)",
    partiesInAgreement: []
  },
  {
    id: 4,
    area: "Arbeidsliv",
    name: "Økt bruk av lønnstilskudd",
    partiesInAgreement: ["SV", "AP", "SP", "MDG", "KrF", "H", "FrP"]
  },
  {
    id: 5,
    area: "Arbeidsliv",
    name: "Styrke og øke bruken av arbeidsrettet rehabilitering",
    partiesInAgreement: ["SP", "H", "FrP"]
  },
  {
    id: 6,
    area: "Diagnostikk og tidlig oppdagelse",
    name: "Utvide mammorgrafiprogrammet",
    partiesInAgreement: ["AP", "H"]
  },
  {
    id: 7,
    area: "Diagnostikk og tidlig oppdagelse",
    name: "Gentest til flere tidligere i forløpet",
    partiesInAgreement: []
  },
  {
    id: 8,
    area: "Diagnostikk og tidlig oppdagelse",
    name: "Pilot på prostatakreftscreening",
    partiesInAgreement: ["R", "V", "H"]
  },
  {
    id: 9,
    area: "Diagnostikk og tidlig oppdagelse",
    name: "Innføre lungekreftscreening",
    partiesInAgreement: []
  },
  {
    id: 10,
    area: "Folkehelse og forebygging",
    name: "Nasjonalt tilbud om røykeslutt og forslag om skattlegging av tobakksnæringen",
    partiesInAgreement: ["AP", "SP", "KrF", "H"]
  },
  {
    id: 11,
    area: "Folkehelse og forebygging",
    name: "Høyere tobakksavgifter",
    partiesInAgreement: ["KrF"]
  },
  {
    id: 12,
    area: "Folkehelse og forebygging",
    name: "Restriktiv alkoholpolitikk",
    partiesInAgreement: ["R", "AP", "SP", "KrF"]
  },
  {
    id: 13,
    area: "Folkehelse og forebygging",
    name: "Merke alkohol med informasjon om de helsekonsekvensene alkoholkonsum medfører",
    partiesInAgreement: ["SP"]
  },
  {
    id: 14,
    area: "Folkehelse og forebygging",
    name: "Strengere regulering av solarium",
    partiesInAgreement: []
  },
  {
    id: 15,
    area: "Folkehelse og forebygging",
    name: "Stanse endringer i tobakksskadeloven (innføring av EUs tobakksdirektiv) som vil tillate salg av e-sigaretter",
    partiesInAgreement: []
  },
  {
    id: 16,
    area: "Folkehelse og forebygging",
    name: "Avvikle taxfree-ordningen for alkohol, tobakks- og nikotinprodukter",
    partiesInAgreement: ["R", "MDG", "KrF", "V"]
  },
  {
    id: 17,
    area: "Folkehelse og forebygging",
    name: "Utrydde livmorhalskreft og HPV-relatert kreft",
    partiesInAgreement: ["AP", "H", "FrP"]
  },
  {
    id: 18,
    area: "Folkehelse og forebygging",
    name: "Forbud mot markedsføring for usunn mat og drikke",
    partiesInAgreement: ["V"]
  },
  {
    id: 19,
    area: "Folkehelse og forebygging",
    name: "Sunn skatteveksling",
    partiesInAgreement: ["R", "KrF", "V"]
  },
  {
    id: 20,
    area: "Forskning og innovasjon",
    name: "Opprettelse av en helsekatapult",
    partiesInAgreement: ["AP", "H"]
  },
  {
    id: 21,
    area: "Forskning og innovasjon",
    name: "Økt bruk av helsedata for å forbedre behandling og utvikle helsenæring",
    partiesInAgreement: ["AP", "SP", "H"]
  },
  {
    id: 22,
    area: "Forskning og innovasjon",
    name: "Økt satsing på helsenæring",
    partiesInAgreement: ["AP", "H", "FrP"]
  },
  {
    id: 23,
    area: "Forskning og innovasjon",
    name: "Politikk for å begrense antibiotikaresistens",
    partiesInAgreement: ["R", "AP", "SP", "MDG", "KrF", "V", "H", "FrP"]
  },
  {
    id: 24,
    area: "Forskning og innovasjon",
    name: "Få opp nasjonal infrastruktur for legemiddelproduksjon",
    partiesInAgreement: ["R", "SV", "AP", "SP", "MDG", "KrF", "FrP"]
  },
  {
    id: 25,
    area: "Forskning og innovasjon",
    name: "Økt bruk av digital hjemmeoppfølging",
    partiesInAgreement: ["SV", "AP", "MDG", "KrF", "H"]
  },
  {
    id: 26,
    area: "Frivillig sektor",
    name: "Økt skattefradrag på gaver",
    partiesInAgreement: ["SP", "MDG", "KrF", "V", "H", "FrP"]
  },
  {
    id: 27,
    area: "Frivillig sektor",
    name: "Styrke de spesielle rettsjelpstiltakene",
    partiesInAgreement: ["SV", "AP", "MDG"]
  },
  {
    id: 28,
    area: "Frivillig sektor",
    name: "Utvide saksområdet for fri rettshjelp",
    partiesInAgreement: ["SV", "AP", "SP", "V"]
  },
  {
    id: 29,
    area: "Frivillig sektor",
    name: "Gjeninnføre gaveforsterkningsordning",
    partiesInAgreement: ["V", "H", "FrP"]
  },
  {
    id: 30,
    area: "Kreftomsorg",
    name: "Satsing på pakkeforløp hjem for kreftpasienter",
    partiesInAgreement: []
  },
  {
    id: 31,
    area: "Kreftomsorg",
    name: "Kreftkoordinator i alle kommuner",
    partiesInAgreement: []
  },
  {
    id: 32,
    area: "Kreftomsorg",
    name: "Spesialisering innen palliasjon",
    partiesInAgreement: []
  },
  {
    id: 33,
    area: "Kreftomsorg",
    name: "Ernæringsstrategi i alle sykehus",
    partiesInAgreement: []
  },
  {
    id: 34,
    area: "Rettigheter",
    name: "Totalrevisjon av pasient- og brukerrettighetsloven",
    partiesInAgreement: []
  },
  {
    id: 35,
    area: "Rettigheter",
    name: "Avkortning av sosialhjelp ved økonomisk støtte",
    partiesInAgreement: ["R"]
  },
  {
    id: 36,
    area: "Rettigheter",
    name: "En gjennomgang og bedring av ordningen for pasientreiser",
    partiesInAgreement: ["AP"]
  },
  {
    id: 37,
    area: "Rettigheter",
    name: "Kreftpasienters mulighet for erstatning etter pasientskader",
    partiesInAgreement: []
  },
  {
    id: 38,
    area: "Rettigheter",
    name: "Omsorgspenger for pårørende",
    partiesInAgreement: ["R", "SV", "SP", "KrF", "FrP"]
  },
  {
    id: 39,
    area: "Rettigheter",
    name: "Studenter må få tilgang til arbeidsavklaringspenger",
    partiesInAgreement: ["AP"]
  },
  {
    id: 40,
    area: "Tilgang til behandling",
    name: "Satsing på flere kliniske studier",
    partiesInAgreement: ["AP", "V", "H", "FrP"]
  },
  {
    id: 41,
    area: "Tilgang til behandling",
    name: "Kortere ventetider på helsehjelp",
    partiesInAgreement: ["SV", "AP", "SP", "KrF", "H", "FrP"]
  },
  {
    id: 42,
    area: "Tilgang til behandling",
    name: "Raskere tilgang til nye behandlinger og medisiner",
    partiesInAgreement: ["R", "SP", "H", "FrP"]
  },
  {
    id: 43,
    area: "Tilgang til behandling",
    name: "Satsing på norsk helseberedskap",
    partiesInAgreement: ["AP", "MDG"]
  },
  {
    id: 44,
    area: "Økt investeringer i helse",
    name: "Øke investeringer innenfor helse",
    partiesInAgreement: ["SV", "AP", "SP", "V", "H"]
  },
  {
    id: 45,
    area: "Økt investeringer i helse",
    name: "Langtidsplan for helsetjenesten",
    partiesInAgreement: []
  }
];

// Gjør issues tilgjengelig globalt så andre script kan bruke det
window.issues = issues;
