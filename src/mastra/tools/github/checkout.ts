import { createTool } from '@mastra/core/tools';
import { sandbox as sandboxConfig } from '../../config';
import { channelContext } from '../../lib/context';
import { githubAccess, githubAccessToken } from '../../lib/github';
import { repoPushAccess } from '../../lib/github/api';
import { shellQuote } from '../../lib/utils';
import { input } from '../../types/tools/index';
import { requireSandbox } from '../../workspace';
import { branchSchema, git, repositorySchema, withCredential } from './git';

export const checkoutTool = ({
  approval,
  userId,
}: {
  approval: boolean;
  userId: string;
}) =>
  createTool({
    id: 'github_checkout',
    description:
      'Clone a repository into the sandbox and check out a branch, so you can build, test, and edit across many files. Required before github_push_branch: the sandbox holds no GitHub credentials, so a plain git clone fails. Safe to run again.',
    requireApproval: approval,
    inputSchema: input({
      repository: repositorySchema.describe(
        'Repository to check out, as "owner/repo".'
      ),
      branch: branchSchema
        .optional()
        .describe(
          'An existing branch to fetch and check out, such as a pull request branch. Omit to stay on the default branch.'
        ),
    }),
    execute: async ({ repository, branch }, context) => {
      const sandbox = await requireSandbox(context.requestContext);
      const path = `${sandboxConfig.workdir}/${repository.split('/')[1]}`;
      const remote = `https://github.com/${repository}.git`;
      return await withCredential({
        operation: async () => {
          await git({
            command: `test -d ${shellQuote(`${path}/.git`)} || git clone --depth 50 ${shellQuote(remote)} ${shellQuote(path)}`,
            sandbox,
          });
          if (branch) {
            await git({
              command: `git fetch ${shellQuote(remote)} ${shellQuote(branch)} && git checkout -B ${shellQuote(branch)} FETCH_HEAD`,
              cwd: path,
              sandbox,
            });
          }
          const sha = await git({
            command: 'git rev-parse HEAD',
            cwd: path,
            sandbox,
          });

          const token = await githubAccessToken(userId);
          const access = token
            ? await repoPushAccess({ repository, token })
            : { error: 'no token' };
          const edit = `Edit files in the sandbox under ${path}.`;
          if ('push' in access && access.push) {
            return {
              path,
              sha,
              note: `${edit} You can push to this repo: github_push_branch to push a new branch, then github_create_pull_request. No API tool writes files or branches, and you cannot touch a default branch.`,
            };
          }

          // No push access: the only route is a fork, and only a PAT can fork
          // (an app pushes only where it is installed). `githubAccess` is
          // memoized on the request, so this re-read is a cache hit.
          const resolved = await githubAccess({
            isDM: channelContext(context.requestContext).isDM === true,
            requestContext: context.requestContext,
            userId,
          });
          const canFork =
            resolved.state === 'connected' &&
            resolved.credential.kind === 'pat';
          return {
            path,
            sha,
            note: canFork
              ? `${edit} You do not have push access to this repo. Fork it with github_fork_repository, then github_push_branch to push a branch to your fork, then github_create_pull_request from the fork to the original.`
              : `${edit} You do not have push access to this repo and this GitHub connection cannot fork (an app only pushes where it is installed). You can read and open issues here, but not push changes. Say so rather than attempting a push that will fail.`,
          };
        },
        sandbox,
        userId,
      });
    },
  });
