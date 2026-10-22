# Mijn Uitgaven

Responsive PWA (Vite + React + Tailwind) voor het analyseren van ING-banktransacties. Supabase is de database.

## Setup

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in.
3. Voer `supabase/schema.sql` uit in de Supabase SQL-editor.
4. `npm run dev`

**Demo-modus:** zonder Supabase-variabelen (of met `VITE_DEMO=true`) draait de app op localStorage. `VITE_DEMO_SEED=true` vult synthetische data.

## Tests

- Unit: `npm test`
- E2E (6 viewports: 375, 393, 430, tablet 820, 1366, 1920): `npx playwright test`
  - Zonder gedownloade browsers: `$env:PW_CHANNEL='msedge'`

## PWA / iPhone

Open de site in Safari, kies Deel → "Zet op beginscherm". De app start standalone. Alleen de app-shell wordt gecachet, nooit financiële data.

Het tijdelijke icoon staat in `public/icons`; vervang de bestanden of pas `scripts/make-icons.mjs` aan en draai `npm run icons`.
