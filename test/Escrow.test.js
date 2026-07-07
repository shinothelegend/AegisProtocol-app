const { expect } = require("chai");
const { ethers } = require("hardhat");

// ─────────────────────────────────────────────────────────────────────────────
// StableEscrow UAE – Escrow.sol Test Suite
// Tests cover: create, fund, release, deadline release, access control
// ─────────────────────────────────────────────────────────────────────────────

describe("Escrow", function () {
  let escrow, mockUSDC;
  let owner, payer, payee, stranger;
  const USDC_DECIMALS = 6;
  const ONE_USDC = ethers.parseUnits("1", USDC_DECIMALS);
  const HUNDRED_USDC = ethers.parseUnits("100", USDC_DECIMALS);

  beforeEach(async function () {
    [owner, payer, payee, stranger] = await ethers.getSigners();

    // Deploy a minimal MockERC20 to stand in for USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", USDC_DECIMALS);

    // Mint tokens to payer
    await mockUSDC.mint(payer.address, HUNDRED_USDC);

    // Deploy Escrow with mock USDC address
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(await mockUSDC.getAddress());
  });

  // ── 1. Deployment ────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("Should set the correct USDC token address", async function () {
      expect(await escrow.usdcToken()).to.equal(await mockUSDC.getAddress());
    });

    it("Should set the deployer as owner", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("Should start with nextEscrowId = 0", async function () {
      expect(await escrow.nextEscrowId()).to.equal(0n);
    });
  });

  // ── 2. createEscrow ──────────────────────────────────────────────────────
  describe("createEscrow", function () {
    it("Should create an escrow and emit EscrowCreated", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400; // +1 day
      await expect(
        escrow.connect(payer).createEscrow(payee.address, ONE_USDC, deadline)
      )
        .to.emit(escrow, "EscrowCreated")
        .withArgs(0n, payer.address, payee.address, ONE_USDC);
    });

    it("Should increment nextEscrowId after each creation", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(payer).createEscrow(payee.address, ONE_USDC, deadline);
      await escrow.connect(payer).createEscrow(payee.address, ONE_USDC, deadline);
      expect(await escrow.nextEscrowId()).to.equal(2n);
    });

    it("Should store correct escrow data", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(payer).createEscrow(payee.address, ONE_USDC, deadline);
      const data = await escrow.escrows(0);
      expect(data.payer).to.equal(payer.address);
      expect(data.payee).to.equal(payee.address);
      expect(data.amount).to.equal(ONE_USDC);
      expect(data.funded).to.equal(false);
      expect(data.released).to.equal(false);
      expect(data.deadline).to.equal(BigInt(deadline));
    });
  });

  // ── 3. fundEscrow ────────────────────────────────────────────────────────
  describe("fundEscrow", function () {
    let escrowId;
    let deadline;

    beforeEach(async function () {
      deadline = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(payer).createEscrow(payee.address, ONE_USDC, deadline);
      escrowId = 0;
      // Approve escrow contract to spend payer's USDC
      await mockUSDC.connect(payer).approve(await escrow.getAddress(), ONE_USDC);
    });

    it("Should fund escrow and emit Funded event", async function () {
      await expect(escrow.connect(payer).fundEscrow(escrowId))
        .to.emit(escrow, "Funded")
        .withArgs(escrowId, ONE_USDC);
    });

    it("Should mark escrow as funded after funding", async function () {
      await escrow.connect(payer).fundEscrow(escrowId);
      const data = await escrow.escrows(escrowId);
      expect(data.funded).to.equal(true);
    });

    it("Should transfer USDC from payer to escrow contract", async function () {
      await escrow.connect(payer).fundEscrow(escrowId);
      expect(await mockUSDC.balanceOf(await escrow.getAddress())).to.equal(ONE_USDC);
      expect(await mockUSDC.balanceOf(payer.address)).to.equal(HUNDRED_USDC - ONE_USDC);
    });

    it("Should revert if already funded", async function () {
      await escrow.connect(payer).fundEscrow(escrowId);
      await mockUSDC.connect(payer).approve(await escrow.getAddress(), ONE_USDC);
      await expect(escrow.connect(payer).fundEscrow(escrowId)).to.be.revertedWith(
        "Already funded or released"
      );
    });
  });

  // ── 4. release ──────────────────────────────────────────────────────────
  describe("release", function () {
    let escrowId;

    beforeEach(async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(payer).createEscrow(payee.address, ONE_USDC, deadline);
      escrowId = 0;
      await mockUSDC.connect(payer).approve(await escrow.getAddress(), ONE_USDC);
      await escrow.connect(payer).fundEscrow(escrowId);
    });

    it("Should allow payer to release funds to payee", async function () {
      const payeeBalanceBefore = await mockUSDC.balanceOf(payee.address);
      await expect(escrow.connect(payer).release(escrowId))
        .to.emit(escrow, "Released")
        .withArgs(escrowId, payee.address, ONE_USDC);
      expect(await mockUSDC.balanceOf(payee.address)).to.equal(
        payeeBalanceBefore + ONE_USDC
      );
    });

    it("Should allow owner to release funds", async function () {
      await expect(escrow.connect(owner).release(escrowId)).to.not.be.reverted;
    });

    it("Should mark escrow as released after release", async function () {
      await escrow.connect(payer).release(escrowId);
      const data = await escrow.escrows(escrowId);
      expect(data.released).to.equal(true);
    });

    it("Should revert if stranger tries to release before deadline", async function () {
      await expect(escrow.connect(stranger).release(escrowId)).to.be.revertedWith(
        "Not authorized"
      );
    });

    it("Should revert if not funded", async function () {
      const deadline2 = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(payer).createEscrow(payee.address, ONE_USDC, deadline2);
      await expect(escrow.connect(payer).release(1)).to.be.revertedWith("Not ready");
    });

    it("Should revert if already released", async function () {
      await escrow.connect(payer).release(escrowId);
      await expect(escrow.connect(payer).release(escrowId)).to.be.revertedWith(
        "Not ready"
      );
    });
  });

  // ── 5. Deadline-based release ────────────────────────────────────────────
  describe("Deadline-based release", function () {
    it("Should allow anyone to release after deadline passes", async function () {
      // Set deadline in the past
      const pastDeadline = Math.floor(Date.now() / 1000) - 10;
      await escrow.connect(payer).createEscrow(payee.address, ONE_USDC, pastDeadline);
      await mockUSDC.connect(payer).approve(await escrow.getAddress(), ONE_USDC);
      await escrow.connect(payer).fundEscrow(0);

      // stranger can now release because block.timestamp > deadline
      await expect(escrow.connect(stranger).release(0)).to.not.be.reverted;
      expect(await mockUSDC.balanceOf(payee.address)).to.equal(ONE_USDC);
    });
  });
});
