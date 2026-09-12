import { execFileSync } from 'node:child_process';

interface Commit {
  sha: string;
  subject: string;
  url: string | undefined;
}

function git(args: string[]): string | undefined {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || undefined;
  } catch {
    // Required by lint: ultracite rejects an empty catch, and rejects
    // `return undefined` and bare `return` as useless, so a comment is the
    // only thing that satisfies it. Do not strip this in a no-comments pass.
    // The why it also records: a built deploy may have no git and no
    // checkout, so drop the footer rather than taking the App Home down.
  }
}

function readCommit(): Commit | undefined {
  const sha = git(['rev-parse', '--short', 'HEAD']);
  if (!sha) {
    return;
  }
  const remote = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(
    git(['remote', 'get-url', 'origin']) ?? ''
  );
  return {
    sha,
    subject: git(['log', '-1', '--format=%s']) ?? '',
    url: remote ? `https://github.com/${remote[1]}/commit/${sha}` : undefined,
  };
}

export const commit = readCommit();
