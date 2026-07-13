import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');


async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(target));
    else files.push(target);
  }
  return files;
}


async function publicRuntimeFiles() {
  const files = [];
  for (const directory of ['runtime', 'schemas', path.join('examples', 'runtime')]) {
    files.push(...await filesUnder(path.join(ROOT, directory)));
  }
  files.push(
    path.join(ROOT, 'README.md'),
    path.join(ROOT, 'README.zh-CN.md'),
    path.join(ROOT, 'README.en.md'),
    path.join(ROOT, 'docs', 'brain-runtime-v0.3.zh-CN.md'),
    path.join(ROOT, 'docs', 'brain-runtime-v0.3.en.md'),
    path.join(ROOT, 'docs', 'runtime-storage-flow.zh-CN.md')
  );
  return files;
}


test('release includes the complete v0.3 documentation set', async () => {
  const files = await publicRuntimeFiles();
  const contents = await Promise.all(files.map(file => readFile(file, 'utf8')));
  assert.ok(contents.every(text => text.length > 0));
});


test('public runtime files contain no private deployment markers', async () => {
  const files = await publicRuntimeFiles();
  const joined = (await Promise.all(files.map(file => readFile(file, 'utf8')))).join('\n');
  const forbidden = [
    ['/', 'home', '/', 'ubuntu', '/'].join(''),
    ['C:', '\\', 'Users', '\\'].join(''),
    ['BEGIN', ' PRIVATE', ' KEY'].join(''),
    ['api', '_key', '='].join(''),
    ['Studio', '/'].join('')
  ];
  for (const marker of forbidden) {
    assert.equal(joined.includes(marker), false, `forbidden marker: ${marker}`);
  }
});
