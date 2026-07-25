import { useState, useEffect, useRef } from 'react';
import { type MenuItem, type Table, type Order, type Settings, subscribeToState, updateState, saveFirebaseConfig, getActiveFirebaseConfig, getIsFirebaseMode, getAllRestaurantTenants, updateRestaurantTenant, type RestaurantTenant, getActiveRestaurantId, getRestaurantTenant } from '../services/db';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Utensils, 
  Settings as SettingsIcon,
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Info,
  Database,
  QrCode,
  Users,
  Printer
} from 'lucide-react';
import QRCode from 'qrcode';

interface AdminDashboardProps {
  role?: 'owner' | 'super_admin';
}

export default function AdminDashboard({ role = 'super_admin' }: AdminDashboardProps) {
  const activeRestaurantId = getActiveRestaurantId();
  const [tenant, setTenant] = useState<RestaurantTenant | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Load tenant and verify session auth for Owner
  useEffect(() => {
    if (activeRestaurantId === 'lumiere-dining' || role === 'super_admin') {
      setIsAuthorized(true);
      return;
    }
    
    getRestaurantTenant(activeRestaurantId).then((t: RestaurantTenant | null) => {
      setTenant(t);
      const savedAuth = sessionStorage.getItem(`auth_${role}_${activeRestaurantId}`);
      const correctPassword = t?.ownerPassword || 'owner123';
      if (savedAuth === correctPassword) {
        setIsAuthorized(true);
      }
    }).catch((err: any) => console.error(err));
  }, [activeRestaurantId, role]);

  const handleAuthSubmit = () => {
    const correctPassword = tenant?.ownerPassword || 'owner123';
    if (passwordInput === correctPassword) {
      sessionStorage.setItem(`auth_${role}_${activeRestaurantId}`, passwordInput);
      setIsAuthorized(true);
    } else {
      setAuthError('Incorrect Owner Password!');
    }
  };

  // DB States
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings>({
    restaurantName: 'Lumière Dining',
    upiId: 'restaurant@upi',
    address: '',
    logoUrl: '',
    taxPercentage: 18,
    currencySymbol: '₹'
  });

  // UI Navigation
  const [activeTab, setActiveTab] = useState<'analytics' | 'menu' | 'tables' | 'settings' | 'tenants'>('analytics');
  const [tenants, setTenants] = useState<RestaurantTenant[]>([]);

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const tenantList = await getAllRestaurantTenants();
        setTenants(tenantList);
      } catch (err: any) {
        console.error('Failed to load tenants:', err);
      }
    };
    if (role === 'super_admin') {
      loadTenants();
    }
  }, [role]);

  const handleToggleTenantStatus = async (tenant: RestaurantTenant) => {
    try {
      const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const updated = { ...tenant, status: newStatus as any };
      await updateRestaurantTenant(updated);
      const tenantList = await getAllRestaurantTenants();
      setTenants(tenantList);
    } catch (err: any) {
      console.error(err);
      alert(`Action failed: ${err.message || err}`);
    }
  };

  // Menu Form States
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuFormName, setMenuFormName] = useState('');
  const [menuFormDesc, setMenuFormDesc] = useState('');
  const [menuFormPrice, setMenuFormPrice] = useState(0);
  const [menuFormCategory, setMenuFormCategory] = useState('Starters');
  const [menuFormImage, setMenuFormImage] = useState('');
  const [menuFormIsVeg, setMenuFormIsVeg] = useState(true);
  const [menuFormCustomizations, setMenuFormCustomizations] = useState<string[]>([]);
  const [newCustomizationInput, setNewCustomizationInput] = useState('');
  const [menuFormIsAvailable, setMenuFormIsAvailable] = useState(true);

  // Table Form States
  const [tableFormName, setTableFormName] = useState('');
  const [tableFormCapacity, setTableFormCapacity] = useState(4);

  // Settings Form States
  const [settingsForm, setSettingsForm] = useState<Settings>({ ...settings });

  // Firebase Config Form States
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('');
  const [fbAppId, setFbAppId] = useState('');
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // QR Code Printable modal state
  const [qrPrintTable, setQrPrintTable] = useState<Table | null>(null);
  const printQrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Subscribe to DB state
  useEffect(() => {
    const unsubscribe = subscribeToState((state) => {
      setMenu(state.menu);
      setTables(state.tables);
      setOrders(state.orders);
      setSettings(state.settings);
      setSettingsForm(state.settings);
    });

    // Load active Firebase configs
    const activeConfig = getActiveFirebaseConfig();
    if (activeConfig) {
      setFbApiKey(activeConfig.apiKey || '');
      setFbProjectId(activeConfig.projectId || '');
      setFbAuthDomain(activeConfig.authDomain || '');
      setFbAppId(activeConfig.appId || '');
    }
    setIsFirebaseConnected(getIsFirebaseMode());

    return unsubscribe;
  }, []);

  // Update Firebase status state
  useEffect(() => {
    setIsFirebaseConnected(getIsFirebaseMode());
  }, [tables]); // refires checks on updates

  // Analytics calculations
  const settledOrders = orders.filter(o => o.status === 'COMPLETED');
  const totalRevenue = settledOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalOrdersCount = orders.length;
  const averageOrderValue = totalOrdersCount > 0 ? (totalRevenue / settledOrders.length || 0) : 0;

  // Popular Dishes counts
  const dishCounts = orders.flatMap(o => o.items).reduce((acc: { [name: string]: number }, item) => {
    acc[item.name] = (acc[item.name] || 0) + item.quantity;
    return acc;
  }, {});

  const popularDishes = Object.entries(dishCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Hourly Peak times (order counts grouped by hour)
  const hourlyCounts = orders.reduce((acc: { [hour: number]: number }, o) => {
    const hr = new Date(o.timestamp).getHours();
    acc[hr] = (acc[hr] || 0) + 1;
    return acc;
  }, {});

  // Generate Table QR Code printable
  useEffect(() => {
    if (qrPrintTable && printQrCanvasRef.current) {
      let origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        // Fallback to live production Vercel deployment so mobile scans work during local testing
        origin = 'https://shiv-hotel-demo.vercel.app';
      }
      // Routing URL that customer scans: https://domain.app/?restaurantId={activeRestId}&tableId=table-1
      const activeRestId = getActiveRestaurantId();
      const tableUrl = `${origin}/?restaurantId=${activeRestId}&tableId=${qrPrintTable.id}`;
      
      QRCode.toCanvas(printQrCanvasRef.current, tableUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('QR code generation error:', err);
      });
    }
  }, [qrPrintTable]);

  // MENU CRUD OPERATIONS
  const openMenuAdd = () => {
    setEditingMenuItem(null);
    setMenuFormName('');
    setMenuFormDesc('');
    setMenuFormPrice(0);
    setMenuFormCategory('Starters');
    setMenuFormImage('');
    setMenuFormIsVeg(true);
    setMenuFormCustomizations([]);
    setNewCustomizationInput('');
    setMenuFormIsAvailable(true);
    setIsMenuModalOpen(true);
  };

  const openMenuEdit = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuFormName(item.name);
    setMenuFormDesc(item.description);
    setMenuFormPrice(item.price);
    setMenuFormCategory(item.category);
    setMenuFormImage(item.image);
    setMenuFormIsVeg(item.isVeg);
    setMenuFormCustomizations(item.customizations || []);
    setNewCustomizationInput('');
    setMenuFormIsAvailable(item.isAvailable);
    setIsMenuModalOpen(true);
  };

  const addCustomizationTag = () => {
    if (newCustomizationInput.trim() && !menuFormCustomizations.includes(newCustomizationInput.trim())) {
      setMenuFormCustomizations([...menuFormCustomizations, newCustomizationInput.trim()]);
      setNewCustomizationInput('');
    }
  };

  const removeCustomizationTag = (tag: string) => {
    setMenuFormCustomizations(menuFormCustomizations.filter(t => t !== tag));
  };

  const handleSaveMenuItem = async () => {
    if (!menuFormName.trim() || menuFormPrice <= 0) return;

    let updatedMenu = [...menu];
    const imageFallback = menuFormImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';

    if (editingMenuItem) {
      // Edit
      updatedMenu = menu.map(m => {
        if (m.id === editingMenuItem.id) {
          return {
            ...m,
            name: menuFormName,
            description: menuFormDesc,
            price: menuFormPrice,
            category: menuFormCategory,
            image: imageFallback,
            isVeg: menuFormIsVeg,
            customizations: menuFormCustomizations,
            isAvailable: menuFormIsAvailable
          };
        }
        return m;
      });
    } else {
      // Add
      const newItem: MenuItem = {
        id: `m-${Date.now()}`,
        name: menuFormName,
        description: menuFormDesc,
        price: menuFormPrice,
        category: menuFormCategory,
        image: imageFallback,
        isVeg: menuFormIsVeg,
        customizations: menuFormCustomizations,
        isAvailable: menuFormIsAvailable
      };
      updatedMenu.push(newItem);
    }

    await updateState({ menu: updatedMenu });
    setIsMenuModalOpen(false);
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      const updatedMenu = menu.filter(m => m.id !== id);
      await updateState({ menu: updatedMenu });
    }
  };

  // TABLES CRUD OPERATIONS
  const handleAddTable = async () => {
    if (!tableFormName.trim()) return;

    const newTable: Table = {
      id: `table-${Date.now()}`,
      name: tableFormName,
      capacity: tableFormCapacity,
      status: 'vacant',
      activeOrderId: null
    };

    const updatedTables = [...tables, newTable];
    await updateState({ tables: updatedTables });
    setTableFormName('');
    setTableFormCapacity(4);
  };

  const handleDeleteTable = async (id: string) => {
    if (confirm('Are you sure you want to remove this table?')) {
      const updatedTables = tables.filter(t => t.id !== id);
      await updateState({ tables: updatedTables });
    }
  };

  // SETTINGS SAVE
  const handleSaveSettings = async () => {
    await updateState({ settings: settingsForm });
    alert('Restaurant settings updated successfully!');
  };

  // FIREBASE CONFIG CONTEXTS
  const handleConnectFirebase = () => {
    if (!fbApiKey || !fbProjectId) {
      alert('Please fill out API Key and Project ID fields.');
      return;
    }
    const newConfig = {
      apiKey: fbApiKey,
      projectId: fbProjectId,
      authDomain: fbAuthDomain || `${fbProjectId}.firebaseapp.com`,
      appId: fbAppId
    };
    saveFirebaseConfig(newConfig);
    setTimeout(() => {
      setIsFirebaseConnected(getIsFirebaseMode());
      alert(getIsFirebaseMode() ? 'Connected to Firebase Firestore successfully!' : 'Connection to Firebase failed. Local SSE sync remains enabled.');
    }, 1000);
  };

  const handleDisconnectFirebase = () => {
    saveFirebaseConfig(null);
    setIsFirebaseConnected(false);
    alert('Disconnected from Firebase. Reverted to Server SSE database sync.');
  };

  if (!isAuthorized && activeRestaurantId !== 'lumiere-dining') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-600/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tight leading-none font-display">
              {tenant?.name || 'Restaurant Portal'}
            </h1>
            <p className="text-xs text-slate-400 mt-2 font-semibold uppercase tracking-wider">
              Owner Security Login
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Owner Password
              </label>
              <input
                type="password"
                placeholder="Enter Owner Password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAuthSubmit();
                }}
                className="w-full bg-slate-950 border border-slate-850 focus:border-primary-500 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all text-center tracking-widest font-black"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-500 text-center font-bold">{authError}</p>
            )}

            <button
              onClick={handleAuthSubmit}
              className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 px-4 rounded-2xl text-xs cursor-pointer shadow-md shadow-primary-500/10 transition-colors uppercase tracking-widest font-sans"
            >
              Verify & Enter
            </button>
          </div>
          
          <div className="text-center border-t border-slate-850 pt-4">
            <a 
              href="/"
              className="text-[10px] text-slate-500 hover:text-slate-400 font-bold uppercase tracking-wider transition-colors"
            >
              Back to System Hub
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans select-none flex flex-col">
      {/* Header Banner */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {role === 'owner' ? `${settings.restaurantName} - Dashboard` : 'Super Admin Settings'}
            </h1>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              {role === 'owner' ? `Resto ID: ${getActiveRestaurantId()} | Billing: ₹499/mo` : 'Global SaaS Platform Administration'}
            </p>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-3.5 py-1.5 rounded-xl">
            <Database className={`w-4 h-4 ${isFirebaseConnected ? 'text-green-600 animate-pulse' : 'text-primary-500'}`} />
            <span className="text-[11px] font-bold text-gray-700">
              Sync: {isFirebaseConnected ? 'Firebase Cloud' : 'Local SSE Server'}
            </span>
          </div>

          <button 
            onClick={() => {
              localStorage.removeItem('saas_user_session');
              window.location.href = '/';
            }}
            className="text-xs bg-red-50 hover:bg-red-100 text-red-500 font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors border border-red-200"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-6 grid grid-cols-1 md:grid-cols-4 gap-6 grow items-start">
        
        {/* Navigation Sidebar */}
        <div className="flex flex-col gap-2 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left cursor-pointer transition-colors ${
              activeTab === 'analytics' ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Analytics & KPIs
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left cursor-pointer transition-colors ${
              activeTab === 'menu' ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Menu CRUD Manager
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left cursor-pointer transition-colors ${
              activeTab === 'tables' ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tables & QR Codes
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left cursor-pointer transition-colors ${
              activeTab === 'settings' ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            General Settings
          </button>
          {role === 'super_admin' && (
            <button
              onClick={() => setActiveTab('tenants')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left cursor-pointer transition-colors ${
                activeTab === 'tenants' ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              SaaS Tenants (₹499)
            </button>
          )}
        </div>

        {/* Tab Contents area */}
        <div className="md:col-span-3 w-full">
          
          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Sales</span>
                    <h3 className="text-xl font-black text-gray-900 mt-1">{settings.currencySymbol}{totalRevenue.toFixed(2)}</h3>
                  </div>
                  <div className="p-3 bg-green-50 rounded-2xl"><DollarSign className="w-6 h-6 text-green-600" /></div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orders Count</span>
                    <h3 className="text-xl font-black text-gray-900 mt-1">{totalOrdersCount}</h3>
                  </div>
                  <div className="p-3 bg-primary-50 rounded-2xl"><ShoppingBag className="w-6 h-6 text-primary-500" /></div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Order Value</span>
                    <h3 className="text-xl font-black text-gray-900 mt-1">{settings.currencySymbol}{averageOrderValue.toFixed(2)}</h3>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-2xl"><TrendingUp className="w-6 h-6 text-purple-600" /></div>
                </div>
              </div>

              {/* Data charts row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Popular Dishes card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-3">Popular Dishes</h3>
                  <div className="flex flex-col gap-3">
                    {popularDishes.length > 0 ? (
                      popularDishes.map(([name, qty]) => (
                        <div key={name} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700">{name}</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded font-extrabold text-gray-600">{qty} sold</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-6">No completed sales records yet.</p>
                    )}
                  </div>
                </div>

                {/* Peak Hours card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-3">Peak Dining Hours</h3>
                  <div className="flex flex-col gap-3">
                    {Object.keys(hourlyCounts).length > 0 ? (
                      Object.entries(hourlyCounts).map(([hour, count]) => (
                        <div key={hour} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700">{hour}:00 - {Number(hour) + 1}:00</span>
                          <span className="bg-primary-50 text-primary-600 border border-primary-100 px-2.5 py-0.5 rounded-full font-extrabold">{count} orders</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-6">Waiting for active order sessions.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* MENU CRUD TAB */}
          {activeTab === 'menu' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-gray-800">Menu Catalog</h2>
                <button
                  onClick={openMenuAdd}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {/* Menu CRUD list table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold">
                      <th className="py-2.5">Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menu.map(item => (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="py-2.5">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="font-bold text-gray-800">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                            {item.name}
                          </div>
                        </td>
                        <td className="text-gray-500 font-medium">{item.category}</td>
                        <td className="font-bold text-gray-800">{settings.currencySymbol}{item.price}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.isAvailable ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openMenuEdit(item)}
                              className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-600 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenuItem(item.id)}
                              className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABLES & QR CODE TAB */}
          {activeTab === 'tables' && (
            <div className="flex flex-col gap-6">
              
              {/* Add Table form */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="grow">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Table Name</label>
                  <input
                    type="text"
                    placeholder="E.g. Table 9, Private Cabin 1"
                    value={tableFormName}
                    onChange={e => setTableFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                  />
                </div>
                <div className="w-32 shrink-0">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={tableFormCapacity}
                    onChange={e => setTableFormCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                  />
                </div>
                <button
                  onClick={handleAddTable}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Table
                </button>
              </div>

              {/* Table list with printable QR codes triggers */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-3">Restaurant Tables</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {tables.map(table => (
                    <div 
                      key={table.id}
                      className="border border-gray-100 bg-gray-50/50 rounded-2xl p-4 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-sm text-gray-800">{table.name}</h4>
                          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                            <Users className="w-3.5 h-3.5" /> Capacity {table.capacity}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => setQrPrintTable(table)}
                          className="grow bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <QrCode className="w-4 h-4" /> HD QR code
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GENERAL RESTAURANT SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6">
              
              {/* Settings CRUD Form */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">Restaurant Branding & Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Restaurant Name</label>
                    <input
                      type="text"
                      value={settingsForm.restaurantName}
                      onChange={e => setSettingsForm({ ...settingsForm, restaurantName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">UPI Payment ID</label>
                    <input
                      type="text"
                      value={settingsForm.upiId}
                      onChange={e => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tax Rate (GST %)</label>
                    <input
                      type="number"
                      value={settingsForm.taxPercentage}
                      onChange={e => setSettingsForm({ ...settingsForm, taxPercentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Currency Symbol</label>
                    <input
                      type="text"
                      value={settingsForm.currencySymbol}
                      onChange={e => setSettingsForm({ ...settingsForm, currencySymbol: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Logo Image URL</label>
                    <input
                      type="text"
                      value={settingsForm.logoUrl}
                      onChange={e => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Restaurant Address</label>
                    <textarea
                      value={settingsForm.address}
                      onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs h-16 resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 px-4 rounded-xl text-xs cursor-pointer shadow-md shadow-primary-500/10 flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" /> Save Settings
                </button>
              </div>

              {/* Firebase Cloud Firestore connection form */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Database className="w-5 h-5 text-primary-500" />
                  <h3 className="text-sm font-bold text-gray-800">Firebase Firestore Integration</h3>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-xs text-indigo-800 leading-relaxed shadow-sm">
                  <Info className="w-4 h-4 shrink-0 text-indigo-600" />
                  <p>
                    Connecting Firebase Firestore enables real-time data sync across separate computers and smartphones globally. If disconnected, the system will use the default Express SSE server sync.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Firebase Project ID</label>
                    <input
                      type="text"
                      placeholder="E.g. shiv-resto-pos"
                      value={fbProjectId}
                      onChange={e => setFbProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">API Key</label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={fbApiKey}
                      onChange={e => setFbApiKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Auth Domain (Optional)</label>
                    <input
                      type="text"
                      placeholder="E.g. shiv-resto-pos.firebaseapp.com"
                      value={fbAuthDomain}
                      onChange={e => setFbAuthDomain(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">App ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="E.g. 1:1234:web:abcd"
                      value={fbAppId}
                      onChange={e => setFbAppId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={handleConnectFirebase}
                    className="grow bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-xl text-xs cursor-pointer shadow-md shadow-primary-500/10 flex items-center justify-center gap-1.5"
                  >
                    Connect Cloud Database
                  </button>
                  {isFirebaseConnected && (
                    <button
                      onClick={handleDisconnectFirebase}
                      className="px-4 border border-red-200 hover:border-red-300 text-red-500 rounded-xl hover:bg-red-50 text-xs font-bold cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* SAAS TENANTS TAB */}
          {activeTab === 'tenants' && (
            <div className="flex flex-col gap-6">
              {/* Manual Onboarding Form */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">Onboard New Restaurant (Manual Setup)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Restaurant Name</label>
                    <input
                      type="text"
                      placeholder="e.g. My Spice Resto"
                      id="new-tenant-name"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Owner Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      id="new-tenant-phone"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Owner UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. owner@upi"
                      id="new-tenant-upi"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Owner Password</label>
                    <input
                      type="text"
                      placeholder="Default: owner123"
                      id="new-tenant-owner-pass"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Staff PIN Code</label>
                    <input
                      type="text"
                      placeholder="Default: staff123"
                      id="new-tenant-staff-pass"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                    />
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const nameInput = document.getElementById('new-tenant-name') as HTMLInputElement;
                    const phoneInput = document.getElementById('new-tenant-phone') as HTMLInputElement;
                    const upiInput = document.getElementById('new-tenant-upi') as HTMLInputElement;
                    const ownerPassInput = document.getElementById('new-tenant-owner-pass') as HTMLInputElement;
                    const staffPassInput = document.getElementById('new-tenant-staff-pass') as HTMLInputElement;
                    if (!nameInput.value.trim() || !phoneInput.value.trim()) {
                      alert('Please provide restaurant name and contact phone.');
                      return;
                    }
                    try {
                      const tenantId = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      const uniqueId = `${tenantId}-${Date.now().toString().slice(-4)}`;
                      const newTenant: RestaurantTenant = {
                        id: uniqueId,
                        name: nameInput.value.trim(),
                        ownerPhone: phoneInput.value.trim(),
                        status: 'ACTIVE',
                        subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                        upiId: upiInput.value.trim() || 'default@upi',
                        ownerPassword: ownerPassInput.value.trim() || 'owner123',
                        staffPassword: staffPassInput.value.trim() || 'staff123'
                      };
                      await updateRestaurantTenant(newTenant);
                      nameInput.value = '';
                      phoneInput.value = '';
                      upiInput.value = '';
                      ownerPassInput.value = '';
                      staffPassInput.value = '';
                      alert(`Restaurant Onboarded successfully! Tenant ID: ${uniqueId}`);
                      // Reload tenants list
                      const list = await getAllRestaurantTenants();
                      setTenants(list);
                    } catch (err: any) {
                      console.error(err);
                      alert(`Failed to Onboard: ${err.message || 'Database write error'}`);
                    }
                  }}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer shadow-md shadow-primary-500/10 self-start"
                >
                  Onboard Restaurant
                </button>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-extrabold text-gray-900 mb-4">SaaS Platform Tenants</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="pb-3">Restaurant</th>
                        <th className="pb-3">Owner Contact</th>
                        <th className="pb-3">Expiry Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map(t => (
                        <tr key={t.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-3.5 font-bold text-gray-800">
                            <div>{t.name}</div>
                            <div className="text-[10px] font-mono text-gray-400 mt-0.5">{t.id}</div>
                          </td>
                          <td className="py-3.5 text-gray-600">{t.ownerPhone}</td>
                          <td className="py-3.5 text-gray-600">{new Date(t.subscriptionExpiresAt).toLocaleDateString()}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              t.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right flex items-center justify-end gap-2">
                            <a
                              href={`/?restaurantId=${t.id}&tableId=table-1`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-[10px] inline-block"
                            >
                              Customer Menu
                            </a>
                            <a
                              href={`/owner?restaurantId=${t.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold text-[10px] inline-block"
                            >
                              Owner Panel
                            </a>
                            <button
                              onClick={() => handleToggleTenantStatus(t)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                t.status === 'ACTIVE'
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {t.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MENU ADD/EDIT MODAL */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-900">{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
              <button 
                onClick={() => setIsMenuModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto grow flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Dish Name</label>
                  <input
                    type="text"
                    value={menuFormName}
                    onChange={e => setMenuFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    value={menuFormPrice}
                    onChange={e => setMenuFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Category</label>
                  <select
                    value={menuFormCategory}
                    onChange={e => setMenuFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Mains">Mains</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://unsplash.com/..."
                    value={menuFormImage}
                    onChange={e => setMenuFormImage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Description</label>
                  <textarea
                    value={menuFormDesc}
                    onChange={e => setMenuFormDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs h-16 resize-none"
                  />
                </div>

                {/* Veg preference and availability checks */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={menuFormIsVeg}
                      onChange={e => setMenuFormIsVeg(e.target.checked)}
                      className="accent-green-600 w-4 h-4 border-gray-200"
                    />
                    Veg Dish
                  </label>
                  <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={menuFormIsAvailable}
                      onChange={e => setMenuFormIsAvailable(e.target.checked)}
                      className="accent-primary-500 w-4 h-4 border-gray-200"
                    />
                    In Stock
                  </label>
                </div>
              </div>

              {/* Customizations Creator tags input */}
              <div className="border-t border-gray-100 pt-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Customization Choices</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="E.g. Extra Spicy, Double Butter"
                    value={newCustomizationInput}
                    onChange={e => setNewCustomizationInput(e.target.value)}
                    className="grow px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                  />
                  <button
                    onClick={addCustomizationTag}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-xl cursor-pointer"
                  >
                    Add Option
                  </button>
                </div>

                {/* Customizations tags list preview */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {menuFormCustomizations.map(tag => (
                    <span 
                      key={tag} 
                      className="bg-primary-50 text-primary-600 border border-primary-100 rounded-lg px-2.5 py-1 font-bold flex items-center gap-1"
                    >
                      {tag}
                      <button onClick={() => removeCustomizationTag(tag)} className="hover:text-primary-800 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsMenuModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMenuItem}
                className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold cursor-pointer shadow-sm"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT TABLE QR CODE MODAL CARD */}
      {qrPrintTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
            
            {/* Header info */}
            <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3 mb-4">
              <span className="text-sm font-extrabold text-gray-900">Download QR Code card</span>
              <button onClick={() => setQrPrintTable(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Card layout to print */}
            <div className="border border-slate-200 rounded-3xl p-5 bg-gradient-to-b from-white to-gray-50 shadow-sm flex flex-col items-center w-full">
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="w-5 h-5 text-primary-500" />
                <span className="font-extrabold text-sm text-slate-800">{settings.restaurantName}</span>
              </div>
              
              <canvas ref={printQrCanvasRef} className="bg-white border-2 border-slate-100 rounded-2xl shadow-inner" />
              
              <h3 className="font-black text-lg text-slate-850 mt-4">{qrPrintTable.name}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Scan QR Code to Order & Pay</p>
            </div>

            {/* Print Action */}
            <button
              onClick={() => window.print()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4"
            >
              <Printer className="w-4 h-4" /> Print Card
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
