import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import Page from "./page";

test("renders the home page during server prerendering", () => {
  expect(() => renderToString(<Page />)).not.toThrow();
});

test("ships the required ocean background loop video asset", () => {
  const assetPath = join(process.cwd(), "public", "backgrounds", "morning-ocean-loop.mp4");

  expect(existsSync(assetPath)).toBe(true);
  expect(statSync(assetPath).size).toBeGreaterThan(0);
});
