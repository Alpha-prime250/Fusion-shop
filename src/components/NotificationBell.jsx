import React, { useState, useEffect, useCallback } from 'react';
import { IconButton, Badge, Menu, MenuItem, Typography, Box, Divider, Button, ListItemText } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await apiClient.get('notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // non-fatal
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
    if (!isAuthenticated) return undefined;
    // Poll every 30s for new notifications (order updates, vendor approvals, etc.)
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleOpen = event => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleItemClick = async notification => {
    try {
      await apiClient.put(`notifications/${notification._id}/read`);
    } catch (err) {
      // ignore
    }
    handleClose();
    if (notification.link) navigate(notification.link);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.put('notifications/read-all');
      loadNotifications();
    } catch (err) {
      // ignore
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} aria-label="notifications">
        <Badge badgeContent={unreadCount} color="secondary">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} PaperProps={{ sx: { width: 340, maxHeight: 420 } }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="No notifications yet" />
          </MenuItem>
        ) : (
          notifications.map(notification => (
            <MenuItem key={notification._id} onClick={() => handleItemClick(notification)} sx={{ whiteSpace: 'normal', bgcolor: notification.read ? 'transparent' : 'rgba(40,116,240,0.06)' }}>
              <ListItemText
                primary={notification.title}
                secondary={notification.message}
                primaryTypographyProps={{ fontWeight: notification.read ? 400 : 700, fontSize: 14 }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}

export default NotificationBell;
