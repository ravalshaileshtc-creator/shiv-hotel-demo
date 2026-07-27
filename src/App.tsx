import { useState, useEffect, useRef } from 'react';
import { initSync, updateRestaurantTenant, type RestaurantTenant, getUserDocument, saveUserDocument, subscribeToState, safeLocalStorage } from './services/db';
import CustomerDashboard from './components/CustomerDashboard';
import KDS from './components/KDS';
import CashierTerminal from './components/CashierTerminal';
import AdminDashboard from './components/AdminDashboard';
import QRCode from 'qrcode';
import { 
  Utensils, 
  ChefHat, 
  LayoutGrid, 
  Settings as SettingsIcon, 
  Sparkles,
  X
} from 'lucide-react';

export default function App() {
  const [route, setRoute] = useState<{
    path: string;
    restaurantId: string | null;
    tableId: string | null;
  }>({
    path: window.location.pathname,
    restaurantId: null,
    tableId: null
  });

  // User Session Interface
  interface UserSession {
    name: string;
    phone: string;
    role: 'owner' | 'cashier' | 'kitchen' | 'waiter' | 'super_admin';
    restaurantId: string;
  }

  // Load session from localStorage
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      const saved = safeLocalStorage.getItem('saas_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse user session:', e);
      return null;
    }
  });

  // Settings State for dynamic landing branding
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (userSession) {
      const unsubscribe = subscribeToState((state) => {
        setSettings(state.settings);
      });
      return unsubscribe;
    }
  }, [userSession]);

  // Dynamically set browser tab title
  useEffect(() => {
    if (settings?.restaurantName) {
      document.title = `${settings.restaurantName} | POS Hub`;
    } else {
      document.title = 'Shiv POS & QR Dining';
    }
  }, [settings]);

  // Login States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // SaaS Registration States
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [saasStep, setSaasStep] = useState<1 | 2>(1); // 1 = Form, 2 = Payment/QR Code
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUpi, setRegUpi] = useState('');
  const [generatedTenantId, setGeneratedTenantId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const paymentCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleNextToPayment = () => {
    if (!regName.trim() || !regPhone.trim()) {
      alert('Please fill in Restaurant Name and Owner Contact Phone.');
      return;
    }
    const tenantId = regName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueId = `${tenantId}-${Date.now().toString().slice(-4)}`;
    setGeneratedTenantId(uniqueId);
    setSaasStep(2);
  };

  useEffect(() => {
    if (isRegisterOpen && saasStep === 2 && paymentCanvasRef.current) {
      // Payment amount ₹499 INR for monthly platform charge
      const payString = `upi://pay?pa=lumiere@upi&pn=LumierePlatform&am=499.00&cu=INR&tn=SaaS_Registration_${generatedTenantId}`;
      QRCode.toCanvas(paymentCanvasRef.current, payString, {
        width: 180,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('UPI QR Code generation error:', err);
      });
    }
  }, [isRegisterOpen, saasStep, generatedTenantId]);

  const handlePaymentComplete = async () => {
    setIsRegistering(true);
    try {
      const tenant: RestaurantTenant = {
        id: generatedTenantId,
        name: regName,
        ownerPhone: regPhone,
        status: 'ACTIVE',
        subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        upiId: regUpi || 'saasowner@upi'
      };

      await updateRestaurantTenant(tenant);

      // Create owner account globally in users collection
      await saveUserDocument({
        name: `${regName} Owner`,
        phone: regPhone,
        password: 'owner123',
        role: 'owner',
        restaurantId: generatedTenantId
      });

      // Create cashier account globally in users collection
      await saveUserDocument({
        name: `${regName} Cashier`,
        phone: `${regPhone}1`,
        password: 'cashier123',
        role: 'cashier',
        restaurantId: generatedTenantId
      });

      // Create kitchen account globally in users collection
      await saveUserDocument({
        name: `${regName} Kitchen`,
        phone: `${regPhone}2`,
        password: 'kitchen123',
        role: 'kitchen',
        restaurantId: generatedTenantId
      });

      alert(`🎉 Congratulations! "${regName}" has been successfully registered.\n\nLogin Accounts Created:\n\n1. 👨‍💼 OWNER:\n- Mobile: ${regPhone}\n- Password: owner123\n\n2. 💵 CASHIER:\n- Mobile: ${regPhone}1\n- Password: cashier123\n\n3. 🍳 KITCHEN:\n- Mobile: ${regPhone}2\n- Password: kitchen123\n\nYou can now log in using these credentials!`);
      
      // Reset
      setIsRegisterOpen(false);
      setSaasStep(1);
      setRegName('');
      setRegPhone('');
      setRegUpi('');
    } catch (e: any) {
      console.error(e);
      alert(`Registration failed: ${e.message || 'database connection issue'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLoginSubmit = async () => {
    if (!loginPhone.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both Mobile Number and Password.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const userDoc = await getUserDocument(loginPhone.trim());
      if (userDoc && userDoc.password === loginPassword.trim()) {
        const sessionData: UserSession = {
          name: userDoc.name,
          phone: userDoc.phone,
          role: userDoc.role,
          restaurantId: userDoc.restaurantId
        };
        safeLocalStorage.setItem('saas_user_session', JSON.stringify(sessionData));
        safeLocalStorage.setItem('saas_restaurant_id', sessionData.restaurantId);
        
        // Re-initialize connections for this restaurant
        initSync();
        setUserSession(sessionData);

        // Routing redirect based on user role
        if (sessionData.role === 'super_admin') navigateTo('/admin');
        else if (sessionData.role === 'owner') navigateTo('/owner');
        else if (sessionData.role === 'cashier') navigateTo('/cashier');
        else if (sessionData.role === 'kitchen') navigateTo('/kds');
      } else {
        setLoginError('Invalid Mobile Number or Password!');
      }
    } catch (e: any) {
      setLoginError(`Authentication failed: ${e.message || 'connection issue'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };



  // Parse path and search parameters
  useEffect(() => {
    // Initialize synchronization connection
    initSync();

    const handleRouteChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const restaurantId = searchParams.get('restaurantId');
      const tableId = searchParams.get('tableId');
      
      setRoute({
        path: window.location.pathname,
        restaurantId,
        tableId
      });
    };

    // Listen to changes in navigation
    window.addEventListener('popstate', handleRouteChange);
    
    // Initial run
    handleRouteChange();

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Custom router helper to change paths
  const navigateTo = (path: string, search: string = '') => {
    const newUrl = `${window.location.origin}${path}${search}`;
    window.history.pushState({}, '', newUrl);
    // Dispatch popstate event to trigger router state update
    window.dispatchEvent(new Event('popstate'));
  };

  // 1. Customer view routing: query parameters present (Bypasses Login!)
  if (route.restaurantId && route.tableId) {
    return <CustomerDashboard restaurantId={route.restaurantId} tableId={route.tableId} />;
  }

  // 2. If not logged in, render the unified secure login page
  if (!userSession) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Glow Shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-600/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col gap-6">
          <div className="text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none font-display mt-2">
                Shiv POS & QR Dining
              </h1>
              <p className="text-[10px] text-primary-500 font-extrabold uppercase tracking-widest mt-2">
                SaaS Management Login
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Mobile Number</label>
              <input
                type="tel"
                placeholder="Enter Mobile Number"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-primary-500 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder="Enter Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleLoginSubmit();
                }}
                className="w-full bg-slate-950 border border-slate-850 focus:border-primary-500 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 focus:outline-none transition-all"
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-500 text-center font-bold">{loginError}</p>
            )}

            <button
              onClick={handleLoginSubmit}
              disabled={isLoggingIn}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-2xl text-xs cursor-pointer shadow-md shadow-primary-500/10 transition-colors uppercase tracking-widest font-sans mt-2"
            >
              {isLoggingIn ? 'Verifying...' : 'Sign In'}
            </button>
          </div>

          <div className="border-t border-slate-850 pt-5 flex flex-col gap-3">
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="text-xs text-primary-450 hover:text-primary-300 font-bold transition-colors uppercase tracking-wider text-center"
            >
              Onboard a New Hotel
            </button>
          </div>
        </div>

        {/* Self-Registration Modal */}
        {isRegisterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-slate-100">
              <button 
                onClick={() => { setIsRegisterOpen(false); setSaasStep(1); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {saasStep === 1 ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white">Register Restaurant</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Start your 30-day trial. ₹499/mo billed monthly.</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Restaurant Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. My Spice Kitchen"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Owner Contact Phone</label>
                      <input 
                        type="tel" 
                        placeholder="e.g. 9876543210"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Owner UPI Id (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. owner@upi"
                        value={regUpi}
                        onChange={(e) => setRegUpi(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleNextToPayment}
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-xl text-xs cursor-pointer shadow-md shadow-primary-500/10 transition-colors mt-2"
                  >
                    Proceed to Payment (₹499)
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div>
                    <h3 className="text-lg font-black text-white">Settle Activation Fee</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Scan the UPI QR Code below to pay ₹499 monthly charge.</p>
                  </div>

                  <div className="bg-white p-2 rounded-2xl shadow-inner my-2">
                    <canvas ref={paymentCanvasRef}></canvas>
                  </div>

                  <div className="text-[10px] text-slate-400 max-w-xs">
                    Tenant Id: <strong className="text-white font-mono">{generatedTenantId}</strong>
                  </div>

                  <div className="w-full flex gap-2 mt-2">
                    <button 
                      onClick={() => setSaasStep(1)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handlePaymentComplete}
                      disabled={isRegistering}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-xl text-xs cursor-pointer shadow-md shadow-green-600/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isRegistering ? 'Activating...' : 'I Have Paid'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. User is Logged In: Route appropriately based on path or role
  if (route.path === '/kds') {
    return <KDS />;
  }
  if (route.path === '/cashier') {
    return <CashierTerminal />;
  }
  if (route.path === '/owner') {
    return <AdminDashboard role="owner" />;
  }
  if (route.path === '/admin') {
    return <AdminDashboard role="super_admin" />;
  }

  // 4. Default logged-in Central Navigation Landing / Hub
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-600/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl w-full text-center relative z-10 flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center shadow-2xl shadow-primary-500/20 mb-2">
          <Utensils className="w-8 h-8 text-white" />
        </div>

        <div>
          <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest bg-primary-500/10 border border-primary-500/20 px-3.5 py-1.5 rounded-full inline-block">
            SaaS Terminal Hub
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white mt-4 tracking-tight leading-none font-display">
            {settings?.restaurantName || 'Shiv Resto'} <span className="bg-gradient-to-r from-primary-500 to-amber-400 bg-clip-text text-transparent">POS & QR Ordering</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Logged in as <strong className="text-slate-200">{userSession.name}</strong> ({userSession.role.toUpperCase()})
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl mt-6">
          {(userSession.role === 'super_admin' || userSession.role === 'kitchen') && (
            <div 
              onClick={() => navigateTo('/kds')}
              className="bg-slate-900 border border-slate-850 hover:border-primary-500/50 rounded-3xl p-6 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 group hover:-translate-y-1 shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <ChefHat className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-extrabold text-sm text-white group-hover:text-primary-400 transition-colors">Kitchen Display</h3>
                <p className="text-[10px] text-slate-450 mt-1 font-semibold">KDS Order Queue Terminal</p>
              </div>
            </div>
          )}

          {(userSession.role === 'super_admin' || userSession.role === 'cashier') && (
            <div 
              onClick={() => navigateTo('/cashier')}
              className="bg-slate-900 border border-slate-850 hover:border-primary-500/50 rounded-3xl p-6 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 group hover:-translate-y-1 shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-extrabold text-sm text-white group-hover:text-primary-400 transition-colors">Cashier Billing</h3>
                <p className="text-[10px] text-slate-450 mt-1 font-semibold">POS Terminal & Billing Console</p>
              </div>
            </div>
          )}

          {(userSession.role === 'super_admin' || userSession.role === 'owner') && (
            <div 
              onClick={() => navigateTo('/owner')}
              className="bg-slate-900 border border-slate-850 hover:border-primary-500/50 rounded-3xl p-6 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 group hover:-translate-y-1 shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <SettingsIcon className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-extrabold text-sm text-white group-hover:text-primary-400 transition-colors">Owner Panel</h3>
                <p className="text-[10px] text-slate-450 mt-1 font-semibold">Menu CRUD & Live Analytics</p>
              </div>
            </div>
          )}

          {userSession.role === 'super_admin' && (
            <div 
              onClick={() => navigateTo('/admin')}
              className="bg-slate-900 border border-slate-850 hover:border-primary-500/50 rounded-3xl p-6 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 group hover:-translate-y-1 shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-extrabold text-sm text-white group-hover:text-primary-400 transition-colors">Super Admin</h3>
                <p className="text-[10px] text-slate-450 mt-1 font-semibold">SaaS Tenant Management Console</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            safeLocalStorage.removeItem('saas_user_session');
            setUserSession(null);
            navigateTo('/');
          }}
          className="mt-6 text-xs bg-red-650/10 hover:bg-red-650/30 text-red-400 font-black px-4 py-2 rounded-2xl border border-red-500/20 cursor-pointer transition-colors uppercase tracking-widest"
        >
          Logout Session
        </button>
      </div>
    </div>
  );
}
