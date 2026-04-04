import React, { useState, useEffect } from 'react';
import { verifyETHPayment, verifySOLPayment } from '../utils/paymentVerification.js';

const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    priceETH: 0,
    priceSOL: 0,
    wallets: Number(import.meta.env.VITE_FREE_TIER_WALLETS || 5),
    duration: 'Unlimited',
    description: 'Perfect for testing the waters',
    features: [
      'Up to 5 wallets',
      'Basic simulation',
      'Testnet only',
      'No time limit',
    ],
    highlighted: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    priceETH: Number(import.meta.env.VITE_BASIC_TIER_PRICE_ETH || 0.05),
    priceSOL: Number(import.meta.env.VITE_BASIC_TIER_PRICE_SOL || 3),
    wallets: Number(import.meta.env.VITE_BASIC_TIER_WALLETS || 100),
    duration: `${Number(import.meta.env.VITE_BASIC_TIER_DURATION || 24)} hours`,
    description: 'For serious token creators',
    features: [
      'Up to 100 wallets',
      '1 simulation session',
      'Live testnet execution',
      '24-hour access',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceETH: Number(import.meta.env.VITE_PRO_TIER_PRICE_ETH || 0.12),
    priceSOL: Number(import.meta.env.VITE_PRO_TIER_PRICE_SOL || 8),
    wallets: Number(import.meta.env.VITE_PRO_TIER_WALLETS || 10000),
    duration: `${Number(import.meta.env.VITE_PRO_TIER_DURATION || 24)} hours`,
    description: 'Unlimited power testing',
    features: [
      'Unlimited wallets (up to 10,000)',
      'Unlimited simulations',
      'Live testnet execution',
      '24-hour access',
      'Advanced analytics',
      'Priority support',
    ],
    highlighted: false,
  },
];

export default function PricingModal({ isOpen, onClose, onSelectTier, currentTier, activeUntil }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('ETH'); // 'ETH' or 'SOL'
  const [paymentSent, setPaymentSent] = useState(false);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTier(null);
      setIsProcessing(false);
      setPaymentMethod('ETH');
      setPaymentSent(false);
      setTxHash('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (tier) => {
    setSelectedTier(tier.id);
  };

  const handleConfirm = async () => {
    if (!selectedTier) return;
    
    const tier = PRICING_TIERS.find(t => t.id === selectedTier);
    
    if (tier.priceETH > 0 && !paymentSent) {
      // Payment not yet verified - show payment instructions
      return;
    }

    setIsProcessing(true);

    // Verify payment on blockchain
    if (tier.priceETH > 0 && txHash) {
      const paymentAddress = getPaymentAddress();
      const expectedAmount = getTierPrice(tier);
      
      let verificationResult;
      if (paymentMethod === 'ETH') {
        verificationResult = await verifyETHPayment(txHash, paymentAddress, expectedAmount);
      } else {
        verificationResult = await verifySOLPayment(txHash, paymentAddress, expectedAmount);
      }

      if (!verificationResult.verified) {
        setIsProcessing(false);
        alert(`Payment verification failed: ${verificationResult.error || 'Unknown error'}`);
        return;
      }
    }

    const expiresAt = tier.priceETH > 0
      ? Date.now() + (tier.duration !== 'Unlimited' ? parseInt(tier.duration) * 60 * 60 * 1000 : null)
      : null;

    onSelectTier({
      tierId: selectedTier,
      tier,
      expiresAt,
      activatedAt: Date.now(),
      paymentMethod: tier.priceETH > 0 ? paymentMethod : null,
      txHash: tier.priceETH > 0 ? txHash : null,
      paymentVerified: tier.priceETH > 0,
    });

    setIsProcessing(false);
    onClose();
  };

  const isCurrentTierActive = currentTier && currentTier.tierId !== 'free' && activeUntil && activeUntil > Date.now();

  const getPaymentAddress = () => {
    if (paymentMethod === 'ETH') {
      return import.meta.env.VITE_PAYMENT_WALLET_ETH || '0x0000000000000000000000000000000000000000';
    }
    return import.meta.env.VITE_PAYMENT_WALLET_SOL || '0000000000000000000000000000000000000000000000000000000000000000';
  };

  const getTierPrice = (tier) => {
    if (paymentMethod === 'ETH') return tier.priceETH;
    return tier.priceSOL;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-theme-elevated border border-theme-subtle rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-theme-elevated/95 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">
              {isCurrentTierActive ? 'Upgrade Your Plan' : 'Choose Your Testing Plan'}
            </h2>
            <p className="text-xs text-theme-secondary mt-0.5">
              {isCurrentTierActive 
                ? `Current plan: ${currentTier.tier.name} (expires in ${Math.ceil((activeUntil - Date.now()) / (60 * 60 * 1000))}h)`
                : 'Select a tier to unlock live testing features'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-theme-secondary hover:text-theme-primary transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Active Plan Notice */}
          {isCurrentTierActive && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">✓</span>
                <span>
                  You currently have <strong>{currentTier.tier.name}</strong> plan active.
                  Choose a higher tier to upgrade.
                </span>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {PRICING_TIERS.map((tier) => {
              const isSelected = selectedTier === tier.id;
              const isCurrent = currentTier?.tierId === tier.id && isCurrentTierActive;
              const isDisabled = isCurrent;

              return (
                <div
                  key={tier.id}
                  className={`relative rounded-xl border-2 p-5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                      : isCurrent
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-theme-subtle bg-theme-base hover:border-theme-secondary'
                  } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={() => !isDisabled && handleSelect(tier)}
                >
                  {/* Popular Badge */}
                  {tier.highlighted && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-500 text-white rounded-full">
                      Most Popular
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full">
                      Current Plan
                    </div>
                  )}

                  {/* Tier Name */}
                  <h3 className="text-sm font-semibold text-theme-primary uppercase tracking-wider">
                    {tier.name}
                  </h3>

                  {/* Price */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-theme-primary">
                        {tier.priceETH > 0 ? `${tier.priceETH} ETH` : 'Free'}
                      </span>
                    </div>
                    {tier.priceETH > 0 && (
                      <div className="text-xs text-theme-secondary">
                        or {tier.priceSOL} SOL · {tier.duration}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-2 text-xs text-theme-secondary">
                    {tier.description}
                  </p>

                  {/* Wallet Limit */}
                  <div className="mt-3 px-3 py-2 rounded-lg bg-theme-elevated border border-theme-subtle">
                    <div className="text-xs text-theme-secondary">Wallet Limit</div>
                    <div className="text-sm font-semibold text-theme-primary">
                      {tier.wallets >= 10000 ? 'Unlimited' : `Up to ${tier.wallets}`}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mt-4 space-y-2">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-theme-secondary">
                        <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected || isCurrent ? 'bg-indigo-500 text-white' : 'bg-theme-subtle text-theme-secondary'
                        }`}>
                          ✓
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Selection Indicator */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-theme-subtle'
                    }`}>
                      {isSelected && <span className="text-white text-[8px]">✓</span>}
                    </div>
                    {isCurrent && (
                      <span className="text-xs text-emerald-500 font-medium">Active</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Instructions */}
          {selectedTier && selectedTier !== 'free' && (
            <div className="mb-6 space-y-4">
              {/* Payment Method Selection */}
              <div className="p-4 rounded-xl bg-theme-base border border-theme-subtle">
                <h4 className="text-sm font-semibold text-theme-primary mb-3">Select Payment Method</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentMethod('ETH')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'ETH'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-theme-subtle bg-theme-elevated text-theme-secondary hover:border-theme-secondary'
                    }`}
                  >
                    <span className="text-xl">⟦</span>
                    <span className="font-semibold">Ethereum (ETH)</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('SOL')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'SOL'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-theme-subtle bg-theme-elevated text-theme-secondary hover:border-theme-secondary'
                    }`}
                  >
                    <span className="text-xl">◎</span>
                    <span className="font-semibold">Solana (SOL)</span>
                  </button>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                  <span>💳</span> Send Payment
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-theme-secondary">
                    <span>Amount:</span>
                    <span className="text-theme-primary font-mono font-semibold text-sm">
                      {getTierPrice(PRICING_TIERS.find(t => t.id === selectedTier))} {paymentMethod}
                    </span>
                  </div>
                  
                  <div>
                    <div className="text-theme-secondary mb-1">Send to wallet:</div>
                    <div className="flex items-center gap-2 bg-theme-elevated px-3 py-2 rounded-lg border border-theme-subtle">
                      <code className="text-xs font-mono text-theme-primary flex-1 truncate">
                        {getPaymentAddress()}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getPaymentAddress());
                        }}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors text-xs font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {!paymentSent && (
                    <>
                      <div className="text-amber-400 text-[10px] mt-2">
                        ⚠ After sending, enter the transaction hash below for verification
                      </div>
                      <input
                        type="text"
                        placeholder={`Enter ${paymentMethod} transaction hash`}
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value.trim())}
                        className="w-full input-field font-mono text-xs"
                      />
                      <button
                        onClick={() => setPaymentSent(true)}
                        disabled={!txHash}
                        className={`w-full mt-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                          txHash
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-theme-subtle text-theme-secondary cursor-not-allowed'
                        }`}
                      >
                        ✓ I've Sent the Payment
                      </button>
                    </>
                  )}

                  {paymentSent && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span>Payment submitted for verification</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Important Notice */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2 text-xs text-amber-200">
                  <span className="text-amber-400 flex-shrink-0">⚠</span>
                  <div>
                    <strong>Important:</strong> Only send exact amount shown. Access is granted automatically after blockchain confirmation (typically 1-5 minutes). Keep your transaction hash for reference.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 border-t border-theme-subtle bg-theme-elevated/95 backdrop-blur-xl">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          {selectedTier && (
            <button
              onClick={handleConfirm}
              disabled={isProcessing || (PRICING_TIERS.find(t => t.id === selectedTier).priceETH > 0 && !paymentSent)}
              className={selectedTier === 'free' ? 'btn-success' : 'btn-primary'}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Processing...
                </span>
              ) : selectedTier === 'free' ? (
                'Start Free Testing'
              ) : paymentSent ? (
                `Activate ${PRICING_TIERS.find(t => t.id === selectedTier).name} Plan`
              ) : (
                `Waiting for Payment...`
              )}
            </button>
          )}
          {!selectedTier && (
            <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
              Select a Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
