import express from 'express';
import cors from 'cors';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

const OPERATOR_KEY     = process.env.OPERATOR_PRIVATE_KEY || '0xa7db0893b5433f384c92669e3d54b7106e069a8d3cff415ee31affebdfa6b0bc';
const DEFAULT_CONTRACT = process.env.CONTRACT_ADDRESS || '0x8df22de95077A47E85f3Cc0c6245A59eB9CcdCbC';
const PORT             = process.env.PORT || 3004;

const app = express();
app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.options('*', cors());
app.use(express.json());

let client = null;
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

async function callContract(contractAddress, functionName, args = []) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`📝 ${functionName} (attempt ${attempt})`);
      const txHash = await client.writeContract({
        address: contractAddress, functionName, args, value: 0n, leaderOnly: true,
      });
      console.log('⏳ Waiting...', txHash);
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash, status: TransactionStatus.ACCEPTED, retries: 30, interval: 3000,
      });
      console.log('✅ Done:', functionName);
      return receipt;
    } catch(err) {
      console.log(`Attempt ${attempt} failed: ${err.message.slice(0,80)}`);
      if (attempt < 3) await sleep(4000);
      else throw err;
    }
  }
}

function extractResult(receipt) {
  try {
    const lr = receipt?.consensus_data?.leader_receipt?.[0];

    const readable = lr?.result?.payload?.readable;
    if (readable) {
      console.log('📦 readable raw:', String(readable).slice(0, 200));
      let str = readable;
      if (typeof str === 'string' && str.startsWith('"') && str.endsWith('"')) str = str.slice(1,-1);
      str = str.replace(/\\"/g, '"').replace(/\\n/g, '').replace(/\\t/g, '');
      try { const r = JSON.parse(str); console.log('✅ Parsed from readable'); return r; } catch(e) {}
      try { return JSON.parse(readable); } catch(e) {}
    }

    const stdout = lr?.genvm_result?.stdout;
    if (stdout?.trim()) {
      try { return JSON.parse(stdout.trim()); } catch(e) {}
    }

    const eq = lr?.eq_outputs;
    if (eq && Object.keys(eq).length > 0) {
      try { return JSON.parse(Object.values(eq)[0]); } catch(e) {}
    }

    console.log('⚠️ Full lr keys:', Object.keys(lr || {}));
    console.log('⚠️ lr.result:', JSON.stringify(lr?.result)?.slice(0, 200));
    return null;
  } catch(e) { return null; }
}

app.get('/health', (req, res) => {
  res.json({ status: 'alive', service: 'GenLayer Social Verifier', port: PORT });
});

app.post('/api/verify/twitter', async (req, res) => {
  const { contract, username, wallet } = req.body;
  const ca = contract || DEFAULT_CONTRACT;
  console.log('🐦 verify_twitter(' + username + ', ' + wallet.slice(0,10) + '...)');
  try {
    const receipt = await callContract(ca, 'verify_twitter', [username, wallet]);
    const data    = extractResult(receipt);
    if (data) return res.json({ success: true, data });
    res.json({ success: false, error: 'Could not parse result' });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/verify/github', async (req, res) => {
  const { contract, username, wallet } = req.body;
  const ca = contract || DEFAULT_CONTRACT;
  console.log('🐙 verify_github(' + username + ', ' + wallet.slice(0,10) + '...)');
  try {
    const receipt = await callContract(ca, 'verify_github', [username, wallet]);
    const data    = extractResult(receipt);
    if (data) return res.json({ success: true, data });
    res.json({ success: false, error: 'Could not parse result' });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/verify/farcaster', async (req, res) => {
  const { contract, username, wallet } = req.body;
  const ca = contract || DEFAULT_CONTRACT;
  console.log('🟣 verify_farcaster(' + username + ', ' + wallet.slice(0,10) + '...)');
  try {
    const receipt = await callContract(ca, 'verify_farcaster', [username, wallet]);
    const data    = extractResult(receipt);
    if (data) return res.json({ success: true, data });
    res.json({ success: false, error: 'Could not parse result' });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

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
if (!ok) { process.exit(1); }
app.listen(PORT, () => {
  console.log('✅ Social Verifier Backend running on port', PORT);
  console.log('📌 Health: http://localhost:' + PORT + '/health');
  console.log('💡 Deploy social_verifier.py to GenLayer Studio first!');
});