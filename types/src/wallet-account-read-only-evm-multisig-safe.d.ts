/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferResult} TransferResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransactionReceipt} EvmTransactionReceipt */
/** @typedef {import('@safe-global/api-kit').GetSafeOperationListOptions} GetSafeOperationListOptions */
/** @typedef {import('@safe-global/api-kit').GetSafeOperationListResponse} GetSafeOperationListResponse */
/** @typedef {import('@safe-global/api-kit').SafeMultisigTransactionListResponse} SafeMultisigTransactionListResponse */
/** @typedef {import('@safe-global/api-kit').SafeMessageListResponse} SafeMessageListResponse */
/** @typedef {import('@safe-global/api-kit').TransferListResponse} TransferListResponse */
/** @typedef {import('@safe-global/api-kit').ListOptions} ListOptions */
/** @typedef {import('@safe-global/types-kit').SafeOperationResponse} SafeOperationResponse */
/** @typedef {import('@safe-global/types-kit').SafeMessage} SafeMessage */
/** @typedef {import('@wdk-safe-global/relay-kit').PaymasterOptions} PaymasterOptions */
/** @typedef {import('@wdk-safe-global/relay-kit').ExistingSafeOptions} ExistingSafeOptions */
/** @typedef {import('@wdk-safe-global/relay-kit').PredictedSafeOptions} PredictedSafeOptions */
/**
 * @typedef {Object} ProposeOptions
 * @property {number | bigint} [amountToApprove] - Amount to approve for paymaster (ignored in sponsored mode)
 * @property {boolean} [isSponsored] - Override to use sponsored mode
 * @property {string} [sponsorshipPolicyId] - Override sponsorship policy
 * @property {string} [paymasterTokenAddress] - Override token for ERC-20 paymaster
 */
/**
 * @typedef {Object} EvmMultisigSafeConfig
 * @property {string | Eip1193Provider} provider - RPC URL or EIP-1193 provider
 * @property {string} bundlerUrl - ERC-4337 bundler URL
 * @property {bigint} chainId - Chain ID
 * @property {string} [entryPointAddress] - EntryPoint contract address
 * @property {string} [safeModulesVersion='0.2.0'] - Safe modules version
 * @property {PaymasterOptions} [paymasterOptions] - Paymaster configuration
 * @property {string} [txServiceUrl] - Custom Safe Transaction Service URL
 * @property {string} [safeApiKey] - Safe API key
 * @property {ExistingSafeOptions | PredictedSafeOptions} options - Safe options (existing or predicted)
 * @property {number | bigint} [transferMaxFee] - Maximum fee for transfers
 */
/**
 * @typedef {Object} SafeInfo
 * @property {string} address - Safe address
 * @property {string[]} owners - Array of owner addresses
 * @property {number} threshold - Number of required signatures
 * @property {string} nonce - Current nonce
 * @property {string} version - Safe contract version
 * @property {boolean} isDeployed - Whether Safe is deployed
 */
/**
 * @typedef {Object} SafesByOwnerConfig
 * @property {bigint} chainId - Chain ID
 * @property {string} [txServiceUrl] - Custom Safe Transaction Service URL
 * @property {string} [safeApiKey] - Safe API key
 */
/** @typedef {Omit<EvmMultisigSafeConfig, 'transferMaxFee'>} EvmMultisigSafeReadOnlyConfig */
export const DEFAULT_SAFE_MODULES_VERSION: "0.2.0";
export const DEFAULT_SAFE_VERSION: "1.4.1";
/**
 * Read-only EVM multisig Safe wallet account.
 * Provides query-only operations for Safe multisig wallets.
 *
 * @extends WalletAccountReadOnly
 * @implements {IWalletAccountMultisigReadOnly}
 */
export default class WalletAccountReadOnlyEvmMultisigSafe extends WalletAccountReadOnly implements IWalletAccountMultisigReadOnly {
    /**
     * Gets all Safe addresses owned by an address.
     * Useful for discovering user's Safes during wallet login/import.
     *
     * @static
     * @param {string} ownerAddress - The owner's EOA address
     * @param {SafesByOwnerConfig} config - Configuration object
     * @returns {Promise<string[]>} Array of Safe addresses
     *
     */
    static getSafesByOwner(ownerAddress: string, config: SafesByOwnerConfig): Promise<string[]>;
    /**
     * Gets Safe information without creating an instance.
     *
     * @static
     * @param {string} safeAddress - The Safe address
     * @param {SafesByOwnerConfig} config - Configuration object
     * @returns {Promise<SafeInfo>} Safe information
     *
     */
    static getSafeInfo(safeAddress: string, config: SafesByOwnerConfig): Promise<SafeInfo>;
    /**
     * Generates a deterministic salt nonce from owners and threshold.
     *
     * @static
     * @param {string[]} owners - Array of owner addresses
     * @param {number} threshold - Number of required signatures
     * @returns {string} The deterministic salt nonce (hex string)
     */
    static generateDeterministicSaltNonce(owners: string[], threshold: number): string;
    /**
     * Creates a new read-only EVM multisig Safe wallet account.
     *
     * @param {string | null} signerAddress - The signer's EOA address or null for pure read-only
     * @param {EvmMultisigSafeReadOnlyConfig} config - The configuration object
     */
    constructor(signerAddress: string | null, config: EvmMultisigSafeReadOnlyConfig);
    /**
     * The multisig Safe configuration
     *
     * @protected
     * @type {EvmMultisigSafeReadOnlyConfig}
     */
    protected _config: EvmMultisigSafeReadOnlyConfig;
    /**
     * The Safe address
     *
     * @protected
     * @type {string | null}
     */
    protected _safeAddress: string | null;
    /**
     * The safe's implementation of the erc-4337 standard.
     *
     * @protected
     * @type {Safe4337Pack | undefined}
     */
    protected _safe4337Pack: Safe4337Pack | undefined;
    /**
     * The Safe API Kit instance
     *
     * @protected
     * @type {SafeApiKit | null}
     */
    protected _apiKit: typeof SafeApiKit | null;
    /**
     * Cached owners list
     *
     * @protected
     * @type {string[] | null}
     */
    protected _owners: string[] | null;
    /**
     * Cached threshold
     *
     * @protected
     * @type {number | null}
     */
    protected _threshold: number | null;
    /**
     * The chain id.
     *
     * @protected
     * @type {bigint | undefined}
     */
    protected _chainId: bigint | undefined;
    /** @private */
    private _signerAddress;
    /**
     * Returns the signer's EOA address.
     * For read-only accounts created with a signerAddress, returns that address.
     *
     * @returns {Promise<string | null>} The signer's address or null
     */
    getSignerAddress(): Promise<string | null>;
    /**
     * Returns the Safe address.
     *
     * @returns {Promise<string>} The Safe address
     */
     getAddress(): Promise<string>;
    /**
     * Checks if the Safe is deployed on-chain.
     *
     * @returns {Promise<boolean>} True if deployed
     */
    isDeployed(): Promise<boolean>;
    /**
     * Returns the list of Safe owners.
     *
     * @returns {Promise<string[]>} Array of owner addresses
     */
    getOwners(): Promise<string[]>;
    /**
     * Returns the Safe threshold.
     *
     * @returns {Promise<number>} The threshold
     */
    getThreshold(): Promise<number>;
    /**
     * Returns the Safe's current nonce.
     *
     * @returns {Promise<number>} The nonce
     */
    getNonce(): Promise<number>;
    /**
     * Returns the Safe contract version.
     *
     * @returns {Promise<string>} The Safe version (e.g., "1.4.1")
     */
    getVersion(): Promise<string>;
    /**
     * Returns the Safe's paymaster token balance.
     *
     * @returns {Promise<bigint>} Paymaster token balance
     * @throws {Error} If no paymaster token is configured
     */
    getPaymasterTokenBalance(): Promise<bigint>;
    /**
     * Returns pending Safe operations awaiting signatures.
     *
     * @param {GetSafeOperationListOptions} [options] - Query options
     * @returns {Promise<GetSafeOperationListResponse>} Pending operations from Safe Transaction Service
     */
    getPendingTransactions(options?: GetSafeOperationListOptions): Promise<GetSafeOperationListResponse>;
    /**
     * Returns a specific Safe operation by hash.
     *
     * @param {string} proposalId - The Safe operation hash
     * @returns {Promise<SafeOperationResponse | null>} The operation or null if not found
     */
    getProposal(proposalId: string): Promise<SafeOperationResponse | null>;
    /**
     * Returns the transaction history for the Safe.
     * Includes executed multisig transactions.
     *
     * @param {ListOptions} [options] - Query options (limit, offset)
     * @returns {Promise<SafeMultisigTransactionListResponse>} Transaction history from Safe Transaction
     *
     */
    getTransactionHistory(options?: ListOptions): Promise<SafeMultisigTransactionListResponse>;
    /**
     * Returns incoming transfers to the Safe.
     * Includes ETH and ERC-20 token transfers.
     *
     * @param {ListOptions} [options] - Query options (limit, offset)
     * @returns {Promise<TransferListResponse>} Incoming transfers from Safe Transaction Service
     */
    getIncomingTransactions(options?: ListOptions): Promise<TransferListResponse>;
    /**
     * Checks if a Safe operation is ready to be executed.
     *
     * @param {string} proposalId - The Safe operation hash
     * @returns {Promise<boolean>} True if confirmations >= threshold
     */
    isReadyToExecute(proposalId: string): Promise<boolean>;
    /**
     * Gets the on-chain transaction hash for a UserOperation.
     *
     * @param {string} userOpHash - The UserOperation hash
     * @returns {Promise<string | null>} The transaction hash or null if not found
     *
     */
    getTransactionHashByUserOpHash(userOpHash: string): Promise<string | null>;
    /**
     * Gets a message and its signatures from Safe Transaction Service.
     *
     * @param {string} messageHash - The Safe message hash
     * @returns {Promise<SafeMessage | null>} The message with signatures or null if not found
     */
    getMessage(messageHash: string): Promise<SafeMessage | null>;
    /**
     * Returns pending messages awaiting signatures.
     *
     * @param {ListOptions} [options] - Query options (limit, offset)
     * @returns {Promise<SafeMessageListResponse>} Pending messages from Safe Transaction Service
     */
    getPendingMessages(options?: ListOptions): Promise<SafeMessageListResponse>;
    /**
     * Estimates the gas cost for deploying the Safe.
     *
     * @returns {Promise<{fee: bigint}>} Estimated deployment fee in wei
     * @throws {Error} If Safe is already deployed
     */
    quoteDeploy(): Promise<{
        fee: bigint;
    }>;
    /**
     * Estimates the fee for a transaction.
     *
     * @param {EvmTransaction} tx - The transaction
     * @param {ProposeOptions} [options] - Options for paymaster override
     * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
     */
    quoteSendTransaction(tx: EvmTransaction, options?: ProposeOptions): Promise<{
        fee: bigint;
    }>;
    /**
     * Estimates the fee for a token transfer.
     *
     * @param {TransferOptions} transferOptions - Transfer options
     * @param {ProposeOptions} [options] - Options for paymaster override
     * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
     */
    quoteTransfer(transferOptions: TransferOptions, options?: ProposeOptions): Promise<{
        fee: bigint;
    }>;
    /**
     * Creates a GenericFeeEstimator for non-Pimlico bundlers.
     *
     * @protected
     * @returns {GenericFeeEstimator} The fee estimator
     */
    protected _createFeeEstimator(): GenericFeeEstimator;
    /**
     * Creates a SafeOperation from transactions.
     * This is the shared method used by both fee estimation and propose
     * to ensure they operate on the same transaction structure.
     *
     * @protected
     * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s)
     * @param {ProposeOptions} [options] - Options for paymaster override
     * @returns {Promise<Object>} The SafeOperation object
     */
    protected _createSafeOperation(transaction: EvmTransaction | EvmTransaction[], options?: ProposeOptions): Promise<any>;
    /**
     * Estimates UserOperation gas cost.
     *
     * @private
     * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s)
     * @param {ProposeOptions} [options] - Options for paymaster override
     * @returns {Promise<bigint>} Gas cost in paymaster token units or wei
     */
    private _estimateUserOperationGas;
    /**
     * Returns the Safe4337Pack instance.
     * Child classes can override this to add a signer.
     *
     * @protected
     * @param {ProposeOptions} [options] - Options for paymaster override
     * @returns {Promise<Safe4337Pack>} The Safe4337Pack instance
     */
    protected _getSafe4337Pack(options?: ProposeOptions): Promise<Safe4337Pack>;
    /**
     * Initializes the Safe4337Pack with configuration.
     * Child classes can override to add signer.
     *
     * @protected
     * @param {ProposeOptions} [options] - Options for paymaster override
     * @returns {Promise<Safe4337Pack>} The initialized Safe4337Pack instance
     */
    protected _initSafe4337Pack(proposeOptions?: {}): Promise<Safe4337Pack>;
    /**
     * Returns the Safe API Kit instance.
     *
     * @protected
     * @returns {Promise<SafeApiKit>} The Safe API Kit instance
     */
    protected _getApiKit(): Promise<typeof SafeApiKit>;
    /**
     * Returns a read-only EVM account for the Safe address.
     *
     * @private
     * @returns {Promise<WalletAccountReadOnlyEvm>} The read-only EVM account
     */
    private _getEvmReadOnlyAccount;
    /**
     * Validates the configuration.
     *
     * @private
     * @param {EvmMultisigSafeConfig} config - The configuration to validate
     */
    private _validateConfig;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type EvmTransaction = import("@tetherto/wdk-wallet-evm").EvmTransaction;
export type TransactionResult = import("@tetherto/wdk-wallet-evm").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet-evm").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet-evm").TransferResult;
export type EvmTransactionReceipt = import("@tetherto/wdk-wallet-evm").EvmTransactionReceipt;
export type GetSafeOperationListOptions = import("@safe-global/api-kit").GetSafeOperationListOptions;
export type GetSafeOperationListResponse = import("@safe-global/api-kit").GetSafeOperationListResponse;
export type SafeMultisigTransactionListResponse = import("@safe-global/api-kit").SafeMultisigTransactionListResponse;
export type SafeMessageListResponse = import("@safe-global/api-kit").SafeMessageListResponse;
export type TransferListResponse = import("@safe-global/api-kit").TransferListResponse;
export type ListOptions = import("@safe-global/api-kit").ListOptions;
export type SafeOperationResponse = import("@safe-global/types-kit").SafeOperationResponse;
export type SafeMessage = import("@safe-global/types-kit").SafeMessage;
export type PaymasterOptions = import("@wdk-safe-global/relay-kit").PaymasterOptions;
export type ExistingSafeOptions = import("@wdk-safe-global/relay-kit").ExistingSafeOptions;
export type PredictedSafeOptions = import("@wdk-safe-global/relay-kit").PredictedSafeOptions;
export type ProposeOptions = {
    /**
     * - Amount to approve for paymaster (ignored in sponsored mode)
     */
    amountToApprove?: number | bigint;
    /**
     * - Override to use sponsored mode
     */
    isSponsored?: boolean;
    /**
     * - Override sponsorship policy
     */
    sponsorshipPolicyId?: string;
    /**
     * - Override token for ERC-20 paymaster
     */
    paymasterTokenAddress?: string;
};
export type EvmMultisigSafeConfig = {
    /**
     * - RPC URL or EIP-1193 provider
     */
    provider: string | Eip1193Provider;
    /**
     * - ERC-4337 bundler URL
     */
    bundlerUrl: string;
    /**
     * - Chain ID
     */
    chainId: bigint;
    /**
     * - EntryPoint contract address
     */
    entryPointAddress?: string;
    /**
     * - Safe modules version
     */
    safeModulesVersion?: string;
    /**
     * - Paymaster configuration
     */
    paymasterOptions?: PaymasterOptions;
    /**
     * - Custom Safe Transaction Service URL
     */
    txServiceUrl?: string;
    /**
     * - Safe API key
     */
    safeApiKey?: string;
    /**
     * - Safe options (existing or predicted)
     */
    options: ExistingSafeOptions | PredictedSafeOptions;
    /**
     * - Maximum fee for transfers
     */
    transferMaxFee?: number | bigint;
};
export type SafeInfo = {
    /**
     * - Safe address
     */
    address: string;
    /**
     * - Array of owner addresses
     */
    owners: string[];
    /**
     * - Number of required signatures
     */
    threshold: number;
    /**
     * - Current nonce
     */
    nonce: string;
    /**
     * - Safe contract version
     */
    version: string;
    /**
     * - Whether Safe is deployed
     */
    isDeployed: boolean;
};
export type SafesByOwnerConfig = {
    /**
     * - Chain ID
     */
    chainId: bigint;
    /**
     * - Custom Safe Transaction Service URL
     */
    txServiceUrl?: string;
    /**
     * - Safe API key
     */
    safeApiKey?: string;
};
export type EvmMultisigSafeReadOnlyConfig = Omit<EvmMultisigSafeConfig, "transferMaxFee">;
import { IWalletAccountMultisigReadOnly } from '@tetherto/wdk-wallet';
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { Safe4337Pack } from '@wdk-safe-global/relay-kit';
import SafeApiKit from '@safe-global/api-kit';
import { GenericFeeEstimator } from '@wdk-safe-global/relay-kit';
