import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { Readable } from 'node:stream'
import { serveStatic } from './src/server/static.ts'

// Live preview: when anything under projects/ or engine/ changes (CLI renders, skill edits),
// tell the browser so the player reloads its data and iframe.
function vkWatch(): Plugin {
  const dirs = [
    process.env.VK_PROJECTS_DIR ? resolve(process.env.VK_PROJECTS_DIR) : resolve('projects'),
    resolve('engine'),
  ]
  return {
    name: 'vk-watch',
    configureServer(server) {
      // nitro's dev middleware skips asset-looking requests (.mp3, fonts, images), so serve them here
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        const r = serveStatic(url.pathname, new Request(url, { headers: req.headers as HeadersInit }))
        if (!r) return next()
        res.writeHead(r.status, Object.fromEntries(r.headers))
        if (!r.body || req.method === 'HEAD') return res.end()
        Readable.fromWeb(r.body as import('node:stream/web').ReadableStream).pipe(res)
      })
      server.watcher.add(dirs)
      let timer: ReturnType<typeof setTimeout> | undefined
      const changed = new Set<string>()
      const onChange = (file: string) => {
        if (!dirs.some((d) => file.startsWith(d)) || /\/build\//.test(file)) return
        changed.add(file)
        clearTimeout(timer)
        timer = setTimeout(() => {
          server.ws.send({ type: 'custom', event: 'vk:change', data: { files: [...changed] } })
          changed.clear()
        }, 150)
      }
      for (const ev of ['add', 'change', 'unlink'] as const) server.watcher.on(ev, onChange)
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: { watch: { ignored: ['**/videos/*/build/**', '**/foni-video-kit/**'] } },
  plugins: [
    devtools(),
    vkWatch(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config
