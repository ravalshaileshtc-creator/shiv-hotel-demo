import { useState, useEffect, useRef } from 'react';
import { type Order, type Table, subscribeToState, updateState } from '../services/db';
import { 
  Volume2, 
  VolumeX, 
  Clock, 
  CheckCircle, 
  Flame, 
  Check, 
  RotateCcw,
  ChefHat,
  UtensilsCrossed
} from 'lucide-react';

export default function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const seenOrdersRef = useRef<Set<string>>(new Set());

  // Subscribe to DB state
  useEffect(() => {
    const unsubscribe = subscribeToState((state) => {
      setOrders(state.orders);
      setTables(state.tables);
    });
    return unsubscribe;
  }, []);

  // Web Audio Synth Chime
  const playNewOrderChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Multi-tone chime: Play G5 followed by C6
      const playTone = (frequency: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, start);
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(784.00, ctx.currentTime, 0.25); // G5
      playTone(1046.50, ctx.currentTime + 0.12, 0.4); // C6
    } catch (e) {
      console.warn('Audio chime blocked or failed:', e);
    }
  };

  // Web Speech TTS Announce
  const announceOrderSpeech = (tableNum: string, dishCount: number) => {
    try {
      if (!('speechSynthesis' in window)) return;
      const text = `New order received for ${tableNum}. ${dishCount} items.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.15;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech blocked or failed:', e);
    }
  };

  // Monitor incoming orders to play alerts
  useEffect(() => {
    // Collect active pending order IDs
    const pendingOrders = orders.filter(o => o.status === 'pending');
    
    let playSound = false;
    let speakTable = '';
    let dishCount = 0;
    
    pendingOrders.forEach(ord => {
      if (!seenOrdersRef.current.has(ord.id)) {
        seenOrdersRef.current.add(ord.id);
        playSound = true;
        
        const tableObj = tables.find(t => t.id === ord.tableId);
        speakTable = tableObj?.name || 'a table';
        dishCount = ord.items.reduce((s, i) => s + i.quantity, 0);
      }
    });

    // Populate seenOrders with already loaded orders on initial mount
    if (seenOrdersRef.current.size === 0 && orders.length > 0) {
      orders.forEach(o => seenOrdersRef.current.add(o.id));
      return;
    }

    if (playSound && audioEnabled) {
      playNewOrderChime();
      if (speakTable) {
        announceOrderSpeech(speakTable, dishCount);
      }
    }
  }, [orders, tables, audioEnabled]);

  // Enable audio context on gesture
  const enableAudioNotifications = () => {
    setAudioEnabled(true);
    // Play test sound
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        ctx.resume();
      }
    } catch (e) {}
    
    // Test speak
    if ('speechSynthesis' in window) {
      const text = 'Audio notifications enabled.';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 0.5;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Active kitchen orders (exclude billed/served orders)
  const activeKdsOrders = orders
    .filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
    .sort((a, b) => a.timestamp - b.timestamp); // oldest first

  // Accumulate ingredient/dish count in active queue
  const prepSummary = activeKdsOrders
    .filter(o => o.status === 'preparing')
    .reduce((summary: { [name: string]: number }, order) => {
      order.items.forEach(item => {
        summary[item.name] = (summary[item.name] || 0) + item.quantity;
      });
      return summary;
    }, {});

  // Update order status
  const transitionOrderStatus = async (orderId: string, currentStatus: Order['status']) => {
    let nextStatus: Order['status'] = 'pending';
    
    if (currentStatus === 'pending') {
      nextStatus = 'preparing';
    } else if (currentStatus === 'preparing') {
      nextStatus = 'ready';
    } else if (currentStatus === 'ready') {
      nextStatus = 'served';
    } else {
      return;
    }

    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus } as Order;
      }
      return o;
    });

    // Update active table details if status is served
    let updatedTables = tables;
    if (nextStatus === 'served') {
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        updatedTables = tables.map(t => {
          if (t.id === targetOrder.tableId) {
            return { ...t, status: 'occupied' } as Table; // Billed will be marked at cashier
          }
          return t;
        });
      }
    }

    await updateState({ orders: updatedOrders, tables: updatedTables });
  };

  // Reset status to pending for correction
  const resetOrderStatus = async (orderId: string) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'pending' } as Order;
      }
      return o;
    });
    await updateState({ orders: updatedOrders });
  };

  // Helper to format minutes elapsed
  const getMinutesElapsed = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const mins = Math.floor(diffMs / 60000);
    return mins;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      {/* Autoplay Permissions Banner */}
      {!audioEnabled && (
        <div 
          onClick={enableAudioNotifications}
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-xs px-4 py-3 flex items-center justify-between gap-2 shadow-lg animate-pulse cursor-pointer shrink-0"
        >
          <span className="flex items-center gap-2">
            <VolumeX className="w-5 h-5 shrink-0" />
            Browser blocked audio. Click here to unmute kitchen sound & voice notifications!
          </span>
          <button className="bg-slate-900 text-white rounded-lg px-3 py-1 font-bold">Unmute</button>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-xl font-black tracking-wide text-white">Shiv Resto Kitchen</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Kitchen Display System (KDS)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs bg-slate-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
            Live Connection
          </span>
          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
              audioEnabled ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Workspace Area */}
      <div className="grow flex overflow-hidden p-6 gap-6">
        
        {/* Left Side: Prep Queue Summary */}
        <div className="w-80 bg-slate-800 rounded-2xl border border-slate-700 p-5 flex flex-col justify-between shrink-0 shadow-lg">
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
              <UtensilsCrossed className="w-5 h-5 text-primary-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Preparation List</h2>
            </div>
            
            <div className="flex flex-col gap-2">
              {Object.keys(prepSummary).length > 0 ? (
                Object.entries(prepSummary).map(([name, qty]) => (
                  <div 
                    key={name} 
                    className="flex justify-between items-center bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3"
                  >
                    <span className="text-xs font-bold text-slate-200">{name}</span>
                    <span className="bg-primary-500/10 text-primary-400 font-extrabold text-sm px-3 py-1 border border-primary-500/20 rounded-lg shrink-0">
                      ×{qty}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-8">No items are currently in preparation.</p>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-700/60 text-center">
            <span className="text-2xl font-black text-white">{activeKdsOrders.length}</span>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Active Queue Orders</p>
          </div>
        </div>

        {/* Right Side: Active Order Cards Grid */}
        <div className="grow overflow-x-auto flex gap-4 pb-2 items-start h-full">
          {activeKdsOrders.map(order => {
            const table = tables.find(t => t.id === order.tableId);
            const minutes = getMinutesElapsed(order.timestamp);
            
            // Urgency color coding
            let borderStyle = 'border-slate-700 bg-slate-800';
            if (order.status === 'pending') borderStyle = 'border-red-500 bg-slate-800 shadow-lg shadow-red-500/5';
            if (order.status === 'preparing') borderStyle = 'border-amber-500 bg-slate-800 shadow-md shadow-amber-500/5';
            if (order.status === 'ready') borderStyle = 'border-green-500 bg-slate-800 shadow-sm';

            return (
              <div 
                key={order.id} 
                className={`w-72 border rounded-2xl flex flex-col justify-between max-h-[80vh] shrink-0 overflow-hidden ${borderStyle} transition-all duration-300`}
              >
                {/* Order Card Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/40">
                  <div>
                    <h3 className="text-sm font-black text-white">{table?.name || 'Table Guest'}</h3>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{order.id.slice(-6)}</span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`text-[10px] font-extrabold flex items-center gap-1 mt-0.5 ${
                      minutes > 15 ? 'text-red-400 animate-pulse' : 'text-slate-400'
                    }`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {minutes}m ago
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="grow p-4 overflow-y-auto flex flex-col gap-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col border-b border-slate-700/30 pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-extrabold text-slate-100 leading-tight">
                          {item.name}
                        </span>
                        <span className="bg-slate-700 text-white font-extrabold text-xs px-2 py-0.5 rounded-md">
                          ×{item.quantity}
                        </span>
                      </div>
                      
                      {item.customizations && item.customizations.length > 0 && (
                        <span className="text-[10px] text-primary-400 font-bold mt-1">
                          {item.customizations.join(', ')}
                        </span>
                      )}
                      {item.notes && (
                        <span className="text-[10px] text-red-400 font-bold italic mt-0.5">
                          Note: "{item.notes}"
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 border-t border-slate-700 bg-slate-900/50 flex flex-col gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => transitionOrderStatus(order.id, 'pending')}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-600/10"
                    >
                      <Flame className="w-4 h-4" />
                      Start Preparing
                    </button>
                  )}
                  
                  {order.status === 'preparing' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => resetOrderStatus(order.id)}
                        className="p-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-slate-800 flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => transitionOrderStatus(order.id, 'preparing')}
                        className="grow bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Ready
                      </button>
                    </div>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => transitionOrderStatus(order.id, 'ready')}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-green-600/10"
                    >
                      <Check className="w-4 h-4" />
                      Mark Served
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {activeKdsOrders.length === 0 && (
            <div className="mx-auto my-auto text-center py-20 flex flex-col items-center gap-3">
              <ChefHat className="w-12 h-12 text-slate-600 animate-bounce" />
              <h3 className="text-base font-bold text-slate-400">All orders are cleared!</h3>
              <p className="text-xs text-slate-500">Wait for incoming client scans.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
