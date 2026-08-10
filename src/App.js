import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { BranchProvider } from './context/BranchContext';
import AgeGate, { isAgeVerified } from './components/AgeGate';
import NavBar from './components/NavBar';
import Splash from './components/Splash';
import Login from './pages/Login';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Bolo from './pages/Bolo';
import MapPicker from './pages/MapPicker';
import Search from './pages/Search';
import ProductDetail from './pages/ProductDetail';
import OrdersPage from './pages/OrdersPage';
import EditProfile from './pages/EditProfile';
import AdminApp from './pages/admin/AdminApp';
import DeliveryApp from './pages/delivery/DeliveryApp';
import './App.css';

const HIDE_CHROME = ['/map', '/buscar', '/pedidos', '/perfil', '/producto'];

const isAdminMode = process.env.REACT_APP_ADMIN === 'true';
const isDeliveryMode = process.env.REACT_APP_DELIVERY === 'true';

function Header({ hidden }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      padding: '12px 20px',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
      transition: 'transform 0.25s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
          <span style={{ color: '#c9a227' }}>Cheve</span>
          <span style={{ color: '#fff' }}>.app</span>
        </div>
        <span style={{ fontSize: 12, color: '#cfcfcf' }}>{user?.email}</span>
      </div>
      <button
        onClick={() => navigate('/buscar')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)',
          color: '#8a8a8a',
          fontSize: 15,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        Buscar productos...
      </button>
    </header>
  );
}

function AppContent() {
  const [ageVerified, setAgeVerified] = useState(isAgeVerified());
  const [splashReady, setSplashReady] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const location = useLocation();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (isDeliveryMode) {
      document.title = 'Cheve.app · Reparto';
    } else if (isAdminMode) {
      document.title = 'Cheve.app · Admin';
    } else {
      document.title = 'Cheve.app';
    }
  }, []);

  React.useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHeaderHidden(y > lastY && y > 80);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    if (isAdminMode || isDeliveryMode) {
      setSplashReady(true);
      return;
    }
    const timer = setTimeout(() => setSplashReady(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!splashReady || loading) {
    if (isAdminMode || isDeliveryMode) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            color: '#c9a227',
            fontSize: 15,
          }}
        >
          Cargando...
        </div>
      );
    }
    return <Splash />;
  }

  if (!isAdminMode && !isDeliveryMode && !ageVerified) {
    return <AgeGate onVerified={() => setAgeVerified(true)} />;
  }

  if (!user) {
    return <Login />;
  }

  if (isDeliveryMode) {
    return <DeliveryApp />;
  }

  if (isAdminMode) {
    return <AdminApp />;
  }

  const hideChrome = HIDE_CHROME.includes(location.pathname);

  return (
    <>
      {location.pathname === '/' && <Header hidden={headerHidden} />}
      <main style={{ paddingBottom: hideChrome ? 0 : 126 }}>
        <Routes>
          <Route path="/" element={<Home headerHidden={headerHidden} />} />
          <Route path="/bolo" element={<Bolo />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/map" element={<MapPicker />} />
          <Route path="/buscar" element={<Search />} />
          <Route path="/producto" element={<ProductDetail />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/perfil" element={<EditProfile />} />
        </Routes>
      </main>
      {!hideChrome && <NavBar />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <BranchProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </BranchProvider>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
