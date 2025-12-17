/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */
/** @typedef {import('@tetherto/wdk-wallet').IWalletAccount} IWalletAccount */
/** @typedef {import('@tetherto/wdk-wallet-evm').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('./wallet-account-read-only-evm-multisig-safe.js').EvmMultisigSafeConfig} EvmMultisigSafeConfig */
/** @typedef {import('./wallet-account-read-only-evm-multisig-safe.js').ProposeOptions} ProposeOptions */
/**
 * @typedef {Object} ProposeResult
 * @property {string} safeOperationHash - The Safe operation hash
 * @property {number} confirmations - Number of confirmations
 * @property {number} threshold - Required threshold
 */
/**
 * @typedef {Object} ApprovalResult
 * @property {number} confirmations - Number of confirmations
 * @property {number} threshold - Required threshold
 */
/**
 * @typedef {Object} ExecuteResult
 * @property {string} hash - The UserOperation hash
 */
/**
 * @typedef {Object} MessageProposalResult
 * @property {string} messageHash - The Safe message hash
 * @property {number} confirmations - Number of confirmations
 * @property {number} threshold - Required threshold
 */
/**
 * Result of a multisig transaction (sendTransaction/transfer).
 *
 * @typedef {Object} MultisigTransactionResult
 * @property {string} hash - Safe operation hash (if not executed) or UserOp hash (if executed)
 * @property {bigint} fee - Estimated fee in paymaster token units
 * @property {number} confirmations - Current number of confirmations
 * @property {number} threshold - Required threshold for execution
 * @property {boolean} executed - Whether transaction was executed
 */
/**
 * EVM multisig Safe wallet account with signing capabilities.
 * Provides full transaction and message signing operations.
 *
 * @extends WalletAccountReadOnlyEvmMultisigSafe
 * @implements {IWalletAccount}
 */
export default class WalletAccountEvmMultisigSafe extends WalletAccountReadOnlyEvmMultisigSafe implements IWalletAccount {
    /**
     * Creates a new EVM multisig Safe wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g., "0'/0/0")
     * @param {EvmMultisigSafeConfig} config - The configuration object
     */
    constructor(seed: string | Uint8Array, path: string, config: EvmMultisigSafeConfig);
    /**
     * The signer account.
     *
     * @private
     * @type {WalletAccountEvm}
     */
    private _signerAccount;
    /**
     * The derivation path.
     *
     * @private
     * @type {string}
     */
    private _path;
    /**
     * The derivation path's index of this account.
     *
     * @type {number}
     */
    get index(): number;
    /**
     * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @type {string}
     */
    get path(): string;
    /**
     * The account's key pair.
     *
     * @type {KeyPair}
     */
    get keyPair(): KeyPair;
    /**
     * Not supported for Safe multisig accounts.
     * Use {@link proposeMessage} for multisig message signing.
     *
     * @param {string} _message - The message to sign (unused)
     * @returns {Promise<never>}
     * @throws {Error} Always throws
     */
    sign(_message: string): Promise<never>;
    /**
     * Not supported for Safe multisig accounts.
     * Use {@link getMessage} to retrieve multisig message signatures.
     *
     * @param {string} _message - The original message (unused)
     * @param {string} _signature - The signature to verify (unused)
     * @returns {Promise<never>}
     * @throws {Error} Always throws
     */
    verify(_message: string, _signature: string): Promise<never>;
    /**
     * Proposes a message for multisig signing.
     * Creates a SafeMessage, signs it, and uploads to Safe Transaction Service.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<MessageProposalResult>} The proposal result.
     */
    proposeMessage(message: string): Promise<MessageProposalResult>;
    /**
     * Approves (co-signs) an existing message proposal.
     *
     * @param {string} messageHash - The Safe message hash to approve.
     * @returns {Promise<ApprovalResult>} The approval result.
     */
    approveMessage(messageHash: string): Promise<ApprovalResult>;
    /**
     * Validates that the signer is an owner of the Safe.
     *
     * @returns {Promise<void>}
     * @throws {Error} If signer is not an owner
     */
    validateSignerIsOwner(): Promise<void>;
    /**
     * Deploys the Safe if not already deployed.
     *
     * @returns {Promise<{deployed: boolean, txHash: string | null}>} Deployment result
     */
    deploy(): Promise<{
        deployed: boolean;
        txHash: string | null;
    }>;
    /**
     * Sends a transaction - proposes for multisig approval.
     * Auto-executes if threshold is met after proposing.
     *
     * @param {EvmTransaction} tx - The transaction to send
     * @param {ProposeOptions} [options] - Propose options (paymaster override)
     * @returns {Promise<MultisigTransactionResult>} The transaction result
     */
    sendTransaction(tx: EvmTransaction, options?: ProposeOptions): Promise<MultisigTransactionResult>;
    /**
     * Transfers a token to another address.
     * Auto-executes if threshold is met after proposing.
     *
     * @param {TransferOptions} transferOptions - Transfer options
     * @param {ProposeOptions} [options] - Propose options (paymaster override)
     * @returns {Promise<MultisigTransactionResult>} The transfer result
     */
    transfer(transferOptions: TransferOptions, options?: ProposeOptions): Promise<MultisigTransactionResult>;
    /**
     * Proposes a new transaction for multisig approval.
     * Creates a SafeOperation, signs it, and uploads to Safe Transaction Service.
     *
     * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s) to propose
     * @param {ProposeOptions} [options] - Propose options
     * @returns {Promise<ProposeResult>} The proposal result
     */
    propose(transaction: EvmTransaction | EvmTransaction[], options?: ProposeOptions): Promise<ProposeResult>;
    /**
     * Approves (signs) an existing proposal.
     *
     * @param {string} safeOperationHash - The Safe operation hash to approve
     * @returns {Promise<ApprovalResult>} Approval result
     */
    approve(safeOperationHash: string): Promise<ApprovalResult>;
    /**
     * Rejects a proposal by creating a rejection transaction.
     * A rejection is a zero-value transaction to the Safe itself with the same nonce.
     *
     * @param {string} safeOperationHash - The Safe operation hash to reject
     * @returns {Promise<ProposeResult>} The rejection proposal result
     */
    reject(safeOperationHash: string): Promise<ProposeResult>;
    /**
     * Executes a fully signed Safe operation via the bundler.
     *
     * @param {string} safeOperationHash - The Safe operation hash to execute
     * @returns {Promise<ExecuteResult>} The execution result
     */
    execute(safeOperationHash: string): Promise<ExecuteResult>;
    /**
     * Proposes adding a new owner to the Safe.
     *
     * @param {string} ownerAddress - Address of new owner
     * @param {number} [newThreshold] - New threshold (defaults to current)
     * @param {ProposeOptions} [options] - Propose options
     * @returns {Promise<ProposeResult>} The proposal result
     */
    addOwner(ownerAddress: string, newThreshold?: number, options?: ProposeOptions): Promise<ProposeResult>;
    /**
     * Proposes removing an owner from the Safe.
     *
     * @param {string} ownerAddress - Address of owner to remove
     * @param {number} [newThreshold] - New threshold (defaults to current or adjusted)
     * @param {ProposeOptions} [options] - Propose options
     * @returns {Promise<ProposeResult>} The proposal result
     */
    removeOwner(ownerAddress: string, newThreshold?: number, options?: ProposeOptions): Promise<ProposeResult>;
    /**
     * Proposes swapping an owner with a new address.
     *
     * @param {string} oldOwnerAddress - Address of owner to remove
     * @param {string} newOwnerAddress - Address of new owner
     * @param {ProposeOptions} [options] - Propose options
     * @returns {Promise<ProposeResult>} The proposal result
     */
    swapOwner(oldOwnerAddress: string, newOwnerAddress: string, options?: ProposeOptions): Promise<ProposeResult>;
    /**
     * Proposes changing the Safe threshold.
     *
     * @param {number} newThreshold - New threshold value
     * @param {ProposeOptions} [options] - Propose options
     * @returns {Promise<ProposeResult>} The proposal result
     */
    changeThreshold(newThreshold: number, options?: ProposeOptions): Promise<ProposeResult>;
    /**
     * Proposes updating all owners and threshold in a batch.
     *
     * @param {string[]} newOwners - Array of new owner addresses
     * @param {number} newThreshold - New threshold value
     * @param {ProposeOptions} [options] - Propose options
     * @returns {Promise<ProposeResult>} The proposal result
     */
    updateOwners(newOwners: string[], newThreshold: number, options?: ProposeOptions): Promise<ProposeResult>;
    /**
     * Returns a read-only copy of this account.
     *
     * @returns {Promise<WalletAccountReadOnlyEvmMultisigSafe>} The read-only account
     */
    toReadOnlyAccount(): Promise<WalletAccountReadOnlyEvmMultisigSafe>;
    /**
     * Disposes the wallet account, clearing sensitive data from memory.
     */
    dispose(): void;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type IWalletAccount = import("@tetherto/wdk-wallet").IWalletAccount;
export type KeyPair = import("@tetherto/wdk-wallet-evm").KeyPair;
export type EvmTransaction = import("@tetherto/wdk-wallet-evm").EvmTransaction;
export type TransactionResult = import("@tetherto/wdk-wallet-evm").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet-evm").TransferOptions;
export type EvmMultisigSafeConfig = import("./wallet-account-read-only-evm-multisig-safe.js").EvmMultisigSafeConfig;
export type ProposeOptions = import("./wallet-account-read-only-evm-multisig-safe.js").ProposeOptions;
export type ProposeResult = {
    /**
     * - The Safe operation hash
     */
    safeOperationHash: string;
    /**
     * - Number of confirmations
     */
    confirmations: number;
    /**
     * - Required threshold
     */
    threshold: number;
};
export type ApprovalResult = {
    /**
     * - Number of confirmations
     */
    confirmations: number;
    /**
     * - Required threshold
     */
    threshold: number;
};
export type ExecuteResult = {
    /**
     * - The UserOperation hash
     */
    hash: string;
};
export type MessageProposalResult = {
    /**
     * - The Safe message hash
     */
    messageHash: string;
    /**
     * - Number of confirmations
     */
    confirmations: number;
    /**
     * - Required threshold
     */
    threshold: number;
};
/**
 * Result of a multisig transaction (sendTransaction/transfer).
 */
export type MultisigTransactionResult = {
    /**
     * - Safe operation hash (if not executed) or UserOp hash (if executed)
     */
    hash: string;
    /**
     * - Estimated fee in paymaster token units
     */
    fee: bigint;
    /**
     * - Current number of confirmations
     */
    confirmations: number;
    /**
     * - Required threshold for execution
     */
    threshold: number;
    /**
     * - Whether transaction was executed
     */
    executed: boolean;
};
import WalletAccountReadOnlyEvmMultisigSafe from './wallet-account-read-only-evm-multisig-safe.js';
