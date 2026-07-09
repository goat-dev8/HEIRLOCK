// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {WealthPolicy} from "../src/WealthPolicy.sol";
import {ActionLog} from "../src/ActionLog.sol";
import {ModeController} from "../src/ModeController.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {ContinuityNFT} from "../src/ContinuityNFT.sol";
import {FeeCollector} from "../src/FeeCollector.sol";

/// @notice Deploy HEIRLOCK ValueChain contracts. Copy forge output into env — never invent addresses.
///   forge script script/Deploy.s.sol:DeployScript --rpc-url $VALUECHAIN_TESTNET_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY
contract DeployScript is Script {
    function run() external {
        uint256 initialCapUsd = vm.envOr("WEALTH_POLICY_INITIAL_CAP_USD", uint256(1));
        address deployer = msg.sender;

        vm.startBroadcast();

        WealthPolicy wealthPolicy = new WealthPolicy(initialCapUsd);
        ActionLog actionLog = new ActionLog();
        ModeController modeController = new ModeController(address(wealthPolicy), deployer);
        wealthPolicy.setController(address(modeController));
        AttestationRegistry attestationRegistry = new AttestationRegistry();
        ContinuityNFT continuityNft = new ContinuityNFT();
        FeeCollector feeCollector = new FeeCollector(deployer);

        vm.stopBroadcast();

        console2.log("WealthPolicy", address(wealthPolicy));
        console2.log("ActionLog", address(actionLog));
        console2.log("ModeController", address(modeController));
        console2.log("AttestationRegistry", address(attestationRegistry));
        console2.log("ContinuityNFT", address(continuityNft));
        console2.log("FeeCollector", address(feeCollector));
        console2.log("Set these addresses in Render/.env - never invent them.");
    }
}
