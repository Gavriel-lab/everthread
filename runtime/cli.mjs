#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { captureEvent } from './capture/gateway.mjs';
import { readJson } from './core/io.mjs';
import { ensureRuntimeWorkspace } from './core/workspace.mjs';
import { runtimePaths } from './core/workspace.mjs';
import { runOnce } from './loop/run-once.mjs';


function requireArgument(value, label) {
  if (!value) throw new Error(`missing ${label}`);
  return value;
}


export async function main(argv = process.argv.slice(2)) {
  const [command, workspaceArg, inputArg] = argv;
  const workspace = path.resolve(requireArgument(workspaceArg, 'workspace'));
  let result;
  if (command === 'init') {
    await ensureRuntimeWorkspace(workspace);
    result = { command: 'init', workspace, version: '0.3.0' };
  } else if (command === 'capture') {
    const input = path.resolve(requireArgument(inputArg, 'event file'));
    result = await captureEvent(workspace, JSON.parse(await readFile(input, 'utf8')));
  } else if (command === 'run') {
    result = await runOnce(workspace);
  } else if (command === 'status') {
    await ensureRuntimeWorkspace(workspace);
    result = await readJson(runtimePaths(workspace).loopState, {
      version: '0.3.0',
      success: null,
      state: 'not_run'
    });
  } else {
    throw new Error(`unknown command: ${command ?? '(none)'}`);
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write(`everthread: ${error.message}\n`);
    process.exitCode = 1;
  });
}
