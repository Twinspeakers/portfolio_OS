const repo = "portfolio_OS";
const ciBasePath = process.env.GITHUB_ACTIONS === "true" ? `/${repo}` : "";
const basePath = process.env.BASE_PATH ?? ciBasePath;
const assetPrefix = basePath ? `${basePath}/` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Static export for GitHub Pages
  output: "export",
  trailingSlash: true,

  // Next/Image needs this for static export
  images: { unoptimized: true },

  // Base path defaults to GitHub Pages in CI; local builds can run without a prefix.
  basePath,
  assetPrefix,

  // Make basePath available to client components for GitHub Pages-safe asset URLs
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  }
};

export default nextConfig;
