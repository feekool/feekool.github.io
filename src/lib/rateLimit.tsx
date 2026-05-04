import React, { createContext, useContext, useState, useEffect } from 'react';
import { RateLimitModal } from '../components/RateLimitModal';
import { setRateLimitModalCallback } from './apiErrorHandler';

interface RateLimitContextType {
  showRateLimitModal: () => void;
  hideRateLimitModal: () => void;
}

const RateLimitContext = createContext<RateLimitContextType | null>(null);

export function RateLimitProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showRateLimitModal = () => setIsModalOpen(true);
  const hideRateLimitModal = () => setIsModalOpen(false);

  // Set the callback for API error handler
  useEffect(() => {
    setRateLimitModalCallback(showRateLimitModal);
  }, []);

  return (
    <RateLimitContext.Provider value={{ showRateLimitModal, hideRateLimitModal }}>
      {children}
      <RateLimitModal isOpen={isModalOpen} onClose={hideRateLimitModal} />
    </RateLimitContext.Provider>
  );
}

export const useRateLimit = () => {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within RateLimitProvider');
  }
  return context;
};