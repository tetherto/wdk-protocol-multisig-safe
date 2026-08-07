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

import { TypedDataEncoder } from 'ethers'

import { WalletAccountEvm } from '@tetherto/wdk-wallet-evm'

import {
  // eslint-disable-next-line camelcase
  SafeAccountV0_3_0 as SafeAccount030,
  AbstractionKitError,
  calculateUserOperationMaxGasCost
} from 'abstractionkit'

import { toTransportJson } from './transports/i-multisig-transport.js'

import { NoSuchElementError, SignerError, ValueError } from '@tetherto/wdk-wallet'

import WalletAccountReadOnlyMultisigEvmSafe4337 from './wallet-account-read-only-multisig-evm-safe-4337.js'

/** @typedef {import('@tetherto/wdk-wallet/multisig').IWalletAccountMultisig} IWalletAccountMultisig */
/** @typedef {import('@tetherto/wdk-wallet/multisig').IMultisigOwnerManagement} IMultisigOwnerManagement */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigProposal} MultisigProposal */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigTransactionOptions} MultisigTransactionOptions */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigAutoExecuteResult} MultisigAutoExecuteResult */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigMessageProposal} MultisigMessageProposal */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigSignature} MultisigSignature */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigOptions} MultisigOptions */

/** @typedef {import('@tetherto/wdk-wallet-evm').KeyPair} KeyPair */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */

/** @typedef {import('abstractionkit').UserOperationV7} UserOperationV7 */

/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeConfig} EvmMultisigSafeConfig */
/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafePaymasterTokenConfig} EvmMultisigSafePaymasterTokenConfig */
/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeSponsoredConfig} EvmMultisigSafeSponsoredConfig */
/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeNativeCoinsConfig} EvmMultisigSafeNativeCoinsConfig */

/**
 * EVM multisig Safe wallet account with signing capabilities.
 * Provides full transaction and message signing operations.
 *
 * @implements {IWalletAccountMultisig}
 * @implements {IMultisigOwnerManagement}
 */
export default class WalletAccountMultisigEvmSafe4337 extends WalletAccountReadOnlyMultisigEvmSafe4337 {
  /**
   * Creates a new EVM multisig Safe wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {string} path - The BIP-44 derivation path (e.g., "0'/0/0")
   * @param {EvmMultisigSafeConfig} config - The configuration object
   */
  constructor (seed, path, config) {
    const signerAccount = new WalletAccountEvm(seed, path, config)

    super(config)

    /**
     * The multisig Safe configuration.
     *
     * @protected
     * @type {EvmMultisigSafeConfig}
     */
    this._config = config

    /**
     * The signer account.
     *
     * @private
     * @type {WalletAccountEvm}
     */
    this._signerAccount = signerAccount

    /**
     * The derivation path.
     *
     * @private
     * @type {string}
     */
    this._path = path
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return this._signerAccount.index
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path () {
    return this._signerAccount.path
  }

  /**
   * The key pair of this account.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return this._signerAccount.keyPair
  }

  /**
   * Returns the signer's address.
   *
   * @returns {Promise<string>} The signer's address.
   */
  async getSignerAddress () {
    return this._signerAccount._address
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign
   * @returns {Promise<string>} The signature
   */
  async sign (message) {
    const result = await this.proposeMessage(message)
    return result.signature
  }

  /**
   * Signs a message with the multisig Safe.
   * Proposes a new message for the other owners to confirm.
   *
   * @param {string} message - The message to sign
   * @returns {Promise<MultisigMessageProposal & MultisigSignature>} The sign result
   * @throws {SignerError} If the signer is not an owner of the Safe.
   */
  async proposeMessage (message) {
    await this.validateSignerIsOwner()

    const threshold = await this.getThreshold()
    const safeAddress = await this.getAddress()
    const smartAccount = await this._getSmartAccount()

    const { domain, types, messageValue } = smartAccount.getSafeMessageEip712Data(this._config.chainId, message)
    const messageId = TypedDataEncoder.hash(domain, types, messageValue)
    const signature = this._signDigest(messageId)

    await this._transport.submitMessage(safeAddress, { message, signature })

    const safeMessageResponse = await this._transport.getMessage(messageId)

    return {
      messageId,
      message,
      signature,
      confirmations: safeMessageResponse.confirmations?.length || 0,
      threshold,
      combinedSignature: safeMessageResponse.preparedSignature || null
    }
  }

  /**
   * Approves an existing message proposal.
   *
   * @param {string} messageId - The message hash to approve
   * @returns {Promise<MultisigMessageProposal & MultisigSignature>} The approval result
   * @throws {SignerError} If the signer is not an owner of the Safe.
   * @throws {NoSuchElementError} If no message exists for the given hash.
   */
  async approveMessageProposal (messageId) {
    await this.validateSignerIsOwner()

    const existingMessage = await this._transport.getMessage(messageId)

    if (!existingMessage) {
      throw new NoSuchElementError(`Message not found: ${messageId}`)
    }

    const smartAccount = await this._getSmartAccount()
    const { domain, types, messageValue } = smartAccount.getSafeMessageEip712Data(this._config.chainId, existingMessage.message)
    const digest = TypedDataEncoder.hash(domain, types, messageValue)
    const signature = this._signDigest(digest)

    await this._transport.confirmMessage(messageId, signature)

    const safeMessageResponse = await this._transport.getMessage(messageId)
    const threshold = await this.getThreshold()

    return {
      messageId,
      message: existingMessage.message,
      signature,
      confirmations: safeMessageResponse.confirmations?.length || 0,
      threshold,
      combinedSignature: safeMessageResponse.preparedSignature || null
    }
  }

  /**
   * Validates that the signer is an owner of the Safe.
   *
   * @returns {Promise<void>}
   * @throws {SignerError} If signer is not an owner
   */
  async validateSignerIsOwner () {
    const signerAddress = await this.getSignerAddress()
    const owners = await this.getOwners()

    const isOwner = owners.some(
      owner => owner.toLowerCase() === signerAddress.toLowerCase()
    )

    if (!isOwner) {
      const safeAddress = await this.getAddress()
      throw new SignerError(
        `Signer ${signerAddress} is not an owner of Safe ${safeAddress}. ` +
        `Current owners: ${owners.join(', ')}`
      )
    }
  }

  /**
   * Deploys the Safe.
   * Requires native ETH in the signer's EOA account to pay for gas.
   *
   * @returns {Promise<TransactionResult>} Deployment result with transaction hash and fee
   * @throws {Error} If Safe is already deployed
   */
  async deploy () {
    const isDeployed = await this.isDeployed()

    if (isDeployed) {
      throw new Error('Safe is already deployed')
    }

    const deploymentTx = this._buildDeploymentTransaction()

    const result = await this._signerAccount.sendTransaction(deploymentTx)

    this._resetState()

    return result
  }

  /**
   * Proposes a transaction for multisig approval.
   * Auto-executes if `autoExecute` is true and threshold is met after proposing.
   *
   * @param {EvmTransaction} tx - The transaction to propose
   * @param {MultisigTransactionOptions & Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [options] - Send and paymaster config options
   * @returns {Promise<MultisigProposal & MultisigAutoExecuteResult>} The created proposal; its `status` is `'executed'` when `autoExecute` ran to completion, otherwise `'pending'`. When it auto-executed, `transaction` holds the on-chain result.
   */
  async propose (tx, options = {}) {
    const { autoExecute = false, ...config } = options

    return await this._submitTransaction(tx, config, autoExecute)
  }

  /**
   * Proposes transferring a token to another address for multisig approval.
   * Auto-executes if `autoExecute` is true and threshold is met after proposing.
   *
   * @param {TransferOptions} transferOptions - Transfer options
   * @param {MultisigTransactionOptions & Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [options] - Send and paymaster config options
   * @returns {Promise<MultisigProposal & MultisigAutoExecuteResult>} The created proposal; its `status` is `'executed'` when `autoExecute` ran to completion, otherwise `'pending'`. When it auto-executed, `transaction` holds the on-chain result.
   * @throws {ValueError} If the estimated fee exceeds the configured `transferMaxFee`.
   */
  async proposeTransfer (transferOptions, options = {}) {
    const { autoExecute = false, ...config } = options
    const mergedConfig = { ...this._config, ...config }
    const tx = await WalletAccountEvm._getTransferTransaction(transferOptions)

    const { isSponsored, useNativeCoins, transferMaxFee } = mergedConfig
    if (!isSponsored && !useNativeCoins && transferMaxFee !== undefined) {
      const { fee } = await this.quoteSendTransaction(tx, config)
      if (fee >= transferMaxFee) {
        throw new ValueError('Exceeded maximum fee cost for transfer operation.')
      }
    }

    return await this._submitTransaction(tx, config, autoExecute)
  }

  /** @private */
  async _submitTransaction (tx, config, autoExecute) {
    const proposal = await this._propose(tx, config)

    if (autoExecute && proposal.confirmations >= proposal.threshold) {
      const transaction = await this.executeProposal(proposal.proposalId)
      return { ...proposal, status: 'executed', transaction }
    }

    return proposal
  }

  /**
   * Proposes a new transaction for multisig approval.
   * Builds a UserOperation, signs it as the proposer, and shares it through the transport.
   *
   * Note: `rejectProposal()` passes `customNonce` via config to reuse the original proposal's nonce.
   *
   * @protected
   * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s) to propose
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<MultisigProposal>} The proposal result
   * @throws {SignerError} If the signer is not an owner of the Safe.
   */
  async _propose (transaction, config) {
    await this.validateSignerIsOwner()

    const threshold = await this.getThreshold()
    const chainId = this._config.chainId

    const { userOp, smartAccount } = await this._createSafeOperation(transaction, config)

    const signer = this._buildSigner()
    userOp.signature = await smartAccount.signUserOperationWithSigners(userOp, [signer], chainId)

    const proposalId = this._getProposalId(userOp)

    await this._transport.submitProposal(await this._buildProposalPayload(userOp))

    const safeOperationResponse = await this._transport.getProposal(proposalId)

    return {
      proposalId,
      confirmations: safeOperationResponse.confirmations?.length || 0,
      threshold,
      status: 'pending'
    }
  }

  /**
   * Approves (signs) an existing proposal.
   *
   * @param {string} proposalId - The Safe operation hash to approve
   * @returns {Promise<MultisigProposal & MultisigAutoExecuteResult>} Approval result
   * @throws {SignerError} If the signer is not an owner of the Safe.
   * @throws {NoSuchElementError} If no proposal exists for the given id.
   */
  async approveProposal (proposalId) {
    await this.validateSignerIsOwner()

    const threshold = await this.getThreshold()
    const safeOperationResponse = await this._transport.getProposal(proposalId)

    if (!safeOperationResponse) {
      throw new NoSuchElementError(`SafeOperation not found: ${proposalId}`)
    }

    const userOp = this._rebuildUserOperation(safeOperationResponse.userOperation)
    const digest = this._getProposalId(userOp)
    const signature = this._signDigest(digest)

    await this._transport.confirmProposal(proposalId, signature)

    const updatedOperation = await this._transport.getProposal(proposalId)
    const confirmations = updatedOperation.confirmations?.length || 0

    return { proposalId, confirmations, threshold, status: 'pending' }
  }

  /**
   * Rejects a proposal by creating a rejection transaction.
   * A rejection is a zero-value transaction to the Safe itself with the same nonce.
   *
   * @param {string} proposalId - The Safe operation hash to reject
   * @returns {Promise<MultisigProposal>} The rejection proposal result
   * @throws {NoSuchElementError} If no proposal exists for the given id.
   * @throws {ValueError} If the original proposal has no nonce to reuse.
   */
  async rejectProposal (proposalId) {
    const safeOperationResponse = await this._transport.getProposal(proposalId)

    if (!safeOperationResponse) {
      throw new NoSuchElementError(`SafeOperation not found: ${proposalId}`)
    }

    const nonce = safeOperationResponse.userOperation?.nonce
    if (nonce === undefined) {
      throw new ValueError('Cannot reject: original proposal has no nonce')
    }

    const safeAddress = await this.getAddress()
    const rejectionTx = {
      to: safeAddress,
      value: '0',
      data: '0x'
    }

    return await this._propose(rejectionTx, { customNonce: BigInt(nonce) })
  }

  /**
   * Executes a fully signed Safe operation via the bundler.
   *
   * @param {string} proposalId - The Safe operation hash to execute
   * @returns {Promise<TransactionResult>} The execution result
   * @throws {NoSuchElementError} If no proposal exists for the given id.
   * @throws {ValueError} If the proposal does not have enough confirmations to meet the threshold.
   */
  async executeProposal (proposalId) {
    const threshold = await this.getThreshold()
    const safeOperationResponse = await this._transport.getProposal(proposalId)

    if (!safeOperationResponse) {
      throw new NoSuchElementError(`SafeOperation not found: ${proposalId}`)
    }

    const confirmations = safeOperationResponse.confirmations?.length || 0

    if (confirmations < threshold) {
      throw new ValueError(
        `Not enough confirmations: ${confirmations}/${threshold}. ` +
        `Need ${threshold - confirmations} more signature(s).`
      )
    }

    const userOp = this._rebuildUserOperation(safeOperationResponse.userOperation)
    userOp.signature = this._aggregateSignatures(safeOperationResponse)

    const fee = calculateUserOperationMaxGasCost(userOp)
    const hash = await this._sendUserOperation(userOp)

    this._resetState()

    return {
      hash,
      fee
    }
  }

  /**
   * Proposes adding a new owner to the Safe.
   *
   * @param {string} ownerAddress - Address of new owner
   * @param {MultisigOptions & Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [options] - Options with optional threshold and paymaster config
   * @returns {Promise<MultisigProposal>} The proposal result
   */
  async addOwner (ownerAddress, options = {}) {
    const { threshold: newThreshold, ...config } = options

    const smartAccount = await this._getSmartAccount()
    const threshold = newThreshold || await this.getThreshold()

    const metaTransaction = smartAccount.createStandardAddOwnerWithThresholdMetaTransaction(ownerAddress, threshold)

    return await this._propose(metaTransaction, config)
  }

  /**
   * Proposes removing an owner from the Safe.
   *
   * @param {string} ownerAddress - Address of owner to remove
   * @param {MultisigOptions & Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [options] - Options with optional threshold and paymaster config
   * @returns {Promise<MultisigProposal>} The proposal result
   */
  async removeOwner (ownerAddress, options = {}) {
    const { threshold: newThreshold, ...config } = options

    const smartAccount = await this._getSmartAccount()
    const currentThreshold = await this.getThreshold()

    const metaTransaction = await smartAccount.createRemoveOwnerMetaTransaction(
      this._provider,
      ownerAddress,
      newThreshold || currentThreshold
    )

    return await this._propose([metaTransaction].flat(), config)
  }

  /**
   * Proposes swapping an owner with a new address.
   *
   * @param {string} oldOwnerAddress - Address of owner to remove
   * @param {string} newOwnerAddress - Address of new owner
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<MultisigProposal>} The proposal result
   */
  async swapOwner (oldOwnerAddress, newOwnerAddress, config) {
    const smartAccount = await this._getSmartAccount()

    const metaTransactions = await smartAccount.createSwapOwnerMetaTransactions(
      this._provider,
      newOwnerAddress,
      oldOwnerAddress
    )

    return await this._propose([metaTransactions].flat(), config)
  }

  /**
   * Proposes changing the Safe threshold.
   *
   * @param {number} newThreshold - New threshold value
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<MultisigProposal>} The proposal result
   */
  async changeThreshold (newThreshold, config) {
    const smartAccount = await this._getSmartAccount()

    const metaTransaction = smartAccount.createChangeThresholdMetaTransaction(newThreshold)

    return await this._propose(metaTransaction, config)
  }

  /**
   * Proposes updating all owners and threshold in a batch.
   *
   * @param {string[]} newOwners - Array of new owner addresses
   * @param {number} newThreshold - New threshold value
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<MultisigProposal>} The proposal result
   * @throws {ValueError} If there are no owner or threshold changes to make.
   */
  async updateOwners (newOwners, newThreshold, config) {
    const smartAccount = await this._getSmartAccount()
    const currentOwners = await this.getOwners()
    const currentThreshold = await this.getThreshold()

    const currentOwnersLower = currentOwners.map(o => o.toLowerCase())
    const newOwnersLower = newOwners.map(o => o.toLowerCase())

    const toAdd = newOwners.filter(o => !currentOwnersLower.includes(o.toLowerCase()))
    const toRemove = currentOwners.filter(o => !newOwnersLower.includes(o.toLowerCase()))

    const transactions = []

    for (const owner of toAdd) {
      transactions.push(smartAccount.createStandardAddOwnerWithThresholdMetaTransaction(owner, currentThreshold))
    }

    for (const owner of toRemove) {
      const metaTransaction = await smartAccount.createRemoveOwnerMetaTransaction(
        this._provider,
        owner,
        Math.max(1, Math.min(currentThreshold, newOwners.length))
      )
      transactions.push(...[metaTransaction].flat())
    }

    if (newThreshold !== currentThreshold) {
      transactions.push(smartAccount.createChangeThresholdMetaTransaction(newThreshold))
    }

    if (transactions.length === 0) {
      throw new ValueError('No changes to make - owners and threshold are the same')
    }

    return await this._propose(transactions, config)
  }

  /**
   * Returns a read-only copy of this account.
   *
   * @returns {Promise<WalletAccountReadOnlyMultisigEvmSafe4337>} The read-only account
   */
  async toReadOnlyAccount () {
    const address = await this.getAddress()

    return new WalletAccountReadOnlyMultisigEvmSafe4337({
      ...this._config,
      safeOptions: { safeAddress: address }
    })
  }

  /**
   * Disposes the wallet account, clearing sensitive data from memory.
   */
  dispose () {
    if (this._signerAccount) {
      this._signerAccount.dispose()
      this._signerAccount = null
    }
    this._paymasters.clear()
    this._bundler = undefined
    this._deployedSmartAccount = undefined
    this._transport = null
  }

  /** @private */
  _buildSigner () {
    return {
      address: this._signerAccount._address,
      signHash: async (hash) => this._signDigest(hash)
    }
  }

  /** @private */
  _signDigest (digest) {
    return this._signerAccount._account.signingKey.sign(digest).serialized
  }

  /** @private */
  _getProposalId (userOp) {
    return SafeAccount030.getUserOperationEip712Hash(userOp, this._config.chainId, this._getSafeOperationOptions())
  }

  /** @private */
  async _buildProposalPayload (userOp) {
    const { entrypointAddress, safe4337ModuleAddress } = this._getSafeOperationOptions()
    const safeAddress = await this.getAddress()

    return toTransportJson({
      entryPoint: entrypointAddress,
      moduleAddress: safe4337ModuleAddress,
      safeAddress,
      userOperation: userOp,
      options: { validAfter: 0, validUntil: 0 }
    })
  }

  /** @private */
  _aggregateSignatures (safeOperationResponse) {
    if (safeOperationResponse.preparedSignature) {
      return safeOperationResponse.preparedSignature
    }

    const pairs = safeOperationResponse.confirmations.map(confirmation => ({
      signer: confirmation.owner,
      signature: confirmation.signature
    }))

    return SafeAccount030.formatSignaturesToUseroperationSignature(pairs, { validAfter: 0n, validUntil: 0n })
  }

  /** @private */
  async _sendUserOperation (userOp) {
    try {
      const { entrypointAddress } = this._getSafeOperationOptions()
      return await this._getBundler().sendUserOperation(userOp, entrypointAddress)
    } catch (error) {
      if (error instanceof AbstractionKitError && error.message.includes('AA50')) {
        throw new Error('Not enough funds in the Safe to repay the paymaster.')
      }
      throw error
    }
  }
}
