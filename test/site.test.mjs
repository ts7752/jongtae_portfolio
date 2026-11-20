import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { build, root, content, deploymentUrl } from '../scripts/build.mjs';
import { checkPublication } from '../scripts/check-publication.mjs';
import { site } from '../src/site.mjs';
import { notionUrl } from '../src/notion.mjs';

const out = resolve(root, 'dist');
let pages;
before(async () => {
  await build();
  pages = ['index.html', ...(await readdir(resolve(out, 'cases'))).filter(n => n.endsWith('.html')).map(n => 'cases/' + n)];
});

test('Every case has an independently addressable HTML page', async () => {
  assert.equal(pages.length, Object.keys(content).length + 1);
  for (const key of Object.keys(content)) await access(resolve(out, `cases/${key}.html`));
});
test('Every local link and stylesheet resolves within the public build', async () => {
  for (const page of pages) {
    const html = await readFile(resolve(out, page), 'utf8');
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const file = resolve(dirname(resolve(out, page)), href.split('#')[0]);
      assert.ok(file.startsWith(out + '/'));
      await access(file);
    }
  }
});
test('Every home fragment exists and there are no duplicate IDs', async () => {
  const html = await readFile(resolve(out, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
test('Pages have one main heading, language, description, and local-only noindex', async () => {
  for (const page of pages) {
    const html = await readFile(resolve(out, page), 'utf8');
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, page);
    assert.match(html, /lang="ko"/);
    assert.match(html, /name="description"/);
    assert.match(html, /name="robots" content="noindex,nofollow"/);
    assert.match(html, /class="skip" href="#main"/);
  }
});
test('Home uses four real case links and replaces the UX hero case with memory', async () => {
  const html = await readFile(resolve(out, 'index.html'), 'utf8');
  assert.equal((html.match(/class="decision-card"/g) ?? []).length, 4);
  assert.match(html, /class="decision-card" href="cases\/memory.html"/);
  assert.doesNotMatch(html, /<dialog|data-story=|app\.js/);
  assert.match(html, /href="mailto:ts7752@naver.com"/);
});
test('Private handover, network endpoints, credentials and raw logs are not build inputs', async () => {
  const forbidden = [/\/Users\//, /\/opt\//, /\/private\//, /i-[0-9a-f]{17}/, /\b(?:\d{1,3}\.){3}\d{1,3}\b/, /ncp_iam_/, /<code>/, /SSM 실행 ID/, /admin@modaktour\.test/, /PAYPAL_CLIENT_SECRET/, /SECRET_KEY/, /api\.env/, /인수인계서\.pdf/];
  for (const page of pages) {
    const html = await readFile(resolve(out, page), 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(html, pattern, page);
  }
});
test('Related case IDs and meaningful results are complete', () => {
  for (const [key, item] of Object.entries(content)) {
    assert.ok(item.sections.some(s => s[2] === 'scope'), `${key}: scope`);
    for (const id of item.related ?? []) assert.ok(content[id], id);
  }
  for (const key of ['memory','delivery','alerts','reboot']) {
    assert.ok(content[key].sections.some(s => s[2] === 'result'));
  }
});
test('Recovery time and delivery claims retain their verification boundaries', () => {
  assert.match(JSON.stringify(content.reboot), /24分|24분/);
  assert.match(JSON.stringify(content.reboot), /평균 복구 시간이 아닙니다/);
  assert.match(JSON.stringify(content.delivery), /접수는 고객의 수신이나 열람을 뜻하지 않습니다/);
  assert.match(JSON.stringify(content.memory), /누수 해결/);
});
test('Preview artifacts contain only public files and crawler exclusion', async () => {
  assert.deepEqual((await readdir(out)).sort(), ['.nojekyll','404.html','assets','cases','editorial.css','index.html','refinement.css','robots.txt','site.css','sitemap.xml','style.css'].sort());
  assert.match(await readFile(resolve(out, 'robots.txt'), 'utf8'), /Disallow: \//);
});

test('Each project detail can be reached without a Notion account', async () => {
  const home = await readFile(resolve(out,'index.html'),'utf8');
  for (const key of ['market','energy','company']) assert.ok(home.includes(`cases/${key}.html`), key);
  assert.ok(home.includes(`href="${site.notionUrl}"`));
  assert.doesNotMatch(home, /\{\{NOTION:/);
  for (const key of Object.keys(content)) {
    const html = await readFile(resolve(out, `cases/${key}.html`), 'utf8');
    const url = notionUrl(key);
    assert.equal(new URL(url).origin, new URL(site.notionUrl).origin);
    assert.match(new URL(url).pathname, /^\/[0-9a-f]{32}$/);
    assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`), key);
    assert.match(html, /class="case-copy"/);
  }
});

test('Every page ID is unique and links resolve to real fragment targets', async () => {
  for (const page of pages) {
    const html = await readFile(resolve(out,page),'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
    assert.equal(ids.length,new Set(ids).size,page);
    for (const [,href] of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
      if (/^https?:/.test(href)) continue;
      const [file,fragment] = href.split('#');
      const target = await readFile(file ? resolve(dirname(resolve(out,page)),file) : resolve(out,page),'utf8');
      assert.ok(target.includes(`id="${fragment}"`), `${page}: ${href}`);
    }
  }
});

test('Production metadata, sitemap and robots use the project subpath', async t => {
  const folder = await mkdtemp(resolve(tmpdir(),'jongtae-prod-test-'));
  t.after(()=>rm(folder,{recursive:true,force:true}));
  const result = await build({production:true,outDir:folder});
  assert.equal(result.pages,Object.keys(content).length+1);
  const map = await readFile(resolve(folder,'sitemap.xml'),'utf8');
  assert.equal([...map.matchAll(/<loc>/g)].length,result.pages);
  assert.ok(map.includes(`<loc>${site.productionUrl}</loc>`));
  assert.doesNotMatch(map,/404\.html|localhost|127\.0\.0\.1/);
  for (const page of pages) {
    const html = await readFile(resolve(folder,page),'utf8');
    const canonical = new URL(page==='index.html'?'':page,site.productionUrl).href;
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`),page);
    assert.match(html,/content="index,follow,max-image-preview:large"/);
    assert.match(html,/og:image.*social-card\.png/);
    assert.match(html,/name="twitter:card" content="summary_large_image"/);
    const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1];
    assert.equal(JSON.parse(ld)['@type'],'Person');
    assert.equal(JSON.parse(ld).name,'이종태');
  }
  assert.match(await readFile(resolve(folder,'404.html'),'utf8'),/content="noindex,nofollow"/);
  assert.match(await readFile(resolve(folder,'robots.txt'),'utf8'),/Sitemap: https:\/\/ts7752.github.io\/jongtae_portfolio\/sitemap.xml/);
  await checkPublication(folder);
});

test('Production URL rejects credentials, query, fragment and insecure schemes', () => {
  for (const url of ['http://example.com/','https://user:pass@example.com/','https://example.com/?x=1','https://example.com/#x','file:///tmp/site']) {
    assert.throws(()=>deploymentUrl(url));
  }
  assert.equal(deploymentUrl('https://example.com/portfolio'),'https://example.com/portfolio/');
});

test('Build is deterministic and does not accumulate follow-up sections', async () => {
  const beforeHash = createHash('sha256').update(await readFile(resolve(out,'cases/payment.html'))).digest('hex');
  await build();
  const afterHash = createHash('sha256').update(await readFile(resolve(out,'cases/payment.html'))).digest('hex');
  assert.equal(beforeHash,afterHash);
  assert.equal(content.payment.sections.filter(s=>s[0] === '추가 보완한 결제 처리').length,1);
});

test('Social image is PNG at 1200 by 630 pixels', async () => {
  const png = await readFile(resolve(out,'assets/social-card.png'));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),1200);
  assert.equal(png.readUInt32BE(20),630);
});

test('Publication scanner rejects private artifacts without echoing their contents', async t => {
  const folder = await mkdtemp(resolve(tmpdir(),'jongtae-scanner-test-'));
  t.after(()=>rm(folder,{recursive:true,force:true}));
  await writeFile(resolve(folder,'bad.html'),'<p>/opt/private/example</p>');
  await assert.rejects(checkPublication(folder),/bad.html: local-path/);
});

test('Source and preview pass publication boundary checks', async () => {
  await checkPublication(out);
  await checkPublication(resolve(root,'src'),{source:true});
});

test('Portfolio has planning, explicit serverless skills and grounded AI verification', async () => {
  const html = await readFile(resolve(out,'index.html'),'utf8');
  for (const text of ['기획부터 개발과 운영까지','id="skills"','Lambda','DynamoDB','요구사항과 설계 초안은 직접 정리합니다','AI를 활용하고','Codex · Claude','동시 요청','384MiB']) assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/Figma|피그마|Figma Make|숙련도\s*\d+%/i);
  assert.match(html,/content="noindex,nofollow"/);
  assert.doesNotMatch(html,/02 \/ CORE|백엔드와 DB가 중심|데이터베이스를 중심으로/);
  assert.match(html,/02 \/ DATA/);
  assert.doesNotMatch(html,/사진 요청|숙련도 숫자 대신|모든 기술을 같은 깊이/);
  assert.match(await readFile(resolve(out,'cases/memory.html'),'utf8'),/Java heap space/);
});
