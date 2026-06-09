'use strict'

import { recoverAddress, hashMessage, TypedDataEncoder } from 'ethers'

// eslint-disable-next-line camelcase
import { SafeAccountV0_3_0 as SafeAccount } from 'abstractionkit'

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

  async submitProposal (proposal) {
    const { userOperation, entryPoint, moduleAddress } = proposal

    const proposalId = SafeAccount.getUserOperationEip712Hash(userOperation, this._chainId, {
      validAfter: 0n,
      validUntil: 0n,
      entrypointAddress: entryPoint,
      safe4337ModuleAddress: moduleAddress
    })

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
      throw new Error(`SafeOperation not found: ${proposalId}`)
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

  async submitMessage (safeAddress, { message, signature }) {
    const messageHash = this._messageHash(safeAddress, message)
    const owner = recoverAddress(messageHash, signature)

    this._messages.set(messageHash, {
      messageHash,
      message,
      confirmations: [{ owner, signature }]
    })

    this._refreshCombinedSignature(messageHash)
  }

  async getMessage (messageHash) {
    const message = this._messages.get(messageHash)

    if (!message) {
      throw new Error(`Message not found: ${messageHash}`)
    }

    return {
      messageHash: message.messageHash,
      message: message.message,
      confirmations: message.confirmations.map(confirmation => ({ ...confirmation })),
      preparedSignature: message.preparedSignature
    }
  }

  async confirmMessage (messageHash, signature) {
    const message = this._messages.get(messageHash)

    if (!message) {
      throw new Error(`Message not found: ${messageHash}`)
    }

    const owner = recoverAddress(messageHash, signature)

    if (!message.confirmations.some(confirmation => sameAddress(confirmation.owner, owner))) {
      message.confirmations.push({ owner, signature })
    }

    this._refreshCombinedSignature(messageHash)
  }

  _messageHash (safeAddress, message) {
    const domain = { chainId: Number(this._chainId), verifyingContract: safeAddress }
    const types = { SafeMessage: [{ type: 'bytes', name: 'message' }] }
    const value = { message: hashMessage(message) }

    return TypedDataEncoder.hash(domain, types, value)
  }

  _refreshCombinedSignature (messageHash) {
    const message = this._messages.get(messageHash)

    const sorted = [...message.confirmations].sort((a, b) =>
      a.owner.toLowerCase() < b.owner.toLowerCase() ? -1 : 1
    )

    message.preparedSignature = '0x' + sorted.map(confirmation => confirmation.signature.replace(/^0x/, '')).join('')
  }
}
