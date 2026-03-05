// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

import { describe, expect, test, jest } from '@jest/globals'

import { WalletAccountReadOnlyEvmMultisigSafe } from '../index.js'

const ACCOUNT = {
  address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
}

const ACCOUNT_2 = {
  address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
}

const MOCK_CONFIG = {
  provider: 'https://sepolia.infura.io/v3/test-key',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
  chainId: 11155111n
}

const MOCK_SAFE_ADDRESS = '0x1234567890123456789012345678901234567890'
const MOCK_SAFE_OP_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
const MOCK_MESSAGE_HASH = '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678'

const createMockSafe4337Pack = (overrides = {}) => ({
  protocolKit: {
    getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
    isSafeDeployed: jest.fn().mockResolvedValue(true),
    getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
    getThreshold: jest.fn().mockResolvedValue(1),
    getNonce: jest.fn().mockResolvedValue(0n),
    ...overrides.protocolKit
  },
  ...overrides
})

const createMockApiKit = (overrides = {}) => ({
  getProposal: jest.fn().mockResolvedValue({
    confirmations: [{ owner: ACCOUNT.address }],
    preparedSignature: '0xsignature'
  }),
  getPendingSafeOperations: jest.fn().mockResolvedValue({ results: [] }),
  getMessage: jest.fn().mockResolvedValue({
    confirmations: [{ owner: ACCOUNT.address }],
    preparedSignature: '0xmessagesignature'
  }),
  ...overrides
})

describe('WalletAccountReadOnlyEvmMultisigSafe', () => {
  describe('constructor', () => {
    test('should successfully initialize with safeAddress', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(account).toBeDefined()
      expect(account._safeAddress).toBe(MOCK_SAFE_ADDRESS)
    })

    test('should successfully initialize with PredictedSafeOptions', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address, ACCOUNT_2.address],
          threshold: 2
        }
      })

      expect(account).toBeDefined()
      expect(account._safeAddress).toBe(null)
    })

    test('should successfully initialize with signerAddress', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(ACCOUNT.address, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(account).toBeDefined()
      expect(account._signerAddress).toBe(ACCOUNT.address)
    })

    test('should store config correctly', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(account._config.provider).toBe(MOCK_CONFIG.provider)
      expect(account._config.bundlerUrl).toBe(MOCK_CONFIG.bundlerUrl)
      expect(account._config.chainId).toBe(MOCK_CONFIG.chainId)
    })

    test('should throw if options is missing', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, MOCK_CONFIG)
      }).toThrow('safeOptions is required')
    })

    test('should throw if owners is not an array', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, {
          ...MOCK_CONFIG,
          safeOptions: {
            owners: ACCOUNT.address,
            threshold: 1
          }
        })
      }).toThrow('safeOptions.owners is required and must not be empty')
    })

    test('should throw if threshold is less than 1', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, {
          ...MOCK_CONFIG,
          safeOptions: {
            owners: [ACCOUNT.address],
            threshold: 0
          }
        })
      }).toThrow('threshold must be at least 1')
    })

    test('should throw if threshold is negative', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, {
          ...MOCK_CONFIG,
          safeOptions: {
            owners: [ACCOUNT.address],
            threshold: -1
          }
        })
      }).toThrow('threshold must be at least 1')
    })

    test('should throw if threshold exceeds number of owners', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, {
          ...MOCK_CONFIG,
          safeOptions: {
            owners: [ACCOUNT.address],
            threshold: 2
          }
        })
      }).toThrow('threshold cannot exceed number of owners')
    })

    test('should accept valid 2-of-3 config', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address, ACCOUNT_2.address, '0x3333333333333333333333333333333333333333'],
          threshold: 2
        }
      })

      expect(account).toBeDefined()
    })

    test('should accept valid 1-of-1 config', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      expect(account).toBeDefined()
    })

    test('should accept PredictedSafeOptions with saltNonce', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1,
          saltNonce: '0x1234567890'
        }
      })

      expect(account).toBeDefined()
      expect(account._config.safeOptions.saltNonce).toBe('0x1234567890')
    })

    test('should accept PredictedSafeOptions with safeVersion', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1,
          safeVersion: '1.4.1'
        }
      })

      expect(account).toBeDefined()
      expect(account._config.safeOptions.safeVersion).toBe('1.4.1')
    })

    test('should successfully initialize with ERC-20 paymaster options', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
        paymasterTokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(account._config.paymasterTokenAddress).toBe('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238')
      expect(account._config.isSponsored).toBeUndefined()
    })

    test('should successfully initialize with ERC-20 paymaster and paymasterAddress', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
        paymasterAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        paymasterTokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(account._config.paymasterAddress).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    })

    test('should successfully initialize with sponsored paymaster and sponsorshipPolicyId', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
        isSponsored: true,
        sponsorshipPolicyId: 'sp_my_policy_123',
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(account._config.isSponsored).toBe(true)
      expect(account._config.sponsorshipPolicyId).toBe('sp_my_policy_123')
    })
  })

  describe('getAddress', () => {
    test('should return cached safeAddress when provided via ExistingSafeOptions', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      const address = await account.getAddress()

      expect(address).toBe(MOCK_SAFE_ADDRESS)
    })

    test('should return deterministic address when PredictedSafeOptions provided', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const address = await account.getAddress()

      expect(address).toBe('0x2298cce24D20586409b765A86B44f535982395b2')
    })
  })

  describe('isDeployed', () => {
    test('should return true when Safe is deployed', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const isDeployed = await account.isDeployed()

      expect(isDeployed).toBe(true)
      expect(mockPack.protocolKit.isSafeDeployed).toHaveBeenCalled()
    })

    test('should return false when Safe is not deployed', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(false)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const isDeployed = await account.isDeployed()

      expect(isDeployed).toBe(false)
    })
  })

  describe('getOwners', () => {
    test('should return owners from deployed Safe', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      const mockOwners = [ACCOUNT.address, ACCOUNT_2.address]
      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue(mockOwners)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const owners = await account.getOwners()

      expect(owners).toEqual(mockOwners)
      expect(mockPack.protocolKit.getOwners).toHaveBeenCalled()
    })

    test('should return owners from options when not deployed', async () => {
      const configOwners = [ACCOUNT.address, ACCOUNT_2.address]
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: configOwners,
          threshold: 2
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(false)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const owners = await account.getOwners()

      expect(owners).toEqual(configOwners)
    })
  })

  describe('getThreshold', () => {
    test('should return threshold from deployed Safe', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getThreshold: jest.fn().mockResolvedValue(2)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const threshold = await account.getThreshold()

      expect(threshold).toBe(2)
      expect(mockPack.protocolKit.getThreshold).toHaveBeenCalled()
    })

    test('should return threshold from options when not deployed', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address, ACCOUNT_2.address],
          threshold: 2
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(false)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const threshold = await account.getThreshold()

      expect(threshold).toBe(2)
    })
  })

  describe('getNonce', () => {
    test('should return nonce from Safe', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          getNonce: jest.fn().mockResolvedValue(5n)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const nonce = await account.getNonce()

      expect(nonce).toBe(5n)
      expect(mockPack.protocolKit.getNonce).toHaveBeenCalled()
    })
  })

  describe('getPaymasterTokenBalance', () => {
    test('should throw error when isSponsored=true (no token configured)', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
        isSponsored: true,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      await expect(account.getPaymasterTokenBalance())
        .rejects.toThrow('No paymaster token configured')
    })

    test('should throw error when no paymaster token configured', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      await expect(account.getPaymasterTokenBalance())
        .rejects.toThrow('No paymaster token configured')
    })
  })

  describe('generateDeterministicSaltNonce', () => {
    test('should generate a deterministic salt nonce', () => {
      const owners = ['0xAAA', '0xBBB']
      const threshold = 2

      const nonce = WalletAccountReadOnlyEvmMultisigSafe.generateDeterministicSaltNonce(owners, threshold)

      expect(nonce).toBe('0xd45ee70b400735ca5d4e17ab824ff0322b670873eb9993b576a6157de4530277')
    })

    test('should return the same nonce regardless of owner order', () => {
      const nonce1 = WalletAccountReadOnlyEvmMultisigSafe.generateDeterministicSaltNonce(['0xAAA', '0xBBB'], 2)
      const nonce2 = WalletAccountReadOnlyEvmMultisigSafe.generateDeterministicSaltNonce(['0xBBB', '0xAAA'], 2)

      expect(nonce1).toBe(nonce2)
    })
  })

  describe('quoteDeploy', () => {
    test('should return fee estimate for deployment', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(false),
          createSafeDeploymentTransaction: jest.fn().mockResolvedValue({
            to: '0xDeployFactory',
            value: '0',
            data: '0xdeploydata'
          })
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const mockEvmReadOnly = {
        quoteSendTransaction: jest.fn().mockResolvedValue({ fee: 210000n })
      }
      account._getEvmReadOnlyAccount = jest.fn().mockResolvedValue(mockEvmReadOnly)

      const result = await account.quoteDeploy()

      expect(result).toBeDefined()
      expect(result.fee).toBe(210000n)
      expect(mockPack.protocolKit.createSafeDeploymentTransaction).toHaveBeenCalled()
      expect(mockEvmReadOnly.quoteSendTransaction).toHaveBeenCalledWith({
        to: '0xDeployFactory',
        value: 0n,
        data: '0xdeploydata'
      })
    })

    test('should throw if Safe is already deployed', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      await expect(account.quoteDeploy())
        .rejects.toThrow('Safe is already deployed')
    })
  })

  describe('getMessages', () => {
    test('should return array of MessageInfo', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockResolvedValue({
          messageHash: MOCK_MESSAGE_HASH,
          message: 'Hello!',
          confirmations: [{ owner: ACCOUNT.address }],
          preparedSignature: '0xpreparedsig'
        })
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)
      account._apiKit = mockApiKit

      const result = await account.getMessages([MOCK_MESSAGE_HASH])

      expect(result).toHaveLength(1)
      expect(result[0].messageHash).toBe(MOCK_MESSAGE_HASH)
      expect(result[0].message).toBe('Hello!')
      expect(result[0].confirmations).toBe(1)
      expect(result[0].threshold).toBe(1)
      expect(result[0].combinedSignature).toBe('0xpreparedsig')
    })

    test('should return null for messages not found', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockRejectedValue(new Error('not found'))
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)
      account._apiKit = mockApiKit

      const result = await account.getMessages([MOCK_MESSAGE_HASH])

      expect(result).toHaveLength(1)
      expect(result[0]).toBeNull()
    })

    test('should preserve positional mapping', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn()
          .mockRejectedValueOnce(new Error('not found'))
          .mockResolvedValueOnce({
            messageHash: 'hash2',
            message: 'Second',
            confirmations: [{ owner: ACCOUNT.address }],
            preparedSignature: null
          })
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)
      account._apiKit = mockApiKit

      const result = await account.getMessages(['hash1', 'hash2'])

      expect(result).toHaveLength(2)
      expect(result[0]).toBeNull()
      expect(result[1].message).toBe('Second')
    })
  })

  describe('getProposals', () => {
    test('should return array of proposals', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }]
        })
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)
      account._apiKit = mockApiKit

      const result = await account.getProposals([MOCK_SAFE_OP_HASH])

      expect(result).toHaveLength(1)
      expect(result[0].proposalId).toBe(MOCK_SAFE_OP_HASH)
      expect(result[0].confirmations).toBe(1)
      expect(result[0].threshold).toBe(1)
    })

    test('should return null for proposals not found', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockRejectedValue(new Error('not found'))
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)
      account._apiKit = mockApiKit

      const result = await account.getProposals([MOCK_SAFE_OP_HASH])

      expect(result).toHaveLength(1)
      expect(result[0]).toBeNull()
    })

    test('should preserve positional mapping', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn()
          .mockResolvedValueOnce({
            confirmations: [{ owner: ACCOUNT.address }]
          })
          .mockRejectedValueOnce(new Error('not found'))
          .mockResolvedValueOnce({
            confirmations: [{ owner: ACCOUNT.address }, { owner: ACCOUNT_2.address }]
          })
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)
      account._apiKit = mockApiKit

      const result = await account.getProposals(['hash1', 'hash2', 'hash3'])

      expect(result).toHaveLength(3)
      expect(result[0].confirmations).toBe(1)
      expect(result[1]).toBeNull()
      expect(result[2].confirmations).toBe(2)
    })
  })

  describe('verify', () => {
    test('should call isValidSignature with hashed message', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isValidSignature: jest.fn().mockResolvedValue(true)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const result = await account.verify('Hello', '0xsignature')

      expect(result).toBe(true)
      expect(mockPack.protocolKit.isValidSignature).toHaveBeenCalledWith(
        '0xaa744ba2ca576ec62ca0045eca00ad3917fdf7ffa34fbbae50828a5a69c1580e',
        '0xsignature'
      )
    })

    test('should return false for invalid signature', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isValidSignature: jest.fn().mockResolvedValue(false)
        }
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const result = await account.verify('Hello', '0xinvalid')

      expect(result).toBe(false)
    })
  })

  describe('getTransactionReceipt', () => {
    test('should return EvmTransactionReceipt for regular tx hash', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })

      const mockReceipt = { hash: '0xtxhash', status: 1 }
      const mockEvmReadOnly = {
        getTransactionReceipt: jest.fn().mockResolvedValue(mockReceipt)
      }
      account._getEvmReadOnlyAccount = jest.fn().mockResolvedValue(mockEvmReadOnly)

      const result = await account.getTransactionReceipt('0xtxhash')

      expect(result).toBe(mockReceipt)
      expect(mockEvmReadOnly.getTransactionReceipt).toHaveBeenCalledWith('0xtxhash')
    })

    test('should return UserOperationReceipt for UserOp hash', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })

      const mockEvmReadOnly = {
        getTransactionReceipt: jest.fn().mockResolvedValue(null)
      }
      account._getEvmReadOnlyAccount = jest.fn().mockResolvedValue(mockEvmReadOnly)

      const mockUserOpReceipt = { userOpHash: '0xuserophash', success: true }
      const mockPack = createMockSafe4337Pack({
        getUserOperationReceipt: jest.fn().mockResolvedValue(mockUserOpReceipt)
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const result = await account.getTransactionReceipt('0xuserophash')

      expect(result).toBe(mockUserOpReceipt)
      expect(mockPack.getUserOperationReceipt).toHaveBeenCalledWith('0xuserophash')
    })

    test('should return null when hash is not found', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeOptions: { safeAddress: MOCK_SAFE_ADDRESS }
      })

      const mockEvmReadOnly = {
        getTransactionReceipt: jest.fn().mockResolvedValue(null)
      }
      account._getEvmReadOnlyAccount = jest.fn().mockResolvedValue(mockEvmReadOnly)

      const mockPack = createMockSafe4337Pack({
        getUserOperationReceipt: jest.fn().mockResolvedValue(null)
      })
      account._getSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const result = await account.getTransactionReceipt('0xunknown')

      expect(result).toBeNull()
    })
  })
})
