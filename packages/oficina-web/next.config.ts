import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["oficina-mcp"],
  serverExternalPackages: ["pg"],
};

export default config;
