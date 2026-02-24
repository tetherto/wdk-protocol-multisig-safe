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

import WalletAccountReadOnlyEvmMultisigSafe from './wallet-account-read-only-evm-multisig-safe.js'

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

/** @typedef {import('./wallet-account-read-only-evm-multisig-safe.js').EvmMultisigSafeConfig} EvmMultisigSafeConfig */
/** @typedef {import('./wallet-account-read-only-evm-multisig-safe.js').ProposeOptions} ProposeOptions */

/**
 * EVM multisig Safe wallet account with signing capabilities.
 * Provides full transaction and message signing operations.
 *
 * @implements {IWalletAccountMultisig}
 */
export default class WalletAccountEvmMultisigSafe extends WalletAccountReadOnlyEvmMultisigSafe {
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
   * Signs a message
   *
   * @param {string} message - The message to sign
   * @returns {Promise<string>} The signature
   */
  async sign (message) {
    const result = await this.proposeMessage(message)
    return result.signature
  }

  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  async verify (message, signature) {
    const safe4337Pack = await this._getSafe4337Pack()
    const protocolKit = safe4337Pack.protocolKit

    const messageHash = hashMessage(message)
    const isValid = await protocolKit.isValidSignature(messageHash, signature)

    return isValid
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
   * @param {MultisigSendOptions & ProposeOptions} [options] - Send and propose options
   * @returns {Promise<MultisigTransactionResult>} The transaction result
   */
  async sendTransaction (tx, options = {}) {
    const { autoExecute = false, ...proposeOptions } = options
    const { fee } = await this.quoteSendTransaction(tx, proposeOptions)

    const proposeResult = await this.propose(tx, proposeOptions)
    if (autoExecute && proposeResult.confirmations >= proposeResult.threshold) {
      const execResult = await this.execute(proposeResult.proposalId)
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
   * Transfers a token to another address.
   * Auto-executes if `autoExecute` is true and threshold is met after proposing.
   *
   * @param {TransferOptions} transferOptions - Transfer options
   * @param {MultisigSendOptions & ProposeOptions} [options] - Send and propose options
   * @returns {Promise<MultisigTransactionResult>} The transfer result
   */
  async transfer (transferOptions, options = {}) {
    const { autoExecute = false, ...proposeOptions } = options
    const tx = await WalletAccountEvm._getTransferTransaction(transferOptions)
    const { fee } = await this.quoteSendTransaction(tx, proposeOptions)

    if (this._config.transferMaxFee !== undefined && fee >= this._config.transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transfer operation.')
    }

    const proposeResult = await this.propose(tx, proposeOptions)

    if (autoExecute && proposeResult.confirmations >= proposeResult.threshold) {
      const execResult = await this.execute(proposeResult.proposalId)
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
   * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s) to propose
   * @param {ProposeOptions} [options] - Propose options
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async propose (transaction, options = {}) {
    await this.validateSignerIsOwner()

    const safe4337Pack = await this._getSafe4337Pack(options)
    const threshold = await this.getThreshold()

    const safeOperation = await this._createSafeOperation(transaction, options)
    const signedSafeOperation = await safe4337Pack.signSafeOperation(safeOperation)
    const proposalId = signedSafeOperation.getHash()

    const apiKit = await this._getApiKit()
    await apiKit.addSafeOperation(signedSafeOperation)

    return {
      proposalId,
      confirmations: 1,
      threshold
    }
  }

  /**
   * Approves (signs) an existing proposal.
   *
   * @param {string} proposalId - The Safe operation hash to approve
   * @returns {Promise<MultisigResult>} Approval result
   */
  async approve (proposalId) {
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
   * @param {string} proposalId - The Safe operation hash to reject
   * @returns {Promise<MultisigResult>} The rejection proposal result
   */
  async reject (proposalId) {
    await this.validateSignerIsOwner()

    const apiKit = await this._getApiKit()
    const safeOperationResponse = await apiKit.getSafeOperation(proposalId)

    if (!safeOperationResponse) {
      throw new Error(`SafeOperation not found: ${proposalId}`)
    }

    const safeAddress = await this.getAddress()

    const rejectionTx = {
      to: safeAddress,
      value: '0',
      data: '0x'
    }

    return await this.propose(rejectionTx)
  }

  /**
   * Executes a fully signed Safe operation via the bundler.
   *
   * @param {string} proposalId - The Safe operation hash to execute
   * @returns {Promise<MultisigExecuteResult>} The execution result
   */
  async execute (proposalId) {
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
   * @param {MultisigOptions & ProposeOptions} [options] - Options with optional threshold and propose options
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async addOwner (ownerAddress, options = {}) {
    const { threshold: newThreshold, ...proposeOptions } = options
    const safe4337Pack = await this._getSafe4337Pack()
    const threshold = newThreshold || await this.getThreshold()

    const tx = await safe4337Pack.protocolKit.createAddOwnerTx({
      ownerAddress,
      threshold
    })

    return await this.propose({
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data
    }, proposeOptions)
  }

  /**
   * Proposes removing an owner from the Safe.
   *
   * @param {string} ownerAddress - Address of owner to remove
   * @param {MultisigOptions & ProposeOptions} [options] - Options with optional threshold and propose options
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async removeOwner (ownerAddress, options = {}) {
    const { threshold: newThreshold, ...proposeOptions } = options
    const safe4337Pack = await this._getSafe4337Pack()
    const owners = await this.getOwners()
    const currentThreshold = await this.getThreshold()

    let threshold = newThreshold || currentThreshold
    if (threshold > owners.length - 1) {
      threshold = owners.length - 1
    }

    const tx = await safe4337Pack.protocolKit.createRemoveOwnerTx({
      ownerAddress,
      threshold
    })

    return await this.propose({
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data
    }, proposeOptions)
  }

  /**
   * Proposes swapping an owner with a new address.
   *
   * @param {string} oldOwnerAddress - Address of owner to remove
   * @param {string} newOwnerAddress - Address of new owner
   * @param {ProposeOptions} [options] - Propose options
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async swapOwner (oldOwnerAddress, newOwnerAddress, options = {}) {
    const safe4337Pack = await this._getSafe4337Pack()

    const tx = await safe4337Pack.protocolKit.createSwapOwnerTx({
      oldOwnerAddress,
      newOwnerAddress
    })

    return await this.propose({
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data
    }, options)
  }

  /**
   * Proposes changing the Safe threshold.
   *
   * @param {number} newThreshold - New threshold value
   * @param {ProposeOptions} [options] - Propose options
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async changeThreshold (newThreshold, options = {}) {
    const safe4337Pack = await this._getSafe4337Pack()

    const tx = await safe4337Pack.protocolKit.createChangeThresholdTx(newThreshold)

    return await this.propose({
      to: tx.data.to,
      value: tx.data.value,
      data: tx.data.data
    }, options)
  }

  /**
   * Proposes updating all owners and threshold in a batch.
   *
   * @param {string[]} newOwners - Array of new owner addresses
   * @param {number} newThreshold - New threshold value
   * @param {ProposeOptions} [options] - Propose options
   * @returns {Promise<MultisigResult>} The proposal result
   */
  async updateOwners (newOwners, newThreshold, options = {}) {
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
        threshold: Math.min(currentThreshold, newOwners.length)
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

    return await this.propose(transactions, options)
  }

  /**
   * Returns a read-only copy of this account.
   *
   * @returns {Promise<WalletAccountReadOnlyEvmMultisigSafe>} The read-only account
   */
  async toReadOnlyAccount () {
    const address = await this.getAddress()

    if (!address) {
      throw new Error('Cannot create read-only account before address is resolved. Call getAddress() first.')
    }

    return new WalletAccountReadOnlyEvmMultisigSafe(null, {
      ...this._config,
      options: { safeAddress: address }
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
    this._safe4337Pack = null
    this._apiKit = null
  }
}
