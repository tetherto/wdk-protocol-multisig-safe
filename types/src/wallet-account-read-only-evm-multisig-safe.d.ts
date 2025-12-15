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
/**
 * @typedef {Object} PaymasterOptions
 * @property {string} paymasterUrl - Paymaster service URL
 * @property {string} [paymasterAddress] - Paymaster contract address
 * @property {string} [paymasterTokenAddress] - Token address for ERC-20 paymaster payments
 * @property {boolean} [isSponsored] - Enable sponsored mode (sponsor pays gas)
 * @property {string} [sponsorshipPolicyId] - Sponsorship policy ID for sponsored mode
 */
/**
 * @typedef {Object} SafeAccountConfig
 * @property {string[]} owners - Array of owner addresses
 * @property {number} threshold - Number of required signatures
 */
/**
 * @typedef {Object} SafeDeploymentConfig
 * @property {string} [saltNonce] - Salt nonce for deterministic deployment
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
 * @property {string} [safeAddress] - Existing Safe address (import mode)
 * @property {SafeAccountConfig} [safeAccountConfig] - Safe account config (create mode)
 * @property {SafeDeploymentConfig} [safeDeploymentConfig] - Safe deployment config (create mode)
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
/**
 * @typedef {Object} TransactionHistoryOptions
 * @property {number} [limit] - Maximum number of transactions to return
 * @property {number} [offset] - Offset for pagination
 */
/** @typedef {Omit<EvmMultisigSafeConfig, 'transferMaxFee'>} EvmMultisigSafeReadOnlyConfig */
export const DEFAULT_SAFE_MODULES_VERSION: "0.2.0";
/**
 * Read-only EVM multisig Safe wallet account.
 * Provides query-only operations for Safe multisig wallets.
 *
 * @extends WalletAccountReadOnly
 */
export default class WalletAccountReadOnlyEvmMultisigSafe extends WalletAccountReadOnly {
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
     * Gets Safe information without creating a full instance.
     * Useful for quick lookups before importing a Safe.
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
     * Uses keccak256 hash of sorted owners and threshold.
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
     * @param {string | null} signerAddress - The signer's EOA address (from child class) or null for pure read-only
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
     * For pure read-only accounts (signerAddress is null), returns null.
     *
     * @returns {Promise<string | null>} The signer's address or null
     */
    getSignerAddress(): Promise<string | null>;
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
     * Convenience method to check if Safe has enough tokens for gas.
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
    getPendingTransactions(): Promise<GetSafeOperationListResponse>;
    /**
     * Returns a specific Safe operation by hash.
     *
     * @param {string} safeOperationHash - The Safe operation hash
     * @returns {Promise<SafeOperationResponse | null>} The operation or null if not found
     */
    getSafeOperation(safeOperationHash: string): Promise<SafeOperationResponse | null>;
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
     * @param {TransactionHistoryOptions} [options] - Query options
     * @returns {Promise<Object>} Incoming transfers from Safe Transaction Service
     *
     */
    getIncomingTransactions(options?: TransactionHistoryOptions): Promise<any>;
    /**
     * Checks if a Safe operation is ready to be executed.
     *
     * @param {string} safeOperationHash - The Safe operation hash
     * @returns {Promise<boolean>} True if confirmations >= threshold
     */
    isReadyToExecute(safeOperationHash: string): Promise<boolean>;
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
     * Estimates the fee for a transaction.
     *
     * @param {Object | Object[]} tx - The transaction or array of transactions
     * @param {string} tx.to - Recipient address
     * @param {string | number | bigint} [tx.value] - Amount in wei
     * @param {string} [tx.data] - Transaction data
     * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
     */
    quoteSendTransaction(tx: any | any[]): Promise<{
        fee: bigint;
    }>;
    /**
     * Estimates UserOperation gas cost.
     *
     * @private
     * @param {Object[]} transactions - Array of transactions
     * @returns {Promise<bigint>} Gas cost in paymaster token units or wei
     */
    private _estimateUserOperationGas;
    /**
     * Returns the Safe4337Pack instance.
     * Child classes can override this to add a signer.
     *
     * @protected
     * @returns {Promise<Safe4337Pack>} The Safe4337Pack instance
     */
    protected _getSafe4337Pack(): Promise<Safe4337Pack>;
    /**
     * Initializes the Safe4337Pack with configuration.
     * Child classes can override to add signer.
     *
     * @protected
     * @returns {Promise<Safe4337Pack>} The initialized Safe4337Pack instance
     */
    protected _initSafe4337Pack(): Promise<Safe4337Pack>;
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
export type PaymasterOptions = {
    /**
     * - Paymaster service URL
     */
    paymasterUrl: string;
    /**
     * - Paymaster contract address
     */
    paymasterAddress?: string;
    /**
     * - Token address for ERC-20 paymaster payments
     */
    paymasterTokenAddress?: string;
    /**
     * - Enable sponsored mode (sponsor pays gas)
     */
    isSponsored?: boolean;
    /**
     * - Sponsorship policy ID for sponsored mode
     */
    sponsorshipPolicyId?: string;
};
export type SafeAccountConfig = {
    /**
     * - Array of owner addresses
     */
    owners: string[];
    /**
     * - Number of required signatures
     */
    threshold: number;
};
export type SafeDeploymentConfig = {
    /**
     * - Salt nonce for deterministic deployment
     */
    saltNonce?: string;
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
     * - Existing Safe address (import mode)
     */
    safeAddress?: string;
    /**
     * - Safe account config (create mode)
     */
    safeAccountConfig?: SafeAccountConfig;
    /**
     * - Safe deployment config (create mode)
     */
    safeDeploymentConfig?: SafeDeploymentConfig;
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
export type TransactionHistoryOptions = {
    /**
     * - Maximum number of transactions to return
     */
    limit?: number;
    /**
     * - Offset for pagination
     */
    offset?: number;
};
export type EvmMultisigSafeReadOnlyConfig = Omit<EvmMultisigSafeConfig, "transferMaxFee">;
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { Safe4337Pack } from '@wdk-safe-global/relay-kit';
import SafeApiKit from '@safe-global/api-kit';
