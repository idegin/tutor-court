import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NB: no `output: 'standalone'` — the app is served by a custom Node server
  // (server.ts) that also hosts the live-classroom Socket.IO plane, so we run
  // `next build` + `tsx server.ts` rather than Next's standalone server.

  // Skip type-checking and linting during the Docker/Depot build — the Depot
  // builder gets OOM-killed running tsc on this codebase. Both are checked
  // locally and in CI instead.
  typescript: { ignoreBuildErrors: process.env.SKIP_BUILD_CHECKS === '1' },
  eslint: { ignoreDuringBuilds: process.env.SKIP_BUILD_CHECKS === '1' },

  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    // Depot builders OOM on parallel webpack workers — compile sequentially to
    // keep peak memory under the 8 GB builder cap.
    webpackConfig.parallelism = 1

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
