import type { NextConfig } from "next";

// URL onde a API (NestJS) está rodando localmente. Ver web/.env.example.
const API_URL = process.env.API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Proxy: o navegador só fala com o próprio Next (mesma origem), que repassa
  // pra API por trás. Evita configurar CORS/cookies cross-origin na API.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
