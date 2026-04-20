import React, { useState, useEffect } from 'react';
import { verifyETHPayment, verifySOLPayment } from '../utils/paymentVerification.js';

const BASE_TIERS = [
  {
    id: 'free',
    name: 'Preview',
    priceUSD: 0,
    wallets: 10,
    reports: 0,
    description: 'Preview the readiness UI',
    features: [
      'Up to 10 wallets',
      'Preview failure limits',
      'No stress patterns',
    ],
    highlighted: false,
  },
  {
    id: 'single',
    name: 'Single Report',
    priceUSD: 10,
    wallets: 100,
    reports: 1,
    description: 'Full analysis unlocked',
    features: [
      'Up to 100 wallets',
      '1 Full Report',
      'All insights',
    ],
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    priceUSD: 25,
    wallets: 1000,
    reports: 5,
    description: 'Bundle of reports',
    features: [
      'Up to 1,000 wallets',
      '5 Full Reports',
      'All stress patterns',
    ],
    highlighted: true,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    priceUSD: 50,
    wallets: 50000,
    reports: 'Unlimited',
    description: 'Maximum testing depth',
    features: [
      'Up to 50,000 wallets',
      'Unlimited Reports',
      'Stress Testing Load',
      'Priority Support',
    ],
    highlighted: false,
  },
];

export default function PricingModal({ isOpen, onClose, onSelectTier, currentTier, reportsRemaining }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('ETH'); // 'ETH' or 'SOL'
  const [paymentSent, setPaymentSent] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [cryptoQuotes, setCryptoQuotes] = useState({ ETH: null, SOL: null });
  const [advancedWallets, setAdvancedWallets] = useState(50000);

  useEffect(() => {
    if (isOpen && !cryptoQuotes.ETH) {
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana&vs_currencies=usd')
        .then(res => res.json())
        .then(data => {
            setCryptoQuotes({
               ETH: data.ethereum.usd,
               SOL: data.solana.usd
            });
        })
        .catch(err => {
            console.error("Failed to fetch crypto prices", err);
            setCryptoQuotes({ ETH: 3500, SOL: 150 });
        });
    }
  }, [isOpen]);

  const pricingTiers = BASE_TIERS.map(tier => {
      let currentPriceUSD = tier.priceUSD;
      let currentWallets = tier.wallets;
      
      if (tier.id === 'advanced') {
          currentWallets = advancedWallets;
          // minimum $50, scale at $0.001 per wallet
          currentPriceUSD = Math.max(50, advancedWallets * 0.001);
      }

      const priceETH = currentPriceUSD > 0 && cryptoQuotes.ETH ? parseFloat((currentPriceUSD / cryptoQuotes.ETH).toFixed(4)) : 0;
      const priceSOL = currentPriceUSD > 0 && cryptoQuotes.SOL ? parseFloat((currentPriceUSD / cryptoQuotes.SOL).toFixed(2)) : 0;
      return { ...tier, priceUSD: currentPriceUSD, wallets: currentWallets, priceETH, priceSOL };
  });

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

  // Auto-polling verification logic
  useEffect(() => {
    let interval;
    if (paymentSent && txHash && !isProcessing && selectedTier) {
      interval = setInterval(async () => {
        const tier = pricingTiers.find(t => t.id === selectedTier);
        if (!tier || tier.priceUSD === 0) return;
        
        const expectedAmount = getTierPrice(tier);
        const paymentAddress = getPaymentAddress();
        
        let verificationResult;
        try {
          if (paymentMethod === 'ETH') {
            verificationResult = await verifyETHPayment(txHash, paymentAddress, expectedAmount);
          } else {
            verificationResult = await verifySOLPayment(txHash, paymentAddress, expectedAmount);
          }
        } catch (e) {
          console.error(e);
        }

        if (verificationResult?.verified) {
          clearInterval(interval);
          handleConfirm(true); // unlock automatically
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [paymentSent, txHash, isProcessing, selectedTier, paymentMethod, pricingTiers]);

  const handleConfirm = async (skipVerification = false) => {
    if (!selectedTier) return;
    
    const tier = pricingTiers.find(t => t.id === selectedTier);
    
    if (tier.priceETH > 0 && !paymentSent && !skipVerification) {
      return;
    }

    setIsProcessing(true);

    if (tier.priceETH > 0 && txHash && !skipVerification) {
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

    const newReports = tier.reports === 'Unlimited' ? 'Unlimited' : (reportsRemaining + tier.reports);

    onSelectTier({
      tierId: selectedTier,
      tier,
      reportsRemaining: newReports,
      activatedAt: Date.now(),
      paymentMethod: tier.priceETH > 0 ? paymentMethod : null,
      txHash: tier.priceETH > 0 ? txHash : null,
      paymentVerified: tier.priceETH > 0,
    });

    setIsProcessing(false);
    onClose();
  };

  const isCurrentTierActive = currentTier && currentTier.tierId !== 'free' && (reportsRemaining > 0 || reportsRemaining === 'Unlimited');

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
                ? `Current plan: ${currentTier.tier.name} (${reportsRemaining} reports remaining)`
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {pricingTiers.map((tier) => {
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
                       {tier.priceUSD > 0 ? (
                           <>
                             <span className="text-2xl font-bold text-theme-primary">
                               ${tier.priceUSD}{tier.id === 'advanced' ? '+' : ''}
                             </span>
                             <span className="text-xs text-theme-secondary font-mono mt-1">({tier.priceETH} ETH)</span>
                           </>
                       ) : (
                           <span className="text-2xl font-bold text-theme-primary">Free</span>
                       )}
                    </div>
                    {tier.priceUSD > 0 && (
                      <div className="text-[10px] text-theme-secondary font-mono">
                        or {tier.priceSOL} SOL · {tier.reports} Report{tier.reports > 1 || tier.reports === 'Unlimited' ? 's' : ''}
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
                    
                    {tier.id === 'advanced' ? (
                      <div className="flex items-center mt-1">
                        <input
                           type="number"
                           className="input-field py-1 text-sm font-semibold w-full text-theme-primary bg-theme-base"
                           min={10000}
                           max={1000000}
                           step={1000}
                           value={advancedWallets}
                           onChange={(e) => setAdvancedWallets(parseInt(e.target.value) || 0)}
                           onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-theme-primary">
                        {tier.wallets >= 50000 ? 'Unlimited' : `Up to ${tier.wallets}`}
                      </div>
                    )}
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
                      {getTierPrice(pricingTiers.find(t => t.id === selectedTier))} {paymentMethod}
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
              disabled={isProcessing || (pricingTiers.find(t => t.id === selectedTier).priceETH > 0 && !paymentSent)}
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
                `Activate ${pricingTiers.find(t => t.id === selectedTier).name} Plan`
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

