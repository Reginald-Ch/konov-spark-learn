import { expect, test } from "bun:test";
import { createProductSchema } from "./SEO";

test("MeAI's structured audience is ages 6–14", () => {
  const schema = createProductSchema({ name: "MeAI", description: "Interactive AI learning" });
  expect(schema.audience.suggestedMinAge).toBe(6);
  expect(schema.audience.suggestedMaxAge).toBe(14);
});
