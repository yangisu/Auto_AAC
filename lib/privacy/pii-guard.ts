export type DirectIdentifierKind =
  | "email"
  | "phone"
  | "resident_registration_number"
  | "student_number";

const DIRECT_IDENTIFIER_PATTERNS: ReadonlyArray<
  readonly [DirectIdentifierKind, RegExp]
> = [
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ["phone", /(?<!\d)01[016789][\s-]?\d{3,4}[\s-]?\d{4}(?!\d)/],
  ["resident_registration_number", /(?<!\d)\d{6}[\s-]?[1-4]\d{6}(?!\d)/],
  ["student_number", /(?:학번|학생\s*번호)\s*[:：]?\s*\d{4,}(?!\d)/],
];

export function findDirectIdentifierKinds(text: string): DirectIdentifierKind[] {
  return DIRECT_IDENTIFIER_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(
    ([kind]) => kind,
  );
}
