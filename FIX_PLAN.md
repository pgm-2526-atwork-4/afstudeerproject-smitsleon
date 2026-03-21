# Fix Plan — Concert Buddy

> Gebaseerd op de geverifieerde bevindingen uit `analysis_report.md`.
> Items uit `REFACTOR_PLAN.md` Stap 10 (nog pending) zijn hier geïntegreerd.
> Elke stap bevat exacte bestands- en regelnummers zodat ze snel uitvoerbaar zijn.

---

## Prioriteit 1 — Beveiliging & Data-integriteit

### Stap 1: Push notificaties naar server-side verplaatsen

**Probleem:** `sendPushOnly()` in `src/core/pushNotifications.ts` (regel 127-140) stuurt push notifications rechtstreeks vanuit de client naar `https://exp.host/--/api/v2/push/send`. Dit lekt push tokens naar andere clients en is manipuleerbaar.

**Actie:**
- [ ] ~~Maak een Supabase Edge Function `send-push` aan die de Expo Push API aanroept~~ (teruggedraaid — Edge Function niet gedeployed)
- [ ] ~~Verplaats de fetch-logica uit `sendPushOnly()` naar die Edge Function~~
- [ ] ~~Laat `sendPushOnly()` de Edge Function aanroepen via `supabase.functions.invoke('send-push', { body: { targets } })`~~
- [ ] ~~Verwijder de directe `exp.host` fetch uit client-code~~

> **Status:** Teruggedraaid naar originele client-side implementatie. Edge Function vereist Supabase CLI deployment die momenteel niet beschikbaar is.

**Bestanden:**
- `src/core/pushNotifications.ts` — regels 86-150 (sendPushOnly functie)
- Nieuw: `supabase/functions/send-push/index.ts`

---

### Stap 2: FK inconsistentie oplossen (auth.users → public.users)

**Probleem:** Sommige migraties refereren naar `auth.users(id)`, andere naar `public.users(id)`. Dit is inconsistent; `public.users` is de juiste tabel (die bevat de app-data).

**Actie:**
- [x] Maak nieuwe migratie `023_fix_fk_references.sql` aan
- [x] Fix `concert_status.user_id`: ALTER FK van `auth.users(id)` → `public.users(id)`
- [x] Fix `notifications.user_id`: ALTER FK van `auth.users(id)` → `public.users(id)`
- [x] Fix `live_locations.user_id`: ALTER FK van `auth.users(id)` → `public.users(id)`
- [x] Fix `live_locations.receiver_id`: ALTER FK van `auth.users(id)` → `public.users(id)`

**Bron migraties (ter referentie):**
| Migratie | Regel | Kolom | Huidige referentie |
|----------|-------|-------|--------------------|
| `006_concert_status.sql` | 3 | `user_id` | `auth.users(id)` |
| `007_notifications.sql` | 4 | `user_id` | `auth.users(id)` |
| `009_meeting_point_coords_and_live_locations.sql` | 14 | `user_id` | `auth.users(id)` |
| `009_meeting_point_coords_and_live_locations.sql` | 16 | `receiver_id` | `auth.users(id)` |

**Migraties die WEL correct zijn (public.users):** 004, 005, 017 — niet aanpassen.

---

### Stap 3: Type unificatie — UserProfile & DbUser samenvoegen

**Probleem:** `UserProfile` (types.ts:48-59) en `DbUser` (database.types.ts:2-22) zijn bijna identiek, maar `DbUser` heeft extra veld `push_token` dat `UserProfile` mist. Twee bronnen van waarheid voor dezelfde tabel.

**Actie:**
- [x] Voeg `push_token: string | null` toe aan `UserProfile` in `src/core/types.ts`
- [x] Laat `DbUser` in `database.types.ts` afleiden van `UserProfile`: `export type DbUser = UserProfile`
- [x] Verwijder de duplicaat-interface uit `database.types.ts`
- [x] Controleer alle imports van `DbUser` en update indien nodig

**Bestanden:**
- `src/core/types.ts` — regels 48-59 (UserProfile)
- `src/core/database.types.ts` — regels 2-22 (DbUser)

---

### Stap 4: Type unificatie — Group & DbGroup samenvoegen

**Probleem:** `Group` (types.ts:69-77) mist `meeting_point_lat`, `meeting_point_lng`, `meeting_point_name` die `DbGroup` (database.types.ts:44-56) wel heeft. Zelfde probleem als Stap 3.

**Actie:**
- [x] Voeg `meeting_point_lat: number | null`, `meeting_point_lng: number | null`, `meeting_point_name: string | null` toe aan `Group` in `src/core/types.ts`
- [x] Laat `DbGroup` afleiden van `Group` (zonder de optionele UI-velden `member_count` en `is_member`)
- [x] Update imports waar nodig

**Bestanden:**
- `src/core/types.ts` — regels 69-77 (Group)
- `src/core/database.types.ts` — regels 44-56 (DbGroup)

---

## Prioriteit 2 — Stabiliteit & Correctheid

### Stap 5: Database indices toevoegen

**Probleem:** Veelgebruikte query-kolommen missen indices, wat performance degradeert bij groeiende data.

**Actie:**
- [ ] Maak migratie `024_add_indices.sql` aan met:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
  CREATE INDEX IF NOT EXISTS idx_buddies_user2 ON buddies(user_id_2);
  CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_concert_status_event ON concert_status(event_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  ```

**Bestanden:**
- Nieuw: `supabase/migrations/024_add_indices.sql`

---

### Stap 6: Error handling in hooks

**Probleem:** `useBuddyConcertStatus.ts` heeft geen enkele try/catch. `useHomeSections.ts` heeft een `Promise.all` zonder foutafhandeling voor individuele promises.

**Actie:**
- [ ] Wrap de async IIFE in `useBuddyConcertStatus.ts` (regels 16-28) in try/catch met `console.warn`
- [ ] Voeg per-promise error handling toe in `useHomeSections.ts` zodat één falende sectie niet alles breekt (gebruik `Promise.allSettled` of individuele try/catch)
- [ ] Voeg try/catch toe aan `useChat.ts` database operaties (overlap met REFACTOR_PLAN 10d)
- [ ] Voeg error handling toe aan admin CRUD operaties (overlap met REFACTOR_PLAN 10d)

**Bestanden:**
- `src/core/useBuddyConcertStatus.ts` — regels 16-28
- `src/core/useHomeSections.ts` — rond de Promise.all
- `src/core/useChat.ts` — database operaties
- `admin/src/pages/*.tsx` — CRUD operaties

---

### Stap 7: Resterende `any` types vervangen

**Probleem:** Er zijn nog ~14 `any` casts verspreid over de codebase na REFACTOR_PLAN Stap 7.

**Actie:**
- [x] `src/app/(tabs)/home.tsx` — regels 119, 158, 168: vervang `any` door juiste Supabase/app types
- [x] `src/app/(tabs)/profile.tsx` — regels 62, 73: typ de state/data
- [x] `src/app/(tabs)/chat.tsx` — regel 92: typ het subscription/message object
- [x] `src/app/(tabs)/calendar.tsx` — regel 103: typ het event object
- [x] `src/core/useChat.ts` — regels 106, 213, 223: typ de payload/message objects
- [x] `src/core/useLiveLocation.ts` — regels 51, 53, 86, 154: typ de locatie/subscription objects
- [x] `src/core/useChatImages.ts` — regel 76: typ het upload resultaat
- [x] `src/core/useConcerts.ts` — regel 21: typ de query response

**Aanpak:** Per bestand de `any` opzoeken, het Supabase return type afleiden, en een interface/type alias in `database.types.ts` toevoegen als dat nodig is.

---

### Stap 8: getBuddyIds() dubbele call fixen in useHomeSections

**Probleem:** `useHomeSections.ts` roept `getBuddyIds(user.id)` twee keer aan (regel 63 en 88) — dit zijn twee identieke netwerkcalls.

**Actie:**
- [x] Haal `getBuddyIds()` één keer op vóór de `Promise.all`
- [x] Geef het resultaat door aan beide secties (buddyGoing en buddyInterested)

**Bestanden:**
- `src/core/useHomeSections.ts` — regels 63 en 88

---

### Stap 9: favourite-venues.tsx registreren in Stack

**Probleem:** `src/app/favourite-venues.tsx` bestaat maar is niet geregistreerd in `_layout.tsx` (regels 127-139). Expo Router kan het scherm wel resolven via bestandsnaam, maar expliciete registratie is best practice voor animaties en opties.

**Actie:**
- [x] Voeg `<Stack.Screen name="favourite-venues" />` toe na de `favourite-artists` regel in `_layout.tsx`
- [x] Controleer of `my-concerts` ook geregistreerd is; zo niet, voeg die ook toe

**Bestanden:**
- `src/app/_layout.tsx` — regel 138 (na `favourite-artists`)

---

### Stap 10: birth_date migratie toevoegen

**Probleem:** `birth_date` wordt gebruikt in de code (`types.ts`, `edit-profile.tsx`) maar ontbreekt in de SQL migraties. De kolom bestaat waarschijnlijk in de live database maar niet in versiebeheer.

**Actie:**
- [ ] Controleer of `birth_date` al in een migratie staat (zoek in alle `.sql` bestanden)
- [ ] Zo niet: maak migratie `025_add_birth_date.sql` aan:
  ```sql
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date date;
  ```

**Bestanden:**
- `supabase/migrations/` — doorzoeken op `birth_date`
- Eventueel nieuw: `supabase/migrations/025_add_birth_date.sql`

---

## Prioriteit 3 — Code Quality

### Stap 11: Create Group Modal extraheren uit concert/[id].tsx

**Probleem:** `concert/[id].tsx` is 756 regels. De "Groep aanmaken" modal (regels 412-455) is een zelfstandig blok dat extractie verdient.

**Actie:**
- [x] Maak `src/components/functional/CreateGroupModal.tsx` aan
- [x] Verplaats modal-state (`groupName`, `groupDesc`, `maxMembers`) en submit-logica
- [x] Importeer en gebruik de nieuwe component in `concert/[id].tsx`
- [x] Controleer of het bestand significant korter is geworden

**Bestanden:**
- `src/app/concert/[id].tsx` — regels 412-455
- Nieuw: `src/components/functional/CreateGroupModal.tsx`

---

### Stap 12: Cleanups uit REFACTOR_PLAN Stap 10

**Probleem:** De resterende items uit het originele refactorplan.

**Actie:**
- [x] **10a:** Voeg `FavouritesScreen` toe aan `src/components/design/index.ts` barrel export
- [x] **10b:** ~~Vervang `require('../../../assets/logo/logo-green.png')` in `LoginForm.tsx` door `@/` alias~~ — N.v.t.: `@/` mapt naar `./src/*` en `assets/` staat in de project root; het relatieve pad is correct.
- [x] **10c:** `src/core/messages.ts` aangemaakt met `MSG` constanten en `errorRetry()` helper; 6 hardcoded Alert.alert-strings in `concert/[id].tsx` en 10 in `group/[id].tsx` vervangen
- [ ] **10d:** (Geïntegreerd in Stap 6 hierboven)

---

### Stap 13: Ongebruikte dependencies verwijderen

**Probleem:** 6 packages in `package.json` worden nergens geïmporteerd.

**Actie:**
- [ ] Verifieer met `grep -r` dat deze packages nergens gebruikt worden:
  - `expo-haptics`
  - `expo-symbols`
  - `expo-web-browser`
  - `expo-splash-screen`
  - `expo-font`
  - `expo-image`
- [ ] Verwijder bevestigd ongebruikte packages met `npx expo install --fix` of `npm uninstall`

**Let op:** `expo-splash-screen` en `expo-font` kunnen via `app.json` config gebruikt worden zonder expliciete import. Controleer `app.json` plugins.

---

### Stap 14: Hardcoded kleuren en inline styles opruimen

**Probleem:** `calendar.tsx` regel 411 heeft hardcoded `'#fff'`. `concert/[id].tsx` regels 263-269 hebben inline styles.

**Actie:**
- [ ] Vervang `'#fff'` in `calendar.tsx` door `theme.colors.text` of `theme.colors.white`
- [ ] Verplaats inline styles in `concert/[id].tsx` naar StyleSheet
- [ ] Doe een snelle `grep` op `'#` in `/src` voor andere hardcoded kleuren die gemist zijn

---

### Stap 15: Database schema cleanup (optioneel)

**Probleem:**
- `events.time` is een `text` kolom apart van `events.date` (timestamptz). Beter samengevoegd.
- `users.age` kolom is redundant want `calculateAge(birth_date)` berekent het al.

**Actie:**
- [ ] **age kolom:** Evalueer of `age` verwijderd kan worden, of dat het als cache-kolom dienst doet (bijv. voor queries). Zo ja, documenteer. Zo niet, maak migratie om te verwijderen.
- [ ] **events.time:** Evalueer impact van merge naar `date` timestamptz. Dit raakt `dbRowToEvent()` in `types.ts`, de sync-script, en alle event-queries. Mogelijk te invasief — markeer als "future improvement" als de impact te groot is.

---

## Prioriteit 4 — Nice-to-have

### Stap 16: Barrel exports aanvullen (overige)

**Probleem:** `GroupEditModal`, `MeetingPointModal`, `MembersList` missen in barrel exports.

**Actie:**
- [ ] Zoek alle component index.ts bestanden en vul ontbrekende exports aan
- [ ] Controleer of imports elders via barrel of direct pad gaan; maak consistent

---

### Stap 17: Test infrastructure opzetten (optioneel)

**Probleem:** Geen enkele test in het project.

**Actie:**
- [ ] Installeer Jest + React Native Testing Library
- [ ] Maak basis config (`jest.config.js`)
- [ ] Schrijf 1 unit test voor `calculateAge()` in `types.ts` als proof of concept
- [ ] Schrijf 1 unit test voor `distanceKm()` in `utils.ts`

---

## Samenvatting

| # | Stap | Prioriteit | Impact |
|---|------|-----------|--------|
| 1 | Push notificaties → server-side | 🔴 Hoog | Beveiliging |
| 2 | FK references fixen | 🔴 Hoog | Data-integriteit |
| 3 | UserProfile/DbUser unificatie | 🔴 Hoog | Type safety |
| 4 | Group/DbGroup unificatie | 🔴 Hoog | Type safety |
| 5 | Database indices | 🟡 Medium | Performance |
| 6 | Error handling in hooks | 🟡 Medium | Stabiliteit |
| 7 | Resterende `any` types | 🟡 Medium | Type safety |
| 8 | getBuddyIds() dubbele call | 🟡 Medium | Performance |
| 9 | favourite-venues Stack registratie | 🟡 Medium | Correctheid |
| 10 | birth_date migratie | 🟡 Medium | Schema volledigheid |
| 11 | Create Group Modal extraheren | 🟢 Laag | Code quality |
| 12 | REFACTOR_PLAN Stap 10 afronden | 🟢 Laag | Polish |
| 13 | Ongebruikte dependencies | 🟢 Laag | Bundle size |
| 14 | Hardcoded kleuren/inline styles | 🟢 Laag | Consistentie |
| 15 | DB schema cleanup (age/time) | 🟢 Laag | Schema design |
| 16 | Barrel exports aanvullen | ⚪ Nice-to-have | DX |
| 17 | Test infrastructure | ⚪ Nice-to-have | Kwaliteitsborging |
