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
// Re-export types from @tetherto/wdk-wallet-evm
// ============================================

/** @typedef {import('@tetherto/wdk-wallet-evm').FeeRates} FeeRates */
/** @typedef {import('@tetherto/wdk-wallet-evm').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransactionReceipt} EvmTransactionReceipt */
/** @typedef {import('@tetherto/wdk-wallet-evm').ApproveOptions} ApproveOptions */

// ============================================
// Re-export types from @safe-global packages
// ============================================

/** @typedef {import('@safe-global/api-kit').GetSafeOperationListOptions} GetSafeOperationListOptions */
/** @typedef {import('@safe-global/api-kit').GetSafeOperationListResponse} GetSafeOperationListResponse */
/** @typedef {import('@safe-global/api-kit').SafeMultisigTransactionListResponse} SafeMultisigTransactionListResponse */
/** @typedef {import('@safe-global/api-kit').SafeMessageListResponse} SafeMessageListResponse */
/** @typedef {import('@safe-global/api-kit').TransferListResponse} TransferListResponse */
/** @typedef {import('@safe-global/api-kit').ListOptions} ListOptions */
/** @typedef {import('@safe-global/types-kit').SafeOperationResponse} SafeOperationResponse */
/** @typedef {import('@safe-global/types-kit').SafeMessage} SafeMessage */

// ============================================
// Re-export types from read-only module
// ============================================

/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').EvmMultisigSafeConfig} EvmMultisigSafeConfig */
/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').EvmMultisigSafeReadOnlyConfig} EvmMultisigSafeReadOnlyConfig */
/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').PaymasterOptions} PaymasterOptions */
/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').SafeAccountConfig} SafeAccountConfig */
/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').SafeDeploymentConfig} SafeDeploymentConfig */
/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').SafeInfo} SafeInfo */
/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').SafesByOwnerConfig} SafesByOwnerConfig */

// ============================================
// Re-export types from full account module
// ============================================

/** @typedef {import('./src/wallet-account-evm-multisig-safe.js').ProposeResult} ProposeResult */
/** @typedef {import('./src/wallet-account-evm-multisig-safe.js').ApprovalResult} ApprovalResult */
/** @typedef {import('./src/wallet-account-evm-multisig-safe.js').ExecuteResult} ExecuteResult */
/** @typedef {import('./src/wallet-account-evm-multisig-safe.js').MessageProposalResult} MessageProposalResult */
/** @typedef {import('./src/wallet-account-evm-multisig-safe.js').ProposeOptions} ProposeOptions */
/** @typedef {import('./src/wallet-account-evm-multisig-safe.js').MultisigTransactionResult} MultisigTransactionResult */

// ============================================
// Export classes and constants
// ============================================

export { default } from './src/wallet-manager-evm-multisig-safe.js'

export { default as WalletAccountReadOnlyEvmMultisigSafe, DEFAULT_SAFE_MODULES_VERSION } from './src/wallet-account-read-only-evm-multisig-safe.js'

export { default as WalletAccountEvmMultisigSafe } from './src/wallet-account-evm-multisig-safe.js'