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

import * as bip39 from 'bip39'

import { afterEach, beforeEach, describe, expect, test, jest } from '@jest/globals'

import {
  WalletAccountEvmMultisigSafe,
  WalletAccountReadOnlyEvmMultisigSafe
} from '../index.js'

// ============================================
// Test Constants
// ============================================

const SEED_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const SEED_PHRASE_2 = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
const INVALID_SEED_PHRASE = 'invalid seed phrase'
const SEED = bip39.mnemonicToSeedSync(SEED_PHRASE)

const ACCOUNT = {
  index: 0,
  path: "m/44'/60'/0'/0/0",
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
const MOCK_USER_OP_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
const MOCK_TX_HASH = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'
const MOCK_MESSAGE_HASH = '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678'

// ============================================
// Mock Helpers
// ============================================

const createMockSafe4337Pack = (overrides = {}) => ({
  protocolKit: {
    getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
    isSafeDeployed: jest.fn().mockResolvedValue(true),
    getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
    getThreshold: jest.fn().mockResolvedValue(1),
    getNonce: jest.fn().mockResolvedValue(0n),
    createTransaction: jest.fn().mockResolvedValue({}),
    signTransaction: jest.fn().mockResolvedValue({}),
    createMessage: jest.fn().mockReturnValue({ data: 'message' }),
    signMessage: jest.fn().mockResolvedValue({
      getSignature: jest.fn().mockReturnValue({ data: '0xmocksignature' })
    }),
    getSafeMessageHash: jest.fn().mockResolvedValue(MOCK_MESSAGE_HASH),
    createAddOwnerTx: jest.fn().mockResolvedValue({
      data: { to: MOCK_SAFE_ADDRESS, value: '0', data: '0xaddowner' }
    }),
    createRemoveOwnerTx: jest.fn().mockResolvedValue({
      data: { to: MOCK_SAFE_ADDRESS, value: '0', data: '0xremoveowner' }
    }),
    createSwapOwnerTx: jest.fn().mockResolvedValue({
      data: { to: MOCK_SAFE_ADDRESS, value: '0', data: '0xswapowner' }
    }),
    createChangeThresholdTx: jest.fn().mockResolvedValue({
      data: { to: MOCK_SAFE_ADDRESS, value: '0', data: '0xchangethreshold' }
    }),
    ...overrides.protocolKit
  },
  createTransaction: jest.fn().mockResolvedValue({
    data: { operation: 0 },
    userOperation: {
      callGasLimit: '100000',
      verificationGasLimit: '100000',
      preVerificationGas: '50000',
      paymasterVerificationGasLimit: '50000',
      paymasterPostOpGasLimit: '50000',
      maxFeePerGas: '1000000000'
    }
  }),
  signSafeOperation: jest.fn().mockResolvedValue({
    getHash: jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH),
    signatures: new Map([[ACCOUNT.address.toLowerCase(), { data: '0xmocksig' }]])
  }),
  executeTransaction: jest.fn().mockResolvedValue(MOCK_USER_OP_HASH),
  getUserOperationReceipt: jest.fn().mockResolvedValue({
    receipt: { transactionHash: MOCK_TX_HASH }
  }),
  ...overrides
})

const createMockApiKit = (overrides = {}) => ({
  addSafeOperation: jest.fn().mockResolvedValue(undefined),
  getSafeOperation: jest.fn().mockResolvedValue({
    confirmations: [{ owner: ACCOUNT.address }],
    preparedSignature: '0xsignature'
  }),
  getPendingSafeOperations: jest.fn().mockResolvedValue({ results: [] }),
  confirmSafeOperation: jest.fn().mockResolvedValue(undefined),
  addMessage: jest.fn().mockResolvedValue(undefined),
  addMessageSignature: jest.fn().mockResolvedValue(undefined),
  getMessage: jest.fn().mockResolvedValue({
    message: 'Hello!',
    confirmations: [{ owner: ACCOUNT.address }],
    preparedSignature: '0xmessagesignature'
  }),
  ...overrides
})

// ============================================
// WalletAccountEvmMultisigSafe Tests
// ============================================

describe('WalletAccountEvmMultisigSafe', () => {
  let account

  beforeEach(() => {
    account = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
      ...MOCK_CONFIG,
      safeAccountConfig: {
        owners: [ACCOUNT.address],
        threshold: 1
      }
    })
  })

  afterEach(() => {
    if (account) {
      account.dispose()
    }
  })

  describe('constructor', () => {
    test('should successfully initialize with seed phrase and path', () => {
      expect(account).toBeDefined()
      expect(account._signerAccount).toBeDefined()
      expect(account._path).toBe("0'/0/0")
    })

    test('should throw if provider is missing', () => {
      expect(() => {
        new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
          bundlerUrl: MOCK_CONFIG.bundlerUrl,
          chainId: MOCK_CONFIG.chainId,
          safeAccountConfig: {
            owners: [ACCOUNT.address],
            threshold: 1
          }
        })
      }).toThrow('provider is required')
    })
  })

  describe('index', () => {
    test('should return the correct index from path', () => {
      expect(account.index).toBe(ACCOUNT.index)
    })
  })

  describe('path', () => {
    test('should return the full derivation path', () => {
      expect(account.path).toBe(ACCOUNT.path)
    })
  })

  describe('keyPair', () => {
    test('should return deterministic key pair with privateKey and publicKey', () => {
      const keyPair = account.keyPair

      expect(keyPair).toBeDefined()
      expect(Buffer.from(keyPair.privateKey).toString('hex')).toBe('1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727')
      expect(Buffer.from(keyPair.publicKey).toString('hex')).toBe('0237b0bb7a8288d38ed49a524b5dc98cff3eb5ca824c9f9dc0dfdb3d9cd600f299')
    })
  })

  describe('getSignerAddress', () => {
    test('should return the correct EOA address', async () => {
      const address = await account.getSignerAddress()

      expect(address).toBe(ACCOUNT.address)
    })
  })

  describe('sign', () => {
    const MESSAGE = 'Hello, Safe!'

    test('should return a deterministic signature', async () => {
      const signature = await account.sign(MESSAGE)

      expect(signature).toBe('0x27c626b76608d7351662e9de6d09a9db3d0aeb0a0c3ee25523231a81401d772624c4cf83a40a2be6fd294f735bd7ee2a2090008a6dc479486eb72a044c90acef1c')
    })
  })

  describe('verify', () => {
    const MESSAGE = 'Hello, Safe!'

    test('should return true for a valid signature', async () => {
      const signature = await account.sign(MESSAGE)
      const result = await account.verify(MESSAGE, signature)

      expect(result).toBe(true)
    })

    test('should return false for wrong message', async () => {
      const signature = await account.sign(MESSAGE)
      const result = await account.verify('Wrong message', signature)

      expect(result).toBe(false)
    })
  })

  describe('dispose', () => {
    test('should clear sensitive data', () => {
      const testAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        safeAccountConfig: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      testAccount.dispose()

      expect(testAccount._safe4337Pack).toBe(null)
      expect(testAccount._apiKit).toBe(null)
    })
  })

  describe('toReadOnlyAccount', () => {
    test('should return a WalletAccountReadOnlyEvmMultisigSafe instance', async () => {
      account._safeAddress = MOCK_SAFE_ADDRESS

      const readOnlyAccount = await account.toReadOnlyAccount()

      expect(readOnlyAccount).toBeInstanceOf(WalletAccountReadOnlyEvmMultisigSafe)
      expect(readOnlyAccount._config.provider).toBe(MOCK_CONFIG.provider)
      expect(readOnlyAccount._config.chainId).toBe(MOCK_CONFIG.chainId)
    })
  })

  describe('propose', () => {
    test('should return propose result with safeOperationHash', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '0', data: '0x' }
      const result = await account.propose(tx)

      expect(result).toBeDefined()
      expect(result.safeOperationHash).toBe(MOCK_SAFE_OP_HASH)
      expect(result.confirmations).toBe(1)
      expect(result.threshold).toBe(1)
    })

    test('should call createTransaction and signSafeOperation', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '0', data: '0x' }
      await account.propose(tx)

      expect(mockPack.createTransaction).toHaveBeenCalled()
      expect(mockPack.signSafeOperation).toHaveBeenCalled()
    })

    test('should call addSafeOperation on apiKit', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '0', data: '0x' }
      await account.propose(tx)

      expect(mockApiKit.addSafeOperation).toHaveBeenCalled()
    })
  })

  describe('approve', () => {
    test('should return approval result with confirmations', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }, { owner: ACCOUNT_2.address }],
          preparedSignature: '0xsignature'
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.approve(MOCK_SAFE_OP_HASH)

      expect(result).toBeDefined()
      expect(result.confirmations).toBe(2)
    })

    test('should call confirmSafeOperation on apiKit', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      await account.approve(MOCK_SAFE_OP_HASH)

      expect(mockApiKit.confirmSafeOperation).toHaveBeenCalledWith(
        MOCK_SAFE_OP_HASH,
        '0xmocksig'
      )
    })
  })

  describe('execute', () => {
    test('should return execute result with hash', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS

      const result = await account.execute(MOCK_SAFE_OP_HASH)

      expect(result).toBeDefined()
      expect(result.hash).toBe(MOCK_USER_OP_HASH)
    })

    test('should call executeTransaction on Safe4337Pack', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS

      await account.execute(MOCK_SAFE_OP_HASH)

      expect(mockPack.executeTransaction).toHaveBeenCalled()
    })

    test('should throw if not enough confirmations', async () => {
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
      account._safeAddress = MOCK_SAFE_ADDRESS

      await expect(account.execute(MOCK_SAFE_OP_HASH))
        .rejects.toThrow('Not enough confirmations')
    })
  })

  describe('sendTransaction', () => {
    test('should return MultisigTransferResult', async () => {
      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1)
        }
      })
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '1000', data: '0x' }
      const result = await account.sendTransaction(tx)

      expect(result).toBeDefined()
      expect(result.hash).toBe(MOCK_USER_OP_HASH)
      expect(result.fee).toBe(350000000000000n)
      expect(result.confirmations).toBe(1)
      expect(result.threshold).toBe(1)
      expect(result.executed).toBe(true)
    })

    test('should auto-execute for 1-of-1 Safe', async () => {
      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1)
        }
      })
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }],
          preparedSignature: '0xsignature'
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '1000', data: '0x' }
      const result = await account.sendTransaction(tx)

      expect(result.executed).toBe(true)
      expect(result.hash).toBe(MOCK_USER_OP_HASH)
    })

    test('should not auto-execute when threshold not met', async () => {
      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address, ACCOUNT_2.address]),
          getThreshold: jest.fn().mockResolvedValue(2)
        }
      })
      const mockApiKit = createMockApiKit({
        getSafeOperation: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }],
          preparedSignature: '0xsignature'
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '1000', data: '0x' }
      const result = await account.sendTransaction(tx)

      expect(result.executed).toBe(false)
      expect(result.hash).toBe(MOCK_SAFE_OP_HASH)
    })
  })

  describe('transfer', () => {
    test('should return MultisigTransferResult', async () => {
      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1)
        }
      })
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const options = {
        to: ACCOUNT_2.address,
        amount: 1000n
      }
      const result = await account.transfer(options)

      expect(result).toBeDefined()
      expect(result.hash).toBe(MOCK_USER_OP_HASH)
      expect(result.fee).toBe(350000000000000n)
      expect(result.executed).toBe(true)
    })
  })

  describe('getTransactionHashByUserOpHash', () => {
    test('should return transaction hash from userOpHash', async () => {
      const mockPack = createMockSafe4337Pack()
      account._safe4337Pack = mockPack

      const txHash = await account.getTransactionHashByUserOpHash(MOCK_USER_OP_HASH)

      expect(txHash).toBe(MOCK_TX_HASH)
      expect(mockPack.getUserOperationReceipt).toHaveBeenCalledWith(MOCK_USER_OP_HASH)
    })

    test('should return null when receipt not found', async () => {
      const mockPack = createMockSafe4337Pack({
        getUserOperationReceipt: jest.fn().mockResolvedValue(null)
      })
      account._safe4337Pack = mockPack

      const txHash = await account.getTransactionHashByUserOpHash(MOCK_USER_OP_HASH)

      expect(txHash).toBe(null)
    })
  })

  describe('proposeMessage', () => {
    test('should return message proposal result', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockResolvedValue({
          messageHash: MOCK_MESSAGE_HASH,
          confirmations: [{ owner: ACCOUNT.address }]
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.proposeMessage('Hello!')

      expect(result).toBeDefined()
      expect(result.messageHash).toBe(MOCK_MESSAGE_HASH)
      expect(result.confirmations).toBe(1)
      expect(result.threshold).toBe(1)
    })

    test('should call addMessage on apiKit', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      await account.proposeMessage('Hello!')

      expect(mockApiKit.addMessage).toHaveBeenCalledWith(
        MOCK_SAFE_ADDRESS,
        expect.objectContaining({
          message: 'Hello!',
          signature: expect.any(String)
        })
      )
    })
  })

  describe('approveMessage', () => {
    test('should return approval result', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockResolvedValue({
          message: 'Hello!',
          messageHash: MOCK_MESSAGE_HASH,
          confirmations: [{ owner: ACCOUNT.address }, { owner: ACCOUNT_2.address }]
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.approveMessage(MOCK_MESSAGE_HASH)

      expect(result).toBeDefined()
      expect(result.confirmations).toBe(2)
    })

    test('should call addMessageSignature on apiKit', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      await account.approveMessage(MOCK_MESSAGE_HASH)

      expect(mockApiKit.addMessageSignature).toHaveBeenCalledWith(
        MOCK_MESSAGE_HASH,
        '0xmocksignature'
      )
    })
  })

  describe('getMessage', () => {
    test('should return message with signature', async () => {
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockResolvedValue({
          messageHash: MOCK_MESSAGE_HASH,
          confirmations: [{ owner: ACCOUNT.address }],
          preparedSignature: '0xpreparedsig'
        })
      })
      account._apiKit = mockApiKit

      const result = await account.getMessage(MOCK_MESSAGE_HASH)

      expect(result).toBeDefined()
      expect(result.preparedSignature).toBe('0xpreparedsig')
    })

    test('should return null when message not found', async () => {
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockResolvedValue(null)
      })
      account._apiKit = mockApiKit

      const result = await account.getMessage(MOCK_MESSAGE_HASH)

      expect(result).toBe(null)
    })
  })

  describe('Owner Management', () => {
    beforeEach(() => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)
    })

    test('addOwner should return propose result', async () => {
      const result = await account.addOwner(ACCOUNT_2.address)

      expect(result).toBeDefined()
      expect(result.safeOperationHash).toBe(MOCK_SAFE_OP_HASH)
    })

    test('removeOwner should return propose result', async () => {
      const result = await account.removeOwner(ACCOUNT_2.address)

      expect(result).toBeDefined()
      expect(result.safeOperationHash).toBe(MOCK_SAFE_OP_HASH)
    })

    test('swapOwner should return propose result', async () => {
      const result = await account.swapOwner(ACCOUNT.address, ACCOUNT_2.address)

      expect(result).toBeDefined()
      expect(result.safeOperationHash).toBe(MOCK_SAFE_OP_HASH)
    })

    test('changeThreshold should return propose result', async () => {
      const result = await account.changeThreshold(2)

      expect(result).toBeDefined()
      expect(result.safeOperationHash).toBe(MOCK_SAFE_OP_HASH)
    })
  })
})