import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Split the heavy 3D + UI vendors into their own long-cached chunks so
        // the editor code stays small and updates don't re-download three.js.
        // `three/examples` is excluded: those are the exporter helpers, which
        // should stay as on-demand dynamic chunks (loaded only on export).
        codeSplitting: {
          groups: [
            { name: "three", test: /node_modules\/(@react-three|three)\/(?!examples)/ },
            { name: "vendor", test: /node_modules\/(react|react-dom|react-router|scheduler|@remix-run)\// },
          ],
        },
      },
    },
  },
})
