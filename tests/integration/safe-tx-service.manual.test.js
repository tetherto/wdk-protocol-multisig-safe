// Opt-in validation of the DEFAULT coordinator (SafeTxServiceCoordinator -> @safe-global/api-kit)
// against a real Safe Transaction Service. The local fork test (multisig.test.js) exercises the
// distributed flow with an in-memory coordinator; this one validates the one thing that can only be
// checked against a live service: that an abstractionkit EntryPoint-v0.7 (V7) UserOperation
// round-trips through api-kit's addSafeOperation / getSafeOperation / confirmSafeOperation.
//
// It is SKIPPED unless the environment is configured. To run it, point at an EXISTING deployed Safe
// (module 0.3.0) whose owners include the two signer seeds, with at least a 2-of-N threshold:
//
//   SAFE_TX_SERVICE_VALIDATION=1 \
//   ST_RPC_URL=https://... ST_BUNDLER_URL=https://... ST_CHAIN_ID=11155111 \
//   ST_TX_SERVICE_URL=https://...   # or ST_SAFE_API_KEY=...
//   ST_SAFE_ADDRESS=0x... ST_SEED_A="..." ST_SEED_B="..." \
//   npm run test:integration

import { describe, expect, test } from '@jest/globals'

import { WalletAccountMultisigEvmSafe4337 } from '../../index.js'

const ENABLED = process.env.SAFE_TX_SERVICE_VALIDATION === '1' &&
  process.env.ST_RPC_URL &&
  process.env.ST_BUNDLER_URL &&
  process.env.ST_CHAIN_ID &&
  process.env.ST_SAFE_ADDRESS &&
  process.env.ST_SEED_A &&
  process.env.ST_SEED_B &&
  (process.env.ST_TX_SERVICE_URL || process.env.ST_SAFE_API_KEY)

const TIMEOUT = 180000

const suite = ENABLED ? describe : describe.skip

suite('SafeTxServiceCoordinator — real Safe Transaction Service V7 round-trip (opt-in)', () => {
  test('proposes a V7 operation, retrieves it, confirms it, and sees the confirmation count grow', async () => {
    const config = {
      chainId: BigInt(process.env.ST_CHAIN_ID),
      provider: process.env.ST_RPC_URL,
      bundlerUrl: process.env.ST_BUNDLER_URL,
      safeModulesVersion: '0.3.0',
      useNativeCoins: true,
      txServiceUrl: process.env.ST_TX_SERVICE_URL,
      safeApiKey: process.env.ST_SAFE_API_KEY,
      safeOptions: { safeAddress: process.env.ST_SAFE_ADDRESS }
    }

    const proposer = new WalletAccountMultisigEvmSafe4337(process.env.ST_SEED_A, "0'/0/0", config)
    const approver = new WalletAccountMultisigEvmSafe4337(process.env.ST_SEED_B, "0'/0/0", config)

    const safeAddress = await proposer.getAddress()

    const proposal = await proposer.propose({ to: safeAddress, value: 0n, data: '0x' })
    expect(proposal.proposalId).toMatch(/^0x[0-9a-fA-F]{64}$/)
    expect(proposal.confirmations).toBe(1)

    const retrieved = await approver.getProposal(proposal.proposalId)
    expect(retrieved).not.toBeNull()
    expect(retrieved.proposalId).toBe(proposal.proposalId)
    expect(retrieved.confirmations).toBe(1)

    const approval = await approver.approveProposal(proposal.proposalId)
    expect(approval.confirmations).toBe(2)

    proposer.dispose()
    approver.dispose()
  }, TIMEOUT)
})
