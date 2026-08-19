'use strict'

import { recoverAddress } from 'ethers'

import { IMultisigTransport } from '../../index.js'

// Strips the validAfter|validUntil prefix from a formatted SafeOperation signature,
// leaving the trailing 65-byte ECDSA signature (the single proposer's signature).
function rawSignatureOf (formattedSignature) {
  return '0x' + formattedSignature.replace(/^0x/, '').slice(-130)
}

function sameAddress (a, b) {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * A faithful in-memory stand-in for the Safe Transaction Service, used by the integration tests
 * so that two separate signer instances can coordinate over a single shared transport.
 *
 * It recovers each signer from the EIP-712 digest they signed (exactly as the real service does),
 * accumulates confirmations, and exposes the combined message signature once collected.
 */
export default class InMemoryTransport extends IMultisigTransport {
  constructor (chainId) {
    super()
    this._chainId = chainId
    this._proposals = new Map()
    this._messages = new Map()
  }

  async submitProposal (proposalId, proposal) {
    const { userOperation } = proposal

    const signature = rawSignatureOf(userOperation.signature)
    const owner = recoverAddress(proposalId, signature)

    this._proposals.set(proposalId, {
      userOperation,
      confirmations: [{ owner, signature }]
    })
  }

  async getProposal (proposalId) {
    const proposal = this._proposals.get(proposalId)

    if (!proposal) {
      return null
    }

    return {
      userOperation: proposal.userOperation,
      confirmations: proposal.confirmations.map(confirmation => ({ ...confirmation }))
    }
  }

  async confirmProposal (proposalId, signature) {
    const proposal = this._proposals.get(proposalId)

    if (!proposal) {
      throw new Error(`SafeOperation not found: ${proposalId}`)
    }

    const owner = recoverAddress(proposalId, signature)

    if (!proposal.confirmations.some(confirmation => sameAddress(confirmation.owner, owner))) {
      proposal.confirmations.push({ owner, signature })
    }
  }

  async submitMessage (safeAddress, messageId, { message, signature }) {
    const owner = recoverAddress(messageId, signature)

    this._messages.set(messageId, {
      messageId,
      message,
      confirmations: [{ owner, signature }]
    })

    this._refreshCombinedSignature(messageId)
  }

  async getMessage (messageId) {
    const message = this._messages.get(messageId)

    if (!message) {
      return null
    }

    return {
      messageId: message.messageId,
      message: message.message,
      confirmations: message.confirmations.map(confirmation => ({ ...confirmation })),
      preparedSignature: message.preparedSignature
    }
  }

  async confirmMessage (messageId, signature) {
    const message = this._messages.get(messageId)

    if (!message) {
      throw new Error(`Message not found: ${messageId}`)
    }

    const owner = recoverAddress(messageId, signature)

    if (!message.confirmations.some(confirmation => sameAddress(confirmation.owner, owner))) {
      message.confirmations.push({ owner, signature })
    }

    this._refreshCombinedSignature(messageId)
  }

  _refreshCombinedSignature (messageId) {
    const message = this._messages.get(messageId)

    const sorted = [...message.confirmations].sort((a, b) =>
      a.owner.toLowerCase() < b.owner.toLowerCase() ? -1 : 1
    )

    message.preparedSignature = '0x' + sorted.map(confirmation => confirmation.signature.replace(/^0x/, '')).join('')
  }
}
