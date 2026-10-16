import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss'
import { tanstackRouter } from '@tanstack/router-plugin/rspack'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const themeLock = (process.env.PUBLIC_THEME_LOCK ?? '').trim()

/**
 * `<%= themeHead %>` in index.html. Stock builds get upstream's single
 * theme-color meta. Theme-locked builds (src/lib/theme-lock.ts) get one meta
 * per colour scheme and an inline script that sets upstream's `.light`/`.dark`
 * class plus `data-theme-lock` on <html> before first paint, from the stored
 * mode (`newapi:theme:v1:mode`, src/lib/theme-storage.ts) or, with none,
 * `prefers-color-scheme`. A forced mode writes its colour into both metas,
 * as syncThemeColorMetas() in src/lib/theme-lock.ts does later.
 */
function themeHead(lock: string): string {
  if (!lock) return '<meta name="theme-color" content="#fff" />'
  const colors = { light: '#ffffff', dark: '#0f0f0f' }
  const metas = (['light', 'dark'] as const)
    .map(
      (scheme) =>
        `<meta name="theme-color" media="(prefers-color-scheme: ${scheme})" content="${colors[scheme]}" data-color="${colors[scheme]}" />`
    )
    .join('\n    ')
  const script = `(function () {
      var mode = null;
      try { mode = localStorage.getItem('newapi:theme:v1:mode'); } catch (e) {}
      var forced = mode === 'light' || mode === 'dark';
      var dark = forced ? mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      var root = document.documentElement;
      root.classList.add(dark ? 'dark' : 'light');
      root.setAttribute('data-theme-lock', ${JSON.stringify(lock)});
      if (!forced) return;
      var metas = document.querySelectorAll('meta[name="theme-color"][data-color]');
      var color = null;
      for (var i = 0; i < metas.length; i++) if (metas[i].media.indexOf(mode) !== -1) color = metas[i].getAttribute('data-color');
      for (var j = 0; j < metas.length; j++) if (color) metas[j].setAttribute('content', color);
    })();`
  return `${metas}\n    <script>\n    ${script}\n    </script>`
}

export default defineConfig(({ envMode }) => {
  const env = loadEnv({ mode: envMode, prefixes: ['VITE_'] })
  const serverUrl =
    process.env.VITE_REACT_APP_SERVER_URL ||
    env.rawPublicVars.VITE_REACT_APP_SERVER_URL ||
    'http://localhost:3000'

  const isProd = envMode === 'production'
  const devProxy = Object.fromEntries(
    (['/api', '/v1', '/mj', '/pg'] as const).map((key) => [
      key,
      { target: serverUrl, changeOrigin: true },
    ])
  ) as Record<string, { target: string; changeOrigin: boolean }>

  return {
    plugins: [pluginReact(), pluginTailwindcss({ optimize: false })],
    // Rsbuild 2: replaces deprecated `performance.chunkSplit` (RSPack 2 aligned)
    splitChunks: {
      preset: 'default',
      cacheGroups: {
        'vendor-react': {
          test: /node_modules[\\/](react|react-dom)[\\/]/,
          name: 'vendor-react',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
        'vendor-ui-primitives': {
          test: /node_modules[\\/](@base-ui|@radix-ui)[\\/]/,
          name: 'vendor-ui-primitives',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
        'vendor-tanstack': {
          test: /node_modules[\\/]@tanstack[\\/]/,
          name: 'vendor-tanstack',
          chunks: 'all',
          priority: 0,
          enforce: true,
        },
      },
    },
    source: {
      entry: {
        index: './src/main.tsx',
      },
      define: {
        // Locks the theme for every visitor (preset + light mode) and hides the
        // theme controls. Empty = stock behaviour. See src/lib/theme-lock.ts.
        __THEME_LOCK__: JSON.stringify(themeLock),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    html: {
      template: './index.html',
      templateParameters: { themeHead: themeHead(themeLock) },
      favicon: './public/favicon.ico',
    },
    server: {
      host: '0.0.0.0',
      strictPort: false,
      proxy: devProxy,
    },
    output: {
      // Production optimizations
      minify: isProd,
      target: 'web',
      distPath: {
        root: 'dist',
      },
      // Rely on Rsbuild default legalComments ("linked" → per-chunk *.LICENSE.txt) in all modes.
      // Do not set "none" in production: that strips minifier-preserved third-party notices and
      // extracted license files, which some distributions require for open-source compliance.
    },
    performance: {
      // Remove console in production
      removeConsole: isProd ? ['log'] : false,
      buildCache: false,
    },
    tools: {
      rspack: {
        plugins: [
          tanstackRouter({
            target: 'react',
            // Dev: avoid per-route async chunks (reduces white flash on navigation + faster HMR feedback).
            // Prod: keep route-based code splitting.
            autoCodeSplitting: isProd,
          }),
        ],
      },
    },
  }
})
