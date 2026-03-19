import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGithubClient } from "../lib/github.js";
import type { CommitEntry, CommitRepoResult, Env, ErrorResult } from "../types/index.js";

const paramsSchema = {
  repos: z.array(z.string()).optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
  include_stats: z.boolean().optional().default(false),
};

type GithubCommitListItem = {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
};

type GithubRepoItem = {
  full_name: string;
};

type GithubCommitDetail = GithubCommitListItem & {
  stats: { additions: number; deletions: number; total: number };
  files: { filename: string }[];
};

async function fetchRepoCommits(
  env: Env,
  repo: string,
  since: string,
  until: string,
  includeStats: boolean,
): Promise<CommitRepoResult | ErrorResult> {
  try {
    const client = getGithubClient(env);
    const sinceISO = `${since}T00:00:00+09:00`;
    const untilISO = `${until}T23:59:59+09:00`;

    const items = await client.request<GithubCommitListItem[]>(
      `/repos/${repo}/commits?since=${encodeURIComponent(sinceISO)}&until=${encodeURIComponent(untilISO)}&per_page=100`,
    );

    let commits: CommitEntry[];

    if (!includeStats) {
      commits = items.map((item) => ({
        sha: item.sha.slice(0, 7),
        message: item.commit.message.split("\n")[0],
        author: item.commit.author?.name ?? "",
        date: item.commit.author?.date ?? "",
      }));
    } else {
      const details = await Promise.all(
        items.map((item) => client.request<GithubCommitDetail>(`/repos/${repo}/commits/${item.sha}`)),
      );
      commits = details.map((d) => ({
        sha: d.sha.slice(0, 7),
        message: d.commit.message.split("\n")[0],
        author: d.commit.author?.name ?? "",
        date: d.commit.author?.date ?? "",
        stats: { additions: d.stats.additions, deletions: d.stats.deletions },
        files: d.files.map((f) => f.filename),
      }));
    }

    return { repo, commits };
  } catch (e) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    return { error: true, message, code: "GITHUB_API_ERROR" };
  }
}

async function fetchAllRepos(env: Env): Promise<string[]> {
  const client = getGithubClient(env);
  const items = await client.request<GithubRepoItem[]>("/user/repos?per_page=100&sort=pushed&type=owner");
  return items.map((r) => r.full_name);
}

export function registerGetCommits(server: McpServer, env: Env) {
  server.tool(
    "get_commits",
    "指定したリポジトリの日付範囲内のコミット履歴を取得する。repos を省略すると全リポジトリが対象になる",
    paramsSchema,
    async (params) => {
      const repos = params.repos ?? (await fetchAllRepos(env));
      const results = await Promise.all(
        repos.map((repo) => fetchRepoCommits(env, repo, params.since, params.until, params.include_stats)),
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
    },
  );
}
