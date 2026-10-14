import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  IconButton,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useNotifier } from '../../context/NotificationProvider';

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <Box sx={{ py: 3 }}>{children}</Box>;
}

const emptyProduct = { name: '', description: '', price: '', category: '', image: '', brand: '', stock: '' };

function VendorDashboard() {
  const { user } = useAuth();
  const { notify } = useNotifier();
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProduct);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, productsRes, ordersRes] = await Promise.all([
        apiClient.get('vendor/summary'),
        apiClient.get('vendor/products'),
        apiClient.get('vendor/orders'),
      ]);
      setSummary(summaryRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to load vendor data.' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const approved = !!user?.vendorProfile?.approved;

  const openCreateDialog = () => {
    setForm(emptyProduct);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEditDialog = product => {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      brand: product.brand || '',
      stock: product.stock || 0,
    });
    setEditingId(product._id);
    setDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!form.name || !form.description || !form.price || !form.category || !form.image) {
      notify({ severity: 'error', message: 'Name, description, price, category, and image are required.' });
      return;
    }
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) || 0 };
      if (editingId) {
        await apiClient.put(`vendor/products/${editingId}`, payload);
        notify({ severity: 'success', message: 'Product updated.' });
      } else {
        await apiClient.post('vendor/products', payload);
        notify({ severity: 'success', message: 'Product created.' });
      }
      setDialogOpen(false);
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: err.response?.data?.error || 'Failed to save product.' });
    }
  };

  const handleDeleteProduct = async productId => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await apiClient.delete(`vendor/products/${productId}`);
      notify({ severity: 'info', message: 'Product deleted.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to delete product.' });
    }
  };

  if (loading && !summary) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 8, pt: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Vendor Dashboard — {user?.vendorProfile?.storeName || user?.name}
      </Typography>

      {!approved && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your vendor account is pending admin approval. You'll be able to list products once approved.
        </Alert>
      )}

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Products', value: summary.productCount },
            { label: 'Orders', value: summary.orderCount },
            { label: 'Units Sold', value: summary.unitsSold },
            { label: 'Revenue', value: `$${summary.revenue.toFixed(2)}` },
          ].map(stat => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Card elevation={0} sx={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Paper elevation={0} sx={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label={`My Products (${products.length})`} />
          <Tab label={`My Orders (${orders.length})`} />
        </Tabs>

        <Box sx={{ px: 2 }}>
          <TabPanel value={tab} index={0}>
            <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ mb: 2 }} onClick={openCreateDialog} disabled={!approved}>
              New Product
            </Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p._id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>${p.price?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={p.stock} color={p.stock > 0 ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEditDialog(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteProduct(p._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>No products yet. Create your first listing!</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Your Items</TableCell>
                  <TableCell>Your Total</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map(o => {
                  const yourTotal = o.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                  const latest = o.statusHistory?.[o.statusHistory.length - 1];
                  return (
                    <TableRow key={o._id}>
                      <TableCell>{o.orderNumber}</TableCell>
                      <TableCell>{o.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}</TableCell>
                      <TableCell>${yourTotal.toFixed(2)}</TableCell>
                      <TableCell>{latest?.label || 'Placed'}</TableCell>
                    </TableRow>
                  );
                })}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>No orders yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabPanel>
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit Product' : 'New Product'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} fullWidth />
            <TextField
              label="Description"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField label="Price" type="number" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} fullWidth />
            <TextField label="Category" value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} fullWidth />
            <TextField label="Image URL" value={form.image} onChange={e => setForm(prev => ({ ...prev, image: e.target.value }))} fullWidth />
            <TextField label="Brand" value={form.brand} onChange={e => setForm(prev => ({ ...prev, brand: e.target.value }))} fullWidth />
            <TextField label="Stock" type="number" value={form.stock} onChange={e => setForm(prev => ({ ...prev, stock: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProduct}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default VendorDashboard;
