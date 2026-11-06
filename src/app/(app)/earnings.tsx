import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTeacherBilling,
  savePayoutDetails,
  type TeacherBilling,
  type TeacherPayoutInput,
} from "@/api/billing";
import { formatDateTime, formatMonthKey, formatTime } from "@/lib/format";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { Screen } from "@/components/ui/screen";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { AppText } from "@/components/ui/app-text";
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

const egp = (value: number) =>
  new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(value);

const emptyForm: TeacherPayoutInput = {
  instaPayAccount: "",
  vodafoneCashNumber: "",
  bankName: "",
  bankAccountHolder: "",
  bankIban: "",
};

const formFrom = (billing?: TeacherBilling): TeacherPayoutInput =>
  billing
    ? {
        instaPayAccount: billing.payoutDetails.instaPayAccount,
        vodafoneCashNumber: billing.payoutDetails.vodafoneCashNumber,
        bankName: billing.payoutDetails.bankName,
        bankAccountHolder: billing.payoutDetails.bankAccountHolder,
        bankIban: billing.payoutDetails.bankIban,
      }
    : emptyForm;

const fields: {
  key: keyof TeacherPayoutInput;
  label: string;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  maxLength: number;
}[] = [
  {
    key: "instaPayAccount",
    label: "InstaPay",
    placeholder: "name@instapay or phone",
    maxLength: 120,
  },
  {
    key: "vodafoneCashNumber",
    label: "Vodafone Cash",
    placeholder: "01xxxxxxxxx",
    keyboardType: "phone-pad",
    maxLength: 30,
  },
  {
    key: "bankName",
    label: "Bank name",
    placeholder: "e.g. Banque Misr",
    maxLength: 120,
  },
  {
    key: "bankAccountHolder",
    label: "Account holder",
    placeholder: "Name on the account",
    maxLength: 160,
  },
  {
    key: "bankIban",
    label: "IBAN",
    placeholder: "EG...",
    maxLength: 64,
  },
];

export default function TeacherEarningsScreen() {
  return (
    <RoleGate roles={["teacher"]}>
      <TeacherBillingView />
    </RoleGate>
  );
}

function TeacherBillingView() {
  const { colors } = useTheme();
  const [month, setMonth] = useState<string | undefined>(undefined);

  const billingQuery = useQuery({
    queryKey: ["billing", "teacher", month ?? "latest"],
    queryFn: () => getTeacherBilling(month),
  });
  const billing: TeacherBilling | undefined = billingQuery.data;

  return (
    <Screen
      edges={["left", "right"]}
      refreshing={billingQuery.isFetching}
      onRefresh={() => void billingQuery.refetch()}
    >
      <PageHeader
        eyebrow="Your account"
        title="Monthly earnings"
        subtitle="Your completed lessons for the month, what the academy will pay you, and where to send the transfer."
      />

      {billingQuery.isLoading ? (
        <>
          <TextCardSkeleton lines={3} />
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
            <AppText variant="caption" color="muted">
              {formatMonthKey(billing.month)}
            </AppText>
            <AppText variant="h1">{egp(billing.totalEgp)}</AppText>
            <AppText variant="small" color="muted">
              {billing.lessons.length} lesson
              {billing.lessons.length === 1 ? "" : "s"} ·{" "}
              {billing.payoutPerLessonEgp > 0
                ? `${egp(billing.payoutPerLessonEgp)} per lesson`
                : "rate not set"}
            </AppText>
            {!billing.monthClosed ? (
              <AppText variant="caption" color="muted" style={styles.openNote}>
                This month is still in progress; the total grows as lessons
                complete.
              </AppText>
            ) : null}
          </Card>

          {billing.payoutPerLessonEgp <= 0 ? (
            <Notice
              tone="warning"
              message="The academy has not set your per-lesson rate yet, so this summary shows 0. Contact the academy if this looks wrong."
            />
          ) : null}

          <SectionHeader title="Lessons" />
          {billing.lessons.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="No completed lessons"
              body="Lessons are counted after you mark them complete with a report."
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
                      {lesson.studentName || "Student"} ·{" "}
                      {lesson.isTrial ? "Trial lesson" : formatTime(lesson.startsAt)}
                    </AppText>
                  </View>
                  <AppText variant="label" weight="700">
                    {egp(lesson.amount)}
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
                <AppText variant="label">Total</AppText>
                <AppText variant="h3">{egp(billing.totalEgp)}</AppText>
              </View>
            </Card>
          )}

          <SectionHeader title="Payout details" />
          {!billing.hasPayoutDetails ? (
            <Notice
              tone="warning"
              message="Add at least one payout method so the academy can transfer your earnings."
            />
          ) : null}
          <PayoutForm key={billing.month} billing={billing} />
        </>
      ) : null}
    </Screen>
  );
}

function PayoutForm({ billing }: { billing: TeacherBilling }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<TeacherPayoutInput>(() => formFrom(billing));
  const saved = formFrom(billing);
  const dirty = fields.some((field) => saved[field.key] !== form[field.key]);
  const hasAnyMethod = fields.some((field) => form[field.key].trim().length > 0);

  const saveMutation = useMutation({
    mutationFn: () => savePayoutDetails(form),
    onSuccess: async () => {
      showToast("Payout details saved. The academy will use them for your transfers.");
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (error) =>
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to save your payout details.",
        "error"
      ),
  });

  return (
    <Card style={styles.formCard}>
      <AppText variant="small" color="muted" style={styles.formIntro}>
        Fill in any method that works for you. InstaPay, Vodafone Cash, or an
        Egyptian bank account.
      </AppText>
      {fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={form[field.key]}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, [field.key]: value }))
          }
          placeholder={field.placeholder}
          keyboardType={field.keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={field.maxLength}
        />
      ))}
      <Button
        title={saveMutation.isPending ? "Saving…" : "Save payout details"}
        icon="save-outline"
        loading={saveMutation.isPending}
        disabled={!dirty || !hasAnyMethod}
        onPress={() => saveMutation.mutate()}
      />
      {!hasAnyMethod ? (
        <AppText variant="caption" color="muted">
          Add at least one method before saving.
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: 14, gap: 2 },
  loadingSection: { marginTop: 22, gap: 10 },
  openNote: { marginTop: 6 },
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
  formCard: { gap: 14 },
  formIntro: { lineHeight: 20 },
});
