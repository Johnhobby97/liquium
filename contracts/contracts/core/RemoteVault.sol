// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DealPosition.sol";

/**
 * @title RemoteVault
 * @notice Vault deployed on remote chains (Base, Arbitrum, etc.) for LP deposits
 * @dev Manages liquidity on remote chains and coordinates with hub on Flare
 * 
 * Architecture:
 * - LPs deposit on remote chain (e.g., Base)
 * - RemoteVault holds funds locally
 * - Cross-chain messages notify Flare hub (future: LayerZero)
 * - Settlements return from hub to release funds
 * 
 * Current: Standalone mode (no cross-chain messaging)
 * Future: LayerZero integration for hub communication
 */
contract RemoteVault is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Position NFT contract
    DealPosition public immutable positionNFT;

    /// @notice Hub chain ID (e.g., Flare)
    uint256 public immutable hubChainId;

    /// @notice Hub vault address on main chain
    address public hubVaultAddress;

    /// @notice Remote deposit data
    struct RemoteDeposit {
        uint256 positionId;       // Local position NFT ID
        address depositor;        // LP address
        address token;            // Deposited token
        uint256 amount;           // Deposit amount
        uint256 timestamp;        // Deposit time
        uint256 hubPositionId;    // Position ID on hub (0 if pending)
        DepositStatus status;     // Current status
    }

    /// @notice Deposit status
    enum DepositStatus {
        Pending,        // Deposited, not yet sent to hub
        Sent,           // Message sent to hub
        Confirmed,      // Hub confirmed receipt
        Settled,        // Deal settled, ready to withdraw
        Withdrawn       // LP has withdrawn
    }

    /// @notice Mapping from local position ID to deposit data
    mapping(uint256 => RemoteDeposit) public deposits;

    /// @notice Counter for position IDs
    uint256 private _nextPositionId;

    /// @notice Protocol fee in basis points (100 = 1%)
    uint256 public protocolFeeBps = 100;

    /// @notice Fee recipient
    address public feeRecipient;

    /// @notice Cross-chain messenger (placeholder for LayerZero)
    address public messenger;

    /// @notice Events
    event RemoteDeposited(
        uint256 indexed positionId,
        address indexed depositor,
        address token,
        uint256 amount
    );
    event DepositSentToHub(
        uint256 indexed positionId,
        uint256 hubChainId,
        bytes32 messageId
    );
    event DepositConfirmed(
        uint256 indexed positionId,
        uint256 hubPositionId
    );
    event SettlementReceived(
        uint256 indexed positionId,
        uint256 principal,
        uint256 yield
    );
    event RemoteWithdrawn(
        uint256 indexed positionId,
        address indexed recipient,
        uint256 amount
    );
    event HubVaultUpdated(address indexed newHub);
    event MessengerUpdated(address indexed newMessenger);

    /// @notice Custom errors
    error InvalidAmount();
    error InvalidToken();
    error InvalidStatus();
    error PositionNotFound();
    error UnauthorizedWithdrawal();
    error HubNotConfigured();
    error MessengerNotConfigured();

    /**
     * @notice Constructor
     * @param initialOwner Address that will own the contract
     * @param _positionNFT Position NFT contract address
     * @param _hubChainId Hub chain ID (e.g., Flare = 114)
     * @param _feeRecipient Fee recipient address
     */
    constructor(
        address initialOwner,
        address _positionNFT,
        uint256 _hubChainId,
        address _feeRecipient
    ) Ownable(initialOwner) {
        positionNFT = DealPosition(_positionNFT);
        hubChainId = _hubChainId;
        feeRecipient = _feeRecipient;
        _nextPositionId = 1;
    }

    /**
     * @notice Deposit tokens into remote vault
     * @param token Token address to deposit
     * @param amount Amount to deposit
     * @return positionId Local position NFT ID
     */
    function deposit(
        address token,
        uint256 amount
    ) external nonReentrant returns (uint256 positionId) {
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();

        // Transfer tokens to vault
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Mint position NFT
        positionId = positionNFT.mint(msg.sender, 0, amount); // dealId = 0 for remote
        
        // Record deposit
        deposits[positionId] = RemoteDeposit({
            positionId: positionId,
            depositor: msg.sender,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            hubPositionId: 0,
            status: DepositStatus.Pending
        });

        emit RemoteDeposited(positionId, msg.sender, token, amount);

        // Auto-send to hub if configured
        if (hubVaultAddress != address(0) && messenger != address(0)) {
            _sendToHub(positionId);
        }
    }

    /**
     * @notice Send deposit to hub (manual or auto)
     * @param positionId Position ID to send
     * @dev In future, this will use LayerZero to message hub
     */
    function sendToHub(uint256 positionId) external onlyOwner {
        _sendToHub(positionId);
    }

    /**
     * @notice Internal function to send deposit to hub
     * @param positionId Position ID to send
     */
    function _sendToHub(uint256 positionId) internal {
        RemoteDeposit storage dep = deposits[positionId];
        
        if (dep.status != DepositStatus.Pending) revert InvalidStatus();
        if (hubVaultAddress == address(0)) revert HubNotConfigured();

        // Update status
        dep.status = DepositStatus.Sent;

        // TODO: LayerZero message to hub
        // For now, just emit event
        bytes32 messageId = keccak256(
            abi.encodePacked(positionId, block.timestamp)
        );

        emit DepositSentToHub(positionId, hubChainId, messageId);
    }

    /**
     * @notice Confirm deposit receipt from hub (called by messenger)
     * @param positionId Local position ID
     * @param hubPositionId Position ID on hub chain
     */
    function confirmDeposit(
        uint256 positionId,
        uint256 hubPositionId
    ) external {
        require(msg.sender == messenger || msg.sender == owner(), "Not authorized");
        
        RemoteDeposit storage dep = deposits[positionId];
        if (dep.status != DepositStatus.Sent) revert InvalidStatus();

        dep.hubPositionId = hubPositionId;
        dep.status = DepositStatus.Confirmed;

        emit DepositConfirmed(positionId, hubPositionId);
    }

    /**
     * @notice Receive settlement from hub (called by messenger)
     * @param positionId Local position ID
     * @param principal Principal amount
     * @param yieldAmount Yield amount
     */
    function receiveSettlement(
        uint256 positionId,
        uint256 principal,
        uint256 yieldAmount
    ) external {
        require(msg.sender == messenger || msg.sender == owner(), "Not authorized");
        
        RemoteDeposit storage dep = deposits[positionId];
        if (dep.status != DepositStatus.Confirmed) revert InvalidStatus();

        dep.status = DepositStatus.Settled;

        emit SettlementReceived(positionId, principal, yieldAmount);
    }

    /**
     * @notice Withdraw from settled position
     * @param positionId Position ID to withdraw
     */
    function withdraw(uint256 positionId) external nonReentrant {
        // Verify ownership
        if (positionNFT.ownerOf(positionId) != msg.sender) {
            revert UnauthorizedWithdrawal();
        }

        RemoteDeposit storage dep = deposits[positionId];
        
        if (dep.status != DepositStatus.Settled) revert InvalidStatus();
        if (dep.positionId == 0) revert PositionNotFound();

        // Calculate amounts (simplified - in production would get from hub)
        uint256 principal = dep.amount;
        uint256 yieldAmount = 0; // TODO: Get from settlement message
        
        // Calculate fee
        uint256 fee = (yieldAmount * protocolFeeBps) / 10000;
        uint256 netYield = yieldAmount - fee;
        uint256 totalAmount = principal + netYield;

        // Update status
        dep.status = DepositStatus.Withdrawn;

        // Burn position NFT
        positionNFT.burn(positionId);

        // Transfer tokens
        IERC20(dep.token).safeTransfer(msg.sender, totalAmount);
        
        if (fee > 0) {
            IERC20(dep.token).safeTransfer(feeRecipient, fee);
        }

        emit RemoteWithdrawn(positionId, msg.sender, totalAmount);
    }

    /**
     * @notice Emergency withdraw (before sending to hub)
     * @param positionId Position ID to withdraw
     */
    function emergencyWithdraw(uint256 positionId) external nonReentrant {
        // Verify ownership
        if (positionNFT.ownerOf(positionId) != msg.sender) {
            revert UnauthorizedWithdrawal();
        }

        RemoteDeposit storage dep = deposits[positionId];
        
        // Only allow if not yet sent to hub
        if (dep.status != DepositStatus.Pending) revert InvalidStatus();

        uint256 amount = dep.amount;
        
        // Update status
        dep.status = DepositStatus.Withdrawn;

        // Burn position NFT
        positionNFT.burn(positionId);

        // Transfer tokens back
        IERC20(dep.token).safeTransfer(msg.sender, amount);

        emit RemoteWithdrawn(positionId, msg.sender, amount);
    }

    /**
     * @notice Set hub vault address
     * @param _hubVault Hub vault address on main chain
     */
    function setHubVault(address _hubVault) external onlyOwner {
        hubVaultAddress = _hubVault;
        emit HubVaultUpdated(_hubVault);
    }

    /**
     * @notice Set cross-chain messenger
     * @param _messenger Messenger address (LayerZero endpoint)
     */
    function setMessenger(address _messenger) external onlyOwner {
        messenger = _messenger;
        emit MessengerUpdated(_messenger);
    }

    /**
     * @notice Update protocol fee
     * @param newFeeBps New fee in basis points
     */
    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        protocolFeeBps = newFeeBps;
    }

    /**
     * @notice Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }

    /**
     * @notice Get deposit info
     * @param positionId Position ID
     * @return Deposit data
     */
    function getDeposit(uint256 positionId) 
        external 
        view 
        returns (RemoteDeposit memory) 
    {
        return deposits[positionId];
    }

    /**
     * @notice Check if deposit can be withdrawn
     * @param positionId Position ID
     * @return True if ready for withdrawal
     */
    function canWithdraw(uint256 positionId) external view returns (bool) {
        return deposits[positionId].status == DepositStatus.Settled;
    }
}
