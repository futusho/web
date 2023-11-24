import { defineConfig } from '@wagmi/cli'
import { foundry, erc } from '@wagmi/cli/plugins'
import type { Plugin } from '@wagmi/cli'

const plugins: Plugin[] = [erc({ 20: true })]

// This code used to generate ABI as a JS object from ./contracts/*.json files
// We don't want to have this function on production, so we need to generate files only on dev machine.
// Generated JS objects will be placed inside ./src/lib/blockchain/generated.ts
if (process.env.NODE_ENV !== 'production') {
  plugins.push(
    foundry({
      artifacts: './contracts/',
    })
  )
}

export default defineConfig({
  out: 'src/lib/blockchain/generated.ts',
  plugins: plugins,
})
