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
