import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CustomerProvider } from './context/CustomerContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomerProvider>
      <App />
    </CustomerProvider>
  </StrictMode>,
);
