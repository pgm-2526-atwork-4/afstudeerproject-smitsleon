# Grondige Analyse — Concert Buddy (React Native / Expo)

> Analyse van de volledige codebase: folderstructuur, code-kwaliteit, best practices, database-ontwerp en verbeterpunten.

---

## 1. Folderstructuur — Beoordeling: ⭐⭐⭐⭐ (Goed)

De structuur volgt grotendeels de Expo Router conventies en is logisch opgezet:

```
src/
├── app/                # Expo Router file-based routing
│   ├── (tabs)/         # Tabbar: home, calendar, chat, profile, register
│   ├── artist/[id]     # Detail screens
│   ├── concert/[id]
│   ├── group/[id] + chat
│   ├── user/[id]
│   ├── venue/[id]
│   └── diverse losse screens (buddies, notifications, onboarding, etc.)
├── components/
│   ├── design/         # 22 presentatie-componenten
│   └── functional/     # 2 auth-formulieren
├── core/               # Hooks, context, types, Supabase client
└── style/              # Theme tokens + auth styles
```

### ✅ Wat goed is
- Duidelijke scheiding `design/` vs `functional/` componenten
- Barrel exports ([index.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/components/design/index.ts)) in component-mappen
- `core/` bevat hooks, context, en types netjes bij elkaar
- Theme tokens (`Colors`, `Spacing`, `Radius`, `FontSizes`) worden consequent gebruikt

### ⚠️ Verbeterpunten

| Probleem | Aanbeveling |
|----------|-------------|
| `core/` mengt hooks, types, context, utils, en de Supabase client door elkaar | Splits in submappen: `core/hooks/`, `core/types/`, `core/lib/` (supabase, push, location) |
| [core/types.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts) bevat zowel types als functies ([dbRowToEvent](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#108-122), [calculateAge](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#123-133)) | Verplaats utilities naar [core/utils.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/utils.ts) |
| `screens/` map op root bevat alleen screenshots, geen code | Verplaats naar `assets/screenshots/` of verwijder |
| `admin/` is een apart Vite-project in dezelfde repo | Overweeg een monorepo-tool (turborepo/nx) of een apart repo |
| [REFACTOR_PLAN.md](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/REFACTOR_PLAN.md) staat op root — project-documentatie | Prima, maar overweeg een `docs/` map bij groei |
| [favourite-venues.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/favourite-venues.tsx) route mist in [_layout.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/_layout.tsx) Stack registratie | Voeg toe aan de Stack definitie |

---

## 2. Type-systeem — Beoordeling: ⭐⭐⭐ (Redelijk)

### 🔴 Kritiek: Dubbele type-definities

[UserProfile](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#64-81) in [types.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#L64-L80) en [DbUser](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#6-24) in [database.types.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#L6-L23) zijn bijna identiek maar wijken subtiel af:

```diff
 // types.ts — UserProfile
- push_token ontbreekt
+ id is string (niet uuid)

 // database.types.ts — DbUser
+ push_token: string | null  (extra veld)
+ id is string
```

**Aanbeveling:** Definieer [DbUser](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#6-24) als de bron van waarheid en leid [UserProfile](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#64-81) ervan af:
```typescript
export type UserProfile = Omit<DbUser, 'push_token'>;
```

### 🟡 Resterende `as any` casts

Na de eerdere refactoring is het sterk verbeterd, maar er resteren nog:

| Bestand | Locatie | Probleem |
|---------|---------|----------|
| [useChatImages.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#L76) | L76 | `} as any` op FormData append — RN-specifiek, moeilijk te vermijden |
| [useConcerts.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useConcerts.ts#L21) | L21 | `let queryObj: any` — gebruikt om Supabase query builder typing te omzeilen |
| [home.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/(tabs)/home.tsx#L92) | L92, 119 | [(row: any)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10) in searchPeople en artist/venue mapping |
| [profile.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/(tabs)/profile.tsx#L62) | L62, 73 | [(row: any)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10) in favourites mapping |
| [chat.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/(tabs)/chat.tsx#L92) | L92 | [(row: any)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10) in group chats mapping |
| [calendar.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/(tabs)/calendar.tsx#L103) | L103 | [(e: any)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10) in event mapping |
| [useChat.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChat.ts#L106) | L106, 213 | [(m: any)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10) in push notification en message parsing |
| [useLiveLocation.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useLiveLocation.ts#L51-L53) | L51-53, 86, 154 | [(l: any)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10), [(payload: any)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10), `Record<string, any>` |

**Aanbeveling:** Gebruik de reeds gedefinieerde types uit [database.types.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts) met Supabase's generic typing:
```typescript
const { data } = await supabase
  .from('events')
  .select('*')
  .returns<DbEvent[]>();
```

### 🟡 [Group](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#95-107) interface mist velden
De [Group](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#95-107) interface in [types.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#L95-L106) mist `meeting_point_lat`, `meeting_point_lng`, `meeting_point_name` die wel in [DbGroup](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#40-53) en het schema staan.

---

## 3. Schermgrootte en Component-architectuur — Beoordeling: ⭐⭐⭐ (Redelijk)

### 🔴 Oversized screen-bestanden

| Bestand | Regels | Probleem |
|---------|--------|----------|
| [concert/[id].tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/concert/[id].tsx) | 757 | Bevat inline Modal, group-join logica, status-toggling — ~40% is StyleSheet |
| [home.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/(tabs)/home.tsx) | 720 | 3 modi (sections/search/people) in één component — ~25% is StyleSheet |
| [chat.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/(tabs)/chat.tsx) | 483 | Redelijk, maar [renderChatItem](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/%28tabs%29/chat.tsx#258-330) bevat ingewikkelde unread-logica inline |
| [calendar.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/(tabs)/calendar.tsx) | 416 | OK maar data-fetching en UI zijn sterk vermengd |

**Aanbevelingen:**
1. **`concert/[id].tsx`**: Extraheer de "Create Group Modal" naar een apart component (vergelijkbaar met de eerdere `GroupEditModal` extractie)
2. **[home.tsx](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/%28tabs%29/home.tsx)**: Split in `HomeSearchResults`, [HomeSections](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useHomeSections.ts#8-20), `HomePeopleSearch` subcomponenten
3. Verplaats inline `StyleSheet.create()` blokken naar aparte `*.styles.ts` bestanden bij schermen >300 regels

### ✅ Goed opgezette componenten
De `design/` componenten zijn compact en herbruikbaar: `ConcertCard` (95 regels), `PersonCard` (77 regels), `UserAvatar` (32 regels), `EmptyState` (28 regels). **Dit is uitstekend.**

---

## 4. Hooks en Data-fetching — Beoordeling: ⭐⭐⭐ (Redelijk)

### 🟡 Dubbele [getBuddyIds](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/utils.ts#16-29) call in [useHomeSections](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useHomeSections.ts#23-264)

In [useHomeSections.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useHomeSections.ts#L63) wordt [getBuddyIds()](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/utils.ts#16-29) nog steeds 2x aangeroepen (L63 en L88) — eenmaal voor "buddies going" en eenmaal voor "buddies interested". Dit kan worden geoptimaliseerd:

```typescript
const buddyIds = user ? await getBuddyIds(user.id) : [];
// Hergebruik voor beide secties
```

### 🟡 Ontbrekende error handling

| Hook | Probleem |
|------|----------|
| [useBuddyConcertStatus.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useBuddyConcertStatus.ts) | Geen try/catch, geen error state — silent failure |
| [useHomeSections.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useHomeSections.ts) | Geen error handling rond `Promise.all` — als één sectie faalt, falen ze allemaal |
| [useLiveLocation.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useLiveLocation.ts) | Geen cleanup van `query.then()` — geen cancellation support |

**Aanbeveling:** Voeg minimaal `try/catch` en een `error` state toe aan alle hooks. Gebruik `Promise.allSettled` in plaats van `Promise.all` voor onafhankelijke secties.

### 🟡 Ontbrekende loading/stale-data management

Geen gebruik van een data-fetching library (TanStack Query, SWR). Alle hooks gebruiken handmatige `useState` + `useEffect` patronen. Dit is acceptabel voor een project van deze schaal, maar zorgt voor:
- Geen automatische cache-invalidatie
- Geen stale-while-revalidate
- Handmatige `useFocusEffect` refresh overal

---

## 5. Database Schema — Beoordeling: ⭐⭐⭐⭐ (Goed)

### ✅ Goed ontworpen
- Proper genormaliseerd schema (junction tables voor `event_artists`, `favourite_artists`, etc.)
- Composite primary keys waar logisch (`buddies`, `concert_status`, `group_members`)
- CHECK constraints op `status` velden
- Soft deletes via `deleted_at` op messages
- `blocked_at` patroon voor user blocking

### 🔴 Inconsistente FK-referenties

De `users`-tabel heeft een FK naar `auth.users(id)`, maar sommige tabellen refereren naar **`auth.users`** en andere naar **`public.users`**:

| Tabel | FK Target | Zou moeten zijn |
|-------|-----------|----------------|
| `concert_status.user_id` | `auth.users(id)` | `public.users(id)` ✗ |
| `live_locations.user_id` | `auth.users(id)` | `public.users(id)` ✗ |
| `live_locations.receiver_id` | `auth.users(id)` | `public.users(id)` ✗ |
| `notifications.user_id` | `auth.users(id)` | `public.users(id)` ✗ |
| Alle andere tabellen | `public.users(id)` | ✅ |

**Impact:** Dit maakt het mogelijk om een `concert_status` aan te maken voor een `auth.users` entry die nog geen `public.users` profiel heeft. De FK zou naar `public.users(id)` moeten wijzen voor consistentie en om data-integriteit met je profielgegevens te garanderen.

### 🟡 Ontbrekende indices

Veelgebruikte queries filteren op:
- `concert_status.event_id` + `concert_status.user_id` — PK dekt dit ✅
- `group_members.user_id` — geen expliciete index (PK is [(group_id, user_id)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10))
- `buddies.user_id_2` — geen index (PK is [(user_id_1, user_id_2)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#6-10) — queries filteren op `OR(user_id_1, user_id_2)`)
- `events.date` — geen expliciete index (veelgebruikt in `WHERE date >= now()`)
- `private_messages.sender_id` / `receiver_id` — geen index (zware query in chat overzicht)
- `notifications.user_id` + `read` — geen composite index

**Aanbeveling:** Voeg indices toe voor de meest gebruikte query patterns:
```sql
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_buddies_user_id_2 ON buddies(user_id_2);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX idx_private_messages_receiver ON private_messages(receiver_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
```

### 🟡 `events.time` als [text](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/AuthContext.tsx#8-18) kolom

Het `time` veld is opgeslagen als [text](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/AuthContext.tsx#8-18), terwijl `date` een `timestamptz` is. Dit maakt het onmogelijk om op tijdstip te sorteren of filteren op database-niveau.

**Aanbeveling:** Combineer datum en tijd in het bestaande `date` veld (dat al een `timestamptz` is). Het afzonderlijke `time` veld is dan redundant.

### 🟡 `users.age` kolom is redundant

Er is zowel [age](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#61-69) als `birth_date` in de `users` tabel. De [age](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#61-69) kolom raakt verouderd en de app berekent leeftijd al via [calculateAge(birth_date)](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#123-133). Het [age](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#61-69) veld wordt nergens in de app-code ingesteld of gelezen vanuit de database.

---

## 6. Beveiliging — Beoordeling: ⭐⭐⭐ (Redelijk)

### 🔴 Push notificaties via Expo Push API vanuit de client

In [pushNotifications.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/pushNotifications.ts#L131-L143) worden push notificaties direct vanuit de client naar `exp.host` gestuurd. Dit betekent dat **elke gebruiker push tokens van andere gebruikers kan lezen** uit de `users` tabel.

**Aanbeveling:** Verplaats push-notificatie verzending naar een Supabase Edge Function of database-trigger. Dit voorkomt dat push tokens client-side zichtbaar zijn.

### 🟡 RLS (Row Level Security)

Niet zichtbaar in het schema dat je deelde, maar essentieel: zorg ervoor dat alle tabellen RLS-policies hebben. Gebruik `mcp_supabase-mcp-server_get_advisors` met type "security" om dit te controleren.

### 🟡 [.env](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/.env) file in root

De [.env](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/.env) file staat in de repository root. Zorg ervoor dat deze in [.gitignore](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/.gitignore) staat (de [.gitignore](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/.gitignore) lijkt 537 bytes, dus waarschijnlijk is dit al het geval).

---

## 7. Overige Verbeterpunten

### Barrel export gaps

De barrel export in [design/index.ts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/components/design/index.ts) mist:
- `FavouritesScreen` (al genoteerd in REFACTOR_PLAN stap 10a)
- `GroupEditModal`
- `MeetingPointModal`  
- `MembersList`

### Stijl-inconsistenties

| Locatie | Probleem |
|---------|----------|
| [concert/[id].tsx L263-269](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/concert/[id].tsx#L263-L269) | Inline styles `{{ color: Colors.textSecondary }}` i.p.v. StyleSheet |
| [_layout.tsx L90](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/_layout.tsx#L90) | Inline styles voor loading spinner |
| [calendar.tsx L411](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/app/(tabs)/calendar.tsx#L411) | Hardcoded `'#fff'` kleur |

### Ongebruikte dependencies (mogelijks)

| Dependency | Gebruikt? |
|------------|-----------|
| `expo-haptics` | Niet gevonden in src-code |
| `expo-symbols` | Niet gevonden in src-code |
| `expo-web-browser` | Niet gevonden in src-code |
| `expo-splash-screen` | Niet geïmporteerd in code (wellicht via app.json config) |
| `expo-font` | Niet geïmporteerd (mogelijk via Expo default config) |
| `expo-image` | Niet geïmporteerd (alleen RN [Image](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useChatImages.ts#11-100) wordt gebruikt) |

**Aanbeveling:** Verwijder ongebruikte dependencies om de bundle-size te verkleinen. Let op: sommige Expo-modules worden indirect geladen via het build-systeem.

### Ontbrekende test-infrastructuur

Er zijn **geen tests** in het project — geen unit tests, geen component tests, geen integration tests. Voor een project van deze complexiteit (40+ bestanden, 15+ schermen, realtime chat, locatie-sharing) is dit een risico.

**Aanbeveling:** Begin minimaal met:
1. Unit tests voor utility-functies ([calculateAge](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#123-133), [distanceKm](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/utils.ts#3-15), [dbRowToEvent](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#108-122))
2. Hook tests voor business logic ([useConcerts](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useConcerts.ts#5-109), [useHomeSections](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/useHomeSections.ts#23-264))

---

## 8. Samenvatting Prioriteiten

| Prio | Item | Impact |
|------|------|--------|
| 🔴 1 | Push notificaties naar server-side verplaatsen | **Beveiliging** |
| 🔴 2 | FK inconsistenties fixen (`auth.users` → `public.users`) | **Data-integriteit** |
| 🔴 3 | [UserProfile](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#64-81) / [DbUser](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#6-24) duplicatie oplossen | **Onderhoudbaarheid** |
| 🟡 4 | Database indices toevoegen | **Performance** |
| 🟡 5 | Error handling in hooks verbeteren | **Stabiliteit** |
| 🟡 6 | Resterende `as any` casts opruimen | **Type safety** |
| 🟡 7 | Grote schermen opsplitsen (home, concert detail) | **Leesbaarheid** |
| 🟢 8 | Ongebruikte dependencies verwijderen | **Bundle size** |
| 🟢 9 | Barrel exports aanvullen | **DX / Consistentie** |
| 🟢 10 | Test-infrastructuur opzetten | **Kwaliteitsborging** |

---

## 9. Eindoordeel

Het project is **goed opgebouwd** voor een afstudeerproject — de folderstructuur is logisch, het design-systeem met theme-tokens is consequent, en de eerdere refactoring (zie [REFACTOR_PLAN.md](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/REFACTOR_PLAN.md)) heeft veel verbeteringen aangebracht. De component-architectuur met herbruikbare `design/` componenten en custom hooks laat zien dat er bewust over structuur is nagedacht.

De belangrijkste aandachtspunten zijn:
1. **Beveiliging**: De client-side push notification implementatie is het grootste risico
2. **Database**: FK-inconsistenties en ontbrekende indices
3. **Type safety**: De duplicatie [UserProfile](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/types.ts#64-81)/[DbUser](file:///c:/Users/leons/Documents/graduaat-programmeren/jaar2/atwork4/concert-buddy/src/core/database.types.ts#6-24) en resterende `any` casts

Over het geheel genomen: een **solide project** met een paar verbeterpunten die het naar een hoger niveau tillen.
