// Test for wdk-protocol-multisig-safe on Sepolia testnet
//
// Setup:
// 1. Copy .env.example to .env
// 2. Fill in your API keys
// 3. Run: node test/test-sepolia.js [test-name]
//
// Available tests:
//   node test/test-sepolia.js create      - Create new Safe
//   node test/test-sepolia.js import      - Import existing Safe
//   node test/test-sepolia.js readonly    - Test read-only account
//   node test/test-sepolia.js multisig    - Full multisig flow
//   node test/test-sepolia.js addowner    - Test addOwner
//   node test/test-sepolia.js removeowner - Test removeOwner
//   node test/test-sepolia.js swapowner   - Test swapOwner
//   node test/test-sepolia.js threshold   - Test changeThreshold
//   node test/test-sepolia.js updateowners - Test updateOwners
//   node test/test-sepolia.js pending     - List pending operations
//   node test/test-sepolia.js execute     - Execute a pending operation
//   node test/test-sepolia.js sendtx      - Test sendTransaction
//   node test/test-sepolia.js transfer    - Test transfer
//   node test/test-sepolia.js message     - Test message signing

import 'dotenv/config'
import WalletAccountEvmMultisigSafe from '../src/wallet-account-evm-multisig-safe.js'
import WalletAccountReadOnlyEvmMultisigSafe from '../src/wallet-account-read-only-evm-multisig-safe.js'
import { WalletAccountEvm } from '@tetherto/wdk-wallet-evm'

// ============================================
// CONFIGURATION FROM .env
// ============================================

const {
  ALICE_SEED_PHRASE,
  BOB_SEED_PHRASE,
  SEPOLIA_RPC,
  CHAIN_ID,
  BUNDLER_URL,
  PAYMASTER_URL,
  PAYMASTER_ADDRESS,
  PAYMASTER_TOKEN_ADDRESS,
  SAFE_ADDRESS,
  SALT_NONCE,
  SAFE_API_KEY
} = process.env

// Third account for testing (derived from a fixed seed for testing)
const CHARLIE_SEED_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

// Validate required env vars
function validateEnv() {
  const required = [
    'ALICE_SEED_PHRASE',
    'BOB_SEED_PHRASE',
    'SEPOLIA_RPC',
    'BUNDLER_URL',
    'PAYMASTER_URL',
    'PAYMASTER_ADDRESS',
    'PAYMASTER_TOKEN_ADDRESS'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    console.error('\nPlease copy .env.example to .env and fill in the values.')
    process.exit(1)
  }
}

// ============================================
// TEST HELPERS
// ============================================

function log(message) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(message)
  console.log('='.repeat(60))
}

function logStep(step, message) {
  console.log(`\n[Step ${step}] ${message}`)
}

// Helper to get EOA address from seed
async function getEoaAddress(seed, path = "0'/0/0") {
  const account = new WalletAccountEvm(seed, path, { provider: SEPOLIA_RPC })
  const address = await account.getAddress()
  account.dispose()
  return address
}

// Get base config for multisig
function getBaseConfig() {
  const config = {
    provider: SEPOLIA_RPC,
    bundlerUrl: BUNDLER_URL,
    chainId: BigInt(CHAIN_ID || 11155111),
    paymasterOptions: {
      paymasterUrl: PAYMASTER_URL,
      paymasterAddress: PAYMASTER_ADDRESS,
      paymasterTokenAddress: PAYMASTER_TOKEN_ADDRESS
    }
  }

  if (SAFE_API_KEY) {
    config.safeApiKey = SAFE_API_KEY
  }

  return config
}

// Get config for existing Safe
function getExistingSafeConfig() {
  if (!SAFE_ADDRESS) {
    throw new Error('SAFE_ADDRESS not set in .env')
  }

  return {
    ...getBaseConfig(),
    safeAddress: SAFE_ADDRESS
  }
}

// Helper to display Safe info
async function displaySafeInfo(account, label = 'Safe') {
  const address = await account.getAddress()
  const isDeployed = await account.isDeployed()

  console.log(`\n${label} Info:`)
  console.log(`   Address: ${address}`)
  console.log(`   Deployed: ${isDeployed}`)

  if (isDeployed) {
    const owners = await account.getOwners()
    const threshold = await account.getThreshold()
    console.log(`   Owners (${owners.length}):`)
    owners.forEach((o, i) => console.log(`      ${i + 1}. ${o}`))
    console.log(`   Threshold: ${threshold}`)

    try {
      const ethBalance = await account.getBalance()
      console.log(`   ETH Balance: ${ethBalance} wei`)

      const tokenBalance = await account.getTokenBalance(PAYMASTER_TOKEN_ADDRESS)
      console.log(`   USDC Balance: ${Number(tokenBalance) / 1e6} USDC`)
    } catch (e) {
      console.log(`   Balance error: ${e.message}`)
    }
  }
}

// ============================================
// TEST: Create New Safe (2-of-2 Multisig)
// ============================================

async function testCreateNewSafe() {
  log('TEST: Create New 2-of-2 Multisig Safe')

  // Get actual EOA addresses from seeds
  logStep(1, 'Getting EOA addresses from seeds...')
  const aliceEoa = await getEoaAddress(ALICE_SEED_PHRASE)
  const bobEoa = await getEoaAddress(BOB_SEED_PHRASE)
  console.log(`   Alice EOA: ${aliceEoa}`)
  console.log(`   Bob EOA: ${bobEoa}`)

  const saltNonce = SALT_NONCE || `0x${Date.now().toString(16).padStart(64, '0')}`

  // Alice creates her account with correct owners
  logStep(2, 'Alice initializes multisig Safe account...')
  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", {
    ...getBaseConfig(),
    safeAccountConfig: {
      owners: [aliceEoa, bobEoa],
      threshold: 2
    },
    safeDeploymentConfig: {
      saltNonce
    }
  })

  // Get predicted Safe address
  logStep(3, 'Getting predicted Safe address...')
  const safeAddress = await alice.getAddress()
  console.log(`   Safe Address: ${safeAddress}`)

  // Check if deployed
  let isDeployed = await alice.isDeployed()
  console.log(`   Is Deployed: ${isDeployed}`)

  // Get owners and threshold
  const owners = await alice.getOwners()
  const threshold = await alice.getThreshold()
  console.log(`   Owners: ${owners.join(', ')}`)
  console.log(`   Threshold: ${threshold}`)

  // Validate Alice is an owner
  logStep(4, 'Validating Alice is an owner...')
  try {
    await alice.validateSignerIsOwner()
    console.log('   ✅ Alice is a valid owner')
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }

  // Get signer address
  const signerAddress = await alice.getSignerAddress()
  console.log(`   Alice's Signer EOA: ${signerAddress}`)

  // Deploy if not deployed
  if (!isDeployed) {
    logStep(5, 'Deploying Safe...')
    console.log('   ⚠️  Safe needs to be deployed before use.')
    console.log('   To deploy, you need ETH in Alice\'s EOA for gas.')

    // Check Alice's ETH balance
    const aliceAccount = new WalletAccountEvm(ALICE_SEED_PHRASE, "0'/0/0", { provider: SEPOLIA_RPC })
    const aliceBalance = await aliceAccount.getBalance()
    console.log(`   Alice's ETH Balance: ${aliceBalance} wei`)

    if (aliceBalance > 0n) {
      console.log('   Attempting to deploy...')
      try {
        const deployResult = await alice.deploy()
        console.log(`   ✅ Deploy TX sent! Hash: ${deployResult.txHash}`)

        // Wait for transaction to be mined
        console.log('   ⏳ Waiting for transaction to be mined...')
        const { JsonRpcProvider } = await import('ethers')
        const provider = new JsonRpcProvider(SEPOLIA_RPC)
        const receipt = await provider.waitForTransaction(deployResult.txHash, 1, 60000)

        if (receipt && receipt.status === 1) {
          console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`)
          isDeployed = true

          // Verify deployment
          const code = await provider.getCode(safeAddress)
          if (code !== '0x') {
            console.log('   ✅ Safe contract verified on-chain!')
          } else {
            console.log('   ⚠️ Warning: Contract code not found at address')
          }
        } else {
          console.log('   ❌ Transaction failed')
        }
      } catch (error) {
        console.log(`   ❌ Deploy failed: ${error.message}`)
      }
    } else {
      console.log(`   ❌ No ETH to deploy. Send ETH to: ${signerAddress}`)
    }

    aliceAccount.dispose()
  }

  // Cleanup
  alice.dispose()
  console.log('\n✅ Test completed!')

  return { safeAddress, isDeployed, owners: [aliceEoa, bobEoa], threshold: 2, saltNonce }
}

// ============================================
// TEST: Import Existing Deployed Safe
// ============================================

async function testImportExistingSafe() {
  log('TEST: Import Existing Safe')

  logStep(1, `Importing Safe: ${SAFE_ADDRESS}`)

  const alice = new WalletAccountEvmMultisigSafe(
    ALICE_SEED_PHRASE,
    "0'/0/0",
    getExistingSafeConfig()
  )

  await displaySafeInfo(alice, 'Imported Safe')

  // Check if Alice is an owner
  logStep(2, 'Checking if Alice is an owner...')
  try {
    await alice.validateSignerIsOwner()
    console.log('   ✅ Alice is a valid owner')
  } catch (error) {
    console.log(`   ❌ ${error.message}`)
  }

  alice.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Read-Only Account
// ============================================

async function testReadOnlyAccount() {
  log('TEST: Read-Only Account')

  logStep(1, `Creating read-only account for: ${SAFE_ADDRESS}`)

  const config = {
    provider: SEPOLIA_RPC,
    bundlerUrl: BUNDLER_URL,
    chainId: BigInt(CHAIN_ID || 11155111),
    safeAddress: SAFE_ADDRESS
  }

  if (SAFE_API_KEY) {
    config.safeApiKey = SAFE_API_KEY
  }

  const readOnly = new WalletAccountReadOnlyEvmMultisigSafe(null, config)

  await displaySafeInfo(readOnly, 'Read-Only Safe')

  logStep(2, 'Getting pending transactions...')
  try {
    const pending = await readOnly.getPendingTransactions()
    console.log(`   Pending operations: ${pending.results?.length || 0}`)

    if (pending.results?.length > 0) {
      pending.results.forEach((op, i) => {
        console.log(`\n   Operation ${i + 1}:`)
        console.log(`      Hash: ${op.safeOperationHash}`)
        console.log(`      Confirmations: ${op.confirmations?.length || 0}`)
        console.log(`      Status: ${op.status || 'pending'}`)
      })
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`)
  }

  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Full Multisig Flow
// ============================================

async function testMultisigFlow() {
  log('TEST: Full Multisig Flow')

  logStep(1, 'Initializing Alice and Bob...')
  const config = getExistingSafeConfig()

  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  const aliceEoa = await alice.getSignerAddress()
  const bobEoa = await bob.getSignerAddress()
  console.log(`   Alice EOA: ${aliceEoa}`)
  console.log(`   Bob EOA: ${bobEoa}`)

  await displaySafeInfo(alice)

  // Check paymaster token balance
  logStep(2, 'Checking paymaster token balance...')
  const tokenBalance = await alice.getTokenBalance(PAYMASTER_TOKEN_ADDRESS)
  console.log(`   USDC Balance: ${Number(tokenBalance) / 1e6} USDC`)

  if (tokenBalance === 0n) {
    console.log('\n   ⚠️ No USDC balance. Send USDC to the Safe.')
    alice.dispose()
    bob.dispose()
    return
  }

  // Alice proposes a transaction
  logStep(3, 'Alice proposes a transaction...')
  try {
    const tx = {
      to: '0x000000000000000000000000000000000000dEaD',
      value: '0',
      data: '0x'
    }

    const quote = await alice.quoteSendTransaction(tx)
    console.log(`   Estimated fee: ${Number(quote.fee) / 1e6} USDC`)

    const proposal = await alice.propose(tx, {
      amountToApprove: quote.fee * 150n / 100n // 50% buffer
    })

    console.log('   ✅ Proposal created!')
    console.log(`   SafeOp Hash: ${proposal.safeOperationHash}`)
    console.log(`   Confirmations: ${proposal.confirmations}/${proposal.threshold}`)

    // Bob approves
    logStep(4, 'Bob approves the proposal...')
    const approval = await bob.approve(proposal.safeOperationHash)
    console.log('   ✅ Bob approved!')
    console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)

    // Check if ready to execute
    logStep(5, 'Checking if ready to execute...')
    const isReady = await alice.isReadyToExecute(proposal.safeOperationHash)
    console.log(`   Ready to execute: ${isReady}`)

    if (isReady) {
      logStep(6, 'Executing transaction...')
      const result = await alice.execute(proposal.safeOperationHash)
      console.log('   ✅ Executed!')
      console.log(`   UserOp Hash: ${result.hash}`)

      // Get on-chain tx hash
      logStep(7, 'Getting on-chain transaction hash...')
      const txHash = await alice.getTransactionHashByUserOpHash(result.hash)
      if (txHash) {
        console.log(`   TX Hash: ${txHash}`)
      } else {
        console.log('   TX Hash: (pending confirmation)')
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Add Owner
// ============================================

async function testAddOwner() {
  log('TEST: Add Owner')

  logStep(1, 'Initializing accounts...')
  const config = getExistingSafeConfig()

  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  // Get Charlie's address (new owner to add)
  const charlieEoa = await getEoaAddress(CHARLIE_SEED_PHRASE)
  console.log(`   Charlie EOA (new owner): ${charlieEoa}`)

  await displaySafeInfo(alice)

  // Check if Charlie is already an owner
  const currentOwners = await alice.getOwners()
  if (currentOwners.some(o => o.toLowerCase() === charlieEoa.toLowerCase())) {
    console.log('\n   ⚠️ Charlie is already an owner. Skipping test.')
    alice.dispose()
    bob.dispose()
    return
  }

  logStep(2, 'Alice proposes to add Charlie as owner...')
  try {
    const quote = await alice.quoteSendTransaction({
      to: SAFE_ADDRESS,
      value: '0',
      data: '0x'
    })
    console.log(`   Estimated fee: ${Number(quote.fee) / 1e6} USDC`)

    const proposal = await alice.addOwner(charlieEoa, null, {
      amountToApprove: quote.fee * 200n / 100n
    })

    console.log('   ✅ Proposal created!')
    console.log(`   SafeOp Hash: ${proposal.safeOperationHash}`)
    console.log(`   Confirmations: ${proposal.confirmations}/${proposal.threshold}`)

    // Bob approves
    logStep(3, 'Bob approves...')
    const approval = await bob.approve(proposal.safeOperationHash)
    console.log('   ✅ Bob approved!')
    console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)

    // Execute if ready
    const isReady = await alice.isReadyToExecute(proposal.safeOperationHash)
    if (isReady) {
      logStep(4, 'Executing addOwner...')
      const result = await alice.execute(proposal.safeOperationHash)
      console.log('   ✅ Executed!')
      console.log(`   UserOp Hash: ${result.hash}`)

      // Verify new owners
      logStep(5, 'Verifying new owner list...')
      // Clear cache
      alice._owners = null
      const newOwners = await alice.getOwners()
      console.log(`   New owners (${newOwners.length}):`)
      newOwners.forEach((o, i) => console.log(`      ${i + 1}. ${o}`))
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Remove Owner
// ============================================

async function testRemoveOwner() {
  log('TEST: Remove Owner')

  logStep(1, 'Initializing accounts...')
  const config = getExistingSafeConfig()

  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  // Get Charlie's address (owner to remove)
  const charlieEoa = await getEoaAddress(CHARLIE_SEED_PHRASE)
  console.log(`   Charlie EOA (to remove): ${charlieEoa}`)

  await displaySafeInfo(alice)

  // Check if Charlie is an owner
  const currentOwners = await alice.getOwners()
  if (!currentOwners.some(o => o.toLowerCase() === charlieEoa.toLowerCase())) {
    console.log('\n   ⚠️ Charlie is not an owner. Run addowner test first.')
    alice.dispose()
    bob.dispose()
    return
  }

  logStep(2, 'Alice proposes to remove Charlie...')
  try {
    const quote = await alice.quoteSendTransaction({
      to: SAFE_ADDRESS,
      value: '0',
      data: '0x'
    })
    console.log(`   Estimated fee: ${Number(quote.fee) / 1e6} USDC`)

    const proposal = await alice.removeOwner(charlieEoa, null, {
      amountToApprove: quote.fee * 200n / 100n
    })

    console.log('   ✅ Proposal created!')
    console.log(`   SafeOp Hash: ${proposal.safeOperationHash}`)
    console.log(`   Confirmations: ${proposal.confirmations}/${proposal.threshold}`)

    // Bob approves
    logStep(3, 'Bob approves...')
    const approval = await bob.approve(proposal.safeOperationHash)
    console.log('   ✅ Bob approved!')
    console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)

    // Execute if ready
    const isReady = await alice.isReadyToExecute(proposal.safeOperationHash)
    if (isReady) {
      logStep(4, 'Executing removeOwner...')
      const result = await alice.execute(proposal.safeOperationHash)
      console.log('   ✅ Executed!')
      console.log(`   UserOp Hash: ${result.hash}`)

      // Verify owners
      logStep(5, 'Verifying owner list...')
      alice._owners = null
      const newOwners = await alice.getOwners()
      console.log(`   Owners (${newOwners.length}):`)
      newOwners.forEach((o, i) => console.log(`      ${i + 1}. ${o}`))
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Swap Owner
// ============================================

async function testSwapOwner() {
  log('TEST: Swap Owner')

  logStep(1, 'Initializing accounts...')
  const config = getExistingSafeConfig()

  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  const bobEoa = await bob.getSignerAddress()
  const charlieEoa = await getEoaAddress(CHARLIE_SEED_PHRASE)

  console.log(`   Bob EOA (old owner): ${bobEoa}`)
  console.log(`   Charlie EOA (new owner): ${charlieEoa}`)

  await displaySafeInfo(alice)

  // Check current state
  const currentOwners = await alice.getOwners()
  const bobIsOwner = currentOwners.some(o => o.toLowerCase() === bobEoa.toLowerCase())
  const charlieIsOwner = currentOwners.some(o => o.toLowerCase() === charlieEoa.toLowerCase())

  if (!bobIsOwner) {
    console.log('\n   ⚠️ Bob is not an owner. Cannot swap.')
    alice.dispose()
    bob.dispose()
    return
  }

  if (charlieIsOwner) {
    console.log('\n   ⚠️ Charlie is already an owner. Cannot swap to existing owner.')
    alice.dispose()
    bob.dispose()
    return
  }

  logStep(2, 'Alice proposes to swap Bob with Charlie...')
  try {
    const quote = await alice.quoteSendTransaction({
      to: SAFE_ADDRESS,
      value: '0',
      data: '0x'
    })
    console.log(`   Estimated fee: ${Number(quote.fee) / 1e6} USDC`)

    const proposal = await alice.swapOwner(bobEoa, charlieEoa, {
      amountToApprove: quote.fee * 200n / 100n
    })

    console.log('   ✅ Proposal created!')
    console.log(`   SafeOp Hash: ${proposal.safeOperationHash}`)
    console.log(`   Confirmations: ${proposal.confirmations}/${proposal.threshold}`)

    // Bob approves (he's still owner until executed)
    logStep(3, 'Bob approves...')
    const approval = await bob.approve(proposal.safeOperationHash)
    console.log('   ✅ Bob approved!')
    console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)

    // Execute if ready
    const isReady = await alice.isReadyToExecute(proposal.safeOperationHash)
    if (isReady) {
      logStep(4, 'Executing swapOwner...')
      const result = await alice.execute(proposal.safeOperationHash)
      console.log('   ✅ Executed!')
      console.log(`   UserOp Hash: ${result.hash}`)

      // Verify owners
      logStep(5, 'Verifying owner list...')
      alice._owners = null
      const newOwners = await alice.getOwners()
      console.log(`   Owners (${newOwners.length}):`)
      newOwners.forEach((o, i) => console.log(`      ${i + 1}. ${o}`))
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Change Threshold
// ============================================

async function testChangeThreshold() {
  log('TEST: Change Threshold')

  logStep(1, 'Initializing accounts...')
  const config = getExistingSafeConfig()

  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  await displaySafeInfo(alice)

  const currentThreshold = await alice.getThreshold()
  const owners = await alice.getOwners()

  // Toggle threshold between 1 and 2 (or max owners)
  const newThreshold = currentThreshold === 1 ? Math.min(2, owners.length) : 1
  console.log(`\n   Changing threshold: ${currentThreshold} → ${newThreshold}`)

  logStep(2, 'Alice proposes threshold change...')
  try {
    const quote = await alice.quoteSendTransaction({
      to: SAFE_ADDRESS,
      value: '0',
      data: '0x'
    })
    console.log(`   Estimated fee: ${Number(quote.fee) / 1e6} USDC`)

    const proposal = await alice.changeThreshold(newThreshold, {
      amountToApprove: quote.fee * 200n / 100n
    })

    console.log('   ✅ Proposal created!')
    console.log(`   SafeOp Hash: ${proposal.safeOperationHash}`)
    console.log(`   Confirmations: ${proposal.confirmations}/${proposal.threshold}`)

    // Bob approves if threshold requires it
    if (currentThreshold > 1) {
      logStep(3, 'Bob approves...')
      const approval = await bob.approve(proposal.safeOperationHash)
      console.log('   ✅ Bob approved!')
      console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)
    }

    // Execute if ready
    const isReady = await alice.isReadyToExecute(proposal.safeOperationHash)
    if (isReady) {
      logStep(4, 'Executing changeThreshold...')
      const result = await alice.execute(proposal.safeOperationHash)
      console.log('   ✅ Executed!')
      console.log(`   UserOp Hash: ${result.hash}`)

      // Verify threshold
      logStep(5, 'Verifying new threshold...')
      alice._threshold = null
      const updatedThreshold = await alice.getThreshold()
      console.log(`   New threshold: ${updatedThreshold}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Update Owners (Batch)
// ============================================

async function testUpdateOwners() {
  log('TEST: Update Owners (Batch)')

  logStep(1, 'Initializing accounts...')
  const config = getExistingSafeConfig()

  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  const aliceEoa = await alice.getSignerAddress()
  const bobEoa = await bob.getSignerAddress()
  const charlieEoa = await getEoaAddress(CHARLIE_SEED_PHRASE)

  await displaySafeInfo(alice)

  const currentOwners = await alice.getOwners()

  // Define new owners (add Charlie if not present, or remove if present)
  let newOwners
  let newThreshold

  const charlieIsOwner = currentOwners.some(o => o.toLowerCase() === charlieEoa.toLowerCase())

  if (charlieIsOwner) {
    // Remove Charlie
    newOwners = [aliceEoa, bobEoa]
    newThreshold = 2
    console.log('\n   Plan: Remove Charlie, set threshold to 2')
  } else {
    // Add Charlie
    newOwners = [aliceEoa, bobEoa, charlieEoa]
    newThreshold = 2
    console.log('\n   Plan: Add Charlie, keep threshold at 2')
  }

  console.log(`   New owners: ${newOwners.join(', ')}`)
  console.log(`   New threshold: ${newThreshold}`)

  logStep(2, 'Alice proposes updateOwners...')
  try {
    const quote = await alice.quoteSendTransaction({
      to: SAFE_ADDRESS,
      value: '0',
      data: '0x'
    })
    console.log(`   Estimated fee: ${Number(quote.fee) / 1e6} USDC`)

    const proposal = await alice.updateOwners(newOwners, newThreshold, {
      amountToApprove: quote.fee * 300n / 100n // Higher buffer for batch
    })

    console.log('   ✅ Proposal created!')
    console.log(`   SafeOp Hash: ${proposal.safeOperationHash}`)
    console.log(`   Confirmations: ${proposal.confirmations}/${proposal.threshold}`)

    // Bob approves
    logStep(3, 'Bob approves...')
    const approval = await bob.approve(proposal.safeOperationHash)
    console.log('   ✅ Bob approved!')
    console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)

    // Execute if ready
    const isReady = await alice.isReadyToExecute(proposal.safeOperationHash)
    if (isReady) {
      logStep(4, 'Executing updateOwners...')
      const result = await alice.execute(proposal.safeOperationHash)
      console.log('   ✅ Executed!')
      console.log(`   UserOp Hash: ${result.hash}`)

      // Verify
      logStep(5, 'Verifying changes...')
      alice._owners = null
      alice._threshold = null
      const updatedOwners = await alice.getOwners()
      const updatedThreshold = await alice.getThreshold()
      console.log(`   Owners (${updatedOwners.length}):`)
      updatedOwners.forEach((o, i) => console.log(`      ${i + 1}. ${o}`))
      console.log(`   Threshold: ${updatedThreshold}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: List Pending Operations
// ============================================

async function testListPending() {
  log('TEST: List Pending Operations')

  const config = getExistingSafeConfig()
  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)

  await displaySafeInfo(alice)

  logStep(1, 'Fetching pending operations...')
  try {
    const pending = await alice.getPendingTransactions()
    const results = pending.results || []

    console.log(`\n   Found ${results.length} pending operation(s)`)

    if (results.length > 0) {
      const threshold = await alice.getThreshold()

      results.forEach((op, i) => {
        console.log('\n   ─────────────────────────────────────')
        console.log(`   Operation ${i + 1}:`)
        console.log(`      Hash: ${op.safeOperationHash}`)
        console.log(`      Confirmations: ${op.confirmations?.length || 0}/${threshold}`)
        console.log(`      Ready: ${(op.confirmations?.length || 0) >= threshold ? 'Yes ✅' : 'No ❌'}`)

        if (op.confirmations?.length > 0) {
          console.log('      Signers:')
          op.confirmations.forEach(c => {
            console.log(`         - ${c.owner}`)
          })
        }
      })
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }

  alice.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Execute Pending Operation
// ============================================

async function testExecutePending() {
  log('TEST: Execute Pending Operation')

  const safeOpHash = process.argv[3]

  if (!safeOpHash) {
    console.log('\n   Usage: node test-sepolia.js execute <safeOperationHash>')
    console.log('   Run "node test-sepolia.js pending" to see pending operations.')
    return
  }

  const config = getExistingSafeConfig()
  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)

  logStep(1, `Checking operation: ${safeOpHash}`)

  try {
    const isReady = await alice.isReadyToExecute(safeOpHash)
    console.log(`   Ready to execute: ${isReady}`)

    if (!isReady) {
      const op = await alice.getTransaction(safeOpHash)
      const threshold = await alice.getThreshold()
      const confirmations = op?.confirmations?.length || 0
      console.log(`   Confirmations: ${confirmations}/${threshold}`)
      console.log(`   ⚠️ Need ${threshold - confirmations} more signature(s)`)
    } else {
      logStep(2, 'Executing...')
      const result = await alice.execute(safeOpHash)
      console.log('   ✅ Executed!')
      console.log(`   UserOp Hash: ${result.hash}`)

      // Get on-chain tx hash
      logStep(3, 'Getting on-chain transaction hash...')
      const txHash = await alice.getTransactionHashByUserOpHash(result.hash)
      if (txHash) {
        console.log(`   TX Hash: ${txHash}`)
      } else {
        console.log('   TX Hash: (pending confirmation)')
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }

  alice.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: sendTransaction (auto-execute if threshold met)
// ============================================

async function testSendTransaction() {
  log('TEST: sendTransaction (auto-execute if threshold met)')

  const config = getExistingSafeConfig()
  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  await displaySafeInfo(alice)

  logStep(1, 'Calling sendTransaction()...')
  try {
    const result = await alice.sendTransaction({
      to: '0x000000000000000000000000000000000000dEaD',
      value: '0',
      data: '0x'
    })

    console.log('   ✅ sendTransaction returned:')
    console.log(`      Hash: ${result.hash}`)
    console.log(`      Fee: ${Number(result.fee) / 1e6} USDC`)
    console.log(`      Confirmations: ${result.confirmations}/${result.threshold}`)
    console.log(`      Executed: ${result.executed}`)

    if (!result.executed && result.confirmations < result.threshold) {
      // Need more signatures
      logStep(2, 'Bob approves...')
      const approval = await bob.approve(result.hash)
      console.log('   ✅ Bob approved!')
      console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)

      if (approval.confirmations >= approval.threshold) {
        logStep(3, 'Executing...')
        const execResult = await alice.execute(result.hash)
        console.log('   ✅ Executed!')
        console.log(`   UserOp Hash: ${execResult.hash}`)
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: transfer (auto-execute if threshold met)
// ============================================

async function testTransfer() {
  log('TEST: transfer (auto-execute if threshold met)')

  const config = getExistingSafeConfig()
  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  await displaySafeInfo(alice)

  logStep(1, 'Calling transfer()...')
  try {
    const result = await alice.transfer({
      to: '0x000000000000000000000000000000000000dEaD',
      amount: '0'
    })

    console.log('   ✅ transfer returned:')
    console.log(`      Hash: ${result.hash}`)
    console.log(`      Fee: ${Number(result.fee) / 1e6} USDC`)
    console.log(`      Confirmations: ${result.confirmations}/${result.threshold}`)
    console.log(`      Executed: ${result.executed}`)

    if (!result.executed && result.confirmations < result.threshold) {
      // Need more signatures
      logStep(2, 'Bob approves...')
      const approval = await bob.approve(result.hash)
      console.log('   ✅ Bob approved!')
      console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)

      if (approval.confirmations >= approval.threshold) {
        logStep(3, 'Executing...')
        const execResult = await alice.execute(result.hash)
        console.log('   ✅ Executed!')
        console.log(`   UserOp Hash: ${execResult.hash}`)
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// TEST: Message Signing (proposeMessage/approveMessage)
// ============================================

async function testMessageSigning() {
  log('TEST: Message Signing (proposeMessage/approveMessage)')

  logStep(1, 'Initializing Alice and Bob...')
  const config = getExistingSafeConfig()

  const alice = new WalletAccountEvmMultisigSafe(ALICE_SEED_PHRASE, "0'/0/0", config)
  const bob = new WalletAccountEvmMultisigSafe(BOB_SEED_PHRASE, "0'/0/0", config)

  const aliceEoa = await alice.getSignerAddress()
  const bobEoa = await bob.getSignerAddress()
  console.log(`   Alice EOA: ${aliceEoa}`)
  console.log(`   Bob EOA: ${bobEoa}`)

  await displaySafeInfo(alice)

  const message = `Hello from Safe! Timestamp: ${Date.now()}`
  console.log(`\n   Message: "${message}"`)

  // Alice proposes the message
  logStep(2, 'Alice proposes message...')
  try {
    const proposal = await alice.proposeMessage(message)
    console.log('   ✅ Message proposed!')
    console.log(`   Message Hash: ${proposal.messageHash}`)
    console.log(`   Confirmations: ${proposal.confirmations}/${proposal.threshold}`)

    // Bob approves
    logStep(3, 'Bob approves message...')
    const approval = await bob.approveMessage(proposal.messageHash)
    console.log('   ✅ Bob approved!')
    console.log(`   Confirmations: ${approval.confirmations}/${approval.threshold}`)

    // Get message status
    logStep(4, 'Getting message status...')
    const messageData = await alice.getMessage(proposal.messageHash)
    if (messageData) {
      console.log(`   Message: ${messageData.message}`)
      console.log(`   Confirmations: ${messageData.confirmations?.length || 0}`)
      if (messageData.confirmations) {
        console.log('   Signers:')
        messageData.confirmations.forEach(c => {
          console.log(`      - ${c.owner}`)
        })
      }
      if (messageData.preparedSignature) {
        console.log('   Combined signature available: Yes')
        console.log(`   Signature: ${messageData.preparedSignature.slice(0, 50)}...`)
      }
    }

    // Test EOA signing (for comparison)
    logStep(5, 'Testing EOA sign/verify...')
    const eoaSignature = await alice.sign('Test EOA message')
    console.log(`   EOA Signature: ${eoaSignature.slice(0, 50)}...`)

    const isValid = await alice.verify('Test EOA message', eoaSignature)
    console.log(`   EOA Verify: ${isValid ? '✅ Valid' : '❌ Invalid'}`)
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    if (error.stack) console.log(error.stack)
  }

  alice.dispose()
  bob.dispose()
  console.log('\n✅ Test completed!')
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n🚀 WDK Protocol Multisig Safe - Sepolia Tests\n')

  validateEnv()

  const testName = process.argv[2]?.toLowerCase()

  const tests = {
    create: testCreateNewSafe,
    import: testImportExistingSafe,
    readonly: testReadOnlyAccount,
    multisig: testMultisigFlow,
    addowner: testAddOwner,
    removeowner: testRemoveOwner,
    swapowner: testSwapOwner,
    threshold: testChangeThreshold,
    updateowners: testUpdateOwners,
    pending: testListPending,
    execute: testExecutePending,
    sendtx: testSendTransaction,
    transfer: testTransfer,
    message: testMessageSigning
  }

  if (testName && tests[testName]) {
    try {
      await tests[testName]()
    } catch (error) {
      console.error('\n❌ Test failed:', error)
    }
  } else {
    console.log('Available tests:')
    console.log('  node test-sepolia.js create       - Create new Safe')
    console.log('  node test-sepolia.js import       - Import existing Safe')
    console.log('  node test-sepolia.js readonly     - Test read-only account')
    console.log('  node test-sepolia.js multisig     - Full multisig flow')
    console.log('  node test-sepolia.js addowner     - Test addOwner')
    console.log('  node test-sepolia.js removeowner  - Test removeOwner')
    console.log('  node test-sepolia.js swapowner    - Test swapOwner')
    console.log('  node test-sepolia.js threshold    - Test changeThreshold')
    console.log('  node test-sepolia.js updateowners - Test updateOwners (batch)')
    console.log('  node test-sepolia.js pending      - List pending operations')
    console.log('  node test-sepolia.js execute <hash> - Execute pending operation')
    console.log('  node test-sepolia.js sendtx       - Test sendTransaction')
    console.log('  node test-sepolia.js transfer     - Test transfer')
    console.log('  node test-sepolia.js message      - Test proposeMessage/approveMessage')

    if (testName) {
      console.log(`\n❌ Unknown test: ${testName}`)
    }
  }
}

main()