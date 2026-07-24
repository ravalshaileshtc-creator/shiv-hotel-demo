import { useState, useEffect, useRef } from 'react';
import { initSync, updateRestaurantTenant, type RestaurantTenant } from './services/db';
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
  ExternalLink,
  Sparkles,
  QrCode,
  TrendingUp,
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
      alert(`🎉 Congratulations! "${regName}" has been successfully registered. Access tenant ID: ${generatedTenantId}.\n\nCopy this ID to configure your terminal!`);
      
      // Navigate to customer simulation of the newly registered restaurant!
      navigateTo('/', `?restaurantId=${generatedTenantId}&tableId=table-1`);
      
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

  // 1. Customer view routing: query parameters present
  if (route.restaurantId && route.tableId) {
    return <CustomerDashboard restaurantId={route.restaurantId} tableId={route.tableId} />;
  }

  // 2. Pathname routing
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

  // 3. Central Navigation Landing / Hub
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Decorative Background Glowing Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-600/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl w-full text-center relative z-10 flex flex-col items-center gap-6">
        
        {/* Logo Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center shadow-2xl shadow-primary-500/20 mb-2">
          <Utensils className="w-8 h-8 text-white" />
        </div>

        <div>
          <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest bg-primary-500/10 border border-primary-500/20 px-3.5 py-1.5 rounded-full inline-block">
            Full-Stack Demo Portal
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white mt-4 tracking-tight leading-none font-display">
            Lumière Dining <span className="bg-gradient-to-r from-primary-500 to-amber-400 bg-clip-text text-transparent">AI POS & QR Ordering</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-4 max-w-xl mx-auto leading-relaxed">
            Welcome to the Modern Restaurant Management suite. Select your system portal to simulate the real-time dining flow.
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="bg-gradient-to-r from-primary-500 to-amber-500 hover:opacity-90 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl shadow-lg cursor-pointer transition-transform hover:scale-105"
            >
              Launch Your Restaurant (₹499/mo)
            </button>
          </div>
        </div>

        {/* Terminals Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl mt-6">
          
          {/* Customer Simulator */}
          <div 
            onClick={() => navigateTo('/', '?restaurantId=lumiere-dining&tableId=table-1')}
            className="group cursor-pointer bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-primary-500/30 rounded-3xl p-5 text-left transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between h-40"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-white group-hover:text-primary-400 transition-colors">Customer Portal</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Scan menu, place orders, track live timeline status, and chat with the AI dining bot.
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-primary-400 flex items-center gap-1 mt-3">
              Open Simulator <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Kitchen Display System */}
          <div 
            onClick={() => navigateTo('/kds')}
            className="group cursor-pointer bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-primary-500/30 rounded-3xl p-5 text-left transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between h-40"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                <ChefHat className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-white group-hover:text-amber-400 transition-colors">Kitchen Staff Terminal</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Accept, reject, and prepare orders. Real-time audio alerts and cooking status dispatcher.
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-amber-400 flex items-center gap-1 mt-3">
              Open KDS <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Cashier Billing POS */}
          <div 
            onClick={() => navigateTo('/cashier')}
            className="group cursor-pointer bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-primary-500/30 rounded-3xl p-5 text-left transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between h-40"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors">Cashier Billing Terminal</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Process ready orders, calculate GST, print receipt tickets, and settle payment bills.
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-blue-400 flex items-center gap-1 mt-3">
              Open POS <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Owner Dashboard */}
          <div 
            onClick={() => navigateTo('/owner')}
            className="group cursor-pointer bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-primary-500/30 rounded-3xl p-5 text-left transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between h-40"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-white group-hover:text-purple-400 transition-colors">Owner Dashboard</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Track analytics, check daily total sales revenue, average values, and popular dishes.
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-purple-400 flex items-center gap-1 mt-3">
              View Analytics <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Super Admin Control Settings */}
          <div 
            onClick={() => navigateTo('/admin')}
            className="group cursor-pointer bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-primary-500/30 rounded-3xl p-5 text-left transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between h-40"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-white group-hover:text-red-400 transition-colors">Super Admin Control</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Manage tables, edit menu CRUD catalog prices, and configure Firebase database sync.
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-red-400 flex items-center gap-1 mt-3">
              Open Admin Panel <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>

        </div>

        {/* Footer Demo Instructions */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-slate-900/30 border border-slate-900 px-4 py-2.5 rounded-2xl max-w-md mt-4">
          <Sparkles className="w-4 h-4 text-primary-500 shrink-0" />
          <span>Tip: Open each screen in separate browser windows (or tabs) to see real-time updates and synchronization at work!</span>
        </div>
      </div>

      {/* SaaS REGISTRATION MODAL */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => { setIsRegisterOpen(false); setSaasStep(1); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
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
