/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone", // minimalny obraz Dockera
};
export default nextConfig;
