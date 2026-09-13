import { GITHUB_WRITE_TOOLS, type GithubToolName } from '@github-tools/sdk';

const READ_TOOLS: GithubToolName[] = [
  'compareCommits',
  'getCiFailureContext',
  'getCommit',
  'getFileContent',
  'getIssueContext',
  'getPullRequestContext',
  'getRepository',
  'getRepositoryTree',
  'listBranches',
  'listCheckRuns',
  'listCommits',
  'listIssueComments',
  'listIssues',
  'listLabels',
  'listPullRequestFiles',
  'listPullRequestReviews',
  'listPullRequests',
  'searchCode',
  'searchIssues',
  'searchRepositories',
];

const WRITE_TOOLS: GithubToolName[] = [
  'addAssignees',
  'addIssueComment',
  'addLabels',
  'addPullRequestComment',
  'closeIssue',
  'createIssue',
  'createPullRequest',
  'forkRepository',
  'removeAssignees',
  'removeLabel',
  'requestReviewers',
  'updateIssue',
  'updatePullRequest',
];

export const isWriteTool = (name: GithubToolName): boolean =>
  name in GITHUB_WRITE_TOOLS;

const misgrouped = [
  ...WRITE_TOOLS.filter((name) => !isWriteTool(name)),
  ...READ_TOOLS.filter(isWriteTool),
];
if (misgrouped.length > 0) {
  throw new Error(
    `GitHub tool read/write split disagrees with the SDK for: ${misgrouped.join(', ')}. The SDK reclassified these, so their approval gating is now wrong. Move them between READ_TOOLS and WRITE_TOOLS.`
  );
}

export const ALLOWLIST: GithubToolName[] = [...READ_TOOLS, ...WRITE_TOOLS];
