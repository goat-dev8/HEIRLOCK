/**
 * Partner approval gate — Continuity + Policy before Approve.
 * Approve records intent only; execution requires separate SoDEX relay.
 */
import type { OnChainWealthPolicy } from "../valuechain/policy-read.js";

export type PartnerApprovalGate = {
  canApprove: boolean;
  canExecute: boolean;
  continuityMode: string;
  policySource: string;
  preflightVerdict: string;
  blockReason: string | null;
  nextStep: "debate" | "continuity" | "policy" | "sign" | "approve";
};

export function evaluatePartnerApprovalGate(opts: {
  preflightVerdict: string;
  policy: OnChainWealthPolicy | null;
  debateRan: boolean;
  moderatorStance?: "approve" | "challenge" | "wait" | null;
  userChoice?: "approved" | "rejected" | "deferred";
}): PartnerApprovalGate {
  const mode = opts.policy?.modeName ?? "Unknown";
  const source = opts.policy?.source ?? "unavailable";
  const preflight = opts.preflightVerdict;

  if (!opts.debateRan) {
    return {
      canApprove: false,
      canExecute: false,
      continuityMode: mode,
      policySource: source,
      preflightVerdict: preflight,
      blockReason: "Run Counsel → Falsifier → Moderator debate first.",
      nextStep: "debate",
    };
  }

  if (preflight === "BLOCK") {
    return {
      canApprove: false,
      canExecute: false,
      continuityMode: mode,
      policySource: source,
      preflightVerdict: preflight,
      blockReason: "WealthPolicy preflight BLOCK — continuity gate closed.",
      nextStep: "policy",
    };
  }

  if (!opts.policy || opts.policy.source === "unavailable") {
    return {
      canApprove: false,
      canExecute: false,
      continuityMode: mode,
      policySource: source,
      preflightVerdict: preflight,
      blockReason: "On-chain WealthPolicy UNAVAILABLE — cannot verify Continuity.",
      nextStep: "continuity",
    };
  }

  if (opts.policy.mode === 1) {
    return {
      canApprove: false,
      canExecute: false,
      continuityMode: "Guardian",
      policySource: source,
      preflightVerdict: preflight,
      blockReason: "Guardian mode — new approvals blocked until owner returns.",
      nextStep: "continuity",
    };
  }

  if (opts.policy.mode === 2) {
    return {
      canApprove: false,
      canExecute: false,
      continuityMode: "Heir",
      policySource: source,
      preflightVerdict: preflight,
      blockReason: "Heir mode — execution restricted under continuity policy.",
      nextStep: "continuity",
    };
  }

  const canApprove = true;
  const canExecute = opts.policy.mode === 0 && preflight !== "BLOCK";

  return {
    canApprove,
    canExecute,
    continuityMode: mode,
    policySource: source,
    preflightVerdict: preflight,
    blockReason: null,
    nextStep: canApprove ? "sign" : "approve",
  };
}
