const { ethers } = require("hardhat");

async function main() {
  const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  const AMOUNT_TO_MINT = ethers.parseUnits("1000", 6); // 1,000 USDC

  // The address to fund (pass as an argument or change here)
  const targetAddress = process.env.WALLET_ADDRESS || "REPLACE_WITH_WALLET_ADDRESS";

  if (targetAddress === "REPLACE_WITH_WALLET_ADDRESS") {
    console.error("Please provide a wallet address! Example: WALLET_ADDRESS=0x... npx hardhat run scripts/mint-usdc.js --network amoy");
    process.exit(1);
  }

  console.log(`Minting 1,000 Mock USDC to ${targetAddress}...`);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = MockERC20.attach(USDC_ADDRESS);

  const tx = await usdc.mint(targetAddress, AMOUNT_TO_MINT);
  console.log(`Transaction sent! Hash: ${tx.hash}`);
  
  await tx.wait();
  console.log("✅ Successfully funded wallet with 1,000 Mock USDC!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
