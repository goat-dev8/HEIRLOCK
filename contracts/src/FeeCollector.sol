// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FeeCollector — collects protocol fees in native SOSO / ERC20
contract FeeCollector {
    address public owner;
    address public treasury;

    event TreasuryUpdated(address indexed previous, address indexed next);
    event NativeWithdrawn(address indexed to, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previous, address indexed next);

    error NotOwner();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address treasury_) {
        owner = msg.sender;
        treasury = treasury_;
    }

    receive() external payable {}

    function setTreasury(address next) external onlyOwner {
        address prev = treasury;
        treasury = next;
        emit TreasuryUpdated(prev, next);
    }

    function withdrawNative(uint256 amount) external onlyOwner {
        (bool ok, ) = treasury.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit NativeWithdrawn(treasury, amount);
    }

    function withdrawToken(address token, uint256 amount) external onlyOwner {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", treasury, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
        emit TokenWithdrawn(token, treasury, amount);
    }

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "zero");
        address prev = owner;
        owner = next;
        emit OwnershipTransferred(prev, next);
    }
}
