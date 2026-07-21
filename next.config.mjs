/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    instrumentationHook: true,
    // O Baileys (canal Não-oficial) roda `ws` dentro do processo do servidor. O `ws` espera
    // rodar sem bundling (usa `require("bufferutil")`/`require("utf-8-validate")` nativos em
    // runtime) — deixar o webpack empacotar esses pacotes quebra o binding nativo em runtime
    // ("bufferUtil.mask is not a function"), derrubando toda conexão do canal Não-oficial.
    serverComponentsExternalPackages: ["@whiskeysockets/baileys", "ws", "bufferutil", "utf-8-validate"],
  },
};

export default nextConfig;
