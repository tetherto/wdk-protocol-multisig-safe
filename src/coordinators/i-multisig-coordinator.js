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

import { hexlify } from 'ethers'

import { NotImplementedError } from '@tetherto/wdk-wallet'

/**
 * A message proposal to share with the other owners for them to confirm.
 *
 * @typedef {Object} MultisigCoordinatorMessageInput
 * @property {string} message - The message to sign.
 * @property {string} signature - The submitting owner's signature over the message.
 */

/**
 * A shared transaction proposal returned by the coordinator. The concrete payload is
 * chain-specific and opaque to the coordinator: an implementation persists whatever the
 * chain's execution layer produced and returns it intact, alongside the owner
 * confirmations collected so far.
 *
 * @typedef {Object} MultisigCoordinatorProposal
 * @property {unknown[]} confirmations - The owner confirmations (signatures) collected so far.
 */

/**
 * A shared message proposal returned by the coordinator, alongside the owner confirmations
 * collected so far. As with proposals, any further fields are chain-specific.
 *
 * @typedef {Object} MultisigCoordinatorMessage
 * @property {unknown[]} confirmations - The owner confirmations (signatures) collected so far.
 */

/**
 * Coordinator for sharing multisig calldata between the owners of a multisig account.
 *
 * A coordinator distributes transaction proposals and message proposals (and their
 * confirmations) amongst the owners of a multisig account, so that signers running on
 * separate machines can coordinate without a shared process. The proposal and message
 * payloads are opaque to the coordinator and interpreted by this package, so a custom
 * backend (a hosted service, a database, a peer-to-peer channel, etc.) can be plugged in
 * by implementing this interface.
 *
 * Implementations that serialize the payloads themselves (rather than handing them to an
 * SDK that already does it) can pass them through {@link toJsonSafe} to convert native
 * values such as BigInt into JSON-safe forms before persisting or transmitting them.
 *
 * @interface
 * @template [TProposal=Record<string, unknown>]
 * @template [TMessage=MultisigCoordinatorMessageInput]
 * @template [TProposalResponse=MultisigCoordinatorProposal]
 * @template [TMessageResponse=MultisigCoordinatorMessage]
 */
export class IMultisigCoordinator {
  /**
   * Submits a new transaction proposal so the other owners can confirm it.
   *
   * @param {string} proposalId - The proposal's identifier, which the coordinator may use as its storage key.
   * @param {TProposal} proposal - The signed transaction proposal to share. Opaque to the coordinator, which must persist it so {@link getProposal} can return it intact.
   * @returns {Promise<void>}
   */
  async submitProposal (proposalId, proposal) {
    throw new NotImplementedError('submitProposal(proposalId, proposal)')
  }

  /**
   * Returns a transaction proposal by its identifier.
   *
   * @param {string} proposalId - The proposal's identifier.
   * @returns {Promise<TProposalResponse | null>} The proposal, or null if it has not been found.
   */
  async getProposal (proposalId) {
    throw new NotImplementedError('getProposal(proposalId)')
  }

  /**
   * Adds an owner's confirmation (signature) to an existing transaction proposal.
   *
   * @param {string} proposalId - The proposal's identifier.
   * @param {string} signature - The owner's signature over the proposal.
   * @returns {Promise<void>}
   */
  async confirmProposal (proposalId, signature) {
    throw new NotImplementedError('confirmProposal(proposalId, signature)')
  }

  /**
   * Submits a new message proposal so the other owners can confirm it.
   *
   * @param {string} accountAddress - The multisig account's address.
   * @param {string} messageId - The message's hash, which the coordinator may use as its storage key.
   * @param {TMessage} message - The message proposal to share.
   * @returns {Promise<void>}
   */
  async submitMessage (accountAddress, messageId, message) {
    throw new NotImplementedError('submitMessage(accountAddress, messageId, message)')
  }

  /**
   * Returns a message proposal by its hash.
   *
   * @param {string} messageId - The message's hash.
   * @returns {Promise<TMessageResponse | null>} The message, or null if it has not been found.
   */
  async getMessage (messageId) {
    throw new NotImplementedError('getMessage(messageId)')
  }

  /**
   * Adds an owner's confirmation (signature) to an existing message proposal.
   *
   * @param {string} messageId - The message's hash.
   * @param {string} signature - The owner's signature over the message.
   * @returns {Promise<void>}
   */
  async confirmMessage (messageId, signature) {
    throw new NotImplementedError('confirmMessage(messageId, signature)')
  }
}

/**
 * Recursively converts a value into a JSON-safe form so it survives JSON.stringify: every BigInt
 * becomes its decimal string, every byte array (Uint8Array, including Buffer) becomes a
 * 0x-prefixed lowercase hex string, and every Date becomes an ISO-8601 string. Arrays and plain
 * objects are converted entry by entry; all other values are returned unchanged.
 *
 * The conversion is one-way: there is no generic inverse, so a consumer that needs the original
 * types back restores them per field (it knows which fields are amounts, byte strings, etc.).
 *
 * @param {unknown} value - The value to convert (object, array, or primitive).
 * @returns {unknown} A JSON-safe copy of the value.
 */
export function toJsonSafe (value) {
  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (value instanceof Uint8Array) {
    return hexlify(value)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(toJsonSafe)
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toJsonSafe(entry)])
    )
  }

  return value
}
