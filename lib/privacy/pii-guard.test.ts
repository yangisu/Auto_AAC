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
    ["123456-1234567", "resident_registration_number"],
    ["학번: 20260123", "student_number"],
  ] as const)("classifies %s as %s", (text, expectedKind) => {
    expect(findDirectIdentifierKinds(text)).toEqual([expectedKind]);
  });
});
