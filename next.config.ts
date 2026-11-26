import type { NextConfig } from "next";

const apiInterna = process.env.STUR_API_INTERNO ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // O proxy do Next corta em 30 s por padrão; uma consulta real pode passar disso,
    // e o 504 do backend tem de chegar ao navegador.
    proxyTimeout: 180_000,
  },
  // Em produção o Traefik separa as rotas; o proxy só existe no desenvolvimento.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [{ source: "/api/:caminho*", destination: `${apiInterna}/api/:caminho*` }];
  },
};

export default nextConfig;
