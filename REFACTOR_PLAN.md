# Refactor Plan - Concert Buddy

> Dit document beschrijft alle verbeterpunten gevonden tijdens een grondige code-analyse.
> We overlopen elk punt stap voor stap en vinken ze af wanneer ze klaar zijn.

---

## Stap 1: Gedeelde utility `distanceKm()` extraheren

**Probleem:** De Haversine-afstandsberekening (10 regels) staat exact gekopieerd in 2 bestanden.

**Waar:**
- `src/core/useHomeSections.ts` (regels 20-29)
- `src/app/section-events.tsx` (regels 14-23)

**Actie:**
- [x] Maak `src/core/utils.ts` aan met de `distanceKm()` functie
- [x] Importeer deze in `useHomeSections.ts` en `section-events.tsx`
- [x] Verwijder de lokale kopieën

---

## Stap 2: Gedeelde utility `getBuddyIds()` extraheren

**Probleem:** Het ophalen van buddy-IDs (query + map) is 4-5x gekopieerd.

**Waar:**
- `src/app/buddies.tsx`
- `src/core/useBuddyConcertStatus.ts`
- `src/core/useHomeSections.ts` (2x)
- `src/app/section-events.tsx` (2x)

**Actie:**
- [x] Maak `getBuddyIds(userId: string)` aan in `src/core/utils.ts`
- [x] Vervang alle instanties door een import van deze utility

---

## Stap 3: `group/[id].tsx` opsplitsen (1.089 regels → subcomponenten)

**Probleem:** Dit is het grootste en meest complexe bestand in het project: 13 `useState` variabelen, twee modals met ~80% gedeelde code, en afgeleide state (`isAdmin`, `isMember`) die elke render opnieuw wordt berekend.

**Actie:**
- [x] Extraheer `<MeetingPointModal>` naar `src/components/design/MeetingPointModal.tsx`
- [x] Extraheer `<GroupEditModal>` naar `src/components/design/GroupEditModal.tsx`
- [x] Extraheer `<MembersList>` naar `src/components/design/MembersList.tsx`
- [x] Wrap `isAdmin`, `isMember`, `adminCount` in `useMemo`

---

## Stap 4: `section-events.tsx` switch refactoren

**Probleem:** Een 200+ regels switch-statement met 7 cases. De cases `buddies` en `buddyInterested` zijn bijna identiek (enkel `'going'` vs `'interested'` verschilt).

**Actie:**
- [x] Maak per section-type een aparte fetch-functie (bijv. `fetchUpcoming()`, `fetchBuddyEvents()`, etc.)
- [x] Gebruik een strategy-object/map om het juiste fetch-functie aan te roepen
- [x] Hergebruik de `getBuddyIds()` utility uit Stap 2

---

## Stap 5: Hardcoded kleuren vervangen door theme constanten

**Probleem:** 6 bestanden gebruiken hardcoded hex-kleuren in plaats van het theme systeem.

| Bestand | Hardcoded waarde | Oplossing |
|---------|-----------------|-----------|
| `src/app/(tabs)/calendar.tsx` | `'#FFB800'`, `'#4A90D9'` | Voeg `statusInterested` en `statusGroup` toe aan `Colors` |
| `src/core/pushNotifications.ts` | `'#1DB954'` | Vervang door `Colors.primary` |
| `src/app/group/[id].tsx` | `'#8B1A1A'` | Voeg `dangerDark` toe aan `Colors` of gebruik `Colors.error` |
| `src/app/onboarding.tsx` | `"#ffffff"` | Vervang door `Colors.text` |
| `src/app/edit-profile.tsx` | `"#ffffff"` | Vervang door `Colors.text` |
| `src/components/design/FilterModal.tsx` | `'#FFFFFF'` | Vervang door `Colors.text` |

**Actie:**
- [x] Voeg ontbrekende kleuren toe aan `src/style/theme.ts`
- [x] Vervang alle hardcoded waarden in bovenstaande bestanden

---

## Stap 6: Validatie toevoegen aan `FilterModal`

**Probleem:** Er is geen validatie — einddatum kan vóór startdatum liggen, en `minGroupSize` kan groter zijn dan `maxGroupSize`.

**Actie:**
- [x] Voeg datumvalidatie toe: `endDate >= startDate`
- [x] Voeg groepsgrootte-validatie toe: `minGroupSize <= maxGroupSize`
- [x] Toon duidelijke feedback aan de gebruiker bij ongeldige input

---

## Stap 7: `any` types vervangen door correcte Supabase types

**Probleem:** 50+ plekken met `as any` of `: any` casts, voornamelijk bij Supabase query resultaten.

**Zwaarst getroffen bestanden:**
- `src/app/section-events.tsx` (10+)
- `src/core/useHomeSections.ts` (8+)
- `src/app/concert/[id].tsx` (7+)
- `src/core/useBuddyConcertStatus.ts` (4)
- `src/app/group/[id].tsx` (3)

**Actie:**
- [x] Maak interfaces aan voor veelgebruikte Supabase query results
- [x] Gebruik de reeds bestaande types uit `src/core/database.types.ts` waar mogelijk
- [x] Vervang `any` casts stap voor stap per bestand

---

## Stap 8: `formatMessageTime` hergebruiken in chat.tsx

**Probleem:** `src/app/(tabs)/chat.tsx` definieert een eigen `formatMessageTime()` terwijl `useChat.ts` al `formatTime()` en `formatDateSeparator()` exporteert die door andere chat-pagina's (group/chat.tsx, private-chat.tsx) correct worden geïmporteerd.

**Actie:**
- [x] Verwijder de lokale `formatMessageTime()` uit `chat.tsx`
- [x] Importeer en gebruik de bestaande utilities uit `useChat.ts`
- [x] Pas de chat-lijst formatting aan zodat het dezelfde helpers gebruikt

---

## Stap 9: Admin panel DRY maken

**Probleem:** ArtistsPage ↔ VenuesPage (~290 regels duplicatie) en ArtistDetailPage ↔ VenueDetailPage (~360 regels duplicatie) bevatten bijna identieke code.

**Actie:**
- [ ] Maak een generieke `<EntityListPage>` component die geconfigureerd kan worden per entity-type
- [ ] Maak een generieke `<EntityDetailPage>` component
- [ ] Refactor ArtistsPage en VenuesPage om de generieke component te gebruiken
- [ ] Refactor ArtistDetailPage en VenueDetailPage

---

## Stap 10: Kleine opruimpunten

### 10a: Barrel export aanvullen
- [ ] Voeg `FavouritesScreen` toe aan `src/components/design/index.ts`

### 10b: Import pad fixen
- [ ] Vervang `require('../../../assets/logo/logo-green.png')` in `LoginForm.tsx` door het `@/` alias

### 10c: Dubbele alert-strings centraliseren
- [ ] Maak `src/core/constants/messages.ts` aan met gedeelde foutmeldingen
- [ ] Vervang hardcoded strings in `concert/[id].tsx` en `group/[id].tsx`

### 10d: Error handling consistenter maken
- [ ] Voeg try/catch toe aan `useChat.ts` database operaties
- [ ] Voeg error handling toe aan admin CRUD operaties

---

## Samenvatting

| Stap | Omschrijving | Impact |
|------|-------------|--------|
| 1 | `distanceKm()` extraheren | Code duplicatie weg |
| 2 | `getBuddyIds()` extraheren | 4+ bestanden opgeschoond |
| 3 | `group/[id].tsx` opsplitsen | Grootste bestand opgeruimd |
| 4 | `section-events.tsx` refactoren | 200+ regels switch weg |
| 5 | Theme kleuren fixen | Consistentie |
| 6 | FilterModal validatie | UX bug fix |
| 7 | `any` types vervangen | Type safety |
| 8 | Date formatting hergebruiken | DRY |
| 9 | Admin panel DRY | ~650 regels minder |
| 10 | Kleine opruimpunten | Polish |
