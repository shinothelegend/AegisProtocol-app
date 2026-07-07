"use client";

import { use, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ESCROW_ABI, ERC20_ABI } from "@/lib/escrow-abi";
import { ESCROW_ADDRESS, USDC_ADDRESS, USDC_DECIMALS, POLYGONSCAN } from "@/lib/constants";
import styles from "./detail.module.css";

// ── Helpers ───────────────────────────────────────────────────
function formatUsdc(amount) {
  if (amount === undefined || amount === null) return "…";
  const num = Number(BigInt(amount)) / 10 ** USDC_DECIMALS;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}
function formatDate(unix) {
  if (!unix) return "—";
  return new Date(Number(unix) * 1000).toLocaleString("en-AE", { dateStyle: "full", timeStyle: "short" });
}
function isExpired(deadline) {
  return deadline && Date.now() / 1000 > Number(deadline);
}

// ── Status helpers ────────────────────────────────────────────
function getStatus(funded, released, deadline) {
  if (released) return { key: "released", label: "Released",     cls: "badge-released", color: "var(--success)" };
  if (funded)   return { key: "funded",   label: "Funded",       cls: "badge-funded",   color: "var(--blue)"    };
  if (isExpired(deadline)) return { key: "expired", label: "Expired", cls: "badge-expired", color: "var(--danger)"  };
  return           { key: "pending",  label: "Pending",      cls: "badge-pending",  color: "var(--warning)" };
}

// ── Escrow Detail Page ────────────────────────────────────────
export default function EscrowDetailPage({ params }) {
  const { id } = use(params);
  const { address, isConnected } = useAccount();

  // Read escrow data
  const { data: escrowData, isLoading, refetch } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "escrows",
    args: [BigInt(id)],
    watch: true,
  });

  // Read USDC allowance (for fund step)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address, ESCROW_ADDRESS],
    enabled: !!address,
  });

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address,
  });

  // Write actions
  const { writeContract, data: txHash, isPending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    onSuccess: () => { refetch(); refetchAllowance(); },
  });

  const [action, setAction] = useState(null); // "approve" | "fund" | "release"

  if (!escrowData && isLoading) {
    return (
      <>
        <Navbar />
        <main className={styles.main}>
          <div className="container">
            <div className={styles.loading}><span className="spinner" /> Loading escrow from chain…</div>
          </div>
        </main>
      </>
    );
  }

  if (!escrowData) {
    return (
      <>
        <Navbar />
        <main className={styles.main}>
          <div className="container">
            <div className={styles.notFound}>
              <div style={{ fontSize: "3rem" }}>🔍</div>
              <h1>Escrow #{id} not found</h1>
              <Link href="/escrows" className="btn btn-secondary">← Back to Escrows</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const [payer, payee, amount, funded, released, deadline] = escrowData;
  const status = getStatus(funded, released, deadline);

  const walletLower = address?.toLowerCase();
  const isPayer     = payer.toLowerCase()  === walletLower;
  const isPayee     = payee.toLowerCase()  === walletLower;

  const needsApproval = allowance !== undefined && BigInt(allowance) < BigInt(amount);
  const canFund       = !funded && !released && isConnected;
  const canRelease    = funded && !released && (isPayer || isExpired(deadline));

  // ── Handlers ─────────────────────────────────────────────────
  function handleApprove() {
    setAction("approve");
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, BigInt(amount)],
    });
  }
  function handleFund() {
    setAction("fund");
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "fundEscrow",
      args: [BigInt(id)],
    });
  }
  function handleRelease() {
    setAction("release");
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "release",
      args: [BigInt(id)],
    });
  }

  const isBusy = isPending || isConfirming;

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className="container">
          <Link href="/escrows" className={styles.back}>← My Escrows</Link>

          <div className={styles.layout}>
            {/* ── Main card ────────────────────────────── */}
            <div className={`${styles.mainCard} glass-card`}>
              {/* Header */}
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.escrowId}>Escrow #{id}</div>
                  <div className={styles.escrowAmt}>
                    {formatUsdc(amount)} <span className={styles.amtUnit}>USDC</span>
                  </div>
                </div>
                <span className={`badge ${status.cls}`} style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
                  {status.label}
                </span>
              </div>

              <hr className="divider" />

              {/* Details grid */}
              <div className={styles.detailsGrid}>
                <DetailRow label="Payer (Merchant)" value={payer} isAddr />
                <DetailRow label="Payee (Buyer)"    value={payee} isAddr />
                <DetailRow label="USDC Amount"      value={`${formatUsdc(amount)} USDC`} />
                <DetailRow label="Deadline"         value={formatDate(deadline)} />
                <DetailRow label="Funded"           value={funded   ? "✅ Yes" : "⏳ No"} />
                <DetailRow label="Released"         value={released ? "✅ Yes" : "❌ No"} />
                <DetailRow
                  label="Your Role"
                  value={isPayer ? "Merchant (Payer)" : isPayee ? "Buyer (Payee)" : "Observer"}
                />
              </div>

              <hr className="divider" />

              {/* ── Actions ──────────────────────────────── */}
              {!isConnected ? (
                <div className={styles.connectWrap}>
                  <ConnectButton label="Connect to Interact" />
                </div>
              ) : released ? (
                <div className="alert alert-success">
                  ✅ This escrow has been fully settled. Funds released to payee.
                </div>
              ) : (
                <div className={styles.actions}>
                  <h3 className={styles.actionsTitle}>Available Actions</h3>

                  {/* Fund flow */}
                  {canFund && (
                    <div className={`${styles.actionCard} glass-card`}>
                      <div className={styles.actionIcon}>💰</div>
                      <div className={styles.actionBody}>
                        <div className={styles.actionName}>Fund Escrow</div>
                        <div className={styles.actionDesc}>
                          Lock {formatUsdc(amount)} USDC in the contract.
                          {usdcBalance !== undefined && (
                            <span className="text-muted"> (Your balance: {formatUsdc(usdcBalance)} USDC)</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.actionBtns}>
                        {needsApproval ? (
                          <button
                            id="approve-btn"
                            className="btn btn-secondary"
                            onClick={handleApprove}
                            disabled={isBusy}
                          >
                            {isBusy && action === "approve" ? <><span className="spinner" /> Approving…</> : "1. Approve USDC"}
                          </button>
                        ) : null}
                        <button
                          id="fund-btn"
                          className="btn btn-blue"
                          onClick={handleFund}
                          disabled={isBusy || needsApproval}
                        >
                          {isBusy && action === "fund" ? <><span className="spinner" /> Funding…</> : needsApproval ? "2. Fund Escrow" : "Fund Escrow"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Release flow */}
                  {canRelease && (
                    <div className={`${styles.actionCard} glass-card`}>
                      <div className={styles.actionIcon}>✅</div>
                      <div className={styles.actionBody}>
                        <div className={styles.actionName}>Release Funds</div>
                        <div className={styles.actionDesc}>
                          {isExpired(deadline) && !isPayer
                            ? "Deadline has passed — anyone can release now."
                            : "Confirm delivery to release USDC to the payee."}
                        </div>
                      </div>
                      <button
                        id="release-btn"
                        className="btn btn-success"
                        onClick={handleRelease}
                        disabled={isBusy}
                      >
                        {isBusy && action === "release" ? <><span className="spinner" /> Releasing…</> : "Release Funds →"}
                      </button>
                    </div>
                  )}

                  {/* Waiting state for buyer */}
                  {!canFund && !canRelease && !released && (
                    <div className="alert alert-warning">
                      ⏳ Waiting for the buyer to fund this escrow.
                    </div>
                  )}

                  {/* TX alerts */}
                  {isPending   && <div className="alert alert-info"><span className="spinner" /> Confirm in your wallet…</div>}
                  {isConfirming&& <div className="alert alert-warning"><span className="spinner" /> Waiting for confirmation…</div>}
                  {isSuccess   && (
                    <div className="alert alert-success">
                      ✅ Transaction confirmed!{" "}
                      {txHash && <a href={`${POLYGONSCAN}/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-blue">View on Polygonscan ↗</a>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Sidebar ──────────────────────────────── */}
            <div className={styles.sidebar}>
              <div className={`${styles.sideCard} glass-card`}>
                <h3 className={styles.sideTitle}>🔗 On-chain Links</h3>
                <div className={styles.sideLinks}>
                  <a href={`${POLYGONSCAN}/address/${ESCROW_ADDRESS}`} target="_blank" rel="noreferrer" className={styles.sideLink}>
                    Contract on Polygonscan ↗
                  </a>
                  <a href={`${POLYGONSCAN}/address/${USDC_ADDRESS}`} target="_blank" rel="noreferrer" className={styles.sideLink}>
                    USDC Token ↗
                  </a>
                  {txHash && (
                    <a href={`${POLYGONSCAN}/tx/${txHash}`} target="_blank" rel="noreferrer" className={styles.sideLink}>
                      Latest TX ↗
                    </a>
                  )}
                </div>
              </div>

              <div className={`${styles.sideCard} glass-card`}>
                <h3 className={styles.sideTitle}>ℹ️ Escrow Flow</h3>
                <div className={styles.flow}>
                  {[
                    { step:"Create",  done: true   },
                    { step:"Fund",    done: funded  },
                    { step:"Release", done: released},
                  ].map((s, i) => (
                    <div key={i} className={styles.flowStep}>
                      <span className={`${styles.flowDot} ${s.done ? styles.flowDone : styles.flowTodo}`} />
                      <span className={s.done ? styles.flowLabelDone : styles.flowLabelTodo}>{s.step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${styles.sideCard} glass-card`}>
                <h3 className={styles.sideTitle}>📋 Copy Escrow ID</h3>
                <button
                  className={`btn btn-secondary btn-full btn-sm`}
                  onClick={() => navigator.clipboard.writeText(String(id))}
                >
                  Copy Escrow #{id}
                </button>
                <p className={styles.sideHint}>Share with your buyer so they can fund it</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function DetailRow({ label, value, isAddr }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={`${styles.detailValue} ${isAddr ? "font-mono" : ""}`}>
        {isAddr && value ? `${value.slice(0,10)}…${value.slice(-6)}` : value}
      </span>
    </div>
  );
}
