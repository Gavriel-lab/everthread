#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ensureRuntimeWorkspace } from './core/workspace.mjs';


function requireArgument(value, label) {
  if (!value) throw new Error(`missing ${label}`);
  return value;
}


export async function main(argv = process.argv.slice(2)) {
  const [command, workspaceArg] = argv;
  if (command !== 'init') throw new Error(`unknown command: ${command ?? '(none)'}`);
  const workspace = path.resolve(requireArgument(workspaceArg, 'workspace'));
  await ensureRuntimeWorkspace(workspace);
  const result = { command: 'init', workspace, version: '0.3.0' };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write(`everthread: ${error.message}\n`);
    process.exitCode = 1;
  });
}
