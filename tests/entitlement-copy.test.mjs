import test from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../src/content.mjs';
import { homePage } from '../src/home-page.mjs';

const escapeHTML = value => String(value).replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const release = {
  filename: 'ReDraw-0.4.10-12-universal.dmg', version: '0.4.10',
  size: 40_000_000, sha256: 'a'.repeat(64),
};

function renderHome(locale, checkoutURL = null) {
  return homePage({
    locale, content: content[locale], release, checkoutURL,
    sitePath: path => `/redraw/${path}`,
    href: (language, page) => `/redraw/${language === 'zh' ? 'zh/' : ''}${page}/`,
    e: escapeHTML,
    t: (language, english, chinese) => language === 'zh' ? chinese : english,
    faq: items => items.map(item => `<details><summary>${escapeHTML(item.question)}</summary><p>${escapeHTML(item.answer)}</p></details>`).join(''),
  });
}

for (const locale of ['en', 'zh']) {
  test(`${locale}: one existing paid plan includes Animate while static exports remain free`, () => {
    const copy = content[locale];
    assert.deepEqual(copy.pricing.plans.map(plan => plan.id), ['free', 'lifetime']);
    const [free, paid] = copy.pricing.plans;
    assert.equal(paid.price, '$9.99');
    assert.match(paid.name, /MCP \+ Library \+ Animate/);
    assert.match(free.features.join(' '), /PNG/);
    assert.match(free.features.join(' '), /PDF/);
    assert.doesNotMatch(free.features.join(' '), /Animate|MP4|GIF/);
    assert.match(paid.features.join(' '), /MCP/);
    assert.match(paid.features.join(' '), /Animate.*MP4.*GIF/);
    assert.match(paid.features.join(' '), /3.*Mac/);
    assert.match(copy.pricing.finePrint, locale === 'en'
      ? /Existing valid MCP \+ Library keys also unlock Animate at no extra charge/
      : /现有有效 MCP \+ Library 密钥也可解锁 Animate，无需额外付费/);
    const activation = copy.support.faq.find(item => item.question.includes('Animate'));
    assert.ok(activation);
    assert.match(activation.answer, /PNG\/PDF/);
    assert.match(activation.answer, /Animate.*MP4\/GIF/);
    assert.match(activation.answer, locale === 'en' ? /static/ : /静态/);
    assert.match(activation.answer, locale === 'en' ? /Existing valid keys/ : /现有有效密钥/);
    assert.doesNotMatch(JSON.stringify(copy), locale === 'en'
      ? /Drawing, saving, and export (?:stay|remain|do not)|Draw, save, and export for free/
      : /绘制、保存[与和]导出(?:免费|无需许可证|始终免费|仍然免费)/);
  });

  test(`${locale}: rendered homepage preserves the paid/free split and closed checkout`, () => {
    const html = renderHome(locale);
    const plans = [...html.matchAll(/<article class="plan">([\s\S]*?)<\/article>/g)].map(match => match[1]);
    assert.equal(plans.length, 2);
    assert.match(plans[0], /PNG \/ PDF/);
    assert.doesNotMatch(plans[0], /Animate|MP4|GIF/);
    assert.match(plans[1], /MCP \+ Library \+ Animate Lifetime/);
    assert.match(plans[1], /Animate.*MP4 \/ GIF/);
    assert.match(plans[1], /\$9\.99/);
    assert.match(html, locale === 'en' ? /static PNG\/PDF exports/ : /PNG\/PDF 静态导出/);
    assert.match(html, locale === 'en' ? /Existing valid MCP \+ Library keys/ : /现有有效 MCP \+ Library 密钥/);
    assert.match(plans[1], locale === 'en' ? /Public purchases are not open yet/ : /公开购买尚未开放/);
    assert.doesNotMatch(html, /href="https:\/\/(?:test\.)?checkout\.dodopayments\.com/);

    const checkoutURL = 'https://checkout.dodopayments.com/buy/pdt_existing_product';
    const enabledHTML = renderHome(locale, checkoutURL);
    assert.equal(enabledHTML.split(`href="${checkoutURL}"`).length - 1, 1,
      'The existing checkout supplies one shared license, with no Animate checkout added.');
  });
}
