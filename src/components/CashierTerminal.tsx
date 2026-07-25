import { useState, useEffect, useRef } from 'react';
import { type Table, type Order, type Settings, subscribeToState, updateState, getActiveRestaurantId, getAllRestaurantTenants, type RestaurantTenant, getRestaurantTenant } from '../services/db';
import { 
  Printer, 
  Check, 
  Percent, 
  X, 
  LayoutGrid,
  Users,
  AlertCircle,
  QrCode
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

export default function CashierTerminal() {
  // DB States
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings>({
    restaurantName: 'Shiv Resto',
    upiId: 'restaurant@upi',
    address: '',
    logoUrl: '',
    taxPercentage: 18,
    currencySymbol: '₹'
  });

  // UI States
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [cashDiscount, setCashDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [isBillDetailOpen, setIsBillDetailOpen] = useState(false);
  const upiQrCanvasRef = useRef<HTMLCanvasElement>(null);

  const role = 'staff';
  const activeRestaurantId = getActiveRestaurantId();
  const [tenant, setTenant] = useState<RestaurantTenant | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Subscribe to DB state
  const [tenants, setTenants] = useState<any[]>([]);

  // Load tenant and verify session auth
  useEffect(() => {
    if (activeRestaurantId === 'lumiere-dining') {
      setIsAuthorized(true);
      return;
    }
    
    getRestaurantTenant(activeRestaurantId).then((t: RestaurantTenant | null) => {
      setTenant(t);
      const savedAuth = sessionStorage.getItem(`auth_${role}_${activeRestaurantId}`);
      const correctPassword = t?.staffPassword || 'staff123';
      if (savedAuth === correctPassword) {
        setIsAuthorized(true);
      }
    }).catch((err: any) => console.error(err));
  }, [activeRestaurantId]);

  const handleAuthSubmit = () => {
    const correctPassword = tenant?.staffPassword || 'staff123';
    if (passwordInput === correctPassword) {
      sessionStorage.setItem(`auth_${role}_${activeRestaurantId}`, passwordInput);
      setIsAuthorized(true);
    } else {
      setAuthError('Incorrect Staff PIN Code!');
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToState((state) => {
      setTables(state.tables);
      setOrders(state.orders);
      setSettings(state.settings);
    });
    
    getAllRestaurantTenants().then(list => {
      setTenants(list);
    }).catch(e => console.error(e));

    return unsubscribe;
  }, []);

  // Find active orders for selected table
  const activeOrdersForTable = selectedTableId 
    ? orders.filter(o => o.tableId === selectedTableId && o.status !== 'COMPLETED' && o.status !== 'REJECTED')
    : [];

  const hasUnreadyOrders = activeOrdersForTable.some(o => o.status === 'PLACED' || o.status === 'ACCEPTED_BY_KITCHEN' || o.status === 'PREPARING');

  const selectedTable = tables.find(t => t.id === selectedTableId);

  // Totals calculations across all active orders for this table
  const subtotal = activeOrdersForTable.reduce((sum, o) => sum + o.subtotal, 0);
  const tax = parseFloat(((subtotal * settings.taxPercentage) / 100).toFixed(2));
  const previousDiscounts = activeOrdersForTable.reduce((sum, o) => sum + (o.discount || 0), 0);
  
  // Total discount = loyalty points already applied + cash cashier discount
  const totalDiscount = previousDiscounts + cashDiscount;
  const grandTotal = Math.max(0, subtotal + tax - totalDiscount);

  // Generate UPI URI String
  // Format: upi://pay?pa=restaurant@upi&pn=RestaurantName&am=TotalAmount&cu=INR
  const upiString = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.restaurantName)}&am=${grandTotal.toFixed(2)}&cu=INR`;

  // Draw UPI QR Code canvas
  useEffect(() => {
    if (paymentMethod === 'UPI' && isBillDetailOpen && upiQrCanvasRef.current && grandTotal > 0) {
      QRCode.toCanvas(upiQrCanvasRef.current, upiString, {
        width: 160,
        margin: 1.5,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('UPI QR Code generation error:', err);
      });
    }
  }, [paymentMethod, isBillDetailOpen, upiString, grandTotal]);

  // Settle bill
  const handleSettleBill = async () => {
    if (!selectedTableId || activeOrdersForTable.length === 0) return;

    // 1. Mark orders as COMPLETED
    const updatedOrders = orders.map(ord => {
      if (ord.tableId === selectedTableId && ord.status !== 'COMPLETED') {
        return { 
          ...ord, 
          status: 'COMPLETED',
          discount: ord.discount + (cashDiscount / activeOrdersForTable.length), // distribute cash discount
          grandTotal: Math.max(0, ord.subtotal + ord.tax - (ord.discount + (cashDiscount / activeOrdersForTable.length)))
        } as Order;
      }
      return ord;
    });

    // 2. Set table to vacant
    const updatedTables = tables.map(t => {
      if (t.id === selectedTableId) {
        return { ...t, status: 'vacant', activeOrderId: null } as Table;
      }
      return t;
    });

    await updateState({ orders: updatedOrders, tables: updatedTables });
    setIsBillDetailOpen(false);
    setSelectedTableId(null);
    setCashDiscount(0);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Generate bill & transition status to BILLED
  const handleGenerateBill = async () => {
    if (!selectedTableId || activeOrdersForTable.length === 0) return;

    const updatedOrders = orders.map(ord => {
      if (ord.tableId === selectedTableId && ord.status === 'READY') {
        return { ...ord, status: 'BILLED' } as Order;
      }
      return ord;
    });

    await updateState({ orders: updatedOrders });
    handlePrintReceipt();
  };

  // Trigger print receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Helper to check table's occupancy status
  const getTableCardStyle = (table: Table) => {
    const activeOrd = orders.find(o => o.tableId === table.id && o.status !== 'COMPLETED' && o.status !== 'REJECTED');
    
    if (!activeOrd) {
      return 'border-green-100 bg-white hover:border-green-300 shadow-sm';
    }
    
    // Check status of active order to show alert level
    if (activeOrd.status === 'READY' || activeOrd.status === 'BILLED') {
      return 'border-green-500 bg-green-50/50 hover:bg-green-50 hover:border-green-600 shadow-md shadow-green-100 pulse-ready';
    }
    if (activeOrd.status === 'PLACED' || activeOrd.status === 'ACCEPTED_BY_KITCHEN' || activeOrd.status === 'PREPARING') {
      return 'border-amber-200 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-400 shadow-sm';
    }
    return 'border-red-100 bg-red-50/30 hover:border-red-200 shadow-sm';
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
              Staff Terminal Access PIN
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Staff PIN Code
              </label>
              <input
                type="password"
                placeholder="Enter Staff PIN"
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
    <div className="min-h-screen bg-gray-50 pb-12 font-sans select-none">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {settings?.restaurantName || 'Restaurant'} POS Terminal
            </h1>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Billing & Floor Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {tenants.length > 0 && (
            <select
              value={getActiveRestaurantId()}
              onChange={(e) => {
                localStorage.setItem('saas_restaurant_id', e.target.value);
                window.location.search = `?restaurantId=${e.target.value}`;
              }}
              className="bg-gray-100 border border-gray-200 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Floor Table Grid */}
      <main className="max-w-6xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Tables Grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800">Restaurant Floor Map</h2>
            <div className="flex gap-4 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>Vacant</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Dining</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>Served (Bill Ready)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {tables.map(table => {
              const activeOrd = orders.find(o => o.tableId === table.id && o.status !== 'COMPLETED' && o.status !== 'REJECTED');
              const isSelected = selectedTableId === table.id;

              return (
                <div 
                  key={table.id}
                  onClick={() => {
                    setSelectedTableId(table.id);
                    setIsBillDetailOpen(true);
                  }}
                  className={`border-2 rounded-2xl p-4 flex flex-col justify-between h-36 cursor-pointer transition-all ${
                    isSelected ? 'border-primary-500 ring-2 ring-primary-500/10' : getTableCardStyle(table)
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-extrabold text-base text-gray-800">{table.name}</h3>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Cap {table.capacity}
                    </span>
                  </div>

                  <div className="mt-2">
                    {activeOrd ? (
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                          {activeOrd.status}
                        </span>
                        <p className="text-sm font-black text-gray-900 mt-1">
                          {settings.currencySymbol}{activeOrd.grandTotal.toFixed(0)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-green-600">Vacant</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Billing Calculator details */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-lg flex flex-col justify-between min-h-[500px]">
          {isBillDetailOpen && selectedTable ? (
            <div className="flex flex-col grow justify-between">
              
              {/* Header Info */}
              <div>
                <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">{selectedTable.name} Bill</h2>
                    <span className="text-xs text-gray-400 font-semibold">Active Orders: {activeOrdersForTable.length}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsBillDetailOpen(false);
                      setSelectedTableId(null);
                    }}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items Breakdown list */}
                {activeOrdersForTable.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto mb-4 pr-1">
                    {activeOrdersForTable.flatMap(o => o.items).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-gray-800">{item.name} <span className="text-gray-400">×{item.quantity}</span></p>
                          {item.customizations && item.customizations.length > 0 && (
                            <span className="text-[10px] text-gray-400">{item.customizations.join(', ')}</span>
                          )}
                        </div>
                        <span className="font-bold text-gray-700">{settings.currencySymbol}{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-400">No active items for this table.</p>
                  </div>
                )}
              </div>

              {/* Bill totals and cashier discount inputs */}
              {activeOrdersForTable.length > 0 && (
                <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
                  
                  {/* Cash discount slider/input */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between mb-1.5">
                      <span>Cashier Discount ({settings.currencySymbol})</span>
                      <span className="font-extrabold text-primary-500">{settings.currencySymbol}{cashDiscount}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-gray-400" />
                      <input 
                        type="range"
                        min={0}
                        max={Math.floor(subtotal * 0.5)} // up to 50% discount max
                        value={cashDiscount}
                        onChange={e => setCashDiscount(Number(e.target.value))}
                        className="grow accent-primary-500 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Payment selector */}
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Method</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'UPI', 'Card'].map(m => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m as any)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            paymentMethod === m 
                              ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-sm' 
                              : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* UPI QR Canvas placeholder */}
                  {paymentMethod === 'UPI' && (
                    <div className="flex flex-col items-center gap-1.5 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl">
                      <canvas ref={upiQrCanvasRef} className="bg-white border border-gray-200 rounded-xl" />
                      <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-wider flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5" />
                        Scan UPI to Pay {settings.currencySymbol}{grandTotal.toFixed(0)}
                      </p>
                    </div>
                  )}

                  {/* Totals Box */}
                  <div className="bg-gray-50 p-3 rounded-2xl text-xs flex flex-col gap-1 border border-gray-100">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="font-bold text-gray-700">{settings.currencySymbol}{subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tax/GST ({settings.taxPercentage}%)</span>
                      <span className="font-bold text-gray-700">{settings.currencySymbol}{tax}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Total Discounts</span>
                        <span>-{settings.currencySymbol}{totalDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-gray-900 border-t border-gray-200/60 pt-1.5 mt-1.5">
                      <span>Total Owed</span>
                      <span>{settings.currencySymbol}{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {hasUnreadyOrders && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start gap-2.5">
                      <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                      <div>
                        <p className="text-xs font-bold text-amber-800">Kitchen Active</p>
                        <p className="text-[10px] text-amber-700 font-medium">Orders are still being prepared. Settle payment only after kitchen marks them as Ready.</p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateBill}
                      className={`p-3 rounded-xl transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                        hasUnreadyOrders ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      disabled={hasUnreadyOrders}
                      title="Print Thermal Ticket"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={handleSettleBill}
                      disabled={hasUnreadyOrders}
                      className={`grow font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        hasUnreadyOrders 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                          : 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/10'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Settle & Vacant Table
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="my-auto text-center py-20 flex flex-col items-center gap-3">
              <Users className="w-10 h-10 text-gray-300" />
              <h3 className="text-sm font-bold text-gray-400">Select an occupied table</h3>
              <p className="text-xs text-gray-500">Click any dining table on the map to construct bills.</p>
            </div>
          )}
        </div>
      </main>

      {/* THERMAL TICKET PRINT OUT LAYOUT (HIDDEN ON SCREEN, VISIBLE ON WINDOW.PRINT()) */}
      {selectedTable && activeOrdersForTable.length > 0 && (
        <div id="thermal-receipt" className="hidden">
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{settings.restaurantName}</h2>
            <p style={{ margin: '0', fontSize: '10px' }}>{settings.address}</p>
            <p style={{ margin: '0', fontSize: '10px' }}>UPI: {settings.upiId}</p>
            <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold' }}>TABLE RECEIPT</p>
            <p style={{ margin: '3px 0 0 0', fontSize: '10px' }}>{selectedTable.name} | Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed black' }}>
                <th style={{ textAlign: 'left', paddingBottom: '5px' }}>ITEM</th>
                <th style={{ textAlign: 'center', paddingBottom: '5px' }}>QTY</th>
                <th style={{ textAlign: 'right', paddingBottom: '5px' }}>AMT</th>
              </tr>
            </thead>
            <tbody>
              {activeOrdersForTable.flatMap(o => o.items).map((item, idx) => (
                <tr key={idx}>
                  <td style={{ paddingTop: '5px', paddingBottom: '5px' }}>
                    {item.name}
                    {item.customizations && item.customizations.length > 0 && (
                      <div style={{ fontSize: '9px', fontStyle: 'italic' }}>({item.customizations.join(', ')})</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', paddingTop: '5px', paddingBottom: '5px' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', paddingTop: '5px', paddingBottom: '5px' }}>{settings.currencySymbol}{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>{settings.currencySymbol}{subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'space-between' }}>
              <span>Tax ({settings.taxPercentage}%):</span>
              <span>{settings.currencySymbol}{tax}</span>
            </div>
            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'space-between', color: 'black' }}>
                <span>Discounts:</span>
                <span>-{settings.currencySymbol}{totalDiscount}</span>
              </div>
            )}
            <div style={{ borderBottom: '1px dashed black', margin: '5px 0' }}></div>
            <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
              <span>GRAND TOTAL:</span>
              <span>{settings.currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '15px' }}>
            <p style={{ margin: '0 0 5px 0' }}>Thank you for dining with us! 🙏</p>
            <p style={{ margin: '0' }}>Please scan UPI code at counter if paying online.</p>
          </div>
        </div>
      )}
    </div>
  );
}
