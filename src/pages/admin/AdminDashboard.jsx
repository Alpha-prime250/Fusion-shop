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
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import AddIcon from '@mui/icons-material/Add';
import { apiClient } from '../../services/apiClient';
import { useNotifier } from '../../context/NotificationProvider';

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <Box sx={{ py: 3 }}>{children}</Box>;
}

function AdminDashboard() {
  const { notify } = useNotifier();
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, usersRes, productsRes, ordersRes, categoriesRes] = await Promise.all([
        apiClient.get('admin/summary'),
        apiClient.get('admin/users'),
        apiClient.get('admin/products'),
        apiClient.get('admin/orders'),
        apiClient.get('categories'),
      ]);
      setSummary(summaryRes.data);
      setUsers(usersRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setCategories(categoriesRes.data);
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to load admin data.' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleApproveVendor = async userId => {
    try {
      await apiClient.put(`admin/users/${userId}/approve-vendor`);
      notify({ severity: 'success', message: 'Vendor approved.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to approve vendor.' });
    }
  };

  const handleToggleStatus = async (userId, isActive) => {
    try {
      await apiClient.put(`admin/users/${userId}/status`, { isActive: !isActive });
      notify({ severity: 'success', message: !isActive ? 'Account reactivated.' : 'Account deactivated.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to update account status.' });
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await apiClient.put(`admin/users/${userId}/role`, { role });
      notify({ severity: 'success', message: 'Role updated.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to update role.' });
    }
  };

  const handleDeleteUser = async userId => {
    if (!window.confirm('Delete this account? This cannot be undone.')) return;
    try {
      await apiClient.delete(`admin/users/${userId}`);
      notify({ severity: 'info', message: 'Account deleted.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to delete account.' });
    }
  };

  const handleToggleProductApproval = async (productId, isApproved) => {
    try {
      await apiClient.put(`admin/products/${productId}/approve`, { isApproved: !isApproved });
      notify({ severity: 'success', message: !isApproved ? 'Product approved and visible in shop.' : 'Product hidden from shop.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to update product.' });
    }
  };

  const handleDeleteProduct = async productId => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await apiClient.delete(`admin/products/${productId}`);
      notify({ severity: 'info', message: 'Product deleted.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to delete product.' });
    }
  };

  const handleAdvanceOrder = async orderId => {
    try {
      await apiClient.put(`admin/orders/${orderId}/advance`);
      notify({ severity: 'success', message: 'Order status advanced.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to advance order status.' });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      notify({ severity: 'error', message: 'Category name is required.' });
      return;
    }
    try {
      await apiClient.post('categories', newCategory);
      notify({ severity: 'success', message: 'Category created.' });
      setCategoryDialogOpen(false);
      setNewCategory({ name: '', description: '' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: err.response?.data?.error || 'Failed to create category.' });
    }
  };

  const handleDeleteCategory = async categoryId => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await apiClient.delete(`categories/${categoryId}`);
      notify({ severity: 'info', message: 'Category deleted.' });
      loadAll();
    } catch (err) {
      notify({ severity: 'error', message: 'Failed to delete category.' });
    }
  };

  const vendors = users.filter(u => u.role === 'vendor');
  const customers = users.filter(u => u.role === 'user');
  const admins = users.filter(u => u.role === 'admin');

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
        Admin Dashboard
      </Typography>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Customers', value: summary.userCount },
            { label: 'Vendors', value: summary.vendorCount, sub: `${summary.pendingVendorCount} pending approval` },
            { label: 'Products', value: summary.productCount },
            { label: 'Orders', value: summary.orderCount },
            { label: 'Total Revenue', value: `$${summary.totalRevenue.toFixed(2)}` },
          ].map(stat => (
            <Grid item xs={12} sm={6} md={2.4} key={stat.label}>
              <Card elevation={0} sx={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {stat.value}
                  </Typography>
                  {stat.sub && (
                    <Typography variant="caption" color="warning.main">
                      {stat.sub}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Paper elevation={0} sx={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={`Vendors (${vendors.length})`} />
          <Tab label={`Customers (${customers.length})`} />
          <Tab label={`Products (${products.length})`} />
          <Tab label={`Orders (${orders.length})`} />
          <Tab label={`Categories (${categories.length})`} />
        </Tabs>

        <Box sx={{ px: 2 }}>
          {/* ---------- Vendors ---------- */}
          <TabPanel value={tab} index={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Store</TableCell>
                  <TableCell>Name / Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendors.map(v => (
                  <TableRow key={v._id}>
                    <TableCell>{v.vendorProfile?.storeName || '—'}</TableCell>
                    <TableCell>
                      {v.name}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {v.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Chip size="small" label={v.vendorProfile?.approved ? 'Approved' : 'Pending'} color={v.vendorProfile?.approved ? 'success' : 'warning'} />
                        <Chip size="small" label={v.isActive ? 'Active' : 'Deactivated'} color={v.isActive ? 'default' : 'error'} />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {!v.vendorProfile?.approved && (
                        <IconButton size="small" color="success" onClick={() => handleApproveVendor(v._id)} title="Approve vendor">
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => handleToggleStatus(v._id, v.isActive)} title={v.isActive ? 'Deactivate' : 'Reactivate'}>
                        <BlockIcon fontSize="small" color={v.isActive ? 'error' : 'success'} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteUser(v._id)} title="Delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>No vendors yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabPanel>

          {/* ---------- Customers ---------- */}
          <TabPanel value={tab} index={1}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...customers, ...admins].map(u => (
                  <TableRow key={u._id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select size="small" value={u.role} onChange={e => handleRoleChange(u._id, e.target.value)}>
                        <MenuItem value="user">user</MenuItem>
                        <MenuItem value="vendor">vendor</MenuItem>
                        <MenuItem value="admin">admin</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u.isActive ? 'Active' : 'Deactivated'} color={u.isActive ? 'default' : 'error'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleToggleStatus(u._id, u.isActive)} title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                        <BlockIcon fontSize="small" color={u.isActive ? 'error' : 'success'} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteUser(u._id)} title="Delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabPanel>

          {/* ---------- Products ---------- */}
          <TabPanel value={tab} index={2}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p._id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.vendor?.vendorProfile?.storeName || p.vendor?.name || 'Platform'}</TableCell>
                    <TableCell>${p.price?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={p.isApproved !== false ? 'Live' : 'Hidden'} color={p.isApproved !== false ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => handleToggleProductApproval(p._id, p.isApproved !== false)}>
                        {p.isApproved !== false ? 'Hide' : 'Show'}
                      </Button>
                      <IconButton size="small" onClick={() => handleDeleteProduct(p._id)} title="Delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>No products yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabPanel>

          {/* ---------- Orders ---------- */}
          <TabPanel value={tab} index={3}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map(o => {
                  const latest = o.statusHistory?.[o.statusHistory.length - 1];
                  return (
                    <TableRow key={o._id}>
                      <TableCell>{o.orderNumber}</TableCell>
                      <TableCell>
                        {o.name}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {o.email}
                        </Typography>
                      </TableCell>
                      <TableCell>${o.total?.toFixed(2)}</TableCell>
                      <TableCell>{o.paymentMethod}</TableCell>
                      <TableCell>{latest?.label || 'Placed'}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => handleAdvanceOrder(o._id)}>
                          Advance Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>No orders yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabPanel>

          {/* ---------- Categories ---------- */}
          <TabPanel value={tab} index={4}>
            <Button startIcon={<AddIcon />} variant="contained" size="small" sx={{ mb: 2 }} onClick={() => setCategoryDialogOpen(true)}>
              New Category
            </Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map(c => (
                  <TableRow key={c._id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.slug}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleDeleteCategory(c._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>No categories yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabPanel>
        </Box>
      </Paper>

      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Category</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={newCategory.name} onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))} fullWidth />
            <TextField
              label="Description"
              value={newCategory.description}
              onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCategory}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminDashboard;
