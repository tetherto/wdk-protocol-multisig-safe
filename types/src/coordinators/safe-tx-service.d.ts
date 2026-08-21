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
 */
export default class SafeTxServiceCoordinator implements IMultisigCoordinator<import("@safe-global/api-kit").AddSafeOperationProps, import("./i-multisig-coordinator.js").MultisigCoordinatorMessageInput, Awaited<ReturnType<import("@safe-global/api-kit").default["getSafeOperation"]>>, Awaited<ReturnType<import("@safe-global/api-kit").default["getMessage"]>>> {
    /**
     * Creates a new Safe Transaction Service coordinator.
     *
     * @param {SafeTxServiceCoordinatorConfig} config - The coordinator configuration.
     */
    constructor(config: SafeTxServiceCoordinatorConfig);
    submitProposal(proposalId: string, proposal: import("@safe-global/api-kit").AddSafeOperationProps): Promise<void>;
    getProposal(proposalId: string): Promise<Awaited<ReturnType<import("@safe-global/api-kit").default["getSafeOperation"]>> | null>;
    confirmProposal(proposalId: string, signature: string): Promise<void>;
    submitMessage(safeAddress: string, messageId: string, message: import("./i-multisig-coordinator.js").MultisigCoordinatorMessageInput): Promise<void>;
    getMessage(messageId: string): Promise<Awaited<ReturnType<import("@safe-global/api-kit").default["getMessage"]>> | null>;
    confirmMessage(messageId: string, signature: string): Promise<void>;
    /** @private */
    private _chainId;
    /** @private */
    private _txServiceUrl;
    /** @private */
    private _apiKey;
    /** @private */
    private _apiKit;
    /** @private */
    private _isNotFoundError;
    /** @private */
    private _getApiKit;
}
export type SafeTxServiceCoordinatorConfig = {
    /**
     * - Chain ID of the network the Safe lives on.
     */
    chainId: bigint;
    /**
     * - Custom Safe Transaction Service URL (e.g. a backend proxy). Takes precedence over `apiKey`.
     */
    txServiceUrl?: string;
    /**
     * - Safe API key for the hosted Safe Transaction Service.
     */
    apiKey?: string;
};
import { IMultisigCoordinator } from './i-multisig-coordinator.js';
