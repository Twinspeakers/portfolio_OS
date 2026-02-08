const repo = "portfolio_OS";
const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Static export for GitHub Pages
  output: "export",
  trailingSlash: true,

  // Next/Image needs this for static export
  images: { unoptimized: true },

  // GitHub Pages serves your site from /<repo>/
  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",

  // Make basePath available to client components for GitHub Pages-safe asset URLs
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? `/${repo}` : ""
  }
};

export default nextConfig;
