import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './AppContext';
import App from './App';
import { Toaster } from 'react-hot-toast';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
      <Toaster
        position="bottom-center"
        containerStyle={{
          bottom: '100px',
        }}
        toastOptions={{
          className: 'toast-custom',
          style: {
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
    </AppProvider>
  </StrictMode>
);
