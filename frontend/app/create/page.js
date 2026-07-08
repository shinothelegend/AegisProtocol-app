"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, isAddress } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ESCROW_ABI } from "@/lib/escrow-abi";
import { ESCROW_ADDRESS, USDC_DECIMALS, POLYGONSCAN } from "@/lib/constants";
import styles from "./create.module.css";

// ── Helpers ───────────────────────────────────────────────────
function getMinDateTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  return d.toISOString().slice(0, 16);
}

function toUnixTimestamp(localDatetime) {
  return Math.floor(new Date(localDatetime).getTime() / 1000);
}

// ── Create Escrow Page ────────────────────────────────────────
export default function CreateEscrowPage() {
  const { isConnected, address } = useAccount();

  const [form, setForm] = useState({
    payee:    "",
    amount:   "",
    deadline: "",
    memo:     "",
  });
  const [errors, setErrors] = useState({});
  const [createdId, setCreatedId] = useState(null);

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // ── Validation ──────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!isAddress(form.payee))            e.payee    = "Invalid Ethereum address";
    if (form.payee.toLowerCase() === address?.toLowerCase()) e.payee = "Payee cannot be your own address";
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = "Enter a valid USDC amount";
    if (amt > 1_000_000)                   e.amount   = "Amount too large (max 1,000,000 USDC)";
    if (!form.deadline)                    e.deadline = "Select a deadline";
    if (toUnixTimestamp(form.deadline) <= Date.now() / 1000 + 1800)
                                           e.deadline = "Deadline must be at least 30 minutes from now";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const amountWei   = parseUnits(form.amount, USDC_DECIMALS);
    const deadlineUnix = BigInt(toUnixTimestamp(form.deadline));

    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "createEscrow",
      args: [form.payee, amountWei, deadlineUnix],
    });
  }

  // ── Reset after success ─────────────────────────────────────
  function handleReset() {
    reset();
    setForm({ payee: "", amount: "", deadline: "", memo: "" });
    setErrors({});
    setCreatedId(null);
  }

  // ── Success state ────────────────────────────────────────────
  if (isSuccess) {
    return (
      <>
        <Navbar />
        <main className={styles.main}>
          <div className="container">
            <div className={styles.successBox}>
              <div className={styles.successIcon}>✅</div>
              <h1 className={styles.successTitle}>Escrow Created!</h1>
              <p className={styles.successSub}>
                Your escrow has been recorded on-chain. Share the link below with
                your buyer so they can fund it.
              </p>
              {txHash && (
                <a
                  href={`${POLYGONSCAN}/tx/${txHash}`}
                  target="_blank" rel="noreferrer"
                  className={styles.txLink}
                >
                  View Transaction on Polygonscan ↗
                </a>
              )}
              <div className={styles.successActions}>
                <Link href="/escrows" className="btn btn-primary">View My Escrows</Link>
                <button onClick={handleReset} className="btn btn-secondary">Create Another</button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className="container">
          <div className={styles.header}>
            <Link href="/" className={styles.back}>← Dashboard</Link>
            <h1 className={styles.title}>Create New Escrow</h1>
            <p className={styles.subtitle}>
              Invoice your buyer on-chain. Funds are locked in the smart contract
              until you confirm delivery.
            </p>
          </div>

          <div className={styles.layout}>
            {/* ── Form ────────────────────────────────────── */}
            <div className={`${styles.formCard} glass-card`}>
              {!isConnected ? (
                <div className={styles.connectPrompt}>
                  <div className={styles.connectIcon}>🔗</div>
                  <h2>Connect Your Wallet</h2>
                  <p>Connect your wallet to create an escrow invoice.</p>
                  <ConnectButton label="Connect Wallet" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                  <h2 className={styles.formTitle}>Escrow Details</h2>

                  {/* Payee */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="payee">
                      Payee (Buyer) Address *
                    </label>
                    <input
                      id="payee"
                      type="text"
                      className="form-input"
                      placeholder="0x..."
                      value={form.payee}
                      onChange={e => setForm(f => ({ ...f, payee: e.target.value.trim() }))}
                    />
                    {errors.payee && <span className="form-error">{errors.payee}</span>}
                    <span className="form-hint">The buyer's wallet address — they will fund this escrow</span>
                    
                    {/* Live Merchant Reputation Preview */}
                    {isAddress(form.payee) && (
                      <MerchantReputationPreview address={form.payee} />
                    )}
                  </div>

                  {/* Amount */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="amount">USDC Amount *</label>
                    <div className={styles.amountWrap}>
                      <input
                        id="amount"
                        type="number"
                        min="0.000001"
                        step="0.000001"
                        className={`form-input ${styles.amountInput}`}
                        placeholder="e.g. 500"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      />
                      <div className={styles.amountBadge}>USDC</div>
                    </div>
                    {errors.amount && <span className="form-error">{errors.amount}</span>}
                    <span className="form-hint">Amount in USD Coin (6 decimal places)</span>
                  </div>

                  {/* Deadline */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="deadline">Payment Deadline *</label>
                    <input
                      id="deadline"
                      type="datetime-local"
                      className="form-input"
                      min={getMinDateTime()}
                      value={form.deadline}
                      onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    />
                    {errors.deadline && <span className="form-error">{errors.deadline}</span>}
                    <span className="form-hint">After this deadline, funds auto-release to you</span>
                  </div>

                  {/* Memo (off-chain) */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="memo">Invoice Reference <span style={{color:'var(--text-muted)'}}>optional</span></label>
                    <input
                      id="memo"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Invoice #UAE-2026-001"
                      value={form.memo}
                      onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                    />
                    <span className="form-hint">For your records only — not stored on-chain</span>
                  </div>

                  <hr className="divider" />

                  {/* Summary row */}
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>Your address (payer)</span>
                      <span className="font-mono text-blue">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Contract</span>
                      <a href={`${POLYGONSCAN}/address/${ESCROW_ADDRESS}`} target="_blank" rel="noreferrer" className="font-mono text-gold">
                        {ESCROW_ADDRESS?.slice(0,6)}…{ESCROW_ADDRESS?.slice(-4)} ↗
                      </a>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Network</span>
                      <span className="badge badge-gold">Polygon Amoy</span>
                    </div>
                  </div>

                  {/* TX pending alert */}
                  {isPending && (
                    <div className="alert alert-info">
                      <span className="spinner" /> Confirm the transaction in your wallet…
                    </div>
                  )}
                  {isConfirming && (
                    <div className="alert alert-warning">
                      <span className="spinner" /> Waiting for blockchain confirmation…
                    </div>
                  )}

                  <button
                    type="submit"
                    id="create-escrow-btn"
                    className="btn btn-primary btn-full btn-lg"
                    disabled={isPending || isConfirming}
                  >
                    {isPending || isConfirming
                      ? <><span className="spinner" /> Processing…</>
                      : "✦ Create Escrow on Chain"}
                  </button>
                </form>
              )}
            </div>

            {/* ── Info sidebar ─────────────────────────────── */}
            <div className={styles.sidebar}>
              <div className={`${styles.infoCard} glass-card`}>
                <h3 className={styles.infoTitle}>💡 What happens next?</h3>
                <ol className={styles.infoList}>
                  <li>You create the escrow — your wallet pays gas only</li>
                  <li>Share the escrow ID with your buyer</li>
                  <li>Buyer approves USDC spend & funds the escrow</li>
                  <li>You confirm receipt → funds release to you</li>
                  <li>Or deadline passes → automatic release</li>
                </ol>
              </div>

              <div className={`${styles.infoCard} glass-card`}>
                <h3 className={styles.infoTitle}>🔒 Security</h3>
                <ul className={styles.infoList}>
                  <li>Funds held by smart contract — not you or us</li>
                  <li>Only you (payer) or the contract owner can release</li>
                  <li>Deadline acts as automatic release fallback</li>
                  <li>All events verifiable on Polygonscan</li>
                </ul>
              </div>

              <div className={`${styles.infoCard} glass-card`}>
                <h3 className={styles.infoTitle}>⚙️ Contract Info</h3>
                <div className={styles.contractInfo}>
                  <div className={styles.cRow}>
                    <span>Address</span>
                    <a href={`${POLYGONSCAN}/address/${ESCROW_ADDRESS}`} target="_blank" rel="noreferrer" className="font-mono text-gold" style={{fontSize:'0.78rem'}}>
                      {ESCROW_ADDRESS?.slice(0,10)}… ↗
                    </a>
                  </div>
                  <div className={styles.cRow}>
                    <span>Network</span>
                    <span className="text-blue" style={{fontSize:'0.85rem'}}>Polygon Amoy</span>
                  </div>
                  <div className={styles.cRow}>
                    <span>Token</span>
                    <span style={{fontSize:'0.85rem'}}>USDC (6 dec)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
}

// ── Merchant Reputation Preview ───────────────────────────────
function MerchantReputationPreview({ address }) {
  const { data: stats } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getMerchantStats",
    args: [address],
    enabled: isAddress(address),
  });

  if (!stats) return <div style={{marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)'}}>Loading reputation...</div>;

  const [successful, total, score] = stats;
  const numTotal = Number(total);
  const numScore = Number(score);

  if (numTotal === 0) {
    return (
      <div className="font-label-caps text-outline border border-outline-variant px-3 py-1 rounded-full uppercase inline-block" style={{marginTop: '12px', display: 'inline-block', width: 'fit-content'}}>
        New Merchant • Unrated (Score: 0)
      </div>
    );
  }

  let badgeClass = "";
  let badgeText = "";
  if (numScore >= 70) {
    badgeClass = "bg-brand-light-10 text-brand-light border-brand-light-40 shadow-gold-badge";
    badgeText = "Gold Badge";
  } else if (numScore >= 40) {
    badgeClass = "bg-brand-blue-10 text-brand-blue border-brand-blue-40";
    badgeText = "Silver Badge";
  } else {
    badgeClass = "bg-amber-700-10 text-amber-400 border-amber-600-40";
    badgeText = "Bronze Badge";
  }

  let scoreColor = "text-red-400";
  if (numScore >= 70) scoreColor = "text-emerald-400";
  else if (numScore >= 40) scoreColor = "text-amber-300";

  return (
    <div className="glass-panel" style={{marginTop: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div>
        <div className="font-label-caps text-on-surface-variant" style={{marginBottom: '4px'}}>Live Trust Score</div>
        <div className={`font-headline-xl text-glow ${scoreColor}`} style={{lineHeight: 1}}>{numScore}</div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px'}}>
        <span className={`font-label-caps px-3 py-1 rounded-full uppercase border ${badgeClass}`}>
          {badgeText}
        </span>
        <div className="text-on-surface-variant font-body-md" style={{fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px'}}>
          Successful Releases: {Number(successful)} <br/> Total Escrows Received: {numTotal}
        </div>
      </div>
    </div>
  );
}
