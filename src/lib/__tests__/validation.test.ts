import { describe, expect, it } from "vitest";
import {
  clampText,
  isNumericCode,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  passwordProblem,
} from "../validation";

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("student@example.com")).toBe(true);
    expect(isValidEmail("  teacher+lessons@academy.org  ")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("student")).toBe(false);
    expect(isValidEmail("student@example")).toBe(false);
    expect(isValidEmail("student @example.com")).toBe(false);
  });
});

describe("passwordProblem", () => {
  it("accepts identity-compatible passwords", () => {
    expect(passwordProblem("Quran2026")).toBeNull();
  });

  it("explains the first missing rule", () => {
    expect(passwordProblem("Ab1")).toBe("Use at least 8 characters.");
    expect(passwordProblem("quranstudy")).toBe(
      "Include at least one digit (0-9)."
    );
    expect(passwordProblem("QURAN2026")).toBe(
      "Include at least one lowercase letter."
    );
  });
});

describe("phone helpers", () => {
  it("strips formatting before validation", () => {
    expect(normalizePhone("+974 5555-1234")).toBe("+97455551234");
    expect(normalizePhone("(+961) 70 123 456")).toBe("+96170123456");
  });

  it("only accepts E.164 numbers", () => {
    expect(isValidPhone("+97455551234")).toBe(true);
    expect(isValidPhone("+974 5555 1234")).toBe(true);
    expect(isValidPhone("0097455551234")).toBe(false);
    expect(isValidPhone("55551234")).toBe(false);
    expect(isValidPhone("+0123456789")).toBe(false);
  });
});

describe("small string helpers", () => {
  it("clamps without throwing", () => {
    expect(clampText("abcdef", 3)).toBe("abc");
    expect(clampText("ab", 3)).toBe("ab");
  });

  it("recognises one-time codes", () => {
    expect(isNumericCode("1234")).toBe(true);
    expect(isNumericCode("12345678")).toBe(true);
    expect(isNumericCode("123")).toBe(false);
    expect(isNumericCode("12a4")).toBe(false);
  });
});
