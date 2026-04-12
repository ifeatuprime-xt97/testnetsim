import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'testnetsim_pricing_tier';

export function usePricingTier() {
  const [currentTier, setCurrentTier] = useState(null);
  const [activeUntil, setActiveUntil] = useState(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Load tier from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setCurrentTier(data);
        setActiveUntil(data.expiresAt);
      } catch (e) {
        console.error('Failed to load pricing tier:', e);
      }
    }
  }, []);

  // Check if tier has expired
  useEffect(() => {
    if (activeUntil && activeUntil < Date.now()) {
      // Tier expired, reset to free
      setCurrentTier(null);
      setActiveUntil(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeUntil]);

  // Save tier to localStorage when it changes
  useEffect(() => {
    if (currentTier) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTier));
    }
  }, [currentTier]);

  const selectTier = useCallback((tierData) => {
    setCurrentTier(tierData);
    setActiveUntil(tierData.expiresAt);
  }, []);

  const resetTier = useCallback(() => {
    setCurrentTier(null);
    setActiveUntil(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const openPricingModal = useCallback(() => {
    setShowPricingModal(true);
  }, []);

  const closePricingModal = useCallback(() => {
    setShowPricingModal(false);
  }, []);

  // Get current wallet limit
  const getWalletLimit = useCallback(() => {
    if (!currentTier?.tier) {
      return Number(import.meta.env.VITE_FREE_TIER_WALLETS || 100);
    }
    return currentTier.tier.wallets;
  }, [currentTier]);

  // Check if wallet count exceeds limit
  const canUseWallets = useCallback((count) => {
    const limit = getWalletLimit();
    return count <= limit;
  }, [getWalletLimit]);

  // Get remaining time in hours
  const getRemainingTime = useCallback(() => {
    if (!activeUntil) return null;
    const remaining = activeUntil - Date.now();
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / (60 * 60 * 1000));
  }, [activeUntil]);

  // Check if current tier is paid
  const isPaidTier = useCallback(() => {
    return currentTier?.tier?.price > 0 && activeUntil && activeUntil > Date.now();
  }, [currentTier, activeUntil]);

  return {
    currentTier,
    activeUntil,
    showPricingModal,
    selectTier,
    resetTier,
    openPricingModal,
    closePricingModal,
    getWalletLimit,
    canUseWallets,
    getRemainingTime,
    isPaidTier,
  };
}
