import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("creates a complete static GitHub Pages build", async () => {
  const output = new URL("dist/", root);
  const htmlUrl = new URL("index.html", output);

  await access(htmlUrl);
  await access(new URL("favicon.svg", output));

  const html = await readFile(htmlUrl, "utf8");
  const assets = await readdir(new URL("assets/", output));

  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /\.\/assets\//);
  assert.ok(assets.some((file) => file.endsWith(".js")));
  assert.ok(assets.some((file) => file.endsWith(".css")));
});
