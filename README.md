# Swimify TV – GitHub Pages + Vercel proxy

Tämä ratkaisee GitHub Pagesin CORS-ongelman. GitHub Pages näyttää grafiikan ja Vercel `/api/data` hakee Swimifyn GraphQL-datan palvelinpuolella.

## 1. Vercel
1. Luo uusi Vercel-projekti tästä kansiosta.
2. Lisää Environment Variables:
   - `SWIMIFY_API_KEY` = alkuperäisen Swimify-version API-avain
   - `COMPETITION_ID` = `0e7de999-e30c-48fe-9e6e-599eb2fe05aa`
3. Deploy.
4. Testaa selaimessa: `https://OMA-PROJEKTI.vercel.app/api/data`
   Vastauksen pitäisi olla JSON ja sisältää `ok:true` tai ilmoitus aktiivisen erän puuttumisesta.

## 2. GitHub Pages
Kopioi `github/index.html` GitHub Pages -repositoryyn.
Muuta tiedoston alusta:
`const API_BASE='https://VAIHDA-TAMA.vercel.app';`
oman Vercel-projektisi osoitteeksi.

## 3. OBS
Käytä OBS Browser Source -lähteenä GitHub Pages -osoitetta.

API-avain ei ole GitHubissa eikä selaimessa, vaan Vercelin Environment Variables -asetuksessa.
