// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title WealthPolicy — HEIRLOCK on-chain policy anchor (ValueChain)
/// @notice Stores mode + notional cap references. Deploy after audit path.
contract WealthPolicy {
    address public owner;
    /// @notice Authorized mode controller (e.g. ModeController contract)
    address public controller;
    enum Mode { Alive, Guardian, Heir }
    Mode public mode;
    uint256 public maxNotionalUsd; // plain USD units — document at deploy

    event ModeChanged(Mode indexed previous, Mode indexed next);
    event CapChanged(uint256 previous, uint256 next);
    event OwnershipTransferred(address indexed previous, address indexed next);
    event ControllerUpdated(address indexed previous, address indexed next);

    error NotOwner();
    error NotAuthorized();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOwnerOrController() {
        if (msg.sender != owner && msg.sender != controller) revert NotAuthorized();
        _;
    }

    constructor(uint256 initialCapUsd) {
        owner = msg.sender;
        mode = Mode.Alive;
        maxNotionalUsd = initialCapUsd;
    }

    function setController(address next) external onlyOwner {
        address prev = controller;
        controller = next;
        emit ControllerUpdated(prev, next);
    }

    function setMode(Mode next) external onlyOwnerOrController {
        Mode prev = mode;
        mode = next;
        emit ModeChanged(prev, next);
    }

    function setMaxNotionalUsd(uint256 next) external onlyOwner {
        uint256 prev = maxNotionalUsd;
        maxNotionalUsd = next;
        emit CapChanged(prev, next);
    }

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "zero");
        address prev = owner;
        owner = next;
        emit OwnershipTransferred(prev, next);
    }
}
