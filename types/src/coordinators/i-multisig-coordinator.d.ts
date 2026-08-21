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
 */
export interface IMultisigCoordinator<TProposal = Record<string, unknown>, TMessage = MultisigCoordinatorMessageInput, TProposalResponse = MultisigCoordinatorProposal, TMessageResponse = MultisigCoordinatorMessage> {
    /**
     * Submits a new transaction proposal so the other owners can confirm it.
     *
     * @param {TProposal} proposal - The signed transaction proposal to share. Opaque to the coordinator, which must persist it so {@link getProposal} can return it intact.
     * @returns {Promise<void>}
     */
    submitProposal(proposalId: string, proposal: TProposal): Promise<void>;
    /**
     * Returns a transaction proposal by its identifier.
     *
     * @param {string} proposalId - The proposal's identifier.
     * @returns {Promise<TProposalResponse | null>} The proposal, or null if it has not been found.
     */
    getProposal(proposalId: string): Promise<TProposalResponse | null>;
    /**
     * Adds an owner's confirmation (signature) to an existing transaction proposal.
     *
     * @param {string} proposalId - The proposal's identifier.
     * @param {string} signature - The owner's signature over the proposal.
     * @returns {Promise<void>}
     */
    confirmProposal(proposalId: string, signature: string): Promise<void>;
    /**
     * Submits a new message proposal so the other owners can confirm it.
     *
     * @param {string} accountAddress - The multisig account's address.
     * @param {TMessage} message - The message proposal to share.
     * @returns {Promise<void>}
     */
    submitMessage(accountAddress: string, messageId: string, message: TMessage): Promise<void>;
    /**
     * Returns a message proposal by its hash.
     *
     * @param {string} messageId - The message's hash.
     * @returns {Promise<TMessageResponse | null>} The message, or null if it has not been found.
     */
    getMessage(messageId: string): Promise<TMessageResponse | null>;
    /**
     * Adds an owner's confirmation (signature) to an existing message proposal.
     *
     * @param {string} messageId - The message's hash.
     * @param {string} signature - The owner's signature over the message.
     * @returns {Promise<void>}
     */
    confirmMessage(messageId: string, signature: string): Promise<void>;
}
export type MultisigCoordinatorMessageInput = {
    /**
     * - The message to sign.
     */
    message: string;
    /**
     * - The submitting owner's signature over the message.
     */
    signature: string;
};
export type MultisigCoordinatorProposal = {
    /**
     * - The owner confirmations (signatures) collected so far.
     */
    confirmations: unknown[];
};
export type MultisigCoordinatorMessage = {
    /**
     * - The owner confirmations (signatures) collected so far.
     */
    confirmations: unknown[];
};
/**
 * Recursively converts a value into a JSON-safe form so it survives JSON.stringify: every BigInt
 * becomes its decimal string and every byte array (Uint8Array, including Buffer) becomes a
 * 0x-prefixed lowercase hex string. Arrays and plain objects are converted entry by entry; all
 * other values are returned unchanged.
 *
 * @param {unknown} value - The value to convert (object, array, or primitive).
 * @returns {unknown} A JSON-safe copy of the value.
 */
export function toJsonSafe(value: unknown): unknown;
