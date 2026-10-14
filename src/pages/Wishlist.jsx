import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Alert, CircularProgress, Box, Paper } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useNotifier } from '../context/NotificationProvider';
import ProductCard from '../components/ProductCard';

function Wishlist({ addToCart }) {
  const { isAuthenticated } = useAuth();
  const { notify } = useNotifier();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await apiClient.get('wishlist');
        if (active) setItems(data);
      } catch (err) {
        if (active) setError('Unable to load your wishlist right now.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleRemove = async productId => {
    try {
      const { data } = await apiClient.delete(`wishlist/${productId}`);
      setItems(data);
      notify({ severity: 'info', message: 'Removed from wishlist.' });
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to remove item.' });
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 6 }}>
        <Alert severity="info">Please log in to view your wishlist.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 4 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, mb: 4, background: 'linear-gradient(120deg, rgba(245,0,87,0.08) 0%, rgba(63,81,181,0.06) 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FavoriteIcon color="secondary" fontSize="large" />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Your Wishlist
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Items you've saved for later.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && items.length === 0 && <Alert severity="info">Your wishlist is empty. Browse the shop and tap the heart icon to save items here.</Alert>}

      <Grid container spacing={3}>
        {items.map(product => (
          <Grid item key={product._id} xs={12} sm={6} md={4}>
            <ProductCard product={{ ...product, id: product._id }} addToCart={addToCart} onRemoveFromWishlist={() => handleRemove(product._id)} isWishlisted />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default Wishlist;
