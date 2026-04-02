import type { Handler } from "../types";
import { InputError, NetworkError } from "../errors";
import { complete } from "../llm";
import { log } from "../output";

const GITHUB_REPO_RE = /github\.com\/([\w.-]+)\/([\w.-]+)/;

function parseRepo(input: string): { owner: string; repo: string } | null {
  const match = input.match(GITHUB_REPO_RE);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

async function fetchGitHub(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "bun-kit/0.1",
    },
  });
  if (res.status === 404) throw new InputError(`GitHub resource not found: ${url}`);
  if (res.status === 403) throw new NetworkError("GitHub API rate limit exceeded (60 req/hr unauthenticated)");
  if (!res.ok) throw new NetworkError(`GitHub API error: ${res.status} ${res.statusText}`);
  return res;
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await fetchGitHub(`https://api.github.com/repos/${owner}/${repo}/readme`);
  const data = await res.json() as { content?: string; encoding?: string };
  if (data.content && data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  // Fallback: fetch raw
  const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`);
  return rawRes.ok ? rawRes.text() : "(No README found)";
}

async function fetchTree(owner: string, repo: string): Promise<string> {
  try {
    const res = await fetchGitHub(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
    const data = await res.json() as { tree?: Array<{ path: string; type: string }> };
    if (!data.tree) return "(No tree data)";

    // Limit to first 200 entries to keep prompt manageable
    const entries = data.tree.slice(0, 200);
    const lines = entries.map((e) => `${e.type === "tree" ? "📁" : "  "} ${e.path}`);
    if (data.tree.length > 200) {
      lines.push(`... and ${data.tree.length - 200} more files`);
    }
    return lines.join("\n");
  } catch {
    return "(Could not fetch directory tree)";
  }
}

const SYSTEM_PROMPT = `You are a technical analyst. Given a GitHub repository's README and directory structure, produce a concise project summary. Include:
1. What the project does (1-2 sentences)
2. Key technologies and languages used
3. Project structure overview
4. Notable features or design decisions
Keep the summary under 500 words. Be factual and direct.`;

export const githubHandler: Handler = {
  name: "github",
  canHandle: (input, inputType) => {
    return inputType === "url" && GITHUB_REPO_RE.test(input);
  },
  handle: async (input, config) => {
    const parsed = parseRepo(input);
    if (!parsed) throw new InputError(`Could not parse GitHub URL: ${input}`);

    const { owner, repo } = parsed;
    log(`Fetching GitHub repo: ${owner}/${repo}`);

    const [readme, tree] = await Promise.all([
      fetchReadme(owner, repo),
      fetchTree(owner, repo),
    ]);

    const rawContent = `# README\n\n${readme}\n\n# Directory Structure\n\n${tree}`;

    // If no API key, degrade to raw content
    const apiKey = config.openrouter_api_key;
    if (!apiKey) {
      log("No OpenRouter API key — returning raw README + tree");
      return {
        text: rawContent,
        metadata: {
          handler: "github",
          owner,
          repo,
          mode: "raw",
        },
      };
    }

    log(`Summarizing with LLM (model: ${config.default_model || "default"})...`);
    const result = await complete({
      apiKey,
      model: config.default_model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Summarize this GitHub repository (${owner}/${repo}):\n\n${rawContent}`,
    });

    return {
      text: result.text,
      metadata: {
        handler: "github",
        owner,
        repo,
        mode: "summary",
        model: result.model,
        usage: result.usage,
      },
    };
  },
};
