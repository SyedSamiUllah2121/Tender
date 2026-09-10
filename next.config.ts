import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Type errors are surfaced by `npm run lint` (tsc --noEmit).
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
