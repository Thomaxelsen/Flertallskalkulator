# Flertallskalkulator

## Pushe endringer til GitHub

1. **Sjekk status på repoet** for å se hvilke filer som er endret:
   ```bash
   git status
   ```
2. **Legg til filene** du vil ta med i commiten:
   ```bash
   git add <filnavn>
   ```
   Bruk `git add .` dersom du vil ta med alle endrede filer.
3. **Lag en commit** med en forklarende melding:
   ```bash
   git commit -m "Beskriv hva som er endret"
   ```
4. **Push commiten** til fjernrepoet på GitHub:
   ```bash
   git push
   ```
   Hvis du jobber på en ny branch første gang, kan du måtte spesifisere navnet:
   ```bash
   git push -u origin <branch-navn>
   ```
5. Etter push vil endringene være tilgjengelige på GitHub. Opprett eventuelt en pull request om endringene skal gjennomgås før de merges til hovedbranch.

> Tips: Bruk `git log --oneline` for å se de siste commitene, og `git pull` før du starter for å hente inn oppdateringer fra andre.
