# Ana Quran Mobile

The iOS and Android app for **Ana Quran** (Rayan Academy), built with
Expo/React Native and TypeScript. It is a native client for the existing
ASP.NET Core API — no backend changes, no duplicated endpoints, and no mock
production data.

- Endpoint-by-endpoint mapping: [`API_MAPPING.md`](./API_MAPPING.md)
- Shared API contract: [`../FE/docs/dotnet-integration.md`](../FE/docs/dotnet-integration.md)
- Repository overview: [`../README.md`](../README.md)

---

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Expo SDK 58, React Native 0.88, React 19 |
| Language | TypeScript (strict) |
| Routing | Expo Router 58 (file-based) |
| Data | TanStack Query 5 |
| Validation | Local validators (`src/lib/validation.ts`) + server validation errors |
| Secure storage | `expo-secure-store` (identity cache and theme only) |
| Live lessons | Jitsi External API in `react-native-webview` |
| Media | `expo-camera`, `expo-audio`, `expo-image-picker`, `expo-image-manipulator` |
| Notifications | `expo-notifications` (local lesson reminders only) |
| Connectivity | `@react-native-community/netinfo` |
| Tests | Vitest |

---

## Requirements

- Node.js 20 LTS or newer and npm.
- For local native builds: Xcode (iOS) and/or Android Studio.
- For cloud builds: an Expo account and EAS CLI (`npx eas-cli@latest`).
- The API must be reachable over HTTPS. Defaults target
  `https://anaquran.runasp.net`.

`ios/` and `android/` are **not** committed. Expo generates them from
`app.config.ts` (Continuous Native Generation). Never edit them by hand.

---

## Quick start

```bash
cd mobile
npm install
cp .env.example .env.local   # optional; production defaults are built in
npm start
```

Then press `i` for the iOS simulator, `a` for an Android emulator, or scan the
QR code with Expo Go.

`.env.example`:

```dotenv
EXPO_PUBLIC_API_URL=https://anaquran.runasp.net
EXPO_PUBLIC_JITSI_DOMAIN=meet.jit.si
```

- Values are read from `EXPO_PUBLIC_*` first, then from `app.config.ts`'s
  `extra` block.
- Production values are baked into `app.config.ts`, so a production build does
  not depend on a developer's local `.env`.
- `.env*.local` is git-ignored. `EXPO_PUBLIC_*` values are embedded in the JS
  bundle and are **not** secrets.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `npm run android` | Build and run a local native app (`expo run:*`) |
| `npm run lint` | Expo ESLint (includes React Compiler rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run export:ios` / `npm run export:android` | Production bundle sanity check |
| `npx expo-doctor` | Dependency and config diagnostics |
| `npx expo install --fix` | Align packages with the SDK |
| `npx expo run:ios` / `run:android` | Local development build |

Always install Expo-managed packages with `npx expo install <package>`, not
`npm install`, so versions match SDK 58.

---

## Project layout

```
src/
  app/                 Expo Router routes (every file is a screen)
    (auth)/            welcome, login, signup, forgot-password
    (app)/             signed-in stack
      (tabs)/          Home, Book, Requests, Schedule, People, Profile
      lesson/[id]      live room / recap / feedback
      ...
  api/                 Typed API client and DTOs (the only network layer)
  components/          UI primitives, lesson components, auth shell
  features/            Role dashboards and change-request list features
  hooks/               use-online-status
  lib/                 Formatting, status logic, selectors, validation, storage, query client
  providers/           Auth, theme, and lesson-reminder providers
  theme/               Design tokens (light and dark)
```

Navigation rules:

- Routes live only in `src/app/`. Non-route code stays outside it.
- The root stack redirects unauthenticated users to `/welcome` on first launch
  (stored once in the local flag `anaquran.welcome.v1`) and to `/login`
  afterwards. Authenticated users are redirected away from `(auth)`.
- `/welcome` is a single branded screen with the product summary and
  **Sign in** / **Create account** actions. It is not a replica of the web
  marketing page and makes no API calls. Signed-out users can reopen it from
  the **About Ana Quran** link on the login screen.
- Tab visibility is role-aware: Book is student-only, Requests is
  student/admin-only (weekly time changes), People is admin-only.
- Pushed screens use the native stack header and back gesture. Screens under an
  existing header pass `edges={["left", "right"]}` to avoid a double top inset.

### Web → mobile screen map

| Web feature | Mobile route |
| --- | --- |
| First-launch welcome / product introduction | `(auth)/welcome` |
| Email/password sign-in, phone OTP | `(auth)/login` |
| Student registration | `(auth)/signup` |
| Password recovery | `(auth)/forgot-password` |
| Student portal dashboard | `(app)/(tabs)/index` |
| Teacher search / course browsing equivalent | `(app)/(tabs)/book` → `(app)/teachers/[id]` |
| Enrollment equivalent (instant weekly booking) | Teacher profile → pick weekly times |
| Schedule / upcoming sessions | `(app)/(tabs)/schedule` |
| Live classroom | `(app)/lesson/[id]` |
| Lesson reports | `(app)/profile/reports` + report form in lesson |
| Teacher weekly availability | `(app)/availability` |
| Student weekly time change | `(app)/change-time/[seriesId]` (from Home or Requests) |
| Admin time-change queue | `(app)/(tabs)/requests` |
| Admin dashboard | `(app)/(tabs)/index` (admin variant) |
| Admin students/teachers/assignments | `(app)/(tabs)/people`, `people/new`, `people/assign` |
| Contact form | `(app)/contact` |
| Admin contact inbox | `(app)/contact-submissions` |
| Profile and settings | `(app)/(tabs)/profile`, `profile/edit`, `profile/password` |

### Role access

| Screen | Student | Teacher | Admin |
| --- | --- | --- | --- |
| Home | ✓ | ✓ | ✓ |
| Book | ✓ | — | — |
| Requests | ✓ (mine) | — | ✓ (queue) |
| Schedule | ✓ | ✓ | ✓ |
| People | — | — | ✓ |
| Profile | ✓ | ✓ | ✓ |
| Availability | — | ✓ | — |
| Contact messages | — | — | ✓ |

The API enforces these roles independently; hidden tabs are not the security
boundary.

---

## Authentication and session model

The API issues an `HttpOnly`, `Secure`, `SameSite=Lax` cookie named
`academy-auth` with a sliding 7-day expiry. The app deliberately reuses it:

- React Native's native cookie jar stores the cookie; every request uses
  `credentials: "include"`.
- The cookie is never extracted, read, logged, or copied into JavaScript.
  `expo-secure-store` cannot store an `HttpOnly` cookie, and doing so would
  require exposing the token — so the app does not try.
- SecureStore holds only a cached identity preview (`{ user, savedAt }`) and
  the theme preference, encrypted at rest with
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- On launch the app paints from the cache immediately, then revalidates with
  `GET /api/auth/me`. `401` clears the cache and returns to sign-in, but a
  cached session gets one 900 ms retry first: Android creates its cookie store
  lazily, so the very first request of a cold start can be sent without cookies
  and would otherwise look like an expired session. A network failure keeps the
  cached identity in an explicitly flagged offline session.
- Any non-auth `401` is confirmed with `GET /api/auth/me` before the session is
  cleared. A one-off rejection no longer signs the user out; if the API cannot
  confirm (offline or server error), the cached session is kept. Expected
  `401`s (wrong password, expired reset code) are handled inline.
- Sign-out calls `POST /api/auth/logout` best-effort, then always clears local
  state.

Phone sign-in is supported alongside email/password. A phone number with no
account creates a student account after the name step. Password recovery uses
an emailed code. Both flows surface the development code only when the
development API returns one.

---

## API client

All requests go through `src/api/client.ts`:

- Enforces a leading `/`, applies the configured base URL, and strips trailing
  slashes.
- 30-second timeout (60 seconds for avatar upload), abort support, and
  `FormData` handling for multipart uploads.
- Normalizes validation errors and Problem Details into `ApiError`, with
  `status`, `details`, `validationErrors`, `isNetworkError`, and `isAuthError`.
- Never logs request bodies, headers, cookies, or tokens.
- Resolves relative asset paths (`/api/users/{id}/avatar`) through `assetUrl`.

`normalizeUser` accepts both camelCase and the API's snake_case aliases
(`full_name`, `is_active`) and defaults an unknown role to `student`.

TanStack Query defaults (`src/lib/query-client.ts`):

- `staleTime` 20 s, `gcTime` 10 min.
- Two retries for network and 5xx failures; none for 4xx; none for mutations.
- Refetch on app foreground and network reconnect. NetInfo drives the online
  manager and the offline banner.

Only the report feed is paginated (`skip`/`take`, 10 per page, `hasMore`).
Everything else is a full list filtered client-side.

---

## Live lessons (Jitsi)

The app loads `https://{JITSI_DOMAIN}/external_api.js` in a WebView and joins
the room `rayan-academy-{lessonId}`.

- The join button unlocks at `startsAt` for every participant; before then the
  screen shows a countdown and the room stays closed. There is no presence check,
  so neither side waits for the other to arrive.
- Join modes: camera + microphone, microphone only, or watch/listen only.
  Camera and microphone permissions are requested with the native prompts
  declared in `app.config.ts`.
- After the lesson ends, an already-joined call is not interrupted. Returning
  later shows a recap with the report/review form instead of the room.
- Cancelled lessons never open the room.

Known Jitsi limitations in this client:

- Screen sharing is not available inside the native WebView; the toolbar is
  limited to microphone, camera, chat, and hangup. Whiteboard, polls,
  reactions, and virtual backgrounds are disabled.
- The room is unlisted but not authenticated. The start-time gate is an
  application rule, not a Jitsi security boundary.
- `meet.jit.si` limits calls to about 95 minutes and is shared infrastructure.
  Production should point `EXPO_PUBLIC_JITSI_DOMAIN` at a self-hosted Jitsi
  deployment (see the repository deployment notes).
- The Jitsi UI is English-only and unbranded by request.
- Media does not pass through the ASP.NET API; only lesson data does.

---

## Lesson reminders

`src/providers/lesson-reminder-provider.tsx` schedules two local notifications
per upcoming lesson — five minutes before `startsAt` and again at `startsAt` —
for whichever account is signed in on the device:

- The source is the existing `GET /api/lessons`: students and teachers see their
  own lessons, admins see every lesson, so each role is reminded without a new
  endpoint.
- Only `scheduled` lessons are included. Reminders are rebuilt whenever the
  lesson list changes, so reschedules and cancellations follow automatically.
- The permission prompt appears once after sign-in. On Android the channel is
  `lesson-reminders`; declare `SCHEDULE_EXACT_ALARM` if exact delivery matters
  (the app already does).
- Tapping a reminder opens `/lesson/{id}`.
- At most 60 reminders are pending across both kinds (iOS caps pending
  notifications at 64).
  Sign-out cancels every pending lesson reminder.
- Delivery is per device and needs that account to have opened the app at least
  once since the lesson was booked. There is no server push — the API has no
  device-token or notification endpoint.

---

## Navigation and live sync

**Persistent bottom bar.** `src/components/navigation/persistent-tab-bar.tsx` is
rendered by `src/app/(app)/_layout.tsx` underneath the stack, so it stays
visible on every internal screen (teacher profile, availability, settings,
forms) instead of only on the five tab roots. The Expo Router tab bar is hidden;
the stack keeps its native headers and swipe-back gestures.

- Tabs are role-filtered: Home, Book (`student`), Requests (students see their
own time changes, admins see the queue), Schedule, People (`admin`), Profile.
  Teachers have no request screen at all.
- Screens inside a section keep their tab highlighted via `sectionTab()`
  (e.g. `/teachers/[id]` highlights Book, `/profile/edit` highlights Profile).
- Fullscreen lesson rooms hide the bar; the offline banner offsets itself by
  `TAB_BAR_CONTENT_HEIGHT` when the bar is present.

**Cross-role status.** The API has no push or streaming channel, so the app
polls while it is in the foreground. `LIVE_SYNC_INTERVAL` in
`src/lib/query-client.ts` (60s) is set on the queries whose state another role
can change:

- `["lessons"]` (owned by the reminder provider, so the schedule, dashboards and
  reminders all update together) and `["lessons", id]` in the lesson room.
- `["change-requests", …]` for the student's own requests and the admin queue.
- `["teacher-directory"]`, `["assigned-teacher"]`, `["series"]` and
  `["availability-rules","teacher"]` so a booking, a published rule, or an
  admin change appears for the other role without a refresh.

Polling pauses automatically when the app is backgrounded (TanStack Query's
focus manager) and resumes on return. Pull-to-refresh uses
`src/hooks/use-pull-refresh.ts` instead of `isFetching`, so a background poll
never flashes the refresh spinner. A booking or an approved change therefore
reaches the other role within about a minute, or immediately on pull-to-refresh. Instant delivery
would need a server-side push/SSE channel, which is out of scope while the API
stays unchanged.

---

## Developer tools: API debugger

Hidden behind the app version on Profile so it never appears for normal users:

- Tap the version label at the bottom of Profile seven times in quick
  succession to toggle it. The choice is persisted under
  `anaquran.api-debug.v1`.
- While enabled, a floating **API** pill appears on every screen (including
  sign-in). It opens a bottom sheet listing each request with method, path,
  status, duration, and time.
- Each entry expands to show the request and response JSON. Password, token,
  OTP, and cookie fields are redacted; long strings are truncated.
- The sheet is collapsible (chevron or backdrop) and has a recording switch, a
  Clear action, and a live request count. Turning recording off removes the
  pill; turn it back on with the seven-tap gesture.
- Entries live in memory only and are cleared on sign-out, on disable, and when
  the app process ends.

Logging happens inside `apiFetch`, so every endpoint in `API_MAPPING.md` is
covered without extra client code.

---

## Forms and the keyboard

Every form field is a `TextField` that reports focus to the nearest
`KeyboardAwareScrollView`. Both `Screen` and the lesson recap use that scroll
view, so focusing any field scrolls it above the keyboard on iOS and Android.
`Screen` also keeps a `KeyboardAvoidingView` on iOS for the submit buttons.

Android builds are edge-to-edge (`edgeToEdgeEnabled=true`), so `adjustResize`
no longer shrinks the window on Android 15+. The scroll view therefore reads
the keyboard's top from `endCoordinates.screenY` and adds the keyboard height
as bottom content padding, which guarantees enough scroll range on every
version; the reveal is retried after layout settles. The lesson room is
wrapped in the same component, covering the report and review forms.

---

## Design system

The app mirrors the web brand tokens in `src/theme/tokens.ts`:

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#fbfaf6` | `#142c3f` |
| Card | `#ffffff` | `#1c3a52` |
| Text | `#173b35` | `#f2f6f4` |
| Brand | `#217a34` | `#4fa564` |
| Gold | `#a7773e` | `#c9a26b` |

- Light, dark, and system appearance are supported; the choice is stored in
  SecureStore.
- Navigation, status bar, splash screen, and tab bar all follow the active
  scheme.
- The brand lockup is vector-based (`react-native-svg`) and uses one artwork
  across splash, auth, and in-app screens.
- Native conventions: safe areas, native stack headers and back gestures,
  keyboard-aware forms, native date/time picker on both platforms, system text
  scaling, accessibility roles/labels/states, and scrollable layouts for small
  screens.
- No web-only APIs are used.

---

## Building and releasing

This repository does not commit an `eas.json` yet. Configure EAS once:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Then build and submit:

```bash
npx eas-cli@latest build --platform ios
npx eas-cli@latest build --platform android
npx eas-cli@latest submit --platform ios
npx eas-cli@latest submit --platform android
```

Identifiers in `app.config.ts`:

- iOS bundle: `com.anaquran.academy`
- Android package: `com.anaquran.academy`
- URL scheme: `anaquran`
- Orientation: portrait; tablets supported on iOS.

Production API/Jitsi values are compiled into `app.config.ts` `extra`. To point
a build at staging, set `EXPO_PUBLIC_API_URL` and
`EXPO_PUBLIC_JITSI_DOMAIN` for that build.

Use `eas update` only for JavaScript changes; any change to native modules,
permissions, icons, or the splash screen requires a new binary build.

Before every release:

```bash
npm run typecheck
npm run lint
npm test
npx expo-doctor
npm run export:ios
npm run export:android
```

---

## Verification

Current automated status:

- `npm run typecheck` — clean.
- `npm run lint` — clean (Expo ESLint with React Compiler rules).
- `npm test` — 19 unit tests passing for validation, status helpers, lesson
  selectors, and reminder scheduling.
- `npx expo-doctor` — 20/20 checks pass (dependencies, config, app metadata).
- `npm run export:ios` and `npm run export:android` — production bundles
  generate without route or module errors.

Manual device QA still matters because unit tests do not exercise native UI:

1. Fresh install: confirm the welcome screen appears once, both actions work,
   and it does not reappear after a relaunch. Reopen it from **About Ana
   Quran** on the login screen.
2. Sign in with email and with a phone code; force-quit and confirm session
   restore.
3. Student: browse teachers, book one or more weekly times, request a time
   change, join the room at the start time, submit a review after the lesson.
4. Teacher: announce weekly rules, start the room, submit a report after the end
   time.
5. Admin: approve or decline a time-change request, create/deactivate/reactivate
   an account, assign a teacher, read contact messages.
6. Toggle light/dark/system, test large text, offline mode, and a small phone.
7. Accept the notification prompt, book a lesson that starts in more than five
   minutes, background the app, and confirm the reminder fires five minutes
   before the start; tap it and confirm the lesson room opens.

No automated end-to-end suite is committed.

---

## Not implemented (no backend feature)

- Server-sent push notifications and announcements. Lesson reminders are local
  to each device (see above); the API has no push endpoint.
- Course/program catalog, enrollment, payments, or billing.
- In-app chat outside the Jitsi room.
- Attendance history (no endpoint exists).
- Group classes (lessons are one teacher and one student).
- Mobile lesson rescheduling/cancellation; those remain web-only.
- Admin-on-behalf weekly rules and one-off slot management; the API supports
  both, but mobile keeps them web-only.
- Editing another user's name, email, or password from the admin screens;
  mobile only activates/deactivates accounts.

The optional "Grade" field when an admin creates a student is accepted by the
API contract but not persisted or returned by the backend, so it is
informational only.

---

## Security notes

- Authentication uses the API's `HttpOnly` cookie; there is no token in
  JavaScript or in SecureStore.
- SecureStore values are encrypted at rest and device-bound.
- The client never logs credentials, cookies, authorization data, or request
  bodies.
- Avatar uploads are restricted to PNG/JPEG/WebP and 2 MB on both client and
  server; the server also validates file signatures.
- `EXPO_PUBLIC_*` values are public build configuration, not secrets.
- The API's origin guard is browser-oriented; native requests omit `Origin`,
  while the cookie stays `HttpOnly` and `SameSite=Lax`.
