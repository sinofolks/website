import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { content } from '../src/content.mjs';
import { site } from '../src/site-config.mjs';
import { releases } from '../src/release-manifest.mjs';
import { activeRelease, verifiedCheckout, distributionErrors } from '../src/distribution.mjs';

const configErrors = distributionErrors(site, releases);
if (configErrors.length) throw new Error(configErrors.join('\n'));
const release = activeRelease(site, releases);
const checkoutURL = release ? verifiedCheckout(site) : null;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const siteDist = join(dist, site.basePath.slice(1));
const sitePath = (path='') => `${site.basePath}/${path}`;
const e = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const icons = {
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  pen:'<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14v6Z"/>',
  moon:'<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>',
  reset:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  mac:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5"/>',
  folder:'<path d="M3 6h7l2 3h9v11H3V6Z"/>',
  file:'<path d="M5 3h9l5 5v13H5V3Z"/><path d="M14 3v6h5M8 13h8M8 17h5"/>',
  nodes:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M6 9v9h9"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
const t = (locale,en,zh) => locale === 'zh' ? zh : en;
const href = (locale, page='') => sitePath(`${locale === 'zh' ? 'zh/' : ''}${page ? page+'/' : ''}`);
const paragraphs = values => values.map(p=>`<p>${e(p)}</p>`).join('');
const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.supportEmail);
const policyReady = site.privacyPolicyReady && emailReady && site.operator && site.effectiveDate;

function shell(locale,page,body,title,description) {
  const c=content[locale], path=href(locale,page), other=locale==='en'?'zh':'en';
  const canonical=site.origin+path;
  const heroLink=href(locale)+'#features';
  return `<!doctype html>
<html lang="${locale==='zh'?'zh-CN':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(description)}"><meta name="theme-color" content="#f9f8f4"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${site.origin+href('en',page)}"><link rel="alternate" hreflang="zh-CN" href="${site.origin+href('zh',page)}"><link rel="alternate" hreflang="x-default" href="${site.origin+href('en',page)}"><meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${site.origin}${sitePath('assets/redraw-icon.png')}"><meta name="twitter:card" content="summary"><link rel="icon" href="${sitePath('assets/redraw-icon.png')}" type="image/png"><link rel="preload" href="${sitePath('assets/fonts/Manrope-Variable.ttf')}" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="${sitePath('styles.css')}"><script type="module" src="${sitePath('site.js')}"></script></head>
<body data-locale="${locale}"><a class="skip-link" href="#main">${t(locale,'Skip to content','跳至正文')}</a><header class="site-header"><div class="wrap"><div class="header-inner"><a class="brand" href="${href(locale)}" aria-label="ReDraw ${t(locale,'home','首页')}"><img src="${sitePath('assets/redraw-icon.png')}" width="42" height="42" alt="">ReDraw</a><button class="menu-toggle" data-menu-toggle aria-expanded="false" aria-controls="site-menu" aria-label="${t(locale,'Toggle navigation','切换导航')}">${icon('menu')}</button><nav class="site-nav" id="site-menu" aria-label="${t(locale,'Main navigation','主导航')}"><a href="${heroLink}">${e(c.nav.features)}</a><a href="${href(locale)}#pricing">${e(c.nav.pricing)}</a><a href="${href(locale,'support')}">${e(c.nav.support)}</a><a class="language" lang="${other==='zh'?'zh-CN':'en'}" href="${href(other,page)}" aria-label="${t(locale,'切换为中文','Switch to English')}">${e(c.nav.language)}</a></nav></div></div></header>
<main id="main">${body}</main><footer class="site-footer"><div class="wrap"><div class="footer-inner"><div class="footer-brand">ReDraw <small>${t(locale,'A little space for your next idea.','给下一个想法留一点空间。')}</small></div><nav class="footer-links" aria-label="${t(locale,'Footer navigation','页脚导航')}"><a href="${href(locale,'support')}">${e(c.nav.support)}</a><a href="${href(locale,'privacy')}">${e(c.nav.privacy)}</a><a href="${href(other,page)}" lang="${other==='zh'?'zh-CN':'en'}">${e(c.nav.language)}</a><a href="${sitePath('assets/fonts/Manrope-OFL.txt')}">${t(locale,'Font licenses','字体许可')}</a></nav></div></div></footer></body></html>`;
}

function faq(items) {
  return items.map(i=>`<details><summary>${e(i.question)}</summary><p>${e(i.answer)}</p></details>`).join('');
}

function demo(locale) {
  const nodes=[['idea',15,50,t(locale,'A small idea','一个小想法')],['shape',40,30,t(locale,'Give it shape','画出轮廓')],['decision',62,62,t(locale,'Connect the dots','连起思路')],['result',84,37,t(locale,'Now it clicks.','这下清楚了')]];
  return `<div class="demo-board" data-theme="light" id="try"><div class="demo-toolbar"><div class="demo-title">${icon('pen')}${t(locale,'A little room to think','留一点空间思考')}</div><div class="demo-controls"><button data-demo-reset aria-label="${t(locale,'Reset diagram','重置示例')}">${icon('reset')}<span>${t(locale,'Reset','重置')}</span></button><button data-demo-theme aria-pressed="false" aria-label="${t(locale,'Dark canvas','深色画布')}">${icon('moon')}<span data-demo-theme-label>${t(locale,'Light','浅色')}</span></button></div></div><div class="demo-stage" aria-label="${t(locale,'Interactive example diagram','可交互示例图')}"><svg class="demo-connections" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10 3 5Z"/></marker></defs><path data-edge="idea:shape" d="M220 215C260 215 275 140 300 140"/><path data-edge="shape:decision" d="M470 140C490 140 500 270 540 270"/><path data-edge="decision:result" d="M690 270C740 270 720 160 760 160"/></svg>${nodes.map(([id,x,y,label])=>`<button class="demo-node" data-node="${id}" data-x="${x}" data-y="${y}" aria-label="${e(label)} — ${t(locale,'drag or use arrow keys to move','拖动或用方向键移动')}">${e(label)}</button>`).join('')}<span class="canvas-note">${t(locale,'Nothing has to be perfect yet.','想法刚开始，不必画得完美。')}</span></div><div class="demo-footer"><p>${t(locale,'Move a shape. The connections follow. Use arrow keys when a shape is focused.','拖动图形，连线会跟随；选中图形后也可以用方向键移动。')}</p><span class="demo-label">${t(locale,'Website demo','网页交互示例')}</span></div><p class="sr-only" data-demo-status role="status" aria-live="polite"></p></div>`;
}

function film(locale) {
  const video = sitePath('assets/redraw-library-mcp-v3.mp4');
  return `<section class="demo-film" id="watch" aria-labelledby="film-title"><div class="film-intro"><div><h2 id="film-title">${t(locale,'Start with Library.<br>Build with MCP.','从 Library 开始。<br>用 MCP 继续构建。')}</h2></div><p id="film-description">${t(locale,'Take a system architecture template, turn it into a checkout flow with MCP, then adjust the connected shapes and export a dark canvas.','选用系统架构模板，通过 MCP 扩展成结账流程，再调整连线图形，导出深色画布。')}</p></div><figure><video controls playsinline preload="none" width="1920" height="1080" poster="${sitePath('assets/redraw-library-mcp-v3.jpg')}" aria-labelledby="film-title" aria-describedby="film-description film-caption"><source src="${video}" type="video/mp4"><a href="${video}">${t(locale,'Watch the MP4 video','打开 MP4 视频')}</a></video><figcaption id="film-caption"><span>${t(locale,'35 seconds · Real ReDraw UI · Music, no narration','35 秒 · ReDraw 实际界面 · 英文视频 · 配乐，无旁白')}</span><a href="${video}">${t(locale,'Open video','打开视频')}${icon('arrow')}</a></figcaption></figure></section>`;
}

function home(locale) {
  const c=structuredClone(content[locale]);
  if (release) {
    c.hero.status=t(locale,`Direct download · ${release.version}`,`官网下载 · ${release.version}`);
    c.footer.release=checkoutURL
      ?t(locale,'Download the free Mac app. Unlock MCP and Library when you need them.','免费下载 Mac 应用，按需解锁 MCP 与 Library。')
      :t(locale,'Download the free Mac app for drawing, saving, and export. Public purchases are not open yet.','免费下载 Mac 应用，开始绘制、保存与导出。公开购买尚未开放。');
    c.faq.items[0].answer=t(locale,'Yes. Download the signed, Apple-notarized DMG below, open it, and drag ReDraw to Applications. The core canvas is free.','可以。下载下方经签名并通过 Apple 公证的 DMG，打开后将 ReDraw 拖入 Applications。基础画板免费。');
    c.pricing.note=checkoutURL
      ?t(locale,'US$9.99, plus applicable taxes. Dodo Payments shows the final total before purchase.','售价 9.99 美元，适用税额另计。Dodo Payments 将在购买前显示最终金额。')
      :t(locale,'The free download is available. Public purchases are not open yet. Planned price: US$9.99, plus applicable taxes.','免费安装包已可下载。尚未开放公开购买；计划售价 9.99 美元，适用税额另计。');
  }
  const f=Object.fromEntries(c.features.items.map(i=>[i.id,i]));
  const headline=t(locale,'<span>Sketch an idea.</span><span class="handwritten">Make it clear.</span>','<span>画下一个想法。</span><span class="handwritten">让思路清楚起来。</span>');
  const html=`<div class="wrap"><section class="hero"><div class="hero-top"><h1>${headline}</h1><div class="hero-description"><p>${e(c.hero.subhead)}</p><div class="hero-actions"><a class="button primary" href="#try">${t(locale,'Try a little diagram','动手连起思路')}${icon('arrow')}</a><a class="text-link" href="#watch">${t(locale,'Watch the 35-second demo','观看 35 秒演示')}</a></div><small class="compatibility">${e(c.hero.compatibility)} · ${t(locale,'Native Mac app','原生 Mac 应用')}</small></div></div>${demo(locale)}<div class="hero-foot"><span>${icon('pen')}${e(c.hero.detail)}</span><span>${icon('folder')}${t(locale,'Your files, on your Mac.','文件保存在你的 Mac。')}</span><span>${icon('mac')}${e(c.hero.status)}</span></div></section>${film(locale)}<section class="feature-lead" id="features"><h2>${e(c.features.title)}</h2><div><p>${e(f.canvas.body)}</p><p>${e(f.canvas.detail)}</p></div></section><section class="feature-layout" aria-labelledby="library-title"><figure class="library-visual"><img src="${sitePath('assets/mind-map.png')}" width="512" height="288" loading="lazy" alt="${t(locale,'ReDraw mind map template connecting a main idea to people, possibilities, needs, and next steps','ReDraw 思维导图模板：主想法连接人、可能性、需求与下一步')}"><figcaption>${t(locale,'A template from the ReDraw Library.','来自 ReDraw Library 的模板。')}</figcaption></figure><div class="feature-copy"><h2 id="library-title">${e(f.library.title)}</h2><p>${e(f.library.body)}</p><p class="purchase-note">${e(f.library.detail)}</p><a class="text-link" href="#pricing">${t(locale,'Explore the lifetime license','了解买断许可证')}${icon('arrow')}</a></div></section></div><section class="mcp-section"><div class="wrap mcp-layout"><div><h2>${e(f.mcp.title)}</h2><p>${e(f.mcp.body)}</p><p>${e(f.mcp.detail)}</p></div><figure class="mcp-visual" aria-label="${t(locale,'How your AI client connects to ReDraw','AI 客户端与 ReDraw 的连接方式')}"><div class="connection-row"><span>${t(locale,'You bring the idea','你提出想法')}</span>${icon('arrow')}</div><div class="connection-row"><span>${t(locale,'Your AI client','你选择的 AI 客户端')}<br><small>${t(locale,'A compatible client you choose','自行选择的兼容客户端')}</small></span>${icon('nodes')}</div><div class="connection-row highlight"><span>${t(locale,'An editable ReDraw canvas','可继续编辑的 ReDraw 画布')}</span>${icon('pen')}</div><figcaption class="mcp-caption">MCP + Library · ${t(locale,'One lifetime license','一次购买解锁')}</figcaption></figure></div></section><div class="wrap"><section class="files-section"><div><h2>${e(f.files.title)}</h2><p>${e(f.files.body)}</p><p>${e(f.files.detail)}</p></div><div class="formats" aria-label="${t(locale,'Editable RD documents, PNG images and PDF exports','可编辑 RD 文档、PNG 图片和 PDF 导出')}">${[['.rd',t(locale,'Keep editing','继续编辑')],['PNG',t(locale,'Share the picture','分享图片')],['PDF',t(locale,'Take it with you','随处带走')]].map(([name,label])=>`<div class="file-sheet">${icon('file')}<span>${name}</span><small>${label}</small></div>`).join('')}</div></section><section class="pricing" id="pricing"><div class="section-intro"><h2>${e(c.pricing.title)}</h2><p>${e(c.pricing.intro)}</p></div><div class="plans">${c.pricing.plans.map(p=>`<article class="plan"><h3>${e(p.name)}</h3><div class="price">${e(p.price)}</div><p class="price-period">${e(p.period)}</p><p class="plan-description">${e(p.description)}</p><ul>${p.features.map(v=>`<li>${icon('check')}<span>${e(v)}</span></li>`).join('')}</ul>${p.id==='lifetime'&&checkoutURL?`<a class="button primary" href="${e(checkoutURL)}" rel="noopener noreferrer">${t(locale,'Buy lifetime license','购买买断许可证')}${icon('arrow')}</a>`:''}</article>`).join('')}</div><p class="pricing-note">${e(c.pricing.note)}</p><p class="pricing-note">${e(c.pricing.finePrint)}</p></section><section class="faq-section"><h2>${e(c.faq.title)}</h2><div>${faq(c.faq.items)}</div></section><section class="availability" id="availability"><h2>${e(c.footer.line)}</h2><p>${e(c.footer.release)}</p>${release?`<a class="button primary" href="${sitePath('downloads/'+release.filename)}">${t(locale,'Download for Mac','下载 Mac 版')}${icon('arrow')}</a><p class="download-detail">${e(release.version)} · ${(release.size/1024/1024).toFixed(1)} MB · macOS 14+<br><span>SHA-256: ${e(release.sha256)}</span></p>`:`<a class="button primary" href="${href(locale,'support')}">${t(locale,'Get to know ReDraw','了解 ReDraw 的使用方式')}${icon('arrow')}</a>`}</section></div>`;
  return shell(locale,'',html,c.meta.title,c.meta.description);
}

function privacy(locale) {
  const c=content[locale], p=structuredClone(c.privacy);
  if (release) {
    const purchase=p.sections.find(section=>section.id==='purchases');
    purchase.paragraphs[0]=checkoutURL
      ?purchase.paragraphs[0].replace('is being prepared to use','uses').replace('正准备使用','使用')
      :t(locale,'The public Mac app uses Dodo Payments for license management. When public purchases become available, choosing to buy will open Dodo’s hosted checkout in your browser. Dodo processes purchase, billing, and payment information under its own policies. ReDraw does not collect card details in the application.','公开 Mac 版使用 Dodo Payments 管理许可证。公开购买开放后，选择购买将通过浏览器打开 Dodo 托管的结账页面。Dodo 根据自身政策处理购买、账单及付款信息；ReDraw 应用不收集支付卡资料。');
    purchase.paragraphs[2]=t(locale,'The public edition uses Dodo’s production license service. Test license keys cannot activate the public edition.','公开版使用 Dodo 正式许可证服务，测试许可证密钥不能激活公开版。')
      +(checkoutURL?'':t(locale,' Public purchases are not open yet; purchase and license-delivery verification is still pending.','目前尚未开放公开购买，购买及许可证交付流程仍待验证。'));
  }
  const title=policyReady?t(locale,'Privacy policy','隐私政策'):p.title;
  const websiteSection={id:'website',title:t(locale,'This website','本网站'),paragraphs:[t(locale,'This website is served by Cloudflare. When you visit, Cloudflare processes connection information such as IP addresses and request details to deliver and protect the site. This version does not include advertising, third-party analytics scripts, a contact form, or visitor accounts. The interactive diagram runs in your browser and does not send its content to a server.','本网站由 Cloudflare 提供服务。访问时，Cloudflare 会处理 IP 地址和请求详情等连接信息，以交付和保护网站。当前网站没有广告、第三方统计脚本、联系表单或访客账号。交互示例在浏览器中运行，不会将其内容发送给服务器。')]};
  if (release) websiteSection.paragraphs.push(t(locale,'Installer downloads from this website and the app’s updater redirect to GitHub Releases. GitHub handles those download requests under its own privacy policy.','通过本网站或应用更新器获取安装包时，下载请求会跳转至 GitHub Releases，由 GitHub 按其隐私政策处理。'));
  const sections=[...p.sections,websiteSection];
  const overview=t(locale,'This overview describes how the current app and website handle information. It is not a finalized privacy policy.','本概述说明当前应用与网站如何处理信息，尚不是最终版隐私政策。')
    +(site.operator?t(locale,` ReDraw is operated by ${site.operator}.`,` ReDraw 的运营主体为 ${site.operator}。`):'')
    +t(locale,' The public privacy contact is listed below. The effective date and final operating details are still being confirmed.','公开隐私联系方式列在下方。生效日期及最终运营细节仍在确认中。');
  const details=policyReady?`<dl class="facts-list"><dt>${e(p.operatorLabel)}</dt><dd>${e(site.operator)}</dd><dt>${e(p.effectiveDateLabel)}</dt><dd>${e(site.effectiveDate)}</dd><dt>${e(p.contactLabel)}</dt><dd><a href="mailto:${e(site.supportEmail)}">${e(site.supportEmail)}</a></dd></dl>`:`<div class="notice">${e(overview)}</div>`;
  const html=`<div class="wrap"><header class="article-hero"><h1>${e(title)}</h1><p>${e(p.intro)}</p>${details}</header><div class="article-layout"><nav class="article-toc" aria-label="${t(locale,'On this page','本页目录')}"><ul>${sections.map(s=>`<li><a href="#${s.id}">${e(s.title)}</a></li>`).join('')}</ul></nav><div class="prose"><p>${e(p.scope)}</p>${sections.map(s=>`<section id="${s.id}"><h2>${e(s.title)}</h2>${paragraphs(s.paragraphs)}</section>`).join('')}<section><h2>${t(locale,'Related policies','相关政策')}</h2><p><a href="https://www.apple.com/legal/privacy/">${t(locale,'Apple privacy policy','Apple 隐私政策')}</a><br><a href="https://dodopayments.com/legal/privacy-policy">${t(locale,'Dodo Payments privacy policy','Dodo Payments 隐私政策')}</a><br><a href="https://policies.google.com/privacy">${t(locale,'Google privacy policy (support email)','Google 隐私政策（支持邮箱）')}</a><br><a href="https://www.cloudflare.com/privacypolicy/">${t(locale,'Cloudflare privacy policy','Cloudflare 隐私政策')}</a>${release?`<br><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">${t(locale,'GitHub privacy statement (installer downloads)','GitHub 隐私声明（安装包下载）')}</a>`:''}</p></section>${emailReady?`<section><h2>${e(p.contactLabel)}</h2><p><a href="mailto:${e(site.supportEmail)}">${e(site.supportEmail)}</a></p></section>`:''}</div></div></div>`;
  return shell(locale,'privacy',html,`${title} — ReDraw`,p.intro);
}

function support(locale) {
  const c=content[locale], s=structuredClone(c.support);
  if (checkoutURL) s.faq[2].answer=s.faq[2].answer.replace(' Public purchases are not open yet.','').replace('目前尚未开放公开购买。','');
  const contact=emailReady?`<a class="button primary" href="mailto:${e(site.supportEmail)}">${e(s.contactCta)}${icon('arrow')}</a><p class="contact-address"><a href="mailto:${e(site.supportEmail)}">${e(site.supportEmail)}</a></p>`:`<p>${t(locale,'The public support contact will be added before public release. For now, this page covers the app’s current workflows.','公开支持联系方式将在 公开发布前补充。你可以先在本页了解当前应用的使用方法。')}</p>`;
  const html=`<div class="wrap"><header class="article-hero"><h1>${e(s.title)}</h1><p>${e(s.intro)}</p></header><div class="support-layout"><section aria-label="${t(locale,'Frequently asked questions','常见问题')}">${faq(s.faq)}</section><aside class="support-aside"><h2>${e(s.contactTitle)}</h2><p>${e(s.contactDescription)}</p>${contact}<h3>${e(s.reportTitle)}</h3><ul>${s.reportChecklist.map(x=>`<li>${e(x)}</li>`).join('')}</ul><p><small>${e(s.safetyNote)}</small></p>${s.links.map(x=>`<a class="text-link" href="${e(x.href)}">${e(x.label)}</a>`).join('')}</aside></div></div>`;
  return shell(locale,'support',html,`${s.title} — ReDraw`,s.intro);
}

await rm(dist,{recursive:true,force:true});
await mkdir(siteDist,{recursive:true});
await cp(join(root,'public'),siteDist,{recursive:true});
for(const locale of site.locales){
  for(const [page,render] of [['',home],['privacy',privacy],['support',support]]){
    const directory=join(dist,href(locale,page).slice(1));
    await mkdir(directory,{recursive:true});
    await writeFile(join(directory,'index.html'),render(locale));
  }
}
await writeFile(join(dist,'404.html'),shell('en','',`<div class="wrap"><section class="not-found"><h1>A line went astray.</h1><p>That page is not here. Let’s get you back to the canvas.</p><a class="button primary" href="${href('en')}">Back to ReDraw ${icon('arrow')}</a></section></div>`,'Page not found — ReDraw','This page could not be found. Return to the ReDraw website.'));
const paths=site.locales.flatMap(locale=>['','privacy','support'].map(page=>href(locale,page)));
await writeFile(join(siteDist,'robots.txt'),`User-agent: *\nAllow: ${href('en')}\nSitemap: ${site.origin}${sitePath('sitemap.xml')}\n`);
await writeFile(join(siteDist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<url><loc>${site.origin+path}</loc></url>`).join('')}</urlset>\n`);
await writeFile(join(dist,'_headers'),`${site.basePath}/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`);
console.log(`Built ${paths.length} localized pages + 404 for ${site.origin}${site.basePath}. Privacy policy ready: ${Boolean(policyReady)}.`);
