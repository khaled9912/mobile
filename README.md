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
| Live lessons | Native `@jitsi/react-native-sdk` (`JitsiMeeting`) |
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

`patches/` carries compatibility fixes applied by `patch-package` on
`npm install`: Jitsi SDK types, RN 0.88 compilation of the Jitsi worklets fork,
`react-native-splash-view` and the GIPHY SDK, and a Swift 6.2 diagnostic in
`expo-modules-jsi` that Xcode 26.2 raises. Remove them only after upgrading
those packages to versions that include the fixes. `.npmrc` enables
`legacy-peer-deps` because the Jitsi SDK pins exact peer versions that the
Expo SDK does not satisfy.

`ios/` and `android/` are **not** committed. Expo generates them from
`app.config.ts` (Continuous Native Generation). Never edit them by hand.
`plugins/withLessonScreenShare.js` runs during prebuild and adds the iOS
broadcast extension, the Android media-projection service and permissions, and
the PiP manifest flag. Run `npx expo prebuild --clean` after changing that
plugin or any native dependency. `npm install` applies the `patch-package`
fixes for the Jitsi SDK and `react-native-splash-view` via the `postinstall`
script, so native generation must happen after a completed install.

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
EXPO_PUBLIC_JITSI_DOMAIN=meet.143-47-237-128.sslip.io
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
  providers/           Auth, theme, lesson-reminder, and lesson-call providers
  theme/               Design tokens (light and dark)
```

Navigation rules:

- Routes live only in `src/app/`. Non-route code stays outside it.
- The root stack sends every unauthenticated user to `/welcome`, both on cold
  start and after logout. Authenticated users are redirected away from
  `(auth)`.
- `/welcome` is a single branded screen with the product summary and
  **Sign in** / **Create account** actions. It is not a replica of the web
  marketing page and makes no API calls.
- Tab visibility is role-aware: Book is student-only, Requests is
  student/admin-only (weekly time changes), People is admin-only.
- Pushed screens use the native stack header and back gesture. Screens under an
  existing header pass `edges={["left", "right"]}` to avoid a double top inset.
- Android system back (button or edge swipe) walks the stack and the visited tab
  history before exiting. The app opts out of predictive back because Expo
  Router's default stack does not consume that gesture and Android would finish
  the activity instead of popping history.

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
| Admin: manage a teacher's weekly rules | `(app)/people/availability/[teacherId]` (from People → Teachers) |
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
| Availability | — | ✓ (own) | ✓ (on a teacher's behalf) |
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
Everything else is fetched as a full list and windowed client-side: Schedule's
Upcoming filter reveals one local lesson day at a time, Past keeps the last
seven days, and completed lessons load four at a time.

---

## Live lessons (Jitsi)

The app renders the native Jitsi SDK (`@jitsi/react-native-sdk`) and joins the
room `ana-quran-{lessonId}` on the self-hosted server.

- The join button unlocks at `startsAt` for every participant; before then the
  screen shows a countdown and the room stays closed. There is no presence check,
  so neither side waits for the other to arrive.
- Join modes: camera + microphone, microphone only, or watch/listen only.
  Camera and microphone permissions are requested with the native prompts
  declared in `app.config.ts` before the SDK mounts.
- The toolbar carries microphone, camera, screen share (`desktop`), chat, and
  hangup. Whiteboard, polls, reactions, virtual backgrounds, and the prejoin
  page are disabled so the native room matches the web room.
- Screen sharing is native, not a link share:
  - iOS uses ReplayKit through the `BroadcastExtension` target that
    `plugins/withLessonScreenShare.js` adds during prebuild. The system picker
    lists it as **Ana Quran Screen Share**. Capture keeps running while the app
    is backgrounded, backed by the `audio`, `voip`, and `fetch` background modes.
    ReplayKit broadcast requires a physical iPhone or iPad; the simulator cannot
    start a broadcast.
  - Android uses MediaProjection (`ScreenCapturePickerView`) with a foreground
    media-projection service, so the share survives leaving the app. `minSdk` is
    raised to 26 by the same plugin.
- While the call is active on Android, PiP keeps the room visible over other
  apps: Android 12+ enters it automatically when the user presses Home, and the
  system back gesture enters it on Android 8–11. iOS has no PiP module in this
  SDK version: the call and screen share continue while the app is backgrounded,
  but iOS does not float a room preview.
- The lesson header's share action opens the native share sheet with the room
  URL (`https://{JITSI_DOMAIN}/ana-quran-{lessonId}`); the in-call header
  exposes the same share action. This is a link share separate from screen
  sharing.
- The `JitsiMeeting` view is mounted once in the root `LessonCallProvider`, not
  in the lesson screen. Switching tabs, opening another screen, or pressing back
  does not end the call: it docks as a mini player with Open, share, and leave
  actions. Only the in-call leave button, Jitsi's hangup, or signing out ends it.
- The Ana Quran mark is overlaid at the top-left of both the full room and the
  mini player.
- After the lesson ends, an already-joined call is not interrupted. Returning
  later shows a recap with the report/review form instead of the room.
- Cancelled lessons never open the room.

Known Jitsi limitations in this client:

- Screen sharing needs a native build (`npx expo run:ios` / `run:android` or
  EAS). Expo Go cannot load the Jitsi native SDK.
- The room is unlisted but not authenticated. The start-time gate is an
  application rule, not a Jitsi security boundary.
- The app must join the **same** self-hosted Jitsi as the web app; the default
  is baked into `app.config.ts`. `meet.jit.si` is not an option: since 2023 it
  requires an account before it will create a room, so anonymous lesson joins
  fail there. When the deployment hostname changes, update the default and
  rebuild — `EXPO_PUBLIC_*` values are baked into the JS bundle.
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
- Only `scheduled` lessons are included. The scheduler reconciles rather than
  rebuilds: pending alarms that still match the lesson list are left alone, so
  a delayed Android alarm is not cancelled before it fires. Reschedules and
  cancellations do replace or remove their own reminders.
- The notification permission prompt appears once after sign-in. Android also
  asks once, in-app, for the **Alarms & reminders** special permission because
  Android 14+ denies `SCHEDULE_EXACT_ALARM` to new installs; without it
  reminders still schedule but may arrive late. The channel is
  `lesson-reminders`.
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
  `TAB_BAR_CONTENT_HEIGHT` when the bar is present. A call left running outside
  the lesson screen floats above the bar as a mini player.

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
- iOS broadcast extension: `com.anaquran.academy.broadcast`
- iOS app group: `group.com.anaquran.academy`
- Android package: `com.anaquran.academy`
- URL scheme: `anaquran`
- Orientation: portrait; tablets supported on iOS.

The broadcast extension and app group must exist in the Apple Developer portal
before device builds. Register the app group `group.com.anaquran.academy` and
enable it for both the app id and the extension id
`com.anaquran.academy.broadcast`, then use automatic signing. A simulator build
compiles both targets but cannot run the ReplayKit broadcast; test screen
sharing on a physical iPhone or iPad.

Android builds require `minSdkVersion 26` (set by the plugin) and compile the
Jitsi SDK's WebRTC module. Run `npx expo prebuild --clean` after install so the
manifest, `minSdkVersion`, and `WebRTCModuleOptions` changes are present.

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

1. Fresh install or signed-out launch: confirm the welcome screen is the
   landing page every time, both actions work, and signing out returns here.
2. Sign in with email and with a phone code; force-quit and confirm session
   restore.
3. Student: browse teachers, book one or more weekly times, request a time
   change, join the room at the start time, submit a review after the lesson.
4. Teacher: announce weekly rules, start the room, submit a report after the end
   time.
5. Admin: approve or decline a time-change request, create/deactivate/reactivate
   an account, assign a teacher, manage a teacher's weekly rules from People,
   read contact messages.
6. Time zones: set the device to a US or UK zone while the teacher is in another
   zone and confirm the Book, teacher profile, Home, and change-time screens show
   converted times and the "Times shown in your time zone" note; teacher and
   admin screens still show the teacher's clock.
7. Schedule: confirm Upcoming initially shows only the nearest lesson day and
   **Load more** adds the next lesson day each time (the button names that
   day); Past shows only the last 7 days, and Cancelled only lessons within a
   week either side of today; completed lessons load four at a time with
   **Load more completed lessons** adding older history.
8. Join a lesson, switch to another tab, and confirm the call continues in the
   mini player with the logo and share/leave actions; reopen it without
   rejoining.
9. Toggle light/dark/system, test large text, offline mode, and a small phone.
10. Accept the notification prompt (and, on Android 14+, allow **Alarms &
    reminders** when asked), book a lesson that starts in more than five
    minutes, background the app, and confirm the reminder fires five minutes
    before the start; tap it and confirm the lesson room opens. Reopen the app
    before the start and confirm the pending reminder is not lost.
11. Android: press back or swipe from the screen edge on a detail screen and
    after switching tabs; confirm it walks back through the screens and visited
    tabs and only exits from the Home tab.

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
- One-off slot management on a teacher's behalf; weekly rules are supported in
  mobile, but one-off slots remain web-only.
- Schedule history older than the past week is reachable only through the
  completed-lesson **Load more** control, not as a full archive.
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
