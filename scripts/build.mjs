import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { content } from '../src/content.mjs';
import { homePage } from '../src/home-page.mjs';
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
  const cinema=page==='' && body.includes('cinema-hero');
  const navigation=cinema
    ? `<a href="${heroLink}">${t(locale,'Features','功能')}</a><a href="https://github.com/sinofolks/website/releases">${t(locale,'What’s new','更新日志')}</a><a href="${href(locale,'support')}">${e(c.nav.support)}</a><a class="language" lang="${other==='zh'?'zh-CN':'en'}" href="${href(other,page)}" aria-label="${t(locale,'切换为中文','Switch to English')}">${e(c.nav.language)}</a><a class="button primary nav-download" href="${release?sitePath('downloads/'+release.filename):href(locale,'support')}">${release?t(locale,'Download for Mac','下载 Mac 版'):t(locale,'Explore ReDraw','了解 ReDraw')}</a>`
    : `<a href="${heroLink}">${e(c.nav.features)}</a><a href="${href(locale)}#pricing">${e(c.nav.pricing)}</a><a href="${href(locale,'support')}">${e(c.nav.support)}</a><a class="language" lang="${other==='zh'?'zh-CN':'en'}" href="${href(other,page)}" aria-label="${t(locale,'切换为中文','Switch to English')}">${e(c.nav.language)}</a>`;
  return `<!doctype html>
<html lang="${locale==='zh'?'zh-CN':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(description)}"><meta name="theme-color" content="${cinema?'#101112':'#f9f8f4'}"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${site.origin+href('en',page)}"><link rel="alternate" hreflang="zh-CN" href="${site.origin+href('zh',page)}"><link rel="alternate" hreflang="x-default" href="${site.origin+href('en',page)}"><meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${site.origin}${sitePath('assets/redraw-icon.png')}"><meta name="twitter:card" content="summary"><link rel="icon" href="${sitePath('assets/redraw-icon.png')}" type="image/png"><link rel="preload" href="${sitePath('assets/fonts/Manrope-Variable.ttf')}" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="${sitePath('styles.css')}">${cinema?`<link rel="stylesheet" href="${sitePath('cinema.css')}">`:""}<script type="module" src="${sitePath('site.js')}"></script></head>
<body data-locale="${locale}" data-page="${cinema?'home':page||'other'}"><a class="skip-link" href="#main">${t(locale,'Skip to content','跳至正文')}</a><header class="site-header"><div class="wrap"><div class="header-inner"><a class="brand" href="${href(locale)}" aria-label="ReDraw ${t(locale,'home','首页')}"><img src="${sitePath('assets/redraw-icon.png')}" width="42" height="42" alt="">ReDraw</a><button class="menu-toggle" data-menu-toggle aria-expanded="false" aria-controls="site-menu" aria-label="${t(locale,'Toggle navigation','切换导航')}">${icon('menu')}</button><nav class="site-nav" id="site-menu" aria-label="${t(locale,'Main navigation','主导航')}">${navigation}</nav></div></div></header>
<main id="main">${body}</main><footer class="site-footer"><div class="wrap"><div class="footer-inner"><div class="footer-brand">ReDraw <small>${t(locale,'A little space for your next idea.','给下一个想法留一点空间。')}</small></div><nav class="footer-links" aria-label="${t(locale,'Footer navigation','页脚导航')}"><a href="${href(locale,'support')}">${e(c.nav.support)}</a><a href="${href(locale,'privacy')}">${e(c.nav.privacy)}</a><a href="${href(other,page)}" lang="${other==='zh'?'zh-CN':'en'}">${e(c.nav.language)}</a><a href="${sitePath('assets/fonts/Manrope-OFL.txt')}">${t(locale,'Font licenses','字体许可')}</a></nav></div></div></footer></body></html>`;
}

function faq(items) {
  return items.map(i=>`<details><summary>${e(i.question)}</summary><p>${e(i.answer)}</p></details>`).join('');
}

function home(locale) {
  const body=homePage({ locale, content:content[locale], release, checkoutURL, sitePath, href, e, t, faq });
  return shell(locale,'',body,content[locale].meta.title,content[locale].meta.description);
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
  const websiteSection={id:'website',title:t(locale,'This website','本网站'),paragraphs:[t(locale,'This website is served by Cloudflare. When you visit, Cloudflare processes connection information such as IP addresses and request details to deliver and protect the site. This version does not include advertising, third-party analytics scripts, a contact form, or visitor accounts.','本网站由 Cloudflare 提供服务。访问时，Cloudflare 会处理 IP 地址和请求详情等连接信息，以交付和保护网站。当前网站没有广告、第三方统计脚本、联系表单或访客账号。')]};
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
