"use client";

import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ESCROW_ABI } from "@/lib/escrow-abi";
import { ESCROW_ADDRESS, POLYGONSCAN, USDC_DECIMALS } from "@/lib/constants";
import styles from "./escrows.module.css";

// ── Format helpers ─────────────────────────────────────────────
function formatUsdc(amount) {
  if (!amount && amount !== 0n) return "—";
  const num = Number(BigInt(amount)) / 10 ** USDC_DECIMALS;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDeadline(unix) {
  if (!unix) return "—";
  const d = new Date(Number(unix) * 1000);
  return d.toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" });
}

function getStatus(escrow) {
  if (!escrow) return "unknown";
  const { funded, released, deadline } = escrow;
  if (released) return "released";
  if (funded)   return "funded";
  if (deadline && Date.now() / 1000 > Number(deadline)) return "expired";
  return "pending";
}

const STATUS_META = {
  released: { label: "Released", cls: "badge-released", dot: "dot-success" },
  funded:   { label: "Funded",   cls: "badge-funded",   dot: "dot-blue"    },
  pending:  { label: "Pending",  cls: "badge-pending",  dot: "dot-warning"  },
  expired:  { label: "Expired",  cls: "badge-expired",  dot: "dot-muted"    },
};

// ── Single escrow row (reads chain) ───────────────────────────
function EscrowRow({ id, walletAddress }) {
  const { data, isLoading } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "escrows",
    args: [BigInt(id)],
  });

  if (isLoading) {
    return (
      <div className={`${styles.row} glass-card`}>
        <div className={`skeleton ${styles.skeletonLine}`} />
      </div>
    );
  }
  if (!data) return null;

  const [payer, payee, amount, funded, released, deadline] = data;

  // Only show escrows involving the connected wallet
  const wallet = walletAddress?.toLowerCase();
  if (payer.toLowerCase() !== wallet && payee.toLowerCase() !== wallet) return null;

  const status = getStatus({ funded, released, deadline });
  const meta = STATUS_META[status];
  const role  = payer.toLowerCase() === wallet ? "Merchant" : "Buyer";

  return (
    <Link href={`/escrow/${id}`} className={`${styles.row} glass-card`} id={`escrow-row-${id}`}>
      <div className={styles.rowId}>
        <span className={styles.idLabel}>ID</span>
        <span className={styles.idVal}>#{id}</span>
      </div>

      <div className={styles.rowAmnt}>
        <span className={styles.amnt}>{formatUsdc(amount)}</span>
        <span className={styles.amntUnit}>USDC</span>
      </div>

      <div className={styles.rowParties}>
        <div className={styles.party}>
          <span className={styles.partyLabel}>Payer</span>
          <span className="font-mono">{payer.slice(0,6)}…{payer.slice(-4)}</span>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={styles.party}>
          <span className={styles.partyLabel}>Payee</span>
          <span className="font-mono">{payee.slice(0,6)}…{payee.slice(-4)}</span>
        </div>
      </div>

      <div className={styles.rowDeadline}>
        <span className={styles.partyLabel}>Deadline</span>
        <span>{formatDeadline(deadline)}</span>
      </div>

      <div className={styles.rowStatus}>
        <span className={`badge ${meta.cls}`}>
          <span className={`dot ${meta.dot}`} />
          {meta.label}
        </span>
        <span className={`badge badge-gold`}>{role}</span>
      </div>

      <div className={styles.rowArrow}>→</div>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function EscrowsPage() {
  const { isConnected, address } = useAccount();

  const { data: nextId, isLoading: loadingCount } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "nextEscrowId",
  });

  const total = nextId ? Number(nextId) : 0;
  const ids = Array.from({ length: total }, (_, i) => i).reverse(); // newest first

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className="container">
          <div className={styles.header}>
            <Link href="/" className={styles.back}>← Dashboard</Link>
            <div className={styles.headerRow}>
              <div>
                <h1 className={styles.title}>My Escrows</h1>
                <p className={styles.subtitle}>
                  All escrows where you are payer or payee — live from the contract
                </p>
              </div>
              {isConnected && (
                <Link href="/create" className="btn btn-primary">
                  ✦ New Escrow
                </Link>
              )}
            </div>
          </div>

          {!isConnected ? (
            <div className={styles.connectPrompt}>
              <div className={styles.connectIcon}>🔗</div>
              <h2>Connect Your Wallet</h2>
              <p>Connect to see escrows associated with your address.</p>
              <ConnectButton label="Connect Wallet" />
            </div>
          ) : loadingCount ? (
            <div className={styles.loading}>
              <span className="spinner" /> Loading escrows from chain…
            </div>
          ) : total === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📋</div>
              <h2>No escrows yet</h2>
              <p>Be the first! Create an escrow to start protecting your payments.</p>
              <Link href="/create" className="btn btn-primary">Create First Escrow</Link>
            </div>
          ) : (
            <>
              <div className={styles.stats}>
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {total} total escrow{total !== 1 ? "s" : ""} on contract · showing yours
                </span>
                <a
                  href={`${POLYGONSCAN}/address/${ESCROW_ADDRESS}`}
                  target="_blank" rel="noreferrer"
                  className={styles.viewContract}
                >
                  View contract ↗
                </a>
              </div>

              <div className={styles.list}>
                {ids.map(id => (
                  <EscrowRow key={id} id={id} walletAddress={address} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
