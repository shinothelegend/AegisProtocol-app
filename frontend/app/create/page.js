"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, isAddress, decodeEventLog } from "viem";
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
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const { writeContract, data: txHash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt, error: confirmError } = useWaitForTransactionReceipt({ hash: txHash });

  // Extract Escrow ID from logs when successful
  useEffect(() => {
    if (isSuccess && receipt && !createdId) {
      try {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: ESCROW_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === 'EscrowCreated') {
              // eslint-disable-next-line react-hooks/set-state-in-effect
              setCreatedId(decoded.args.id.toString());
              break;
            }
          } catch (e) {
            // Not the target event
          }
        }
      } catch (err) {
        console.error("Error parsing logs", err);
      }
    }
  }, [isSuccess, receipt, createdId]);

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
    const mailSubject = encodeURIComponent(`Escrow Invoice from ${address}`);
    const mailBody = encodeURIComponent(`Hello,\n\nAn escrow invoice has been created for you.\nEscrow ID: ${createdId}\nAmount: ${form.amount} USDC\nDeadline: ${new Date(form.deadline).toLocaleString()}\n\nPlease connect your wallet, approve the USDC spend, and fund this escrow using the Escrow ID above.\n\nTransaction Hash: ${txHash}`);

    return (
      <>
        <Navbar />
        <main className={styles.main}>
          <div className="container">
            <div className={styles.successBox} style={{ maxWidth: '600px' }}>
              <div className={styles.successIcon}>✅</div>
              <h1 className={styles.successTitle}>Escrow Created!</h1>
              <p className={styles.successSub}>
                Your escrow has been recorded on-chain. Share the details below with
                your buyer so they can fund it.
              </p>
              
              <div className="glass-panel" style={{ textAlign: 'left', padding: '24px', margin: '24px 0', width: '100%' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Escrow ID</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" readOnly value={createdId || "Extracting from blockchain..."} className="form-input font-mono text-gold" style={{ fontSize: '1.2rem', fontWeight: 'bold' }} />
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        if (createdId) {
                          navigator.clipboard.writeText(createdId);
                          alert("Escrow ID copied!");
                        }
                      }}
                      disabled={!createdId}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label text-on-surface-variant">Buyer Address</label>
                    <div className="font-mono" style={{ fontSize: '0.9rem' }}>{form.payee.slice(0,6)}…{form.payee.slice(-4)}</div>
                  </div>
                  <div>
                    <label className="form-label text-on-surface-variant">Amount</label>
                    <div style={{ fontSize: '0.9rem' }}><strong>{form.amount} USDC</strong></div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label text-on-surface-variant">Deadline</label>
                    <div style={{ fontSize: '0.9rem' }}>{new Date(form.deadline).toLocaleString()}</div>
                  </div>
                </div>

                {txHash && (
                  <a
                    href={`${POLYGONSCAN}/tx/${txHash}`}
                    target="_blank" rel="noreferrer"
                    className={styles.txLink}
                    style={{ display: 'inline-block', marginTop: '8px', width: '100%', textAlign: 'center' }}
                  >
                    View Transaction on Polygonscan ↗
                  </a>
                )}
              </div>

              <div className={styles.successActions} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <a 
                  href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
                  className="btn btn-primary btn-full btn-lg"
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  ✉️ Share Invoice via Email
                </a>
                
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <Link href="/escrows" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                    View My Escrows
                  </Link>
                  <button onClick={handleReset} className="btn btn-secondary" style={{ flex: 1 }}>
                    Create Another
                  </button>
                </div>
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
              {!mounted ? (
                <div className={styles.connectPrompt} style={{ minHeight: '300px', justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span>
                </div>
              ) : !isConnected ? (
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
                    <span className="form-hint">The buyer&apos;s wallet address — they will fund this escrow</span>
                    
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
                  {writeError && (
                    <div className="alert alert-error" style={{ color: 'red', marginBottom: '10px' }}>
                      Error: {writeError.shortMessage || writeError.message}
                    </div>
                  )}
                  {confirmError && (
                    <div className="alert alert-error" style={{ color: 'red', marginBottom: '10px' }}>
                      Confirmation Error: {confirmError.shortMessage || confirmError.message}
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
  );
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
