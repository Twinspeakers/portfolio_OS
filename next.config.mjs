import { withContentlayer } from "next-contentlayer";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.infrastructureLogging = {
      ...(config.infrastructureLogging || {}),
      level: "error"
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
        message.includes("Build dependencies behind this expression are ignored");

      return isContentlayerModule || isCacheParseNoise;
    });

    return config;
  }
};

export default withContentlayer(nextConfig);
