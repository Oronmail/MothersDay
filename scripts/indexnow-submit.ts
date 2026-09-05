// Submits every URL in the live sitemap to IndexNow (api.indexnow.org), which
// feeds Bing and the other IndexNow-enabled engines instantly instead of
// waiting for a crawl. ChatGPT search retrieves from Bing's index, so this is
// also the fast path into LLM answers. Runs automatically after every
// production deploy via .github/workflows/indexnow.yml; by hand:
//   npm run seo:indexnow
// The key is public by design - the matching key file in public/ proves
// domain ownership.

const HOST = "www.mothersday.co.il";
const KEY = "f19e1d2ed79c4f8cbb981c8042a5c2b3";
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;

async function main() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: HTTP ${res.status}`);
  }
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.length) {
    throw new Error("No URLs found in sitemap");
  }

  const keyLocation = `https://${HOST}/${KEY}.txt`;
  const keyFile = await fetch(keyLocation);
  if (!keyFile.ok) {
    throw new Error(
      `Key file not reachable at ${keyLocation} (HTTP ${keyFile.status}) - deploy public/${KEY}.txt first.`
    );
  }

  const submission = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation, urlList: urls }),
  });

  // 200 = submitted; 202 = accepted, key validated asynchronously.
  if (submission.status !== 200 && submission.status !== 202) {
    throw new Error(
      `IndexNow rejected the submission: HTTP ${submission.status} ${await submission.text()}`
    );
  }
  console.log(`[indexnow] Submitted ${urls.length} URLs (HTTP ${submission.status}).`);
}

main().catch((error) => {
  console.error("[indexnow] Failed:", error);
  process.exit(1);
});
