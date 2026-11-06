# Ana Quran Mobile — API Mapping

This document maps every feature in the mobile app to the existing ASP.NET Core
API. The mobile client adds no endpoints, no tables, and no business rules of
its own: each call below already existed for the web app.

- Product and business rules: [`../docs/business-requirements/`](../docs/business-requirements/README.md)
- API origin: `https://anaquran.runasp.net` (override with `EXPO_PUBLIC_API_URL`)
- All paths are relative to that origin and start with `/api`.
- Every response is JSON unless noted. `204 No Content` becomes `null` in the
  client.
- All timestamps are ISO 8601 UTC strings; the UI renders them in the device's
  locale and time zone.

The implementation lives in `src/api/`:

| File | Responsibility |
| --- | --- |
| `client.ts` | Fetch wrapper, cookie transport, timeouts, error normalization, global 401 |
| `auth.ts` | Login, registration, session restore, logout, password reset, phone OTP, change password |
| `profile.ts` | Profile update, avatar upload/delete, paginated lesson reports |
| `scheduling.ts` | Weekly teacher directory, instant weekly booking, series, change requests, teacher/admin weekly rules |
| `lessons.ts` | Lesson list/detail, reports, reviews |
| `people.ts` | Admin user creation, activation, teacher/student lists, assignments |
| `contact.ts` | Public contact form and admin inbox |
| `types.ts` | DTO types, role union, tolerant `normalizeUser` |

---

## 1. Transport, auth and errors

### Session cookie

The API authenticates with the `academy-auth` cookie:

- `HttpOnly` — JavaScript can never read it.
- `Secure` in production, `SameSite=Lax`, sliding 7-day expiry.
- React Native's native cookie jar stores and returns it. `apiFetch` always
  sends `credentials: "include"`.
- No bearer token is issued or stored. `expo-secure-store` holds only a cached
  identity preview and the theme preference, never credentials.

A native request carries no browser `Origin` header, so the API's cross-origin
mutation guard does not reject the app. The cookie remains unreadable to the
app's JavaScript either way.

### Roles and policies

| API policy | Accepted role(s) |
| --- | --- |
| `AdminOnly` | `admin`, `super_admin` |
| `ReviewerOnly` | `admin`, `super_admin`, `support` |
| `TeacherOnly` | `teacher` |
| `StudentOnly` | `student` |
| `RequireAuthorization()` | any signed-in role; endpoint applies its own checks |

Mobile navigation additionally hides screens by role, but the API is the
source of truth. A hidden screen is never the only protection.

### Error contract

| Status | Client behavior |
| --- | --- |
| `400` validation | Reads `errors: { field: string[] }`, flattens messages; screens also map field keys |
| `401` | On non-auth endpoints: clears cached identity, query cache, and returns to sign-in |
| `403` | Shows "You do not have permission to do that." |
| `404` | Shows "The requested item could not be found." |
| `409` | Shows the server's business message (slot just taken, overlapping weekly time, etc.) |
| `413` | Avatar upload too large |
| `429` | Shows the server's wait message |
| `5xx` | Generic retry message; query retries twice |
| network / timeout | Status `0`; offline banner; query retries twice |

The client also accepts `message`, `detail`, `title`, or `error` as the
human-readable error text. Request timeout is 30 s (60 s for avatar upload);
mutations are never retried automatically.

### Rate limits (server-side)

| Policy | Limit |
| --- | --- |
| `login` | 10 requests / 5 minutes / IP |
| `otp` | 10 requests / 10 minutes / IP |
| `contact` | 5 requests / 10 minutes / IP |

---

## 2. App launch and session restore

| Feature | Mobile caller | Request | Response | Access |
| --- | --- | --- | --- | --- |
| Restore session | `auth.getCurrentUser` | `GET /api/auth/me` | `200 { user: UserDto }` or `401` | Cookie; `401` is expected when signed out |
| Sign out | `auth.logout` | `POST /api/auth/logout` | `204` | Anonymous allowed so a stale cookie can be cleared |

Restore sequence (`src/providers/auth-provider.tsx`):

1. Read the encrypted identity preview from SecureStore and paint the app
   immediately.
2. Call `GET /api/auth/me` in the background. Concurrent callers share one
   request.
3. `200` → refresh the cached identity. `401` → clear cache and queries, show
   sign-in. Network failure with a cached identity → stay signed in in
   read-only "offline session" mode and show a banner.

---

## 3. Authentication

| Feature | Mobile caller | Request body | Response | Access |
| --- | --- | --- | --- | --- |
| Email sign-in | `auth.login` | `POST /api/auth/login` `{ email, password }` | `200 { user }` / `401` | Anonymous |
| Register student | `auth.register` | `POST /api/auth/register` `{ fullName, email, password }` | `201 { user }` | Anonymous; always creates a `student` |
| Request phone code | `auth.requestOtp` | `POST /api/auth/otp/request` `{ phone }` | `202 { message, devMode, devCode? }` | Anonymous; `503` if SMS is not configured |
| Verify phone code | `auth.verifyOtp` | `POST /api/auth/otp/verify` `{ phone, code, fullName? }` | `200 { user }` or `200 { requiresProfile: true }` | Anonymous |
| Request password reset | `auth.requestPasswordReset` | `POST /api/auth/password/request` `{ email }` | `202 { message, devCode? }` | Anonymous; response is identical for unknown emails |
| Reset password | `auth.resetPassword` | `POST /api/auth/password/reset` `{ email, code, newPassword }` | `204` | Anonymous |
| Change password | `auth.changePassword` | `POST /api/auth/change-password` `{ currentPassword, newPassword }` | `204` | Signed in; `409` for phone-only accounts |

Notes:

- Registration and reset passwords must be at least 8 characters; the client
  additionally asks for a lowercase letter and a digit, matching Identity.
- Phone verification returns `requiresProfile: true` when no account uses the
  number. The app then asks for a full name, resubmits, and the API creates a
  student account and signs it in.
- `devCode`/`devMode` are returned only by the development API. They are shown
  as a notice and are never present in production responses.

---

## 4. Home dashboards

The Home tab renders one of three dashboards from `src/features/dashboard/`.

| Role | Calls |
| --- | --- |
| Student | `GET /api/lessons`, `GET /api/student/change-requests`, `GET /api/student/teacher/weekly-availability` |
| Teacher | `GET /api/lessons`, `GET /api/teacher/availability-rules` |
| Admin | `GET /api/lessons`, `GET /api/admin/change-requests`, `GET /api/students`, `GET /api/teachers` |

All are GETs with no payload. Lessons are filtered server-side by role:
students see their own, teachers see theirs, admins see every lesson. The
dashboard derives counts and the next lesson client-side.

---

## 5. Teacher discovery and instant weekly booking (student)

Teachers announce **weekly rules** (weekday + wall-clock range + IANA time
zone). Announcing a rule is the teacher's consent, so students book instantly —
there is no teacher or admin approval step.

| Feature | Mobile caller | Request | Response | Access |
| --- | --- | --- | --- | --- |
| Teacher directory | `scheduling.getTeacherDirectory` | `GET /api/teachers/weekly-directory` | `WeeklyTeacherDto[]` | Signed in |
| Teacher profile | `scheduling.getTeacherProfile` | `GET /api/teachers/{id}/weekly-availability` | `WeeklyAvailabilityDto` | `StudentOnly` |
| Assigned teacher | `scheduling.getAssignedWeeklyAvailability` | `GET /api/student/teacher/weekly-availability` | `WeeklyAvailabilityDto` or `{ teacher: null, slots: [], series: [] }` | `StudentOnly` |
| Book weekly times | `scheduling.bookWeeklySlots` | `POST /api/student/bookings` `{ ruleIds }` | `201 { series, lessons }` | `StudentOnly` |
| My weekly times | `scheduling.getMySeries` | `GET /api/student/series` | `LessonSeriesDto[]` | `StudentOnly` |

`WeeklyRuleDto`:

```json
{
  "id": "...",
  "teacherId": "...",
  "dayOfWeek": 6,
  "startsAtTime": "15:00:00",
  "endsAtTime": "16:00:00",
  "timeZoneId": "Africa/Cairo",
  "status": "available"
}
```

`dayOfWeek` is `0 = Sunday … 6 = Saturday`; the times are wall-clock values in
`timeZoneId`, not UTC instants. `status` is `available`, `booked` (another
student took it), or `yours` (already booked by the caller).

`WeeklyAvailabilityDto`:

```json
{
  "teacher": { "id": "...", "fullName": "...", "avatarUrl": "...", "..." : "..." },
  "slots": [{ "...": "WeeklyRuleDto" }],
  "series": [{ "id": "...", "dayOfWeek": 6, "startsAtTime": "15:00:00", "endsAtTime": "16:00:00", "timeZoneId": "Africa/Cairo", "isActive": true, "..." : "..." }],
  "averageRating": 4.8,
  "reviewCount": 12,
  "reviews": [{ "rating": 5, "comment": "...", "studentName": "Sara A.", "..." : "..." }],
  "hasLessons": false
}
```

- The directory returns active teachers only, each with its announced rules and
  rating summary. The profile returns up to 5 recent reviews.
- The assigned-teacher endpoint returns `teacher: null` (HTTP 200) when the
  student has no active assignment. The client converts that to `null` rather
  than an error.
- `hasLessons: false` means the student's next booking is their trial lesson.
- Booking takes **one or more** rule ids in a single call — there is no cap on
  how many weekly times a student picks. All chosen rules must belong to the
  same teacher; the call also makes that teacher the student's active
  assignment. The API rejects an empty list (`400`) and races, taken rules, or
  calendar overlaps (`409`); the UI asks the student to refresh and pick again.
- Every booking is permanent: a `LessonSeries` that the API materializes 8 weeks
  ahead and rolls forward.

Students can be in a different zone from their teacher (US/UK students with a
teacher elsewhere), so every student-facing weekly time — directory day chips,
teacher profile groups, assigned series, and weekly time-change history — is converted
from the rule's IANA `timeZoneId` to the device zone by
`lib/weekly-time.ts`. The conversion anchors on the next occurrence, so day
shifts (e.g. Monday 00:30 London → Sunday evening in New York) and US/UK
daylight-saving differences are handled the same way the API materializes
lessons. A `TimeZoneNote` names the viewer zone and the teacher's zone when they
differ. Teacher and admin screens keep the teacher's wall clock, and booking
still sends rule ids only — no API change.

---

## 6. Weekly time changes (self-serve, admin is informed)

A student moves their own weekly time. They can only pick a slot their teacher
publishes as open, and the move is applied the moment they ask — there is no
approval step. The teacher and every admin get a notification, and the admin
screen is a read-only history.

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| My changes | `scheduling.getMyChangeRequests` | `GET /api/student/change-requests` | `LessonChangeRequestDto[]` |
| Move to another open time | `scheduling.requestTimeChange(seriesId, requestedRuleId, note?)` | `POST /api/student/series/{seriesId}/change-requests` `{ requestedRuleId, note? }` | `201 LessonChangeRequestDto` (`status: "applied"`) |
| History | `scheduling.getAdminChangeRequests(status?)` | `GET /api/admin/change-requests[?status=applied\|pending\|approved\|rejected]` | `LessonChangeRequestDto[]` |

`LessonChangeRequestDto` carries the series id, teacher/student names, the
previous and new weekday/times, `timeZoneId`, `status` (`applied` for every
self-serve move; `pending`, `approved` and `rejected` only exist on rows the old
approval queue left behind), `studentNote`, `adminNote`, `createdAt`, and
`adminRespondedAt`.

The API checks the move inside a serializable transaction: the series must still
be active, the target rule must belong to the same teacher and be free, the
student must not already have another weekly time then, and no materialized
lesson may clash. A clash returns `409` and the student picks another slot; the
same `409` covers two students taking the slot at the same moment. On success the
series is retargeted, future lessons are deleted and rebuilt, and the old slot
opens up for other students.

Requests left as `pending` by the removed approval queue are settled at API
start-up: each one is applied if the slot is still open, otherwise closed with an
`adminNote` explaining why.

---

## 7. Schedule and lesson detail

| Feature | Mobile caller | Request | Response | Access |
| --- | --- | --- | --- | --- |
| Lesson list | `lessons.getLessons` | `GET /api/lessons` | `LessonDto[]` | Signed in; scoped by role |
| Lesson detail | `lessons.getLessonById` | `GET /api/lessons/{id}` | `LessonDto` | Participant or admin |

`LessonDto` embeds `report` and `review` DTOs when they exist, so the detail
screen does not make separate report/review GETs.

The Schedule tab works from the full lesson list and windows it client-side:
Upcoming starts with the nearest lesson day (today when there is one) and each
Load more reveals the next lesson day; Past keeps the previous 7 days; and
Cancelled shows lessons within a week either side of today. Completed lessons
are shown four at a time with a Load more action that raises the client-side
cap, so older history stays reachable without loading everything at once. The
teacher view surfaces lessons whose report is due and links them to the lesson
screen; other roles only open the lesson room.

---

## 8. Live lesson room

- The room uses no API endpoint beyond `GET /api/lessons/{id}`; ownership is
  already enforced there.
- There is no presence check. The "Join" button unlocks at `startsAt` for every
  eligible participant, and the screen shows a countdown before then. A refetch
  that crosses `endsAt` after joining does not tear down the call; cancelled
  lessons always show a closed-room state.
- Jitsi itself is not an API endpoint. The client renders
  `@jitsi/react-native-sdk` and joins `ana-quran-{lessonId}`. Screen sharing
  is native (ReplayKit on iOS, MediaProjection on Android), not a link share.
  See the README for setup and platform limitations.
- The native `JitsiMeeting` view lives in a root `LessonCallProvider`, not in the
  lesson screen, so navigating to another tab or pressing back does not end the
  call. Off the lesson screen the call docks as a mini player with Open, share,
  and leave actions; the Ana Quran mark overlays both the full and mini stages.
- The lesson header has a share action that opens the native share sheet with
  `https://{JITSI_DOMAIN}/ana-quran-{lessonId}`. No API call is involved.

### Calling a participant who has not joined

| Feature | Mobile caller | Request | Response | Access |
| --- | --- | --- | --- | --- |
| Ring the other side | `lesson-ops.callLesson` | `POST /api/lessons/{id}/call` `{ targetRole }` | `LessonCallDto` | Participant (own side) or staff (`targetRole` required) |
| Recent incoming calls | `lesson-ops.getRecentCalls` | `GET /api/calls/recent` | `LessonCallDto[]` (newest 20, last 30 min) | Signed in |

`GET /api/lessons/{id}/operations` and the admin lesson-ops detail both embed
`calls`, so the attendance panel renders the ring history without an extra
request.

The attendance panel puts a Call button on every participant row that is not
`joined`, but the press is gated client-side exactly like the server: from 15
minutes before `startsAt` until `endsAt`, at most 30 seconds between calls from
one person, and at most 3 calls from one person per lesson. A row that is
already in the room shows no button, and a call to `joined` returns `409 "{Name}
is already in the lesson room."` The other `409` copies are "This lesson was
cancelled.", "The lesson time has already passed.", "Calls open shortly before
the lesson starts.", "You just called. Wait a moment before calling again." and
"You have used the 3 calls allowed for this lesson."; an out-of-window press
that reaches the server shows the message as a toast. Teachers ring the student
and students ring the teacher, so both directions use the same endpoint with an
empty `targetRole`; staff in the lesson-ops panel must name the side.

---

## 9. Reports and reviews

| Feature | Mobile caller | Request | Response | Access |
| --- | --- | --- | --- | --- |
| Save class report | `lessons.saveLessonReport` | `POST /api/lessons/{id}/report` `{ classSummary, studentFeedback, progress }` | `LessonReportDto` | `TeacherOnly`, owner, after `endsAt`, not cancelled |
| Save teacher review | `lessons.saveLessonReview` | `POST /api/lessons/{id}/review` `{ rating, comment? }` | `TeacherReviewDto` | `StudentOnly`, owner, after `endsAt`, not cancelled |
| My reports | `profile.getMyReports(skip, take)` | `GET /api/profile/reports?skip=0&take=10` | `{ items: LessonReportDto[], hasMore: boolean }` | Signed in; role-scoped |

Validation enforced by the API and mirrored in the forms:

- `classSummary` and `studentFeedback`: 10–2000 characters.
- `progress`: `excellent`, `good`, or `needs_attention`.
- `rating`: 1–5; `comment`: at most 2000 characters.
- Submitting a report also completes the lesson.
- Report pages are clamped to `take` 1–50. Mobile requests 10 and offsets by the
  number of loaded items until `hasMore` is false. This is the only paginated
  endpoint the app uses.

`GET /api/lessons/{id}/report` and `/review` exist but are not called: both
objects ship inside `LessonDto`.

---

## 10. Availability (teacher and admin)

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| List rules | `scheduling.getMyAvailabilityRules` | `GET /api/teacher/availability-rules` | `WeeklyRuleDto[]` |
| Announce rules | `scheduling.publishWeeklyAvailability` | `POST /api/teacher/availability-rules` `{ daysOfWeek, startsAtTime, endsAtTime, timeZoneId }` | `201 WeeklyRuleDto[]` |
| Remove rule | `scheduling.deleteWeeklyAvailability` | `DELETE /api/teacher/availability-rules/{ruleId}` | `204` |
| Admin lists a teacher's rules | `scheduling.getTeacherAvailabilityAsAdmin` | `GET /api/admin/teachers/{teacherId}/availability-rules` | `WeeklyRuleDto[]` |
| Admin announces rules | `scheduling.publishTeacherAvailabilityAsAdmin` | `POST /api/admin/teachers/{teacherId}/availability-rules` `{ daysOfWeek, startsAtTime, endsAtTime, timeZoneId }` | `201 WeeklyRuleDto[]` |
| Admin removes a rule | `scheduling.deleteTeacherAvailabilityAsAdmin` | `DELETE /api/admin/teachers/{teacherId}/availability-rules/{ruleId}` | `204` |

One call announces the same hours on several weekdays (for example Saturday
through Thursday). The API requires at least one weekday, end after start, a
30-, 45-, or 60-minute lesson, a valid IANA time zone, and no overlap with the
teacher's existing rules (`400`). A rule that a student has booked — or that is
part of a pending change request — cannot be deleted (`409`). The screen
defaults to Saturday–Thursday and refreshes the dashboard and directory after
publishing.

Teachers use `(app)/availability` and the device time zone. Admins open the same
editor from People → a teacher's **Weekly availability** button
(`(app)/people/availability/[teacherId]`); it loads that teacher's rules and
defaults the time zone to their existing zone, which the admin can correct
before announcing.

The teacher has no request or approval screen: bookings are automatic and time
changes are handled by the admin. The legacy one-off endpoints
(`/api/teacher/availability`, `/api/teacher/student-availability`,
`/api/student/availability`, `/api/admin/teachers/{id}/availability`) still
exist in the API but are not called by mobile; one-off slot management remains a
web-only flow.

### Open student offers

A student with no active teacher can post one-off times. Every active teacher is
notified; the first teacher to accept books a one-off lesson instantly. The
student panel lives on the Book tab when there is no assigned teacher, and the
teacher inbox sits above the weekly rules on `(app)/availability`.

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| My offers | `scheduling.getMyOpenOffers` | `GET /api/student/open-offers` | `OpenStudentOfferDto[]` |
| Offer a time | `scheduling.publishOpenOffer(startsAt, endsAt)` | `POST /api/student/open-offers` `{ startsAt, endsAt }` | `201 OpenStudentOfferDto` |
| Withdraw | `scheduling.withdrawOpenOffer(offerId)` | `DELETE /api/student/open-offers/{offerId}` | `204` |
| Teacher inbox | `scheduling.getTeacherOpenOffers` | `GET /api/teacher/open-offers` | `OpenStudentOfferDto[]` |
| Accept and book | `scheduling.acceptOpenOffer(offerId)` | `POST /api/teacher/open-offers/{offerId}/accept` | `200 { lessonId, offer }` |

Offers must be future 30-, 45-, or 60-minute lessons; up to 4 open offers per
student; and no overlap with existing offers or lessons. Accepting is atomic: one
teacher wins, the student is notified, other notified teachers see that the
student picked another teacher, and the student's remaining offers are withdrawn.

---

## 11. Admin people and assignments

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| Students | `people.getStudents(includeInactive?)` | `GET /api/students[?includeInactive=true]` | `UserDto[]` |
| Teachers | `people.getTeachers(includeInactive?)` | `GET /api/teachers[?includeInactive=true]` | `UserDto[]` |
| Create teacher/admin | `people.createManagedUser` | `POST /api/admin/users` `{ fullName, email, password, role }` | `201 { user }` |
| Create student | `people.createStudent` | `POST /api/students` `{ fullName, email, password, grade? }` | `201 UserDto` |
| Deactivate | `people.setUserActive(id, false)` | `DELETE /api/admin/users/{id}` | `204` |
| Reactivate | `people.setUserActive(id, true)` | `PATCH /api/admin/users/{id}` `{ isActive: true }` | `UserDto` |
| Assignments | `people.getAssignments` | `GET /api/admin/assignments` | `AssignmentDto[]` |
| Create assignment | `people.createAssignment(teacherId, studentId)` | `POST /api/teacher-student-assignments` `{ teacherId, studentId }` | `201 AssignmentDto` |
| End assignment | `people.deleteAssignment(id)` | `DELETE /api/teacher-student-assignments/{id}` | `204` |

Rules:

- Only teachers and students can be deactivated. The `DELETE` route refuses
  accounts with upcoming lessons (`409`), ends assignments, and stops their
  weekly rules from being bookable. This is why the app uses `DELETE` for
  deactivation and `PATCH` only for reactivation, matching the web app.
- Assigning a student to a new teacher ends any other active assignment. The
  API always keeps a single active teacher per student.
- `role` on `POST /api/admin/users` accepts `teacher` or `admin` only.
- `grade` is accepted by the create-student contract but the API does not
  persist or return it; the field is informational and is not shown later.

---

## 12. Profile, avatar and contact

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| Update profile | `profile.updateProfile` | `PATCH /api/profile` `{ fullName?, email?, phoneNumber? }` | `{ user: UserDto }` |
| Upload avatar | `profile.uploadAvatar` | `POST /api/profile/avatar` multipart field `file` | `{ avatarUrl }` |
| Remove avatar | `profile.deleteAvatar` | `DELETE /api/profile/avatar` | `204` |
| Avatar image | `assetUrl(avatarUrl)` | `GET /api/users/{id}/avatar` | Image bytes |
| Send contact message | `contact.sendContactMessage` | `POST /api/contact` `{ name, email, message }` | `202` |
| Contact inbox | `contact.getContactSubmissions` | `GET /api/admin/contact-submissions` | `ContactSubmission[]` |

Profile rules:

- Full name 2–160 characters.
- Email and phone are only sent when the account already has one; the API
  cannot clear either field. Phone numbers must be valid E.164 format.
- Avatar: PNG, JPEG, or WebP, at most 2 MB. The app converts other formats or
  oversized images to JPEG in `expo-image-manipulator` before upload and
  cache-busts the returned URL with `?v={timestamp}`.
- Contact: name at most 120 characters, valid email, message 5–3000
  characters. The API also emails the academy inbox; the admin inbox is
  read-only in mobile.

---

## 13. Query cache map

TanStack Query defaults: `staleTime` 20 s, `gcTime` 10 min, retry twice for
network/5xx errors, no retry for 4xx, refetch on app foreground and on network
reconnect, no mutation retries.

| Query key | Data |
| --- | --- |
| `["lessons"]` | Lesson list |
| `["lessons", id]` | Lesson detail |
| `["change-requests", "student"]` | Student's weekly time-change history |
| `["change-requests", "admin", filter]` | Admin weekly time-change history |
| `["change-requests"]` | Prefix invalidated after a student moves a weekly time |
| `["teacher-directory"]` | Teachers and their announced weekly rules |
| `["teacher-profile", id]` | Weekly availability, series, and reviews for one teacher |
| `["assigned-teacher"]` | Student's active teacher and their weekly rules |
| `["series"]` | Student's booked weekly times |
| `["availability-rules", "teacher"]` | Teacher's announced weekly rules |
| `["availability-rules", "admin", teacherId]` | One teacher's rules in the admin editor |
| `["admin", "students", includeInactive]` | Admin student list |
| `["admin", "teachers", includeInactive]` | Admin teacher list |
| `["admin", "assignments"]` | Active assignments |
| `["admin", "contact-submissions"]` | Contact inbox |
| `["profile", "reports"]` | Infinite lesson-report pages |
| `["notifications"]` | In-app notification feed |
| `["lesson-ops", id]` | Lesson detail with operations state |
| `["lesson-calls"]` | Calls addressed to me in the last 30 minutes (ringer) |
| `["billing", …]` | Student statement or teacher earnings |
| `["open-offers", …]` | Student offers or teacher offer inbox |
| `["reviews", …]` | Support review queue, workspace, digest |

Mutations invalidate the prefixes they affect. Sign-out and a global `401`
clear the entire cache.

---

## 14. Existing endpoints intentionally not used

| Endpoint | Why mobile does not call it |
| --- | --- |
| `GET /api/profile` | Session identity comes from `GET /api/auth/me`; the response shape is the same |
| `GET /api/teachers/{id}` (admin) | The student-facing weekly-availability route carries the same user plus rules and reviews |
| `GET /api/teachers/public`, `GET /api/teachers/public/{id}` | Anonymous marketing directory; the app requires sign-in |
| `GET /api/students/{id}` | Lists already include the fields the admin UI shows |
| `GET/POST /api/student/availability`, `DELETE /api/student/availability/{id}` | Superseded by weekly rules; no student self-service availability screen in mobile |
| `GET/POST /api/admin/teachers/{id}/availability` (legacy one-off) | Admin weekly rules use `/availability-rules`; one-off slot management remains web-only |
| `GET/POST/DELETE /api/teacher/availability`, `/api/teacher/student-availability` | Superseded by `/api/teacher/availability-rules` |
| `/api/lesson-requests` (student, teacher, admin variants) | Superseded by instant `POST /api/student/bookings`; the teacher and admin approval screens were removed |
| `PATCH /api/lessons/{id}`, `DELETE /api/lessons/{id}` (raw) | Mobile mutates through `/cancel` and `/reschedule-requests`, which apply the lesson policy; the raw status/delete routes are not called |
| `POST /api/lessons/{id}/replacement` | Admin-only direct make-up booking. Mobile proposes the time through `/reschedule-requests` and the student's accept books it |
| `GET /api/lessons/{id}/report`, `GET /api/lessons/{id}/review` | Both are embedded in `LessonDto` |
| `PATCH /api/admin/users/{id}` with name/email/password | Mobile only toggles activation; profile editing is self-service |

No mobile feature relies on mock data, a separate store, or a mobile-only
endpoint.

---

## 15. Features with no API and therefore no mobile screen

- Academy-wide announcements/broadcasts — no endpoint exists. Event push and
  the in-app feed do exist.
- Course/program catalog, enrollment, homework, or invoices — no endpoint.
  The web pages with those names are hardcoded mocks.
- In-app messaging outside the Jitsi room — no endpoint exists.
- Group classes — lessons are one teacher and one student.
- Parent/guardian dashboards — there is no parent role.
- Admin billing (rates, claims, academy account) — the API exists for web, but
  mobile has no screen; use `/admin/payments`.
- One-off slot management on a teacher's behalf — weekly rules are supported in
  mobile, but one-off slots remain web-only.
- Editing another user's name, email, or password — mobile only
  activates/deactivates accounts.

---

## 16. Notifications (in-app, push, and local reminders)

The API has an in-app feed and Expo push. Local reminders remain a per-device
fallback.

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| In-app feed | `notifications.getNotifications` | `GET /api/notifications` | `{ items: NotificationDto[], unread }` (newest 50) |
| Mark one read | `notifications.markNotificationRead` | `POST /api/notifications/{id}/read` | `204` |
| Mark all read | `notifications.markAllNotificationsRead` | `POST /api/notifications/read-all` | `204` |
| Register push | `lesson-ops.registerDeviceToken` | `POST /api/devices/register` `{ token, platform }` | `204` |
| Unregister push | `lesson-ops.unregisterDeviceToken` | `POST /api/devices/unregister` `{ token, platform? }` | `204` |

Push registration needs an EAS `projectId`; without it the app silently relies
on local reminders. Tapping a push opens the notification `link` (for example
`/lesson/{id}`).

`LessonReminderProvider` also reads the same `GET /api/lessons` response the
Schedule screen uses and schedules local notifications with
`expo-notifications`:

| Behaviour | Detail |
| --- | --- |
| Source data | `GET /api/lessons` — student/teacher see their own lessons; admin sees all |
| Included lessons | `status === "scheduled"`, ends in the future, starts in the future |
| Trigger | `startsAt − 5 minutes` (only if still ahead) and `startsAt`, two notifications per lesson |
| Identifier | `lesson-reminder:{lessonId}:{lead\|start}` (deterministic; the scheduled content also stores `triggerAt`) |
| Limit | 60 pending reminders (iOS allows 64 pending per app) |
| Refresh | Reconciled whenever the `/api/lessons` query data changes: matching alarms are kept, stale ones are cancelled, new or moved ones are scheduled |
| Sign-out | Pending lesson reminders are cancelled |
| Tap action | Opens `(app)/lesson/[id]` |
| Permission | Notification permission requested once after sign-in; Android asks once for the **Alarms & reminders** special permission (Android 14+ denies it by default) so delivery stays exact; channel `lesson-reminders` |

Delivery is per device: an account receives reminders on each phone where it
has opened the app and synced the lesson list. Guaranteed delivery to a device
that has never run the app would require server push (token registration plus a
scheduler), which the current API does not provide.

### Lesson calls

`LessonRingProvider` owns the incoming-call layer and reads `GET
/api/calls/recent` (query key `["lesson-calls"]`) on launch, every 20 seconds,
whenever the `calls` realtime scope arrives, and whenever any push is received.
The newest unseen call younger than 90 seconds renders `IncomingCallBanner`
over every screen, loops `assets/sounds/lesson_call.wav` through `expo-audio`,
starts repeating haptics, and stops 45 seconds after it rings or as soon as the
user joins or dismisses. Each call id rings once per session.

The audio player is the reason an in-app call is actually heard: a push's sound
comes from an Android channel that cannot be reconfigured after its first
creation, and from a `res/raw` copy that only exists in a build made after the
sound plugin was added. Playing the bundled asset from JavaScript works in every
build.

| Surface | Detail |
| --- | --- |
| Android channel | `lesson-calls-2`: `IMPORTANCE_MAX`, `bypassDnd`, sound `lesson_call.wav`, vibration `[0, 500, 400, 500, 400]`, public on the lock screen. No custom `audioAttributes`: a communication-request usage plays on the ringer stream, which is silent whenever the phone is on vibrate or silent. The id is bumped whenever these settings change, because Android will not reconfigure an existing channel |
| Push payload | The API sends the call with `channelId: lesson-calls-2`, `sound: lesson_call.wav`, `priority: high`, `interruptionLevel: time-sensitive`, `tag: lesson-call`, `ttl: 60`, `badge: 1` |
| Sound asset | `assets/sounds/lesson_call.wav`, used twice: `require`d by `expo-audio` for the in-app ring, and registered through the `expo-notifications` config plugin so prebuild copies it to the iOS bundle and to `android/app/src/main/res/raw` for the notification. Until the app is rebuilt, Android falls back to the system notification sound instead of silence |
| Badge | `shouldSetBadge` is true only for a notification whose sound is `lesson_call.wav`, so lesson reminders never badge |
| iOS | A time-sensitive notification still follows the Silent switch and Focus, so an iPhone on silent rings visually only. There is no Critical Alerts entitlement yet. |
| App closed | Only the push can wake the app (push must be enabled — see the README). Reopening inside the 90-second window still rings; after that the call exists only as a notification-feed entry and a row on the lesson. |

Push needs the one-time enablement described in the README (`eas init`, the
Firebase `google-services.json`, and an APNs key). Without it the call still
rings any device that happens to be running the app.
