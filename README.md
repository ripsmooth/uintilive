# Swimify TV – Vercel + GitHub Pages, käsiohjaus

Paketissa on tulosgrafiikka (`index.html`), Vercelin API (`api/data.js`, `api/control.js`) ja erillinen käsiohjauspaneeli (`control.html`).

## 1. Vercelin ympäristömuuttujat

Lisää Vercel-projektiin (Settings → Environment Variables):

- `SWIMIFY_API_KEY` – Swimifyn API-avain
- `COMPETITION_ID` – kilpailun oletus-ID
- `UPSTASH_REDIS_REST_URL` – Upstash Redis -tietokannan REST-osoite
- `UPSTASH_REDIS_REST_TOKEN` – tietokannan REST-token
- `CONTROL_PANEL_TOKEN` – oma pitkä, salainen ohjauspaneelin tunnus

Ohjauspaneelin ja grafiikan pitää jakaa sama tallennettu ohjaustila. Siksi tarvitaan Upstash Redis (Vercelin palvelinmuistin sisältöä ei voi luotettavasti käyttää tallennukseen). Luo Upstash Redis -tietokanta ja kopioi sen REST URL ja token Vercelin ympäristömuuttujiin. Älä laita Swimify- tai Redis-avaimia HTML-tiedostoon.

Kun lisäät tai muutat ympäristömuuttujia, tee uusi deploy.

## 2. Osoitteet

Kun projekti on julkaistu esimerkiksi osoitteessa `https://OMA-PROJEKTI.vercel.app`:

- Ohjauspaneeli: `https://OMA-PROJEKTI.vercel.app/control.html`
- API:n testaus: `https://OMA-PROJEKTI.vercel.app/api/data`
- Grafiikka: Vercelin osoite `/` tai julkaise `index.html` GitHub Pagesiin ja muuta tiedoston `API_BASE` osoittamaan Vercel-projektiin.

## 3. Käyttö

1. Avaa `control.html` ja syötä `CONTROL_PANEL_TOKEN`.
2. Valitse **Automaattinen**, jos grafiikka seuraa aktiivista erää.
3. Valitse **Käsiohjaus** ja syötä Swimifyn erän ID, jos haluat lukita grafiikan tiettyyn erään.
4. Paina **Tallenna ohjaus**. Kaikki samaa API-projektia käyttävät grafiikat vaihtavat tilan noin sekunnin kuluessa.

Erän ID on Swimifyn `heat.id`-arvo, ei erän järjestysnumero. Tämä versio tarjoaa käsin syötettävän erä-ID:n; se ei vielä hae kaikkien kilpailun erien luetteloa paneeliin.

## 4. GitHub Pages ja OBS

Jos grafiikka julkaistaan GitHub Pagesissa, muuta `index.html`-tiedostossa `API_BASE` oman Vercel-projektin osoitteeksi. Lisää CORS-sallittuihin alkuperiin `api/data.js`-tiedostossa GitHub Pages -sivusi tarkka origin, jos se poikkeaa nykyisestä `https://ripsmooth.github.io`-osoitteesta.

OBS Browser Source käyttää grafiikan URL-osoitetta. Ohjauspaneeli avataan tavallisessa selaimessa erillisenä sivuna.

## Huomio

Ohjaustila tallentuu Upstash Redis -tietokantaan. Ilman Redis-ympäristömuuttujia käsiohjaus ei toimi ja API näyttää virheilmoituksen. Tunnus suojaa tilan muuttamisen; tilan lukeminen ei vaadi tunnusta.
