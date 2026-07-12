/**
 * Official SSI Protocol addresses on Base — SoSoValue Whitepaper §5.3 Key Addresses.
 * Source: https://sosovalue-white-paper.gitbook.io/sosovalue-whitepaper
 * Do not invent addresses. ResearchHubVoting deploy address is not listed here.
 */

export const SSI_BASE_CHAIN_ID = 8453;

export const SSI_INDEX_TOKENS = {
  "MAG7.ssi": "0x9E6A46f294bB67c20F1D1E7AfB0bBEf614403B55",
  "DEFI.ssi": "0x164ffdaE2fe3891714bc2968f1875ca4fA1079D0",
  "MEME.ssi": "0xdd3acDBDc7b358Df453a6CB6bCA56C92aA5743aA",
  USSI: "0x3a46ed8FCeb6eF1ADA2E4600A522AE7e24D2Ed18",
} as const;

export const SSI_PROTOCOL_CONTRACTS = {
  swap: "0xF909bfa750721501B4F8433588FaE5cE303Db08B",
  factory: "0xb04eB6b64137d1673D46731C8f84718092c50B0D",
  issuer: "0x0306acEb4c20FF33480d90038F8b375cC6A6b66e",
  rebalancer: "0x84663e30973D552ac357FD04F3Ac6ebbD495Ab15",
  feeManager: "0x2E469365030F068eCB1176a0D5600bA470Cf07A9",
  stakeFactory: "0x585834242BB31427B1dC7486DD4BDe7c724e35c1",
  assetLocking: "0x935A4B1F6F3E891a226b2522ac22d45Ce5839383",
} as const;

/** Map OpenAPI index ids → on-chain token symbol when known */
export const OPENAPI_TO_TOKEN: Record<string, keyof typeof SSI_INDEX_TOKENS> = {
  ssimag7: "MAG7.ssi",
  ssidefi: "DEFI.ssi",
  ssimeme: "MEME.ssi",
  // USSI may appear as different OpenAPI ids; keep token map explicit when confirmed
};

export const SSI_SOURCE = {
  whitepaper: "sosovalue-whitepaper/5.3-solution-design",
  openapi: "sosovalue-openapi-indices",
  app: "https://ssi.sosovalue.com",
} as const;

export function basescanTokenUrl(address: string) {
  return `https://basescan.org/token/${address}`;
}

export function basescanAddressUrl(address: string) {
  return `https://basescan.org/address/${address}`;
}
