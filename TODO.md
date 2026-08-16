# Template TODO

Keep this file limited to unresolved work that belongs in the reusable template.

## Simplification

- [ ] Split `workspace/skills/taste-skill/SKILL.md` (~16.6k tokens, well over Mastra's <5k recommendation) into `references/`.

## Customization

- [ ] Decide whether to enable resource-scoped Working Memory alongside the thread-scoped Observational Memory already in use, or leave it disabled.
- [ ] Add a concise plain-English response skill.

## Known issues

- [ ] Handle changing Slack Canvas export sizes in `get_slack_file`.
- [ ] Ensure image input skips model routes that do not support vision.
- [ ] Replace the temporary Mastra media token-count patch when the fix ships upstream.
- [ ] Refactor `tools/slack/call-api.ts` and the Slack code mode tool (`tools/code-mode/slack.ts`); the overlap between raw Slack Web API access and the wrapped Slack tools needs a cleaner boundary.
- [ ] Add an `assertCanPostTo`-style destination restriction to `react.ts` (currently the only Slack write tool without one).
- [ ] `execute_command`'s typing status shows the raw shell command. Wrapping the built-in tool to add a model-authored title turns out to be architecturally blocked: Mastra spreads workspace-derived tools after the agent's own `tools:` config when resolving the tool list (`agent-CKAVuxKN.js`), so a same-named override in `tools:` is silently shadowed, and disabling it in `workspace/index.ts`'s tools config to work around that also blocks our own wrapper's delegation call (same shared `Workspace` instance). A second `Workspace` instance would dodge that but risks a desynced sandbox-lifecycle cache from the pause-on-turn-end hook in `processors/sandbox.ts`, which only resolves through the main `workspace`. Cheaper fallback: pattern-match common command prefixes (`agent-browser`, `curl`, `git clone`, `npm install`, etc.) directly in `typing-status.ts`'s `execute_command` entry instead, no schema change, no model authorship.
- [ ] `slack` (code mode) typing status is a flat "is working in Slack…" regardless of what the generated code actually does. Its input is `{ code: string }` (arbitrary TypeScript calling `external_*` functions), so there's no single field to show like `call_slack_api`'s `method`. Cheap fix: regex the `code` arg for `external_([a-zA-Z0-9_]+)\(` calls and list the distinct function names in the status, same non-invasive pattern already used for `execute_command`'s `command` and `grep`'s `pattern`.
- [ ] Parallel `upload_file` calls can interleave file and comment ordering across concurrent uploads (the `chat` package uploads then posts text sequentially per call, with no cross-call ordering guarantee).

## Restore from main

- [ ] Per-user custom instructions box. Main read a `<user_instructions>` block per message and let each user's saved tone/persona/style override the default personality; borkification has no implementation of this at all (only referenced in passing in `prompts/guardrails.ts`). Ties into the in-repo App Home wayfinder plan (`.wayfinder/app-home/map.md`) for where the instructions themselves would be entered and stored. Make sure it doesn't mess with cache!
