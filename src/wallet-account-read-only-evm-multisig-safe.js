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

import { keccak256, toUtf8Bytes } from 'ethers'

import { WalletAccountReadOnly } from '@tetherto/wdk-wallet'

import { WalletAccountReadOnlyEvm } from '@tetherto/wdk-wallet-evm'

import { Safe4337Pack } from '@wdk-safe-global/relay-kit'

import SafeApiKit from '@safe-global/api-kit'

/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferResult} TransferResult */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransactionReceipt} EvmTransactionReceipt */

/** @typedef {import('@safe-global/api-kit').GetSafeOperationListOptions} GetSafeOperationListOptions */
/** @typedef {import('@safe-global/api-kit').GetSafeOperationListResponse} GetSafeOperationListResponse */
/** @typedef {import('@safe-global/api-kit').SafeMultisigTransactionListResponse} SafeMultisigTransactionListResponse */
/** @typedef {import('@safe-global/api-kit').SafeMessageListResponse} SafeMessageListResponse */
/** @typedef {import('@safe-global/api-kit').TransferListResponse} TransferListResponse */
/** @typedef {import('@safe-global/api-kit').ListOptions} ListOptions */

/** @typedef {import('@safe-global/types-kit').SafeOperationResponse} SafeOperationResponse */
/** @typedef {import('@safe-global/types-kit').SafeMessage} SafeMessage */

/**
 * @typedef {Object} ProposeOptions
 * @property {number | bigint} [amountToApprove] - Amount to approve for paymaster (ignored in sponsored mode)
 * @property {boolean} [isSponsored] - Override to use sponsored mode
 * @property {string} [sponsorshipPolicyId] - Override sponsorship policy
 * @property {string} [paymasterTokenAddress] - Override token for ERC-20 paymaster
 */

/**
 * @typedef {Object} PaymasterOptions
 * @property {string} paymasterUrl - Paymaster service URL
 * @property {string} [paymasterAddress] - Paymaster contract address
 * @property {string} [paymasterTokenAddress] - Token address for ERC-20 paymaster payments
 * @property {boolean} [isSponsored] - Enable sponsored mode (sponsor pays gas)
 * @property {string} [sponsorshipPolicyId] - Sponsorship policy ID for sponsored mode
 */

/**
 * @typedef {Object} SafeAccountConfig
 * @property {string[]} owners - Array of owner addresses
 * @property {number} threshold - Number of required signatures
 */

/**
 * @typedef {Object} SafeDeploymentConfig
 * @property {string} [saltNonce] - Salt nonce for deterministic deployment
 */

/**
 * @typedef {Object} EvmMultisigSafeConfig
 * @property {string | Eip1193Provider} provider - RPC URL or EIP-1193 provider
 * @property {string} bundlerUrl - ERC-4337 bundler URL
 * @property {bigint} chainId - Chain ID
 * @property {string} [entryPointAddress] - EntryPoint contract address
 * @property {string} [safeModulesVersion='0.2.0'] - Safe modules version
 * @property {PaymasterOptions} [paymasterOptions] - Paymaster configuration
 * @property {string} [txServiceUrl] - Custom Safe Transaction Service URL
 * @property {string} [safeApiKey] - Safe API key
 * @property {string} [safeAddress] - Existing Safe address (import mode)
 * @property {SafeAccountConfig} [safeAccountConfig] - Safe account config (create mode)
 * @property {SafeDeploymentConfig} [safeDeploymentConfig] - Safe deployment config (create mode)
 * @property {number | bigint} [transferMaxFee] - Maximum fee for transfers
 */

/**
 * @typedef {Object} SafeInfo
 * @property {string} address - Safe address
 * @property {string[]} owners - Array of owner addresses
 * @property {number} threshold - Number of required signatures
 * @property {string} nonce - Current nonce
 * @property {string} version - Safe contract version
 * @property {boolean} isDeployed - Whether Safe is deployed
 */

/**
 * @typedef {Object} SafesByOwnerConfig
 * @property {bigint} chainId - Chain ID
 * @property {string} [txServiceUrl] - Custom Safe Transaction Service URL
 * @property {string} [safeApiKey] - Safe API key
 */

/** @typedef {Omit<EvmMultisigSafeConfig, 'transferMaxFee'>} EvmMultisigSafeReadOnlyConfig */

export const DEFAULT_SAFE_MODULES_VERSION = '0.2.0'

/**
 * Creates SafeApiKit configuration from config object.
 *
 * @private
 * @param {Object} config - Configuration object
 * @param {bigint} config.chainId - Chain ID
 * @param {string} [config.txServiceUrl] - Custom Safe Transaction Service URL
 * @param {string} [config.safeApiKey] - Safe API key
 * @returns {Object} SafeApiKit configuration
 */
function createApiKitConfig (config) {
  const apiKitConfig = {
    chainId: config.chainId
  }

  if (config.txServiceUrl) {
    apiKitConfig.txServiceUrl = config.txServiceUrl
  }

  if (config.safeApiKey) {
    apiKitConfig.apiKey = config.safeApiKey
  }

  return apiKitConfig
}

/**
 * Read-only EVM multisig Safe wallet account.
 * Provides query-only operations for Safe multisig wallets.
 *
 * @extends WalletAccountReadOnly
 */
export default class WalletAccountReadOnlyEvmMultisigSafe extends WalletAccountReadOnly {
  /**
   * Creates a new read-only EVM multisig Safe wallet account.
   *
   * @param {string | null} signerAddress - The signer's EOA address or null for pure read-only
   * @param {EvmMultisigSafeReadOnlyConfig} config - The configuration object
   */
  constructor (signerAddress, config) {
    super(undefined)
    this._validateConfig(config)

    /**
     * The multisig Safe configuration
     *
     * @protected
     * @type {EvmMultisigSafeReadOnlyConfig}
     */
    this._config = config

    /**
     * The Safe address
     *
     * @protected
     * @type {string | null}
     */
    this._safeAddress = config.safeAddress || null

    /**
     * The safe's implementation of the erc-4337 standard.
     *
     * @protected
     * @type {Safe4337Pack | undefined}
     */
    this._safe4337Pack = undefined

    /**
     * The Safe API Kit instance
     *
     * @protected
     * @type {SafeApiKit | null}
     */
    this._apiKit = null

    /**
     * Cached owners list
     *
     * @protected
     * @type {string[] | null}
     */
    this._owners = null

    /**
     * Cached threshold
     *
     * @protected
     * @type {number | null}
     */
    this._threshold = null

    /**
     * The chain id.
     *
     * @protected
     * @type {bigint | undefined}
     */
    this._chainId = undefined

    /** @private */
    this._signerAddress = signerAddress
  }

  /**
   * Gets all Safe addresses owned by an address.
   * Useful for discovering user's Safes during wallet login/import.
   *
   * @static
   * @param {string} ownerAddress - The owner's EOA address
   * @param {SafesByOwnerConfig} config - Configuration object
   * @returns {Promise<string[]>} Array of Safe addresses
   *
   */
  static async getSafesByOwner (ownerAddress, config) {
    if (!ownerAddress) {
      throw new Error('ownerAddress is required')
    }

    const apiKit = new SafeApiKit(createApiKitConfig(config))
    const response = await apiKit.getSafesByOwner(ownerAddress)

    return response.safes || []
  }

  /**
   * Gets Safe information without creating an instance.
   *
   * @static
   * @param {string} safeAddress - The Safe address
   * @param {SafesByOwnerConfig} config - Configuration object
   * @returns {Promise<SafeInfo>} Safe information
   *
   */
  static async getSafeInfo (safeAddress, config) {
    if (!safeAddress) {
      throw new Error('safeAddress is required')
    }

    if (!config?.chainId) {
      throw new Error('chainId is required')
    }

    const apiKit = new SafeApiKit(createApiKitConfig(config))
    const safeInfo = await apiKit.getSafeInfo(safeAddress)

    return {
      address: safeInfo.address,
      owners: safeInfo.owners,
      threshold: safeInfo.threshold,
      nonce: safeInfo.nonce?.toString() || '0',
      version: safeInfo.version || 'unknown',
      isDeployed: true
    }
  }

  /**
   * Generates a deterministic salt nonce from owners and threshold.
   *
   * @static
   * @param {string[]} owners - Array of owner addresses
   * @param {number} threshold - Number of required signatures
   * @returns {string} The deterministic salt nonce (hex string)
   */
  static generateDeterministicSaltNonce (owners, threshold) {
    const sortedOwners = [...owners].map(o => o.toLowerCase()).sort()
    const data = JSON.stringify({ owners: sortedOwners, threshold })
    return keccak256(toUtf8Bytes(data))
  }

  /**
   * Returns the signer's EOA address.
   * For read-only accounts created with a signerAddress, returns that address.
   *
   * @returns {Promise<string | null>} The signer's address or null
   */
  async getSignerAddress () {
    return this._signerAddress
  }

  /**
   * Returns the Safe address.
   *
   * @returns {Promise<string>} The Safe address
   */
  async getAddress () {
    if (this._safeAddress) {
      return this._safeAddress
    }

    const safe4337Pack = await this._getSafe4337Pack()
    const address = await safe4337Pack.protocolKit.getAddress()
    this._safeAddress = address

    return address
  }

  /**
   * Checks if the Safe is deployed on-chain.
   *
   * @returns {Promise<boolean>} True if deployed
   */
  async isDeployed () {
    const safe4337Pack = await this._getSafe4337Pack()
    return await safe4337Pack.protocolKit.isSafeDeployed()
  }

  /**
   * Returns the list of Safe owners.
   *
   * @returns {Promise<string[]>} Array of owner addresses
   */
  async getOwners () {
    if (this._owners) {
      return this._owners
    }

    const isDeployed = await this.isDeployed()

    if (isDeployed) {
      const safe4337Pack = await this._getSafe4337Pack()
      this._owners = await safe4337Pack.protocolKit.getOwners()
    } else {
      if (!this._config.safeAccountConfig) {
        throw new Error('Safe is not deployed and no safeAccountConfig provided')
      }
      this._owners = this._config.safeAccountConfig.owners
    }

    return this._owners
  }

  /**
   * Returns the Safe threshold.
   *
   * @returns {Promise<number>} The threshold
   */
  async getThreshold () {
    if (this._threshold) {
      return this._threshold
    }

    const isDeployed = await this.isDeployed()

    if (isDeployed) {
      const safe4337Pack = await this._getSafe4337Pack()
      this._threshold = await safe4337Pack.protocolKit.getThreshold()
    } else {
      if (!this._config.safeAccountConfig) {
        throw new Error('Safe is not deployed and no safeAccountConfig provided')
      }
      this._threshold = this._config.safeAccountConfig.threshold
    }

    return this._threshold
  }

  /**
   * Returns the Safe's current nonce.
   *
   * @returns {Promise<number>} The nonce
   */
  async getNonce () {
    const safe4337Pack = await this._getSafe4337Pack()
    return await safe4337Pack.protocolKit.getNonce()
  }

  /**
   * Returns the Safe contract version.
   *
   * @returns {Promise<string>} The Safe version (e.g., "1.4.1")
   */
  async getVersion () {
    const isDeployed = await this.isDeployed()

    if (!isDeployed) {
      return 'not deployed'
    }

    const safe4337Pack = await this._getSafe4337Pack()
    return safe4337Pack.protocolKit.getContractVersion()
  }

  /**
   * Returns the Safe's native token balance
   *
   * @returns {Promise<bigint>} Balance in wei
   */
  async getBalance () {
    const evmReadOnlyAccount = await this._getEvmReadOnlyAccount()
    return await evmReadOnlyAccount.getBalance()
  }

  /**
   * Returns the Safe's balance for a specific ERC-20 token.
   *
   * @param {string} tokenAddress - The token contract address
   * @returns {Promise<bigint>} Token balance in base units
   */
  async getTokenBalance (tokenAddress) {
    const evmReadOnlyAccount = await this._getEvmReadOnlyAccount()
    return await evmReadOnlyAccount.getTokenBalance(tokenAddress)
  }

  /**
   * Returns the Safe's paymaster token balance.
   *
   * @returns {Promise<bigint>} Paymaster token balance
   * @throws {Error} If no paymaster token is configured
   */
  async getPaymasterTokenBalance () {
    const paymasterTokenAddress = this._config.paymasterOptions?.paymasterTokenAddress

    if (!paymasterTokenAddress) {
      throw new Error('No paymaster token configured')
    }

    return await this.getTokenBalance(paymasterTokenAddress)
  }

  /**
   * Returns pending Safe operations awaiting signatures.
   *
   * @param {GetSafeOperationListOptions} [options] - Query options
   * @returns {Promise<GetSafeOperationListResponse>} Pending operations from Safe Transaction Service
   */
  async getPendingTransactions (options) {
    const apiKit = await this._getApiKit()
    const address = await this.getAddress()

    return await apiKit.getPendingSafeOperations(address, options)
  }

  /**
   * Returns a specific Safe operation by hash.
   *
   * @param {string} safeOperationHash - The Safe operation hash
   * @returns {Promise<SafeOperationResponse | null>} The operation or null if not found
   */
  async getSafeOperation (safeOperationHash) {
    const apiKit = await this._getApiKit()

    try {
      return await apiKit.getSafeOperation(safeOperationHash)
    } catch (error) {
      if (error.message?.includes('not found')) {
        return null
      }
      throw error
    }
  }

  /**
   * Returns the transaction history for the Safe.
   * Includes executed multisig transactions.
   *
   * @param {ListOptions} [options] - Query options (limit, offset)
   * @returns {Promise<SafeMultisigTransactionListResponse>} Transaction history from Safe Transaction
   *
   */
  async getTransactionHistory (options) {
    const apiKit = await this._getApiKit()
    const safeAddress = await this.getAddress()

    return await apiKit.getMultisigTransactions(safeAddress, options)
  }

  /**
   * Returns incoming transfers to the Safe.
   * Includes ETH and ERC-20 token transfers.
   *
   * @param {ListOptions} [options] - Query options (limit, offset)
   * @returns {Promise<TransferListResponse>} Incoming transfers from Safe Transaction Service
   */
  async getIncomingTransactions (options) {
    const apiKit = await this._getApiKit()
    const safeAddress = await this.getAddress()

    return await apiKit.getIncomingTransactions(safeAddress, options)
  }

  /**
   * Checks if a Safe operation is ready to be executed.
   *
   * @param {string} safeOperationHash - The Safe operation hash
   * @returns {Promise<boolean>} True if confirmations >= threshold
   */
  async isReadyToExecute (safeOperationHash) {
    const operation = await this.getSafeOperation(safeOperationHash)

    if (!operation) {
      return false
    }

    const threshold = await this.getThreshold()
    const confirmations = operation.confirmations?.length || 0

    return confirmations >= threshold
  }

  /**
   * Gets the on-chain transaction hash for a UserOperation.
   *
   * @param {string} userOpHash - The UserOperation hash
   * @returns {Promise<string | null>} The transaction hash or null if not found
   *
   */
  async getTransactionHashByUserOpHash (userOpHash) {
    const safe4337Pack = await this._getSafe4337Pack()

    try {
      const receipt = await safe4337Pack.getUserOperationReceipt(userOpHash)
      return receipt?.receipt?.transactionHash || null
    } catch (e) {
      return null
    }
  }

  /**
   * Gets a message and its signatures from Safe Transaction Service.
   *
   * @param {string} messageHash - The Safe message hash
   * @returns {Promise<SafeMessage | null>} The message with signatures or null if not found
   */
  async getMessage (messageHash) {
    const apiKit = await this._getApiKit()

    try {
      return await apiKit.getMessage(messageHash)
    } catch (error) {
      if (error.message?.includes('not found')) {
        return null
      }
      throw error
    }
  }

  /**
   * Returns pending messages awaiting signatures.
   *
   * @param {ListOptions} [options] - Query options (limit, offset)
   * @returns {Promise<SafeMessageListResponse>} Pending messages from Safe Transaction Service
   */
  async getPendingMessages (options) {
    const apiKit = await this._getApiKit()
    const safeAddress = await this.getAddress()

    return await apiKit.getMessages(safeAddress, options)
  }

  /**
   * Estimates the fee for a transaction.
   *
   * @param {EvmTransaction} tx - The transaction
   * @param {ProposeOptions} [options] - Options for paymaster override
   * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
   */
  async quoteSendTransaction (tx, options = {}) {
    const fee = await this._estimateUserOperationGas([tx], options)
    return { fee }
  }

  /**
   * Estimates the fee for a token transfer.
   *
   * @param {TransferOptions} transferOptions - Transfer options
   * @param {ProposeOptions} [options] - Options for paymaster override
   * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
   */
  async quoteTransfer (transferOptions, options = {}) {
    const tx = await WalletAccountReadOnlyEvm._getTransferTransaction(transferOptions)
    return await this.quoteSendTransaction(tx, options)
  }

  /**
   * Estimates UserOperation gas cost.
   *
   * @private
   * @param {EvmTransaction[]} transactions - Array of transactions
   * @param {ProposeOptions} [options] - Options for paymaster override
   * @returns {Promise<bigint>} Gas cost in paymaster token units or wei
   */
  async _estimateUserOperationGas (transactions, options = {}) {
    const safe4337Pack = await this._getSafe4337Pack(options)
    const address = await this.getAddress()

    const isSponsored = options.isSponsored ?? this._config.paymasterOptions?.isSponsored

    const paymasterTokenAddress = !isSponsored
      ? (options.paymasterTokenAddress ?? this._config.paymasterOptions?.paymasterTokenAddress)
      : null

    const formattedTxs = transactions.map(tx => ({
      to: tx.to,
      value: tx.value?.toString() || '0',
      data: tx.data || '0x'
    }))

    try {
      const safeOperation = await safe4337Pack.createTransaction({
        transactions: formattedTxs.map(tx => ({ from: address, ...tx }))
      })

      const {
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        paymasterVerificationGasLimit,
        paymasterPostOpGasLimit,
        maxFeePerGas
      } = safeOperation.userOperation

      const totalGas = BigInt(callGasLimit) +
        BigInt(verificationGasLimit) +
        BigInt(preVerificationGas) +
        BigInt(paymasterVerificationGasLimit || 0) +
        BigInt(paymasterPostOpGasLimit || 0)

      const gasCostWei = totalGas * BigInt(maxFeePerGas)

      if (paymasterTokenAddress) {
        const exchangeRate = await safe4337Pack.getTokenExchangeRate(
          paymasterTokenAddress
        )
        const gasCostInToken = (gasCostWei * BigInt(exchangeRate)) / (10n ** 18n)
        return gasCostInToken
      }

      return gasCostWei
    } catch (error) {
      console.error('Error estimating UserOperation gas:', error)
      if (error.message?.includes('AA50')) {
        throw new Error('Simulation failed: not enough funds in the Safe to repay the paymaster.')
      }
      throw error
    }
  }

  /**
   * Returns the Safe4337Pack instance.
   * Child classes can override this to add a signer.
   *
   * @protected
   * @param {ProposeOptions} [options] - Options for paymaster override
   * @returns {Promise<Safe4337Pack>} The Safe4337Pack instance
   */
  async _getSafe4337Pack (options = {}) {
    const hasPaymasterOverride = options.isSponsored !== undefined ||
      options.sponsorshipPolicyId !== undefined ||
      options.paymasterTokenAddress !== undefined

    if (hasPaymasterOverride) {
      return await this._initSafe4337Pack(options)
    }

    if (!this._safe4337Pack) {
      this._safe4337Pack = await this._initSafe4337Pack()
    }

    return this._safe4337Pack
  }

  /**
   * Initializes the Safe4337Pack with configuration.
   * Child classes can override to add signer.
   *
   * @protected
   * @param {ProposeOptions} [options] - Options for paymaster override
   * @returns {Promise<Safe4337Pack>} The initialized Safe4337Pack instance
   */
  async _initSafe4337Pack (options = {}) {
    const { safeAddress, safeAccountConfig, safeDeploymentConfig } = this._config

    const initOptions = {
      provider: this._config.provider,
      bundlerUrl: this._config.bundlerUrl,
      safeModulesVersion: this._config.safeModulesVersion || DEFAULT_SAFE_MODULES_VERSION
    }

    if (this._signerAccount) {
      initOptions.signer = this._signerAccount._account
    }

    if (safeAddress) {
      initOptions.options = { safeAddress }
    } else if (safeAccountConfig) {
      const saltNonce = safeDeploymentConfig?.saltNonce ||
        WalletAccountReadOnlyEvmMultisigSafe.generateDeterministicSaltNonce(
          safeAccountConfig.owners,
          safeAccountConfig.threshold
        )

      initOptions.options = {
        owners: safeAccountConfig.owners,
        threshold: safeAccountConfig.threshold,
        saltNonce
      }
    }

    if (this._config.paymasterOptions) {
      const { paymasterUrl, paymasterAddress } = this._config.paymasterOptions

      const isSponsored = options.isSponsored ?? this._config.paymasterOptions.isSponsored
      const sponsorshipPolicyId = options.sponsorshipPolicyId ?? this._config.paymasterOptions.sponsorshipPolicyId
      const paymasterTokenAddress = options.paymasterTokenAddress ?? this._config.paymasterOptions.paymasterTokenAddress

      initOptions.paymasterOptions = { paymasterUrl }

      if (paymasterAddress) {
        initOptions.paymasterOptions.paymasterAddress = paymasterAddress
      }

      if (isSponsored) {
        initOptions.paymasterOptions.isSponsored = true
        if (sponsorshipPolicyId) {
          initOptions.paymasterOptions.sponsorshipPolicyId = sponsorshipPolicyId
        }
      } else if (paymasterTokenAddress) {
        initOptions.paymasterOptions.paymasterTokenAddress = paymasterTokenAddress
      }
    }

    if (this._config.entryPointAddress) {
      initOptions.customContracts = {
        entryPointAddress: this._config.entryPointAddress
      }
    }

    return await Safe4337Pack.init(initOptions)
  }

  /**
   * Returns the Safe API Kit instance.
   *
   * @protected
   * @returns {Promise<SafeApiKit>} The Safe API Kit instance
   */
  async _getApiKit () {
    if (!this._apiKit) {
      this._apiKit = new SafeApiKit(createApiKitConfig(this._config))
    }

    return this._apiKit
  }

  /**
   * Returns a read-only EVM account for the Safe address.
   *
   * @private
   * @returns {Promise<WalletAccountReadOnlyEvm>} The read-only EVM account
   */
  async _getEvmReadOnlyAccount () {
    const address = await this.getAddress()
    return new WalletAccountReadOnlyEvm(address, this._config)
  }

  /**
   * Validates the configuration.
   *
   * @private
   * @param {EvmMultisigSafeConfig} config - The configuration to validate
   */
  _validateConfig (config) {
    const hasSafeAddress = !!config.safeAddress
    const hasSafeAccountConfig = !!config.safeAccountConfig

    if (!hasSafeAddress && !hasSafeAccountConfig) {
      throw new Error('Either safeAddress or safeAccountConfig must be provided')
    }

    if (hasSafeAddress && hasSafeAccountConfig) {
      throw new Error('Cannot provide both safeAddress and safeAccountConfig')
    }

    if (hasSafeAccountConfig) {
      if (!Array.isArray(config.safeAccountConfig.owners) || config.safeAccountConfig.owners.length === 0) {
        throw new Error('safeAccountConfig.owners is required and must not be empty')
      }

      if (!config.safeAccountConfig.threshold || config.safeAccountConfig.threshold < 1) {
        throw new Error('safeAccountConfig.threshold must be at least 1')
      }

      if (config.safeAccountConfig.threshold > config.safeAccountConfig.owners.length) {
        throw new Error('safeAccountConfig.threshold cannot exceed number of owners')
      }
    }
  }
}
