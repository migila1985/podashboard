# Exquiray PO Dashboard

Moderne React + Tailwind webapp voor product owners/service delivery management om lopende punten van Defensie en klantinteresse centraal te beheren.

## Stack keuze

- Frontend: React (Vite, hooks)
- Styling: Tailwind CSS
- Backend + Auth + DB: Supabase (PostgreSQL)
- Security: Supabase Auth + Row Level Security (RLS)

## Functionaliteiten

- Vier overzichtelijke lijsten:
  - Openstaande functionele punten (Defensie)
  - Nieuwe functionele wensen (Defensie)
  - Algemene wensen (Defensie)
  - Klantinteressepunten (met veld geinteresseerde klanten)
- Opmerkingen per punt met automatische datum/tijd
- Login/registratie per gebruiker
- Data is strikt per gebruiker gescheiden
- Responsive desktop-first UI
- Dark mode toggle

## Lokale start

1. Installeer dependencies:

```bash
npm install
```

2. Maak `.env` op basis van `.env.example` en vul Supabase waarden:

```bash
cp .env.example .env
```

3. Voer `supabase/schema.sql` uit in de Supabase SQL editor.

4. Start de app:

```bash
npm run dev
```

## Security & best practices

- RLS policies zorgen dat gebruikers alleen eigen data lezen/schrijven.
- `user_id` wordt server-side gezet via DB triggers.
- Input validatie op DB niveau met `check` constraints.
- Frontend gebruikt minimale state-updates voor snelle interactie.
