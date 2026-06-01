/** @typedef {import('ethers').Provider} Provider */
/** @typedef {import('@tetherto/wdk-wallet-evm').FeeRates} FeeRates */
/** @typedef {import('./wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeConfig} EvmMultisigSafeConfig */
/**
 * Wallet manager for EVM multisig Safe wallets with ERC-4337 support.
 *
 */
export default class WalletManagerMultisigEvmSafe4337 extends WalletManager {
    /**
     * Creates a new wallet manager for EVM multisig Safe wallets.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {EvmMultisigSafeConfig} config - The configuration object
     */
    constructor(seed: string | Uint8Array, config: EvmMultisigSafeConfig);
    /**
     * An ethers provider to interact with a node of the blockchain.
     *
     * @protected
     * @type {Provider | undefined}
     */
    protected _provider: Provider | undefined;
    /**
     * Returns the wallet account at a specific index.
     *
     * @example
     * // Returns the account with derivation path m/44'/60'/0'/0/1
     * const account = await wallet.getAccount(1);
     * @param {number} [index=0] - The index of the account to get
     * @returns {Promise<WalletAccountMultisigEvmSafe4337>} The account
     */
    getAccount(index?: number): Promise<WalletAccountMultisigEvmSafe4337>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/60'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     * @param {string} path - The derivation path (e.g. "0'/0/0")
     * @returns {Promise<WalletAccountMultisigEvmSafe4337>} The account
     */
    getAccountByPath(path: string): Promise<WalletAccountMultisigEvmSafe4337>;
    /**
     * Returns the current fee rates.
     *
     * @returns {Promise<FeeRates>} The fee rates (in wei)
     */
    getFeeRates(): Promise<FeeRates>;
}
export type Provider = import("ethers").Provider;
export type FeeRates = import("@tetherto/wdk-wallet-evm").FeeRates;
export type EvmMultisigSafeConfig = import("./wallet-account-read-only-multisig-evm-safe-4337.js").EvmMultisigSafeConfig;
import WalletManager from '@tetherto/wdk-wallet';
import WalletAccountMultisigEvmSafe4337 from './wallet-account-multisig-evm-safe-4337.js';
