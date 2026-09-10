/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  reactStrictMode: false,
  poweredByHeader: false,
  async redirects() {
    return [
      ...['garbage-pickup', 'dumpster-rental', 'trash-removal', 'cleaning-sanitation'].map(service => ({
        source: `/service/${service}/`, destination: `/blog/service/${service}/`, permanent: true,
      })),
      { source: '/service/portable-toilets/', destination: '/services/', permanent: true },
      { source: '/blog/2025/04/', destination: '/blog/category/blog/', permanent: true },
      { source: '/:path*/index.html', destination: '/:path*/', permanent: true },
    ];
  },
  experimental: { largePageDataBytes: 512 * 1024 },
};
export default nextConfig;
