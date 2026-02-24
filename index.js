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
/** @typedef {import('@tetherto/wdk-wallet').MultisigProposal} MultisigProposal */
/** @typedef {import('@tetherto/wdk-wallet').MultisigResult} MultisigResult */
/** @typedef {import('@tetherto/wdk-wallet').MultisigTransactionResult} MultisigTransactionResult */
/** @typedef {import('@tetherto/wdk-wallet').MultisigExecuteResult} MultisigExecuteResult */
/** @typedef {import('@tetherto/wdk-wallet').MultisigSendOptions} MultisigSendOptions */
/** @typedef {import('@tetherto/wdk-wallet').MultisigOptions} MultisigOptions */
/** @typedef {import('@tetherto/wdk-wallet').MessageInfo} MessageInfo */
/** @typedef {import('@tetherto/wdk-wallet').MessageProposal} MessageProposal */

// ============================================
// Re-export types from @tetherto/wdk-wallet-evm
// ============================================

/** @typedef {import('@tetherto/wdk-wallet-evm').FeeRates} FeeRates */
/** @typedef {import('@tetherto/wdk-wallet-evm').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').ApproveOptions} ApproveOptions */

// ============================================
// Re-export types from @wdk-safe-global/relay-kit
// ============================================

/** @typedef {import('@wdk-safe-global/relay-kit').PaymasterOptions} PaymasterOptions */
/** @typedef {import('@wdk-safe-global/relay-kit').ExistingSafeOptions} ExistingSafeOptions */
/** @typedef {import('@wdk-safe-global/relay-kit').PredictedSafeOptions} PredictedSafeOptions */

// ============================================
// Re-export types from read-only module
// ============================================

/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').EvmMultisigSafeConfig} EvmMultisigSafeConfig */
/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').EvmMultisigSafeReadOnlyConfig} EvmMultisigSafeReadOnlyConfig */
/** @typedef {import('./src/wallet-account-read-only-evm-multisig-safe.js').ProposeOptions} ProposeOptions */

// ============================================
// Export classes and constants
// ============================================

export { default } from './src/wallet-manager-evm-multisig-safe.js'

export { default as WalletAccountReadOnlyEvmMultisigSafe, DEFAULT_SAFE_MODULES_VERSION } from './src/wallet-account-read-only-evm-multisig-safe.js'

export { default as WalletAccountEvmMultisigSafe } from './src/wallet-account-evm-multisig-safe.js'
