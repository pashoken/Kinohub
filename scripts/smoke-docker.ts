const base = process.env.KINOHUB_SMOKE_URL ?? "http://127.0.0.1:4100";

async function json(path: string, init?: RequestInit) {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

const health = await json("/api/health");
const catalog = (await json("/api/catalog")) as {
  rails: Array<{ movies: Array<{ id: string }> }>;
};
const movieId = catalog.rails[0]?.movies[0]?.id;
if (!movieId) throw new Error("catalog has no movie");
const search = (await json("/api/torrents/search", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ movieId }),
})) as { choices: Array<{ id: string; compatibility: string }> };
const choice = search.choices.find(
  (item) => item.compatibility !== "incompatible",
);
if (!choice) throw new Error("torrent search has no playable choice");
const handoff = await json("/api/playback/handoff", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ choiceId: choice.id }),
});
process.stdout.write(
  `SMOKE_OK health=${String(health.status)} rails=${catalog.rails.length} choices=${search.choices.length} playback=${String(handoff.status)}\n`,
);
