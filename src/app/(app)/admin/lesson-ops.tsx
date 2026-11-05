import { useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  approveExcuseRequest,
  approveTeacherHours,
  generateSalaryPeriods,
  getAdminLessonOps,
  getAdminTeacherHours,
  getExcuseRequests,
  getLessonIncidents,
  getLessonPolicy,
  getReliabilityEvents,
  getSalaryPeriods,
  getTeacherPenalties,
  rejectExcuseRequest,
  rejectTeacherHours,
  resolveLessonIncident,
  resolveReliabilityEvent,
  reviewTeacherPenalty,
  updateLessonPolicy,
  updateSalaryPeriod,
} from "@/api/lesson-operations";
import type {
  AcademyPolicy,
  AdminLessonOpsRow,
  ExcuseRequest,
  LessonIncident,
  ReliabilityEvent,
  SalaryPeriod,
  TeacherHours,
  TeacherPenalty,
} from "@/api/types";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { StatCard } from "@/components/ui/stat-card";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorView } from "@/components/ui/states";
import { RoleGate } from "@/components/ui/role-gate";
import { TextCardSkeleton } from "@/components/ui/skeleton";
import {
  formatDateTime,
  formatLongDate,
  formatMonthKey,
  formatTimeRange,
  relativeDay,
} from "@/lib/format";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { useNow } from "@/hooks/use-now";
import type { Tone } from "@/lib/status";

type Tab = "day" | "queues" | "salary" | "policy";

const tabs: { value: Tab; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "queues", label: "Queues" },
  { value: "salary", label: "Salary" },
  { value: "policy", label: "Policy" },
];

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const shiftDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const shiftMonths = (date: Date, months: number) => {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return next;
};

const attendanceMinutes = (row: AdminLessonOpsRow) => {
  const seconds = row.attendance.participants.reduce(
    (total, participant) => total + participant.totalSeconds,
    0
  );
  return Math.round(seconds / 60);
};

const DayNav = ({
  date,
  onChange,
}: {
  date: Date;
  onChange: (date: Date) => void;
}) => {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.navRow,
        { borderColor: colors.border, borderRadius: radius.md },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        hitSlop={8}
        onPress={() => onChange(shiftDays(date, -1))}
        style={styles.navButton}
      >
        <Ionicons name="chevron-back" size={20} color={colors.link} />
      </Pressable>
      <View style={styles.navCopy}>
        <AppText variant="small" weight="700" align="center">
          {formatLongDate(date.toISOString())}
        </AppText>
        <AppText variant="caption" color="muted" align="center">
          {relativeDay(date.toISOString())}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next day"
        hitSlop={8}
        onPress={() => onChange(shiftDays(date, 1))}
        style={styles.navButton}
      >
        <Ionicons name="chevron-forward" size={20} color={colors.link} />
      </Pressable>
    </View>
  );
};

const LessonRow = ({ row }: { row: AdminLessonOpsRow }) => {
  const { colors } = useTheme();
  const now = useNow();
  const { lesson } = row;
  const live =
    lesson.status !== "cancelled" &&
    new Date(lesson.startsAt).getTime() <= now &&
    new Date(lesson.endsAt).getTime() > now;
  const tone: Tone = lesson.status === "cancelled" ? "danger" : live ? "success" : "info";

  return (
    <Card
      onPress={() =>
        router.push({ pathname: "/lesson/[id]", params: { id: lesson.id } })
      }
      accessibilityLabel={`${lesson.teacherName} with ${lesson.studentName}`}
      style={styles.rowCard}
    >
      <View style={styles.between}>
        <AppText variant="small" weight="700">
          {formatTimeRange(lesson.startsAt, lesson.endsAt)}
        </AppText>
        <Badge
          label={
            lesson.status === "cancelled"
              ? row.cancellationOutcome?.replaceAll("_", " ") ?? "Cancelled"
              : live
                ? "Live now"
                : lesson.status.replaceAll("_", " ")
          }
          tone={tone}
        />
      </View>
      <AppText variant="small">
        {lesson.teacherName} with {lesson.studentName}
      </AppText>
      <View style={styles.badgeRow}>
        {lesson.isMakeup ? <Badge label="Make-up" tone="warning" /> : null}
        <Badge
          label={`${attendanceMinutes(row)} min attended`}
          tone={attendanceMinutes(row) > 0 ? "info" : "neutral"}
        />
        {row.reportDue ? <Badge label="Report due" tone="warning" /> : null}
        {row.hours && row.hours.approvalStatus === "pending" ? (
          <Badge label="Hours pending" tone="warning" />
        ) : null}
        {row.incidents.length > 0 ? (
          <Badge label={`${row.incidents.length} incident`} tone="danger" />
        ) : null}
      </View>
      {row.pendingReschedule ? (
        <AppText variant="caption" color="muted">
          Reschedule waiting · {formatDateTime(row.pendingReschedule.proposedStartsAt)}
        </AppText>
      ) : null}
      <View style={styles.openRow}>
        <AppText variant="caption" color="link" weight="700">
          Open lesson
        </AppText>
        <Ionicons name="chevron-forward" size={14} color={colors.link} />
      </View>
    </Card>
  );
};

const NoteField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <TextField
    label="Review note (optional)"
    value={value}
    onChangeText={onChange}
    maxLength={500}
    placeholder="Visible to the academy team"
  />
);

function ExcuseQueueCard({ item }: { item: ExcuseRequest }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "excuses"] });
  };
  const approve = useMutation({
    mutationFn: () => approveExcuseRequest(item.id, note),
    onSuccess: refresh,
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to approve the excuse.")),
  });
  const reject = useMutation({
    mutationFn: () => rejectExcuseRequest(item.id, note),
    onSuccess: refresh,
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to reject the excuse.")),
  });
  const busy = approve.isPending || reject.isPending;

  return (
    <Card style={styles.queueCard}>
      <View style={styles.between}>
        <AppText variant="small" weight="700">
          {item.studentName}
        </AppText>
        <Badge label={item.category.replaceAll("_", " ")} tone="warning" />
      </View>
      <AppText variant="caption" color="muted">
        Lesson {formatDateTime(item.startsAt)} · sent {formatDateTime(item.createdAt)}
      </AppText>
      <AppText variant="small">{item.explanation}</AppText>
      <NoteField value={note} onChange={setNote} />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button
          title="Approve"
          size="sm"
          loading={approve.isPending}
          disabled={busy}
          onPress={() => {
            setError("");
            approve.mutate();
          }}
        />
        <Button
          title="Reject"
          size="sm"
          variant="danger"
          loading={reject.isPending}
          disabled={busy}
          onPress={() => {
            setError("");
            reject.mutate();
          }}
        />
      </View>
    </Card>
  );
}

const incidentActions = [
  { value: "student_no_show", label: "Student no-show" },
  { value: "teacher_no_show", label: "Teacher no-show" },
  { value: "both_absent", label: "Both absent" },
  { value: "dismissed", label: "Dismiss" },
] as const;

function IncidentQueueCard({ item }: { item: LessonIncident }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<
    "student_no_show" | "teacher_no_show" | "both_absent" | "dismissed"
  >("dismissed");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const resolve = useMutation({
    mutationFn: () =>
      resolveLessonIncident(item.id, {
        action,
        note,
        teacherPayableMinutes: minutes.trim() ? Number(minutes) : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "incidents"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "day"] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to resolve the incident.")),
  });

  return (
    <Card style={styles.queueCard}>
      <View style={styles.between}>
        <AppText variant="small" weight="700">
          {item.teacherName} with {item.studentName}
        </AppText>
        <Badge label={item.type.replaceAll("_", " ")} tone="danger" />
      </View>
      <AppText variant="caption" color="muted">
        Lesson {formatDateTime(item.startsAt)} · reported {formatDateTime(item.createdAt)}
      </AppText>
      <AppText variant="small">{item.detail}</AppText>
      <View style={styles.chips}>
        {incidentActions.map((option) => {
          const selected = action === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setAction(option.value)}
              style={[
                styles.chip,
                selected && { backgroundColor: "rgba(127,127,127,0.14)" },
              ]}
            >
              <AppText variant="caption" weight="700">
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <TextField
        label="Teacher payable minutes (optional)"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
        placeholder="Leave empty to use the policy default"
      />
      <NoteField value={note} onChange={setNote} />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button
        title="Resolve incident"
        size="sm"
        loading={resolve.isPending}
        onPress={() => {
          setError("");
          if (minutes.trim() && !Number.isFinite(Number(minutes))) {
            setError("Payable minutes must be a number.");
            return;
          }
          resolve.mutate();
        }}
      />
    </Card>
  );
}

function HoursQueueCard({ item }: { item: TeacherHours }) {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(String(item.proposedPayableMinutes));
  const [error, setError] = useState("");
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "hours"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "day"] });
  };
  const approve = useMutation({
    mutationFn: () =>
      approveTeacherHours(item.id, {
        approvedMinutes: Number(minutes),
      }),
    onSuccess: refresh,
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to approve these hours.")),
  });
  const reject = useMutation({
    mutationFn: () => rejectTeacherHours(item.id),
    onSuccess: refresh,
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to reject these hours.")),
  });
  const busy = approve.isPending || reject.isPending;

  return (
    <Card style={styles.queueCard}>
      <View style={styles.between}>
        <AppText variant="small" weight="700">
          {item.teacherName}
        </AppText>
        <Badge label={item.approvalStatus} tone="warning" />
      </View>
      <AppText variant="caption" color="muted">
        {formatDateTime(item.startsAt)} · with {item.studentName}
      </AppText>
      <View style={styles.hoursRow}>
        <AppText variant="caption" color="muted">
          Scheduled {item.scheduledMinutes}m
        </AppText>
        <AppText variant="caption" color="muted">
          Actual {item.actualAttendanceMinutes}m
        </AppText>
        <AppText variant="caption" color="muted">
          Proposed {item.proposedPayableMinutes}m
        </AppText>
      </View>
      <TextField
        label="Approved payable minutes"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
      />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button
          title="Approve"
          size="sm"
          loading={approve.isPending}
          disabled={busy}
          onPress={() => {
            setError("");
            if (!Number.isFinite(Number(minutes)) || Number(minutes) < 0) {
              setError("Enter the approved minutes as a number.");
              return;
            }
            approve.mutate();
          }}
        />
        <Button
          title="Reject"
          size="sm"
          variant="danger"
          loading={reject.isPending}
          disabled={busy}
          onPress={() => {
            setError("");
            reject.mutate();
          }}
        />
      </View>
    </Card>
  );
}

function PenaltyCard({ item }: { item: TeacherPenalty }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const review = useMutation({
    mutationFn: (status: "approved" | "rejected") =>
      reviewTeacherPenalty(item.id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "penalties"] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to review the penalty.")),
  });

  return (
    <Card style={styles.queueCard}>
      <View style={styles.between}>
        <AppText variant="small" weight="700">
          {item.teacherName}
        </AppText>
        <Badge label={item.status} tone="warning" />
      </View>
      <AppText variant="small">
        {item.eventType.replaceAll("_", " ")} · {item.amountEgp} EGP
      </AppText>
      <AppText variant="caption" color="muted">
        {item.reason}
      </AppText>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button
          title="Approve"
          size="sm"
          loading={review.isPending}
          onPress={() => {
            setError("");
            review.mutate("approved");
          }}
        />
        <Button
          title="Reject"
          size="sm"
          variant="danger"
          disabled={review.isPending}
          onPress={() => {
            setError("");
            review.mutate("rejected");
          }}
        />
      </View>
    </Card>
  );
}

function ReliabilityCard({ item }: { item: ReliabilityEvent }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const resolve = useMutation({
    mutationFn: () => resolveReliabilityEvent(item.id, { note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "reliability"] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to resolve the event.")),
  });

  return (
    <Card style={styles.queueCard}>
      <View style={styles.between}>
        <AppText variant="small" weight="700">
          {item.userName}
        </AppText>
        <Badge
          label={item.resolvedAt ? "resolved" : "open"}
          tone={item.resolvedAt ? "success" : "warning"}
        />
      </View>
      <AppText variant="small">{item.type.replaceAll("_", " ")}</AppText>
      <AppText variant="caption" color="muted">
        {item.role} · {formatDateTime(item.createdAt)}
        {item.notes ? ` · ${item.notes}` : ""}
      </AppText>
      {item.resolutionNote ? (
        <AppText variant="caption" color="muted">
          Resolution: {item.resolutionNote}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
      {!item.resolvedAt ? (
        <>
          <NoteField value={note} onChange={setNote} />
          <Button
            title="Resolve"
            size="sm"
            loading={resolve.isPending}
            onPress={() => {
              setError("");
              resolve.mutate();
            }}
          />
        </>
      ) : null}
    </Card>
  );
}

function SalaryCard({ item }: { item: SalaryPeriod }) {
  const queryClient = useQueryClient();
  const [manual, setManual] = useState(String(item.manualAdjustmentEgp));
  const [finalAmount, setFinalAmount] = useState(
    item.finalAmountEgp != null ? String(item.finalAmountEgp) : ""
  );
  const [notes, setNotes] = useState(item.notes ?? "");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: (status?: "reviewed" | "paid") =>
      updateSalaryPeriod(item.id, {
        manualAdjustmentEgp: Number(manual || 0),
        finalAmountEgp: finalAmount.trim() ? Number(finalAmount) : undefined,
        notes,
        status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "salary"] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to update the salary period.")),
  });

  return (
    <Card style={styles.queueCard}>
      <View style={styles.between}>
        <AppText variant="small" weight="700">
          {item.teacherName}
        </AppText>
        <Badge
          label={item.status}
          tone={item.status === "paid" ? "success" : "warning"}
        />
      </View>
      <AppText variant="caption" color="muted">
        {formatMonthKey(item.month)} · {item.completedLessons} completed lessons
      </AppText>
      <View style={styles.hoursRow}>
        <AppText variant="caption" color="muted">
          Approved {item.totalApprovedMinutes}m
        </AppText>
        <AppText variant="caption" color="muted">
          Proposed {item.totalProposedMinutes}m
        </AppText>
        <AppText variant="caption" color="muted">
          Actual {item.totalActualMinutes}m
        </AppText>
      </View>
      <AppText variant="caption" color="muted">
        Penalties approved {item.approvedPenaltyEgp} EGP · pending{" "}
        {item.pendingPenaltyEgp} EGP
      </AppText>
      <View style={styles.hoursRow}>
        <AppText variant="caption" color="muted">
          Teacher cancellations {item.teacherCancellations}
        </AppText>
        <AppText variant="caption" color="muted">
          No-shows {item.teacherNoShows}
        </AppText>
      </View>
      <TextField
        label="Manual adjustment (EGP)"
        value={manual}
        onChangeText={setManual}
        keyboardType="numbers-and-punctuation"
      />
      <TextField
        label="Final amount (EGP)"
        value={finalAmount}
        onChangeText={setFinalAmount}
        keyboardType="numbers-and-punctuation"
        placeholder="Set after reviewing the minutes"
      />
      <TextField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={1000}
        placeholder="Internal notes for this period"
      />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button
          title="Save"
          size="sm"
          variant="secondary"
          loading={save.isPending}
          onPress={() => {
            setError("");
            save.mutate(undefined);
          }}
        />
        <Button
          title="Mark reviewed"
          size="sm"
          disabled={save.isPending}
          onPress={() => {
            setError("");
            save.mutate("reviewed");
          }}
        />
        <Button
          title="Mark paid"
          size="sm"
          disabled={save.isPending}
          onPress={() => {
            setError("");
            save.mutate("paid");
          }}
        />
      </View>
    </Card>
  );
}

const policyNumberFields: {
  key: keyof Pick<
    AcademyPolicy,
    | "studentFreeCancelHours"
    | "teacherFreeCancelHours"
    | "noShowGraceMinutes"
    | "rescheduleResponseHours"
    | "studentGraceCancellationsPerMonth"
    | "studentWarningStrikeThreshold"
    | "studentAdminReviewStrikeThreshold"
    | "teacherAdminReviewStrikeThreshold"
    | "trialNoShowThreshold"
  >;
  label: string;
  hint?: string;
}[] = [
  { key: "studentFreeCancelHours", label: "Student free cancellation (hours)" },
  { key: "teacherFreeCancelHours", label: "Teacher free cancellation (hours)" },
  { key: "noShowGraceMinutes", label: "No-show grace (minutes)" },
  { key: "rescheduleResponseHours", label: "Reschedule reply deadline (hours)" },
  {
    key: "studentGraceCancellationsPerMonth",
    label: "Student grace cancellations per month",
  },
  { key: "studentWarningStrikeThreshold", label: "Student warning threshold" },
  {
    key: "studentAdminReviewStrikeThreshold",
    label: "Student admin review threshold",
  },
  {
    key: "teacherAdminReviewStrikeThreshold",
    label: "Teacher admin review threshold",
  },
  { key: "trialNoShowThreshold", label: "Trial no-show threshold" },
];

function PolicyForm() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["lesson-policy"],
    queryFn: getLessonPolicy,
  });
  const { showToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [payScheduled, setPayScheduled] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  const policy = query.data;
  const current = (key: string) =>
    values[key] ?? (policy ? String(policy[key as keyof AcademyPolicy]) : "");
  const payValue = payScheduled ?? policy?.payScheduledDurationWhenAttended ?? false;

  const save = useMutation({
    mutationFn: () => {
      if (!policy) throw new Error("The policy is still loading.");
      const payload: Partial<AcademyPolicy> = {
        payScheduledDurationWhenAttended: payValue,
      };
      for (const field of policyNumberFields) {
        const raw = values[field.key] ?? String(policy[field.key]);
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`${field.label} must be a non-negative number.`);
        }
        payload[field.key] = parsed;
      }
      return updateLessonPolicy(payload);
    },
    onSuccess: () => {
      setError("");
      showToast("The academy policy was saved.");
      void queryClient.invalidateQueries({ queryKey: ["lesson-policy"] });
      void queryClient.invalidateQueries({ queryKey: ["lesson-ops"] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to save the policy.")),
  });

  if (query.isLoading) return <TextCardSkeleton lines={6} />;
  if (query.isError || !policy) {
    return (
      <ErrorView
        error={query.error}
        onRetry={() => void query.refetch()}
        title="Policy unavailable"
      />
    );
  }

  return (
    <Card style={styles.queueCard}>
      <AppText variant="small" color="muted">
        These values drive cancellation, rescheduling, and pay for every lesson.
        Changes apply to future evaluations immediately.
      </AppText>
      {policyNumberFields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={current(field.key)}
          onChangeText={(value) =>
            setValues((previous) => ({ ...previous, [field.key]: value }))
          }
          keyboardType="number-pad"
        />
      ))}
      <View style={styles.switchRow}>
        <View style={styles.flexText}>
          <AppText variant="small" weight="600">
            Pay the scheduled duration when the teacher attended
          </AppText>
          <AppText variant="caption" color="muted">
            Off: pay only the actual attendance minutes.
          </AppText>
        </View>
        <Switch value={payValue} onValueChange={setPayScheduled} />
      </View>
      {error ? (
        <AppText variant="small" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button
        title="Save policy"
        loading={save.isPending}
        onPress={() => {
          setError("");
          save.mutate();
        }}
      />
      <AppText variant="caption" color="muted">
        Last updated {formatDateTime(policy.updatedAt)}
      </AppText>
    </Card>
  );
}

const DayTab = () => {
  const [date, setDate] = useState(() => new Date());
  const key = dateKey(date);
  const query = useQuery({
    queryKey: ["admin", "day", key],
    queryFn: () => getAdminLessonOps(key),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const refreshing = query.isFetching;
  const onRefresh = () => void query.refetch();

  if (query.isLoading) return <TextCardSkeleton lines={4} />;
  if (query.isError || !query.data) {
    return (
      <ErrorView
        error={query.error}
        onRetry={() => void query.refetch()}
        title="Monitor unavailable"
      />
    );
  }

  const { summary, lessons } = query.data;

  return (
    <View style={styles.tabBody}>
      <DayNav
        date={date}
        onChange={setDate}
      />
      <View style={styles.statsGrid}>
        <StatCard label="Lessons" value={summary.lessons} />
        <StatCard label="Live now" value={summary.liveNow} />
        <StatCard label="Upcoming" value={summary.upcoming} />
        <StatCard label="Reports due" value={summary.pendingReports} />
        <StatCard label="No attendance" value={summary.missingAttendance} />
        <StatCard label="Reschedules" value={summary.pendingReschedules} />
        <StatCard label="Excuses" value={summary.pendingExcuses} />
        <StatCard label="Incidents" value={summary.noShowIncidents} />
        <StatCard label="Hours to review" value={summary.pendingHours} />
      </View>
      <View style={styles.refreshRow}>
        <Button
          title="Refresh"
          variant="ghost"
          size="sm"
          loading={refreshing}
          onPress={() => void onRefresh()}
        />
      </View>
      {lessons.length ? (
        <View style={styles.list}>
          {lessons.map((row) => (
            <LessonRow key={row.lesson.id} row={row} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-clear-outline"
          title="Nothing scheduled"
          body="Lessons for this day will appear here as they are booked."
        />
      )}
    </View>
  );
};

const QueuesTab = () => {
  const excuses = useQuery({
    queryKey: ["admin", "excuses"],
    queryFn: () => getExcuseRequests("pending"),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const incidents = useQuery({
    queryKey: ["admin", "incidents"],
    queryFn: () => getLessonIncidents("open"),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const hours = useQuery({
    queryKey: ["admin", "hours"],
    queryFn: () => getAdminTeacherHours("?status=pending"),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const penalties = useQuery({
    queryKey: ["admin", "penalties"],
    queryFn: () => getTeacherPenalties("pending"),
  });
  const reliability = useQuery({
    queryKey: ["admin", "reliability"],
    queryFn: () => getReliabilityEvents("?status=open"),
  });

  const loading =
    excuses.isLoading ||
    incidents.isLoading ||
    hours.isLoading ||
    penalties.isLoading ||
    reliability.isLoading;
  if (loading) return <TextCardSkeleton lines={5} />;

  return (
    <View style={styles.tabBody}>
      <View style={styles.queueSection}>
        <SectionHeader title="Excuse requests" />
        {excuses.data?.length ? (
          excuses.data.map((item) => <ExcuseQueueCard key={item.id} item={item} />)
        ) : (
          <EmptyState
            icon="document-text-outline"
            title="No excuses waiting"
            body="Late cancellations awaiting review appear here."
          />
        )}
      </View>

      <View style={styles.queueSection}>
        <SectionHeader title="Attendance incidents" />
        {incidents.data?.length ? (
          incidents.data.map((item) => (
            <IncidentQueueCard key={item.id} item={item} />
          ))
        ) : (
          <EmptyState
            icon="warning-outline"
            title="No open incidents"
            body="Attendance disputes and no-show reports appear here."
          />
        )}
      </View>

      <View style={styles.queueSection}>
        <SectionHeader title="Teacher hours" />
        {hours.data?.length ? (
          hours.data.map((item) => <HoursQueueCard key={item.id} item={item} />)
        ) : (
          <EmptyState
            icon="time-outline"
            title="No hours waiting"
            body="Hours from finished lessons appear here for approval."
          />
        )}
      </View>

      <View style={styles.queueSection}>
        <SectionHeader title="Teacher penalties" />
        {penalties.data?.length ? (
          penalties.data.map((item) => <PenaltyCard key={item.id} item={item} />)
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No penalties waiting"
            body="Penalties raised for teachers appear here for review."
          />
        )}
      </View>

      <View style={styles.queueSection}>
        <SectionHeader title="Reliability events" />
        {reliability.data?.length ? (
          reliability.data.map((item) => (
            <ReliabilityCard key={item.id} item={item} />
          ))
        ) : (
          <EmptyState
            icon="shield-checkmark-outline"
            title="No reliability events"
            body="Late cancellations and no-shows are tracked here."
          />
        )}
      </View>
    </View>
  );
};

const SalaryTab = () => {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin", "salary", month],
    queryFn: () => getSalaryPeriods(month),
  });
  const generate = useMutation({
    mutationFn: () => generateSalaryPeriods(month),
    onSuccess: () => {
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "salary", month] });
    },
    onError: (failure) =>
      setError(errorMessage(failure, "Unable to generate salary periods.")),
  });

  return (
    <View style={styles.tabBody}>
      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
          onPress={() =>
            setMonth(monthKey(shiftMonths(new Date(`${month}-01T12:00:00`), -1)))
          }
        >
          <Ionicons name="chevron-back" size={20} color={colors.link} />
        </Pressable>
        <AppText variant="small" weight="700">
          {formatMonthKey(month)}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={8}
          onPress={() =>
            setMonth(monthKey(shiftMonths(new Date(`${month}-01T12:00:00`), 1)))
          }
        >
          <Ionicons name="chevron-forward" size={20} color={colors.link} />
        </Pressable>
      </View>
      <Button
        title="Generate salary periods"
        variant="secondary"
        loading={generate.isPending}
        onPress={() => {
          setError("");
          generate.mutate();
        }}
      />
      {error ? (
        <AppText variant="small" color="danger">
          {error}
        </AppText>
      ) : null}
      <AppText variant="caption" color="muted">
        Amounts stay manual: review minutes and penalties for each teacher, then
        set the final EGP amount. Nothing is transferred automatically.
      </AppText>
      {query.isLoading ? (
        <TextCardSkeleton lines={4} />
      ) : query.isError ? (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <View style={styles.list}>
          {query.data.map((item) => (
            <SalaryCard key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="cash-outline"
          title="No salary periods"
          body="Generate the month after lessons and hours are reviewed."
        />
      )}
    </View>
  );
};

const LessonOpsScreen = () => {
  const [tab, setTab] = useState<Tab>("day");

  return (
    <RoleGate roles={["admin", "super_admin"]}>
      <Screen>
        <PageHeader
          eyebrow="Academy administration"
          title="Lesson operations"
          subtitle="Monitor live lessons, review attendance and pay, and keep the cancellation policy current."
        />
        <Segmented
          options={tabs}
          value={tab}
          onChange={setTab}
          label="Lesson operations sections"
        />
        <View style={styles.tabGap} />
        {tab === "day" ? (
          <DayTab />
        ) : tab === "queues" ? (
          <QueuesTab />
        ) : tab === "salary" ? (
          <SalaryTab />
        ) : (
          <PolicyForm />
        )}
      </Screen>
    </RoleGate>
  );
};

export default LessonOpsScreen;

const styles = StyleSheet.create({
  tabGap: { height: 14 },
  tabBody: { gap: 16 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 6,
    minHeight: 54,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navCopy: { flex: 1 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  refreshRow: { alignItems: "flex-start", marginTop: -6 },
  list: { gap: 10 },
  rowCard: { gap: 6 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  queueSection: { gap: 10 },
  queueCard: { gap: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(127,127,127,0.28)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hoursRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flexText: { flex: 1 },
});
