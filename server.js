import express from 'express';
import cors from 'cors';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const OPERATOR_KEY     = process.env.OPERATOR_PRIVATE_KEY || '0xa7db0893b5433f384c92669e3d54b7106e069a8d3cff415ee31affebdfa6b0bc';
const DEFAULT_CONTRACT = process.env.CONTRACT_ADDRESS || '';
const PORT             = process.env.PORT || 3004;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

let client  = null;
let account = null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function initializeClient() {
  try {
    account = createAccount(OPERATOR_KEY);
    client  = createClient({ chain: studionet, account });
    await client.initializeConsensusSmartContract();
    console.log('✅ Connected! Operator:', account.address);
    return true;
  } catch(err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

async function waitForTx(hash, label) {
  const MAX = 24;
  for (let i = 0; i < MAX; i++) {
    await sleep(5000);
    try {
      const receipt = await client.waitForTransactionReceipt({ hash, retries: 1 });
      if (receipt) {
        console.log('✅ Done:', label);
        const raw = JSON.stringify(receipt);
        const match = raw.match(/"(\{[^"]*"success"[^"]*\})"/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1].replace(/\\"/g, '"').replace(/\\n/g, ''));
            console.log('📦 parsed:', JSON.stringify(parsed).substring(0, 120));
            return { success: true, data: parsed };
          } catch(e) {}
        }
        if (receipt.consensus_data) {
          const cd     = receipt.consensus_data;
          const leader = cd.final_used_leader_receipt || cd.leader_receipt;
          if (leader?.execution_result) {
            try {
              const parsed = typeof leader.execution_result === 'string'
                ? JSON.parse(leader.execution_result)
                : leader.execution_result;
              return { success: true, data: parsed };
            } catch(e) {}
          }
        }
        return { success: false, error: 'Finalized but could not parse' };
      }
    } catch(e) {
      if (i < MAX - 1) continue;
    }
  }
  return { success: false, error: 'Timeout' };
}

app.get('/health', (req, res) => {
  res.json({ status: 'alive', service: 'GenLayer Social Verifier', port: PORT });
});

// Verify Twitter/X
app.post('/api/verify/twitter', async (req, res) => {
  const { contract, username, wallet } = req.body;
  const ca = contract || DEFAULT_CONTRACT;
  console.log('🐦 verify_twitter(' + username + ', ' + wallet.slice(0,10) + '...)');
  try {
    const hash = await client.writeContract({
      address: ca, functionName: 'verify_twitter',
      args: [username, wallet], value: 0n,
    });
    console.log('⏳ Waiting...', hash);
    const result = await waitForTx(hash, 'verify_twitter');
    res.json(result);
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

// Verify GitHub
app.post('/api/verify/github', async (req, res) => {
  const { contract, username, wallet } = req.body;
  const ca = contract || DEFAULT_CONTRACT;
  console.log('🐙 verify_github(' + username + ', ' + wallet.slice(0,10) + '...)');
  try {
    const hash = await client.writeContract({
      address: ca, functionName: 'verify_github',
      args: [username, wallet], value: 0n,
    });
    console.log('⏳ Waiting...', hash);
    const result = await waitForTx(hash, 'verify_github');
    res.json(result);
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

// Verify Farcaster
app.post('/api/verify/farcaster', async (req, res) => {
  const { contract, username, wallet } = req.body;
  const ca = contract || DEFAULT_CONTRACT;
  console.log('🟣 verify_farcaster(' + username + ', ' + wallet.slice(0,10) + '...)');
  try {
    const hash = await client.writeContract({
      address: ca, functionName: 'verify_farcaster',
      args: [username, wallet], value: 0n,
    });
    console.log('⏳ Waiting...', hash);
    const result = await waitForTx(hash, 'verify_farcaster');
    res.json(result);
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

// Check existing verification
app.get('/api/check', async (req, res) => {
  const { contract, platform, username, wallet } = req.query;
  const ca = contract || DEFAULT_CONTRACT;
  try {
    const result = await client.readContract({
      address: ca, functionName: 'check_verification',
      args: [platform, username, wallet],
    });
    res.json({ success: true, data: result });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  const { contract } = req.query;
  const ca = contract || DEFAULT_CONTRACT;
  try {
    const result = await client.readContract({
      address: ca, functionName: 'get_stats', args: [],
    });
    res.json({ success: true, data: result });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

const ok = await initializeClient();
if (!ok) { console.error('Failed to connect. Exiting.'); process.exit(1); }
app.listen(PORT, () => {
  console.log('✅ Social Verifier Backend running on port', PORT);
  console.log('📌 Health: http://localhost:' + PORT + '/health');
  console.log('💡 Deploy social_verifier.py to GenLayer Studio first!');
});
