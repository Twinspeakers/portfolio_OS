import { withContentlayer } from "next-contentlayer";

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

  webpack: (config) => {
    config.infrastructureLogging = {
      ...(config.infrastructureLogging || {}),
      level: "error",
    };

    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push((warning) => {
      const message =
        typeof warning === "string"
          ? warning
          : warning?.message || warning?.details || "";
      const moduleResource =
        typeof warning === "object" && warning?.module?.resource
          ? warning.module.resource
          : "";

      const isContentlayerModule = moduleResource.includes(
        "@contentlayer\\core\\dist"
      );
      const isCacheParseNoise =
        message.includes("webpack.FileSystemInfo") &&
        message.includes(
          "Build dependencies behind this expression are ignored"
        );

      return isContentlayerModule || isCacheParseNoise;
    });

    return config;
  },
};

export default withContentlayer(nextConfig);
