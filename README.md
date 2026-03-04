# 🔐 GenLayer Social Verifier

On-chain social identity verification built on GenLayer. Prove you own a social account AND a wallet — verified by AI consensus.

**Live Demo:** https://social-verifier.netlify.app  
**Contract:** deploy social_verifier.py to GenLayer Studionet  

## Supported Platforms
- Twitter / X — wallet in bio
- GitHub — wallet in profile bio or README
- Farcaster — connected wallets on Warpcast

## How It Works
1. Post your wallet address in your social profile bio
2. Enter your username + wallet on the app
3. GenLayer AI validators check your profile independently
4. Result stored permanently on-chain

## Contract Methods
- `verify_twitter(username, wallet)` — verify Twitter identity
- `verify_github(username, wallet)` — verify GitHub identity  
- `verify_farcaster(username, wallet)` — verify Farcaster identity
- `check_verification(platform, username, wallet)` — read stored verification
- `get_stats()` — oracle statistics

Built for the GenLayer contribution program.
