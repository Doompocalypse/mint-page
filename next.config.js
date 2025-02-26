/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['peach-smoggy-opossum-618.mypinata.cloud'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: true,
    loader: 'custom',
    loaderFile: './image-loader.js',
    formats: ['image/webp'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        crypto: false,
      };
    }

    // Fix for @project-serum/anchor
    config.externals = [...(config.externals || []), "encoding"];
    
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
  env: {
    NEXT_PUBLIC_AUTHORITY_CONFIG: process.env.NEXT_PUBLIC_AUTHORITY_CONFIG,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
