/**
 * Restores a UserOperation's numeric fields to BigInt after it has crossed a transport as
 * JSON-safe values (a transport serializes BigInts to decimal strings). This is the inverse, for
 * the Safe UserOperation shape, of the generic serialization done before submitting a proposal.
 *
 * @param {UserOperationV7} userOperation - The UserOperation as returned or received from a transport.
 * @returns {UserOperationV7} The UserOperation with its numeric fields restored to BigInt.
 */
export function rebuildUserOperation(userOperation: UserOperationV7): UserOperationV7;
export type UserOperationV7 = import("abstractionkit").UserOperationV7;
