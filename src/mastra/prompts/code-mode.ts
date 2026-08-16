import { sandbox } from '../config';

export function codeModePrompt(instructions: string): string {
  return `Slack code mode is for several Slack reads, exhaustive pagination, filtering, joining, deduplication, sorting, counting, aggregation, and MCP tool calls that benefit from code-side orchestration. Use direct tools for single lookups. Only the external_* functions declared below can reach your tools. Return final results, not intermediate pages.\n\n${instructions.replaceAll('execute_typescript', 'slack')}`;
}

export const codeModeFilesPrompt = `<code-mode-files>
Ignore the rule above about having no filesystem access. Your program runs as Node inside this thread's E2B sandbox, the same one the direct file tools and execute_command act on, and external_read_file, external_write_file, external_edit_file, external_list_files, external_file_stat, external_delete_file, external_grep, and external_execute_command take the same arguments there as their direct counterparts.

Write results to a file whenever the data is large, needs later processing, or will be reused: full channel or thread exports, every page of a paginated read, per-message records behind a count, raw call_slack_api responses. Return the path with a count and a small sample instead of the data itself. Never return a large dump inline.

const rows = pages.flatMap((page) => page.messages);
await external_write_file({ path: '${sandbox.workdir}/thread-export.json', content: JSON.stringify(rows, null, 2) });
return { path: '${sandbox.workdir}/thread-export.json', count: rows.length, sample: rows.slice(0, 3) };

Overwriting a file that already exists requires reading it earlier in the same program; a new path needs no read. Node built-ins also work, but the program body is a function body, so load them with dynamic import (const { writeFile } = await import('node:fs/promises')) instead of a top-level import.

Paths must stay under ${sandbox.workdir}. Files persist for the whole thread, so a later turn can read_file, grep, or execute_command over them, or upload_file the result to Slack.
</code-mode-files>`;
