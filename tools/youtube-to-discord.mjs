// New YouTube videos → Discord (run by .github/workflows/youtube.yml, every 30 minutes).
// Reads the channel's public feed, posts every video not seen yet to a Discord webhook, oldest first, and keeps the
// list of seen videos in a JSON file (the workflow stores it on the `youtube-bot` branch).
//
//   node tools/youtube-to-discord.mjs <seen.json>
//
// Environment: CHANNEL_ID (YouTube channel id, UC…), DISCORD_WEBHOOK (the webhook URL, a repository secret),
// DRY_RUN=1 to print the messages instead of posting them.
// First run (no seen list yet): every video already on the channel is marked as seen and nothing is posted.

import fs from "node:fs";

const [seenFile] = process.argv.slice(2);
const { CHANNEL_ID, DISCORD_WEBHOOK, DRY_RUN } = process.env;
if ( !seenFile || !CHANNEL_ID ) throw new Error("usage: CHANNEL_ID=… node tools/youtube-to-discord.mjs <seen.json>");

const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const response = await fetch(feedUrl);
if ( !response.ok ) throw new Error(`YouTube feed: HTTP ${response.status}`);
const xml = await response.text();

const decode = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
  id: entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1],
  title: decode(entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""),
  url: entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1],
  published: entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? ""
})).filter(v => v.id && v.url);

let seen = null;
try { seen = JSON.parse(fs.readFileSync(seenFile, "utf8")); } catch { seen = null; }

if ( !Array.isArray(seen) ) {
  fs.writeFileSync(seenFile, JSON.stringify(videos.map(v => v.id), null, 1) + "\n");
  console.log(`First run: ${videos.length} existing videos marked as seen, nothing posted.`);
  process.exit(0);
}

const fresh = videos.filter(v => !seen.includes(v.id)).sort((a, b) => a.published.localeCompare(b.published));
if ( !fresh.length ) { console.log("No new video."); process.exit(0); }
if ( !DISCORD_WEBHOOK && !DRY_RUN ) throw new Error("DISCORD_WEBHOOK is not set (repository secret DISCORD_YOUTUBE_WEBHOOK).");

for ( const video of fresh ) {
  const short = video.url.includes("/shorts/");
  const content = `${short ? "🎬 **New short**" : "▶️ **New video**"}: ${video.title}\n${video.url}`;
  if ( DRY_RUN ) console.log(`[dry run] ${content}`);
  else {
    const post = await fetch(DISCORD_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) });
    if ( !post.ok ) throw new Error(`Discord: HTTP ${post.status} ${await post.text()}`);
    console.log(`Posted: ${video.title}`);
  }
  seen.push(video.id);
  fs.writeFileSync(seenFile, JSON.stringify(seen.slice(-500), null, 1) + "\n");   // saved after each post: no double post
}
