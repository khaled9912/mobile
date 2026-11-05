import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Clipboard from "@react-native-clipboard/clipboard";
import { Ionicons } from "@expo/vector-icons";
import {
  getStudentBilling,
  markPaymentSent,
  type AcademyBankAccount,
  type PaymentClaimStatus,
  type StudentBilling,
} from "@/api/billing";
import { formatDateTime, formatMonthKey, formatTime } from "@/lib/format";
import { useTheme } from "@/providers/theme-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MonthChips } from "@/components/ui/month-chips";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorView } from "@/components/ui/states";
import {
  SectionHeaderSkeleton,
  TextCardSkeleton,
} from "@/components/ui/skeleton";
import { RoleGate } from "@/components/ui/role-gate";

const usd = (value: number) => `$${value.toFixed(2)}`;

const claimTone: Record<PaymentClaimStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  rejected: "danger",
};

const claimLabel: Record<PaymentClaimStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Payment confirmed",
  rejected: "Transfer not matched",
};

const bankRows = (bank: AcademyBankAccount) =>
  [
    { key: "bankName", label: "Bank", value: bank.bankName },
    { key: "accountHolder", label: "Account holder", value: bank.accountHolder },
    { key: "accountNumber", label: "Account number", value: bank.accountNumber },
    { key: "iban", label: "IBAN", value: bank.iban },
    { key: "swift", label: "SWIFT", value: bank.swift },
  ].filter((row) => row.value.trim().length > 0);

export default function StudentPaymentsScreen() {
  return (
    <RoleGate roles={["student"]}>
      <StudentBillingView />
    </RoleGate>
  );
}

function StudentBillingView() {
  const { colors, radius } = useTheme();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const billingQuery = useQuery({
    queryKey: ["billing", "student", month ?? "latest"],
    queryFn: () => getStudentBilling(month),
  });
  const billing: StudentBilling | undefined = billingQuery.data;

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const claimMutation = useMutation({
    mutationFn: () => {
      if (!billing) throw new Error("The statement is still loading.");
      return markPaymentSent({ month: billing.month, note: note.trim() || undefined });
    },
    onSuccess: async () => {
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  const copy = (key: string, value: string) => {
    Clipboard.setString(value);
    setCopied(key);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      setCopied((current) => (current === key ? null : current));
    }, 1600);
  };

  const bank = billing?.bankAccount ?? null;
  const claim = billing?.claim ?? null;
  const rows = bank ? bankRows(bank) : [];
  const allDetails = rows.map((row) => `${row.label}: ${row.value}`).join("\n");

  return (
    <Screen
      edges={["left", "right"]}
      refreshing={billingQuery.isFetching}
      onRefresh={() => void billingQuery.refetch()}
    >
      <PageHeader
        eyebrow="Your account"
        title="Monthly payment"
        subtitle="Your completed lessons for the month, the amount due, and the academy's dollar account to transfer to."
      />

      {billingQuery.isLoading ? (
        <>
          <TextCardSkeleton lines={2} />
          <View style={styles.loadingSection}>
            <SectionHeaderSkeleton withAction={false} />
            <TextCardSkeleton lines={4} />
            <TextCardSkeleton lines={4} />
          </View>
        </>
      ) : billingQuery.isError ? (
        <ErrorView
          error={billingQuery.error}
          onRetry={() => void billingQuery.refetch()}
        />
      ) : billing ? (
        <>
          <MonthChips
            months={billing.months}
            value={billing.month}
            onChange={setMonth}
          />

          <Card style={styles.summary}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCopy}>
                <AppText variant="caption" color="muted">
                  {formatMonthKey(billing.month)}
                </AppText>
                <AppText variant="h1">{usd(billing.totalUsd)}</AppText>
                <AppText variant="small" color="muted">
                  {billing.lessons.length} lesson
                  {billing.lessons.length === 1 ? "" : "s"} completed
                </AppText>
              </View>
              <Badge
                label={
                  claim
                    ? claimLabel[claim.status]
                    : billing.monthClosed
                      ? "Statement closed"
                      : "In progress"
                }
                tone={claim ? claimTone[claim.status] : "info"}
              />
            </View>
          </Card>

          <SectionHeader title="Lessons" />
          {billing.lessons.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="No completed lessons"
              body="Lessons appear here after your teacher marks them complete."
            />
          ) : (
            <Card padded={false}>
              {billing.lessons.map((lesson, index) => (
                <View
                  key={lesson.id}
                  style={[
                    styles.lessonRow,
                    index > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.lessonCopy}>
                    <AppText variant="label">
                      {formatDateTime(lesson.startsAt)}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {lesson.teacherName || "Academy teacher"} ·{" "}
                      {lesson.isTrial ? "Trial lesson" : formatTime(lesson.startsAt)}
                    </AppText>
                  </View>
                  <AppText variant="label" weight="700">
                    {lesson.isTrial ? "Free" : usd(lesson.amount)}
                  </AppText>
                </View>
              ))}
              <View
                style={[
                  styles.lessonRow,
                  {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <AppText variant="label">Total due</AppText>
                <AppText variant="h3">{usd(billing.totalUsd)}</AppText>
              </View>
            </Card>
          )}

          <SectionHeader title="Dollar account" />
          {bank && rows.length > 0 ? (
            <Card>
              <AppText variant="small" color="muted" style={styles.bankIntro}>
                Open your banking app, paste these details, and transfer{" "}
                {usd(billing.totalUsd)} for {formatMonthKey(billing.month)}.
              </AppText>
              {rows.map((row) => (
                <View
                  key={row.key}
                  style={[
                    styles.bankRow,
                    { borderColor: colors.border, borderRadius: radius.md },
                  ]}
                >
                  <View style={styles.bankCopy}>
                    <AppText variant="caption" color="muted">
                      {row.label}
                    </AppText>
                    <AppText variant="small" weight="700" selectable>
                      {row.value}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Copy ${row.label}`}
                    hitSlop={8}
                    onPress={() => void copy(row.key, row.value)}
                    style={styles.copyButton}
                  >
                    <Ionicons
                      name={copied === row.key ? "checkmark" : "copy-outline"}
                      size={18}
                      color={copied === row.key ? colors.success : colors.muted}
                    />
                  </Pressable>
                </View>
              ))}
              {bank.notes ? (
                <AppText variant="caption" color="muted" style={styles.bankNotes}>
                  {bank.notes}
                </AppText>
              ) : null}
              <Button
                title={copied === "all" ? "Copied all details" : "Copy all details"}
                variant="secondary"
                icon={copied === "all" ? "checkmark" : "copy-outline"}
                onPress={() => void copy("all", allDetails)}
                style={styles.copyAll}
              />
            </Card>
          ) : (
            <EmptyState
              icon="business-outline"
              title="Account details coming soon"
              body="The academy has not added its dollar account yet. Please contact the academy for transfer details."
            />
          )}

          <SectionHeader title="Payment status" />
          <Card>
            {claim ? (
              <>
                <Badge label={claimLabel[claim.status]} tone={claimTone[claim.status]} />
                <AppText variant="small" color="muted" style={styles.claimMeta}>
                  Marked as sent {formatDateTime(claim.claimedAt)} ·{" "}
                  {usd(claim.amountUsd)} for {claim.lessonCount} lesson
                  {claim.lessonCount === 1 ? "" : "s"}
                </AppText>
                {claim.studentNote ? (
                  <AppText variant="small" color="muted" style={styles.claimMeta}>
                    Your note: {claim.studentNote}
                  </AppText>
                ) : null}
                {claim.status === "rejected" && claim.adminNote ? (
                  <Notice tone="error" message={claim.adminNote} />
                ) : null}
              </>
            ) : null}

            {claim?.status === "rejected" && billing.canClaim ? (
              <View style={styles.claimForm}>
                <TextField
                  label="Note for the academy (optional)"
                  value={note}
                  onChangeText={setNote}
                  maxLength={500}
                  placeholder="Sender name or transfer reference"
                />
                <Button
                  title={claimMutation.isPending ? "Sending…" : "Mark as sent again"}
                  icon="send-outline"
                  loading={claimMutation.isPending}
                  onPress={() => claimMutation.mutate()}
                />
              </View>
            ) : claim ? null : !billing.monthClosed ? (
              <AppText variant="small" color="muted">
                You can mark this month as paid after it ends, once all lessons
                are completed.
              </AppText>
            ) : billing.canClaim ? (
              <View style={styles.claimForm}>
                <AppText variant="small" color="muted">
                  Transferred {usd(billing.totalUsd)}? Tell the academy so they
                  can match it to your account.
                </AppText>
                <TextField
                  label="Note for the academy (optional)"
                  value={note}
                  onChangeText={setNote}
                  maxLength={500}
                  placeholder="Sender name or transfer reference"
                />
                <Button
                  title={
                    claimMutation.isPending ? "Sending…" : "I've sent the payment"
                  }
                  icon="send-outline"
                  loading={claimMutation.isPending}
                  onPress={() => claimMutation.mutate()}
                />
              </View>
            ) : (
              <AppText variant="small" color="muted">
                There is nothing to pay for this month.
              </AppText>
            )}

            {claimMutation.isError ? (
              <Notice
                tone="error"
                message={
                  claimMutation.error instanceof Error
                    ? claimMutation.error.message
                    : "Unable to mark the payment as sent."
                }
              />
            ) : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: 14 },
  loadingSection: { marginTop: 22, gap: 10 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryCopy: { flex: 1, gap: 2 },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  lessonCopy: { flex: 1, gap: 2 },
  bankIntro: { marginBottom: 12, lineHeight: 20 },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  bankCopy: { flex: 1, gap: 1 },
  copyButton: { padding: 2 },
  bankNotes: { marginTop: 4, lineHeight: 18 },
  copyAll: { marginTop: 12 },
  claimMeta: { marginTop: 8, lineHeight: 18 },
  claimForm: { marginTop: 12, gap: 12 },
});
