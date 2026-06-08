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

import { TypedDataEncoder } from 'ethers'

import { afterEach, beforeEach, describe, expect, test, jest } from '@jest/globals'

import {
  WalletAccountMultisigEvmSafe4337,
  WalletAccountReadOnlyMultisigEvmSafe4337
} from '../index.js'

const SEED_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
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
  provider: 'https://rpc.dummy-network.example/v3/dummy-key',
  bundlerUrl: 'https://bundler.dummy-network.example/rpc?apikey=dummy-key',
  chainId: 11155111n
}

const MOCK_SAFE_ADDRESS = '0x1234567890123456789012345678901234567890'
const MOCK_SAFE_OP_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
const MOCK_USER_OP_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
const MOCK_TX_HASH = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'
const MOCK_MESSAGE_HASH = '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678'
const MOCK_FEE = 350000000000000n
const VALID_SIGNATURE = '0x' + '11'.repeat(65)
const EIP1271_MAGIC_VALUE = '0x1626ba7e'

const MOCK_MESSAGE_EIP712 = {
  domain: { chainId: 11155111, verifyingContract: MOCK_SAFE_ADDRESS },
  types: { SafeMessage: [{ type: 'bytes', name: 'message' }] },
  messageValue: { message: '0x' + 'ab'.repeat(32) }
}
const EXPECTED_MESSAGE_HASH = TypedDataEncoder.hash(
  MOCK_MESSAGE_EIP712.domain,
  MOCK_MESSAGE_EIP712.types,
  MOCK_MESSAGE_EIP712.messageValue
)

const createMockSmartAccount = (overrides = {}) => ({
  getOwners: jest.fn().mockResolvedValue([ACCOUNT.address]),
  getThreshold: jest.fn().mockResolvedValue(1),
  signUserOperationWithSigners: jest.fn().mockResolvedValue('0xformattedsignature'),
  getSafeMessageEip712Data: jest.fn().mockReturnValue(MOCK_MESSAGE_EIP712),
  createStandardAddOwnerWithThresholdMetaTransaction: jest.fn().mockReturnValue({ to: MOCK_SAFE_ADDRESS, value: 0n, data: '0xaddowner' }),
  createRemoveOwnerMetaTransaction: jest.fn().mockResolvedValue({ to: MOCK_SAFE_ADDRESS, value: 0n, data: '0xremoveowner' }),
  createSwapOwnerMetaTransactions: jest.fn().mockResolvedValue([{ to: MOCK_SAFE_ADDRESS, value: 0n, data: '0xswapowner' }]),
  createChangeThresholdMetaTransaction: jest.fn().mockReturnValue({ to: MOCK_SAFE_ADDRESS, value: 0n, data: '0xchangethreshold' }),
  ...overrides
})

const createMockTransport = (overrides = {}) => ({
  submitProposal: jest.fn().mockResolvedValue(undefined),
  getProposal: jest.fn().mockResolvedValue({
    confirmations: [{ owner: ACCOUNT.address }],
    userOperation: { nonce: '0' },
    preparedSignature: '0xpreparedsignature'
  }),
  confirmProposal: jest.fn().mockResolvedValue(undefined),
  submitMessage: jest.fn().mockResolvedValue(undefined),
  confirmMessage: jest.fn().mockResolvedValue(undefined),
  getMessage: jest.fn().mockResolvedValue({
    messageHash: MOCK_MESSAGE_HASH,
    message: 'Hello!',
    confirmations: [{ owner: ACCOUNT.address }],
    preparedSignature: '0xmessagesignature'
  }),
  ...overrides
})

const createMockBundler = () => ({
  sendUserOperation: jest.fn().mockResolvedValue(MOCK_USER_OP_HASH)
})

describe('WalletAccountMultisigEvmSafe4337', () => {
  let account

  beforeEach(() => {
    account = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
      ...MOCK_CONFIG,
      safeOptions: {
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
      const erc20Account = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterUrl: 'https://paymaster.dummy-network.example/rpc?apikey=dummy-key',
        paymasterTokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      expect(erc20Account._config.paymasterTokenAddress).toBe('0x1234567890abcdef1234567890abcdef12345678')
      expect(erc20Account._config.isSponsored).toBeUndefined()
      erc20Account.dispose()
    })

    test('should successfully initialize with sponsored paymaster and sponsorshipPolicyId', () => {
      const sponsoredAccount = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterUrl: 'https://paymaster.dummy-network.example/rpc?apikey=sponsor-key',
        isSponsored: true,
        sponsorshipPolicyId: 'sp_my_policy_123',
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      expect(sponsoredAccount._config.isSponsored).toBe(true)
      expect(sponsoredAccount._config.sponsorshipPolicyId).toBe('sp_my_policy_123')
      sponsoredAccount.dispose()
    })

    test('should successfully initialize with ExistingSafeOptions', () => {
      const existingAccount = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        safeOptions: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(existingAccount._safeAddress).toBe(MOCK_SAFE_ADDRESS)
      existingAccount.dispose()
    })

    test('should successfully initialize with PredictedSafeOptions including saltNonce', () => {
      const predictedAccount = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1,
          saltNonce: '0x1234'
        }
      })

      expect(predictedAccount._config.safeOptions.saltNonce).toBe('0x1234')
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
      account._getSmartAccount = jest.fn().mockResolvedValue(createMockSmartAccount())
      account._signDigest = jest.fn().mockReturnValue('0xmocksignature')
      account._transport = createMockTransport()
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 1
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.sign('Hello!')

      expect(result).toBe('0xmocksignature')
    })
  })

  describe('verify', () => {
    test('should return true for valid signature', async () => {
      account._provider = { request: jest.fn().mockResolvedValue(EIP1271_MAGIC_VALUE + '0'.repeat(56)) }
      account._safeAddress = MOCK_SAFE_ADDRESS

      const result = await account.verify('Hello!', VALID_SIGNATURE)

      expect(result).toBe(true)
    })

    test('should return false for invalid signature', async () => {
      account._provider = { request: jest.fn().mockResolvedValue('0x' + '0'.repeat(64)) }
      account._safeAddress = MOCK_SAFE_ADDRESS

      const result = await account.verify('Hello!', VALID_SIGNATURE)

      expect(result).toBe(false)
    })
  })

  describe('proposeMessage', () => {
    test('should propose new message and return MessageProposal', async () => {
      const mockTransport = createMockTransport({
        getMessage: jest.fn().mockResolvedValue({
          messageHash: EXPECTED_MESSAGE_HASH,
          message: 'Hello!',
          confirmations: [{ owner: ACCOUNT.address }],
          preparedSignature: null
        })
      })
      account._getSmartAccount = jest.fn().mockResolvedValue(createMockSmartAccount())
      account._signDigest = jest.fn().mockReturnValue('0xmocksignature')
      account._transport = mockTransport
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 1
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.proposeMessage('Hello!')

      expect(result.messageHash).toBe(EXPECTED_MESSAGE_HASH)
      expect(result.signature).toBe('0xmocksignature')
      expect(result.confirmations).toBe(1)
      expect(result.threshold).toBe(1)
      expect(result.combinedSignature).toBeNull()
      expect(mockTransport.submitMessage).toHaveBeenCalledWith(
        MOCK_SAFE_ADDRESS,
        expect.objectContaining({ message: 'Hello!', signature: '0xmocksignature' })
      )
    })
  })

  describe('approveMessage', () => {
    test('should approve existing message and return MessageProposal', async () => {
      const mockTransport = createMockTransport({
        getMessage: jest.fn()
          .mockResolvedValueOnce({
            message: 'Hello!',
            confirmations: [{ owner: ACCOUNT.address }],
            preparedSignature: null
          })
          .mockResolvedValueOnce({
            messageHash: EXPECTED_MESSAGE_HASH,
            message: 'Hello!',
            confirmations: [{ owner: ACCOUNT.address }, { owner: ACCOUNT_2.address }],
            preparedSignature: '0xcombinedsig'
          })
      })
      account._getSmartAccount = jest.fn().mockResolvedValue(createMockSmartAccount())
      account._signDigest = jest.fn().mockReturnValue('0xmocksignature')
      account._transport = mockTransport
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 2
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.approveMessage(EXPECTED_MESSAGE_HASH)

      expect(result.signature).toBe('0xmocksignature')
      expect(result.confirmations).toBe(2)
      expect(result.combinedSignature).toBe('0xcombinedsig')
      expect(mockTransport.confirmMessage).toHaveBeenCalledWith(
        EXPECTED_MESSAGE_HASH,
        '0xmocksignature'
      )
    })
  })

  describe('dispose', () => {
    test('should clear sensitive data', () => {
      const testAccount = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      testAccount.dispose()

      expect(testAccount._signerAccount).toBe(null)
      expect(testAccount._transport).toBe(null)
    })
  })

  describe('toReadOnlyAccount', () => {
    test('should return a WalletAccountReadOnlyMultisigEvmSafe4337 instance', async () => {
      account._safeAddress = MOCK_SAFE_ADDRESS

      const readOnlyAccount = await account.toReadOnlyAccount()

      expect(readOnlyAccount).toBeInstanceOf(WalletAccountReadOnlyMultisigEvmSafe4337)
      expect(readOnlyAccount._config.provider).toBe(MOCK_CONFIG.provider)
      expect(readOnlyAccount._config.chainId).toBe(MOCK_CONFIG.chainId)
      expect(readOnlyAccount._config.safeOptions.safeAddress).toBe(MOCK_SAFE_ADDRESS)
    })
  })

  describe('approveTx', () => {
    test('should return approval result with confirmations', async () => {
      const mockTransport = createMockTransport({
        getProposal: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }, { owner: ACCOUNT_2.address }],
          userOperation: { nonce: '0' },
          preparedSignature: '0xsignature'
        })
      })
      account._transport = mockTransport
      account._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      account._signDigest = jest.fn().mockReturnValue('0xrawsig')
      account._threshold = 2
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.approveTx(MOCK_SAFE_OP_HASH)

      expect(result.confirmations).toBe(2)
    })

    test('should call confirmProposal on transport', async () => {
      const mockTransport = createMockTransport()
      account._transport = mockTransport
      account._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      account._signDigest = jest.fn().mockReturnValue('0xrawsig')
      account._threshold = 1
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      await account.approveTx(MOCK_SAFE_OP_HASH)

      expect(mockTransport.confirmProposal).toHaveBeenCalledWith(MOCK_SAFE_OP_HASH, '0xrawsig')
    })
  })

  describe('rejectTx', () => {
    test('should return rejection result with proposalId', async () => {
      const mockTransport = createMockTransport({
        getProposal: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }],
          userOperation: { nonce: '5' },
          preparedSignature: '0xsignature'
        })
      })
      account._transport = mockTransport
      account._createSafeOperation = jest.fn().mockResolvedValue({ userOp: {}, smartAccount: createMockSmartAccount(), chainId: 11155111n })
      account._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 1
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const result = await account.rejectTx(MOCK_SAFE_OP_HASH)

      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
      expect(result.confirmations).toBe(1)
      expect(result.threshold).toBe(1)
    })

    test('should pass customNonce from original proposal', async () => {
      const mockTransport = createMockTransport({
        getProposal: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }],
          userOperation: { nonce: '42' },
          preparedSignature: '0xsignature'
        })
      })
      account._transport = mockTransport
      account._createSafeOperation = jest.fn().mockResolvedValue({ userOp: {}, smartAccount: createMockSmartAccount(), chainId: 11155111n })
      account._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 1
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      await account.rejectTx(MOCK_SAFE_OP_HASH)

      expect(account._createSafeOperation).toHaveBeenCalledWith(
        expect.objectContaining({ to: MOCK_SAFE_ADDRESS, value: '0', data: '0x' }),
        { customNonce: 42n }
      )
    })

    test('should throw if proposal not found', async () => {
      account._transport = createMockTransport({
        getProposal: jest.fn().mockResolvedValue(null)
      })
      account._safeAddress = MOCK_SAFE_ADDRESS

      await expect(account.rejectTx(MOCK_SAFE_OP_HASH))
        .rejects.toThrow(`SafeOperation not found: ${MOCK_SAFE_OP_HASH}`)
    })

    test('should throw if original proposal has no nonce', async () => {
      account._transport = createMockTransport({
        getProposal: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }],
          userOperation: {}
        })
      })
      account._safeAddress = MOCK_SAFE_ADDRESS

      await expect(account.rejectTx(MOCK_SAFE_OP_HASH))
        .rejects.toThrow('Cannot reject: original proposal has no nonce')
    })
  })

  describe('executeTx', () => {
    test('should return execute result with hash', async () => {
      account._transport = createMockTransport()
      account._getBundler = jest.fn().mockReturnValue(createMockBundler())
      account._threshold = 1

      const result = await account.executeTx(MOCK_SAFE_OP_HASH)

      expect(result.hash).toBe(MOCK_USER_OP_HASH)
    })

    test('should call sendUserOperation on the bundler', async () => {
      const mockBundler = createMockBundler()
      account._transport = createMockTransport()
      account._getBundler = jest.fn().mockReturnValue(mockBundler)
      account._threshold = 1

      await account.executeTx(MOCK_SAFE_OP_HASH)

      expect(mockBundler.sendUserOperation).toHaveBeenCalled()
    })

    test('should throw if not enough confirmations', async () => {
      account._transport = createMockTransport({
        getProposal: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }],
          userOperation: { nonce: '0' }
        })
      })
      account._threshold = 2

      await expect(account.executeTx(MOCK_SAFE_OP_HASH))
        .rejects.toThrow('Not enough confirmations')
    })
  })

  describe('deploy', () => {
    test('should return hash and fee on successful deployment', async () => {
      const sendTransaction = jest.fn().mockResolvedValue({ hash: MOCK_TX_HASH, fee: 210000n })
      account.isDeployed = jest.fn().mockResolvedValue(false)
      account._buildDeploymentTransaction = jest.fn().mockReturnValue({
        to: '0xDeployFactory',
        value: 0n,
        data: '0xdeploydata'
      })
      account._signerAccount = {
        ...account._signerAccount,
        sendTransaction,
        dispose: jest.fn()
      }

      const result = await account.deploy()

      expect(result.hash).toBe(MOCK_TX_HASH)
      expect(result.fee).toBe(210000n)
      expect(sendTransaction).toHaveBeenCalledWith({
        to: '0xDeployFactory',
        value: 0n,
        data: '0xdeploydata'
      })
    })

    test('should throw if Safe is already deployed', async () => {
      account.isDeployed = jest.fn().mockResolvedValue(true)

      await expect(account.deploy())
        .rejects.toThrow('Safe is already deployed')
    })
  })

  describe('sendTransaction', () => {
    test('should return MultisigTransactionResult and auto-execute when threshold met', async () => {
      account.quoteSendTransaction = jest.fn().mockResolvedValue({ fee: MOCK_FEE })
      account._createSafeOperation = jest.fn().mockResolvedValue({ userOp: {}, smartAccount: createMockSmartAccount(), chainId: 11155111n })
      account._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      account._transport = createMockTransport()
      account._getBundler = jest.fn().mockReturnValue(createMockBundler())
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 1
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '1000', data: '0x' }
      const result = await account.sendTransaction(tx, { autoExecute: true })

      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
      expect(result.hash).toBe(MOCK_USER_OP_HASH)
      expect(result.fee).toBe(MOCK_FEE)
      expect(result.confirmations).toBe(1)
      expect(result.threshold).toBe(1)
      expect(result.executed).toBe(true)
    })

    test('should not auto-execute when threshold not met', async () => {
      account.quoteSendTransaction = jest.fn().mockResolvedValue({ fee: MOCK_FEE })
      account._createSafeOperation = jest.fn().mockResolvedValue({ userOp: {}, smartAccount: createMockSmartAccount(), chainId: 11155111n })
      account._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      account._transport = createMockTransport({
        getProposal: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }],
          userOperation: { nonce: '0' },
          preparedSignature: '0xsignature'
        })
      })
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 2
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '1000', data: '0x' }
      const result = await account.sendTransaction(tx)

      expect(result.executed).toBe(false)
      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
    })

    test('should quote a zero fee in sponsored mode', async () => {
      const sponsoredAccount = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterUrl: 'https://paymaster.dummy-network.example/rpc?apikey=sponsor-key',
        isSponsored: true,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })
      sponsoredAccount._createSafeOperation = jest.fn().mockResolvedValue({ userOp: {}, smartAccount: createMockSmartAccount(), chainId: 11155111n })
      sponsoredAccount._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      sponsoredAccount._transport = createMockTransport()
      sponsoredAccount._getBundler = jest.fn().mockReturnValue(createMockBundler())
      sponsoredAccount._safeAddress = MOCK_SAFE_ADDRESS
      sponsoredAccount._threshold = 1
      sponsoredAccount.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const tx = { to: ACCOUNT_2.address, value: '1000', data: '0x' }
      const result = await sponsoredAccount.sendTransaction(tx, { autoExecute: true })

      expect(result.fee).toBe(0n)

      sponsoredAccount.dispose()
    })
  })

  describe('transfer', () => {
    test('should return MultisigTransactionResult', async () => {
      account.quoteSendTransaction = jest.fn().mockResolvedValue({ fee: MOCK_FEE })
      account._createSafeOperation = jest.fn().mockResolvedValue({ userOp: {}, smartAccount: createMockSmartAccount(), chainId: 11155111n })
      account._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      account._transport = createMockTransport()
      account._getBundler = jest.fn().mockReturnValue(createMockBundler())
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 1
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const transferOptions = {
        token: '0x956962C34687A954e611A83619ABaA37Ce6bC78A',
        recipient: ACCOUNT_2.address,
        amount: 1000n
      }
      const result = await account.transfer(transferOptions, { autoExecute: true })

      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
      expect(result.hash).toBe(MOCK_USER_OP_HASH)
      expect(result.fee).toBe(MOCK_FEE)
      expect(result.executed).toBe(true)
    })

    test('should throw when the fee exceeds transferMaxFee', async () => {
      const erc20Account = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        paymasterUrl: 'https://paymaster.dummy-network.example/rpc?apikey=dummy-key',
        paymasterTokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        transferMaxFee: 1n,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })
      erc20Account.quoteSendTransaction = jest.fn().mockResolvedValue({ fee: MOCK_FEE })
      erc20Account._safeAddress = MOCK_SAFE_ADDRESS
      erc20Account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const transferOptions = {
        token: '0x956962C34687A954e611A83619ABaA37Ce6bC78A',
        recipient: ACCOUNT_2.address,
        amount: 1000n
      }

      await expect(erc20Account.transfer(transferOptions))
        .rejects.toThrow('Exceeded maximum fee cost for transfer operation.')

      erc20Account.dispose()
    })
  })

  describe('Owner Management', () => {
    let mockSmartAccount

    beforeEach(() => {
      mockSmartAccount = createMockSmartAccount()
      account._getSmartAccount = jest.fn().mockResolvedValue(mockSmartAccount)
      account._createSafeOperation = jest.fn().mockResolvedValue({ userOp: {}, smartAccount: mockSmartAccount, chainId: 11155111n })
      account._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      account._transport = createMockTransport()
      account._safeAddress = MOCK_SAFE_ADDRESS
      account._threshold = 1
      account.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)
    })

    test('addOwner should return propose result', async () => {
      const result = await account.addOwner(ACCOUNT_2.address)

      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
      expect(mockSmartAccount.createStandardAddOwnerWithThresholdMetaTransaction).toHaveBeenCalled()
    })

    test('removeOwner should return propose result', async () => {
      const result = await account.removeOwner(ACCOUNT_2.address)

      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
      expect(mockSmartAccount.createRemoveOwnerMetaTransaction).toHaveBeenCalled()
    })

    test('swapOwner should return propose result', async () => {
      const result = await account.swapOwner(ACCOUNT.address, ACCOUNT_2.address)

      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
      expect(mockSmartAccount.createSwapOwnerMetaTransactions).toHaveBeenCalled()
    })

    test('changeThreshold should return propose result', async () => {
      const result = await account.changeThreshold(1)

      expect(result.proposalId).toBe(MOCK_SAFE_OP_HASH)
      expect(mockSmartAccount.createChangeThresholdMetaTransaction).toHaveBeenCalled()
    })
  })

  describe('custom transport injection', () => {
    test('should route proposal sharing through the injected transport', async () => {
      const customTransport = createMockTransport({
        getProposal: jest.fn().mockResolvedValue({
          confirmations: [{ owner: ACCOUNT.address }, { owner: ACCOUNT_2.address }],
          userOperation: { nonce: '0' },
          preparedSignature: '0xpreparedsignature'
        })
      })

      const customAccount = new WalletAccountMultisigEvmSafe4337(SEED_PHRASE, "0'/0/0", {
        ...MOCK_CONFIG,
        transport: customTransport,
        safeOptions: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      customAccount.quoteSendTransaction = jest.fn().mockResolvedValue({ fee: MOCK_FEE })
      customAccount._createSafeOperation = jest.fn().mockResolvedValue({ userOp: {}, smartAccount: createMockSmartAccount(), chainId: 11155111n })
      customAccount._getProposalId = jest.fn().mockReturnValue(MOCK_SAFE_OP_HASH)
      customAccount._signDigest = jest.fn().mockReturnValue('0xrawsig')
      customAccount._getBundler = jest.fn().mockReturnValue(createMockBundler())
      customAccount._safeAddress = MOCK_SAFE_ADDRESS
      customAccount._threshold = 1
      customAccount.validateSignerIsOwner = jest.fn().mockResolvedValue(undefined)

      const proposeResult = await customAccount.sendTransaction({
        to: ACCOUNT_2.address,
        value: '1000',
        data: '0x'
      })

      expect(customTransport.submitProposal).toHaveBeenCalled()
      expect(customTransport.getProposal).toHaveBeenCalledWith(MOCK_SAFE_OP_HASH)
      expect(proposeResult.proposalId).toBe(MOCK_SAFE_OP_HASH)

      await customAccount.approveTx(MOCK_SAFE_OP_HASH)

      expect(customTransport.confirmProposal).toHaveBeenCalledWith(MOCK_SAFE_OP_HASH, '0xrawsig')

      customAccount.dispose()
    })
  })
})
