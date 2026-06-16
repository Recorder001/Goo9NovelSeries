/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client는 네이티브 모듈이라 번들 제외
  serverExternalPackages: ['@libsql/client'],
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
};
module.exports = nextConfig;
