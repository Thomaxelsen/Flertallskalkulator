// issues.js - Data om saker og partiers standpunkter
const issues = [
  {
    id: 1,
    area: "Arbeidsliv",
    name: "Fleksibel sykepengeordning",
    partiesInAgreement: ["SP", "FrP"],
    partyQuotes: {
      "SP": "Greie ut mulighetene for at personer med alvorlige diagnoser som er under aktiv behandling, får nødvendig fleksibilitet når det gjelder sykemeldinga si lengde og gradering, samt bedre høve for arbeidsnærvær og økonomisk tryggleik i behandlingsperioden ut over et år. Arbeidsgiver må i denne perioden gjevast fritak for arbeidsgiveravsperioden for sjukepengar.",
      "FrP": "Sikre en god og forutsigbar sykelønnordning for arbeidstakere, og innføre en tidskonto-ordning som sikrer gode muligheter for å stå delvis i arbeid under sykemelding."
    }
  },
  {
    id: 2,
    area: "Arbeidsliv",
    name: "Styrking av kompetansen i NAV",
    partiesInAgreement: ["R", "AP", "FrP", "H"],
    partyQuotes: {
      "AP": "At NAV skal hjelpe flere inn i arbeid. Derfor må NAV styrkes med nye verktøy. De ansatte i NAV må gis mer fleksibilitet, slik at de kan tilpasse virkemiddelbruken til den enkelte.",
      "R": "a) Gi de ansatte i førstelinjen i NAV tid og tillit til å gjøre jobben sin. b) Stoppe nedleggelsen av NAV-kontorer og omgjøre NAV til en institusjon som gir gode og nære tjenester til dem som trenger det. Tilbakeføre vedtaksmyndighet til Navs lokalkontorer.",
      "FrP": "Styrke kompetansen i NAV.",
      "H": "Prioritere bruk av lønnstilskudd og andre arbeidsmarkedstiltak som har beviselig god effekt for å sikre en mer effektiv og målrettet bruk av ressursene."
    }
  },
  {
    id: 3,
    area: "Arbeidsliv",
    name: "Økt bruk av tiltak som Individuell jobbstøtte (IPS) og Arbeid med støtte (AMS)",
    partiesInAgreement: [],
    partyQuotes: {
      "FrP": "Innføre et fleksibelt lønnstilskudd for å få flere med nedsatt arbeidsevne inn i 33 arbeidslivet."
    }
  },
  {
    id: 4,
    area: "Arbeidsliv",
    name: "Økt bruk av lønnstilskudd",
    partiesInAgreement: ["SV", "AP", "SP", "MDG", "KrF", "H", "FrP"],
    partyQuotes: {
      "AP": "Utvide ordningen med varig lønnstilskudd til flere utsatte grupper.",
      "SP": "Utvide omfanget av ordninger med varig lønnstilskudd til bedrifter som ansetter arbeidsseekende via NAV, særlig for grupper med nedsatt arbeidsevne.",
      "SV": "At det skal lønne seg å ansette folk som står utenfor arbeidslivet. Vi vil styrke ordningen som gir lønnstilskudd til bedrifter som ansetter arbeidssøkende via NAV, særlig for grupper med nedsatt arbeidsevne.",
      "MDG": "Sikre funksjonsassistanse og lønnstilskudd i arbeid, arbeidstiltak eller praksis til en rettighetsfestet, også for uføre. Ordningen må kunne samordnes med BPA.",
      "KrF": "Ha økt bruk av lønnstilskudd og arbeidstrening for å gi flere muligheten til å delta i arbeidslivet.",
      "H": "Prioritere bruk av lønnstilskudd og andre arbeidsmarkedstiltak som har beviselig god effekt for å sikre en mer effektiv og målrettet bruk av ressursene."
    }
  },
  {
    id: 5,
    area: "Arbeidsliv",
    name: "Styrke og øke bruken av arbeidsrettet rehabilitering",
    partiesInAgreement: ["SP", "H", "FrP"],
    partyQuotes: {
      "SP": "Innføre ein eigen opptrappingsplan som sikrar utvikling og finansiering av eit godt 191:1 kommunalt tilrettelagte rehabiliterings- og habiliteringstilbod for alle pasientgrupper.",
      "H": "Satse mer på arbeidsrettet rehabilitering for å sikre at flere kommer raskere tilbake til arbeidslivet.",
      "FrP": "At personer som på grunn av sykdom eller skade får nedsatt arbeidsevne, skal sikres rask rehabilitering og nødvendige hjelpetiltak slik at de fortsatt kan delta i arbeidslivet. Rehabilitering og habilitering skal være rettighetsfestet."
    }
  },
  {
    id: 6,
    area: "Diagnostikk og tidlig oppdagelse",
    name: "Utvide mammorgrafiprogrammet",
    partiesInAgreement: ["AP", "H"],
    partyQuotes: {
      "AP": "Utvide mammografibilddet i tråd med EUs nye retningslinjer.",
      "H": "Vurdere å utvide mammografiprogrammet i tråd med faglige anbefalinger."
    }
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
    partiesInAgreement: ["R", "V", "H"],
    partyQuotes: {
      "R": "Innføre et pilotprosjekt for å prøve ut et nasjonalt screeningprogram for prostatakreft.",
      "V": "Utrede et nasjonalt screeningprogram for prostatakreft.",
      "H": "Gjennomføre en pilotstudie for screening av prostata."
    }
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
    partiesInAgreement: ["AP", "SP", "KrF", "H"],
    partyQuotes: {
      "AP": "Følge opp ambisjonene i folkehelsestrategien ved å finansiere et nasjonalt røykesluttprogram.",
      "SP": "Tilby gratis legemidler til røykeslutt.",
      "KrF": "Tilby gratis legemidler til røykeslutt på nasjonalt nivå.",
      "H": "Jobbe for redusert tobakksbruk og innføre et nasjonalt røykesluttprogram."
    }
  },
  {
    id: 11,
    area: "Folkehelse og forebygging",
    name: "Høyere tobakksavgifter",
    partiesInAgreement: ["KrF"],
    partyQuotes: {
      "KrF": "Øke avgiftene på alkohol til arbeid med forebygging fra selvmordet, og øke avgiftene på tobakk."
    }
  },
  {
    id: 12,
    area: "Folkehelse og forebygging",
    name: "Restriktiv alkoholpolitikk",
    partiesInAgreement: ["R", "AP", "SP", "KrF"],
    partyQuotes: {
      "AP": "Føre en restriktiv alkoholpolitikk og opprettholde Vinmonopolets samfunnsrolle.",
      "R": "Føre en restriktiv tobakks- og alkoholpolitikk.",
      "SP": "Ha restriksjonar på alkoholreklame og tilgjengelighet.",
      "KrF": "Føre en restriktiv, solidarisk og trygghetsskapende alkoholpolitikk ved å styrke et bevilgnings- og kontrollsystem som begrenser tilgjengelighet, reduseren den alminnelige skjenketiden fra 03:00 til..."
    }
  },
  {
    id: 13,
    area: "Folkehelse og forebygging",
    name: "Merke alkohol med informasjon om de helsekonsekvensene alkoholkonsum medfører",
    partiesInAgreement: ["SP"],
    partyQuotes: {
      "SP": "Innføre krav til innholdsmerking av alkoholholdige drikkevarer."
    }
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
    partiesInAgreement: ["R", "MDG", "KrF", "V"],
    partyQuotes: {
      "R": "Avvikle taxfree-ordningen. Fram til dette skjer, bør Vinmonopolet overta driften.",
      "MDG": "Avvikle ordningen med taxfree-handel på flyplasser og redusere taxfree-kvoten til et minimum.",
      "KrF": "Avvikle taxfree-ordningen.",
      "V": "Avvikle ordningen med tax-free ved ankomst på flyplasser, og kompensere Avinor for den delen av inntektene som går til finansiering av distriktsflyplasser."
    }
  },
  {
    id: 17,
    area: "Folkehelse og forebygging",
    name: "Utrydde livmorhalskreft og HPV-relatert kreft",
    partiesInAgreement: ["AP", "H", "FrP"],
    partyQuotes: {
      "AP": "Utrydde livmorhalskreft som sykdom i Norge.",
      "H": "Innføre flere tiltak som reduserer utvikler HPV-relatert kreft og sykdom.",
      "FrP": "Tilby en større del av befolkningen vaksine mot HPV-viruset, inkludert gutter og intensivere screeningprogrammet slik at kvinner regelmessig blir innkalt til rutinekontroll."
    }
  },
  {
    id: 18,
    area: "Folkehelse og forebygging",
    name: "Forbud mot markedsføring for usunn mat og drikke",
    partiesInAgreement: ["V"],
    partyQuotes: {
      "V": "Innføre et forbud mot markedsføring av spesielt usunn mat rettet mot barn."
    }
  },
  {
    id: 19,
    area: "Folkehelse og forebygging",
    name: "Sunn skatteveksling",
    partiesInAgreement: ["R", "KrF", "V"],
    partyQuotes: {
      "R": "Bruke avgiftspolitikken for å stimulere til sunne og miljøvennlige valg.",
      "KrF": "Ha en sunn skatteveksling, slik at sunne matvarer blir billigere og usunne dyrere.",
      "V": "Gjennomgå avgiftssystemet for mat med sikte på å gjøre frukt og grønt billigere og usunn mat dyrere."
    }
  },
  {
    id: 20,
    area: "Forskning og innovasjon",
    name: "Opprettelse av en helsekatapult",
    partiesInAgreement: ["AP", "H"],
    partyQuotes: {
      "AP": "Opprette helsekatapult for å gjøre det enklere å gå fra idé til salg i markedet.",
      "H": "Opprette en egen Katapult for helseteknologi og helseinnovasjon som kobles opp mot ledende forsknings- og innovasjonsmiljøer."
    }
  },
  {
    id: 21,
    area: "Forskning og innovasjon",
    name: "Økt bruk av helsedata for å forbedre behandling og utvikle helsenæring",
    partiesInAgreement: ["AP", "SP", "H"],
    partyQuotes: {
      "AP": "Bruke norske helsedata til å utvikle nye tjenester, behandlinger og medisinske produkter.",
      "SP": "Sikre tilgang på helsedata på tvers av offentleg og privat sektor som gjer det mogeleg å 193B utvikle best mogelege løysingar, samstundes som personvernet vert ivareteke.",
      "H": "Gjøre helsenæring til et satsingsområde, gjennom bedre digitalisering av helsedata og biobanker og legge til rette for grundskap."
    }
  },
  {
    id: 22,
    area: "Forskning og innovasjon",
    name: "Økt satsing på helsenæring",
    partiesInAgreement: ["AP", "H", "FrP"],
    partyQuotes: {
      "AP": "Fortsette å løfte helsenæring som eksportsatsing og følge opp utredningen av klyngestrukturen og sørge for at helseklyngene får rammevikår.",
      "H": "Ta en ledende rolle internasjonalt for å stimulere og fremme utvikling for å forhindre og bekjempe antibiotikaresistens.",
      "FrP": "Gjøre Norge til en ledende produsent, utvikler og eksportør av helseteknologi."
    }
  },
  {
    id: 23,
    area: "Forskning og innovasjon",
    name: "Politikk for å begrense antibiotikaresistens",
    partiesInAgreement: ["R", "AP", "SP", "MDG", "KrF", "V", "H", "FrP"],
    partyQuotes: {
      "AP": "At Norge jobber for å styrke utviklingen av vaksiner og diagnostiske verktøy som kan forebygge antibiotikaresistens.",
      "R": "At Norge jobber for å styrke utviklingen av vaksiner og diagnostiske verktøy som kan forebygge antibiotikaresistens.",
      "SP": "Styrkje forsknings- og utredningsarbeid for å stoppe spredning av antibiotikaresistente bakterier.",
      "MDG": "Ytterligere redusere antibiotikabruken i norsk helsevesen, oppdrettsnæring, og lede an internasjonalt i arbeidet mot antibiotikaresistens.",
      "KrF": "Sørge for at Norge tar lederskap for et sterkere internasjonalt avtalevert rundt pandemibredskap og forebygging av antibiotikaresistens.",
      "V": "At Norge skal være pådriver for et sterkere internasjonalt avtalevert rundt pandemibredskap og forebygging av antibiotikaresistens.",
      "H": "Arbeide aktivt for å sikre mot legemiddelmangel, og styrke og utvide det nordiske samarbeidet om produksjon og lagring av legemidler og smittevernutstyr i Norden. Og prioritere effektiv implementering av EU-direktiver som koordinerer gode, samfunnsnyttige, teknologiske løsninger og sikkerhet.",
      "FrP": "Økt vaksinasjonsdekning vil styrke folkehelsen, redusere helseforskjeller og bekjempe antibiotikaresistens."
    }
  },
  {
    id: 24,
    area: "Forskning og innovasjon",
    name: "Få opp nasjonal infrastruktur for legemiddelproduksjon",
    partiesInAgreement: ["R", "SV", "AP", "SP", "MDG", "KrF", "FrP", "H"],
    partyQuotes: {
      "AP": "Styrke utviklingen og produksjonen av legemidler i Norge.",
      "R": "Utvikle produksjon av nødvendige legemidler i Norge, og jobbe for endringer i legemiddelindustrien slik at det ikke blir mangel på nødvendige legemidler.",
      "SP": "Etablere statlig produksjon av legemidler (StatMed) og styrke forskningen og eksisterende produksjonsmiljøer i Norge.",
      "SV": "Få opp nasjonal infrastruktur for legemiddelproduksjon.",
      "MDG": "Styrke legemiddelberedskapen og sikre forskning i framtida.",
      "KrF": "Utrede muligheter for produksjon av kritiske legemidler i Norge, enten for raskt å sette i gang slik produksjon ved krise.",
      "H": "I større grad gjøre Norge selvforsynt med de viktigste legemidlene og etablere nasjonal beredskapsplager.",
      "FrP": "I større grad gjøre Norge selvforsynt med de viktigste legemidlene og etablere nasjonal beredskapslager."
    }
  },
  {
    id: 25,
    area: "Forskning og innovasjon",
    name: "Økt bruk av digital hjemmeoppfølging",
    partiesInAgreement: ["SV", "AP", "MDG", "KrF", "H"],
    partyQuotes: {
      "AP": "Benytte mulighetene som ny teknologi, innovasjon og digitalisering gir oss.",
      "SV": "Etablere brukervennlige digitale oppfølgingstjenester og ta i bruk ulike typer velferdsteknologi.",
      "MDG": "Satse på innovasjon og god bruk av velferdsteknologi for å bedre kvalitet og tilgjengelighet i helsetjenestene.",
      "KrF": "Forsterke samarbeidet om digitalisering med kommunesektoren, herunder tiltak for riktig og økt bruk av velferdsteknologi.",
      "H": "A) Sørge for målrettet bruk av ny teknologi, digitalisering og kunstig intelligens for å jobbe på smartere måter og ha bedre oppgavefordeling i sykehus B) Sørge for raskere realisering av nytten ved bruk av digitale løsninger og ny teknologi i helse- og omsorgssektoren."
    }
  },
  {
    id: 26,
    area: "Frivillig sektor",
    name: "Økt skattefradrag på gaver",
    partiesInAgreement: ["SP", "MDG", "KrF", "V", "H", "FrP"],
    partyQuotes: {
      "SP": "Øke skattefradraget for gaver til frivillige organisasjoner.",
      "MDG": "Øke skattefradraget for gaver til frivillige organisasjoner.",
      "KrF": "Øke maksgrensen for skattefradrag for gaver til trossamfunn og frivillige organisasjoner til minst 100 000 kroner.",
      "V": "Gjeninnføre gaveforsterkningsordningen og øke skattefradraget for private givere for å gjøre det mer attraktivt å tiltrekke seg privat kapital til kulturinstitusjoner.",
      "H": "Forbedre rammevilkårene for frivillige organisasjoners lotterier med tillatelse gitt i pengespilloven, og øke fradragsgrensen for gaver fra private givere og næringsliv til frivillige og ideelle organisasjoner.",
      "FrP": "Øke skattefradraget for gaver til frivillige, samfunnsnyttige og humanitære organisasjoner."
    }
  },
  {
    id: 27,
    area: "Frivillig sektor",
    name: "Styrke de spesielle rettsjelpstiltakene",
    partiesInAgreement: ["SV", "AP", "MDG"],
    partyQuotes: {
      "AP": "Styrke de frivillige rettshjelptiltakene.",
      "SV": "Styrke de frivillige rettshjelptiltakene og prioritere at flere får fri rettshjelp.",
      "MDG": "Styrke ordningene med fri rettshjelp og organisasjoner som gir fri rettshjelp."
    }
  },
  {
    id: 28,
    area: "Frivillig sektor",
    name: "Utvide saksområdet for fri rettshjelp",
    partiesInAgreement: ["SV", "AP", "SP", "V"],
    partyQuotes: {
      "AP": "Etablere en ny rettshjelpsmodell som sikrer at flere utsatte grupper får rettshjelp, og tilby rettshjelpsveledning til folk over hele landet i nærttjenestesentre.",
      "SP": "Endre rettshjelpsordningen til å gjelde flere saksområder og prioritere inntektsgrensa 953€ for ordningen.",
      "SV": "Styrke de frivillige rettshjelptiltakene og prioritere at flere får fri rettshjelp.",
      "V": "Øke inntektsgrensen for fri rettshjelp, slik at også de med lav inntekt sikres tilgang på rettshjelp."
    }
  },
  {
    id: 29,
    area: "Frivillig sektor",
    name: "Gjeninnføre gaveforsterkningsordning",
    partiesInAgreement: ["V", "H", "FrP"],
    partyQuotes: {
      "V": "Gjeninnføre gaveforsterkningsordningen og øke skattefradraget for private givere for å gjøre det mer attraktivt å tiltrekke seg privat kapital til kulturinstitusjoner.",
      "H": "Innføre en gaveforsterkningsordning på forskningsområdet.",
      "FrP": "Gjeninnføre gaveforsterkningsordningen og øke skattefradraget for private givere for å gjøre det mer attraktivt å tiltrekke seg privat kapital til kulturinstitusjoner."
    }
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
    partiesInAgreement: ["R"],
    partyQuotes: {
      "R": "Sikre at sosialhjelpmottakere kan motta økonomisk støtte fra familie eller frivillige organisasjoner uten å være redde for avkortning."
    }
  },
  {
    id: 36,
    area: "Rettigheter",
    name: "En gjennomgang og bedring av ordningen for pasientreiser",
    partiesInAgreement: ["AP"],
    partyQuotes: {
      "AP": "Gjennomgå ordningene til Pasientreiser for å sikre at ikke pasienter og pårørende får unødvendig lang, belastende og kostbar reisevei."
    }
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
    partiesInAgreement: ["R", "SV", "SP", "KrF", "FrP"],
    partyQuotes: {
      "R": "At det skal tas hensyn til helthetlige behov når familier hvor flere er kronisk syke, søker helse- og omsorgstjenester – og.... Forbedre regelverket for pårørendes permisjonsmulighetere i arbeidslivet for å sikre likestilling og bedre mulighetene til å kombinere arbeid og omsorg 2025 og omsorg.",
      "SP": "Forbedre pårørende permisjonsmuligheter i arbeidslivet, og mulige økonomiske 2024 kompensasjonsordninger, for å sikre likestilling og bedre muligheter til å kombinere arbeid 2025 og omsorg.",
      "SV": "Anerkjenne den viktige rollen til pårørende. Vi vil sørge for nasjonale satsar på omsorgstenader og vurdere å innføre å omsregeldning.",
      "KrF": "Legge til rette for bedre ordninger med omsorgslønn og avlastningstiltak for familiemedlemmer som selv utfører omfattende omsorgsjeneste skal gjøre disse bedre kjent, og utvide pleiepengeordningen til også å gjelde eldre i livets sluttfase.",
      "FrP": "At pårørende til alvorlig syke skal ha rett til tidsbegrenset pleiepenger når de pleier sine nærmeste."
    }
  },
  {
    id: 39,
    area: "Rettigheter",
    name: "Studenter må få tilgang til arbeidsavklaringspenger",
    partiesInAgreement: ["AP"],
    partyQuotes: {
      "AP": "Sikre gode samarbeids- og samordningsløsninger mellom helsetjenesten, utdanningssektoren og NAV, for å støtte mennesker som står utenfor jobb og utdanning tilbake i meningsfull aktivitet."
    }
  },
  {
    id: 40,
    area: "Tilgang til behandling",
    name: "Satsing på flere kliniske studier",
    partiesInAgreement: ["AP", "V", "H", "FrP"],
    partyQuotes: {
      "AP": "Legge til rette for at flere pasienter får delta i kliniske studier i hele landet.",
      "V": "Kliniske studier er avgjørende for utvikling av nye medisiner, behandlinger og medisinsk teknologi.",
      "H": "Gjennomføre flere kliniske studier i Norge.",
      "FrP": "Styrke medisinsk forskning, sikre rask tilgang til nye legemidler og metoder, og holde egenandeler på et moderat nivå."
    }
  },
  {
    id: 41,
    area: "Tilgang til behandling",
    name: "Kortere ventetider på helsehjelp",
    partiesInAgreement: ["SV", "AP", "SP", "KrF", "H", "FrP"],
    partyQuotes: {
      "AP": "Sikre korte ventetider i vår felles helsetjeneste.",
      "SP": "Styrke finansieringen av sykehusene for å sikre økt pasientbehandling, reduserte ventetider og økt evne til å håndtere oppgavevekst og geografiske forskjeller.",
      "SV": "Bemanningen ved de offentlige sykehusene må styrkes, slik at vi reduserer ventetidene, sikrer raskere behandling og øker helseberedskapen i hele landet.",
      "KrF": "Ventetidene i spesialisthelsetjenesten må ned.",
      "H": "Redusere ventetidene i helsetjenesten.",
      "FrP": "For å redusere ventetider ønsker Fremskrittspartiet en utrednings- og behandlingsgarant på 30 dager etter dansk modell."
    }
  },
 {
    id: 42,
    area: "Tilgang til behandling",
    name: "Raskere tilgang til nye behandlinger og medisiner",
    partiesInAgreement: ["R", "SP", "H", "FrP"],
    partyQuotes: {
      "R": "At systemet for innføring av nye medisiner/legemidler endres slik at saksbehandlingstiden går ned, og faglige og samfunnsmessige kriterier blir førende, for å gjøre flere medisiner tilgjengelige.",
      "SP": "Redusere byråkrati og sikre raskere innføring av nye behandlingsmetoder.",
      "H": "Sørge for at pasienter får raskere tilgang til nye medisiner. Tilgang til flere kliniske studier og tilstrekkelig tilgang til nødvendige medisiner.",
      "FrP": "Sikre rask tilgang til nye og effektive legemidler, godkjenne medisiner fra Sverige og Danmark uten unødvendig forsinkelse og fjerne særnorske krav som forsinker medisinsk utvikling i Norge."
    }
  },
  {
    id: 43,
    area: "Tilgang til behandling",
    name: "Satsing på norsk helseberedskap",
    partiesInAgreement: ["AP", "MDG"],
    partyQuotes: {
      "AP": "Styrke samhandling mellom sivil og militær helseberedskap.",
      "MDG": "Styrke helseberedskapen og samhandlingen. Blant annet ved å involvere kommunene bedre i helseberedskapsrådet."
    }
  },
  {
    id: 44,
    area: "Økt investeringer i helse",
    name: "Øke investeringer innenfor helse",
    partiesInAgreement: ["SV", "AP", "SP", "V", "H"],
    partyQuotes: {
      "AP": "Øke andel av BNP som går til helse for å sikre investeringer som bidrar til effektiv ressursbruk.",
      "SP": "Øke bevilgningene og ha et stekt offentlig helsevesen med like egenandeler.",
      "SV": "Arbeide for å løfte investeringsetterslepet i sykehusene og øke grunnfinansieringen av sykehusene i tråd med kostnadsvekst og investeringsbehov.",
      "V": "Øke den samlede ressursbruken til helse og omsorg framover.",
      "H": "Styrke helsevesenet ved å investere i sykehuskapasitet og teknologi."
    }
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
