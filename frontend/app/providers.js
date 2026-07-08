"use client";

import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { defineChain } from "viem";
import { hardhat } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// ── Define Polygon Amoy (not in viem's default chain list) ──────────────────
export const polygonAmoy = defineChain({
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://polygon-amoy.drpc.org"] },
    public:  { http: ["https://polygon-amoy.drpc.org"] },
  },
  blockExplorers: {
    default: { name: "Polygonscan", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
});

// ── Wagmi + RainbowKit config ──────────────────────────────────────────────
const config = getDefaultConfig({
  appName: "Aegis Protocol",
  projectId: "aegis-protocol-hackathon-2026",
  chains: [hardhat, polygonAmoy],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [polygonAmoy.id]: http("https://polygon-amoy.drpc.org"),
  },
  ssr: true,
});

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#C9A84C",
            accentColorForeground: "#050B18",
            borderRadius: "medium",
            fontStack: "system",
          })}
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
