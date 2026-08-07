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

/** @typedef {import('./i-multisig-transport.js').MultisigTransportProposal} MultisigTransportProposal */
/** @typedef {import('./i-multisig-transport.js').MultisigTransportMessage} MultisigTransportMessage */
/** @typedef {import('./i-multisig-transport.js').MultisigTransportMessageInput} MultisigTransportMessageInput */
/** @typedef {import('./safe-tx-service.js').SafeTxServiceTransportConfig} SafeTxServiceTransportConfig */

export { IMultisigTransport, toTransportJson } from './i-multisig-transport.js'

export { default as SafeTxServiceTransport } from './safe-tx-service.js'
