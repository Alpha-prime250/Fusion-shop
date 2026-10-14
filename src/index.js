import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import { DevSupport } from '@react-buddy/ide-toolbox';
import { ComponentPreviews, useInitial } from './dev';
import { NotificationProvider } from './context/NotificationProvider';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DevSupport ComponentPreviews={ComponentPreviews} useInitialHook={useInitial}>
      <NotificationProvider>
        <AuthProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </AuthProvider>
      </NotificationProvider>
    </DevSupport>
  </React.StrictMode>
);
