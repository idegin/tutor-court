import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ably's build emits `(...args) => super(...args)` inside a derived-class
  // constructor. Transpile it here (and see the modern `browserslist` in
  // package.json) so SWC keeps that valid arrow-super intact instead of
  // half-downleveling it into an invalid plain-function super() that webpack
  // then rejects ("'super' keyword outside a method").
  transpilePackages: ['ably'],
  // Your Next.js config here
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
