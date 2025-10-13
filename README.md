# Flertallskalkulator for Stortinget

Dette repoet inneholder en samling verktøy og visualiseringer som presenterer data om Stortinget.
Nettsidene er statiske og kan derfor enkelt publiseres på GitHub Pages.

## Ny underside: Stortingsdokumenter

Siden [`stortinget-documents.html`](stortinget-documents.html) henter skriftlige spørsmål, interpellasjoner,
spørretimespørsmål og representantforslag (Dokument 8) direkte fra Stortingets API. All behandling skjer i
nettleseren, og ingen data lagres på server.

### Kom i gang

1. Skaff en API-nøkkel fra [data.stortinget.no](https://data.stortinget.no/dokumentasjon-og-hjelp/) og kopier
   verdien av `Ocp-Apim-Subscription-Key`.
2. Åpne `stortinget-documents.html` i nettleseren.
3. Lim inn API-nøkkelen i feltet øverst på siden. Nøkkelen lagres i nettleserens `localStorage`.
4. Velg dokumenttype og eventuelle filtre, og trykk **Hent dokumenter**.

### Funksjoner

- Klientsidefiltrering på fritekst og dato.
- Viser metadata og rå JSON for hvert dokumentkort.
- «Last inn flere»-knapp for paginering.

## Publiser på GitHub Pages

1. Push endringene til `main` (eller en dedikert Pages-branch).
2. Gå til **Settings → Pages** i GitHub-repoet og velg «Deploy from a branch».
3. Velg riktig branch og rotmappe (typisk `/` for dette repoet).
4. Etter bygging vil siden være tilgjengelig på `https://<brukernavn>.github.io/<repo>/`.
5. Besøk `https://<brukernavn>.github.io/<repo>/stortinget-documents.html` for den nye undersiden.

## Lokalt bruk

Åpne ønsket HTML-fil direkte i nettleseren (f.eks. med `live-server` eller VS Code sin «Open with Live Server»).
De fleste sidene bruker statiske JSON-filer eller åpne API-er og trenger ingen backend.
