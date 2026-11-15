import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/site.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicExtensions = new Set(['.html','.css','.png','.svg','.txt','.xml']);
const patterns = [
  ['local-path', /\/(?:Users|private|opt)\//],
  ['cloud-instance', /\bi-[0-9a-f]{17}\b/],
  ['ipv4', /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['credential-token', /(?:ncp_iam_[A-Za-z0-9]+|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,})/],
  ['handover-account', /admin@modaktour\.test|modaksystem@gmail\.com/],
  ['sensitive-artifact', /api\.env|s3:\/\/|SSM 실행 ID|<code>|SECRET_KEY|PAYPAL_CLIENT_SECRET/],
];

export async function checkPublication(directory = resolve(root,'dist'), { source = false } = {}) {
  const issues = [];
  let files = 0;
  async function walk(base) {
    for (const entry of await readdir(base, {withFileTypes:true})) {
      const path = resolve(base,entry.name);
      const relative = path.slice(directory.length + 1);
      if ((await lstat(path)).isSymbolicLink()) { issues.push(`${relative}: symbolic-link`);continue; }
      if (entry.isDirectory()) { await walk(path);continue; }
      files++;
      const ext = extname(entry.name);
      if (!source && !publicExtensions.has(ext) && entry.name !== '.nojekyll') issues.push(`${relative}: unexpected-file-type`);
      if (!['.html','.css','.svg','.txt','.xml','.mjs'].includes(ext)) continue;
      const text = await readFile(path,'utf8');
      for (const [name, pattern] of patterns) if (pattern.test(text)) issues.push(`${relative}: ${name}`);
      if (ext === '.html') {
        if (/<script[^>]+src="https?:/i.test(text)) issues.push(`${relative}: external-script`);
        if (/href="(?:file:|javascript:)/i.test(text)) issues.push(`${relative}: unsafe-link`);
        if (!source && /data-story=|<dialog|\b(?:undefined|NaN)\b/.test(text)) issues.push(`${relative}: uncompiled-content`);
      }
    }
  }
  await walk(directory);
  if (issues.length) throw new Error(`Publication check failed:\n${issues.join('\n')}`);
  return {files, issues:0};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkPublication();
  const home = await readFile(resolve(root,'dist/index.html'),'utf8');
  if (!home.includes('content="index,follow,max-image-preview:large"')) throw new Error('Expected production build');
  if (!home.includes(`<link rel="canonical" href="${site.productionUrl}">`)) throw new Error('Unexpected production canonical');
  if (!home.includes('social-card.png')) throw new Error('Missing social image');
  console.log({publication:result, source:await checkPublication(resolve(root,'src'),{source:true})});
}
