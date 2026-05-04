# Credits & Acknowledgments
> **Last revised**: 2026-05-04

This project is built on the shoulders of giants. We are deeply grateful to the following projects, libraries, and resources that make this application possible.

---
## Content Sources

### Wikimedia Foundation
Wikitime's purpose is to visualize time from any source. But it was developed using the most complete source of them all: Wikimedia, Wikipedia, Wikidata. I am deeply grateful to the Wikipedia and Wikidata communities, and to the Wikimedia Foundation that hosts both. I was profoundly inspired by this great idea of free information for everyone.
<table><tr>
<td><img src="source\Wikimedia.png" alt="Wikimedia" height="150" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\wikipedia.png" alt="Wikimedia" height="130" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\Wikidata.png" alt="Wikimedia" height="130" style="background-color: transparent; padding: 5px" /></td>
</tr></table>

- **[Wikipedia](https://www.wikipedia.org/)** — article text and metadata under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Every article displayed inside Wikitime carries a visible "Source: Wikipedia" attribution and a direct link back to its source page. Article text is shown in the in-app reader panel; images are loaded from Wikimedia Commons via their original URL.
- **[Wikidata](https://www.wikidata.org/)** — date, entity type, and biographical metadata under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Wikitime's entire timeline structure (dates of birth, death, point-in-time, occurrence) is built from Wikidata properties. CC0 imposes no attribution requirement, but we credit Wikidata explicitly because the project deserves it.
- **[Wikimedia Foundation](https://foundation.wikimedia.org/)** — the non-profit that hosts and protects Wikipedia, Wikidata, Commons, and the rest of the Wikimedia ecosystem. Wikitime exists because the Foundation makes that infrastructure free to consume and reuse. **If you find the underlying data valuable, please consider donating directly:** https://donate.wikimedia.org

### Attribution
- All text content shown from Wikipedia is attributed inline with a direct link to the source article.
- No Wikipedia trademark or logo is reproduced inside the app interface beyond what the [Wikimedia Trademark Policy](https://foundation.wikimedia.org/wiki/Policy:Trademark_policy) permits for source-attribution use.
- For Wikimedia-community questions, concerns, or compliance requests: **<your-contact-email>**

### How Wikitime treats Wikimedia infrastructure
Wikitime is designed to *reduce*, not increase, load on Wikimedia servers compared to a naive client-side scan. Concretely:
- **Server-side cache (WTS — "Wikipedia Time Server").** The first user to open an article triggers a Wikidata round-trip from their browser. The resulting metadata (~150 bytes per article) is then stored on Wikitime's own server. Every subsequent request from any user is served from our cache without touching Wikimedia at all.
- **Per-category TTLs.** Stable metadata (birth/death dates, entity type, names, image filename) is cached for ~1 year. Volatile data (pageview counts) is refreshed on a shorter cycle (~2 weeks) and only via the dedicated pageview endpoint — never by re-scanning the full article.
- **Schema-version aware.** Each cached row carries a `schema_version` column. If a Wikidata property is renamed or replaced upstream, affected rows are marked stale and re-fetched — no silent staleness.
- **No backend scraping.** Wikitime's own backend never fetches Wikipedia or Wikidata. All outbound calls to the Wikimedia APIs are made from the user's browser via CORS, so traffic is naturally distributed across users' own IP addresses rather than concentrated through a single backend identity.
- **Inter-batch pacing.** When a single page contains many entities to resolve, the client splits scans into sequential batches of up to 50 entities, with a delay between batches to stay well under Wikipedia's and Wikidata's per-IP quotas.
- **Lazy, not bulk.** Wikitime never crawls Wikipedia preemptively. Articles are fetched on demand, in response to a real user opening that article. There is no offline crawl, no scheduled scan, no bulk import.

The intended steady-state effect, once the cache reaches maturity, is that a Wikitime user generates a small fraction of the Wikimedia traffic of an equivalent direct-scan client, while still sending traffic *back* to Wikipedia through "Read full article" and "Open on Wikipedia" links inside the reader.

---
## Technologies

### Runtime & Frameworks
<table><tr>
<td><img src="source\react.png" alt="React" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\typescript.png" alt="TypeScript" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\vite.png" alt="Vite" height="100" style="background-color: transparent; padding: 5px" /></td>
</tr></table>

- **[React](https://react.dev/)** - MIT License. A JavaScript library for building user interfaces.
- **[TypeScript](https://www.typescriptlang.org/)** - Apache-2.0 License. Typed superset of JavaScript that compiles to plain JavaScript.
- **[Vite](https://vitejs.dev/)** - MIT License. Next generation frontend tooling for blazing fast development.
### State Management, Graphics & Rendering
<table><tr>
<td><img src="source\pixijs.png" alt="PixiJS" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\zustand.png" alt="Zustand" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\gsap.png" alt="GSAP" height="100" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[PixiJS](https://pixijs.com/)** - MIT License. The HTML5 Creation Engine - fast, flexible 2D WebGL renderer.
- **[Zustand](https://zustand-demo.pmnd.rs/)** - MIT License. A small, fast, and scalable bearbones state-management solution.
- **[GSAP (GreenSock Animation Platform)](https://gsap.com/)** - Standard "No Charge" License. Professional-grade JavaScript animation for the modern web.
### Utilities & Libraries
<table><tr>
<td><img src="source\dayjs.png" alt="Day.js" width="150" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\i18.png" alt="i18next" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\react router.png" alt="React Router" width="150" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[Day.js](https://day.js.org/)** - MIT License. Fast 2kB alternative to Moment.js with the same modern API.
- **[i18next](https://www.i18next.com/)** - MIT License. Internationalization framework for JavaScript.
- **[React Router](https://reactrouter.com/)** - MIT License. Declarative routing for React applications.
- **[html-react-parser](https://github.com/remarkablemark/html-react-parser)** - MIT License. HTML to React parser that works on both the server and the client.
- **[use-gesture](https://use-gesture.netlify.app/)** - MIT License. React hook for handling mouse and touch gestures.
### Runtime
<table><tr>
<td><img src="source\node-js.png" alt="Node.js" height="100" style="background-color: white; padding: 5px" /></td>
<td><img src="source\express.png" alt="Express" width="150" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[Node.js](https://nodejs.org/)** - MIT License. JavaScript runtime built on Chrome's V8 engine.
- **[Express](https://expressjs.com/)** - MIT License. Fast, unopinionated, minimalist web framework for Node.js.
- **[tsx](https://github.com/privatenumber/tsx)** - MIT License. TypeScript Execute - run TypeScript directly without compilation.
### Database
<table><tr>
<td><img src="source\postgresql.png" alt="PostgreSQL" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\drizzle-orm.png" alt="Drizzle" width="150" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[PostgreSQL](https://www.postgresql.org/)** - PostgreSQL License. The world's most advanced open source relational database.
- **[Drizzle ORM](https://orm.drizzle.team/)** - Apache-2.0 License. TypeScript ORM for SQL databases. Schema-as-code with type-safe queries.
- **[Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)** - MIT License. Migration toolkit for Drizzle ORM.
- **[postgres](https://github.com/porsager/postgres)** - The Unlicense. PostgreSQL client for Node.js, used by Drizzle ORM.
### Authentication
<table><tr>
<td><img src="source\better-auth.png" alt="Better Auth" width="150" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[Better Auth](https://www.better-auth.com/)** - MIT License. Modern, framework-agnostic authentication library. Provides email/password, social sign-in (Google, GitHub, Microsoft, Discord, LinkedIn, Facebook), TOTP two-factor, passkeys (WebAuthn), and account linking. Wraps cleanly behind Wikitime's `AuthAdapter` interface for provider portability.
- **[@better-auth/passkey](https://www.better-auth.com/docs/plugins/passkey)** - MIT License. WebAuthn/passkey plugin for Better Auth.
- **[@better-auth/cli](https://www.better-auth.com/docs/concepts/cli)** - MIT License. Schema generator and migration tools for Better Auth.
- **[jose](https://github.com/panva/jose)** - MIT License. JSON Web Token / JOSE library used by Better Auth internally.
### Caching & Rate Limiting
<table><tr>
<td><img src="source\redis.png" alt="Redis" height="60" style="background-color: transparent; padding: 5px" /></td>
</tr></table>

- **[ioredis](https://github.com/redis/ioredis)** - MIT License. Redis client for Node.js. Used for distributed rate-limiting and session caching at scale.
- **[Redis](https://redis.io/)** - RSALv2 / SSPLv1 (server) / BSD-3 (client compat). In-memory data store. Wikitime uses it for sliding-window rate limits and session cache; falls back to in-process maps when unavailable.
### Validation, Schema, Email &  Observability
<table><tr>
<td><img src="source\zod.png" alt="Zod" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\resend.png" alt="Resend" height="100" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[Zod](https://zod.dev/)** - MIT License. Used at every server boundary (HTTP routes, DB writes, env vars).
- **[Resend](https://resend.com/)** - Commercial service. Transactional email delivery for verification, password reset, and email change notifications. Pluggable behind `EmailService` interface.
- **[dotenv](https://github.com/motdotla/dotenv)** - BSD-2-Clause License. Loads environment variables from `.env` files.
### Security
<table><tr>
<td><img src="source\Helmet.png" alt="Helmet" width="150" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[helmet](https://helmetjs.github.io/)** - MIT License. Express middleware to set security-related HTTP headers.
- **[cors](https://github.com/expressjs/cors)** - MIT License. CORS handling for cross-origin requests.
- **[cookie-parser](https://github.com/expressjs/cookie-parser)** - MIT License. Cookie parser middleware.
### Build, Bundling & Package Management
<table><tr>
<td><img src="source\vite.png" alt="Vite" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\sass.png" alt="Sass" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\pnpm.png" alt="pnpm" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\npm.png" alt="npm" height="100" style="background-color: transparent; padding: 5px" /></td>
</tr></table>

- **[Vite](https://vitejs.dev/)** - MIT License. Build tool and dev server.
- **[Sass](https://sass-lang.com/)** - MIT License. CSS preprocessor with superpowers.
- **[vite-plugin-glsl](https://github.com/UstymUkhman/vite-plugin-glsl)** - MIT License. Vite plugin for importing GLSL shaders.
- **[pnpm](https://pnpm.io/)** - MIT License. Fast, disk space efficient package manager.
- **[npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)** Monorepo package management.
### Development Tools
<table><tr>
<td><img src="source\anthropic.png" alt="Anthropic" width="150" style="background-color: white; padding: 5px" /></td>
<td><img src="source\eslint.png" alt="ESLint" width="150" style="background-color: white; padding: 5px" /></td>
<td><img src="source\prettier.png" alt="Prettier" width="48" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[Claude Code](https://claude.ai/code)** by Anthropic. AI-powered coding assistant used extensively in the development of this project. Helped with architecture design, code generation, refactoring, and documentation.
- **[ESLint](https://eslint.org/)** - MIT License. Pluggable JavaScript linter for identifying and reporting on patterns.
- **[Prettier](https://prettier.io/)** - MIT License. Opinionated code formatter.
- **[TypeScript ESLint](https://typescript-eslint.io/)** - MIT License. Tooling which enables ESLint to support TypeScript.
### Infrastructure & Services
<table><tr>
<td><img src="source\fly-io.png" alt="Fly.io" width="150" style="background-color: white; padding: 5px" /></td>
<td><img src="source\upstash.png" alt="Upstash" height="100" style="background-color: transparent; padding: 5px" /></td>
<td><img src="source\github.png" alt="GitHub" height="100" style="background-color: white; padding: 5px" /></td>
<td><img src="source\mcp.png" alt="MCP" width="150" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **[Fly.io](https://fly.io/)** - Commercial service. Container hosting for the API server. Auto-HTTPS, global edge. *(Confirmed for production; see planMilestoneReorder Stage 2d.)*
- **[Neon](https://neon.tech/)** - Commercial service. Managed Postgres with serverless scaling and branch-per-environment. *(Confirmed for production.)*
- **[Upstash](https://upstash.com/)** - Commercial service. Managed serverless Redis. Pairs with Fly.io for low-latency access. *(Confirmed for production.)*
- **[GitHub Pages](https://pages.github.com/)** - Free hosting for static sites
- **[GitHub](https://github.com/)** - Code hosting and version control
- **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/)** - MIT License. Protocol for connecting AI assistants to external data sources and tools.

---
## Visuals
<table><tr>
<td><img src="source\flaticon.png" alt="Flaticon" width="150" style="background-color: white; padding: 5px" /></td>
<td><img src="source\pexels.png" alt="Pexels" width="150" style="background-color: white; padding: 5px" /></td>
<td><img src="source\google-fonts.png" alt="Google Fonts" width="150" style="background-color: white; padding: 5px" /></td>
<td><img src="source\atkinson-hyperlegible.png" alt="Atkinson Hyperlegible" width="150" style="background-color: white; padding: 5px" /></td>
<td><img src="source\codepen.png" alt="CodePen" width="150" style="background-color: white; padding: 5px" /></td>
</tr></table>

- **Icons** from **[Flaticon](https://www.flaticon.com)**
- **Custom icon sprites** some icons generated from Wikipedia, public domain sources and some designed by author
- **Background videos** **[Pexels](https://www.pexels.com)** => need to credit the authors of videos that were kept
- **Fonts**
  **[Roboto Condensed](https://fonts.google.com/specimen/Roboto+Condensed)*** - Apache-2.0 License. Designed by Christian Robertson for Google. Primary UI font used throughout the application.
  **[Atkinson Hyperlegible](https://brailleinstitute.org/freefont)*** - Open Font License. Designed by Braille Institute of America. Greater legibility and readability for low vision readers.
- **[Squircle Button System](https://codepen.io/Andrew-Fisher-the-decoder/pen/raMZQNe)** by Andrew Fisher. The layered SVG depth illusion button.
- **[CodePen](https://codepen.io/)** Online code editor and community that served as a major source of UI inspiration throughout the project. Yes, I know, I'm a boomer and many of you think the UI sucks... Fair enough, come and help me make it better.

---
## Special Thanks
<table><tr>
<td><img src="source\caro.png" alt="Caroline" width="150" style="background-color: transparent; padding: 5px" /></td>
</tr></table>

- **Wikipedia contributors** - For maintaining the vast repository of historical knowledge that powers Wikit's content.
- **Open source community** - For creating and maintaining the incredible ecosystem of tools and libraries.
- This project itself is distributed under its own license. Please refer to the LICENSE file in the repository for details.
- All third-party libraries and resources listed above are governed by their respective licenses.
- **Caroline** - my darling wifey who worked hard so that her salary financed this project. Without her, nothing possible.

---
## TODO
I removed **Three.js** ... do i bring it back?
add the email in "For Wikimedia-community questions, concerns, or compliance requests: **<your-contact-email>**"

Libraries with no logo: html-react-parser, use-gesture, tsx, jose, ioredis, cors, cookie-parser, dotenv