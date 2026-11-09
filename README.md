# Ana Quran Mobile

The iOS and Android app for **Ana Quran Academy** (shown as **Ana Quran** in the
UI), built with Expo/React Native and TypeScript. It is a native client for the
existing ASP.NET Core API — no backend changes, no duplicated endpoints, and no
mock production data.

- Endpoint-by-endpoint mapping: [`API_MAPPING.md`](./API_MAPPING.md)
- Shared API contract: [`../FE/docs/dotnet-integration.md`](../FE/docs/dotnet-integration.md)
- Product and business rules: [`../docs/business-requirements/`](../docs/business-requirements/README.md)
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
| Notifications | `expo-notifications` (local lesson reminders + Expo push token registration) |
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
  providers/           Auth, theme, lesson-reminder, lesson-ring, and Jitsi call providers
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
  student/admin-only (weekly time changes), Reviews is
  admin/super-admin/support-only, and People is admin-only.
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
| Lesson operations (cancel/reschedule/attendance/excuse/incident) | lesson screen panel + `(app)/admin/lesson-ops` |
| Student payments | `(app)/payments` |
| Teacher earnings and payout details | `(app)/earnings` |
| Admin lesson-ops monitor | `(app)/admin/lesson-ops` |
| Support review queue / rubric / weekly digest | `(app)/(tabs)/reviews`, `reviews/[id]`, `reviews/weekly` |
| In-app notifications | notifications surface from Home/Profile |
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
| Reviews | — | — | ✓ |
| People | — | — | ✓ |
| Payments / Earnings | ✓ payments | ✓ earnings | — |
| Lesson ops | ✓ own lesson | ✓ own lesson | ✓ admin monitor |
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
  once since the lesson was booked. These two local alarms are separate from the
  server notices (`Lesson tomorrow`, `Lesson in 1 hour`, `Lesson starting now`)
  and the call ring, which arrive as push once it is enabled.

---

## Lesson calls

When someone has not joined a live lesson, the other participant can ring them
from the attendance panel on the lesson screen, and staff can ring either side
from the lesson-operations panel. Both use
`POST /api/lessons/{id}/call`; see `API_MAPPING.md` §8 for the guards.

- Teachers see "Call the student" on the student row, students see "Call the
  teacher" on the teacher row. The button is disabled while a 30-second cooldown
  is running and after 3 calls in this lesson, and a row that is already in the
  room shows no button. A rejected call surfaces the server's message as a
  toast.
- The callee sees `IncomingCallBanner` — a fixed card at the top of whatever
  screen they are on — with "Join the lesson" and "Not now". Repeating haptics
  run alongside it and both stop 45 seconds after the ring starts, so an
  ignored call cannot keep vibrating the phone.
- `src/providers/lesson-ring-provider.tsx` owns the ring. It polls
  `GET /api/calls/recent` every 20 seconds only while the SignalR socket is
  down, and the `calls` scope plus any incoming push make it refetch
  immediately. Each call id rings once per
  session and only while it is younger than 90 seconds, so a call that happened
  an hour ago does not wake the phone.
- The audible part is `expo-audio`: `startCallRinger()` loops the bundled
  `assets/sounds/lesson_call.wav` with `playsInSilentMode: true` and
  `duckOthers`, so the ring is heard with the ringer on silent and does not
  depend on the notification channel at all. It is skipped while a Jitsi room is
  live and stops with the banner.
- The Android channel is `lesson-calls-2` at `IMPORTANCE_MAX`, with
  `bypassDnd`, a public lock-screen presentation, and `lesson_call.wav` — the
  two-tone ring in `assets/sounds/`. The id carries the `-2`: Android refuses to
  change a channel that already exists, so the settings can only ship under a
  fresh id. The `expo-notifications` config plugin
  copies that file into the iOS bundle and `android/app/src/main/res/raw`
  during `expo prebuild`, so a push can name it as its sound. Changing the
  sound is a native change: it needs a new build, not just an OTA update, and a
  binary built before the plugin entry simply has no `res/raw` file — Android
  then falls back to the system sound and the in-app player still works.
- On iOS the notification still obeys the Silent switch. The build now carries
  the **Time Sensitive Notifications** entitlement, so a lesson call is
  presented through Focus modes and out of the notification summary instead of
  waiting there — the user can still switch it off per app in Settings. Without
  Apple's Critical Alerts entitlement an iPhone on silent gets the banner and
  the badge but no audio, so the unread badge plus the "Call from your
  teacher/student" entry in the notification feed are the fallback.
- Nothing rings if the app is closed and push is not enabled — see the
  one-time enablement under **Building and releasing**.

---

## Navigation and live sync

**Persistent bottom bar.** `src/components/navigation/persistent-tab-bar.tsx` is
rendered by `src/app/(app)/_layout.tsx` underneath the stack, so it stays
visible on every internal screen (teacher profile, availability, settings,
forms) instead of only on the tab roots. The Expo Router tab bar is hidden;
the stack keeps its native headers and swipe-back gestures.

- Tabs are role-filtered: Home, Book (`student`), Requests (students see their
own time changes, admins see the queue), Schedule, Reviews
(`admin`/`super_admin`/`support`), People (`admin`), Profile.
  Teachers have no request screen at all.
- Screens inside a section keep their tab highlighted via `sectionTab()`
  (e.g. `/teachers/[id]` highlights Book, `/profile/edit` highlights Profile).
- Fullscreen lesson rooms hide the bar; the offline banner offsets itself by
  `TAB_BAR_CONTENT_HEIGHT` when the bar is present. A call left running outside
  the lesson screen floats above the bar as a mini player.

**Cross-role status.** The app holds a SignalR connection to the API for change
hints (short-lived ticket; REST stays authoritative), and polls in the
foreground as a fallback. `LIVE_SYNC_INTERVAL` in `src/lib/query-client.ts`
(120s) covers the queries whose state another role can change:

- `["lessons"]` (owned by the reminder provider, so the schedule, dashboards and
  reminders all update together) and `["lessons", id]` in the lesson room.
- `["change-requests", …]` for the student's own requests and the admin queue.
- `["teacher-directory"]`, `["assigned-teacher"]`, `["series"]` and
  `["availability-rules","teacher"]` so a booking, a published rule, or an
  admin change appears for the other role without a refresh.
- Notifications, lesson operations, billing, and review queues.

SignalR scope hints invalidate the matching query keys immediately. Polling
pauses automatically when the app is backgrounded (TanStack Query's focus
manager) and resumes on return. Pull-to-refresh uses
`src/hooks/use-pull-refresh.ts` instead of `isFetching`, so a background poll
never flashes the refresh spinner. A booking or an approved change therefore
reaches the other role immediately when the socket is up, within about two
minutes otherwise, or immediately on pull-to-refresh.

Device tokens are registered for Expo push, so server-side notices (lesson
reminders, payment confirmations, review results) can arrive while the app is
closed. Local reminders remain as a per-device fallback.

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

### Development versus production builds

`EXPO_PUBLIC_APP_ENV` (`development` | `production`) decides which academy a
build talks to and how it labels itself. Leave it unset and the build infers it:
any API URL that is not `https://anaquran.runasp.net` counts as development, so
a build that only set `EXPO_PUBLIC_API_URL` still labels itself honestly instead
of quietly pointing at production.

Development builds show a `DEV · <api host>` badge on the sign-in screens and in
the profile footer; production builds show nothing. The badge is driven by
`APP_ENV` in `src/config/env.ts`, not by `__DEV__`, because a release-mode binary
pointed at your laptop has `__DEV__ === false`.

```bash
# API on the host machine (Development env so the session cookie works over http)
cd ../Ana-Quran-Academy-Backend/src/Academy.Api
ASPNETCORE_ENVIRONMENT=Development dotnet run --no-launch-profile --urls http://0.0.0.0:5001

# iOS simulator — localhost reaches the Mac
EXPO_PUBLIC_APP_ENV=development EXPO_PUBLIC_API_URL=http://localhost:5001 npx expo start

# Android emulator — 10.0.2.2 is the host machine
EXPO_PUBLIC_APP_ENV=development EXPO_PUBLIC_API_URL=http://10.0.2.2:5001 npx expo start

# Physical device — your Mac's LAN address, same Wi-Fi. The Compose API
# (`ana-quran-academy-api`, started with the backend's `./dev up`) publishes
# :5001 on every interface, so a device reaches it with no extra flags.
ipconfig getifaddr en0
EXPO_PUBLIC_APP_ENV=development EXPO_PUBLIC_API_URL=http://192.168.1.20:5001 npx expo start
```

Release-mode builds against the same local API work too:

```bash
EXPO_PUBLIC_APP_ENV=development EXPO_PUBLIC_API_URL=http://localhost:5001 \
  npx expo run:ios --configuration Release
EXPO_PUBLIC_APP_ENV=development EXPO_PUBLIC_API_URL=http://10.0.2.2:5001 \
  npx expo run:android --variant release
```

Two native consequences of that mode, both dev-only:

- Android release builds refuse plain http. `plugins/withDevCleartext.js` adds
  the cleartext exception when the environment is development, so run
  `npx expo prebuild --clean` after changing `EXPO_PUBLIC_APP_ENV`.
- iOS needs nothing: `NSAllowsLocalNetworking` already allows loopback and
  private LAN addresses, and `NSAllowsArbitraryLoads` stays false.

The local Jitsi containers bind to `127.0.0.1` only, so a phone can never reach
them. Keep `EXPO_PUBLIC_JITSI_DOMAIN` at the hosted `meet.<ip>.sslip.io` value
when testing calls from a device.

Use `eas update` only for JavaScript changes; any change to native modules,
permissions, icons, or the splash screen requires a new binary build.

### Push notifications: one-time enablement

Push is the only way a lesson call can ring a phone whose app is closed, and it
is inert until all four steps below are done. Think of it like wiring an
analytics key into a web app: nothing in the code changes, but without the
secret the calls silently no-op. Until then the app still rings every device
that is currently open (SignalR + the `["lesson-calls"]` query), and local
reminders keep working.

1. **Create the EAS project** so the Expo push service knows which app is
   sending. In `mobile/`:

   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   `app.config.ts` does not hard-code the id, so every build has to be told:
   export `EAS_PROJECT_ID` with the project id `eas init` prints (it is also in
   the EAS dashboard under your project's settings). `npx eas-cli build` sets it
   automatically for cloud builds; a local build needs it in the environment.
   Verify with `npx expo config --type public | grep projectId` — if it prints
   nothing, `PushTokenProvider` bails out before requesting a token.

2. **Android — Firebase.** Firebase hands out `google-services.json` per app and
   it cannot be committed, so point a build at your own copy:

   - Create a Firebase project, add an Android app with package name
     `com.anaquran.academy`, download `google-services.json`.
   - `EXPO_GOOGLE_SERVICES_FILE=./google-services.json npx expo prebuild --clean`
   - Upload the Firebase **service account key** JSON (Project settings →
     Service accounts → Generate new private key) with
     `npx eas-cli@latest credentials`, choose Android → Firebase Cloud
     Messaging (HTTP v1). Expo's push service signs the request to FCM with it.
   - Rebuild the binary: `googleServicesFile` is native, so an OTA update will
     not pick it up.

3. **iOS — APNs key and the Time Sensitive capability.** In Apple Developer, create a key under *Apple Push
   Notification service* (APNs) and note the Key ID and your Team ID. Then
   `npx eas-cli@latest credentials` → iOS → upload the `.p8` for the
   distribution profile you already build with. Expo uses it automatically.

   Still in Apple Developer, open *Certificates, Identifiers & Profiles →
   Identifiers → com.anaquran.academy* and tick **Time Sensitive Notifications**
   under Capabilities. `app.config.ts` asks for that entitlement, so a profile
   generated before the tick makes the build fail with a
   "profile doesn't include the entitlement" error rather than dropping the
   ring quietly — regenerate the provisioning profile in EAS after ticking.
   Without it Apple treats a lesson call as an ordinary alert and buries it in
   Focus and in the notification summary.

   `eas.json` carries the three profiles (`development`, `preview`,
   `production`); all of them need `EAS_PROJECT_ID` and
   `EXPO_GOOGLE_SERVICES_FILE` in the build environment to ship a binary that
   can actually be rung.

4. **Check it works.** On two physical dev builds, signed in as teacher and
   student:
   - Sign in, and in the API debugger (Profile → version label ×7) confirm
     `POST /api/devices/register` returned `204` — that means this device now
     has an Expo push token stored server-side.
   - Background or quit the student's app, start the lesson window, and press
     **Call the student**. The phone should vibrate with `lesson_call.wav` on
     the `lesson-calls-2` channel.
   - Ask the other side to book or change something. The notification should
     arrive in the system tray with the default sound and, on iOS, a number on
     the Ana Quran icon. If it only appears inside the app, the push token was
     never accepted — see the API log line below.
   - If a push silently disappears, the API log says why: Expo accepts the
     request even when it refuses the token, and the sender logs
     `Expo rejected a push token: {...}`. A `DeviceTokenNotRegistered` detail
     means the binary on that phone is stale — reinstall, then sign in again to
     store a fresh token.

### What the app enforces on its side

- **OS-level, not in-app.** `expo-notifications` presents foreground pushes as
  banners in the tray with sound (`shouldShowBanner`, `shouldShowList`,
  `shouldPlaySound`). The in-app bell is a history, not the delivery path.
- **Android channel.** Ordinary pushes name `academy-notifications`, created at
  sign-in with `HIGH` importance, the default sound and vibration. Android
  ignores payload volume, so that channel is what makes a notification slide in
  and ring. If you change its settings, bump the id in
  `src/lib/notification-channels.ts`, `app.config.ts`, and `PushOptions` in the
  API — Android refuses to edit an existing channel.
- **Icon badge.** The API stamps every push with the recipient's unread count,
  and the app mirrors the feed count with `setBadgeCountAsync` while it runs.
  iOS shows the number; Android launchers vary between a dot and a number, and
  some ignore it entirely. iOS also needs `allowBadge` in the permission
  request — if the user denied badges, only Settings can restore them
  (`getPermissionsAsync().ios.allowsBadge` reports the current choice).
- **Sound.** iOS plays the push `sound` ("default"); Android plays the channel
  sound. The phone's silent switch / Focus mode still wins, as it does in
  WhatsApp.

Android may still defer a push while the phone is dozing. Two settings help and
both are already surfaced in the app: the notification permission prompt, and
the one-time **Alarms & reminders** prompt from the reminder scheduler, which
grants the exact-alarm permission that also keeps a scheduled wake-up on time.
If a student regularly misses calls, check that they allowed notifications for
Ana Quran and did not put the app under battery optimisation.

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
3. Student: browse teachers, book one or more weekly times, move one to another
   open slot, join the room at the start time, submit a review after the lesson.
4. Teacher: announce weekly rules, start the room, submit a report after the end
   time.
5. Admin: open the time-change history and confirm the move is recorded and
   notified, create/deactivate/reactivate an account, assign a teacher, manage a
   teacher's weekly rules from People, read contact messages.
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
12. Calls: with two accounts on two devices, open the lesson while one side is
    still out of the room and press **Call the student** / **Call the
    teacher**. Confirm the callee gets the banner with **Join the lesson** and
    haptics on the screen they were on, that the row disappears from the panel
    once they join, that a second press is blocked for 30 seconds, and that the
    fourth press in the lesson reports the limit. Background the callee's app
    and repeat — the push should ring with `lesson_call.wav` (needs the
    enablement above).

No automated end-to-end suite is committed.

---

## Not implemented or mobile-only gaps

- Announcements/broadcasts. Push exists for event notices, but there is no
  academy-wide announcement feature.
- Course/program catalog, enrollment, homework, or invoices. The web pages with
  those names are hardcoded mocks, not API features.
- In-app chat outside the Jitsi room.
- Group classes (lessons are one teacher and one student).
- Admin billing (rates, claims, academy account). Use the web
  `/admin/payments` page.
- One-off slot management on a teacher's behalf; weekly rules are supported in
  mobile, but one-off slots remain web-only.
- Schedule history older than the past week is reachable only through the
  completed-lesson **Load more** control, not as a full archive.
- Editing another user's name, email, or password from the admin screens;
  mobile only activates/deactivates accounts.
- A parent/guardian experience; there is no parent role.

Implemented on mobile and previously missing from older docs: student payments
and teacher earnings, lesson operations (cancel/reschedule/make-up/attendance/
excuse/incident), attendance summaries inside the lesson panel with the call
button, the incoming-call banner and its own Android channel, support review
queue and weekly digest, in-app notifications, and Expo push registration.

The optional "Grade" field when an admin creates a student is a fixed
dropdown (Kindergarten, Grade 1 to Grade 12). The API persists it and returns
it on the student's `UserDto`.

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
