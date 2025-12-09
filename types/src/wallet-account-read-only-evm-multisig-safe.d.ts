/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferResult} TransferResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransactionReceipt} EvmTransactionReceipt */
/**
 * @typedef {Object} PaymasterOptions
 * @property {string} paymasterUrl - Paymaster service URL
 * @property {string} paymasterAddress - Paymaster contract address
 * @property {string} paymasterTokenAddress - Token address for paymaster payments
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
     * Returns the Safe's balance for the paymaster token.
     *
     * @returns {Promise<bigint>} Paymaster token balance in base units
     */
    getPaymasterTokenBalance(): Promise<bigint>;
    /**
     * Returns the current allowance for the given token and spender.
     *
     * @param {string} token - The token address
     * @param {string} spender - The spender address
     * @returns {Promise<bigint>} The allowance
     */
    getAllowance(token: string, spender: string): Promise<bigint>;
    /**
     * Returns pending Safe operations from the Safe Transaction Service.
     *
     * @returns {Promise<Object>} Pending operations
     */
    getPendingTransactions(): Promise<any>;
    /**
     * Returns a specific Safe operation by hash.
     *
     * @param {string} safeOperationHash - The Safe operation hash
     * @returns {Promise<Object | null>} The Safe operation or null
     */
    getTransaction(safeOperationHash: string): Promise<any | null>;
    /**
     * Returns a transaction receipt.
     *
     * @param {string} userOpHash - The UserOperation hash
     * @returns {Promise<EvmTransactionReceipt | null>} The receipt or null
     */
    getTransactionReceipt(userOpHash: string): Promise<EvmTransactionReceipt | null>;
    /**
     * Checks if a Safe operation is ready to execute (has enough signatures).
     *
     * @param {string} safeOperationHash - The Safe operation hash
     * @returns {Promise<boolean>} True if ready to execute
     */
    isReadyToExecute(safeOperationHash: string): Promise<boolean>;
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
export type PaymasterOptions = {
    /**
     * - Paymaster service URL
     */
    paymasterUrl: string;
    /**
     * - Paymaster contract address
     */
    paymasterAddress: string;
    /**
     * - Token address for paymaster payments
     */
    paymasterTokenAddress: string;
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
export type EvmMultisigSafeReadOnlyConfig = Omit<EvmMultisigSafeConfig, "transferMaxFee">;
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { Safe4337Pack } from '@wdk-safe-global/relay-kit';
import SafeApiKit from '@safe-global/api-kit';
