import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'testnetsim_pricing_tier';

export function usePricingTier() {
  const [currentTier, setCurrentTier] = useState(null);
  const [reportsRemaining, setReportsRemaining] = useState(0);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Load tier from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setCurrentTier(data);
        setReportsRemaining(data.reportsRemaining || 0);
      } catch (e) {
        console.error('Failed to load pricing tier:', e);
      }
    }
  }, []);

  // Save tier to localStorage when it changes
  useEffect(() => {
    if (currentTier) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...currentTier, reportsRemaining }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentTier, reportsRemaining]);

  const selectTier = useCallback((tierData) => {
    setCurrentTier(tierData);
    setReportsRemaining(tierData.reportsRemaining || 0);
  }, []);

  const deductReport = useCallback(() => {
    if (reportsRemaining > 0) {
      setReportsRemaining(prev => prev - 1);
      return true;
    }
    return false;
  }, [reportsRemaining]);

  const resetTier = useCallback(() => {
    setCurrentTier(null);
    setReportsRemaining(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const openPricingModal = useCallback(() => {
    setShowPricingModal(true);
  }, []);

  const closePricingModal = useCallback(() => {
    setShowPricingModal(false);
  }, []);

  // Check if current tier is paid and provides active abilities
  const isPaid = useCallback(() => {
    if (!currentTier?.tier) return false;
    // Enterprise/Advanced might have infinite reports (like say -1 or just check tier level)
    if (currentTier.tier.reports === 'Unlimited') return true;
    return reportsRemaining > 0;
  }, [currentTier, reportsRemaining]);

  // Get current wallet limit
  const getWalletLimit = useCallback(() => {
    if (!isPaid()) {
      return 10; // FREE tier is strictly 10
    }
    return currentTier.tier.wallets;
  }, [currentTier, isPaid]);

  // Check if wallet count exceeds limit
  const canUseWallets = useCallback((count) => {
    const limit = getWalletLimit();
    return count <= limit;
  }, [getWalletLimit]);

  const allowedPatterns = useCallback(() => {
    if (!isPaid()) {
      return ['random'];
    }
    return ['random', 'slowDrip', 'burst', 'spike'];
  }, [isPaid]);

  return {
    currentTier,
    reportsRemaining,
    showPricingModal,
    selectTier,
    resetTier,
    openPricingModal,
    closePricingModal,
    getWalletLimit,
    canUseWallets,
    allowedPatterns,
    isPaid,
    deductReport
  };
}
