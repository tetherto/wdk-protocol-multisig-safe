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

import WalletManagerEvmMultisigSafe, {
  WalletAccountEvmMultisigSafe
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

const MOCK_CONFIG = {
  provider: 'https://sepolia.infura.io/v3/test-key',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test-key',
  chainId: 11155111n,
  safeAccountConfig: {
    owners: [ACCOUNT.address],
    threshold: 1
  }
}

// ============================================
// WalletManagerEvmMultisigSafe Tests
// ============================================

describe('WalletManagerEvmMultisigSafe', () => {
  let manager

  beforeEach(() => {
    manager = new WalletManagerEvmMultisigSafe(SEED_PHRASE, MOCK_CONFIG)
  })

  afterEach(() => {
    if (manager) {
      manager.dispose()
    }
  })

  describe('constructor', () => {
    test('should successfully initialize with seed phrase', () => {
      expect(manager).toBeDefined()
      expect(Buffer.from(manager.seed).toString('hex')).toBe('5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4')
      expect(manager._config).toBe(MOCK_CONFIG)
    })

    test('should throw if the seed phrase is invalid', () => {
      expect(() => {
        new WalletManagerEvmMultisigSafe(INVALID_SEED_PHRASE, MOCK_CONFIG)
      }).toThrow()
    })
  })

  describe('getAccount', () => {
    test('should return WalletAccountEvmMultisigSafe instance', async () => {
      const account = await manager.getAccount(0)

      expect(account).toBeInstanceOf(WalletAccountEvmMultisigSafe)
    })

    test('should return account at specified index', async () => {
      const account = await manager.getAccount(5)

      expect(account.index).toBe(5)
    })

    test('should return accounts with correct derivation path', async () => {
      const account = await manager.getAccount(3)

      expect(account.path).toBe("m/44'/60'/0'/0/3")
    })
  })

  describe('getAccountByPath', () => {
    test('should return account with correct path', async () => {
      const account = await manager.getAccountByPath("0'/0/5")

      expect(account.path).toBe("m/44'/60'/0'/0/5")
    })
  })

  describe('getFeeRates', () => {
    test('should throw if provider is not set', async () => {
      const configWithoutProvider = {
        bundlerUrl: MOCK_CONFIG.bundlerUrl,
        chainId: MOCK_CONFIG.chainId,
        safeAccountConfig: MOCK_CONFIG.safeAccountConfig
      }

      const managerNoProvider = new WalletManagerEvmMultisigSafe(SEED_PHRASE, configWithoutProvider)

      await expect(managerNoProvider.getFeeRates())
        .rejects.toThrow('The wallet must be connected to a provider to get fee rates.')

      managerNoProvider.dispose()
    })

    test('should return fee rates when provider is mocked', async () => {
      manager._provider = {
        getFeeData: jest.fn().mockResolvedValue({
          maxFeePerGas: 1000000000n
        })
      }

      const feeRates = await manager.getFeeRates()

      expect(feeRates).toBeDefined()
      expect(feeRates.normal).toBe(1100000000n)
      expect(feeRates.fast).toBe(2000000000n)
    })
  })

  describe('dispose', () => {
    test('should dispose a cached account', async () => {
      const account = await manager.getAccount(0)

      const spy = jest.spyOn(account, 'dispose')

      manager.dispose()

      expect(spy).toHaveBeenCalled()
    })
  })
})