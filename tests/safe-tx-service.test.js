import { describe, expect, jest, test } from '@jest/globals'

import SafeTxServiceCoordinator from '../src/coordinators/safe-tx-service.js'

const PROPOSAL_ID = '0xb0b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3'
const MESSAGE_ID = '0xc0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ff'

function coordinatorWithApiKit (apiKit) {
  const coordinator = new SafeTxServiceCoordinator({ chainId: 1n })
  coordinator._getApiKit = () => apiKit
  return coordinator
}

describe('SafeTxServiceCoordinator', () => {
  describe('submitProposal', () => {
    test('forwards the JSON-safe proposal to api-kit unchanged', async () => {
      const addSafeOperation = jest.fn().mockResolvedValue(undefined)
      const coordinator = coordinatorWithApiKit({ addSafeOperation })

      const proposal = {
        entryPoint: '0xentry',
        moduleAddress: '0xmodule',
        safeAddress: '0xsafe',
        userOperation: {
          sender: '0xsafe',
          nonce: '5',
          callGasLimit: '100000',
          maxFeePerGas: '2000000000'
        },
        options: { validAfter: 0, validUntil: 0 }
      }

      await coordinator.submitProposal('0xproposalid', proposal)

      const submitted = addSafeOperation.mock.calls[0][0]

      expect(submitted).toEqual(proposal)
      expect(() => JSON.stringify(submitted)).not.toThrow()
    })
  })

  describe('getProposal', () => {
    test('returns null when the service reports the operation was not found', async () => {
      const coordinator = coordinatorWithApiKit({
        getSafeOperation: jest.fn().mockRejectedValue(new Error('Not found.'))
      })

      expect(await coordinator.getProposal(PROPOSAL_ID)).toBeNull()
    })

    test('propagates errors that are not not-found', async () => {
      const coordinator = coordinatorWithApiKit({
        getSafeOperation: jest.fn().mockRejectedValue(new Error('Service Unavailable'))
      })

      await expect(coordinator.getProposal(PROPOSAL_ID)).rejects.toThrow('Service Unavailable')
    })

    test('returns the operation when the service finds it', async () => {
      const operation = { confirmations: [], userOperation: { ethereumTxHash: null } }
      const coordinator = coordinatorWithApiKit({
        getSafeOperation: jest.fn().mockResolvedValue(operation)
      })

      expect(await coordinator.getProposal(PROPOSAL_ID)).toBe(operation)
    })
  })

  describe('getMessage', () => {
    test('returns null when the service reports the message was not found', async () => {
      const coordinator = coordinatorWithApiKit({
        getMessage: jest.fn().mockRejectedValue(new Error('Not found.'))
      })

      expect(await coordinator.getMessage(MESSAGE_ID)).toBeNull()
    })

    test('propagates errors that are not not-found', async () => {
      const coordinator = coordinatorWithApiKit({
        getMessage: jest.fn().mockRejectedValue(new Error('Service Unavailable'))
      })

      await expect(coordinator.getMessage(MESSAGE_ID)).rejects.toThrow('Service Unavailable')
    })
  })
})
