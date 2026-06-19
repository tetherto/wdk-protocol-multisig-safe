// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

// ============================================
// Re-export types from @tetherto/wdk-wallet
// ============================================
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigInfo} MultisigInfo */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigProposal} MultisigProposal */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigMessage} MultisigMessage */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigMessageProposal} MultisigMessageProposal */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigTransactionOptions} MultisigTransactionOptions */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigExecuteQuote} MultisigExecuteQuote */
/** @typedef {import('@tetherto/wdk-wallet/multisig').MultisigOptions} MultisigOptions */

// ============================================
// Re-export types from @tetherto/wdk-wallet-evm
// ============================================

/** @typedef {import('@tetherto/wdk-wallet-evm').FeeRates} FeeRates */
/** @typedef {import('@tetherto/wdk-wallet-evm').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransactionReceipt} EvmTransactionReceipt */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').ApproveOptions} ApproveOptions */

// ============================================
// Re-export Safe option and receipt types
// ============================================

/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').ExistingSafeOptions} ExistingSafeOptions */
/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').PredictedSafeOptions} PredictedSafeOptions */
/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').UserOperationReceipt} UserOperationReceipt */

// ============================================
// Re-export types from read-only module
// ============================================

/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeCommonConfig} EvmMultisigSafeCommonConfig */
/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafePaymasterTokenConfig} EvmMultisigSafePaymasterTokenConfig */
/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeSponsoredConfig} EvmMultisigSafeSponsoredConfig */
/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeNativeCoinsConfig} EvmMultisigSafeNativeCoinsConfig */
/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeConfig} EvmMultisigSafeConfig */
/** @typedef {import('./src/wallet-account-read-only-multisig-evm-safe-4337.js').EvmMultisigSafeReadOnlyConfig} EvmMultisigSafeReadOnlyConfig */

// ============================================
// Re-export types from transports
// ============================================

/** @typedef {import('./src/transports/safe-tx-service.js').SafeTxServiceTransportConfig} SafeTxServiceTransportConfig */

// ============================================
// Export classes and constants
// ============================================

export { default } from './src/wallet-manager-multisig-evm-safe-4337.js'

export { default as WalletAccountReadOnlyMultisigEvmSafe4337, DEFAULT_SAFE_MODULES_VERSION, DEFAULT_SAFE_VERSION } from './src/wallet-account-read-only-multisig-evm-safe-4337.js'

export { default as WalletAccountMultisigEvmSafe4337 } from './src/wallet-account-multisig-evm-safe-4337.js'

// ============================================
// Export transports
// ============================================

export { IMultisigTransport } from '@tetherto/wdk-wallet/multisig'

export { default as SafeTxServiceTransport } from './src/transports/safe-tx-service.js'

// ============================================
// Export errors
// ============================================

export { ConfigurationError } from './src/errors.js'
