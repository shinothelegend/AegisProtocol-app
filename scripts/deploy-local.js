const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Local USDC", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Local USDC deployed to:", usdcAddress);

  // Mint some to deployer for testing
  await usdc.mint(deployer.address, ethers.parseUnits("100000", 6));

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(usdcAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  
  console.log("Escrow deployed to:", escrowAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
