import { describe, expect, it } from "vitest";

import { findDirectIdentifierKinds } from "./pii-guard";

describe("findDirectIdentifierKinds", () => {
  it("allows a student profile without direct identifiers", () => {
    expect(
      findDirectIdentifierKinds(
        "긴 문장을 어려워하고 흰 배경의 큰 그림에 잘 반응함",
      ),
    ).toEqual([]);
  });

  it.each([
    ["teacher@example.com", "email"],
    ["010-1234-5678", "phone"],
    ["학번: 20260123", "student_number"],
  ] as const)("classifies %s as %s", (text, expectedKind) => {
    expect(findDirectIdentifierKinds(text)).toEqual([expectedKind]);
  });

  it.each([
    "123456-1234567",
    "123456 1234567",
    "1234561234567",
  ])("classifies resident registration number format %s", (text) => {
    expect(findDirectIdentifierKinds(text)).toEqual([
      "resident_registration_number",
    ]);
  });

  it.each(["학생 번호: 20260123", `학번: ${"9".repeat(13)}`])(
    "classifies labeled student number format %s",
    (text) => {
      expect(findDirectIdentifierKinds(text)).toEqual(["student_number"]);
    },
  );
});
