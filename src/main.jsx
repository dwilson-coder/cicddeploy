import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const platforms = [
  { id: 'netlify', name: 'Netlify', mark: 'N', color: '#28c5a5', type: 'Static + serverless', git: 'GitHub, GitLab, Bitbucket', tier: '100 GB bandwidth / 300 build min', blurb: 'The friendly default for Jamstack sites, forms, and serverless functions.', install: 'npm i -g netlify-cli', deploy: 'netlify login\nnetlify link\nnetlify deploy --prod --dir dist --no-build', env: 'netlify env:set API_URL "https://api.example.com" --context production\nnetlify env:list', config: '[build]\n  command = "npm run build"\n  publish = "dist"', docs: 'https://docs.netlify.com/cli/get-started/' },
  { id: 'vercel', name: 'Vercel', mark: 'V', color: '#f5c84b', type: 'Frontend platform', git: 'GitHub, GitLab, Bitbucket', tier: 'Hobby plan / preview deploys', blurb: 'Excellent for React, Next.js, and frontend teams that live in preview URLs.', install: 'npm i -g vercel', deploy: 'vercel login\nvercel link\nvercel --prod --yes', env: 'vercel env add API_URL production\nvercel env pull .env.local\nvercel env ls', config: '{\n  "buildCommand": "npm run build",\n  "outputDirectory": "dist"\n}', docs: 'https://vercel.com/docs/cli' },
  { id: 'cloudflare', name: 'Cloudflare Pages', mark: 'C', color: '#ff8c42', type: 'Edge static hosting', git: 'GitHub, GitLab', tier: 'Unlimited bandwidth / 6,000 builds', blurb: 'Fast global delivery with a clean path from static assets to edge Workers.', install: 'npm i -g wrangler', deploy: 'wrangler login\nnpx wrangler pages deploy dist --project-name my-site', env: 'npx wrangler pages secret put API_KEY\nCLOUDFLARE_API_TOKEN=token npx wrangler pages deploy dist --project-name my-site', config: 'name = "my-site"\ncompatibility_date = "2025-01-01"', docs: 'https://developers.cloudflare.com/pages/' },
  { id: 'render', name: 'Render', mark: 'R', color: '#9be15d', type: 'Full-stack PaaS', git: 'GitHub, GitLab', tier: 'Free static sites / 750 service hrs', blurb: 'A pragmatic choice when your static frontend and backend need one home.', install: 'Install from github.com/render-oss/cli', deploy: 'render login\nrender blueprints validate\nrender deploys create <SERVICE_ID> --wait', env: 'RENDER_API_KEY=token render deploys create <SERVICE_ID> --wait', config: 'services:\n  - type: web\n    name: my-app\n    runtime: node\n    buildCommand: npm run build', docs: 'https://render.com/docs' },
  { id: 'firebase', name: 'Firebase Hosting', mark: 'F', color: '#ffca3a', type: 'Google ecosystem', git: 'CLI / CI', tier: '10 GB storage / 360 GB transfer', blurb: 'A natural fit for Firebase Auth, Firestore, and mobile companion apps.', install: 'npm i -g firebase-tools', deploy: 'firebase login\nfirebase init hosting\nnpm run build\nfirebase deploy --only hosting', env: 'VITE_API_URL=https://api.example.com npm run build\nfirebase deploy --only hosting --project staging', config: '{\n  "hosting": { "public": "dist", "singlePageApp": true }\n}', docs: 'https://firebase.google.com/docs/hosting' },
  { id: 'surge', name: 'Surge', mark: 'S', color: '#f07167', type: 'CLI-only static', git: 'CLI / CI', tier: 'Free static subdomains', blurb: 'The fastest route from a built folder to a shareable static URL.', install: 'npm i -g surge', deploy: 'surge login\nsurge ./dist my-app.surge.sh', env: 'SURGE_LOGIN=you@example.com\nSURGE_TOKEN=token surge ./dist my-app.surge.sh', config: 'No config required. Point Surge at the folder you want to publish.', docs: 'https://surge.sh/help/' },
]

const githubActions = `name: Deploy to Netlify\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: npm ci && npm run build\n      - run: npx netlify-cli deploy --prod --dir dist --no-build\n        env:\n          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}\n          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}`

function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span> }
function CodeBlock({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return <div className="code-wrap"><button className="copy" onClick={copy}>{copied ? 'Copied' : label}</button><pre><code>{value}</code></pre></div>
}

function App() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('netlify')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [installed, setInstalled] = useState(false)
    const [showTopButton, setShowTopButton] = useState(false)
  const selected = platforms.find((platform) => platform.id === selectedId) || platforms[0]
  const filtered = useMemo(() => platforms.filter((platform) => `${platform.name} ${platform.type} ${platform.git} ${platform.blurb}`.toLowerCase().includes(query.toLowerCase())), [query])

  useEffect(() => {
    const handler = (event) => { if (event.key === '/' && event.target.tagName !== 'INPUT') { event.preventDefault(); document.querySelector('#search')?.focus() } }
      const onScroll = () => setShowTopButton(window.scrollY > 480)
    window.addEventListener('keydown', handler)
      window.addEventListener('scroll', onScroll, { passive: true })
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
      return () => { window.removeEventListener('keydown', handler); window.removeEventListener('scroll', onScroll) }
  }, [])

  function choose(id) { setSelectedId(id); setMobileMenu(false) }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" onClick={() => setSelectedId('netlify')}><span className="brand-mark"><span>&gt;</span>_</span><span>shipshape<span className="brand-dot">.</span></span></a>
      <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}><a href="#platforms">Platforms</a><a href="#workflow">Workflow</a><a href="#guide">Guides</a><div className="search-box"><span>⌕</span><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guides / press /" />{query && <div className="search-results">{filtered.length ? filtered.map((platform) => <a key={platform.id} href={platform.docs} target="_blank" rel="noreferrer" onClick={() => { choose(platform.id); setQuery('') }}><b>{platform.name}</b><small>{platform.type} / Official docs</small><span>↗</span></a>) : <div className="no-results">No matching platform</div>}</div>}</div><button className="nav-cta" onClick={() => setInstalled(true)}><Icon>↓</Icon>{installed ? 'Ready offline' : 'Install app'}</button></nav>
      <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">☰</button>
    </header>

    <main id="top">
      <section className="hero page-width">
        <div className="hero-copy"><div className="eyebrow"><span className="pulse"></span> FIELD GUIDE / 2026 EDITION</div><h1>Ship it.<br /><em>properly.</em></h1><p className="hero-intro">The practical CI/CD wiki for getting code from your laptop to production, without the ritual guesswork.</p><div className="hero-actions"><a className="button primary" href="#platforms">Explore platforms <span>↗</span></a><a className="text-link" href="#workflow">See the workflow <span>↓</span></a></div></div>
        <div className="terminal-card"><div className="terminal-top"><span className="window-dots"><i></i><i></i><i></i></span><span>deploy.sh</span><span className="terminal-status">● live</span></div><div className="terminal-body"><div><span className="prompt">$</span> git push origin main</div><div className="dim">Enumerating objects: 12, done.</div><div className="dim">Writing objects: 100% (12/12), done.</div><div className="success">✓ Build passed in 42s</div><div className="success">✓ Deploy complete</div><div className="url">↳ https://your-app.netlify.app</div><div className="cursor">_</div></div><div className="terminal-label">ONE PUSH. ONE PIPELINE. ZERO DRAMA.</div></div>
      </section>

      <section className="ticker"><div className="page-width ticker-inner"><span>SUPPORTED WORKFLOWS</span><b>GitHub</b><b>GitLab</b><b>Bitbucket</b><b>GitHub Actions</b><b>CLI-first</b><span>OFFLINE READY</span></div></section>

      <section className="section page-width" id="platforms"><div className="section-heading"><div><div className="eyebrow">01 / THE LANDSCAPE</div><h2>Pick your runway.</h2></div><p>Six popular hosts. One repeatable mental model. Compare the tradeoffs, then open the guide that fits your stack.</p></div><div className="platform-layout"><aside className="platform-list">{platforms.map((platform, index) => <button key={platform.id} className={selectedId === platform.id ? 'platform-row active' : 'platform-row'} onClick={() => choose(platform.id)}><span className="platform-number">0{index + 1}</span><span className="platform-mark" style={{ '--mark-color': platform.color }}>{platform.mark}</span><span className="platform-name">{platform.name}</span><span className="arrow">↗</span></button>)}</aside><div className="platform-feature" style={{ '--accent': selected.color }}><div className="feature-top"><span className="big-mark">{selected.mark}</span><span className="tag">{selected.type}</span><span className="feature-count">{String(platforms.indexOf(selected) + 1).padStart(2, '0')} / 06</span></div><h3>{selected.name}</h3><p>{selected.blurb}</p><div className="feature-meta"><div><span>GIT SOURCES</span><strong>{selected.git}</strong></div><div><span>FREE TIER SNAPSHOT</span><strong>{selected.tier}</strong></div></div><button className="button dark" onClick={() => choose(selected.id)}>Open {selected.name} guide <span>↗</span></button></div></div></section>

      <section className="workflow-band" id="workflow"><div className="page-width workflow-grid"><div><div className="eyebrow">02 / THE LOOP</div><h2>Push once.<br /><em>Deploy everywhere.</em></h2><p>Most Git-connected hosts follow the same four-step loop. Configure it once in a dashboard, then let every push to your production branch do the work.</p></div><div className="steps"><div className="step"><span>01</span><div><h3>Connect your repo</h3><p>Authorize GitHub, GitLab, or Bitbucket and choose the project.</p></div></div><div className="step"><span>02</span><div><h3>Declare the build</h3><p>Set your build command and output folder, usually <code>dist</code>.</p></div></div><div className="step"><span>03</span><div><h3>Lock your secrets</h3><p>Add environment variables in the host dashboard or CI secrets store.</p></div></div><div className="step"><span>04</span><div><h3>Push to ship</h3><p><code>git push origin main</code> triggers build, test, and deploy.</p></div></div></div></div></section>

      <section className="section page-width guide-section" id="guide"><div className="guide-head"><div><div className="eyebrow">03 / PLATFORM GUIDE</div><h2>{selected.name}<span className="guide-slash"> / </span>from zero to live</h2><p>{selected.blurb}</p></div><a className="docs-link" href={selected.docs} target="_blank" rel="noreferrer">Official docs <span>↗</span></a></div><div className="guide-grid"><div className="guide-column"><div className="guide-label">01 / INSTALL & DEPLOY</div><CodeBlock value={`${selected.install}\n\n${selected.deploy}`} /></div><div className="guide-column"><div className="guide-label">02 / ENVIRONMENT VARIABLES</div><CodeBlock value={selected.env} /><div className="security-note"><span>!</span><p><strong>Keep secrets server-side.</strong> Public frontend variables are visible in the built bundle. Put tokens and passwords in your provider's secret store.</p></div></div></div><div className="config-row"><div><div className="guide-label">CONFIG STARTER</div><CodeBlock value={selected.config} /></div><div className="guide-summary"><span className="summary-mark" style={{ background: selected.color }}>{selected.mark}</span><div><strong>Best for {selected.type.toLowerCase()}</strong><p>Use this guide as a launchpad, then verify current free-tier limits in the provider docs before production traffic.</p></div></div></div></section>

      <section className="action-section"><div className="page-width action-inner"><div><div className="eyebrow">04 / AUTOMATE IT</div><h2>Make the pipeline<br /><em>boringly reliable.</em></h2></div><div className="action-copy"><p>Want the full push-to-Netlify example? Start with this GitHub Actions workflow and swap the provider-specific CLI when you need to.</p><CodeBlock value={githubActions} label="Copy workflow" /></div></div></section>
    </main>
      <button type="button" className={showTopButton ? 'scroll-top visible' : 'scroll-top'} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top" title="Scroll to top">↑<span>Top</span></button>
    <footer className="footer page-width"><a className="brand" href="#top"><span className="brand-mark"><span>&gt;</span>_</span><span>shipshape<span className="brand-dot">.</span></span></a><div className="footer-credit"><strong>Copyright © 2026 Shipshape.</strong> Built by Damion Wilson for <a href="https://codeboxllc.net/" target="_blank" rel="noreferrer">CodeBox LLC</a>.</div><nav className="footer-links" aria-label="Footer links"><a href="https://github.com/dwilson-coder/cicddeploy.git" target="_blank" rel="noreferrer">GitHub ↗</a><a href="https://www.linkedin.com/in/damion-coder-wilson" target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="https://bsky.app/profile/dwilsoncoder.bsky.social" target="_blank" rel="noreferrer">BlueSky ↗</a></nav></footer>
  </div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)