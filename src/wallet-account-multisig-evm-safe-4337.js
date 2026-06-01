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

import { hashMessage } from 'ethers'

import { WalletAccountEvm } from '@tetherto/wdk-wallet-evm'

import WalletAccountReadOnlyMultisigEvmSafe4337 from './wallet-account-read-only-multisig-evm-safe-4337.js'

/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */

/** @typedef {import('@tetherto/wdk-wallet').IWalletAccountMultisig} IWalletAccountMultisig */
/** @typedef {import('@tetherto/wdk-wallet').MultisigResult} MultisigResult */
/** @typedef {import('@tetherto/wdk-wallet').MultisigTransactionResult} MultisigTransactionResult */
/** @typedef {import('@tetherto/wdk-wallet').MultisigExecuteResult} MultisigExecuteResult */
/** @typedef {import('@tetherto/wdk-wallet').MultisigSendOptions} MultisigSendOptions */
/** @typedef {import('@tetherto/wdk-wallet').MultisigOptions} MultisigOptions */
/** @typedef {import('@tetherto/wdk-wallet').MessageProposal} MessageProposal */

/** @typedef {import('@tetherto/wdk-wallet-evm').KeyPair} KeyPair */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */

/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeConfig} EvmMultisigSafeConfig */
/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafePaymasterTokenConfig} EvmMultisigSafePaymasterTokenConfig */
/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeSponsoredConfig} EvmMultisigSafeSponsoredConfig */
/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeNativeCoinsConfig} EvmMultisigSafeNativeCoinsConfig */

/**
 * EVM multisig Safe wallet account with signing capabilities.
 * Provides full transaction and message signing operations.
 *
 * @implements {IWalletAccountMultisig}
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

    super(signerAccount._address, config)

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
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return this._signerAccount.keyPair
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
   * Proposes a new message or approves an existing one.
   *
   * @param {string} message - The message to sign
   * @returns {Promise<MessageProposal>} The sign result
   */
  async proposeMessage (message) {
    await this.validateSignerIsOwner()

    const safe4337Pack = await this._getSafe4337Pack()
    const protocolKit = safe4337Pack.protocolKit
    const apiKit = await this._getApiKit()
    const safeAddress = await this.getAddress()

    const safeMessage = protocolKit.createMessage(message)
    const signedMessage = await protocolKit.signMessage(safeMessage)

    const signerAddress = await this.getSignerAddress()
    const signature = signedMessage.getSignature(signerAddress.toLowerCase())

    if (!signature) {
      throw new Error('Failed to generate signature')
    }

    const messageHash = await protocolKit.getSafeMessageHash(
      hashMessage(message)
    )

    await apiKit.addMessage(safeAddress, {
      message,
      signature: signature.data
    })

    const safeMessageResponse = await apiKit.getMessage(messageHash)
    const threshold = await this.getThreshold()
    return {
      messageHash,
      signature: signature.data,
      confirmations: safeMessageResponse.confirmations?.length || 0,
      threshold,
      combinedSignature: safeMessageResponse.preparedSignature || null
    }
  }

  /**
   * Approves an existing message proposal.
   *
   * @param {string} messageHash - The message hash to approve
   * @returns {Promise<MessageProposal>} The approval result
   */
  async approveMessage (messageHash) {
    await this.validateSignerIsOwner()

    const safe4337Pack = await this._getSafe4337Pack()
    const protocolKit = safe4337Pack.protocolKit
    const apiKit = await this._getApiKit()

    const existingMessage = await apiKit.getMessage(messageHash)

    if (!existingMessage) {
      throw new Error(`Message not found: ${messageHash}`)
    }

    const safeMessage = protocolKit.createMessage(existingMessage.message)
    const signedMessage = await protocolKit.signMessage(safeMessage)

    const signerAddress = await this.getSignerAddress()
    const signature = signedMessage.getSignature(signerAddress.toLowerCase())

    if (!signature) {
      throw new Error('Failed to generate signature')
    }

    await apiKit.addMessageSignature(messageHash, signature.data)

    const safeMessageResponse = await apiKit.getMessage(messageHash)
    const threshold = await this.getThreshold()

    return {
      messageHash,
      signature: signature.data,
      confirmations: safeMessageResponse.confirmations?.length || 0,
      threshold,
      combinedSignature: safeMessageResponse.preparedSignature || null
    }
  }

  /**
   * Validates that the signer is an owner of the Safe.
   *
   * @returns {Promise<void>}
   * @throws {Error} If signer is not an owner
   */
  async validateSignerIsOwner () {
    const signerAddress = await this.getSignerAddress()
    const owners = await this.getOwners()

    const isOwner = owners.some(
      owner => owner.toLowerCase() === signerAddress.toLowerCase()
    )

    if (!isOwner) {
      const safeAddress = await this.getAddress()
      throw new Error(
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

    const safe4337Pack = await this._getSafe4337Pack()
    const deploymentTx = await safe4337Pack.protocolKit.createSafeDeploymentTransaction()

    const result = await this._signerAccount.sendTransaction({
      to: deploymentTx.to,
      value: BigInt(deploymentTx.value),
      data: deploymentTx.data
    })

    this._resetState()

    return result
  }

  /**
   * Sends a transaction - proposes for multisig approval.
   * Auto-executes if `autoExecute` is true and threshold is met after proposing.
   *
   * @param {EvmTransaction} tx - The transaction to send
   * @param {MultisigSendOptions & Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [options] - Send and paymaster config options
   * @returns {Promise<MultisigTransactionResult>} The transaction result
   */
  async sendTransaction (tx, options = {}) {
    const { autoExecute = false, ...config } = options
    const { fee } = await this.quoteSendTransaction(tx, config)

    return await this._submitTransaction(tx, config, fee, autoExecute)
  }

  /**
   * Transfers a token to another address.
   * Auto-executes if `autoExecute` is true and threshold is met after proposing.
   *
   * @param {TransferOptions} transferOptions - Transfer options
   * @param {MultisigSendOptions & Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [options] - Send and paymaster config options
   * @returns {Promise<MultisigTransactionResult>} The transfer result
   */
  async transfer (transferOptions, options = {}) {
    const { autoExecute = false, ...config } = options
    const mergedConfig = { ...this._config, ...config }
    const tx = await WalletAccountEvm._getTransferTransaction(transferOptions)
    const { fee } = await this.quoteSendTransaction(tx, config)

    const { isSponsored, useNativeCoins, transferMaxFee } = mergedConfig
    if (!isSponsored && !useNativeCoins && transferMaxFee !== undefined && fee >= transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transfer operation.')
    }

    return await this._submitTransaction(tx, config, fee, autoExecute)
  }

  /**
   * Proposes a transaction, optionally executes if threshold is met.
   *
   * @private
   * @param {EvmTransaction} tx - The transaction
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - Paymaster config override
   * @param {bigint} fee - The estimated fee
   * @param {boolean} autoExecute - Whether to auto-execute if threshold is met
   * @returns {Promise<MultisigTransactionResult>} The transaction result
   */
  async _submitTransaction (tx, config, fee, autoExecute) {
    const proposeResult = await this._propose(tx, config)

    if (autoExecute && proposeResult.confirmations >= proposeResult.threshold) {
      const execResult = await this.executeTx(proposeResult.proposalId)
      return {
        proposalId: proposeResult.proposalId,
        hash: execResult.hash,
        fee,
        confirmations: proposeResult.confirmations,
        threshold: proposeResult.threshold,
        executed: true
      }
    }

    return {
      proposalId: proposeResult.proposalId,
      hash: proposeResult.proposalId,
      fee,
      confirmations: proposeResult.confirmations,
      threshold: proposeResult.threshold,
      executed: false
    }
  }

  /**
   * Proposes a new transaction for multisig approval.
   * Creates a SafeOperation, signs it, and uploads to Safe Transaction Service.
   *
   * Note: `rejectTx()` passes `customNonce` via config to reuse the original proposal's nonce.
   *
   * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s) to propose
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async _propose (transaction, config) {
    await this.validateSignerIsOwner()

    const safe4337Pack = await this._getSafe4337Pack(config)
    const threshold = await this.getThreshold()

    const safeOperation = await this._createSafeOperation(transaction, config)
    const signedSafeOperation = await safe4337Pack.signSafeOperation(safeOperation)
    const proposalId = signedSafeOperation.getHash()

    const apiKit = await this._getApiKit()
    await apiKit.addSafeOperation(signedSafeOperation)

    const safeOperationResponse = await apiKit.getSafeOperation(proposalId)

    return {
      proposalId,
      confirmations: safeOperationResponse.confirmations?.length || 0,
      threshold
    }
  }

  /**
   * Approves (signs) an existing proposal.
   *
   * @param {string} proposalId - The Safe operation hash to approveTx
   * @returns {Promise<MultisigResult>} Approval result
   */
  async approveTx (proposalId) {
    await this.validateSignerIsOwner()

    const safe4337Pack = await this._getSafe4337Pack()
    const apiKit = await this._getApiKit()

    const safeOperationResponse = await apiKit.getSafeOperation(proposalId)

    if (!safeOperationResponse) {
      throw new Error(`SafeOperation not found: ${proposalId}`)
    }

    const signedSafeOperation = await safe4337Pack.signSafeOperation(safeOperationResponse)

    const signerAddress = await this.getSignerAddress()
    const signerKey = signerAddress.toLowerCase()

    let signature = null
    if (signedSafeOperation.signatures) {
      const sig = signedSafeOperation.signatures.get(signerKey)
      if (sig && sig.data) {
        signature = sig.data
      }
    }

    if (!signature) {
      throw new Error('Failed to generate signature')
    }

    await apiKit.confirmSafeOperation(proposalId, signature)

    const updatedOperation = await apiKit.getSafeOperation(proposalId)
    const confirmations = updatedOperation.confirmations?.length || 0
    const threshold = await this.getThreshold()

    return { proposalId, confirmations, threshold }
  }

  /**
   * Rejects a proposal by creating a rejection transaction.
   * A rejection is a zero-value transaction to the Safe itself with the same nonce.
   *
   * @param {string} proposalId - The Safe operation hash to rejectTx
   * @returns {Promise<MultisigResult>} The rejection proposal result
   */
  async rejectTx (proposalId) {
    const apiKit = await this._getApiKit()
    const safeOperationResponse = await apiKit.getSafeOperation(proposalId)

    if (!safeOperationResponse) {
      throw new Error(`SafeOperation not found: ${proposalId}`)
    }

    const nonce = safeOperationResponse.userOperation?.nonce
    if (nonce === undefined) {
      throw new Error('Cannot reject: original proposal has no nonce')
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
   * @param {string} proposalId - The Safe operation hash to executeTx
   * @returns {Promise<MultisigExecuteResult>} The execution result
   */
  async executeTx (proposalId) {
    const safe4337Pack = await this._getSafe4337Pack()
    const apiKit = await this._getApiKit()

    const safeOperationResponse = await apiKit.getSafeOperation(proposalId)

    if (!safeOperationResponse) {
      throw new Error(`SafeOperation not found: ${proposalId}`)
    }

    const confirmations = safeOperationResponse.confirmations?.length || 0
    const threshold = await this.getThreshold()

    if (confirmations < threshold) {
      throw new Error(
        `Not enough confirmations: ${confirmations}/${threshold}. ` +
        `Need ${threshold - confirmations} more signature(s).`
      )
    }

    const userOpHash = await safe4337Pack.executeTransaction({
      executable: safeOperationResponse
    })

    this._resetState()

    return {
      hash: userOpHash
    }
  }

  /**
   * Proposes adding a new owner to the Safe.
   *
   * @param {string} ownerAddress - Address of new owner
   * @param {MultisigOptions & Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [options] - Options with optional threshold and paymaster config
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async addOwner (ownerAddress, options = {}) {
    const { threshold: newThreshold, ...config } = options

    const safe4337Pack = await this._getSafe4337Pack()
    const threshold = newThreshold || await this.getThreshold()

    const tx = await safe4337Pack.protocolKit.createAddOwnerTx({
      ownerAddress,
      threshold
    })

    return await this._propose({
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data
    }, config)
  }

  /**
   * Proposes removing an owner from the Safe.
   *
   * @param {string} ownerAddress - Address of owner to remove
   * @param {MultisigOptions & Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [options] - Options with optional threshold and paymaster config
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async removeOwner (ownerAddress, options = {}) {
    const { threshold: newThreshold, ...config } = options

    const safe4337Pack = await this._getSafe4337Pack()
    const currentThreshold = await this.getThreshold()

    const tx = await safe4337Pack.protocolKit.createRemoveOwnerTx({
      ownerAddress,
      threshold: newThreshold || currentThreshold
    })

    return await this._propose({
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data
    }, config)
  }

  /**
   * Proposes swapping an owner with a new address.
   *
   * @param {string} oldOwnerAddress - Address of owner to remove
   * @param {string} newOwnerAddress - Address of new owner
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async swapOwner (oldOwnerAddress, newOwnerAddress, config) {
    const safe4337Pack = await this._getSafe4337Pack()

    const tx = await safe4337Pack.protocolKit.createSwapOwnerTx({
      oldOwnerAddress,
      newOwnerAddress
    })

    return await this._propose({
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data
    }, config)
  }

  /**
   * Proposes changing the Safe threshold.
   *
   * @param {number} newThreshold - New threshold value
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async changeThreshold (newThreshold, config) {
    const safe4337Pack = await this._getSafe4337Pack()

    const tx = await safe4337Pack.protocolKit.createChangeThresholdTx(newThreshold)

    return await this._propose({
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data
    }, config)
  }

  /**
   * Proposes updating all owners and threshold in a batch.
   *
   * @param {string[]} newOwners - Array of new owner addresses
   * @param {number} newThreshold - New threshold value
   * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async updateOwners (newOwners, newThreshold, config) {
    const safe4337Pack = await this._getSafe4337Pack()
    const currentOwners = await this.getOwners()
    const currentThreshold = await this.getThreshold()

    const currentOwnersLower = currentOwners.map(o => o.toLowerCase())
    const newOwnersLower = newOwners.map(o => o.toLowerCase())

    const toAdd = newOwners.filter(o => !currentOwnersLower.includes(o.toLowerCase()))
    const toRemove = currentOwners.filter(o => !newOwnersLower.includes(o.toLowerCase()))

    const transactions = []

    for (const owner of toAdd) {
      const tx = await safe4337Pack.protocolKit.createAddOwnerTx({
        ownerAddress: owner,
        threshold: currentThreshold
      })
      transactions.push({
        to: tx.data.to,
        value: tx.data.value,
        data: tx.data.data
      })
    }

    for (const owner of toRemove) {
      const tx = await safe4337Pack.protocolKit.createRemoveOwnerTx({
        ownerAddress: owner,
        threshold: Math.max(1, Math.min(currentThreshold, newOwners.length))
      })
      transactions.push({
        to: tx.data.to,
        value: tx.data.value,
        data: tx.data.data
      })
    }

    if (newThreshold !== currentThreshold) {
      const tx = await safe4337Pack.protocolKit.createChangeThresholdTx(newThreshold)
      transactions.push({
        to: tx.data.to,
        value: tx.data.value,
        data: tx.data.data
      })
    }

    if (transactions.length === 0) {
      throw new Error('No changes to make - owners and threshold are the same')
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

    return new WalletAccountReadOnlyMultisigEvmSafe4337(null, {
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
    this._safe4337Packs.clear()
    this._apiKit = null
  }
}
