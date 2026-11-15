import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './AppContext';
import App from './App';
import AuthGate from './components/AuthGate';
import { Toaster } from 'react-hot-toast';
import './index.css';

// AuthGate sits outside the provider so no data loads before someone signs in.
// Keying the provider by account resets everything when the account changes.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      {(account) => (
        <AppProvider key={account?.user.id ?? 'local'} user={account?.user} onSignOut={account?.signOut}>
          <App />
        </AppProvider>
      )}
    </AuthGate>
    <Toaster
      position="bottom-center"
      containerStyle={{
        bottom: '112px',
      }}
      toastOptions={{
        style: {
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          background: 'var(--color-surface)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-line)',
          borderRadius: '16px',
          padding: '10px 14px',
        },
        success: { iconTheme: { primary: 'var(--color-income)', secondary: 'var(--color-surface)' } },
        error: { iconTheme: { primary: 'var(--color-danger)', secondary: 'var(--color-surface)' } },
      }}
    />
  </StrictMode>
);
