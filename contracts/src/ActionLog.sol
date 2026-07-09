// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ActionLog — append-only action references (IPFS CID / hash)
contract ActionLog {
    address public owner;

    struct Entry {
        address actor;
        bytes32 refType;
        bytes32 refId;
        string ipfsCid;
        uint256 timestamp;
    }

    Entry[] public entries;

    event ActionRecorded(
        uint256 indexed index,
        address indexed actor,
        bytes32 indexed refType,
        bytes32 refId,
        string ipfsCid
    );

    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function record(
        bytes32 refType,
        bytes32 refId,
        string calldata ipfsCid
    ) external returns (uint256 index) {
        index = entries.length;
        entries.push(
            Entry({
                actor: msg.sender,
                refType: refType,
                refId: refId,
                ipfsCid: ipfsCid,
                timestamp: block.timestamp
            })
        );
        emit ActionRecorded(index, msg.sender, refType, refId, ipfsCid);
    }

    function length() external view returns (uint256) {
        return entries.length;
    }
}
