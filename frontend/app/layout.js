import { Outfit, Inter } from "next/font/google";
import { Providers } from "./providers";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const inter  = Inter ({ subsets: ["latin"], variable: "--font-inter",  display: "swap" });

export const metadata = {
  title: "StableEscrow UAE | On-Chain USDC Trade Finance",
  description:
    "Trustless USDC escrow for UAE SME merchants. Create, fund, and release invoice payments on-chain via Polygon Amoy — powered by StableEscrow UAE.",
  keywords: ["UAE", "escrow", "USDC", "Polygon", "DeFi", "merchant", "trade finance", "stablecoin"],
  openGraph: {
    title: "StableEscrow UAE",
    description: "On-chain USDC escrow for UAE merchants",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
