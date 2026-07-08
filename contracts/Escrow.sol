// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Escrow is Ownable {
    IERC20 public usdcToken;

    struct EscrowData {
        address payer;
        address payee;
        uint256 amount;
        bool funded;
        bool released;
        uint256 deadline;
    }

    mapping(uint256 => EscrowData) public escrows;
    uint256 public nextEscrowId;

    mapping(address => uint256) public successfulReleases;
    mapping(address => uint256) public totalEscrowsReceived;

    event EscrowCreated(uint256 indexed id, address payer, address payee, uint256 amount);
    event Funded(uint256 indexed id, uint256 amount);
    event Released(uint256 indexed id, address to, uint256 amount);

    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
    }

    function createEscrow(address _payee, uint256 _amount, uint256 _deadline) external returns (uint256) {
        uint256 id = nextEscrowId++;
        escrows[id] = EscrowData({
            payer: msg.sender,
            payee: _payee,
            amount: _amount,
            funded: false,
            released: false,
            deadline: _deadline
        });
        totalEscrowsReceived[_payee]++;
        emit EscrowCreated(id, msg.sender, _payee, _amount);
        return id;
    }

    function fundEscrow(uint256 _id) external {
        EscrowData storage e = escrows[_id];
        require(!e.funded && !e.released, "Already funded or released");
        require(usdcToken.transferFrom(msg.sender, address(this), e.amount), "Transfer failed");
        e.funded = true;
        emit Funded(_id, e.amount);
    }

    function release(uint256 _id) external {
        EscrowData storage e = escrows[_id];
        require(e.funded && !e.released, "Not ready");
        require(msg.sender == e.payer || msg.sender == owner() || block.timestamp > e.deadline, "Not authorized");
        e.released = true;
        successfulReleases[e.payee]++;
        require(usdcToken.transfer(e.payee, e.amount), "Release failed");
        emit Released(_id, e.payee, e.amount);
    }

    function getTrustScore(address _merchant) public view returns (uint256) {
        uint256 baseScore = successfulReleases[_merchant] * 8;
        uint256 bonus = totalEscrowsReceived[_merchant] >= 5 ? 20 : 0;
        uint256 totalScore = baseScore + bonus;
        return totalScore > 100 ? 100 : totalScore;
    }

    function getMerchantStats(address _merchant) external view returns (uint256 successfulReleases, uint256 totalEscrowsReceived, uint256 trustScore) {
        return (this.successfulReleases(_merchant), this.totalEscrowsReceived(_merchant), getTrustScore(_merchant));
    }
}
