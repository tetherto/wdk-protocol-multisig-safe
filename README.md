# @tetherto/wdk-wallet-evm-multisig-safe

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.

A simple and secure package to manage Safe Protocol multisig wallets with ERC-4337 account abstraction for EVM-compatible blockchains. This package provides a clean API for creating, managing, and interacting with multisig wallets using BIP-39 seed phrases and the Safe smart contract infrastructure.

## 🔍 About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://wallet.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control.

For detailed documentation about the complete WDK ecosystem, visit [docs.wallet.tether.io](https://docs.wallet.tether.io).

## 🌟 Features

- **Safe Protocol Integration**: Full support for Safe (formerly Gnosis Safe) multisig wallets
- **ERC-4337 Account Abstraction**: Gasless transactions via paymasters and bundlers
- **Paymaster Modes**: Support for both ERC-20 paymaster and sponsored (gasless) modes
- **Per-Transaction Paymaster Override**: Switch between ERC-20 and sponsored mode on a per-transaction basis
- **Multi-Owner Management**: Add, remove, swap owners and change threshold
- **Propose/Approve/Execute Flow**: Standard multisig transaction workflow
- **Message Signing**: EIP-191 compliant multisig message signing with EIP-1271 verification
- **Deterministic Addresses**: Predictable Safe addresses from owner configuration
- **Auto-Execute**: Automatically execute transactions when threshold is met

## ⬇️ Installation

```bash
npm install @tetherto/wdk-wallet-evm-multisig-safe
```

## 🚀 Quick Start

### Discovering User's Safes

```javascript
import { WalletAccountReadOnlyEvmMultisigSafe } from '@tetherto/wdk-wallet-evm-multisig-safe'

// Find all Safes owned by a user
const userEoa = '0x1234...'
const safes = await WalletAccountReadOnlyEvmMultisigSafe.getSafesByOwner(userEoa, {
  chainId: 11155111n  // Sepolia
})

console.log('User owns these Safes:', safes)

// Get info about a specific Safe before importing
const safeInfo = await WalletAccountReadOnlyEvmMultisigSafe.getSafeInfo(safes[0], {
  chainId: 11155111n
})

console.log('Safe owners:', safeInfo.owners)
console.log('Threshold:', safeInfo.threshold)
console.log('Version:', safeInfo.version)
```

### Creating a New 2-of-2 Multisig Safe

```javascript
import WalletManagerEvmMultisigSafe, {
  WalletAccountEvmMultisigSafe,
  WalletAccountReadOnlyEvmMultisigSafe
} from '@tetherto/wdk-wallet-evm-multisig-safe'

// Owner seed phrases
const aliceSeed = 'alice seed phrase here...'
const bobSeed = 'bob seed phrase here...'

// Get owner addresses first
const aliceEoa = '0x...' // Alice's EOA address
const bobEoa = '0x...'   // Bob's EOA address

// Create Alice's multisig account using PredictedSafeOptions
const alice = new WalletAccountEvmMultisigSafe(aliceSeed, "0'/0/0", {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  paymasterOptions: {
    paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
    paymasterAddress: '0x...',
    paymasterTokenAddress: '0x...' // USDT address
  },
  options: {
    owners: [aliceEoa, bobEoa],
    threshold: 2,
    saltNonce: '0x...' // Optional: deterministic address
  }
})

// Get predicted Safe address (before deployment)
const safeAddress = await alice.getAddress()
console.log('Safe Address:', safeAddress)

// Check if deployed
const isDeployed = await alice.isDeployed()
console.log('Is Deployed:', isDeployed)
```

### Importing an Existing Safe

```javascript
// Import using ExistingSafeOptions
const alice = new WalletAccountEvmMultisigSafe(aliceSeed, "0'/0/0", {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  paymasterOptions: {
    paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
    paymasterAddress: '0x...',
    paymasterTokenAddress: '0x...'
  },
  options: {
    safeAddress: '0x...' // Existing Safe address
  }
})

// Get Safe info
const owners = await alice.getOwners()
const threshold = await alice.getThreshold()
console.log('Owners:', owners)
console.log('Threshold:', threshold)
```

### Full Multisig Transaction Flow

```javascript
// Alice proposes a transaction
const tx = {
  to: '0x000000000000000000000000000000000000dEaD',
  value: '0',
  data: '0x'
}

// Get fee estimate
const quote = await alice.quoteSendTransaction(tx)
console.log('Estimated fee:', quote.fee)

// Propose transaction
const proposal = await alice.propose(tx, {
  amountToApprove: quote.fee * 150n / 100n // 50% buffer
})
console.log('SafeOp Hash:', proposal.safeOperationHash)
console.log('Confirmations:', proposal.confirmations, '/', proposal.threshold)

// Bob approves
const bob = new WalletAccountEvmMultisigSafe(bobSeed, "0'/0/0", config)
const approval = await bob.approve(proposal.safeOperationHash)
console.log('Confirmations:', approval.confirmations, '/', approval.threshold)

// Execute when threshold met
const result = await alice.execute(proposal.safeOperationHash)
console.log('UserOp Hash:', result.hash)

// Get on-chain transaction hash
const txHash = await alice.getTransactionHashByUserOpHash(result.hash)
console.log('TX Hash:', txHash)
```

### Using sendTransaction (Auto-Execute)

For convenience, `sendTransaction` and `transfer` automatically execute when threshold is met:

```javascript
// For 1-of-1 Safe: executes immediately
// For 2-of-3 Safe: returns proposal for approval
const result = await alice.sendTransaction({
  to: '0x...',
  value: '1000000000000000000', // 1 ETH
  data: '0x'
})

console.log('Hash:', result.hash)
console.log('Fee:', result.fee)
console.log('Confirmations:', result.confirmations, '/', result.threshold)
console.log('Executed:', result.executed)

if (!result.executed) {
  // Need more signatures
  await bob.approve(result.hash)
  const execResult = await alice.execute(result.hash)
}
```

### Deploying a Safe

**Important**: Safe deployment requires native ETH in the deployer's EOA account to pay for the deployment transaction gas. After deployment, all subsequent transactions can use paymaster (ERC-20 tokens) or sponsored mode for gas payment.

```javascript
// Ensure the signer's EOA has ETH for deployment gas
const alice = new WalletAccountEvmMultisigSafe(aliceSeed, "0'/0/0", {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  paymasterOptions: {
    paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
    paymasterTokenAddress: '0x...' // USDT address
  },
  options: {
    owners: [aliceEoa, bobEoa],
    threshold: 2
  }
})

// Check signer's EOA address and fund it with ETH
const signerEoa = await alice.getSignerAddress()
console.log('Fund this address with ETH for deployment:', signerEoa)

// Get deployment fee estimate
const { fee } = await alice.quoteDeploy()
console.log('Estimated deployment fee:', fee)

// Deploy the Safe (requires ETH in signer's EOA)
const deployResult = await alice.deploy()
console.log('TX Hash:', deployResult.txHash)
console.log('Fee:', deployResult.fee)

// After deployment, transactions can use paymaster or sponsored mode
// No more ETH needed in the Safe or signer's EOA!
const result = await alice.sendTransaction({
  to: '0x...',
  value: '0',
  data: '0x...'
})
```

### ERC-20 Paymaster Mode

The Safe pays gas fees using ERC-20 tokens (e.g., USDT). The Safe must hold sufficient tokens.

```javascript
const alice = new WalletAccountEvmMultisigSafe(aliceSeed, "0'/0/0", {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  paymasterOptions: {
    paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
    paymasterAddress: '0x...',           // Optional: paymaster contract address
    paymasterTokenAddress: '0x...'       // USDT or other ERC-20 token address
  },
  options: {
    safeAddress: '0x...'
  }
})

// Propose with token approval for gas
const quote = await alice.quoteSendTransaction(tx)
const proposal = await alice.propose(tx, {
  amountToApprove: quote.fee * 150n / 100n  // Approve tokens for gas payment
})
```

### Sponsored Mode (Gasless)

A sponsor pays the gas fees, making transactions completely free for the Safe. No tokens required in the Safe.

```javascript
const alice = new WalletAccountEvmMultisigSafe(aliceSeed, "0'/0/0", {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  paymasterOptions: {
    paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
    isSponsored: true,                      // Enable sponsored mode
    sponsorshipPolicyId: 'sp_my_policy'     // Optional: sponsorship policy ID
  },
  options: {
    safeAddress: '0x...'
  }
})

// No amountToApprove needed - sponsor pays gas!
const proposal = await alice.propose(tx)
console.log('SafeOp Hash:', proposal.safeOperationHash)

// Bob approves
const approval = await bob.approve(proposal.safeOperationHash)

// Execute - completely gasless for the Safe
const result = await alice.execute(proposal.safeOperationHash)
console.log('UserOp Hash:', result.hash)
```

### Per-Transaction Paymaster Override

You can override the paymaster mode on a per-transaction basis, regardless of the account's default configuration
```javascript
// Account configured with ERC-20 paymaster (USDT)
const alice = new WalletAccountEvmMultisigSafe(aliceSeed, "0'/0/0", {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  paymasterOptions: {
    paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
    paymasterTokenAddress: '0xUSDT...'  // Default: pay gas with USDT
  },
  options: {
    safeAddress: '0x...'
  }
})

// Override to sponsored mode for this specific transaction
const result = await alice.sendTransaction(tx, {
  isSponsored: true  // This transaction will be gasless!
})

// Or override to use a different token
const result2 = await alice.sendTransaction(tx, {
  paymasterTokenAddress: '0xUSDT...'  // Pay gas with USDT instead
})
```

```javascript
// Account configured with sponsored mode
const bob = new WalletAccountEvmMultisigSafe(bobSeed, "0'/0/0", {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  paymasterOptions: {
    paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
    isSponsored: true  // Default: gasless
  },
  options: {
    safeAddress: '0x...'
  }
})

// Override to ERC-20 paymaster for this specific transaction
const quote = await bob.quoteSendTransaction(tx, {
  isSponsored: false,
  paymasterTokenAddress: '0xUSDT...'
})

const result = await bob.sendTransaction(tx, {
  isSponsored: false,
  paymasterTokenAddress: '0xUSDT...',
  amountToApprove: quote.fee * 150n / 100n
})
```

**Override Options:**

| Option | Description |
|--------|-------------|
| `isSponsored` | Override to sponsored mode (`true`) or ERC-20 mode (`false`) |
| `sponsorshipPolicyId` | Override sponsorship policy ID (for sponsored mode) |
| `paymasterTokenAddress` | Override token address for gas payment (for ERC-20 mode) |
| `amountToApprove` | Token amount to approve for paymaster (for ERC-20 mode) |

### Owner Management

```javascript
// Add new owner
const proposal = await alice.addOwner('0xNewOwner...', null, {
  amountToApprove: fee * 200n / 100n
})

// Remove owner
const proposal = await alice.removeOwner('0xOwnerToRemove...')

// Swap owner
const proposal = await alice.swapOwner('0xOldOwner...', '0xNewOwner...')

// Change threshold
const proposal = await alice.changeThreshold(2)

// Batch update owners and threshold
const proposal = await alice.updateOwners(
  ['0xOwner1...', '0xOwner2...', '0xOwner3...'],
  2 // new threshold
)
```

### Message Signing

```javascript
// Alice signs (proposes) a message
const result = await alice.sign('Hello from Safe!')
console.log('Alice Signature:', result.signature)
console.log('Message Hash:', result.safeMessage.messageHash)
console.log('Confirmations:', result.safeMessage.confirmations.length)

// Bob signs (approves) the message
const approval = await bob.sign('Hello from Safe!', { isApproval: true })
console.log('Bob Signature:', approval.signature)
console.log('Confirmations:', approval.safeMessage.confirmations.length)

// Get combined signature when fully signed
if (approval.safeMessage.preparedSignature) {
  console.log('Combined Signature:', approval.safeMessage.preparedSignature)

  // Verify the combined signature on-chain (EIP-1271)
  const isValid = await alice.verify('Hello from Safe!', approval.safeMessage.preparedSignature)
  console.log('Signature valid:', isValid)
}

// Get message status anytime
const message = await alice.getMessage(result.safeMessage.messageHash)
console.log('Message:', message.message)
console.log('Proposed by:', message.proposedBy)
console.log('Signers:', message.confirmations.map(c => c.owner))
```

### Read-Only Account

```javascript
import { WalletAccountReadOnlyEvmMultisigSafe } from '@tetherto/wdk-wallet-evm-multisig-safe'

const readOnly = new WalletAccountReadOnlyEvmMultisigSafe(null, {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  options: {
    safeAddress: '0x...'
  }
})

// Query Safe info
const owners = await readOnly.getOwners()
const threshold = await readOnly.getThreshold()
const balance = await readOnly.getBalance()

// Get pending transactions
const pending = await readOnly.getPendingTransactions()

// Get fee estimates
const quote = await readOnly.quoteSendTransaction(tx)
```

### Tracking Transactions

After executing a transaction, you receive a UserOp hash. To get the on-chain transaction hash:

```javascript
// Execute transaction
const result = await alice.execute(proposal.safeOperationHash)
console.log('UserOp Hash:', result.hash)

// Get on-chain tx hash (may need to wait for confirmation)
const txHash = await alice.getTransactionHashByUserOpHash(result.hash)
console.log('TX Hash:', txHash)

// If null, the transaction is still pending. Retry after a few seconds.
```

**UserOp Explorers:**

You can track UserOp status on these explorers:

- **JiffyScan**: `https://jiffyscan.xyz/userOpHash/{userOpHash}?network=sepolia`
- **Blockscout**: `https://eth-sepolia.blockscout.com/op/{userOpHash}`

## 📚 API Reference

### WalletManagerEvmMultisigSafe

Main class for managing multisig Safe wallets.

#### Constructor

```javascript
new WalletManagerEvmMultisigSafe(seed, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 seed phrase or seed bytes
- `config` (EvmMultisigSafeConfig): Configuration object

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAccount(index)` | Get account at index | `Promise<WalletAccountEvmMultisigSafe>` |
| `getAccountByPath(path)` | Get account at derivation path | `Promise<WalletAccountEvmMultisigSafe>` |
| `getFeeRates()` | Get current fee rates | `Promise<{normal: bigint, fast: bigint}>` |

### WalletAccountEvmMultisigSafe

Full-access multisig Safe account with signing capabilities.

#### Constructor

```javascript
new WalletAccountEvmMultisigSafe(seed, path, config)
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| **Query Methods** |
| `getAddress()` | Get Safe address | `Promise<string>` |
| `getSignerAddress()` | Get signer's EOA address | `Promise<string>` |
| `getBalance()` | Get native token balance | `Promise<bigint>` |
| `getTokenBalance(token)` | Get ERC20 token balance | `Promise<bigint>` |
| `getOwners()` | Get Safe owners | `Promise<string[]>` |
| `getThreshold()` | Get required signatures | `Promise<number>` |
| `getNonce()` | Get Safe nonce | `Promise<bigint>` |
| `isDeployed()` | Check if Safe is deployed | `Promise<boolean>` |
| **Transaction Methods** |
| `sendTransaction(tx, options?)` | Send transaction (auto-execute if threshold met) | `Promise<MultisigTransferResult>` |
| `transfer(options, proposeOptions?)` | Transfer ERC-20 tokens (auto-execute if threshold met) | `Promise<MultisigTransferResult>` |
| `quoteSendTransaction(tx, options?)` | Estimate transaction fee | `Promise<{fee: bigint}>` |
| `quoteTransfer(options, proposeOptions?)` | Estimate transfer fee | `Promise<{fee: bigint}>` |
| **Multisig Flow** |
| `propose(tx, options?)` | Propose transaction | `Promise<ProposeResult>` |
| `approve(safeOpHash)` | Approve proposal | `Promise<ApprovalResult>` |
| `reject(safeOpHash)` | Reject proposal | `Promise<ProposeResult>` |
| `execute(safeOpHash)` | Execute proposal | `Promise<ExecuteResult>` |
| `isReadyToExecute(safeOpHash)` | Check if ready to execute | `Promise<boolean>` |
| `getTransactionHashByUserOpHash(hash)` | Get on-chain tx hash | `Promise<string \| null>` |
| **Owner Management** |
| `addOwner(address, threshold?, options?)` | Add owner | `Promise<ProposeResult>` |
| `removeOwner(address, threshold?, options?)` | Remove owner | `Promise<ProposeResult>` |
| `swapOwner(oldOwner, newOwner, options?)` | Swap owner | `Promise<ProposeResult>` |
| `changeThreshold(threshold, options?)` | Change threshold | `Promise<ProposeResult>` |
| `updateOwners(owners, threshold, options?)` | Batch update | `Promise<ProposeResult>` |
| **Message Signing** |
| `sign(message, options?)` | Sign message (propose or approve) | `Promise<{signature, safeMessage}>` |
| `verify(message, signature)` | Verify signature (EIP-1271) | `Promise<boolean>` |
| `getMessage(messageHash)` | Get message status | `Promise<SafeMessage \| null>` |
| `getPendingMessages()` | Get pending messages | `Promise<{results: SafeMessage[]}>` |
| **Other** |
| `deploy()` | Deploy Safe (requires ETH in signer's EOA) | `Promise<TransactionResult>` |
| `validateSignerIsOwner()` | Validate signer is owner | `Promise<void>` |
| `toReadOnlyAccount()` | Convert to read-only | `Promise<WalletAccountReadOnlyEvmMultisigSafe>` |
| `dispose()` | Clear sensitive data | `void` |

### WalletAccountReadOnlyEvmMultisigSafe

Read-only multisig Safe account for querying.

#### Static Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getSafesByOwner(ownerAddress, config)` | Get all Safe addresses owned by an address | `Promise<string[]>` |
| `getSafeInfo(safeAddress, config)` | Get Safe info without creating instance | `Promise<SafeInfo>` |
| `generateDeterministicSaltNonce(owners, threshold)` | Generate deterministic salt nonce | `string` |

#### Instance Methods

| Method | Description | Returns |
|--------|-------------|---------|
| **Safe Info** |
| `getAddress()` | Get Safe address | `Promise<string>` |
| `getOwners()` | Get Safe owners | `Promise<string[]>` |
| `getThreshold()` | Get required signatures | `Promise<number>` |
| `getNonce()` | Get Safe nonce | `Promise<bigint>` |
| `isDeployed()` | Check if deployed | `Promise<boolean>` |
| `getVersion()` | Get Safe contract version | `Promise<string>` |
| **Balances** |
| `getBalance()` | Get native token balance | `Promise<bigint>` |
| `getTokenBalance(token)` | Get ERC20 token balance | `Promise<bigint>` |
| `getPaymasterTokenBalance()` | Get paymaster token balance | `Promise<bigint>` |
| **Transactions** |
| `getPendingTransactions()` | Get pending operations | `Promise<Object>` |
| `getSafeOperation(hash)` | Get operation details | `Promise<Object>` |
| `getTransactionHistory(options?)` | Get executed transaction history | `Promise<Object>` |
| `getIncomingTransactions(options?)` | Get incoming transfers | `Promise<Object>` |
| `isReadyToExecute(hash)` | Check if ready | `Promise<boolean>` |
| `getTransactionHashByUserOpHash(hash)` | Get on-chain tx hash | `Promise<string \| null>` |
| **Messages** |
| `getMessage(messageHash)` | Get message details | `Promise<SafeMessage \| null>` |
| `getPendingMessages()` | Get pending messages | `Promise<Object>` |
| **Quotes** |
| `quoteDeploy()` | Estimate deployment fee | `Promise<{fee: bigint}>` |
| `quoteSendTransaction(tx, options?)` | Estimate fee | `Promise<{fee: bigint}>` |
| `quoteTransfer(options, proposeOptions?)` | Estimate transfer fee | `Promise<{fee: bigint}>` |

### Configuration Types

```typescript
// Main configuration
interface EvmMultisigSafeConfig {
  // Required
  provider: string | Eip1193Provider
  bundlerUrl: string
  chainId: bigint

  // Required - Safe options (one of the following)
  options: ExistingSafeOptions | PredictedSafeOptions

  // Optional - ERC-4337
  entryPointAddress?: string
  safeModulesVersion?: string       // Default: '0.2.0'

  // Optional - Paymaster
  paymasterOptions?: PaymasterOptions

  // Optional - Safe Transaction Service
  txServiceUrl?: string
  safeApiKey?: string

  // Optional - Fee limits
  transferMaxFee?: number | bigint
}

// Import existing Safe
interface ExistingSafeOptions {
  safeAddress: string
}

// Create new Safe
interface PredictedSafeOptions {
  owners: string[]
  threshold: number
  saltNonce?: string
  safeVersion?: SafeVersion
  deploymentType?: DeploymentType
}

// Paymaster configuration
type PaymasterOptions = {
  paymasterUrl: string
  skipApproveTransaction?: boolean
} & (SponsoredPaymasterOption | ERC20PaymasterOption)

interface SponsoredPaymasterOption {
  isSponsored: true
  sponsorshipPolicyId?: string
}

interface ERC20PaymasterOption {
  isSponsored?: false
  paymasterAddress: string
  paymasterTokenAddress: string
  amountToApprove?: bigint
}
```

## 🔐 Security Notes

### Safe API Key

Safe requires authenticated API access. Get your API key from the [Safe Developer Dashboard](https://developer.safe.global).

- **Backend / Testing**: Pass `safeApiKey` directly in config. Safe for server-side use.
- **Frontend**: Recommended to not expose `safeApiKey` in client code. Use `txServiceUrl` pointing to a backend proxy that injects the key server-side.

```javascript
// ❌ DON'T - exposes your API key in frontend bundle
const config = {
  safeApiKey: 'eyJhb...',  // Anyone can extract this
  // ...
}

// ✅ DO - proxy injects the key server-side
const config = {
  txServiceUrl: 'https://your-backend.com/safe-proxy',
  // ...
}
```

### Sponsorship Policy

When using sponsored (gasless) mode, the `sponsorshipPolicyId` is visible to the client. Without restrictions, anyone could use your policy to sponsor their own transactions.

**Recommended**: Configure a sponsorship policy to control which transactions get sponsored:

- **Webhook verification**: Validate each sponsorship request server-side before approving
- **Policy rules**: Restrict by sender address, contract, gas limit, time window, etc.

See Pimlico's guides:
- [Sponsorship Policies](https://docs.pimlico.io/guides/how-to/sponsorship-policies)
- [Webhook Verification](https://docs.pimlico.io/guides/how-to/sponsorship-policies/webhook)
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint
```

## 📜 License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please submit a Pull Request.

## 🆘 Support

For support, open an issue on the GitHub repository.