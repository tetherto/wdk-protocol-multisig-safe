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

import { describe, expect, test } from '@jest/globals'

import WalletManagerEvmMultisigSafe, {
  WalletAccountEvmMultisigSafe,
  WalletAccountReadOnlyEvmMultisigSafe
} from '../index.js'

const SEED_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

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

describe('WalletManagerEvmMultisigSafe', () => {
  describe('constructor', () => {
    test('should successfully initialize with seed phrase and PredictedSafeOptions', () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      expect(manager).toBeDefined()
      expect(manager._config.options.owners).toEqual([ACCOUNT.address])
      expect(manager._config.options.threshold).toBe(1)
    })

    test('should successfully initialize with ExistingSafeOptions', () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          safeAddress: MOCK_SAFE_ADDRESS
        }
      })

      expect(manager).toBeDefined()
      expect(manager._config.options.safeAddress).toBe(MOCK_SAFE_ADDRESS)
    })

    test('should successfully initialize with ERC-20 paymaster options', () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        paymasterOptions: {
          paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
          paymasterAddress: '0x000000000041F3aFe8892B48D88b6862efe0ec8d',
          paymasterTokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
        },
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      expect(manager._config.paymasterOptions.paymasterTokenAddress).toBe('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238')
      expect(manager._config.paymasterOptions.paymasterAddress).toBe('0x000000000041F3aFe8892B48D88b6862efe0ec8d')
    })

    test('should successfully initialize with sponsored paymaster options', () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
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

      expect(manager._config.paymasterOptions.isSponsored).toBe(true)
      expect(manager._config.paymasterOptions.sponsorshipPolicyId).toBe('sp_my_policy_123')
    })

    test('should successfully initialize with PredictedSafeOptions including saltNonce', () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1,
          saltNonce: '0x1234567890'
        }
      })

      expect(manager._config.options.saltNonce).toBe('0x1234567890')
    })

    test('should successfully initialize with PredictedSafeOptions including safeVersion', () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1,
          safeVersion: '1.4.1'
        }
      })

      expect(manager._config.options.safeVersion).toBe('1.4.1')
    })
  })

  describe('getAccount', () => {
    test('should return WalletAccountEvmMultisigSafe instance', async () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const account = await manager.getAccount(0)

      expect(account).toBeInstanceOf(WalletAccountEvmMultisigSafe)
    })

    test('should return the same instance for the same index', async () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const account1 = await manager.getAccount(0)
      const account2 = await manager.getAccount(0)

      expect(account1).toBe(account2)
    })

    test('should return different instances for different indices', async () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const account0 = await manager.getAccount(0)
      const account1 = await manager.getAccount(1)

      expect(account0).not.toBe(account1)
    })
  })

  describe('getAccountByPath', () => {
    test('should return WalletAccountEvmMultisigSafe instance for custom path', async () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const account = await manager.getAccountByPath("0'/0/5")

      expect(account).toBeInstanceOf(WalletAccountEvmMultisigSafe)
      expect(account.path).toBe("m/44'/60'/0'/0/5")
    })

    test('should cache accounts by path', async () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const account1 = await manager.getAccountByPath("0'/0/5")
      const account2 = await manager.getAccountByPath("0'/0/5")

      expect(account1).toBe(account2)
    })
  })

  describe('dispose', () => {
    test('should dispose all accounts', async () => {
      const manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, {
        ...MOCK_CONFIG,
        options: {
          owners: [ACCOUNT.address],
          threshold: 1
        }
      })

      const account0 = await manager.getAccount(0)
      const account1 = await manager.getAccount(1)

      manager.dispose()

      expect(account0._signerAccount).toBe(null)
      expect(account1._signerAccount).toBe(null)
    })
  })

  describe('exports', () => {
    test('should export WalletAccountEvmMultisigSafe', () => {
      expect(WalletAccountEvmMultisigSafe).toBeDefined()
    })

    test('should export WalletAccountReadOnlyEvmMultisigSafe', () => {
      expect(WalletAccountReadOnlyEvmMultisigSafe).toBeDefined()
    })

    test('should export default WalletManagerEvmMultisigSafe', () => {
      expect(WalletManagerEvmMultisigSafe).toBeDefined()
    })
  })
})
