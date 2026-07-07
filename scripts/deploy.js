// scripts/deploy.js
// ─────────────────────────────────────────────────────────────────────────────
// Aegis Protocol – Deployment Script
// Deploys Escrow.sol to Polygon Amoy testnet (or local Hardhat network)
//
// Usage:
//   Local:  npx hardhat run scripts/deploy.js
//   Amoy:   npx hardhat run scripts/deploy.js --network amoy
//
// Required env vars for Amoy deployment:
//   PRIVATE_KEY  – deployer wallet private key (no 0x prefix needed)
//   USDC_ADDRESS – USDC token contract address on target network
// ─────────────────────────────────────────────────────────────────────────────

const { ethers } = require("hardhat");

// ── Polygon Amoy Testnet USDC (circle-issued mock / faucet USDC) ──────────
// Replace with the real address from your faucet or testnet USDC deployment
const AMOY_USDC_ADDRESS = process.env.USDC_ADDRESS || "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n================================================");
  console.log("  Aegis Protocol – Deployment");
  console.log("================================================");
  console.log(`  Deployer address : ${deployer.address}`);
  console.log(`  USDC address     : ${AMOY_USDC_ADDRESS}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Deployer balance : ${ethers.formatEther(balance)} MATIC`);
  console.log("------------------------------------------------\n");

  if (balance === 0n) {
    console.error("❌ Deployer wallet has zero balance. Get testnet MATIC from:");
    console.error("   https://faucet.polygon.technology/");
    process.exit(1);
  }

  console.log("⏳ Deploying Escrow contract...");
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(AMOY_USDC_ADDRESS);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();

  console.log("\n✅ Escrow deployed successfully!");
  console.log("================================================");
  console.log(`  Contract address : ${escrowAddress}`);
  console.log(`  Network          : ${hre.network.name}`);
  console.log(`  USDC token       : ${AMOY_USDC_ADDRESS}`);
  console.log("================================================");
  console.log("\n📋 Save this for your .env and frontend:");
  console.log(`  NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);
  console.log(`  NEXT_PUBLIC_USDC_ADDRESS=${AMOY_USDC_ADDRESS}`);
  console.log("\n🔍 Verify on Polygonscan (Amoy):");
  console.log(`  https://amoy.polygonscan.com/address/${escrowAddress}`);
  console.log("\n💡 To verify source code on Polygonscan, run:");
  console.log(`  npx hardhat verify --network amoy ${escrowAddress} "${AMOY_USDC_ADDRESS}"\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
