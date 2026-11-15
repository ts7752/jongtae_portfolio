import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { stories } from '../src/stories.mjs';
import { additions } from '../src/additions.mjs';
import { projects } from '../src/projects.mjs';
import { site } from '../src/site.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const content = structuredClone({ ...stories, ...additions, ...projects });
export const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const casePath = key => `cases/${key}.html`;
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

content.payment.sections.splice(2, 0, ['후속 보완 — 승인·만료·기록의 경계', '미승인 결제창이 만료를 무기한 막지 않도록 승인 유예를 통일했습니다. 토큰을 실을 수 없는 결제창 이동에는 회원·분담·시도에 귀속된 단기 1회 사용 표를 적용했습니다. 승인 확정과 감사 이력을 함께 처리하고 저장 실패 시 UNKNOWN 보호를 유지했습니다.']);
content.buddy.sections.splice(3, 0, ['후속 보완 — 실제 수집과 예시값을 분리', '날씨·환율의 실제 수집과 같은 테이블에 예시값을 쓰던 스케줄러를 제거했습니다. 프로필별 스케줄러 탐색과 실제 수집 위임 검사를 추가했습니다. 과거 저장값 정리는 별도이며 데이터 정확도 개선률을 주장하지 않습니다.']);
content.payment.related = ['delivery', 'database'];
content.backup.related = ['reboot', 'alerts'];
content.database.related = ['payment', 'permissions'];
content.upload.related = ['memory'];

export function deploymentUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Public SITE_URL must be HTTPS without credentials, query or fragment');
  }
  return url.href.endsWith('/') ? url.href : url.href + '/';
}

function metadata({ title, description, path = '', production, baseUrl, noindex = false }) {
  const robots = production && !noindex ? 'index,follow,max-image-preview:large' : 'noindex,nofollow';
  const imagePath = path.startsWith('cases/') ? '../assets/' : 'assets/';
  const canonical = new URL(path, baseUrl).href;
  const person = { '@context':'https://schema.org', '@type':'Person', name:site.name, alternateName:'Jongtae Lee', jobTitle:'Backend Engineer', url:baseUrl, sameAs:[site.github] };
  return `<meta name="robots" content="${robots}"><meta name="description" content="${escape(description)}"><meta name="author" content="${site.name}"><meta name="theme-color" content="#355d46"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${escape(title)}</title><link rel="icon" href="${imagePath}favicon.svg" type="image/svg+xml">${production ? `<link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="${site.title}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(new URL('assets/social-card.png', baseUrl).href)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="이종태 — 데이터 모델부터 결제와 운영까지"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(new URL('assets/social-card.png', baseUrl).href)}"><script type="application/ld+json">${json(person)}</script>` : ''}`;
}

function renderCase(key, story, options) {
  const related = (story.related ?? []).map(id => {
    if (!content[id]) throw new Error(`Unknown related case: ${id}`);
    return `<a href="${id}.html">${escape(content[id].title)} <span aria-hidden="true">↗</span></a>`;
  }).join('');
  const sections = story.sections.map(([heading, copy, type]) => `<section class="case-section ${type ?? ''}"><h2>${escape(heading)}</h2><p>${escape(copy)}</p></section>`).join('');
  const summary = story.summary ? `<ul class="case-summary">${story.summary.map(t => `<li>${escape(t)}</li>`).join('')}</ul>` : '';
  const flow = story.flow ? `<figure class="case-flow"><figcaption>설계 흐름 · 설명용 개념도</figcaption><ol>${story.flow.map(t => `<li>${escape(t)}</li>`).join('')}</ol></figure>` : '';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${metadata({title:story.title+' — 이종태',description:story.lead,path:casePath(key),...options})}<link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="../site.css"></head><body><a class="skip" href="#main">본문으로 이동</a><header class="header wrap"><a class="brand" href="../index.html">JONGTAE LEE<span>이종태</span></a><nav aria-label="상세 메뉴"><a href="../index.html#work">프로젝트</a><a href="../index.html#decisions">모든 사례</a><a href="../index.html#contact">연락하기 ↗</a></nav></header><main id="main" class="case-page wrap"><a class="case-back" href="../index.html#work">← 포트폴리오로</a><article><header class="case-heading"><p class="eyebrow">${escape(story.category)}</p><h1>${escape(story.title)}</h1><p class="case-lead">${escape(story.lead)}</p>${summary}</header>${flow}<div class="case-copy">${sections}</div></article>${related ? `<aside class="related"><p class="eyebrow">이어 읽기</p>${related}</aside>` : ''}<a class="button dark" href="../index.html#contact">이 경험에 대해 이야기하기 ↗</a></main><footer class="footer wrap"><span>JONGTAE LEE · 이종태</span><p>2026.11 작업 기록 기준</p><a href="../index.html">홈으로 ↑</a></footer></body></html>`;
}

export async function build({ production = false, siteUrl = site.productionUrl, outDir = resolve(root, 'dist') } = {}) {
  const baseUrl = deploymentUrl(siteUrl);
  const out = resolve(outDir);
  const options = { production, baseUrl };
  await mkdir(resolve(out, 'cases'), { recursive: true });
  await mkdir(resolve(out, 'assets'), { recursive: true });
  for (const name of ['style.css','editorial.css','refinement.css','site.css']) await copyFile(resolve(root,'src',name), resolve(out,name));
  for (const name of ['favicon.svg','social-card.png']) await copyFile(resolve(root,'src/assets',name), resolve(out,'assets',name));
  let home = await readFile(resolve(root,'src/index.html'), 'utf8');
  home = home.replaceAll('— 현재', '— 2026.11 기록 기준').replace(/<br>\s*/g, '<br> ');
  home = home.replace(/<button\b([^>]*\bdata-story="([a-z-]+)"[^>]*)>([\s\S]*?)<\/button>/g, (_, attrs, key, label) => {
    if (!content[key]) throw new Error(`Unknown case: ${key}`);
    return `<a${attrs.replace(/\s+type="button"/g,'').replace(/\s+data-story="[^"]+"/g,'')} href="${casePath(key)}">${label}</a>`;
  });
  home = home.replace(/<dialog[\s\S]*?<\/dialog>/,'').replace('<script src="app.js"></script>','');
  home = home.replace(/<meta name="robots"[^>]+>|<meta name="description"[^>]+>|<title>[^<]*<\/title>/g,'');
  home = home.replace('<link rel="stylesheet" href="editorial.css">','');
  home = home.replace('</head>', `${metadata({title:site.title,description:site.description,...options})}<link rel="stylesheet" href="editorial.css"><link rel="stylesheet" href="site.css"></head>`);
  await writeFile(resolve(out,'index.html'), home);
  for (const [key, story] of Object.entries(content)) await writeFile(resolve(out,casePath(key)), renderCase(key,story,options));
  const prefix = new URL(baseUrl).pathname;
  const robots = production ? `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml',baseUrl).href}\n` : 'User-agent: *\nDisallow: /\n';
  await writeFile(resolve(out,'robots.txt'), robots);
  const locations = ['', ...Object.keys(content).map(casePath)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${production ? locations.map(p => `<url><loc>${escape(new URL(p,baseUrl).href)}</loc></url>`).join('') : ''}</urlset>\n`;
  await writeFile(resolve(out,'sitemap.xml'), sitemap);
  const notFound = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${metadata({title:'페이지를 찾을 수 없습니다 — 이종태',description:'요청하신 페이지가 없거나 주소가 변경됐습니다.',path:'404.html',noindex:true,...options})}<link rel="stylesheet" href="${prefix}style.css"><link rel="stylesheet" href="${prefix}site.css"></head><body><main class="case-page wrap" id="main"><p class="eyebrow">404 / NOT FOUND</p><h1>페이지를 찾을 수 없습니다.</h1><p>주소가 변경됐거나 존재하지 않는 페이지입니다.</p><a class="button dark" href="${prefix}">포트폴리오 홈으로 ↗</a></main></body></html>`;
  await writeFile(resolve(out,'404.html'),notFound);
  await writeFile(resolve(out,'.nojekyll'),'');
  const expected = ['.nojekyll','404.html','assets','cases','editorial.css','index.html','refinement.css','robots.txt','site.css','sitemap.xml','style.css'].sort();
  if (JSON.stringify((await readdir(out)).sort()) !== JSON.stringify(expected)) throw new Error('Unexpected artifact in dist: review before publication');
  return { pages:locations.length, production, output:out };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const production = process.argv.includes('--production');
  console.log(await build({production,siteUrl:process.env.SITE_URL ?? site.productionUrl}));
}
