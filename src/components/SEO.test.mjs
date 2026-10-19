import { expect, test } from "bun:test";
import { createProductSchema } from "./SEO";

test("Me AI's structured audience is ages 6–16", () => {
  const schema = createProductSchema({ name: "Me AI", description: "Interactive AI learning" });
  expect(schema.audience.suggestedMinAge).toBe(6);
  expect(schema.audience.suggestedMaxAge).toBe(16);
});
