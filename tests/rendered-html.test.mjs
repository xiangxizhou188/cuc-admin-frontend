import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("Pages build contains the CUC Supply admin brand", async () => {
  const html = await readFile(new URL("../pages-dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>CUC Supply 管理后台<\/title>/i);
  assert.match(html, /href="\/cuc-supply-mark\.png\?v=2"/i);

  const assetsUrl = new URL("../pages-dist/assets/", import.meta.url);
  const script = (await readdir(assetsUrl)).find((name) => name.endsWith(".js"));
  assert.ok(script, "admin JavaScript bundle should exist");
  const bundle = await readFile(new URL(script, assetsUrl), "utf8");
  assert.match(bundle, /CUC Supply/);
  assert.match(bundle, /运营控制中心/);
  assert.match(bundle, /cuc-supply-logo\.webp/);
  assert.doesNotMatch(bundle, />NEOTRIX</);
  assert.match(bundle, /欢迎回来/);
  assert.match(bundle, /运营概览/);
  assert.match(bundle, /商品管理/);
  assert.match(bundle, /库存管理/);
  assert.match(bundle, /操作日志/);
  assert.doesNotMatch(bundle, /Welcome back|Product management|Inventory control|Workspace settings/);
});

test("renders admin logos as white marks without a background panel", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.brand-mark img \{[^}]*background: transparent; filter: brightness\(0\) invert\(1\);/);
  assert.match(css, /\.auth-brand > img \{[^}]*background: transparent; filter: brightness\(0\) invert\(1\);/);
});

test("routes local admin sessions to the local Worker API", async () => {
  const source = await readFile(new URL("../app/api.ts", import.meta.url), "utf8");
  assert.match(source, /LOCAL_API_BASE_URL = "http:\/\/localhost:8787"/);
  assert.match(source, /currentHostname === "localhost"/);
  assert.match(source, /PRODUCTION_API_BASE_URL/);
});

test("binds uploaded homepage hero images to a managed page slot", async () => {
  const source = await readFile(new URL("../app/admin-console.tsx", import.meta.url), "utf8");
  assert.match(source, /slotKey:"hero_image"/);
  assert.match(source, /mediaId:uploaded\.id/);
  assert.match(source, /\/v1\/media\/\$\{encodeURIComponent\(heroImageSlot\.media_id\)\}\/content/);
  assert.doesNotMatch(source, /页面图片位置|已分配素材/);
  assert.doesNotMatch(source, /api\.media\(token\)/);
});

test("uses the documented readable admin typography scale", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rules = await readFile(new URL("../UI_DESIGN_RULES.md", import.meta.url), "utf8");
  assert.match(css, /--type-label: 11px/);
  assert.match(css, /--type-caption: 12px/);
  assert.match(css, /--type-body: 14px/);
  assert.match(css, /--type-control: 14px/);
  assert.match(css, /CUC Supply Admin typography system/);
  assert.match(rules, /Essential information must not render below 11px/);
  assert.match(rules, /primary reading and interactive text use 14px/);
});
