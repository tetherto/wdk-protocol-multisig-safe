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

import SafeApiKit from '@safe-global/api-kit'

/** @typedef {import('./i-multisig-coordinator.js').IMultisigCoordinator} IMultisigCoordinator */
/** @typedef {import('./i-multisig-coordinator.js').MultisigCoordinatorMessageInput} MultisigCoordinatorMessageInput */
/** @typedef {import('@safe-global/api-kit').AddSafeOperationProps} AddSafeOperationProps */
/** @typedef {Awaited<ReturnType<import('@safe-global/api-kit').default['getSafeOperation']>>} SafeOperationResponse */
/** @typedef {Awaited<ReturnType<import('@safe-global/api-kit').default['getMessage']>>} SafeMessage */

/**
 * @typedef {Object} SafeTxServiceCoordinatorConfig
 * @property {bigint} chainId - Chain ID of the network the Safe lives on.
 * @property {string} [txServiceUrl] - Custom Safe Transaction Service URL (e.g. a backend proxy). Takes precedence over `apiKey`.
 * @property {string} [apiKey] - Safe API key for the hosted Safe Transaction Service.
 */

/**
 * Default {@link IMultisigCoordinator} implementation backed by the Safe
 * Transaction Service through `@safe-global/api-kit`.
 *
 * This is the only place in the package that talks to `@safe-global/api-kit`
 * directly. The underlying `SafeApiKit` instance is created lazily on first
 * use, so constructing the coordinator is cheap and never performs I/O.
 *
 * @implements {IMultisigCoordinator<AddSafeOperationProps, MultisigCoordinatorMessageInput, SafeOperationResponse, SafeMessage>}
 */
export default class SafeTxServiceCoordinator {
  /**
   * Creates a new Safe Transaction Service coordinator.
   *
   * @param {SafeTxServiceCoordinatorConfig} config - The coordinator configuration.
   */
  constructor (config) {
    /** @private */
    this._chainId = config.chainId

    /** @private */
    this._txServiceUrl = config.txServiceUrl

    /** @private */
    this._apiKey = config.apiKey

    /** @private */
    this._apiKit = undefined
  }

  /** @inheritdoc */
  async submitProposal (proposalId, proposal) {
    const apiKit = this._getApiKit()
    return apiKit.addSafeOperation(proposal)
  }

  /** @inheritdoc */
  async getProposal (proposalId) {
    const apiKit = this._getApiKit()
    try {
      return await apiKit.getSafeOperation(proposalId)
    } catch (error) {
      if (this._isNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /** @inheritdoc */
  async confirmProposal (proposalId, signature) {
    const apiKit = this._getApiKit()
    return apiKit.confirmSafeOperation(proposalId, signature)
  }

  /** @inheritdoc */
  async submitMessage (safeAddress, messageId, message) {
    const apiKit = this._getApiKit()
    return apiKit.addMessage(safeAddress, message)
  }

  /** @inheritdoc */
  async getMessage (messageId) {
    const apiKit = this._getApiKit()
    try {
      return await apiKit.getMessage(messageId)
    } catch (error) {
      if (this._isNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  /** @inheritdoc */
  async confirmMessage (messageId, signature) {
    const apiKit = this._getApiKit()
    return apiKit.addMessageSignature(messageId, signature)
  }

  /** @private */
  _isNotFoundError (error) {
    return error?.message?.toLowerCase().includes('not found')
  }

  /** @private */
  _getApiKit () {
    if (!this._apiKit) {
      const apiKitConfig = {
        chainId: this._chainId
      }

      if (this._txServiceUrl) {
        apiKitConfig.txServiceUrl = this._txServiceUrl
      } else if (this._apiKey) {
        apiKitConfig.apiKey = this._apiKey
      }

      this._apiKit = new SafeApiKit(apiKitConfig)
    }

    return this._apiKit
  }
}
