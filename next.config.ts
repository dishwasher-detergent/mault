import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "sharp",
    "onnxruntime-node",
    "@huggingface/transformers",
  ],
};

export default nextConfig;
