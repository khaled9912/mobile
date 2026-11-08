export interface GradeOption {
  value: string;
  short: string;
  explain: string;
}

// Mirrors the API's StudentGrades list (ApiEndpoints.cs).
export const GRADE_OPTIONS: GradeOption[] = [
  {
    value: "Kindergarten",
    short: "Kindergarten",
    explain: "Ages 5-6 · UK Year 1",
  },
  { value: "Grade 1", short: "Grade 1", explain: "Ages 6-7 · UK Year 2" },
  { value: "Grade 2", short: "Grade 2", explain: "Ages 7-8 · UK Year 3" },
  { value: "Grade 3", short: "Grade 3", explain: "Ages 8-9 · UK Year 4" },
  { value: "Grade 4", short: "Grade 4", explain: "Ages 9-10 · UK Year 5" },
  { value: "Grade 5", short: "Grade 5", explain: "Ages 10-11 · UK Year 6" },
  { value: "Grade 6", short: "Grade 6", explain: "Ages 11-12 · UK Year 7" },
  { value: "Grade 7", short: "Grade 7", explain: "Ages 12-13 · UK Year 8" },
  { value: "Grade 8", short: "Grade 8", explain: "Ages 13-14 · UK Year 9" },
  { value: "Grade 9", short: "Grade 9", explain: "Ages 14-15 · UK Year 10" },
  { value: "Grade 10", short: "Grade 10", explain: "Ages 15-16 · UK Year 11" },
  { value: "Grade 11", short: "Grade 11", explain: "Ages 16-17 · UK Year 12" },
  { value: "Grade 12", short: "Grade 12", explain: "Ages 17-18 · UK Year 13" },
];
