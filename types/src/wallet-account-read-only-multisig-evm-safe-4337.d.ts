/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */
/** @typedef {import('./transports/i-multisig-transport.js').default} IMultisigTransport */
/** @typedef {import('@tetherto/wdk-wallet').IWalletAccountReadOnlyMultisig} IWalletAccountReadOnlyMultisig */
/** @typedef {import('@tetherto/wdk-wallet').MultisigInfo} MultisigInfo */
/** @typedef {import('@tetherto/wdk-wallet').MessageInfo} MessageInfo */
/** @typedef {import('@tetherto/wdk-wallet').MultisigProposal} MultisigProposal */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransactionReceipt} EvmTransactionReceipt */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('abstractionkit').UserOperationV7} UserOperationV7 */
/** @typedef {import('abstractionkit').UserOperationReceiptResult} UserOperationReceipt */
/** @typedef {import('abstractionkit').SafeAccountV0_3_0} SafeAccountV0_3_0 */
/** @typedef {import('abstractionkit').TokenQuote} TokenQuote */
export const DEFAULT_SAFE_MODULES_VERSION: "0.3.0";
export const DEFAULT_SAFE_VERSION: "1.4.1";
/**
 * Read-only EVM multisig Safe wallet account.
 * Provides query-only operations for Safe multisig wallets.
 *
 * @implements {IWalletAccountReadOnlyMultisig}
 */
export default class WalletAccountReadOnlyMultisigEvmSafe4337 extends WalletAccountReadOnly implements IWalletAccountReadOnlyMultisig {
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
     * @throws {ConfigurationError} If the configuration is invalid or has missing required fields.
     */
    constructor(signerAddress: string | null, config: EvmMultisigSafeReadOnlyConfig);
    /**
     * The multisig Safe configuration.
     *
     * @protected
     * @type {EvmMultisigSafeReadOnlyConfig}
     */
    protected _config: EvmMultisigSafeReadOnlyConfig;
    /**
     * The Safe address.
     *
     * @protected
     * @type {string | null}
     */
    protected _safeAddress: string | null;
    /**
     * The transport used to share multisig calldata between signers.
     *
     * @protected
     * @type {IMultisigTransport}
     */
    protected _transport: IMultisigTransport;
    /**
     * An EIP-1193-compatible provider used to interact with the blockchain.
     *
     * @protected
     * @type {Eip1193Provider}
     */
    protected _provider: Eip1193Provider;
    /**
     * Cached AbstractionKit bundler.
     *
     * @protected
     * @type {import('abstractionkit').Bundler | undefined}
     */
    protected _bundler: import("abstractionkit").Bundler | undefined;
    /**
     * Cached Erc7677Paymaster instances keyed by URL.
     *
     * @protected
     * @type {Map<string, import('abstractionkit').Erc7677Paymaster>}
     */
    protected _paymasters: Map<string, import("abstractionkit").Erc7677Paymaster>;
    /**
     * Cached deployed Safe account instance.
     *
     * @protected
     * @type {SafeAccountV0_3_0 | undefined}
     */
    protected _deployedSmartAccount: SafeAccountV0_3_0 | undefined;
    /**
     * Cached owners list.
     *
     * @protected
     * @type {string[] | null}
     */
    protected _owners: string[] | null;
    /**
     * Cached threshold.
     *
     * @protected
     * @type {number | null}
     */
    protected _threshold: number | null;
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
     * Returns the predicted Safe address.
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
     * @throws {Error} If the Safe is not deployed and no owners are provided in the configuration.
     */
    getOwners(): Promise<string[]>;
    /**
     * Returns the Safe threshold.
     *
     * @returns {Promise<number>} The threshold
     * @throws {Error} If the Safe is not deployed and no threshold is provided in the configuration.
     */
    getThreshold(): Promise<number>;
    /**
     * Returns the multisig wallet info.
     *
     * @returns {Promise<MultisigInfo>} The multisig info
     */
    getMultisigInfo(): Promise<MultisigInfo>;
    /**
     * Returns the Safe's current ERC-4337 nonce (the EntryPoint nonce used for UserOperations).
     *
     * @returns {Promise<bigint>} The nonce
     */
    getNonce(): Promise<bigint>;
    /**
     * Returns the Safe contract version.
     *
     * @returns {Promise<string>} The Safe version (e.g., "1.4.1")
     */
    getVersion(): Promise<string>;
    /**
     * Returns the Safe's native token balance.
     *
     * @returns {Promise<bigint>} Balance in wei
     */
    getBalance(): Promise<bigint>;
    /**
     * Returns the Safe's balance for a specific ERC-20 token.
     *
     * @param {string} tokenAddress - The token contract address
     * @returns {Promise<bigint>} Token balance in base units
     */
    getTokenBalance(tokenAddress: string): Promise<bigint>;
    /**
     * Returns a transaction's receipt. Supports both regular transaction hashes
     * and UserOperation hashes (from the ERC-4337 bundler).
     *
     * @param {string} hash - The transaction hash or UserOperation hash
     * @returns {Promise<EvmTransactionReceipt | UserOperationReceipt | null>} The receipt, or null if not yet included in a block
     */
    getTransactionReceipt(hash: string): Promise<EvmTransactionReceipt | UserOperationReceipt | null>;
    /**
     * Verifies a message's signature using EIP-1271.
     *
     * @param {string} message - The original message
     * @param {string} signature - The signature to verify
     * @returns {Promise<boolean>} True if the signature is valid
     */
    verify(message: string, signature: string): Promise<boolean>;
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
     * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units or wei
     * @throws {Error} If the token paymaster reports that the Safe does not hold the paymaster token.
     */
    quoteSendTransaction(tx: EvmTransaction, config?: Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>): Promise<{
        fee: bigint;
    }>;
    /**
     * Estimates the fee for a token transfer.
     *
     * @param {TransferOptions} transferOptions - Transfer options
     * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<{fee: bigint}>} Estimated fee in paymaster token units or wei
     */
    quoteTransfer(transferOptions: TransferOptions, config?: Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>): Promise<{
        fee: bigint;
    }>;
    /**
     * Builds an unsigned UserOperation from the given transaction(s), applying the configured paymaster.
     *
     * @protected
     * @param {EvmTransaction | EvmTransaction[]} transaction - The transaction(s)
     * @param {Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>} [config] - If set, overrides the paymaster options defined in the wallet account configuration.
     * @returns {Promise<BuiltUserOperation>} The built operation and signing context.
     */
    protected _createSafeOperation(transaction: EvmTransaction | EvmTransaction[], config?: Partial<EvmMultisigSafePaymasterTokenConfig | EvmMultisigSafeSponsoredConfig | EvmMultisigSafeNativeCoinsConfig>): Promise<BuiltUserOperation>;
    /**
     * Builds a UserOperation with paymaster fields applied.
     *
     * @protected
     * @param {import('abstractionkit').MetaTransaction[]} calls - The meta-transactions to include in the UserOperation.
     * @param {EvmMultisigSafeConfig} config - The merged wallet configuration.
     * @param {Object} [txOverrides] - Optional gas overrides extracted from the input transaction(s).
     * @returns {Promise<BuiltUserOperation>} The built operation, signing context, and (in token mode) the paymaster quote.
     */
    protected _buildUserOperation(calls: import("abstractionkit").MetaTransaction[], config: EvmMultisigSafeConfig, txOverrides?: any): Promise<BuiltUserOperation>;
    /**
     * Builds a UserOperation and returns its estimated gas cost.
     *
     * @protected
     * @param {EvmTransaction[]} txs - The EVM transactions to include in the UserOperation.
     * @param {EvmMultisigSafeConfig} config - The merged wallet configuration.
     * @returns {Promise<BuiltUserOperation & {fee: bigint}>} The built operation plus its estimated fee.
     * @throws {Error} If the token paymaster reports that the Safe does not hold the paymaster token.
     */
    protected _getUserOperationGasCost(txs: EvmTransaction[], config: EvmMultisigSafeConfig): Promise<BuiltUserOperation & {
        fee: bigint;
    }>;
    /**
     * Builds the Safe deployment transaction (an EOA-funded factory call).
     *
     * @protected
     * @returns {{to: string, value: bigint, data: string}} The deployment transaction.
     */
    protected _buildDeploymentTransaction(): {
        to: string;
        value: bigint;
        data: string;
    };
    /**
     * Returns a Safe account instance, cached once deployed.
     *
     * @protected
     * @returns {Promise<SafeAccountV0_3_0>} The Safe account instance.
     */
    protected _getSmartAccount(): Promise<SafeAccountV0_3_0>;
    /**
     * Returns an AbstractionKit Bundler, cached on first use.
     *
     * @protected
     * @returns {import('abstractionkit').Bundler} The bundler.
     */
    protected _getBundler(): import("abstractionkit").Bundler;
    /**
     * Returns a read-only EVM account for the Safe address.
     *
     * @private
     * @returns {Promise<WalletAccountReadOnlyEvm>} The read-only EVM account
     */
    private _getEvmReadOnlyAccount;
    /**
     * Resets cached internal state.
     *
     * @protected
     */
    protected _resetState(): void;
    /**
     * Returns the SafeOperation EIP-712 hashing options shared by propose, approve and execute.
     *
     * @protected
     * @returns {{validAfter: bigint, validUntil: bigint, entrypointAddress: string, safe4337ModuleAddress: string}} The shared SafeOperation options.
     */
    protected _getSafeOperationOptions(): {
        validAfter: bigint;
        validUntil: bigint;
        entrypointAddress: string;
        safe4337ModuleAddress: string;
    };
    /** @private */
    private _entryPointAddress;
    /** @private */
    private _getInitCodeOverrides;
    /** @private */
    private _getExpectedSigners;
    /** @private */
    private _wrapEip1193Provider;
    /** @private */
    private _getPaymaster;
    /** @private */
    private _fetchBundlerGasPrice;
    /** @private */
    private _applyPaymasterToUserOp;
    /** @private */
    private _validateConfig;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type IMultisigTransport = import("./transports/i-multisig-transport.js").default;
export type IWalletAccountReadOnlyMultisig = import("@tetherto/wdk-wallet").IWalletAccountReadOnlyMultisig;
export type MultisigInfo = import("@tetherto/wdk-wallet").MultisigInfo;
export type MessageInfo = import("@tetherto/wdk-wallet").MessageInfo;
export type MultisigProposal = import("@tetherto/wdk-wallet").MultisigProposal;
export type EvmTransaction = import("@tetherto/wdk-wallet-evm").EvmTransaction;
export type EvmTransactionReceipt = import("@tetherto/wdk-wallet-evm").EvmTransactionReceipt;
export type TransferOptions = import("@tetherto/wdk-wallet-evm").TransferOptions;
export type UserOperationV7 = import("abstractionkit").UserOperationV7;
export type UserOperationReceipt = import("abstractionkit").UserOperationReceiptResult;
export type SafeAccountV0_3_0 = import("abstractionkit").SafeAccountV0_3_0;
export type TokenQuote = import("abstractionkit").TokenQuote;
export type ExistingSafeOptions = {
    /**
     * - The address of an already-deployed Safe.
     */
    safeAddress: string;
};
export type PredictedSafeOptions = {
    /**
     * - The Safe owners' addresses.
     */
    owners: string[];
    /**
     * - The number of confirmations required to execute an operation.
     */
    threshold: number;
    /**
     * - Deterministic salt nonce (hex). Defaults to a value derived from owners and threshold.
     */
    saltNonce?: string;
};
export type BuiltUserOperation = {
    /**
     * - The fully-populated UserOperation ready to sign.
     */
    userOp: UserOperationV7;
    /**
     * - The Safe account that will execute the operation.
     */
    smartAccount: SafeAccountV0_3_0;
    /**
     * - The paymaster mode used to build the operation.
     */
    mode: "native" | "sponsored" | "token";
    /**
     * - The chain id captured at build time.
     */
    chainId: bigint;
    /**
     * - The paymaster token quote, present only in token mode.
     */
    tokenQuote?: TokenQuote;
};
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
     * - EntryPoint contract address (defaults to the v0.7 EntryPoint)
     */
    entryPointAddress?: string;
    /**
     * - Safe modules version
     */
    safeModulesVersion?: string;
    /**
     * - Paymaster service URL (any ERC-7677 paymaster)
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
     * - Transport used to share multisig calldata between signers. Defaults to a SafeTxServiceTransport built from `txServiceUrl`/`safeApiKey`.
     */
    transport?: IMultisigTransport;
    /**
     * - Safe options (existing or predicted)
     */
    safeOptions: ExistingSafeOptions | PredictedSafeOptions;
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
     * - Paymaster contract address (only required for unknown paymaster providers)
     */
    paymasterAddress?: string;
    /**
     * - The address of the paymaster token.
     */
    paymasterTokenAddress: string;
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
