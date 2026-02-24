/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/missioncontrol',
  output: 'standalone',
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken', 'better-sqlite3'],
};

module.exports = nextConfig;
