// Vercel Edge Function — proxies the KMB open-data API.
// Runs on Vercel's servers (not the browser), so there's no CORS problem and no
// browser rate-limiting. Responses are cached at Vercel's edge for 1 hour, so the
// big route map is only fetched from the gov API occasionally, and your app loads fast.
//
// The app calls:  /api/kmb?path=/v1/transport/kmb/stop
// and this function fetches: https://data.etabus.gov.hk/v1/transport/kmb/stop

export const config = { runtime: "edge" };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";

  // Only allow the KMB transport endpoints — never proxy arbitrary URLs.
  if (!path.startsWith("/v1/transport/kmb/")) {
    return new Response(JSON.stringify({ error: "bad path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch("https://data.etabus.gov.hk" + path, {
      headers: { "Accept": "application/json" },
    });
    // Stream the body straight through (handles the multi-MB route map fine).
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        // Cache at the edge: 1h fresh, then serve stale while refreshing for a day.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
