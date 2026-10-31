# Ana Quran Mobile — API Mapping

This document maps every feature in the mobile app to the existing ASP.NET Core
API. The mobile client adds no endpoints, no tables, and no business rules of
its own: each call below already existed for the web app.

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
| `scheduling.ts` | Teacher directory, booking, requests, availability, admin approvals |
| `lessons.ts` | Lesson list/detail, presence heartbeat, reports, reviews |
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
| `409` | Shows the server's business message (slot taken, request already active, etc.) |
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
| Student | `GET /api/lessons`, `GET /api/student/lesson-requests`, `GET /api/student/teacher/availability` |
| Teacher | `GET /api/lessons`, `GET /api/teacher/lesson-requests`, `GET /api/teacher/availability` |
| Admin | `GET /api/lessons`, `GET /api/admin/lesson-requests?status=pending_admin`, `GET /api/students`, `GET /api/teachers` |

All are GETs with no payload. Lessons are filtered server-side by role:
students see their own, teachers see theirs, admins see every lesson. The
dashboard derives counts and the next lesson client-side.

---

## 5. Teacher discovery and booking (student)

| Feature | Mobile caller | Request | Response | Access |
| --- | --- | --- | --- | --- |
| Teacher directory | `scheduling.getTeacherDirectory` | `GET /api/teachers/directory` | `TeacherAvailabilityDto[]` | Signed in |
| Teacher profile | `scheduling.getTeacherProfile` | `GET /api/teachers/{id}/profile` | `TeacherAvailabilityDto` | Signed in |
| Assigned teacher | `scheduling.getAssignedTeacherAvailability` | `GET /api/student/teacher/availability` | `TeacherAvailabilityDto` or `{ teacher: null, slots: [], ... }` | `StudentOnly` |
| Request a slot | `scheduling.requestLessonSlot` | `POST /api/lesson-requests` `{ availabilitySlotId }` | `201 LessonRequestDto` | `StudentOnly` |

`TeacherAvailabilityDto`:

```json
{
  "teacher": { "id": "...", "fullName": "...", "avatarUrl": "...", "..." : "..." },
  "slots": [{ "id": "...", "teacherId": "...", "startsAt": "...", "endsAt": "...", "status": "available" }],
  "averageRating": 4.8,
  "reviewCount": 12,
  "reviews": [{ "rating": 5, "comment": "...", "studentName": "Sara A.", "..." : "..." }]
}
```

- The directory returns active teachers only, with open future slots and all
  their ratings. The profile returns up to 20 recent reviews.
- The assigned-teacher endpoint returns `teacher: null` (HTTP 200) when the
  student has no active assignment. The client converts that to `null` rather
  than an error.
- Requesting a slot is also how a student chooses a teacher: the API ends any
  other active assignment, activates the slot's teacher, and creates a
  `pending_teacher` request.
- The API rejects a second active request (`409`), a slot that is no longer
  available (`409`), or a deactivated teacher (`409`). The UI blocks new
  requests while one is already pending.

---

## 6. Lesson request lifecycle

Statuses: `pending_teacher` → `pending_admin` → `approved`, or `rejected`.
Teacher-initiated proposals start at `pending_student`. `initiatedBy` is
`"student"` (teacher's slot) or `"teacher"` (student's offered time).

### Student

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| My requests | `scheduling.getMyLessonRequests` | `GET /api/student/lesson-requests` | `LessonRequestDto[]` |
| Confirm proposal | `scheduling.respondToRequestAsStudent(id, "confirm")` | `POST /api/student/lesson-requests/{id}/confirm` | `LessonRequestDto` |
| Reject proposal | `scheduling.respondToRequestAsStudent(id, "reject")` | `POST /api/student/lesson-requests/{id}/reject` | `LessonRequestDto` |

### Teacher

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| Incoming requests | `scheduling.getIncomingLessonRequests` | `GET /api/teacher/lesson-requests` | `LessonRequestDto[]` |
| Confirm request | `scheduling.respondToRequestAsTeacher(id, "confirm")` | `POST /api/teacher/lesson-requests/{id}/confirm` | `LessonRequestDto` |
| Reject request | `scheduling.respondToRequestAsTeacher(id, "reject")` | `POST /api/teacher/lesson-requests/{id}/reject` | `LessonRequestDto` |

### Admin

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| Queue / filter | `scheduling.getAdminLessonRequests(status?)` | `GET /api/admin/lesson-requests[?status=]` | `LessonRequestDto[]` |
| Approval queue | `scheduling.getAdminLessonApprovals` | `GET /api/admin/lesson-requests?status=pending_admin` | `LessonRequestDto[]` |
| Approve | `scheduling.approveLessonRequest(id)` | `POST /api/admin/lesson-requests/{id}/approve` | `LessonRequestDto` |
| Reject | `scheduling.rejectLessonRequest(id, reason?)` | `POST /api/admin/lesson-requests/{id}/reject` `{ reason? }` | `LessonRequestDto` |

`LessonRequestDto` includes teacher/student names, the source slot id, the
resolved `startsAt`/`endsAt`, `status`, `createdAt`, and `rejectionReason`.
Approval creates the lesson and marks the slot `booked`; conflicts return `409`
and the UI asks the admin to refresh.

---

## 7. Schedule and lesson detail

| Feature | Mobile caller | Request | Response | Access |
| --- | --- | --- | --- | --- |
| Lesson list | `lessons.getLessons` | `GET /api/lessons` | `LessonDto[]` | Signed in; scoped by role |
| Lesson detail | `lessons.getLessonById` | `GET /api/lessons/{id}` | `LessonDto` | Participant or admin |

`LessonDto` embeds `report` and `review` DTOs when they exist, so the detail
screen does not make separate report/review GETs.

The Schedule tab filters the returned list into Upcoming / Past / All. The
teacher view surfaces lessons whose report is due and links them to the lesson
screen; other roles only open the lesson room.

---

## 8. Live lesson room

| Feature | Mobile caller | Request | Response | Access |
| --- | --- | --- | --- | --- |
| Teacher heartbeat | `lessons.markTeacherPresent` | `POST /api/lessons/{id}/presence` | `204` | `TeacherOnly`, must own the lesson |
| Room status | `lessons.getLessonPresence` | `GET /api/lessons/{id}/presence` | `{ teacherPresent: boolean }` | Participant or admin |

- The teacher app posts a heartbeat when Jitsi reports `videoConferenceJoined`,
  then every 15 s. The server expires the presence after 45 s.
- A student's room opens only after `teacherPresent` is true. The screen polls
  every 5 s while the lesson is live, and offers a manual "Check now".
- Once the user has joined, a refetch that crosses `endsAt` does not tear down
  the call. Cancelled lessons always show a closed-room state.
- Jitsi itself is not an API endpoint. The client loads
  `https://{JITSI_DOMAIN}/external_api.js` inside a WebView and joins
  `rayan-academy-{lessonId}`. See the README for Jitsi limitations.

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

## 10. Availability

### Teacher's published slots

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| List slots | `scheduling.getMyAvailability` | `GET /api/teacher/availability` | `AvailabilityDto[]` |
| Publish slot | `scheduling.publishAvailability` | `POST /api/teacher/availability` `{ startsAt, endsAt }` | `201 AvailabilityDto` |
| Remove slot | `scheduling.deleteAvailability` | `DELETE /api/teacher/availability/{slotId}` | `204` |

API rules: the slot must be in the future, last at most 4 hours, and not
overlap another slot or a scheduled lesson. Only `available` slots can be
deleted (`409` otherwise). The screen offers 30–240 minute durations, validates
the future start locally, and refreshes the directory after changes.

### Student preferences (teacher view)

| Feature | Mobile caller | Request | Response |
| --- | --- | --- | --- |
| Offered times | `scheduling.getTeacherStudentAvailability` | `GET /api/teacher/student-availability` | `{ id, studentId, studentName, startsAt, endsAt, status }[]` |
| Propose lesson | `scheduling.selectStudentAvailability` | `POST /api/teacher/student-availability/{slotId}/select` | `201 LessonRequestDto` |

Selecting a student preference creates a `pending_student` request. The API
rejects it if the student already has an active request (`409`).

The API also supports student self-declared availability
(`GET/POST /api/student/availability`, `DELETE .../{id}`) and admin management
on a teacher's behalf. Mobile has no screen for those flows, so the client does
not expose them.

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
  accounts with upcoming lessons (`409`), rejects their pending requests,
  deletes their future open slots, and ends assignments. This is why the app
  uses `DELETE` for deactivation and `PATCH` only for reactivation, matching
  the web app.
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
| `["lesson-presence", id]` | Teacher presence |
| `["lesson-requests", "student"]` | Student's requests |
| `["lesson-requests", "teacher"]` | Teacher's incoming requests |
| `["lesson-requests", "pending-admin"]` | Admin approval queue |
| `["lesson-requests"]` | Mutation prefix invalidated after request changes |
| `["teacher-directory"]` | Bookable teachers |
| `["teacher-profile", id]` | Teacher profile and reviews |
| `["assigned-teacher"]` | Student's active teacher and open slots |
| `["availability", "teacher"]` | Teacher's published slots |
| `["student-availability", "teacher"]` | Student-offered times |
| `["admin", "students", includeInactive]` | Admin student list |
| `["admin", "teachers", includeInactive]` | Admin teacher list |
| `["admin", "assignments"]` | Active assignments |
| `["admin", "contact-submissions"]` | Contact inbox |
| `["profile", "reports"]` | Infinite lesson-report pages |

Mutations invalidate the prefixes they affect. Sign-out and a global `401`
clear the entire cache.

---

## 14. Existing endpoints intentionally not used

| Endpoint | Why mobile does not call it |
| --- | --- |
| `GET /api/profile` | Session identity comes from `GET /api/auth/me`; the response shape is the same |
| `GET /api/teachers/{id}` (admin) | The student-facing `/profile` route carries the same user plus slots and reviews |
| `GET /api/teachers/public`, `GET /api/teachers/public/{id}` | Anonymous marketing directory; the app requires sign-in |
| `GET /api/students/{id}` | Lists already include the fields the admin UI shows |
| `GET/POST /api/student/availability`, `DELETE /api/student/availability/{id}` | No student self-service availability screen in mobile |
| `GET/POST /api/admin/teachers/{id}/availability`, `DELETE .../{slotId}` | Admin-on-behalf availability remains a web-only flow |
| `PATCH /api/lessons/{id}`, `DELETE /api/lessons/{id}` | Rescheduling and cancelling lessons remain a web-only flow |
| `GET /api/lessons/{id}/report`, `GET /api/lessons/{id}/review` | Both are embedded in `LessonDto` |
| `PATCH /api/admin/users/{id}` with name/email/password | Mobile only toggles activation; profile editing is self-service |

No mobile feature relies on mock data, a separate store, or a mobile-only
endpoint.

---

## 15. Features with no API and therefore no mobile screen

- Server-sent push and announcements — no endpoint exists. Lesson reminders are
  scheduled locally from `GET /api/lessons` (section 16), not delivered by the
  API.
- Course/program catalog, enrollment, and payments — no endpoint exists. The
  teacher directory plus lesson requests are the API's equivalent of browsing
  and enrolling.
- In-app messaging outside the Jitsi room — no endpoint exists.
- Attendance history — only live teacher presence exists.
- Group classes — lessons are one teacher and one student.

---

## 16. Lesson reminders (local notifications)

No notification endpoint is used or needed. `LessonReminderProvider` reads the
same `GET /api/lessons` response the Schedule screen uses and schedules local
notifications with `expo-notifications`:

| Behaviour | Detail |
| --- | --- |
| Source data | `GET /api/lessons` — student/teacher see their own lessons; admin sees all |
| Included lessons | `status === "scheduled"`, ends in the future, starts more than 5 minutes from now |
| Trigger | `startsAt − 5 minutes`, one notification per lesson |
| Identifier | `lesson-reminder:{lessonId}` (deterministic, replaced on every sync) |
| Limit | 60 pending reminders (iOS allows 64 pending per app) |
| Refresh | Rebuilt whenever the `/api/lessons` query data changes; cancellations and reschedules follow automatically |
| Sign-out | Pending lesson reminders are cancelled |
| Tap action | Opens `(app)/lesson/[id]` |
| Permission | Requested once after sign-in; Android channel `lesson-reminders` |

Delivery is per device: an account receives reminders on each phone where it
has opened the app and synced the lesson list. Guaranteed delivery to a device
that has never run the app would require server push (token registration plus a
scheduler), which the current API does not provide.
