#!/usr/bin/env tsx
/**
 * Reddit scraper — fetches posts + full comment threads from any subreddit URL.
 *
 * Credentials: create a file called .env in this folder:
 *   REDDIT_CLIENT_ID=your_client_id
 *   REDDIT_CLIENT_SECRET=your_client_secret
 *
 * Usage:
 *   npx tsx reddit.ts <reddit-url> [--limit <n>] [--output <file>]
 *
 * Examples:
 *   npx tsx reddit.ts https://www.reddit.com/r/programming/ --limit 5
 *   npx tsx reddit.ts https://www.reddit.com/r/worldnews/ --limit 25 --output posts.json
 */

// Load .env from the same directory as this script
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  depth: number;
  replies: Comment[];
}

interface Post {
  id: string;
  title: string;
  author: string;
  score: number;
  upvote_ratio: number;
  url: string;
  permalink: string;
  selftext: string;
  is_self: boolean;
  created_utc: number;
  num_comments: number;
  flair: string | null;
  comments: Comment[];
}

interface Output {
  subreddit: string;
  source_url: string;
  fetched_at: string;
  post_count: number;
  posts: Post[];
}

// ── OAuth ────────────────────────────────────────────────────────────────────

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "reddit-scraper/1.0 (by personal script)",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OAuth failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`OAuth error: ${data.error ?? "no token returned"}`);
  return data.access_token;
}

// ── Reddit API helpers ───────────────────────────────────────────────────────

async function fetchJson(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "reddit-scraper/1.0 (by personal script)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

function parseCommentTree(children: unknown[]): Comment[] {
  const comments: Comment[] = [];

  for (const child of children) {
    const c = child as { kind: string; data: Record<string, unknown> };
    if (c.kind !== "t1") continue;

    const d = c.data;
    const repliesListing = d.replies as { data?: { children?: unknown[] } } | string | null;
    const replyChildren =
      repliesListing &&
      typeof repliesListing === "object" &&
      repliesListing.data?.children
        ? repliesListing.data.children
        : [];

    comments.push({
      id: d.id as string,
      author: d.author as string,
      body: d.body as string,
      score: d.score as number,
      created_utc: d.created_utc as number,
      depth: (d.depth as number) ?? 0,
      replies: parseCommentTree(replyChildren as unknown[]),
    });
  }

  return comments;
}

async function fetchComments(permalink: string, token: string): Promise<Comment[]> {
  const path = permalink.replace(/^https?:\/\/[^/]+/, "").replace(/\/?$/, "");
  const url = `https://oauth.reddit.com${path}.json?raw_json=1&limit=500`;
  try {
    const data = (await fetchJson(url, token)) as Array<{ data: { children: unknown[] } }>;
    if (!Array.isArray(data) || data.length < 2) return [];
    return parseCommentTree(data[1].data.children);
  } catch (err) {
    process.stderr.write(`    (skipped comments — ${(err as Error).message})\n`);
    return [];
  }
}

function extractSearchQuery(url: string): string | null {
  const match = url.match(/[?&]q=([^&#]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1].replace(/\+/g, " "));
}

async function fetchPosts(
  subredditUrl: string,
  limit: number,
  token: string,
  query: string | null
): Promise<Post[]> {
  const subreddit = extractSubreddit(subredditUrl);
  const url = query
    ? `https://oauth.reddit.com/r/${subreddit}/search.json?raw_json=1&limit=${limit}&q=${encodeURIComponent(
        query
      )}&restrict_sr=1&sort=relevance`
    : `https://oauth.reddit.com/r/${subreddit}.json?raw_json=1&limit=${limit}`;
  const data = (await fetchJson(url, token)) as {
    data: { children: Array<{ data: Record<string, unknown> }> };
  };

  const listings = data.data.children;
  const posts: Post[] = [];

  for (let i = 0; i < listings.length; i++) {
    const d = listings[i].data;
    process.stderr.write(`  [${i + 1}/${listings.length}] ${d.title as string}\n`);

    const comments = await fetchComments(
      `https://www.reddit.com${d.permalink as string}`,
      token
    );

    posts.push({
      id: d.id as string,
      title: d.title as string,
      author: d.author as string,
      score: d.score as number,
      upvote_ratio: d.upvote_ratio as number,
      url: d.url as string,
      permalink: `https://www.reddit.com${d.permalink as string}`,
      selftext: d.selftext as string,
      is_self: d.is_self as boolean,
      created_utc: d.created_utc as number,
      num_comments: d.num_comments as number,
      flair: (d.link_flair_text as string | null) ?? null,
      comments,
    });

    if (i < listings.length - 1) await sleep(300);
  }

  return posts;
}

// ── Utils ────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractSubreddit(url: string): string {
  const match = url.match(/reddit\.com\/r\/([^/?#]+)/);
  if (!match) throw new Error(`Cannot extract subreddit from URL: ${url}`);
  return match[1];
}

function parseArgs(argv: string[]): { url: string; limit: number; output: string | null } {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.error(`
Usage: npx tsx reddit.ts <reddit-url> [--limit <n>] [--output <file>]

  <reddit-url>   Full URL to a subreddit (e.g. https://www.reddit.com/r/programming/)
  --limit  <n>   Number of posts to fetch (default: 10, max: 100)
  --output <f>   Write JSON to this file instead of stdout

Env vars required:
  REDDIT_CLIENT_ID      Your Reddit app client ID
  REDDIT_CLIENT_SECRET  Your Reddit app client secret

Get credentials at: https://www.reddit.com/prefs/apps
  → "create another app" → type: script → any name + redirect URI

Examples:
  npx tsx reddit.ts https://www.reddit.com/r/onlinecourses/ --limit 5
  npx tsx reddit.ts https://www.reddit.com/r/worldnews/ --limit 25 --output news.json
`);
    process.exit(0);
  }

  const url = args[0];
  let limit = 10;
  let output: string | null = null;

  for (let i = 1; i < args.length; i++) {
    if ((args[i] === "--limit" || args[i] === "-l") && args[i + 1]) {
      limit = Math.min(100, Math.max(1, parseInt(args[++i], 10)));
    } else if ((args[i] === "--output" || args[i] === "-o") && args[i + 1]) {
      output = args[++i];
    }
  }

  return { url, limit, output };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(`
Error: Missing Reddit API credentials.

Set these env vars before running:
  export REDDIT_CLIENT_ID=your_client_id
  export REDDIT_CLIENT_SECRET=your_client_secret

Get free credentials at https://www.reddit.com/prefs/apps
  → "create another app" → type: script → any name, redirect URI: http://localhost
`);
    process.exit(1);
  }

  const { url, limit, output } = parseArgs(process.argv);

  if (!url.includes("reddit.com")) {
    console.error("Error: URL must be a reddit.com URL");
    process.exit(1);
  }

  const subreddit = extractSubreddit(url);

  process.stderr.write(`Authenticating with Reddit...\n`);
  const token = await getAccessToken(clientId, clientSecret);

  const query = extractSearchQuery(url);
  process.stderr.write(
    query
      ? `Searching r/${subreddit} for "${query}" (${limit} posts)...\n`
      : `Fetching ${limit} posts from r/${subreddit}...\n`
  );
  const posts = await fetchPosts(url, limit, token, query);

  const result: Output = {
    subreddit,
    source_url: url,
    fetched_at: new Date().toISOString(),
    post_count: posts.length,
    posts,
  };

  const json = JSON.stringify(result, null, 2);

  if (output) {
    const { writeFileSync } = await import("fs");
    writeFileSync(output, json, "utf-8");
    process.stderr.write(`\nSaved ${posts.length} posts to ${output}\n`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
