# Paper

Six implementations of the same small, local-first text editor:

- React, Vite, Tailwind CSS, and shadcn/ui conventions (`react-shadcn-tailwind/`)
- Vanilla HTML, CSS, and JavaScript
- Alpine.js loaded from a CDN
- Vue loaded from a CDN
- lit-html loaded as an ES module from a CDN
- React, ReactDOM, and HTM loaded as ES modules from a CDN

## Choosing an implementation

| App | Pros | Cons | Good fit |
| --- | --- | --- | --- |
| React + shadcn/ui + Tailwind | Strong component model, TypeScript support, large ecosystem, and good tooling for testing and larger teams. | Requires a build tool and dependency installation; introduces more concepts and project machinery. | Medium or large interactive applications, reusable design systems, and projects expected to grow. |
| Vanilla | No framework, dependencies, or build step; uses only browser APIs and makes every operation explicit. | State synchronization and DOM updates must be written manually, which becomes repetitive as an interface grows. | Very small tools, mostly static pages, learning browser APIs, or projects where minimal dependencies matter most. |
| Alpine | Adds reactive state and concise bindings directly to existing HTML with one small script. | Logic can become scattered across HTML attributes, and complex component relationships are harder to organize. | Adding modest interactivity to static or server-rendered pages, forms, menus, and small internal tools. |
| Vue | Provides structured reactive state, computed values, methods, and declarative templates without requiring a build step. | The CDN build includes the template compiler and cannot use Vue Single-File Components; larger projects benefit from Vue's normal build setup. | Small or medium applications that need more structure than Alpine while retaining a simple CDN setup. |
| lit-html | Small and focused; keeps templates in JavaScript, escapes interpolated text by default, and efficiently updates changed template expressions. | It is a rendering library rather than a complete framework, so state management, component conventions, and update timing remain application responsibilities. | Projects that want efficient template literals without adopting a full framework, including custom elements and lightweight UI layers. |
| React (CDN) | Retains React components and hooks without npm or a build step; HTM provides JSX-like template literals in normal JavaScript. | Requires three CDN modules, cannot use JSX directly, lacks TypeScript/build optimizations, and is less conventional than a normal React setup. | Small experiments, embedded tools, and learning React where a build tool would be unnecessary. |

The CDN-based examples require an internet connection as written. For
production or offline use, pinning and serving local copies of those scripts is
usually preferable.

## Run all six apps with Vite

Install the React app's dependencies and start the development server:

```bash
npm install
npm run dev
```

Using the URL printed by Vite, open:

| App | URL |
| --- | --- |
| React + shadcn/ui + Tailwind | `http://localhost:8002/` |
| Vanilla | `http://localhost:8002/vanilla/` |
| Alpine | `http://localhost:8002/alpine/` |
| Vue | `http://localhost:8002/vue/` |
| lit-html | `http://localhost:8002/lit-html/` |
| React (CDN) | `http://localhost:8002/react-simple/` |

Vite may select a different port if `8002` is already occupied. In that case,
replace `8002` with the port shown in the terminal.

## Run the apps separately

### React + shadcn/ui + Tailwind

The React app lives in `react-shadcn-tailwind/` and requires the Vite
development server:

```bash
npm install
npm run dev
```

Open the root URL printed by Vite.

### Vanilla

The vanilla app has no dependencies or build step:

```bash
python3 -m http.server 8002 --directory vanilla
```

Open `http://localhost:8002/`.

### Alpine

The Alpine app has no local dependencies or build step:

```bash
python3 -m http.server 8002 --directory alpine
```

Open `http://localhost:8002/`. An internet connection is required to load
Alpine.js from jsDelivr.

### Vue

The Vue app has no local dependencies or build step:

```bash
python3 -m http.server 8002 --directory vue
```

Open `http://localhost:8002/`. An internet connection is required to load Vue
from jsDelivr.

### lit-html

The lit-html app has no local dependencies or build step:

```bash
python3 -m http.server 8002 --directory lit-html
```

Open `http://localhost:8002/`. An internet connection is required to load
lit-html from jsDelivr.

### React (CDN)

The simple React app has no local dependencies or build step:

```bash
python3 -m http.server 8002 --directory react-simple
```

Open `http://localhost:8002/`. An internet connection is required to load
React, ReactDOM, and HTM from jsDelivr.

## Browser support

Chromium-based desktop browsers can open and save directly to local files.
Other browsers use a standard file picker where available and download a copy
when direct saving is unsupported. The File System Access API requires a secure
context; `localhost` is treated as secure during development.
