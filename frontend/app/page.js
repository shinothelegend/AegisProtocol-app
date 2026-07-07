"use client";

import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ESCROW_ABI } from "@/lib/escrow-abi";
import { ESCROW_ADDRESS, USDC_ADDRESS, POLYGONSCAN } from "@/lib/constants";
import styles from "./page.module.css";

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "gold" }) {
  return (
    <div className={`${styles.statCard} glass-card`}>
      <div className={`${styles.statIcon} ${styles[`icon_${color}`]}`}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ── Feature Card ─────────────────────────────────────────────
function FeatureCard({ icon, title, desc }) {
  return (
    <div className={`${styles.featureCard} glass-card`}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{desc}</p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function DashboardPage() {
  const { isConnected } = useAccount();

  const { data: nextId } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "nextEscrowId",
  });

  const totalEscrows = nextId ? Number(nextId) : 0;

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroBadge}>
              <span className="dot dot-success" />
              Live on Polygon Amoy Testnet
            </div>

            <h1 className={styles.heroTitle}>
              USDC Escrow for<br />
              <span className={styles.heroGold}>UAE Merchants</span>
            </h1>

            <p className={styles.heroSub}>
              Trustless, on-chain payment protection for UAE SME trade finance.
              Create escrow invoices, fund with USDC, release on delivery — zero middlemen.
            </p>

            <div className={styles.heroCta}>
              {isConnected ? (
                <>
                  <Link href="/create" className="btn btn-primary btn-lg">
                    ✦ Create Escrow
                  </Link>
                  <Link href="/escrows" className="btn btn-secondary btn-lg">
                    View My Escrows
                  </Link>
                </>
              ) : (
                <>
                  <ConnectButton label="Connect Wallet to Start" />
                  <span className={styles.heroHint}>Connect your wallet to create or manage escrows</span>
                </>
              )}
            </div>

            {/* Contract pill */}
            <a
              href={`${POLYGONSCAN}/address/${ESCROW_ADDRESS}`}
              target="_blank" rel="noreferrer"
              className={styles.contractPill}
            >
              <span className={styles.pillIcon}>◈</span>
              <span className={styles.pillLabel}>Contract</span>
              <span className={styles.pillAddr} title={ESCROW_ADDRESS}>
                {ESCROW_ADDRESS?.slice(0,6)}…{ESCROW_ADDRESS?.slice(-4)}
              </span>
              <span className={styles.pillNetwork}>Polygon Amoy</span>
              <span className={styles.pillLink}>↗</span>
            </a>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────── */}
        <section className={styles.statsSection}>
          <div className={`container ${styles.statsGrid}`}>
            <StatCard
              icon="📋"
              label="Total Escrows Created"
              value={totalEscrows}
              sub="on-chain, Polygon Amoy"
              color="gold"
            />
            <StatCard
              icon="⛓️"
              label="Smart Contract"
              value="Verified"
              sub="Polygon Amoy • Solidity 0.8.20"
              color="blue"
            />
            <StatCard
              icon="💵"
              label="Settlement Token"
              value="USDC"
              sub={`${USDC_ADDRESS?.slice(0,6)}…${USDC_ADDRESS?.slice(-4)}`}
              color="green"
            />
            <StatCard
              icon="🔒"
              label="Custody Model"
              value="Non-custodial"
              sub="Smart contract holds funds"
              color="purple"
            />
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────── */}
        <section className={styles.howSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>How It Works</h2>
              <p className={styles.sectionSub}>Three on-chain steps — no bank, no broker</p>
            </div>

            <div className={styles.steps}>
              {[
                { n:"01", icon:"📝", title:"Merchant Creates Escrow", desc:"Set the buyer's address, USDC amount, and payment deadline. The escrow ID is recorded on-chain instantly." },
                { n:"02", icon:"💰", title:"Buyer Funds with USDC", desc:"Buyer approves and deposits USDC into the smart contract. Funds are locked — neither party can move them unilaterally." },
                { n:"03", icon:"✅", title:"Release on Confirmation", desc:"Merchant confirms delivery or deadline passes — funds auto-release to merchant. Full on-chain audit trail." },
              ].map(s => (
                <div key={s.n} className={`${styles.step} glass-card`}>
                  <div className={styles.stepNum}>{s.n}</div>
                  <div className={styles.stepIcon}>{s.icon}</div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────── */}
        <section className={styles.featuresSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Built for UAE Commerce</h2>
              <p className={styles.sectionSub}>Solving real SME trade finance pain points</p>
            </div>
            <div className={styles.featuresGrid}>
              <FeatureCard icon="🇦🇪" title="UAE SME Focused" desc="Solves the #1 UAE trade finance problem: buyers delaying payment after receiving goods. Escrow enforces payment on delivery." />
              <FeatureCard icon="🔐" title="Trustless Security" desc="USDC locked in smart contract. No third party can access funds — released only on merchant confirmation or deadline." />
              <FeatureCard icon="⚡" title="Instant Settlement" desc="Release is on-chain and instant. No waiting for bank wires, SWIFT delays, or clearinghouse processing." />
              <FeatureCard icon="📊" title="Full Transparency" desc="Every escrow, funding, and release event is recorded on-chain. Auditable by anyone via Polygonscan." />
              <FeatureCard icon="💵" title="USDC Stablecoin" desc="No exchange rate risk. USD-pegged stablecoin means buyers and merchants both know exactly what they're dealing with." />
              <FeatureCard icon="🌐" title="Open Protocol" desc="No signup, no KYC, no lock-in. Any UAE merchant with a wallet can create an escrow in seconds." />
            </div>
          </div>
        </section>

        {/* ── CTA FOOTER BAND ──────────────────────────────── */}
        <section className={styles.ctaBand}>
          <div className="container">
            <h2 className={styles.ctaTitle}>Ready to protect your payments?</h2>
            <p className={styles.ctaSub}>Create your first on-chain escrow in under 60 seconds.</p>
            <div className={styles.ctaButtons}>
              {isConnected ? (
                <Link href="/create" className="btn btn-primary btn-lg">✦ Create Your First Escrow</Link>
              ) : (
                <ConnectButton label="Connect Wallet →" />
              )}
              <a href={`${POLYGONSCAN}/address/${ESCROW_ADDRESS}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg">
                View on Polygonscan ↗
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
