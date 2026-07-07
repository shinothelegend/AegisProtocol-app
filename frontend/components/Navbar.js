"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const path = usePathname();
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>
            Aegis<span className={styles.logoAccent}>Protocol</span>
            <span className={styles.logoBadge}>UAE</span>
          </span>
        </Link>

        {/* Links */}
        <div className={styles.links}>
          <Link href="/"       className={`${styles.link} ${path === "/"       ? styles.active : ""}`}>Dashboard</Link>
          <Link href="/create" className={`${styles.link} ${path === "/create" ? styles.active : ""}`}>New Escrow</Link>
          <Link href="/escrows" className={`${styles.link} ${path === "/escrows"? styles.active : ""}`}>My Escrows</Link>
          <a
            href={`https://amoy.polygonscan.com/address/${process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "0x05c9130BBd5fa0D04255E2265b5a317929bA24e2"}`}
            target="_blank" rel="noreferrer"
            className={styles.link}
          >
            Contract ↗
          </a>
        </div>

        {/* Wallet */}
        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="avatar"
        />
      </div>
    </nav>
  );
}
