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
- **Message Signing**: Propose/approve flow for multisig message signing with EIP-1271 verification
- **Deterministic Addresses**: Predictable Safe addresses from owner configuration
- **Auto-Execute**: Automatically execute transactions when threshold is met

## ⬇️ Installation

```bash
npm install @tetherto/wdk-wallet-evm-multisig-safe
```

## 🚀 Quick Start

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
const aliceEoa = '0x...'
const bobEoa = '0x...'

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
  safeApiKey: 'YOUR_SAFE_API_KEY', // OR txServiceUrl: 'https://your-proxy.com/safe'
  options: {
    owners: [aliceEoa, bobEoa],
    threshold: 2,
    saltNonce: '0x...' // Optional
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
  safeApiKey: 'YOUR_SAFE_API_KEY', // OR txServiceUrl: 'https://your-proxy.com/safe'
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
console.log('SafeOp Hash:', proposal.proposalId)
console.log('Confirmations:', proposal.confirmations, '/', proposal.threshold)

// Bob approves
const bob = new WalletAccountEvmMultisigSafe(bobSeed, "0'/0/0", config)
const approval = await bob.approve(proposal.proposalId)
console.log('Confirmations:', approval.confirmations, '/', approval.threshold)

// Execute when threshold met
const result = await alice.execute(proposal.proposalId)
console.log('UserOp Hash:', result.hash)

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
  safeApiKey: 'YOUR_SAFE_API_KEY', // OR txServiceUrl: 'https://your-proxy.com/safe'
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
    paymasterAddress: '0x...', 
    paymasterTokenAddress: '0x...' 
  },
  options: {
    safeAddress: '0x...'
  }
})

// Propose with token approval for gas
const quote = await alice.quoteSendTransaction(tx)
const proposal = await alice.propose(tx, {
  amountToApprove: quote.fee * 150n / 100n 
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
    isSponsored: true, 
    sponsorshipPolicyId: 'sp_my_policy' 
  },
  safeApiKey: 'YOUR_SAFE_API_KEY', // OR txServiceUrl: 'https://your-proxy.com/safe'
  options: {
    safeAddress: '0x...'
  }
})

// No amountToApprove needed - sponsor pays gas!
const proposal = await alice.propose(tx)
console.log('SafeOp Hash:', proposal.proposalId)

// Bob approves
const approval = await bob.approve(proposal.proposalId)

// Execute - completely gasless for the Safe
const result = await alice.execute(proposal.proposalId)
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
  safeApiKey: 'YOUR_SAFE_API_KEY', // OR txServiceUrl: 'https://your-proxy.com/safe'
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
  safeApiKey: 'YOUR_SAFE_API_KEY', // OR txServiceUrl: 'https://your-proxy.com/safe'
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
  2
)
```

### Message Signing
```javascript
// Alice proposes signing a message
const result = await alice.proposeMessage('Hello from Safe!')
console.log('Alice Signature:', result.signature)
console.log('Message Hash:', result.messageHash)
console.log('Confirmations:', result.confirmations, '/', result.threshold)

// Bob approves the message
const approval = await bob.approveMessage(result.messageHash)
console.log('Bob Signature:', approval.signature)
console.log('Confirmations:', approval.confirmations, '/', approval.threshold)

// Get combined signature when fully signed
if (approval.combinedSignature) {
  console.log('Combined Signature:', approval.combinedSignature)

  // Verify the combined signature on-chain (EIP-1271)
  const isValid = await alice.verify('Hello from Safe!', approval.combinedSignature)
  console.log('Signature valid:', isValid)
}

// Get message status anytime
const [message] = await alice.getMessages([result.messageHash])
console.log('Message:', message.message)
console.log('Confirmations:', message.confirmations, '/', message.threshold)
console.log('Combined Signature:', message.combinedSignature)
```

### Read-Only Account

```javascript
import { WalletAccountReadOnlyEvmMultisigSafe } from '@tetherto/wdk-wallet-evm-multisig-safe'

const readOnly = new WalletAccountReadOnlyEvmMultisigSafe(null, {
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY',
  chainId: 11155111n,
  safeApiKey: 'YOUR_SAFE_API_KEY', // OR txServiceUrl: 'https://your-proxy.com/safe'
  options: {
    safeAddress: '0x...'
  }
})

// Query Safe info
const owners = await readOnly.getOwners()
const threshold = await readOnly.getThreshold()
const balance = await readOnly.getBalance()

// Get fee estimates
const quote = await readOnly.quoteSendTransaction(tx)

// Get proposals status
const proposals = await readOnly.getProposals([proposalHash1, proposalHash2])

// Get messages status
const messages = await readOnly.getMessages([messageHash1, messageHash2])

// Get fee estimates
const quote = await readOnly.quoteSendTransaction(tx)
```

**UserOp Explorers:**

You can track UserOp status on these explorers:

- **JiffyScan**: `https://jiffyscan.xyz/userOpHash/{userOpHash}?network=sepolia`
- **Blockscout**: `https://eth-sepolia.blockscout.com/op/{userOpHash}`

## 🔐 Security Notes

### Safe API Key

Safe requires authenticated API access. Get your API key from the [Safe Developer Dashboard](https://developer.safe.global).

- **Backend / Testing**: Pass `safeApiKey` directly in config. Safe for server-side use.
- **Frontend**: Recommended to not expose `safeApiKey` in client code. Use `txServiceUrl` pointing to a backend proxy that injects the key server-side.

```javascript
// DON'T - exposes your API key in frontend bundle
const config = {
  safeApiKey: 'eyJhb...',  // Anyone can extract this
  // ...
}

// DO - proxy injects the key server-side
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