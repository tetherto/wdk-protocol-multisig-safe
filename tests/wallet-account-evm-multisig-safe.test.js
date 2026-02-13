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

describe('WalletAccountEvmMultisigSafe', () => {
  let account

  beforeEach(() => {
    account = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
      ...MOCK_CONFIG,
      options: {
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

    test('should successfully initialize with ERC-20 paymaster options', () => {
      const erc20Account = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
          paymasterTokenAddress: '0xUSDC'
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      expect(erc20Account._config.paymasterOptions.paymasterTokenAddress).toBe('0xUSDC')
      expect(erc20Account._config.paymasterOptions.isSponsored).toBeUndefined()
      erc20Account.dispose()
    })

    test('should successfully initialize with sponsored paymaster and sponsorshipPolicyId', () => {
      const sponsoredAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
          isSponsored: true,
          sponsorshipPolicyId: 'sp_my_policy_123'
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      expect(sponsoredAccount._config.paymasterOptions.isSponsored).toBe(true)
      expect(sponsoredAccount._config.paymasterOptions.sponsorshipPolicyId).toBe('sp_my_policy_123')
      sponsoredAccount.dispose()
    })

    test('should successfully initialize with ExistingSafeOptions', () => {
      const existingAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        options: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(existingAccount._safeAddress).toBe(MOCK_SAFE_ADDRESS)
      existingAccount.dispose()
    })

    test('should successfully initialize with PredictedSafeOptions including saltNonce', () => {
      const predictedAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1,
          saltNonce: '0x1234'
        }
      })

      expect(predictedAccount._config.options.saltNonce).toBe('0x1234')
      predictedAccount.dispose()
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
   test('should return signature string', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockResolvedValue({
          messageHash: MOCK_MESSAGE_HASH,
          message: 'Hello!',
          confirmations: [{ owner: ACCOUNT.address }],
          preparedSignature: null
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.sign('Hello!')

      expect(result).toBe('0xmocksignature')
    })
  })

  describe('verify', () => {
    test('should return true for valid signature', async () => {
      const mockPack = createMockSafe4337Pack()
      mockPack.protocolKit.isValidSignature = jest.fn().mockResolvedValue(true)
      account._safe4337Pack = mockPack

      const result = await account.verify('Hello!', '0xvalidsignature')

      expect(result).toBe(true)
      expect(mockPack.protocolKit.isValidSignature).toHaveBeenCalled()
    })

    test('should return false for invalid signature', async () => {
      const mockPack = createMockSafe4337Pack()
      mockPack.protocolKit.isValidSignature = jest.fn().mockResolvedValue(false)
      account._safe4337Pack = mockPack

      const result = await account.verify('Hello!', '0xinvalidsignature')

      expect(result).toBe(false)
    })
  })

  describe('proposeMessage', () => {
    test('should propose new message and return MessageProposal', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockResolvedValue({
          messageHash: MOCK_MESSAGE_HASH,
          message: 'Hello!',
          confirmations: [{ owner: ACCOUNT.address }],
          preparedSignature: null
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.proposeMessage('Hello!')

      expect(result).toBeDefined()
      expect(result.messageHash).toBe(MOCK_MESSAGE_HASH)
      expect(result.signature).toBe('0xmocksignature')
      expect(result.confirmations).toBe(1)
      expect(result.threshold).toBe(1)
      expect(result.combinedSignature).toBeNull()
      expect(mockApiKit.addMessage).toHaveBeenCalledWith(
        MOCK_SAFE_ADDRESS,
        expect.objectContaining({
          message: 'Hello!',
          signature: '0xmocksignature'
        })
      )
    })
  })

  describe('approveMessage', () => {
    test('should approve existing message and return MessageProposal', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn()
          .mockResolvedValueOnce({
            message: 'Hello!',
            confirmations: [{ owner: ACCOUNT.address }],
            preparedSignature: null
          })
          .mockResolvedValueOnce({
            messageHash: MOCK_MESSAGE_HASH,
            message: 'Hello!',
            confirmations: [{ owner: ACCOUNT.address }, { owner: ACCOUNT_2.address }],
            preparedSignature: '0xcombinedsig'
          })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.approveMessage(MOCK_MESSAGE_HASH)

      expect(result).toBeDefined()
      expect(result.signature).toBe('0xmocksignature')
      expect(result.confirmations).toBe(2)
      expect(result.combinedSignature).toBe('0xcombinedsig')
      expect(mockApiKit.addMessageSignature).toHaveBeenCalledWith(
        MOCK_MESSAGE_HASH,
        '0xmocksignature'
      )
    })
  })

  describe('dispose', () => {
    test('should clear sensitive data', () => {
      const testAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        options: {
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
      expect(readOnlyAccount._config.options.safeAddress).toBe(MOCK_SAFE_ADDRESS)
    })
  })

  describe('propose', () => {
    test('should return propose result with proposalId', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit
      account._safeAddress = MOCK_SAFE_ADDRESS
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '0', data: '0x' }
      const result = await account.propose(tx)

      expect(result).toBeDefined()
      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
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

    test('should include amountToApprove in ERC-20 paymaster mode', async () => {
      const erc20Account = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
          paymasterTokenAddress: '0xUSDC'
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      erc20Account._safe4337Pack = mockPack
      erc20Account._apiKit = mockApiKit
      erc20Account._safeAddress = MOCK_SAFE_ADDRESS
      erc20Account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '0', data: '0x' }
      await erc20Account.propose(tx, { amountToApprove: 500000n })

      const callArgs = mockPack.createTransaction.mock.calls[0][0]
      expect(callArgs.options).toBeDefined()
      expect(callArgs.options.amountToApprove).toBe(500000n)

      erc20Account.dispose()
    })

    test('should NOT include amountToApprove in sponsored mode', async () => {
      const sponsoredAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
          isSponsored: true
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      sponsoredAccount._safe4337Pack = mockPack
      sponsoredAccount._apiKit = mockApiKit
      sponsoredAccount._safeAddress = MOCK_SAFE_ADDRESS
      sponsoredAccount.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '0', data: '0x' }
      await sponsoredAccount.propose(tx, { amountToApprove: 500000n })

      const callArgs = mockPack.createTransaction.mock.calls[0][0]
      expect(callArgs.options.amountToApprove).toBeUndefined()
      expect(callArgs.options.feeEstimator).toBeDefined()

      sponsoredAccount.dispose()
    })

    test('should override to sponsored mode via options', async () => {
      const erc20Account = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
          paymasterTokenAddress: '0xUSDC'
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      erc20Account._safe4337Pack = mockPack
      erc20Account._apiKit = mockApiKit
      erc20Account._safeAddress = MOCK_SAFE_ADDRESS
      erc20Account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)
      erc20Account._initSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const tx = { to: ACCOUNT_2.address, value: '0', data: '0x' }
      await erc20Account.propose(tx, { isSponsored: true, amountToApprove: 500000n })

      const callArgs = mockPack.createTransaction.mock.calls[0][0]
      expect(callArgs.options.amountToApprove).toBeUndefined()

      erc20Account.dispose()
    })

    test('should override to ERC-20 mode via options from sponsored config', async () => {
      const sponsoredAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
          isSponsored: true
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit()
      sponsoredAccount._safe4337Pack = mockPack
      sponsoredAccount._apiKit = mockApiKit
      sponsoredAccount._safeAddress = MOCK_SAFE_ADDRESS
      sponsoredAccount.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)
      sponsoredAccount._initSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const tx = { to: ACCOUNT_2.address, value: '0', data: '0x' }
      await sponsoredAccount.propose(tx, { isSponsored: false, amountToApprove: 500000n })

      const callArgs = mockPack.createTransaction.mock.calls[0][0]
      expect(callArgs.options).toBeDefined()
      expect(callArgs.options.amountToApprove).toBe(500000n)

      sponsoredAccount.dispose()
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

  describe('deploy', () => {
    test('should return hash and fee on successful deployment', async () => {
            const createSafeDeploymentTransaction = jest.fn().mockResolvedValue({
        to: '0xDeployFactory',
        value: '0',
        data: '0xdeploydata'
      })
      const sendTransaction = jest.fn().mockResolvedValue({ hash: MOCK_TX_HASH, fee: 210000n })
      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(false),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1),
          createSafeDeploymentTransaction
        }
      })
      account._safe4337Pack = mockPack
      account._signerAccount = {
        ...account._signerAccount,
        sendTransaction,
        dispose: jest.fn()
      }

      const result = await account.deploy()

      expect(result).toBeDefined()
      expect(result.hash).toBe(MOCK_TX_HASH)
      expect(result.fee).toBe(210000n)

            expect(createSafeDeploymentTransaction).toHaveBeenCalled()
      expect(sendTransaction).toHaveBeenCalledWith({
        to: '0xDeployFactory',
        value: 0n,
        data: '0xdeploydata'
      })
    })

    test('should throw if Safe is already deployed', async () => {
      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1)
        }
      })
      account._safe4337Pack = mockPack

      await expect(account.deploy())
        .rejects.toThrow('Safe is already deployed')
    })
  })
  
  describe('sendTransaction', () => {
    test('should return MultisigTransactionResult', async () => {
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

    test('should NOT pass amountToApprove in sponsored mode', async () => {
      const sponsoredAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
          isSponsored: true
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1)
        }
      })
      const mockApiKit = createMockApiKit()
      sponsoredAccount._safe4337Pack = mockPack
      sponsoredAccount._apiKit = mockApiKit
      sponsoredAccount._safeAddress = MOCK_SAFE_ADDRESS
      sponsoredAccount.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '1000', data: '0x' }
      await sponsoredAccount.sendTransaction(tx)

      const callArgs = mockPack.createTransaction.mock.calls[0][0]
      expect(callArgs.options.amountToApprove).toBeUndefined()

      sponsoredAccount.dispose()
    })

    test('should override to sponsored mode via options', async () => {
      const erc20Account = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
          paymasterTokenAddress: '0xUSDC'
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1)
        }
      })
      const mockApiKit = createMockApiKit()
      erc20Account._safe4337Pack = mockPack
      erc20Account._apiKit = mockApiKit
      erc20Account._safeAddress = MOCK_SAFE_ADDRESS
      erc20Account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)
      erc20Account._initSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const tx = { to: ACCOUNT_2.address, value: '1000', data: '0x' }
      await erc20Account.sendTransaction(tx, { isSponsored: true })

      const callArgs = mockPack.createTransaction.mock.calls[0][0]
      expect(callArgs.options.amountToApprove).toBeUndefined()

      erc20Account.dispose()
    })
  })

  describe('transfer', () => {
    test('should return MultisigTransactionResult', async () => {
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

      const transferOptions = {
        token: '0x956962C34687A954e611A83619ABaA37Ce6bC78A',
        recipient: ACCOUNT_2.address,
        amount: 1000n
      }
      const result = await account.transfer(transferOptions)

      expect(result).toBeDefined()
      expect(result.hash).toBe(MOCK_USER_OP_HASH)
      expect(result.fee).toBe(350000000000000n)
      expect(result.executed).toBe(true)
    })

    test('should NOT pass amountToApprove in sponsored mode', async () => {
      const sponsoredAccount = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=sponsor-key',
          isSponsored: true
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1)
        }
      })
      const mockApiKit = createMockApiKit()
      sponsoredAccount._safe4337Pack = mockPack
      sponsoredAccount._apiKit = mockApiKit
      sponsoredAccount._safeAddress = MOCK_SAFE_ADDRESS
      sponsoredAccount.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const transferOptions = {
        token: '0x956962C34687A954e611A83619ABaA37Ce6bC78A',
        recipient: ACCOUNT_2.address,
        amount: 1000n
      }
      await sponsoredAccount.transfer(transferOptions)

      const callArgs = mockPack.createTransaction.mock.calls[0][0]
      expect(callArgs.options.amountToApprove).toBeUndefined()

      sponsoredAccount.dispose()
    })

    test('should override to sponsored mode via options', async () => {
      const erc20Account = new WalletAccountEvmMultisigSafe(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
          paymasterTokenAddress: '0xUSDC'
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const mockPack = createMockSafe4337Pack({
        protocolKit: {
          getAddress: jest.fn().mockResolvedValue(MOCK_SAFE_ADDRESS),
          isSafeDeployed: jest.fn().mockResolvedValue(true),
          getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
          getThreshold: jest.fn().mockResolvedValue(1)
        }
      })
      const mockApiKit = createMockApiKit()
      erc20Account._safe4337Pack = mockPack
      erc20Account._apiKit = mockApiKit
      erc20Account._safeAddress = MOCK_SAFE_ADDRESS
      erc20Account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)
      erc20Account._initSafe4337Pack = jest.fn().mockResolvedValue(mockPack)

      const transferOptions = {
        token: '0x956962C34687A954e611A83619ABaA37Ce6bC78A',
        recipient: ACCOUNT_2.address,
        amount: 1000n
      }
      await erc20Account.transfer(transferOptions, { isSponsored: true })

      const callArgs = mockPack.createTransaction.mock.calls[0][0]
      expect(callArgs.options.amountToApprove).toBeUndefined()

      erc20Account.dispose()
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

  describe('getMessage', () => {
    test('should return MessageInfo with signature', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockResolvedValue({
          messageHash: MOCK_MESSAGE_HASH,
          message: 'Hello!',
          confirmations: [{ owner: ACCOUNT.address }],
          preparedSignature: '0xpreparedsig'
        })
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit

      const result = await account.getMessage(MOCK_MESSAGE_HASH)

      expect(result).toBeDefined()
      expect(result.messageHash).toBe(MOCK_MESSAGE_HASH)
      expect(result.message).toBe('Hello!')
      expect(result.confirmations).toBe(1)
      expect(result.threshold).toBe(1)
      expect(result.combinedSignature).toBe('0xpreparedsig')
    })

    test('should return null when message not found', async () => {
      const mockPack = createMockSafe4337Pack()
      const mockApiKit = createMockApiKit({
        getMessage: jest.fn().mockRejectedValue(new Error('not found'))
      })
      account._safe4337Pack = mockPack
      account._apiKit = mockApiKit

      const result = await account.getMessage(MOCK_MESSAGE_HASH)

      expect(result).toBeNull()
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
      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
    })

    test('removeOwner should return propose result', async () => {
      const result = await account.removeOwner(ACCOUNT_2.address)

      expect(result).toBeDefined()
      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
    })

    test('swapOwner should return propose result', async () => {
      const result = await account.swapOwner(ACCOUNT.address, ACCOUNT_2.address)

      expect(result).toBeDefined()
      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
    })

    test('changeThreshold should return propose result', async () => {
      const result = await account.changeThreshold(2)

      expect(result).toBeDefined()
      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
    })
  })
})