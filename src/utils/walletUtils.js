import { ethers } from 'ethers';
import nacl from 'tweetnacl';

// ── Base58 encoder (Solana address format, no Buffer needed) ─────────────────
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function toBase58(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += '1';
  for (let i = digits.length - 1; i >= 0; i--) result += BASE58_CHARS[digits[i]];
  return result;
}

// ── EVM wallet generation (ethers.js secp256k1) ───────────────────────────────
function generateEvmWallets(count) {
  const wallets = [];
  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom();
    wallets.push({
      id: i + 1,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase ?? null,
      balance: '0',
      txCount: 0,
      isSolana: false,
    });
  }
  return wallets;
}

// ── Solana wallet generation (tweetnacl ed25519 keypairs) ────────────────────
function generateSolanaWallets(count) {
  const wallets = [];
  for (let i = 0; i < count; i++) {
    const keypair = nacl.sign.keyPair();
    wallets.push({
      id: i + 1,
      address: toBase58(keypair.publicKey),     // 32-byte public key → base58
      privateKey: toBase58(keypair.secretKey),  // 64-byte secret → base58 (Phantom-compatible)
      mnemonic: null,
      balance: '0',
      txCount: 0,
      isSolana: true,
    });
  }
  return wallets;
}

// ── Unified generator — picks the right strategy from network config ──────────
export function generateWallets(count, network) {
  return network?.isSolana
    ? generateSolanaWallets(count)
    : generateEvmWallets(count);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function shortAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function isValidEvmAddress(addr) {
  try {
    ethers.getAddress(addr);
    return true;
  } catch {
    return false;
  }
}

export function walletsToCSV(wallets) {
  const header = 'id,address,privateKey,mnemonic';
  const rows = wallets.map(w =>
    `${w.id},"${w.address}","${w.privateKey}","${w.mnemonic ?? ''}"`
  );
  return [header, ...rows].join('\n');
}

export function walletsToJSON(wallets) {
  return JSON.stringify(wallets, null, 2);
}

export function exportWalletsAsCSV(wallets) {
  if (!wallets || wallets.length === 0) return;
  const csvStr = walletsToCSV(wallets);
  const blob = new Blob([csvStr], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `testnet_bots_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
