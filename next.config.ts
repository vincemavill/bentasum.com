import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;
let repo = '';
if (isGithubActions) {
  const [_, repoName] = (process.env.GITHUB_REPOSITORY || '').split('/');
  repo = repoName ? `/${repoName}` : '';
}

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || (isGithubActions ? repo : ''),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;

