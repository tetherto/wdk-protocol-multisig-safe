/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */
/** @typedef {import('@tetherto/wdk-wallet').IWalletAccountReadOnlyMultisig} IWalletAccountReadOnlyMultisig */
/** @typedef {import('@tetherto/wdk-wallet').MultisigInfo} MultisigInfo */
/** @typedef {import('@tetherto/wdk-wallet').MessageInfo} MessageInfo */
/** @typedef {import('@tetherto/wdk-wallet').MultisigProposal} MultisigProposal */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@wdk-safe-global/relay-kit').ExistingSafeOptions} ExistingSafeOptions */
/** @typedef {import('@wdk-safe-global/relay-kit').PredictedSafeOptions} PredictedSafeOptions */
/**
 * @typedef {Object} EvmMultisigSafeCommonConfig
 * @property {string | Eip1193Provider} provider - RPC URL or EIP-1193 provider
 * @property {string} bundlerUrl - ERC-4337 bundler URL
 * @property {bigint} chainId - Chain ID
 * @property {string} [entryPointAddress] - EntryPoint contract address
 * @property {string} [safeModulesVersion='0.2.0'] - Safe modules version
 * @property {string} [paymasterUrl] - Paymaster service URL
 * @property {string} [txServiceUrl] - Custom Safe Transaction Service URL
 * @property {string} [safeApiKey] - Safe API key
 * @property {ExistingSafeOptions | PredictedSafeOptions} options - Safe options (existing or predicted)
 */
/**
 * @typedef {Object} EvmMultisigSafePaymasterTokenConfig
 * @property {false} [isSponsored] - Whether the paymaster is sponsoring the account.
 * @property {false} [useNativeCoins] - Whether to use native coins instead of a paymaster to pay for gas fees.
 * @property {string} paymasterAddress - Paymaster contract address
 * @property {Object} paymasterToken - The paymaster token configuration.
 * @property {string} paymasterToken.address - The address of the paymaster token.
 * @property {number | bigint} [transferMaxFee] - Maximum fee for transfers
 * @property {number | bigint} [amountToApprove] - Amount to approve for paymaster
 */
/**
 * @typedef {Object} EvmMultisigSafeSponsoredConfig
 * @property {true} isSponsored - Whether the paymaster is sponsoring the account.
 * @property {false} [useNativeCoins] - Whether to use native coins instead of a paymaster to pay for gas fees.
 * @property {string} [sponsorshipPolicyId] - Sponsorship policy ID
 */
/**
 * @typedef {Object} EvmMultisigSafeNativeCoinsConfig
 * @property {false} [isSponsored] - Whether the paymaster is sponsoring the account.
 * @property {true} useNativeCoins - Whether to use native coins instead of a paymaster to pay for gas fees.
 * @property {number | bigint} [transferMaxFee] - Maximum fee for transfers
 */
/**
 * @typedef {EvmMultisigSafeCommonConfig & (EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig)} EvmMultisigSafeConfig
 */
/** @typedef {Omit<EvmMultisigSafeConfig, 'transferMaxFee' | 'amountToApprove'>} EvmMultisigSafeReadOnlyConfig */
export const DEFAULT_SAFE_MODULES_VERSION: "0.2.0";
export const DEFAULT_SAFE_VERSION: "1.4.1";
/**
 * Read-only EVM multisig Safe wallet account.
 * Provides query-only operations for Safe multisig wallets.
 *
 * @implements {IWalletAccountReadOnlyMultisig}
 */
export default class WalletAccountReadOnlyEvmMultisigSafe extends WalletAccountReadOnly implements IWalletAccountReadOnlyMultisig {
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
     * Returns the multisig wallet info.
     *
     * @returns {Promise<MultisigInfo>} The multisig info
     */
    getMultisigInfo(): Promise<MultisigInfo>;
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
     * Returns a list of proposals by their identifiers.
     *
     * @param {string[]} proposalIds - The list of proposal identifiers
     * @returns {Promise<(MultisigProposal | null)[]>} The proposal details, or null for proposals not found
     */
    getProposals(proposalIds: string[]): Promise<(MultisigProposal | null)[]>;
    /**
     * Checks if a Safe operation is ready to be executed.
     *
     * @param {string} proposalId - The Safe operation hash
     * @returns {Promise<boolean>} True if confirmations >= threshold
     */
    isReadyToExecute(proposalId: string): Promise<boolean>;
    /**
     * Returns a list of message proposals by their hashes.
     *
     * @param {string[]} messageHashes - The list of message hashes
     * @returns {Promise<(MessageInfo | null)[]>} The message details, or null for messages not found
     */
    getMessages(messageHashes: string[]): Promise<(MessageInfo | null)[]>;
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
     * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
     */
    quoteSendTransaction(tx: EvmTransaction, config?: EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig): Promise<{
        fee: bigint;
    }>;
    /**
     * Estimates the fee for a token transfer.
     *
     * @param {TransferOptions} transferOptions - Transfer options
     * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units
     */
    quoteTransfer(transferOptions: TransferOptions, config?: EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig): Promise<{
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
     * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<Object>} The SafeOperation object
     */
    protected _createSafeOperation(transaction: EvmTransaction | EvmTransaction[], config?: EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig): Promise<any>;
    /**
     * Estimates UserOperation gas cost.
     *
     * @private
     * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s)
     * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<bigint>} Gas cost in paymaster token units or wei
     */
    private _estimateUserOperationGas;
    /**
     * Returns the Safe4337Pack instance.
     * Child classes can override this to add a signer.
     *
     * @protected
     * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<Safe4337Pack>} The Safe4337Pack instance
     */
    protected _getSafe4337Pack(config?: EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig): Promise<Safe4337Pack>;
    /**
     * Initializes the Safe4337Pack with configuration.
     * Child classes can override to add signer.
     *
     * @protected
     * @param {EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<Safe4337Pack>} The initialized Safe4337Pack instance
     */
    protected _initSafe4337Pack(config?: EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig): Promise<Safe4337Pack>;
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
   * Resets cached internal state.
   * @protected
   */
    protected _resetState(): void;
    /**
     * Validates the configuration.
     *
     * @private
     * @param {EvmMultisigSafeConfig} config - The configuration to validate
     */
    private _validateConfig;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type IWalletAccountReadOnlyMultisig = import("@tetherto/wdk-wallet").IWalletAccountReadOnlyMultisig;
export type MultisigInfo = import("@tetherto/wdk-wallet").MultisigInfo;
export type MessageInfo = import("@tetherto/wdk-wallet").MessageInfo;
export type MultisigProposal = import("@tetherto/wdk-wallet").MultisigProposal;
export type EvmTransaction = import("@tetherto/wdk-wallet-evm").EvmTransaction;
export type TransferOptions = import("@tetherto/wdk-wallet-evm").TransferOptions;
export type ExistingSafeOptions = import("@wdk-safe-global/relay-kit").ExistingSafeOptions;
export type PredictedSafeOptions = import("@wdk-safe-global/relay-kit").PredictedSafeOptions;
export type EvmMultisigSafeCommonConfig = {
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
     * - Paymaster service URL
     */
    paymasterUrl?: string;
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
};
export type EvmMultisigSafePaymasterTokenConfig = {
    /**
     * - Whether the paymaster is sponsoring the account.
     */
    isSponsored?: false;
    /**
     * - Whether to use native coins instead of a paymaster to pay for gas fees.
     */
    useNativeCoins?: false;
    /**
     * - Paymaster contract address
     */
    paymasterAddress: string;
    /**
     * - The paymaster token configuration.
     */
    paymasterToken: {
        address: string;
    };
    /**
     * - Maximum fee for transfers
     */
    transferMaxFee?: number | bigint;
    /**
     * - Amount to approve for paymaster
     */
    amountToApprove?: number | bigint;
};
export type EvmMultisigSafeSponsoredConfig = {
    /**
     * - Whether the paymaster is sponsoring the account.
     */
    isSponsored: true;
    /**
     * - Whether to use native coins instead of a paymaster to pay for gas fees.
     */
    useNativeCoins?: false;
    /**
     * - Sponsorship policy ID
     */
    sponsorshipPolicyId?: string;
};
export type EvmMultisigSafeNativeCoinsConfig = {
    /**
     * - Whether the paymaster is sponsoring the account.
     */
    isSponsored?: false;
    /**
     * - Whether to use native coins instead of a paymaster to pay for gas fees.
     */
    useNativeCoins: true;
    /**
     * - Maximum fee for transfers
     */
    transferMaxFee?: number | bigint;
};
export type EvmMultisigSafeConfig = EvmMultisigSafeCommonConfig & (EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig);
export type EvmMultisigSafeReadOnlyConfig = Omit<EvmMultisigSafeConfig, "transferMaxFee" | "amountToApprove">;
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { Safe4337Pack } from '@wdk-safe-global/relay-kit';
import SafeApiKit from '@safe-global/api-kit';
import { GenericFeeEstimator } from '@wdk-safe-global/relay-kit';
