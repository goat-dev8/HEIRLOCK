// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WealthPolicy} from "../src/WealthPolicy.sol";
import {ActionLog} from "../src/ActionLog.sol";
import {ModeController} from "../src/ModeController.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {ContinuityNFT} from "../src/ContinuityNFT.sol";
import {FeeCollector} from "../src/FeeCollector.sol";

contract HeirlockContractsTest is Test {
    WealthPolicy internal policy;
    ActionLog internal actionLog;
    ModeController internal modes;
    AttestationRegistry internal attestations;
    ContinuityNFT internal continuity;
    FeeCollector internal fees;

    address internal guardian = address(0xBEEF);

    function setUp() public {
        policy = new WealthPolicy(1);
        actionLog = new ActionLog();
        modes = new ModeController(address(policy), guardian);
        policy.setController(address(modes));
        attestations = new AttestationRegistry();
        continuity = new ContinuityNFT();
        fees = new FeeCollector(address(this));
    }

    function test_wealthPolicyInitialCap() public view {
        assertEq(policy.maxNotionalUsd(), 1);
        assertEq(uint256(policy.mode()), uint256(WealthPolicy.Mode.Alive));
    }

    function test_modeControllerEnterGuardian() public {
        vm.prank(guardian);
        modes.enterGuardian();
        assertEq(uint256(policy.mode()), uint256(WealthPolicy.Mode.Guardian));
    }

    function test_actionLogRecord() public {
        bytes32 ref = keccak256("order-1");
        actionLog.record(keccak256("trade"), ref, "ipfs://cid");
        assertEq(actionLog.length(), 1);
    }

    function test_attestationRegistry() public {
        uint256 id = attestations.attest(address(0x1), keccak256("kyc"), keccak256("hash"));
        assertEq(id, 0);
        assertEq(attestations.count(), 1);
    }

    function test_continuityMintSoulbound() public {
        uint256 id = continuity.mint(address(0x2), "ipfs://x");
        assertEq(continuity.ownerOf(id), address(0x2));
        vm.expectRevert(ContinuityNFT.Soulbound.selector);
        continuity.transferFrom(address(0x2), address(0x3), id);
    }

    function test_feeCollectorTreasury() public view {
        assertEq(fees.treasury(), address(this));
    }
}
