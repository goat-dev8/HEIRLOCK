// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AttestationRegistry — off-chain attestation anchors
contract AttestationRegistry {
    struct Attestation {
        address subject;
        bytes32 kind;
        bytes32 contentHash;
        address attester;
        uint256 timestamp;
    }

    Attestation[] public attestations;
    mapping(bytes32 => uint256[]) private bySubjectKind;

    event Attested(uint256 indexed id, address indexed subject, bytes32 indexed kind, bytes32 contentHash);

    function attest(address subject, bytes32 kind, bytes32 contentHash) external returns (uint256 id) {
        id = attestations.length;
        attestations.push(
            Attestation({
                subject: subject,
                kind: kind,
                contentHash: contentHash,
                attester: msg.sender,
                timestamp: block.timestamp
            })
        );
        bySubjectKind[keccak256(abi.encode(subject, kind))].push(id);
        emit Attested(id, subject, kind, contentHash);
    }

    function count() external view returns (uint256) {
        return attestations.length;
    }
}
