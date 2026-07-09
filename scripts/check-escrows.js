const { ethers } = require("hardhat");

async function main() {
  const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS || "0x05c9130BBd5fa0D04255E2265b5a317929bA24e2";
  
  console.log(`Connecting to Escrow contract at ${ESCROW_ADDRESS} on Amoy...`);
  
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = Escrow.attach(ESCROW_ADDRESS);

  const nextId = await escrow.nextEscrowId();
  console.log(`\nTotal Escrows Created: ${nextId.toString()}`);

  if (nextId > 0n) {
    const latestId = nextId - 1n;
    console.log(`\nFetching details for the latest escrow (ID: ${latestId.toString()})...`);
    
    const data = await escrow.escrows(latestId);
    console.log(`
      Payer:    ${data.payer}
      Payee:    ${data.payee}
      Amount:   ${ethers.formatUnits(data.amount, 6)} USDC
      Funded:   ${data.funded}
      Released: ${data.released}
      Deadline: ${new Date(Number(data.deadline) * 1000).toLocaleString()}
    `);
  } else {
    console.log("\nNo escrows have been created on-chain yet.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
