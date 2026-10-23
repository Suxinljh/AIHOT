// Opens the product's entry points and the surviving machine endpoints, and checks each answers. The
// public reading site is retired, so the reader pages, RSS, API v1, MCP, sitemap and share images are
// expected to be gone; a smoke run that finds one of them serving 200 is a failure too.
//   node scripts/smoke.ts [--base http://localhost:3000]
const at = process.argv.indexOf("--base");
const base = (at > 0 ? process.argv[at + 1] : process.env.SITE_URL) ?? "http://localhost:3000";

/** The product entry and the private studio's sign-in gate. */
const REDIRECTS: Array<[path: string, status: number, location: RegExp]> = [
  ["/", 302, /^\/api\/auth\/login\?return=%2F$/],
  ["/topics", 302, /^\/api\/auth\/login\?return=%2Ftopics$/],
  ["/studio", 302, /^\/$/],
  ["/studio/topics", 302, /^\/topics$/],
];

/** The admin sign-in page is still served (the back office keeps its own session). */
const PAGES = ["/admin/login"];

/** Endpoints a deployment must keep. */
const MACHINE: Array<[path: string, type: RegExp]> = [["/api/health", /json/]];

/** Retired public exits: each must answer 404 (or 410), never a public payload. */
const RETIRED = [
  "/all",
  "/hot",
  "/daily",
  "/topics",
  "/starred",
  "/about",
  "/changelog",
  "/feedback",
  "/more",
  "/agent",
  "/feed.xml",
  "/feed/all.xml",
  "/llms.txt",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/openapi-v1.json",
  "/api/v1/items",
  "/api/v1/hot-topics",
  "/api/site/meta",
  "/og/site.png",
  "/api/mcp",
];

let failed = 0;
async function check(path: string, expect: (res: Response, body: string) => string | null) {
  try {
    const res = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
    const body = res.headers.get("content-type")?.startsWith("image/") ? "" : await res.text();
    const problem = res.status !== 200 ? `HTTP ${res.status}` : expect(res, body);
    console.log(`${problem ? "✗" : "✓"} ${path}${problem ? `  ${problem}` : ""}`);
    if (problem) failed += 1;
  } catch (error) {
    console.log(`✗ ${path}  ${String(error)}`);
    failed += 1;
  }
}

for (const path of PAGES) await check(path, (_res, body) => (body.length > 0 ? null : "empty body"));
for (const [path, status, location] of REDIRECTS) {
  try {
    const res = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
    const actual = res.headers.get("location") ?? "";
    const problem = res.status !== status ? `HTTP ${res.status}` : location.test(actual) ? null : `Location ${actual}`;
    console.log(`${problem ? "✗" : "✓"} ${path}${problem ? `  ${problem}` : ""}`);
    if (problem) failed += 1;
    await res.text();
  } catch (error) {
    console.log(`✗ ${path}  ${String(error)}`);
    failed += 1;
  }
}
for (const [path, type] of MACHINE) await check(path, (res) => (type.test(res.headers.get("content-type") ?? "") ? null : `content-type ${res.headers.get("content-type")}`));

for (const path of RETIRED) {
  try {
    const res = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
    const problem = res.status === 200 ? "still served" : null;
    console.log(`${problem ? "✗" : "✓"} ${path} retired (HTTP ${res.status})${problem ? `  ${problem}` : ""}`);
    if (problem) failed += 1;
    await res.text();
  } catch (error) {
    console.log(`✗ ${path}  ${String(error)}`);
    failed += 1;
  }
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
