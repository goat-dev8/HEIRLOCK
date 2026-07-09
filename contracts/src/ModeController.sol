// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWealthPolicy {
    enum Mode { Alive, Guardian, Heir }
    function mode() external view returns (Mode);
    function setMode(Mode next) external;
}

/// @title ModeController — gated mode transitions for Family Office continuity
contract ModeController {
    IWealthPolicy public immutable policy;
    address public guardian;
    address public owner;

    event GuardianUpdated(address indexed previous, address indexed next);
    event ModeTransition(IWealthPolicy.Mode indexed fromMode, IWealthPolicy.Mode indexed toMode, address indexed by);

    error NotAuthorized();

    constructor(address policy_, address guardian_) {
        policy = IWealthPolicy(policy_);
        guardian = guardian_;
        owner = msg.sender;
    }

    function setGuardian(address next) external {
        if (msg.sender != owner) revert NotAuthorized();
        address prev = guardian;
        guardian = next;
        emit GuardianUpdated(prev, next);
    }

    function enterGuardian() external {
        if (msg.sender != owner && msg.sender != guardian) revert NotAuthorized();
        IWealthPolicy.Mode prev = policy.mode();
        policy.setMode(IWealthPolicy.Mode.Guardian);
        emit ModeTransition(prev, IWealthPolicy.Mode.Guardian, msg.sender);
    }

    function enterHeir() external {
        if (msg.sender != owner && msg.sender != guardian) revert NotAuthorized();
        IWealthPolicy.Mode prev = policy.mode();
        policy.setMode(IWealthPolicy.Mode.Heir);
        emit ModeTransition(prev, IWealthPolicy.Mode.Heir, msg.sender);
    }
}
