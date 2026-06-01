/**
 * A message proposal to submit for the other owners to confirm.
 *
 * @typedef {Object} TransportMessageInput
 * @property {string} message - The message to sign.
 * @property {string} signature - The caller's signature.
 */
/**
 * A shared transaction proposal. Its concrete shape is defined by the
 * transport's backend; the properties below are the ones this package reads.
 * The object is passed verbatim to the relay layer to sign and execute the
 * operation, so a transport must preserve any additional backend-specific fields.
 *
 * @typedef {Object} TransportProposal
 * @property {unknown[]} confirmations - The confirmations (signatures) collected so far.
 * @property {{ nonce?: string | number }} [userOperation] - The protocol user-operation; its `nonce` is required to reject the proposal.
 */
/**
 * A shared message proposal returned by the transport.
 *
 * @typedef {Object} TransportMessage
 * @property {string} messageHash - The message's hash.
 * @property {string} message - The original message.
 * @property {unknown[]} confirmations - The confirmations (signatures) collected so far.
 * @property {string | null} preparedSignature - The combined signature once the threshold is met, or null otherwise.
 */
/**
 * Transport interface for sharing multisig calldata between signers.
 *
 * A transport is responsible for distributing transaction proposals and
 * message proposals (and their confirmations) amongst the owners of a
 * multisig wallet. The default implementation, {@link SafeTxServiceTransport},
 * uses the Safe Transaction Service, but any backend (a custom relay, a
 * database, a peer-to-peer channel, etc.) can be plugged in by implementing
 * this interface and passing it through the `transport` configuration field.
 *
 * Proposal and message objects are passed through verbatim between the wallet
 * account and the transport, so a custom transport must return objects whose
 * shape matches what the account expects (see the parameter and return
 * descriptions of each method).
 */
export default class IMultisigTransport {
    /**
     * Submits a new transaction proposal so other owners can confirm it.
     *
     * @param {Record<string, unknown>} proposal - The signed transaction proposal to share. Opaque to the transport, which must persist it so {@link getProposal} can return it intact.
     * @returns {Promise<void>}
     */
    submitProposal(proposal: Record<string, unknown>): Promise<void>;
    /**
     * Returns a transaction proposal by its identifier.
     *
     * @param {string} proposalId - The proposal's identifier.
     * @returns {Promise<TransportProposal | null>} The proposal, or null/throws if not found.
     */
    getProposal(proposalId: string): Promise<TransportProposal | null>;
    /**
     * Adds the caller's confirmation (signature) to an existing transaction proposal.
     *
     * @param {string} proposalId - The proposal's identifier.
     * @param {string} signature - The caller's signature.
     * @returns {Promise<void>}
     */
    confirmProposal(proposalId: string, signature: string): Promise<void>;
    /**
     * Submits a new message proposal so other owners can confirm it.
     *
     * @param {string} safeAddress - The multisig wallet's address.
     * @param {TransportMessageInput} message - The message proposal to share.
     * @returns {Promise<void>}
     */
    submitMessage(safeAddress: string, message: TransportMessageInput): Promise<void>;
    /**
     * Returns a message proposal by its hash.
     *
     * @param {string} messageHash - The message's hash.
     * @returns {Promise<TransportMessage | null>} The message, or null/throws if not found.
     */
    getMessage(messageHash: string): Promise<TransportMessage | null>;
    /**
     * Adds the caller's confirmation (signature) to an existing message proposal.
     *
     * @param {string} messageHash - The message's hash.
     * @param {string} signature - The caller's signature.
     * @returns {Promise<void>}
     */
    confirmMessage(messageHash: string, signature: string): Promise<void>;
}
export type TransportMessageInput = {
    /**
     * - The message to sign.
     */
    message: string;
    /**
     * - The caller's signature.
     */
    signature: string;
};
export type TransportProposal = {
    /**
     * - The confirmations (signatures) collected so far.
     */
    confirmations: unknown[];
    /**
     * - The protocol user-operation; its `nonce` is required to reject the proposal.
     */
    userOperation?: {
        nonce?: string | number;
    };
};
export type TransportMessage = {
    /**
     * - The message's hash.
     */
    messageHash: string;
    /**
     * - The original message.
     */
    message: string;
    /**
     * - The confirmations (signatures) collected so far.
     */
    confirmations: unknown[];
    /**
     * - The combined signature once the threshold is met, or null otherwise.
     */
    preparedSignature: string | null;
};
