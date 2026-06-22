import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import Page from "./page";

test("renders the home page during server prerendering", () => {
  expect(() => renderToString(<Page />)).not.toThrow();
});
