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
  getSafeOperation: jest.fn().mockResolvedValue({
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
        safeAddress: MOCK_SAFE_ADDRESS
      })

      expect(account).toBeDefined()
      expect(account._safeAddress).toBe(MOCK_SAFE_ADDRESS)
    })

    test('should successfully initialize with safeAccountConfig', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAccountConfig: {
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
        safeAddress: MOCK_SAFE_ADDRESS
      })

      expect(account).toBeDefined()
      expect(account._signerAddress).toBe(ACCOUNT.address)
    })

    test('should store config correctly', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      expect(account._config.provider).toBe(MOCK_CONFIG.provider)
      expect(account._config.bundlerUrl).toBe(MOCK_CONFIG.bundlerUrl)
      expect(account._config.chainId).toBe(MOCK_CONFIG.chainId)
    })

    test('should throw if both safeAddress and safeAccountConfig are missing', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, MOCK_CONFIG)
      }).toThrow('Either safeAddress or safeAccountConfig must be provided')
    })

    test('should throw if both safeAddress and safeAccountConfig are provided', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, {
          ...MOCK_CONFIG,
          safeAddress: MOCK_SAFE_ADDRESS,
          safeAccountConfig: {
            owners: [ACCOUNT.address],
            threshold: 1
          }
        })
      }).toThrow('Cannot provide both safeAddress and safeAccountConfig')
    })

    test('should throw if owners is not an array', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, {
          ...MOCK_CONFIG,
          safeAccountConfig: {
            owners: ACCOUNT.address,
            threshold: 1
          }
        })
      }).toThrow('safeAccountConfig.owners is required and must not be empty')
    })

    test('should throw if threshold is less than 1', () => {
      expect(() => {
        new WalletAccountReadOnlyEvmMultisigSafe(null, {
          ...MOCK_CONFIG,
          safeAccountConfig: {
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
          safeAccountConfig: {
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
          safeAccountConfig: {
            owners: [ACCOUNT.address],
            threshold: 2
          }
        })
      }).toThrow('threshold cannot exceed number of owners')
    })

    test('should accept valid 2-of-3 config', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAccountConfig: {
          owners: [ACCOUNT.address, ACCOUNT_2.address, '0x3333333333333333333333333333333333333333'],
          threshold: 2
        }
      })

      expect(account).toBeDefined()
    })

    test('should accept valid 1-of-1 config', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAccountConfig: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      expect(account).toBeDefined()
    })

    test('should successfully initialize with ERC-20 paymaster options', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
          paymasterTokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
        },
        safeAddress: MOCK_SAFE_ADDRESS
      })

      expect(account._config.paymasterOptions.paymasterTokenAddress).toBe('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238')
      expect(account._config.paymasterOptions.isSponsored).toBeUndefined()
    })

    test('should successfully initialize with ERC-20 paymaster and paymasterAddress', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
          paymasterAddress: '0xPaymasterAddress',
          paymasterTokenAddress: '0xUSDC'
        },
        safeAddress: MOCK_SAFE_ADDRESS
      })

      expect(account._config.paymasterOptions.paymasterAddress).toBe('0xPaymasterAddress')
    })

    test('should successfully initialize with sponsored paymaster and sponsorshipPolicyId', () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
          isSponsored: true,
          sponsorshipPolicyId: 'sp_my_policy_123'
        },
        safeAddress: MOCK_SAFE_ADDRESS
      })

      expect(account._config.paymasterOptions.isSponsored).toBe(true)
      expect(account._config.paymasterOptions.sponsorshipPolicyId).toBe('sp_my_policy_123')
    })
  })

  describe('getAddress', () => {
    test('should return cached safeAddress when provided', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const address = await account.getAddress()

      expect(address).toBe(MOCK_SAFE_ADDRESS)
    })

    test('should deterministic address when safeAccountConfig provided', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAccountConfig: {
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
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true)
        }
      })
      account._safe4337Pack = mockPack

      const isDeployed = await account.isDeployed()

      expect(isDeployed).toBe(true)
      expect(mockPack.protocolKit.isSafeDeployed).toHaveBeenCalled()
    })

    test('should return false when Safe is not deployed', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(false)
        }
      })
      account._safe4337Pack = mockPack

      const isDeployed = await account.isDeployed()

      expect(isDeployed).toBe(false)
    })
  })

  describe('getOwners', () => {
    test('should return owners from deployed Safe', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockOwners = [ACCOUNT.address, ACCOUNT_2.address]
      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue(mockOwners)
        }
      })
      account._safe4337Pack = mockPack

      const owners = await account.getOwners()

      expect(owners).toEqual(mockOwners)
      expect(mockPack.protocolKit.getOwners).toHaveBeenCalled()
    })

    test('should return owners from config when not deployed', async () => {
      const configOwners = [ACCOUNT.address, ACCOUNT_2.address]
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAccountConfig: {
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
      account._safe4337Pack = mockPack

      const owners = await account.getOwners()

      expect(owners).toEqual(configOwners)
    })
  })

  describe('getThreshold', () => {
    test('should return threshold from deployed Safe', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getThreshold: jest.fn().mockResolvedValue(2)
        }
      })
      account._safe4337Pack = mockPack

      const threshold = await account.getThreshold()

      expect(threshold).toBe(2)
      expect(mockPack.protocolKit.getThreshold).toHaveBeenCalled()
    })

    test('should return threshold from config when not deployed', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAccountConfig: {
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
      account._safe4337Pack = mockPack

      const threshold = await account.getThreshold()

      expect(threshold).toBe(2)
    })
  })

  describe('getNonce', () => {
    test('should return nonce from Safe', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          getNonce: jest.fn().mockResolvedValue(5n)
        }
      })
      account._safe4337Pack = mockPack

      const nonce = await account.getNonce()

      expect(nonce).toBe(5n)
      expect(mockPack.protocolKit.getNonce).toHaveBeenCalled()
    })
  })

  describe('getPendingTransactions', () => {
    test('should return pending transactions', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockPendingOps = {
        results: [
          { safeOperationHash: MOCK_SAFE_OP_HASH }
        ]
      }
      const mockApiKit = createMockApiKit({
        getPendingSafeOperations: jest.fn().mockResolvedValue(mockPendingOps)
      })
      account._apiKit = mockApiKit

      const pending = await account.getPendingTransactions()

      expect(pending).toEqual(mockPendingOps)
      expect(mockApiKit.getPendingSafeOperations).toHaveBeenCalled()
    })

    test('should return empty results when no pending transactions', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockApiKit = createMockApiKit({
        getPendingSafeOperations: jest.fn().mockResolvedValue({ results: [] })
      })
      account._apiKit = mockApiKit

      const pending = await account.getPendingTransactions()

      expect(pending.results).toEqual([])
    })
  })

  describe('getSafeOperation', () => {
    test('should return transaction details', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockTx = {
        safeOperationHash: MOCK_SAFE_OP_HASH,
        confirmations: [{ owner: ACCOUNT.address }]
      }
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockResolvedValue(mockTx)
      })
      account._apiKit = mockApiKit

      const tx = await account.getSafeOperation(MOCK_SAFE_OP_HASH)

      expect(tx).toEqual(mockTx)
      expect(mockApiKit.getSafeOperation).toHaveBeenCalledWith(MOCK_SAFE_OP_HASH)
    })

    test('should return null when transaction not found', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockResolvedValue(null)
      })
      account._apiKit = mockApiKit

      const tx = await account.getSafeOperation(MOCK_SAFE_OP_HASH)

      expect(tx).toBe(null)
    })
  })

  describe('isReadyToExecute', () => {
    test('should return true when confirmations meet threshold', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getThreshold: jest.fn().mockResolvedValue(2)
        }
      })
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }, { owner: ACCOUNT_2.address }]
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit

      const isReady = await account.isReadyToExecute(MOCK_SAFE_OP_HASH)

      expect(isReady).toBe(true)
    })

    test('should return false when confirmations below threshold', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getThreshold: jest.fn().mockResolvedValue(2)
        }
      })
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }]
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit

      const isReady = await account.isReadyToExecute(MOCK_SAFE_OP_HASH)

      expect(isReady).toBe(false)
    })
  })

  describe('getPaymasterTokenBalance', () => {
    test('should throw error when isSponsored=true (no token configured)', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
          isSponsored: true
        },
        safeAddress: MOCK_SAFE_ADDRESS
      })

      await expect(account.getPaymasterTokenBalance())
        .rejects.toThrow('No paymaster token configured')
    })

    test('should throw error when no paymasterOptions configured', async () => {
      const account = new WalletAccountReadOnlyEvmMultisigSafe(null, {
        ...MOCK_CONFIG,
        safeAddress: MOCK_SAFE_ADDRESS
      })

      await expect(account.getPaymasterTokenBalance())
        .rejects.toThrow('No paymaster token configured')
    })
  })

  describe('static getSafesByOwner', () => {
    test('should throw error when ownerAddress is missing', async () => {
      await expect(WalletAccountReadOnlyEvmMultisigSafe.getSafesByOwner(null, { chainId: 11155111n }))
        .rejects.toThrow('ownerAddress is required')
    })
  })

  describe('static getSafeInfo', () => {
    test('should throw error when safeAddress is missing', async () => {
      await expect(WalletAccountReadOnlyEvmMultisigSafe.getSafeInfo(null, { chainId: 11155111n }))
        .rejects.toThrow('safeAddress is required')
    })

    test('should throw error when chainId is missing', async () => {
      await expect(WalletAccountReadOnlyEvmMultisigSafe.getSafeInfo(MOCK_SAFE_ADDRESS, {}))
        .rejects.toThrow('chainId is required')
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
})