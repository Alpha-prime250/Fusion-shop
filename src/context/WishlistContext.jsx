import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from './AuthContext';
import { useNotifier } from './NotificationProvider';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { notify } = useNotifier();
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistIds(new Set());
      setLoaded(true);
      return;
    }
    try {
      const { data } = await apiClient.get('wishlist');
      setWishlistIds(new Set(data.map(p => String(p._id))));
    } catch (err) {
      // silently ignore — wishlist is a non-critical enhancement
    } finally {
      setLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async productId => {
      if (!isAuthenticated) {
        notify({ severity: 'info', message: 'Log in to save items to your wishlist.' });
        return;
      }
      const id = String(productId);
      const isSaved = wishlistIds.has(id);
      try {
        if (isSaved) {
          await apiClient.delete(`wishlist/${id}`);
          setWishlistIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          notify({ severity: 'info', message: 'Removed from wishlist.' });
        } else {
          await apiClient.post(`wishlist/${id}`);
          setWishlistIds(prev => new Set(prev).add(id));
          notify({ severity: 'success', message: 'Added to wishlist!' });
        }
      } catch (err) {
        notify({ severity: 'error', message: 'Unable to update wishlist right now.' });
      }
    },
    [isAuthenticated, wishlistIds, notify]
  );

  const isWishlisted = useCallback(productId => wishlistIds.has(String(productId)), [wishlistIds]);

  return <WishlistContext.Provider value={{ loaded, isWishlisted, toggle, refresh }}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return ctx;
}
