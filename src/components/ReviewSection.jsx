import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Rating,
  TextField,
  Button,
  Stack,
  Divider,
  Avatar,
  Alert,
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useNotifier } from '../context/NotificationProvider';

function ReviewSection({ productId }) {
  const { isAuthenticated, user } = useAuth();
  const { notify } = useNotifier();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`reviews/product/${productId}`);
      setReviews(data);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const myReview = reviews.find(r => user && r.user === user._id);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!rating) {
      notify({ severity: 'error', message: 'Please select a star rating.' });
      return;
    }
    if (!comment.trim()) {
      notify({ severity: 'error', message: 'Please write a comment.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`reviews/product/${productId}`, { rating, title, comment });
      notify({ severity: 'success', message: 'Thanks for your review!' });
      setRating(0);
      setTitle('');
      setComment('');
      loadReviews();
    } catch (err) {
      notify({ severity: 'error', message: err.response?.data?.error || 'Failed to submit review.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async reviewId => {
    try {
      await apiClient.delete(`reviews/${reviewId}`);
      notify({ severity: 'info', message: 'Review deleted.' });
      loadReviews();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to delete review.' });
    }
  };

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Customer Reviews
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Rating value={avgRating} precision={0.1} readOnly />
        <Typography variant="body2" color="text.secondary">
          {avgRating.toFixed(1)} out of 5 ({reviews.length} review{reviews.length === 1 ? '' : 's'})
        </Typography>
      </Stack>

      {isAuthenticated && !myReview && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Write a review
          </Typography>
          <form onSubmit={handleSubmit}>
            <Rating value={rating} onChange={(_e, v) => setRating(v)} sx={{ mb: 1.5 }} />
            <TextField label="Title (optional)" fullWidth size="small" sx={{ mb: 1.5 }} value={title} onChange={e => setTitle(e.target.value)} />
            <TextField
              label="Your review"
              fullWidth
              multiline
              minRows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              sx={{ mb: 1.5 }}
            />
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </Button>
          </form>
        </Paper>
      )}

      {!isAuthenticated && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <a href="/login">Log in</a> to write a review.
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : reviews.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No reviews yet. Be the first to share your thoughts!
        </Typography>
      ) : (
        <Stack spacing={2.5} divider={<Divider />}>
          {reviews.map(review => (
            <Box key={review._id}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar sx={{ bgcolor: 'primary.main' }}>{review.userName?.charAt(0)?.toUpperCase() || '?'}</Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={700}>
                      {review.userName}
                    </Typography>
                    {review.verifiedPurchase && <Chip size="small" icon={<VerifiedIcon />} label="Verified Purchase" color="success" variant="outlined" />}
                  </Stack>
                  <Rating value={review.rating} readOnly size="small" sx={{ my: 0.5 }} />
                  {review.title && (
                    <Typography variant="body2" fontWeight={600}>
                      {review.title}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {review.comment}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Typography>
                  {user && (review.user === user._id || user.role === 'admin') && (
                    <Box sx={{ mt: 0.5 }}>
                      <Button size="small" color="error" onClick={() => handleDelete(review._id)}>
                        Delete
                      </Button>
                    </Box>
                  )}
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default ReviewSection;
