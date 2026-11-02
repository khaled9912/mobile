import { apiFetch } from "./client";

export type PaymentClaimStatus = "pending" | "confirmed" | "rejected";

export interface AcademyBankAccount {
  id: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban: string;
  swift: string;
  notes: string;
  updatedAt: string;
}

export interface BillingLesson {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  startsAt: string;
  endsAt: string;
  isTrial: boolean;
  amount: number;
}

export interface BillingMonth {
  month: string;
  lessonCount: number;
  total: number;
}

export interface MonthlyPaymentClaim {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  month: string;
  lessonCount: number;
  amountUsd: number;
  status: PaymentClaimStatus;
  studentNote: string | null;
  adminNote: string | null;
  claimedAt: string;
  reviewedAt: string | null;
}

export interface StudentBilling {
  month: string;
  monthClosed: boolean;
  months: BillingMonth[];
  lessons: BillingLesson[];
  totalUsd: number;
  bankAccount: AcademyBankAccount | null;
  claim: MonthlyPaymentClaim | null;
  canClaim: boolean;
}

export interface TeacherPayoutDetail {
  teacherId: string;
  instaPayAccount: string;
  vodafoneCashNumber: string;
  bankName: string;
  bankAccountHolder: string;
  bankIban: string;
  updatedAt: string;
}

export interface TeacherPayoutInput {
  instaPayAccount: string;
  vodafoneCashNumber: string;
  bankName: string;
  bankAccountHolder: string;
  bankIban: string;
}

export interface TeacherBilling {
  month: string;
  monthClosed: boolean;
  months: BillingMonth[];
  lessons: BillingLesson[];
  totalEgp: number;
  payoutPerLessonEgp: number;
  payoutDetails: TeacherPayoutDetail;
  hasPayoutDetails: boolean;
}

const withMonth = (path: string, month?: string) =>
  month ? `${path}?month=${encodeURIComponent(month)}` : path;

export const getStudentBilling = (month?: string) =>
  apiFetch<StudentBilling>(withMonth("/api/student/billing", month));

export const markPaymentSent = (input: { month: string; note?: string }) =>
  apiFetch<MonthlyPaymentClaim>("/api/student/billing/claims", {
    method: "POST",
    json: input,
  });

export const getTeacherBilling = (month?: string) =>
  apiFetch<TeacherBilling>(withMonth("/api/teacher/billing", month));

export const savePayoutDetails = (input: TeacherPayoutInput) =>
  apiFetch<TeacherPayoutDetail>("/api/teacher/billing/payout-details", {
    method: "PUT",
    json: input,
  });
