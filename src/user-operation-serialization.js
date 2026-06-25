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

/** @typedef {import('abstractionkit').UserOperationV7} UserOperationV7 */

/**
 * Restores a UserOperation's numeric fields to BigInt after it has crossed a transport as
 * JSON-safe values (a transport serializes BigInts to decimal strings). This is the inverse, for
 * the Safe UserOperation shape, of the generic serialization done before submitting a proposal.
 *
 * @param {UserOperationV7} userOperation - The UserOperation as returned or received from a transport.
 * @returns {UserOperationV7} The UserOperation with its numeric fields restored to BigInt.
 */
export function rebuildUserOperation (userOperation) {
  const toBigInt = (value) => (value === undefined || value === null) ? value : BigInt(value)

  return {
    ...userOperation,
    nonce: toBigInt(userOperation.nonce),
    callGasLimit: toBigInt(userOperation.callGasLimit),
    verificationGasLimit: toBigInt(userOperation.verificationGasLimit),
    preVerificationGas: toBigInt(userOperation.preVerificationGas),
    maxFeePerGas: toBigInt(userOperation.maxFeePerGas),
    maxPriorityFeePerGas: toBigInt(userOperation.maxPriorityFeePerGas),
    paymasterVerificationGasLimit: toBigInt(userOperation.paymasterVerificationGasLimit),
    paymasterPostOpGasLimit: toBigInt(userOperation.paymasterPostOpGasLimit)
  }
}
