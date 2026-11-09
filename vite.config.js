import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const origin = env.CATALOG_API_ORIGIN || 'https://mipos-fotos-api.miposopuntodeventas.workers.dev'
  const token = env.CATALOG_API_TOKEN || ''

  return {
    plugins: [react()],
    server: {
      allowedHosts: ["5186-ir7f6n73ti5mhufb3ylqa-bf5b5ff8.us3.manus.computer", "5173-i7mn8l6o3e5s9ums7alrw-0f7f01b5.us3.manus.computer", "5173-ifrr8hwfew7wgvypqooj8-8d0ea2aa.us3.manus.computer", "5173-i2nij0qst53wwt57qslw6-81d39d19.us3.manus.computer", "5173-ir7f6n73ti5mhufb3ylqa-bf5b5ff8.us3.manus.computer", "5173-i8chwbbo7rnr5zjm8zttn-caa92a60.us3.manus.computer", "5173-itsue8isvhou5rm1ojwkw-da031ebc.us3.manus.computer", "5174-iso05gcx2zv45nswe3r3n-68028096.us4.manus.computer", "5185-imb05dqzfry7fkbbjorff-79aee688.us4.manus.computer", "5185-i1d1eker61r0z57wpzmcs-66115aa2.us3.manus.computer", "5185-i8lxff6qwpciq2ustco5g-74cfceea.us3.manus.computer", "5185-i2nij0qst53wwt57qslw6-81d39d19.us3.manus.computer", "5187-itsue8isvhou5rm1ojwkw-da031ebc.us3.manus.computer", "5187-iso05gcx2zv45nswe3r3n-68028096.us4.manus.computer"],
      proxy: {
        '/api/catalog': {
          target: origin,
          changeOrigin: true,
          rewrite: () => '/catalog',
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              if (token) proxyReq.setHeader('Authorization', `Bearer ${token}`)
            })
          },
        },
      },
    },
  }
})
