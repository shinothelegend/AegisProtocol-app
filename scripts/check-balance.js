// scripts/check-balance.js
// ─────────────────────────────────────────────────────────────────────────────
// Run before deploying to confirm your wallet is funded:
//   npx hardhat run scripts/check-balance.js --network amoy
// ─────────────────────────────────────────────────────────────────────────────

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();

  console.log("\n================================================");
  console.log("  Wallet Balance Check");
  console.log("================================================");
  console.log(`  Network   : ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Address   : ${deployer.address}`);
  console.log(`  Balance   : ${ethers.formatEther(balance)} MATIC`);
  console.log("================================================");

  if (balance < ethers.parseEther("0.1")) {
    console.log("\n⚠️  LOW BALANCE! Get testnet MATIC from:");
    console.log("   👉 https://faucet.polygon.technology/");
    console.log("   👉 https://www.alchemy.com/faucets/polygon-amoy\n");
  } else {
    console.log("\n✅ Balance sufficient for deployment!\n");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
