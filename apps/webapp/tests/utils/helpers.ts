import { randomBytes } from "crypto";

export const TEST_PASSWORD = "TestPass123!@#";

export function randomId(length = 12): string {
  return randomBytes(length).toString("hex").slice(0, length);
}

export function randomEmail(domain = "e2e-test.eduspot.io"): string {
  return `test-${randomId(8)}@${domain}`;
}

export function randomSlug(): string {
  return `e2e-${randomId(8)}`;
}

export function randomName(): string {
  const firstNames = [
    "Alice",
    "Bob",
    "Carol",
    "Dave",
    "Eve",
    "Frank",
    "Grace",
    "Hank",
  ];
  const lastNames = [
    "Smith",
    "Jones",
    "Brown",
    "Davis",
    "Clark",
    "Lewis",
    "Hall",
    "Young",
  ];

  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${first} ${last}`;
}
