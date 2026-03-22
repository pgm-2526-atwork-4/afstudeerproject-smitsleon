# Concert Buddy

Een mobiele app waarmee concertgangers in Belgie concerten ontdekken, vrienden vinden die naar dezelfde events gaan en samen hun concertbezoek coordineren.

## Features

- **Eventontdekking:** Belgische concerten zoeken en filteren op datum, artiest of venue
- **Buddy-systeem:** Vrienden toevoegen en zien wie naar welk concert gaat
- **Groepen:** Groepen aanmaken per concert met meeting point, realtime chat en foto's
- **Live locatie:** GPS-coordinaten delen binnen een groep tijdens het concert
- **Vibe tags:** Matchen op concertbeleving (Moshen, Zingen, Dansen, VIP, ...)
- **Push notificaties:** Meldingen bij buddy-verzoeken, groepsacties en berichten
- **Admin-panel:** Webinterface voor beheer van events, artiesten, venues en rapportages

## Tech stack

| Categorie | Technologie |
|---|---|
| Mobile app | React Native, Expo, TypeScript |
| Navigatie | Expo Router (file-based routing) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Admin-panel | React, Vite, Tailwind CSS |
| Externe API | Ticketmaster Discovery API v2 |
| Build | EAS (Expo Application Services) |

## Projectstructuur

```
src/
  app/          Schermen en routing (Expo Router)
  components/   Herbruikbare UI-componenten (design/ en functional/)
  core/         Context, hooks, types en libraries
  style/        Theme-tokens (kleuren, spacing, typografie)
admin/          Apart React-webpanel voor beheer
scripts/        Sync-script voor Ticketmaster events
```

## Automatische event-sync

Een GitHub Actions workflow (`sync-events.yml`) draait dagelijks om 06:00 UTC. Het script `scripts/sync-events.ts` haalt alle Belgische muziekevents op via de Ticketmaster Discovery API en synchroniseert venues, artiesten, events en event-artiest koppelingen naar Supabase. De workflow kan ook handmatig gestart worden via GitHub.

## Aan de slag

```bash
# Installeer dependencies
npm install

# Start de Expo dev server
npx expo start

# Start het admin-panel
cd admin && npm install && npm run dev
```

Maak een `.env`-bestand aan in de root met de volgende variabelen:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_TICKETMASTER_API_KEY=...
```
