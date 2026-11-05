import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  cancelLesson,
  cancelRescheduleRequest,
  createReplacementLesson,
  createRescheduleRequest,
  getLessonOperations,
  reportLessonIncident,
  requestExcuse,
  respondToRescheduleRequest,
} from "@/api/lesson-operations";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { useNow } from "@/hooks/use-now";
import { formatDateTime, formatTime } from "@/lib/format";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateTimeField } from "@/components/ui/date-time-field";
import { TextField } from "@/components/ui/text-field";
import type {
  CancellationPreview,
  Lesson,
  LessonOperations,
  RescheduleRequest,
} from "@/api/types";

const outcomeLabels: Record<string, string> = {
  free_cancellation: "Free cancellation",
  grace_cancellation: "Grace cancellation used",
  late_cancellation: "Late cancellation",
  cancelled_by_teacher: "Cancelled by the teacher",
  late_cancelled_by_teacher: "Late cancellation by the teacher",
  admin_cancelled: "Cancelled by the academy",
  student_no_show: "Student no-show",
  teacher_no_show: "Teacher no-show",
  both_absent: "Both participants absent",
  series_ended: "Weekly lessons ended",
};

const rescheduleStatusLabels: Record<string, string> = {
  pending: "Waiting for a reply",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  cancelled: "Withdrawn",
};

const excuseCategories = [
  { value: "illness", label: "Illness" },
  { value: "family_emergency", label: "Family emergency" },
  { value: "technical", label: "Technical problem" },
  { value: "other", label: "Other" },
];

const incidentTypes = [
  { value: "attendance_dispute", label: "Attendance dispute" },
  { value: "potential_student_no_show", label: "Student did not attend" },
  { value: "potential_teacher_no_show", label: "Teacher did not attend" },
];

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

const minutesLabel = (seconds: number) => `${Math.round(seconds / 60)} min`;

const durationMs = (lesson: Lesson) =>
  new Date(lesson.endsAt).getTime() - new Date(lesson.startsAt).getTime();

function SectionCard({
  title,
  icon,
  children,
  tone = "plain",
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  tone?: "plain" | "warning" | "danger";
}) {
  const { colors } = useTheme();
  const accent =
    tone === "danger"
      ? colors.danger
      : tone === "warning"
        ? colors.warning
        : colors.link;
  const borderColor =
    tone === "danger"
      ? colors.danger
      : tone === "warning"
        ? colors.warning
        : colors.border;

  return (
    <Card style={[styles.section, { borderColor }]}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={18} color={accent} />
        <AppText variant="h3" style={styles.sectionTitle}>
          {title}
        </AppText>
      </View>
      {children}
    </Card>
  );
}

function ErrorNotice({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: colors.dangerSoft }]}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <AppText variant="small" color="danger" style={styles.flexText}>
        {children}
      </AppText>
    </View>
  );
}

const ChoiceChips = <T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) => {
  const { colors, radius } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.label}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                borderColor: selected ? colors.brand : colors.border,
                backgroundColor: selected ? colors.brandSoft : colors.card,
                borderRadius: radius.pill,
                opacity: disabled ? 0.55 : 1,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="700"
              color={selected ? "brand" : "muted"}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

function CreditSummary({ preview }: { preview: CancellationPreview }) {
  const parts: string[] = [];
  if (preview.creditEffect === "deduct") {
    parts.push("One lesson credit will be deducted.");
  } else if (preview.creditEffect === "restore") {
    parts.push("One lesson credit will be restored to the student.");
  }
  if (preview.teacherPayableMinutes > 0) {
    parts.push(`${preview.teacherPayableMinutes} teacher minutes may be payable.`);
  }
  if (parts.length === 0) return null;
  return (
    <View style={styles.bullets}>
      {parts.map((part) => (
        <View key={part} style={styles.bulletRow}>
          <AppText variant="caption" color="muted">
            •
          </AppText>
          <AppText variant="small" color="muted" style={styles.flexText}>
            {part}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function CancellationSection({
  lesson,
  operations,
  role,
}: {
  lesson: Lesson;
  operations: LessonOperations;
  role: string | null;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const preview = operations.cancellation;
  const record = operations.cancellationRecord;
  const isAdmin = role === "admin" || role === "super_admin";

  const mutation = useMutation({
    mutationFn: () => cancelLesson(lesson.id, reason),
    onSuccess: () => {
      setConfirming(false);
      setReason("");
      setError("");
      showToast("The lesson was cancelled and both sides were notified.");
      void queryClient.invalidateQueries({ queryKey: ["lessons"] });
      void queryClient.invalidateQueries({ queryKey: ["lesson-ops", lesson.id] });
      void queryClient.invalidateQueries({ queryKey: ["student", "credits"] });
    },
    onError: (failure) =>
      setError(
        errorMessage(failure, "Unable to cancel this lesson. Please try again.")
      ),
  });

  if (record || lesson.status === "cancelled") {
    const outcome = record?.outcome ?? lesson.cancellationOutcome;
    const credit =
      outcome === "late_cancellation" || outcome === "student_no_show"
        ? "One credit deducted"
        : outcome === "free_cancellation" || outcome === "grace_cancellation"
          ? "No credit change"
          : "One credit restored";
    return (
      <SectionCard title="Cancellation" icon="close-circle" tone="danger">
        <View style={styles.rowWrap}>
          <Badge
            label={outcomeLabels[outcome ?? ""] ?? "Cancelled"}
            tone="danger"
          />
          {lesson.cancelledAt ? (
            <AppText variant="caption" color="muted">
              {formatDateTime(lesson.cancelledAt)}
            </AppText>
          ) : null}
        </View>
        {record ? (
          <View style={styles.facts}>
            <Fact label="Cancelled by" value={record.actorRole} />
            <Fact
              label="Notice"
              value={`${record.hoursBefore.toFixed(1)} hours before start`}
            />
            <Fact
              label="Teacher minutes"
              value={`${record.teacherPayableMinutes} payable`}
            />
            <Fact label="Credit" value={credit} />
          </View>
        ) : null}
        {record?.reason ?? lesson.cancelReason ? (
          <AppText variant="small" style={styles.reasonBox}>
            {record?.reason ?? lesson.cancelReason}
          </AppText>
        ) : null}
      </SectionCard>
    );
  }

  if (!preview.allowed) {
    return (
      <SectionCard title="Cancellation" icon="close-circle-outline">
        <AppText variant="small" color="muted">
          {preview.blockedReason ??
            "This lesson can no longer be cancelled from here."}
        </AppText>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={isAdmin ? "Cancel as academy" : "Cancel this lesson"}
      icon="alert-circle-outline"
      tone="warning"
    >
      <AppText variant="small" color="muted">
        {preview.explanation}
      </AppText>
      <CreditSummary preview={preview} />
      {preview.isLate ? (
        <AppText variant="small" color="warning">
          This is a late cancellation.
          {preview.usedGrace
            ? " Your free grace cancellation for this month is being used."
            : preview.creditEffect === "deduct"
              ? " One lesson credit will be deducted."
              : ""}
        </AppText>
      ) : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}
      {!confirming ? (
        <Button
          title={isAdmin ? "Cancel lesson as academy" : "Cancel lesson"}
          variant="danger"
          onPress={() => setConfirming(true)}
        />
      ) : (
        <View style={styles.form}>
          <TextField
            label="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="Let the other side know what happened."
            maxLength={1000}
            multiline
            editable={!mutation.isPending}
          />
          <AppText variant="caption" color="muted">
            Cancelling cannot be undone. Rescheduling is a separate request.
          </AppText>
          <Button
            title="Confirm cancellation"
            variant="danger"
            loading={mutation.isPending}
            onPress={() => {
              setError("");
              mutation.mutate();
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keep the lesson"
            disabled={mutation.isPending}
            onPress={() => setConfirming(false)}
            style={styles.quietAction}
          >
            <AppText variant="small" weight="700" color="link">
              Keep the lesson
            </AppText>
          </Pressable>
        </View>
      )}
    </SectionCard>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <AppText variant="caption" color="muted" weight="700">
        {label.toUpperCase()}
      </AppText>
      <AppText variant="small" style={styles.factValue}>
        {value}
      </AppText>
    </View>
  );
}

function RescheduleCard({
  request,
  viewerId,
  canRespond,
  busy,
  onRespond,
  onWithdraw,
}: {
  request: RescheduleRequest;
  viewerId?: string;
  canRespond: boolean;
  busy: boolean;
  onRespond: (action: "accept" | "decline", note: string) => void;
  onWithdraw: () => void;
}) {
  const [note, setNote] = useState("");
  const mine = request.requestedById === viewerId;

  return (
    <View style={styles.innerCard}>
      <AppText variant="small" weight="700">
        {formatDateTime(request.proposedStartsAt)} –{" "}
        {formatTime(request.proposedEndsAt)}
      </AppText>
      <AppText variant="caption" color="muted">
        Proposed by {mine ? "you" : request.requestedByName} ·{" "}
        {rescheduleStatusLabels[request.status] ?? request.status}
        {request.status === "pending"
          ? ` · ${Math.max(0, request.minutesRemaining)} min to reply`
          : ""}
      </AppText>
      {request.note ? (
        <AppText variant="small" color="muted">
          {request.note}
        </AppText>
      ) : null}
      {request.responseNote ? (
        <AppText variant="small" color="muted">
          Reply: {request.responseNote}
        </AppText>
      ) : null}
      {request.status === "pending" ? (
        mine || !canRespond ? (
          mine ? (
            <Button
              title="Withdraw request"
              variant="secondary"
              size="sm"
              loading={busy}
              onPress={onWithdraw}
            />
          ) : null
        ) : (
          <View style={styles.form}>
            <TextField
              label="Reply note (optional)"
              value={note}
              onChangeText={setNote}
              maxLength={500}
              placeholder="Add a note for the other side"
              editable={!busy}
            />
            <Button
              title="Accept new time"
              size="sm"
              loading={busy}
              onPress={() => onRespond("accept", note)}
            />
            <Button
              title="Keep current time"
              variant="secondary"
              size="sm"
              disabled={busy}
              onPress={() => onRespond("decline", note)}
            />
          </View>
        )
      ) : null}
    </View>
  );
}

function RescheduleSection({
  lesson,
  operations,
  role,
  viewerId,
}: {
  lesson: Lesson;
  operations: LessonOperations;
  role: string | null;
  viewerId?: string;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const now = useNow();
  const [startsAt, setStartsAt] = useState(
    () => new Date(new Date(lesson.startsAt).getTime() + 24 * 3600_000)
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const pending = operations.pendingReschedule;
  const isAdmin = role === "admin" || role === "super_admin";
  const canRequest =
    (role === "teacher" || role === "student" || isAdmin) &&
    lesson.status === "scheduled" &&
    new Date(lesson.endsAt).getTime() > now;

  const spanMs = durationMs(lesson);
  const proposedEnd = new Date(startsAt.getTime() + spanMs);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["lesson-ops", lesson.id] });
    void queryClient.invalidateQueries({ queryKey: ["lessons"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createRescheduleRequest(lesson.id, {
        startsAt: startsAt.toISOString(),
        endsAt: proposedEnd.toISOString(),
        note,
      }),
    onSuccess: () => {
      setError("");
      showToast(
        "Your reschedule request was sent. The lesson keeps its time until it is accepted."
      );
      refresh();
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to send the reschedule request.")),
  });

  const respondMutation = useMutation({
    mutationFn: ({ action, reply }: { action: "accept" | "decline"; reply: string }) =>
      respondToRescheduleRequest(pending!.id, action, reply),
    onSuccess: (_, variables) => {
      setError("");
      showToast(
        variables.action === "accept"
          ? "The lesson was moved to the new time."
          : "The lesson stays at its current time."
      );
      refresh();
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to reply to the request.")),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => cancelRescheduleRequest(pending!.id),
    onSuccess: () => {
      setError("");
      showToast("Your reschedule request was withdrawn.");
      refresh();
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to withdraw the request.")),
  });

  const busy =
    createMutation.isPending ||
    respondMutation.isPending ||
    withdrawMutation.isPending;

  const history = operations.rescheduleHistory.filter(
    (item) => item.status !== "pending"
  );

  if (!pending && !canRequest) return null;

  return (
    <SectionCard title="Reschedule" icon="calendar-outline">
      <AppText variant="small" color="muted">
        A reschedule is a request, not a cancellation. The lesson keeps its time
        until the other side accepts.
      </AppText>
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}

      {pending ? (
        <RescheduleCard
          request={pending}
          viewerId={viewerId}
          canRespond={canRequest || isAdmin}
          busy={busy}
          onRespond={(action, reply) =>
            respondMutation.mutate({ action, reply })
          }
          onWithdraw={() => withdrawMutation.mutate()}
        />
      ) : canRequest ? (
        <View style={styles.form}>
          <DateTimeField
            label="New date and time"
            value={startsAt}
            minimumDate={new Date(now + 5 * 60_000)}
            onChange={setStartsAt}
            hint={`Ends ${formatDateTime(
              proposedEnd.toISOString()
            )} · same ${Math.round(spanMs / 60000)}-minute length.`}
          />
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            maxLength={1000}
            placeholder="Optional note for the other side"
            editable={!busy}
          />
          <Button
            title="Send reschedule request"
            loading={createMutation.isPending}
            disabled={busy}
            onPress={() => {
              setError("");
              if (startsAt.getTime() <= Date.now()) {
                setError("Choose a future time.");
                return;
              }
              createMutation.mutate();
            }}
          />
        </View>
      ) : null}

      {history.length > 0 ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle reschedule history"
            onPress={() => setShowHistory((value) => !value)}
            style={styles.quietAction}
          >
            <AppText variant="small" weight="700" color="link">
              {showHistory ? "Hide" : "Show"} reschedule history ({history.length})
            </AppText>
          </Pressable>
          {showHistory ? (
            <View style={styles.historyList}>
              {history.map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <AppText variant="small" weight="600">
                    {formatDateTime(item.proposedStartsAt)} ·{" "}
                    {rescheduleStatusLabels[item.status] ?? item.status}
                  </AppText>
                  <AppText variant="caption" color="muted">
                    {item.requestedByName} · {formatDateTime(item.createdAt)}
                  </AppText>
                  {item.responseNote ? (
                    <AppText variant="caption" color="muted">
                      {item.responseNote}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </SectionCard>
  );
}

function MakeupSection({
  lesson,
  operations,
  role,
}: {
  lesson: Lesson;
  operations: LessonOperations;
  role: string | null;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const now = useNow();
  const isAdmin = role === "admin" || role === "super_admin";
  const canCreate =
    lesson.status === "cancelled" &&
    !lesson.isMakeup &&
    !operations.replacementLesson &&
    (role === "teacher" || isAdmin);
  const [startsAt, setStartsAt] = useState(() => new Date(Date.now() + 3600_000));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const spanMs = durationMs(lesson);
  const proposedEnd = new Date(startsAt.getTime() + spanMs);

  const mutation = useMutation({
    mutationFn: () =>
      createReplacementLesson(lesson.id, {
        startsAt: startsAt.toISOString(),
        endsAt: proposedEnd.toISOString(),
        note,
      }),
    onSuccess: () => {
      setError("");
      showToast("A make-up lesson was scheduled and the student was notified.");
      void queryClient.invalidateQueries({ queryKey: ["lesson-ops", lesson.id] });
      void queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to schedule the make-up lesson.")),
  });

  if (lesson.isMakeup || operations.originalLesson) {
    return (
      <SectionCard title="Make-up lesson" icon="videocam-outline">
        <AppText variant="small" color="muted">
          This is a make-up lesson.
          {operations.originalLesson
            ? ` It replaces the cancelled lesson on ${formatDateTime(
                operations.originalLesson.startsAt
              )}.`
            : ""}
        </AppText>
        {operations.originalLesson ? (
          <Button
            title="Open the original lesson"
            variant="secondary"
            size="sm"
            onPress={() =>
              router.push({
                pathname: "/lesson/[id]",
                params: { id: operations.originalLesson!.id },
              })
            }
          />
        ) : null}
      </SectionCard>
    );
  }

  if (operations.replacementLesson) {
    return (
      <SectionCard title="Make-up lesson" icon="videocam-outline">
        <AppText variant="small" color="muted">
          A make-up lesson is scheduled for{" "}
          {formatDateTime(operations.replacementLesson.startsAt)}.
        </AppText>
        <Button
          title="Open the make-up lesson"
          variant="secondary"
          size="sm"
          onPress={() =>
            router.push({
              pathname: "/lesson/[id]",
              params: { id: operations.replacementLesson!.id },
            })
          }
        />
      </SectionCard>
    );
  }

  if (!canCreate) return null;

  return (
    <SectionCard title="Schedule a make-up lesson" icon="calendar-outline">
      <AppText variant="small" color="muted">
        The make-up keeps the original {Math.round(spanMs / 60000)}-minute length
        and adds no extra charge or credit.
      </AppText>
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}
      <View style={styles.form}>
        <DateTimeField
          label="Make-up date and time"
          value={startsAt}
          minimumDate={new Date(now + 5 * 60_000)}
          onChange={setStartsAt}
          hint={`Ends ${formatDateTime(proposedEnd.toISOString())}.`}
        />
        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Optional note for the student"
          editable={!mutation.isPending}
        />
        <Button
          title="Schedule make-up lesson"
          loading={mutation.isPending}
          onPress={() => {
            setError("");
            if (startsAt.getTime() <= Date.now()) {
              setError("Choose a future time.");
              return;
            }
            mutation.mutate();
          }}
        />
      </View>
    </SectionCard>
  );
}

function AttendanceSection({ operations }: { operations: LessonOperations }) {
  const { colors } = useTheme();
  const summary = operations.attendance;
  const hours = operations.hours;

  return (
    <SectionCard title="Attendance" icon="clipboard-outline">
      <AppText variant="caption" color="muted">
        Recorded by the lesson room itself, from real join and leave times.
      </AppText>
      <View style={styles.form}>
        {summary.participants.map((participant) => (
          <View key={participant.userId} style={styles.innerCard}>
            <View style={styles.between}>
              <AppText variant="small" weight="700" style={styles.flexText}>
                {participant.name}{" "}
                <AppText variant="caption" color="muted">
                  ({participant.role})
                </AppText>
              </AppText>
              <Badge
                label={minutesLabel(participant.totalSeconds)}
                tone={
                  participant.totalSeconds > 0
                    ? "success"
                    : participant.status === "absent"
                      ? "danger"
                      : "neutral"
                }
              />
            </View>
            <AppText variant="caption" color="muted">
              {participant.status === "not_joined"
                ? "Did not join"
                : participant.status === "absent"
                  ? "Recorded absent"
                  : participant.status === "joined"
                    ? "In the room now"
                    : "Left the room"}
              {participant.joinedLate ? " · joined late" : ""}
              {participant.leftEarly ? " · left early" : ""}
              {participant.reconnectionCount > 0
                ? ` · ${participant.reconnectionCount} reconnection${
                    participant.reconnectionCount === 1 ? "" : "s"
                  }`
                : ""}
            </AppText>
            {participant.firstJoinedAt ? (
              <AppText variant="caption" color="muted">
                First joined {formatDateTime(participant.firstJoinedAt)}
                {participant.lastLeftAt
                  ? ` · last left ${formatDateTime(participant.lastLeftAt)}`
                  : ""}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
      {hours ? (
        <View
          style={[styles.hoursBox, { backgroundColor: colors.surfaceMuted }]}
        >
          <Fact label="Scheduled" value={`${hours.scheduledMinutes} min`} />
          <Fact
            label="Actual attendance"
            value={`${hours.actualAttendanceMinutes} min`}
          />
          <Fact
            label="Proposed payable"
            value={`${hours.proposedPayableMinutes} min`}
          />
          <Fact
            label="Approved"
            value={`${hours.approvalStatus}${
              hours.approvedPayableMinutes != null
                ? ` · ${hours.approvedPayableMinutes} min`
                : ""
            }`}
          />
        </View>
      ) : null}
    </SectionCard>
  );
}

function ExcuseSection({
  lesson,
  operations,
  role,
}: {
  lesson: Lesson;
  operations: LessonOperations;
  role: string | null;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [category, setCategory] = useState<string>("illness");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const outcome = lesson.cancellationOutcome;
  const eligible =
    role === "student" &&
    (outcome === "late_cancellation" ||
      outcome === "student_no_show" ||
      outcome === "both_absent");
  const existing = operations.excuse;

  const mutation = useMutation({
    mutationFn: () => requestExcuse(lesson.id, { category, explanation }),
    onSuccess: () => {
      setError("");
      showToast("Your excuse request was sent for review.");
      void queryClient.invalidateQueries({ queryKey: ["lesson-ops", lesson.id] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to send the excuse request.")),
  });

  if (!eligible && !existing) return null;

  return (
    <SectionCard
      title="Excuse request"
      icon="document-text-outline"
      tone="warning"
    >
      {existing ? (
        <View style={styles.form}>
          <AppText variant="small">
            Status:{" "}
            <AppText variant="small" weight="700" style={styles.capitalize}>
              {existing.status}
            </AppText>{" "}
            · <AppText variant="small">{existing.category.replaceAll("_", " ")}</AppText>
          </AppText>
          <AppText variant="small" color="muted">
            {existing.explanation}
          </AppText>
          {existing.adminNote ? (
            <AppText variant="small" color="muted">
              Academy note: {existing.adminNote}
            </AppText>
          ) : null}
          {existing.status === "approved" ? (
            <AppText variant="small" color="success">
              This late cancellation or no-show was excused.
            </AppText>
          ) : null}
        </View>
      ) : (
        <View style={styles.form}>
          <AppText variant="small" color="muted">
            If illness, a family emergency, or a technical problem caused this,
            ask the academy to review it. An approved excuse restores the lesson
            credit.
          </AppText>
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          <ChoiceChips
            label="Excuse category"
            options={excuseCategories}
            value={category}
            onChange={setCategory}
            disabled={mutation.isPending}
          />
          <TextField
            label="What happened?"
            value={explanation}
            onChangeText={setExplanation}
            placeholder="Explain what happened (at least 10 characters)"
            maxLength={2000}
            multiline
            editable={!mutation.isPending}
          />
          <Button
            title="Send excuse request"
            loading={mutation.isPending}
            onPress={() => {
              setError("");
              if (explanation.trim().length < 10) {
                setError("Explain what happened in at least 10 characters.");
                return;
              }
              mutation.mutate();
            }}
          />
        </View>
      )}
    </SectionCard>
  );
}

function IncidentSection({
  lesson,
  operations,
  role,
}: {
  lesson: Lesson;
  operations: LessonOperations;
  role: string | null;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [type, setType] = useState<string>("attendance_dispute");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const existing = operations.incident;
  const canReport = role === "teacher" || role === "student";

  const mutation = useMutation({
    mutationFn: () => reportLessonIncident(lesson.id, { type, detail }),
    onSuccess: () => {
      setError("");
      showToast("The issue was reported to the academy.");
      void queryClient.invalidateQueries({ queryKey: ["lesson-ops", lesson.id] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to report the issue.")),
  });

  if (!canReport) return null;

  return (
    <SectionCard title="Attendance issue" icon="warning-outline">
      {existing ? (
        <View style={styles.form}>
          <AppText variant="small">
            <AppText variant="small" weight="700" style={styles.capitalize}>
              {existing.type.replaceAll("_", " ")}
            </AppText>{" "}
            · <AppText variant="small" style={styles.capitalize}>{existing.status}</AppText>
          </AppText>
          <AppText variant="small" color="muted">
            {existing.detail}
          </AppText>
          {existing.resolutionNote ? (
            <AppText variant="small" color="muted">
              Academy note: {existing.resolutionNote}
            </AppText>
          ) : null}
        </View>
      ) : (
        <View style={styles.form}>
          <AppText variant="small" color="muted">
            If the attendance record does not match what happened, report it. The
            academy reviews every report.
          </AppText>
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          <ChoiceChips
            label="Issue type"
            options={incidentTypes}
            value={type}
            onChange={setType}
            disabled={mutation.isPending}
          />
          <TextField
            label="What went wrong?"
            value={detail}
            onChangeText={setDetail}
            placeholder="Describe the issue"
            maxLength={1000}
            multiline
            editable={!mutation.isPending}
          />
          <Button
            title="Report to the academy"
            variant="secondary"
            loading={mutation.isPending}
            onPress={() => {
              setError("");
              if (detail.trim().length < 5) {
                setError("Describe the issue in at least 5 characters.");
                return;
              }
              mutation.mutate();
            }}
          />
        </View>
      )}
    </SectionCard>
  );
}

/** Post-booking lesson actions shared by the lesson room and recap screens. */
export const LessonOperationsPanel = ({
  lesson,
  role,
}: {
  lesson: Lesson;
  role?: string | null;
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const operationsQuery = useQuery({
    queryKey: ["lesson-ops", lesson.id],
    queryFn: () => getLessonOperations(lesson.id),
    enabled: Boolean(lesson.id),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const operations = operationsQuery.data;
  const stable = useMemo(() => operations, [operations]);

  if (operationsQuery.isLoading) {
    return (
      <Card style={styles.loadingCard}>
        <AppText variant="small" color="muted">
          Loading lesson details…
        </AppText>
      </Card>
    );
  }

  if (operationsQuery.isError || !stable) {
    return (
      <Card style={styles.loadingCard}>
        <AppText variant="small" color="muted">
          Lesson management details could not be loaded.
        </AppText>
        <Button
          title="Retry"
          variant="secondary"
          size="sm"
          onPress={() => void operationsQuery.refetch()}
        />
      </Card>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.autoRow}>
        <Ionicons name="sync-outline" size={14} color={colors.muted} />
        <AppText variant="caption" color="muted">
          Lesson management updates automatically.
        </AppText>
      </View>
      <CancellationSection lesson={lesson} operations={stable} role={role ?? null} />
      {lesson.status !== "cancelled" ? (
        <RescheduleSection
          lesson={lesson}
          operations={stable}
          role={role ?? null}
          viewerId={user?.id}
        />
      ) : null}
      <MakeupSection lesson={lesson} operations={stable} role={role ?? null} />
      <AttendanceSection operations={stable} />
      <ExcuseSection lesson={lesson} operations={stable} role={role ?? null} />
      <IncidentSection lesson={lesson} operations={stable} role={role ?? null} />
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { gap: 14 },
  section: { gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { flexShrink: 1 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  flexText: { flex: 1 },
  rowWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  facts: { gap: 6 },
  factRow: { gap: 1 },
  factValue: { marginTop: 1 },
  reasonBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(127,127,127,0.08)",
  },
  bullets: { gap: 4 },
  bulletRow: { flexDirection: "row", gap: 6 },
  form: { gap: 12 },
  quietAction: { alignItems: "center", paddingVertical: 6, minHeight: 36 },
  innerCard: {
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(127,127,127,0.22)",
  },
  historyList: { gap: 8, marginTop: 8 },
  historyRow: {
    gap: 2,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(127,127,127,0.08)",
  },
  hoursBox: { gap: 4, padding: 12, borderRadius: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  capitalize: { textTransform: "capitalize" },
  loadingCard: { gap: 10 },
  autoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
