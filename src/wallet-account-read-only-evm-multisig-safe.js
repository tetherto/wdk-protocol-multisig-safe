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

import { Safe4337Pack, GenericFeeEstimator } from '@wdk-safe-global/relay-kit'

import SafeApiKit from '@safe-global/api-kit'

/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */

/** @typedef {import('@tetherto/wdk-wallet').IWalletAccountReadOnlyMultisig} IWalletAccountReadOnlyMultisig */
/** @typedef {import('@tetherto/wdk-wallet').MultisigInfo} MultisigInfo */
/** @typedef {import('@tetherto/wdk-wallet').MessageInfo} MessageInfo */
/** @typedef {import('@tetherto/wdk-wallet').MultisigProposal} MultisigProposal */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */

/** @typedef {import('@wdk-safe-global/relay-kit').ExistingSafeOptions} ExistingSafeOptions */
/** @typedef {import('@wdk-safe-global/relay-kit').PredictedSafeOptions} PredictedSafeOptions */

/**
 * @typedef {Object} EvmMultisigSafeCommonConfig
 * @property {string | Eip1193Provider} provider - RPC URL or EIP-1193 provider
 * @property {string} bundlerUrl - ERC-4337 bundler URL
 * @property {bigint} chainId - Chain ID
 * @property {string} [entryPointAddress] - EntryPoint contract address
 * @property {string} [safeModulesVersion='0.2.0'] - Safe modules version
 * @property {string} [paymasterUrl] - Paymaster service URL
 * @property {string} [txServiceUrl] - Custom Safe Transaction Service URL
 * @property {string} [safeApiKey] - Safe API key
 * @property {ExistingSafeOptions | PredictedSafeOptions} options - Safe options (existing or predicted)
 */

/**
 * @typedef {Object} EvmMultisigSafePaymasterTokenConfig
 * @property {false} [isSponsored] - Whether the paymaster is sponsoring the account.
 * @property {false} [useNativeCoins] - Whether to use native coins instead of a paymaster to pay for gas fees.
 * @property {string} paymasterAddress - Paymaster contract address
 * @property {Object} paymasterToken - The paymaster token configuration.
 * @property {string} paymasterToken.address - The address of the paymaster token.
 * @property {number | bigint} [transferMaxFee] - Maximum fee for transfers
 * @property {number | bigint} [amountToApprove] - Amount to approve for paymaster
 */

/**
 * @typedef {Object} EvmMultisigSafeSponsoredConfig
 * @property {true} isSponsored - Whether the paymaster is sponsoring the account.
 * @property {false} [useNativeCoins] - Whether to use native coins instead of a paymaster to pay for gas fees.
 * @property {string} [sponsorshipPolicyId] - Sponsorship policy ID
 */

/**
 * @typedef {Object} EvmMultisigSafeNativeCoinsConfig
 * @property {false} [isSponsored] - Whether the paymaster is sponsoring the account.
 * @property {true} useNativeCoins - Whether to use native coins instead of a paymaster to pay for gas fees.
 * @property {number | bigint} [transferMaxFee] - Maximum fee for transfers
 */

/**
 * @typedef {EvmMultisigSafeCommonConfig & (EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig)} EvmMultisigSafeConfig
 */

/** @typedef {Omit<EvmMultisigSafeConfig, 'transferMaxFee' | 'amountToApprove'>} EvmMultisigSafeReadOnlyConfig */

export const DEFAULT_SAFE_MODULES_VERSION = '0.2.0'
export const DEFAULT_SAFE_VERSION = '1.4.1'

/**
 * Read-only EVM multisig Safe wallet account.
 * Provides query-only operations for Safe multisig wallets.
 *
 * @implements {IWalletAccountReadOnlyMultisig}
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
    this._safeAddress = config.options?.safeAddress || null

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
   * Returns the predicted Safe address.
   *
   * @returns {Promise<string>} The Safe address
   */
  async getAddress () {
    if (this._safeAddress) {
      return this._safeAddress
    }

    const options = this._config.options
    const { owners, threshold, saltNonce } = options
    const finalSaltNonce = saltNonce ||
      WalletAccountReadOnlyEvmMultisigSafe.generateDeterministicSaltNonce(owners, threshold)

    this._safeAddress = Safe4337Pack.predictSafeAddress({
      owners,
      threshold,
      saltNonce: finalSaltNonce,
      chainId: this._config.chainId,
      safeVersion: DEFAULT_SAFE_VERSION,
      safeModulesVersion: this._config.safeModulesVersion || DEFAULT_SAFE_MODULES_VERSION,
      paymasterOptions: this._config.paymasterUrl
        ? {
            paymasterUrl: this._config.paymasterUrl,
            paymasterAddress: this._config.paymasterAddress,
            paymasterTokenAddress: this._config.paymasterToken?.address,
            isSponsored: this._config.isSponsored,
            sponsorshipPolicyId: this._config.sponsorshipPolicyId
          }
        : undefined
    })

    return this._safeAddress
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
      if (!this._config.options?.owners) {
        throw new Error('Safe is not deployed and no owners provided in options')
      }
      this._owners = this._config.options.owners
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
      if (!this._config.options?.threshold) {
        throw new Error('Safe is not deployed and no threshold provided in options')
      }
      this._threshold = this._config.options.threshold
    }

    return this._threshold
  }

  /**
   * Returns the multisig wallet info.
   *
   * @returns {Promise<MultisigInfo>} The multisig info
   */
  async getMultisigInfo () {
    const address = await this.getAddress()
    const owners = await this.getOwners()
    const threshold = await this.getThreshold()
    const isCreated = await this.isDeployed()

    return {
      address,
      owners,
      threshold,
      isCreated
    }
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
    const paymasterTokenAddress = this._config.paymasterToken?.address

    if (!paymasterTokenAddress) {
      throw new Error('No paymaster token configured')
    }

    return await this.getTokenBalance(paymasterTokenAddress)
  }

  /**
   * Returns a list of proposals by their identifiers.
   *
   * @param {string[]} proposalIds - The list of proposal identifiers
   * @returns {Promise<(MultisigProposal | null)[]>} The proposal details, or null for proposals not found
   */
  async getProposals (proposalIds) {
    const apiKit = await this._getApiKit()
    const threshold = await this.getThreshold()

    return Promise.all(proposalIds.map(async (proposalId) => {
      try {
        const safeOperation = await apiKit.getSafeOperation(proposalId)

        if (!safeOperation) {
          return null
        }

        return {
          proposalId,
          confirmations: safeOperation.confirmations?.length || 0,
          threshold
        }
      } catch (error) {
        if (error.message?.includes('not found')) {
          return null
        }
        throw error
      }
    }))
  }

  /**
   * Checks if a Safe operation is ready to be executed.
   *
   * @param {string} proposalId - The Safe operation hash
   * @returns {Promise<boolean>} True if confirmations >= threshold
   */
  async isReadyToExecute (proposalId) {
    const [operation] = await this.getProposals([proposalId])

    if (!operation) {
      return false
    }

    return operation.confirmations >= operation.threshold
  }

  /**
   * Returns a list of message proposals by their hashes.
   *
   * @param {string[]} messageHashes - The list of message hashes
   * @returns {Promise<(MessageInfo | null)[]>} The message details, or null for messages not found
   */
  async getMessages (messageHashes) {
    const apiKit = await this._getApiKit()
    const threshold = await this.getThreshold()

    return Promise.all(messageHashes.map(async (messageHash) => {
      try {
        const safeMessage = await apiKit.getMessage(messageHash)

        return {
          messageHash: safeMessage.messageHash,
          message: safeMessage.message,
          confirmations: safeMessage.confirmations?.length || 0,
          threshold,
          combinedSignature: safeMessage.preparedSignature || null
        }
      } catch (error) {
        if (error.message?.includes('not found')) {
          return null
        }
        throw error
      }
    }))
  }

  /**
   * Estimates the gas cost for deploying the Safe.
   *
   * @returns {Promise<{fee: bigint}>} Estimated deployment fee in wei
   * @throws {Error} If Safe is already deployed
   */
  async quoteDeploy () {
    const isDeployed = await this.isDeployed()

    if (isDeployed) {
      throw new Error('Safe is already deployed')
    }

    const safe4337Pack = await this._getSafe4337Pack()
    const deploymentTx = await safe4337Pack.protocolKit.createSafeDeploymentTransaction()

    const evmReadOnlyAccount = await this._getEvmReadOnlyAccount()
    return await evmReadOnlyAccount.quoteSendTransaction({
      to: deploymentTx.to,
      value: BigInt(deploymentTx.value),
      data: deploymentTx.data
    })
  }

  /**
   * Estimates the fee for a transaction.
   *
   * @param {EvmTransaction} tx - The transaction
   * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
   */
  async quoteSendTransaction (tx, config) {
    const fee = await this._estimateUserOperationGas([tx], config)
    return { fee }
  }

  /**
   * Estimates the fee for a token transfer.
   *
   * @param {TransferOptions} transferOptions - Transfer options
   * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
   */
  async quoteTransfer (transferOptions, config) {
    const tx = await WalletAccountReadOnlyEvm._getTransferTransaction(transferOptions)
    return await this.quoteSendTransaction(tx, config)
  }

  /**
   * Creates a GenericFeeEstimator for non-Pimlico bundlers.
   *
   * @protected
   * @returns {GenericFeeEstimator} The fee estimator
   */
  _createFeeEstimator () {
    const chainIdHex = '0x' + this._config.chainId.toString(16)
    return new GenericFeeEstimator(this._config.provider, chainIdHex)
  }

  /**
   * Creates a SafeOperation from transactions.
   * This is the shared method used by both fee estimation and propose
   * to ensure they operate on the same transaction structure.
   *
   * @protected
   * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s)
   * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<Object>} The SafeOperation object
   */
  async _createSafeOperation (transaction, config) {
    const safe4337Pack = await this._getSafe4337Pack(config)
    const feeEstimator = this._createFeeEstimator()
    const address = await this.getAddress()

    const transactions = Array.isArray(transaction) ? transaction : [transaction]
    const formattedTxs = transactions.map(tx => ({
      to: tx.to,
      value: tx.value?.toString() || '0',
      data: tx.data || '0x'
    }))

    const createTxOptions = {
      transactions: formattedTxs.map(tx => ({ from: address, ...tx })),
      options: { feeEstimator }
    }

    const { isSponsored, amountToApprove } = { ...this._config, ...config }

    if (amountToApprove && !isSponsored) {
      createTxOptions.options.amountToApprove = BigInt(amountToApprove.toString())
    }

    return await safe4337Pack.createTransaction(createTxOptions)
  }

  /**
   * Estimates UserOperation gas cost.
   *
   * @private
   * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s)
   * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<bigint>} Gas cost in paymaster token units or wei
   */
  async _estimateUserOperationGas (transaction, config) {
    const safe4337Pack = await this._getSafe4337Pack(config)

    const mergedConfig = { ...this._config, ...config }
    const { isSponsored, useNativeCoins } = mergedConfig
    const configTokenAddress = mergedConfig.paymasterToken?.address

    const tokenAddress = (!isSponsored && !useNativeCoins) ? configTokenAddress : null

    try {
      const safeOperation = await this._createSafeOperation(transaction, config)

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

      if (tokenAddress) {
        const exchangeRate = await safe4337Pack.getTokenExchangeRate(
          tokenAddress
        )
        const gasCostInToken = (gasCostWei * BigInt(exchangeRate)) / (10n ** 18n)
        return gasCostInToken
      }

      return gasCostWei
    } catch (error) {
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
   * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<Safe4337Pack>} The Safe4337Pack instance
   */
  async _getSafe4337Pack (config) {
    const hasPaymasterOverride = config && (
      config.isSponsored !== undefined ||
      config.sponsorshipPolicyId !== undefined ||
      config.paymasterToken !== undefined ||
      config.useNativeCoins !== undefined
    )

    if (hasPaymasterOverride) {
      return await this._initSafe4337Pack(config)
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
   * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<Safe4337Pack>} The initialized Safe4337Pack instance
   */
  async _initSafe4337Pack (config) {
    const mergedConfig = { ...this._config, ...config }
    const { isSponsored, sponsorshipPolicyId, useNativeCoins } = mergedConfig
    const paymasterTokenAddress = mergedConfig.paymasterToken?.address

    const safeOptions = this._config.options

    const initOptions = {
      provider: this._config.provider,
      bundlerUrl: this._config.bundlerUrl,
      safeModulesVersion: this._config.safeModulesVersion || DEFAULT_SAFE_MODULES_VERSION
    }

    if (this._signerAccount) {
      initOptions.signer = this._signerAccount._account
    }

    if (safeOptions.safeAddress) {
      initOptions.options = { safeAddress: safeOptions.safeAddress }
    } else if (safeOptions.owners) {
      const saltNonce = safeOptions.saltNonce ||
        WalletAccountReadOnlyEvmMultisigSafe.generateDeterministicSaltNonce(
          safeOptions.owners,
          safeOptions.threshold
        )

      initOptions.options = {
        owners: safeOptions.owners,
        threshold: safeOptions.threshold,
        saltNonce
      }

      if (safeOptions.safeVersion) {
        initOptions.options.safeVersion = safeOptions.safeVersion
      }

      if (safeOptions.deploymentType) {
        initOptions.options.deploymentType = safeOptions.deploymentType
      }
    }

    if (this._config.paymasterUrl && !useNativeCoins) {
      initOptions.paymasterOptions = { paymasterUrl: this._config.paymasterUrl }

      if (this._config.paymasterAddress) {
        initOptions.paymasterOptions.paymasterAddress = this._config.paymasterAddress
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
      const apiKitConfig = {
        chainId: this._config.chainId
      }

      if (this._config.txServiceUrl) {
        apiKitConfig.txServiceUrl = this._config.txServiceUrl
      } else if (this._config.safeApiKey) {
        apiKitConfig.apiKey = this._config.safeApiKey
      }
      this._apiKit = new SafeApiKit(apiKitConfig)
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
 * Resets cached internal state.
 * @protected
 */
  _resetState () {
    this._owners = null
    this._threshold = null
  }

  /**
   * Validates the configuration.
   *
   * @private
   * @param {EvmMultisigSafeConfig} config - The configuration to validate
   */
  _validateConfig (config) {
    if (!config.options) {
      throw new Error('options is required')
    }

    const options = config.options
    const hasPredictedSafe = !!options.owners

    if (hasPredictedSafe) {
      if (!Array.isArray(options.owners) || options.owners.length === 0) {
        throw new Error('options.owners is required and must not be empty')
      }

      if (!options.threshold || options.threshold < 1) {
        throw new Error('options.threshold must be at least 1')
      }

      if (options.threshold > options.owners.length) {
        throw new Error('options.threshold cannot exceed number of owners')
      }
    }

    const { isSponsored, useNativeCoins, paymasterUrl, paymasterToken } = config

    if (isSponsored && useNativeCoins) {
      throw new Error("Cannot use both 'isSponsored: true' and 'useNativeCoins: true'. Please use only one.")
    }

    if (isSponsored && !paymasterUrl) {
      throw new Error('Missing required sponsorship configuration field: paymasterUrl.')
    }

    if (!isSponsored && !useNativeCoins && paymasterUrl && !paymasterToken) {
      throw new Error('Missing required paymaster token configuration field: paymasterToken.')
    }
  }
}
