# HEIRLOCK contracts — ValueChain
# Addresses are filled into env ONLY after verified deploy.
# Do not invent contract addresses.

## Contracts
- `WealthPolicy.sol` — mode + notional cap
- `ActionLog.sol` — append-only action refs
- `ModeController.sol` — Alive → Guardian → Heir transitions
- `AttestationRegistry.sol` — attestation anchors
- `ContinuityNFT.sol` — soulbound continuity credential
- `FeeCollector.sol` — protocol fee treasury

## Deploy (after Foundry install)
```bash
# Preflight
node scripts/check-deploy-ready.mjs

# Build + broadcast (testnet)
forge build
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $VALUECHAIN_TESTNET_RPC \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

Copy printed addresses into env (`WEALTH_POLICY_ADDRESS`, etc.). Never invent addresses.

## Deployed (ValueChain MAINNET — 2026-07-11)

| Contract | Address |
|---|---|
| WealthPolicy | `0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C` |
| ActionLog | `0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b` |
| ModeController | `0xdBAE8db588e39Ba5EBe2C749Ba06Daf24F6F3450` |
| AttestationRegistry | `0x3C1f4718a45e80c6D4E8772909712c1599D8D51D` |
| ContinuityNFT | `0xD7464d9182ffe02d7255Cf3e319145755eE8517d` |
| FeeCollector | `0x16F3B1b67461B20F889998A059526E2acfcdf060` |

Artifact: `deployments/valuechain-mainnet.json`

## Deployed (ValueChain TESTNET — 2026-07-11)

| Contract | Address |
|---|---|
| WealthPolicy | `0x3C1f4718a45e80c6D4E8772909712c1599D8D51D` |
| ActionLog | `0xD7464d9182ffe02d7255Cf3e319145755eE8517d` |
| ModeController | `0x16F3B1b67461B20F889998A059526E2acfcdf060` |
| AttestationRegistry | `0xfdC9A9F19441f10729769393CBBD6d870802Ace9` |
| ContinuityNFT | `0x273F1874E1acAe0aa74F04DaeAb718E1CD8d287B` |
| FeeCollector | `0xBd9dB4C0F048527358a8A6050fA3b5d31a49D067` |

Artifact: `deployments/valuechain-testnet.json`

### Testnet gas funding (official — no withdraw UI)

```bash
pnpm --filter @heirlock/api test:fund-gas
```

Flow: verify vUSDC → buy `WSOSO_vUSDC` → `POST /accounts/transfers` with `toAccountID=999`, `type=2` (EVM_WITHDRAW) → wait native SOSO → forward to deployer if needed → `forge script ... --rpc-url $VALUECHAIN_TESTNET_RPC --broadcast`
