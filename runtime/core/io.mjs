import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';


export async function pathExists(filePath) {
  try {
    await open(filePath, 'r').then(handle => handle.close());
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}


export async function atomicWriteJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    );
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}


export async function readJson(filePath, fallback = undefined) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
}


export async function readJsonl(filePath) {
  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  return text
    .split(/\r?\n/u)
    .filter(line => line.trim() !== '')
    .map(line => JSON.parse(line));
}


export async function appendJsonl(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const handle = await open(filePath, 'a');
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
}


export async function atomicWriteJsonl(filePath, values) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    const text = values.length > 0
      ? `${values.map(value => JSON.stringify(value)).join('\n')}\n`
      : '';
    await import('node:fs/promises').then(({ writeFile }) => writeFile(temporary, text, 'utf8'));
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}


export async function ensureEmptyFile(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const handle = await open(filePath, 'a');
  await handle.close();
}
