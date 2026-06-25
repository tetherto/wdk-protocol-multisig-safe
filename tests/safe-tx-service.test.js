import { describe, expect, jest, test } from '@jest/globals'

import SafeTxServiceTransport from '../src/transports/safe-tx-service.js'

const PROPOSAL_ID = '0xb0b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3f0a3b3'
const MESSAGE_ID = '0xc0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ffeec0ff'

function transportWithApiKit (apiKit) {
  const transport = new SafeTxServiceTransport({ chainId: 1n })
  transport._getApiKit = () => apiKit
  return transport
}

describe('SafeTxServiceTransport', () => {
  describe('submitProposal', () => {
    test('restores the serialized userOperation BigInts before calling api-kit', async () => {
      const addSafeOperation = jest.fn().mockResolvedValue(undefined)
      const transport = transportWithApiKit({ addSafeOperation })

      await transport.submitProposal({
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
      })

      const submitted = addSafeOperation.mock.calls[0][0]

      expect(submitted.userOperation.nonce).toBe(5n)
      expect(submitted.userOperation.callGasLimit).toBe(100000n)
      expect(submitted.userOperation.maxFeePerGas).toBe(2000000000n)
      expect(submitted.userOperation.sender).toBe('0xsafe')
      expect(submitted.entryPoint).toBe('0xentry')
    })
  })

  describe('getProposal', () => {
    test('returns null when the service reports the operation was not found', async () => {
      const transport = transportWithApiKit({
        getSafeOperation: jest.fn().mockRejectedValue(new Error('Not found.'))
      })

      expect(await transport.getProposal(PROPOSAL_ID)).toBeNull()
    })

    test('propagates errors that are not not-found', async () => {
      const transport = transportWithApiKit({
        getSafeOperation: jest.fn().mockRejectedValue(new Error('Service Unavailable'))
      })

      await expect(transport.getProposal(PROPOSAL_ID)).rejects.toThrow('Service Unavailable')
    })

    test('returns the operation when the service finds it', async () => {
      const operation = { confirmations: [], userOperation: { ethereumTxHash: null } }
      const transport = transportWithApiKit({
        getSafeOperation: jest.fn().mockResolvedValue(operation)
      })

      expect(await transport.getProposal(PROPOSAL_ID)).toBe(operation)
    })
  })

  describe('getMessage', () => {
    test('returns null when the service reports the message was not found', async () => {
      const transport = transportWithApiKit({
        getMessage: jest.fn().mockRejectedValue(new Error('Not found.'))
      })

      expect(await transport.getMessage(MESSAGE_ID)).toBeNull()
    })

    test('propagates errors that are not not-found', async () => {
      const transport = transportWithApiKit({
        getMessage: jest.fn().mockRejectedValue(new Error('Service Unavailable'))
      })

      await expect(transport.getMessage(MESSAGE_ID)).rejects.toThrow('Service Unavailable')
    })
  })
})
