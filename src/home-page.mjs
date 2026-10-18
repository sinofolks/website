// The approved Amber Cinema homepage. Shared release gates are supplied by the build.
export function homePage({ locale, content, release, checkoutURL, sitePath, href, e, t, faq }) {
  const c = structuredClone(content);
  const say = (en, zh) => t(locale, en, zh);
  const asset = name => sitePath(`assets/${name}`);
  const icon = name => `<img class="cinema-icon" src="${asset(`icons/${name}.svg`)}" width="24" height="24" alt="">`;
  const downloadURL = release ? sitePath(`downloads/${release.filename}`) : href(locale, 'support');
  const download = () => `<a class="button primary" href="${downloadURL}">${icon(release ? 'download-simple' : 'arrow-right')}${release ? say('Download for Mac', '下载 Mac 版') : say('Explore ReDraw', '了解 ReDraw')}</a>`;
  const video = asset('redraw-library-mcp-v3.mp4');
  const watch = label => `<a class="watch-link" data-watch-demo href="${video}">${icon('play-circle')}<span>${label}</span></a>`;
  if (release) c.faq.items[0].answer = say(
    'Yes. Download the signed, Apple-notarized DMG, open it, and drag ReDraw to Applications. The core canvas is free.',
    '可以。下载经签名并通过 Apple 公证的 DMG，打开后将 ReDraw 拖入 Applications。基础画板免费。');
  c.faq.items[1].answer = say(
    'Draw, edit, save, and export PNG or PDF. LaTeX, Mermaid, and your personal My Library are included. Browsing the bundled Library is free; inserting its content and enabling MCP require the optional license.',
    '绘制、编辑、保存，以及 PNG/PDF 导出免费，LaTeX、Mermaid 和个人 My Library 也包含在内。浏览内置 Library 免费；插入内置素材与开启 MCP 需要可选许可证。');
  c.pricing.plans[0].features = [
    say('Shapes, freehand drawing, text, and images', '图形、自由绘制、文字与图片'),
    say('LaTeX formulas and Mermaid diagrams', 'LaTeX 公式与 Mermaid 图表'),
    say('Autosave, local history, and My Library', '自动保存、本机历史与个人素材库'),
    say('Editable documents and PNG / PDF export', '可编辑文档与 PNG / PDF 导出'),
  ];

  return `<section class="cinema-hero" aria-labelledby="hero-title">
    <div class="wrap">
      <div class="cinema-intro">
        <p class="eyebrow">${say('The native Mac canvas', '为 Mac 打造的原生画板')}</p>
        <h1 id="hero-title">${say('Clear diagrams.<br>Made on your Mac.', '把思路画清楚。<br>在你的 Mac 上。')}</h1>
        <p class="hero-subhead">${say('Sketch freely. Add formulas and flowcharts. Keep every idea editable.', '自由绘制，加入公式与流程图。每一个想法，都可以继续修改。')}</p>
        <div class="cinema-actions">${download()}${watch(say('Watch the demo', '观看演示'))}</div>
        <p class="cinema-compatibility">${say('Free drawing', '基础绘图免费')} <span>·</span> macOS 14+ <span>·</span> Apple Silicon &amp; Intel</p>
      </div>
      <figure class="hero-capture">
        <img src="${asset('redraw-canvas.webp')}" width="2880" height="1800" fetchpriority="high" alt="${say('Real ReDraw Mac window showing an editable checkout architecture with connected services.', 'ReDraw 真实 Mac 界面：由可编辑节点和连线组成的结账系统架构图。')}">
        <figcaption>${watch(say('Watch the full demo', '观看完整演示'))}</figcaption>
      </figure>
    </div>
  </section>

  <div class="wrap cinema-content">
    <section class="technical-section" id="features" aria-labelledby="technical-title">
      <div class="technical-intro">
        <p class="eyebrow">${say('More than a sketch', '不止于草图')}</p>
        <h2 id="technical-title">${say('Technical ideas,<br>made visible.', '让技术想法，<br>清晰可见。')}</h2>
        <p>${say('Turn notes into clear diagrams with LaTeX and Mermaid. Refine the source, then keep building on your canvas.', '用 LaTeX 和 Mermaid，把笔记变成清晰的图。修改源代码，再回到画布继续完善。')}</p>
      </div>
      <figure class="feature-capture mermaid-capture">
        <img src="${asset('redraw-mermaid.webp')}" width="2560" height="1640" loading="lazy" alt="${say('ReDraw Mermaid editor with a flowchart preview and its source code.', 'ReDraw Mermaid 编辑器，展示流程图预览及源代码。')}">
        <figcaption><strong>Mermaid</strong><span>${say('Basic flowcharts become editable shapes. Other diagrams render as images.', '基础流程图可转换为可编辑图形，其他图表以图片形式插入。')}</span></figcaption>
      </figure>
      <div class="formula-section">
        <div class="formula-copy"><p class="eyebrow">LaTeX</p><h3>${say('A place for<br>your equations.', '公式，也有<br>表达的空间。')}</h3><p>${say('Render a formula, place it beside your diagram, and return to its source when the idea changes.', '把公式渲染后放到图旁。思路变化时，回到源代码继续编辑。')}</p></div>
        <figure class="feature-capture"><img src="${asset('redraw-latex.webp')}" width="2560" height="1640" loading="lazy" alt="${say('A rendered Gaussian integral alongside the LaTeX source editor in ReDraw.', 'ReDraw 中渲染的高斯积分及 LaTeX 源代码编辑器。')}"></figure>
      </div>
    </section>

    <section class="workflow-section" aria-labelledby="workflow-title">
      <div><p class="eyebrow">${say('Keep your flow', '让思路继续')}</p><h2 id="workflow-title">${say('Pick up where<br>you left off.', '下次打开，<br>接着往下画。')}</h2></div>
      <div class="workflow-list">
        <article><span class="feature-number">01</span><div><h3>${say('Saved as you go.', '边画，边保存。')}</h3><p>${say('Autosave keeps your work moving. Use File History to revisit saved versions on this Mac.', '自动保存，让你专注于绘制。通过 File History，回看这台 Mac 上保存的历史版本。')}</p></div></article>
        <article><span class="feature-number">02</span><div><h3>${say('Your files. Your location.', '文件位置，由你选择。')}</h3><p>${say('Keep editable .rd documents on your Mac or in an iCloud Drive folder. iCloud sync is handled by Apple; version history stays on this Mac.', '可编辑的 .rd 文档保存在本机或 iCloud Drive 文件夹。iCloud 同步由 Apple 处理，版本历史保留在本机。')}</p></div></article>
        <article><span class="feature-number">03</span><div><h3>${say('Make it once. Use it again.', '画过一次，随时复用。')}</h3><p>${say('Save your own reusable elements in My Library, included for free. Export a canvas or selection as PNG or PDF when it is ready to share.', '把自己画好的元素存入免费个人素材库 My Library。需要分享时，将画布或选中内容导出为 PNG 或 PDF。')}</p></div></article>
      </div>
    </section>

    <section class="extension-section" aria-labelledby="extension-title">
      <div class="extension-copy"><p class="eyebrow">${say('Go a little further', '再往前一步')}</p><h2 id="extension-title">${say('A head start.<br>A new connection.', '从模板开始，<br>用连接拓展。')}</h2><p>${say('Start from the bundled Library, or connect a compatible AI client to your canvas through the local MCP server.', '从内置 Library 选一个起点，或通过本地 MCP 服务，将兼容的 AI 客户端连接到画布。')}</p><a class="text-link" href="#pricing">${say('Explore MCP + Library', '了解 MCP + Library')}${icon('arrow-right')}</a></div>
      <figure class="template-capture"><img src="${asset('mind-map.png')}" width="512" height="288" loading="lazy" alt="${say('ReDraw bundled mind-map template.', 'ReDraw 内置思维导图模板。')}"><figcaption>${say('A template from the bundled Library. Inserting bundled content requires a license.', '内置 Library 的思维导图模板。插入内置素材需要许可证。')}</figcaption></figure>
    </section>

    <section class="pricing" id="pricing">
      <div class="section-intro"><p class="eyebrow">${say('Simple choices', '按需选择')}</p><h2>${e(c.pricing.title)}</h2><p>${e(c.pricing.intro)}</p></div>
      <div class="plans">${c.pricing.plans.map(p => `<article class="plan"><h3>${e(p.name)}</h3><div class="price">${e(p.price)}</div><p class="price-period">${e(p.period)}</p><p class="plan-description">${e(p.description)}</p><ul>${p.features.map(v => `<li>${icon('check')}<span>${e(v)}</span></li>`).join('')}</ul>${p.id === 'free' ? download() : checkoutURL ? `<a class="button primary" href="${e(checkoutURL)}" rel="noopener noreferrer">${say('Buy lifetime license', '购买买断许可证')}${icon('arrow-right')}</a>` : `<p class="purchase-status">${say('Public purchases are not open yet.', '公开购买尚未开放。')}</p>`}</article>`).join('')}</div>
      <p class="pricing-note">${checkoutURL ? say('US$9.99, plus applicable taxes. The final total is shown at checkout.', '售价 9.99 美元，适用税额另计，最终金额以结账页为准。') : release ? say('Free download available now. Planned license price: US$9.99, plus applicable taxes.', '免费安装包现已可下载。许可证计划售价为 9.99 美元，适用税额另计。') : say('Public downloads and purchases are not open yet. Planned license price: US$9.99, plus applicable taxes.', '公开下载与购买尚未开放。许可证计划售价为 9.99 美元，适用税额另计。')}</p>
      <p class="pricing-note">${e(c.pricing.finePrint)} ${say('Connected clients may send canvas content to their AI provider.', '连接的客户端可能将画布内容发送给其 AI 服务商。')}</p>
    </section>

    <section class="faq-section"><h2>${e(c.faq.title)}</h2><div>${faq(c.faq.items)}</div></section>
    <section class="cinema-download" id="availability"><img class="download-app-icon" src="${asset('redraw-icon.png')}" width="72" height="72" alt=""><h2>${say('Your next idea<br>starts here.', '下一个想法，<br>从这里开始。')}</h2><p>${say('A native canvas. A little more clarity.', '一张原生画布，让思路再清晰一点。')}</p>${download()}${release ? `<p class="release-detail">${e(release.version)} · ${(release.size / 1024 / 1024).toFixed(1)} MB · macOS 14+</p><details class="download-integrity"><summary>${say('Verify your download', '校验下载文件')}</summary><p>SHA-256<br><code>${e(release.sha256)}</code></p></details>` : ''}</section>
  </div>

  <dialog class="demo-dialog" data-demo-dialog aria-labelledby="demo-title" aria-describedby="demo-description">
    <div class="dialog-heading"><h2 id="demo-title">${say('From Library to canvas', '从 Library 到画布')}</h2><button data-demo-close aria-label="${say('Close video', '关闭视频')}">${icon('x')}</button></div>
    <video controls playsinline preload="none" width="1920" height="1080" poster="${asset('redraw-library-mcp-v3.jpg')}"><source src="${video}" type="video/mp4"><a href="${video}">${say('Open the MP4 video', '打开 MP4 视频')}</a></video>
    <p id="demo-description">${say('35 seconds · Real ReDraw UI · Music, no narration. Shows optional MCP + Library features. AI services are separate.', '35 秒 · ReDraw 真实界面 · 英文视频，配乐无旁白。演示包含可选的 MCP + Library 功能，AI 服务另计。')}${checkoutURL ? '' : say(' Public purchases are not open yet.', '公开购买尚未开放。')}</p>
  </dialog>`;
}
