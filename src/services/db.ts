import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc
} from 'firebase/firestore';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isVeg: boolean;
  isAvailable: boolean;
  customizations: string[];
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'vacant' | 'occupied' | 'billed';
  activeOrderId: string | null;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  customizations?: string[];
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'billed';
  timestamp: number;
  customerPhone?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
}

export interface Settings {
  restaurantName: string;
  upiId: string;
  address: string;
  logoUrl: string;
  taxPercentage: number;
  currencySymbol: string;
}

export interface Customer {
  phone: string;
  name: string;
  points: number;
}

export interface DBState {
  menu: MenuItem[];
  tables: Table[];
  orders: Order[];
  settings: Settings;
  customers: Customer[];
}

// Initial/default structure
let localState: DBState = {
  menu: [],
  tables: [],
  orders: [],
  settings: {
    restaurantName: 'Shiv Resto & Bar',
    upiId: 'restaurant@upi',
    address: '102, High Street Food Park, Sector 4, Mumbai, India',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150',
    taxPercentage: 18,
    currencySymbol: '₹'
  },
  customers: []
};

// Check if Firebase config is saved in localStorage
const getFirebaseConfig = () => {
  const config = localStorage.getItem('firebase_config');
  if (!config) return null;
  try {
    return JSON.parse(config);
  } catch (e) {
    return null;
  }
};

let firebaseApp: any = null;
let firestoreDb: any = null;
let isFirebaseMode = false;
let eventSource: EventSource | null = null;
const subscribers = new Set<(state: DBState) => void>();

// Initialize connection
export const initSync = () => {
  const config = getFirebaseConfig();
  
  // Clean up existing connections
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  
  if (config && config.apiKey && config.projectId) {
    try {
      if (getApps().length === 0) {
        firebaseApp = initializeApp(config);
      } else {
        firebaseApp = getApp();
      }
      firestoreDb = getFirestore(firebaseApp);
      isFirebaseMode = true;
      console.log('Sync Mode: Firebase Firestore');
      
      // Setup Firestore Real-time Subscriptions
      setupFirestoreSubscriptions();
      return;
    } catch (e) {
      console.error('Firebase initialization failed, falling back to SSE:', e);
    }
  }
  
  // Default to SSE Server Sync mode
  isFirebaseMode = false;
  setupSSESubscription();
};

// Setup SSE real-time sync
const setupSSESubscription = () => {
  const protocol = window.location.protocol;
  const host = window.location.host;
  const sseUrl = `${protocol}//${host}/api/sync/events`;
  
  eventSource = new EventSource(sseUrl);
  
  eventSource.onmessage = (event) => {
    try {
      const state = JSON.parse(event.data);
      localState = state;
      notifySubscribers();
    } catch (e) {
      console.error('Failed to parse SSE data:', e);
    }
  };
  
  eventSource.onerror = (err) => {
    console.error('SSE Error:', err);
    // SSE will automatically attempt reconnection
  };
};

// Setup Firestore subscriptions for each collection
const setupFirestoreSubscriptions = () => {
  if (!firestoreDb) return;


  const loadedData: Partial<DBState> = {};
  
  const checkAndEmit = () => {
    if (
      loadedData.menu &&
      loadedData.tables &&
      loadedData.orders &&
      loadedData.settings &&
      loadedData.customers
    ) {
      localState = {
        menu: loadedData.menu,
        tables: loadedData.tables,
        orders: loadedData.orders,
        settings: loadedData.settings,
        customers: loadedData.customers
      };
      notifySubscribers();
    }
  };

  // 1. Menu Snapshot
  onSnapshot(collection(firestoreDb, 'menu'), (snapshot) => {
    loadedData.menu = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
    checkAndEmit();
  });

  // 2. Tables Snapshot
  onSnapshot(collection(firestoreDb, 'tables'), (snapshot) => {
    loadedData.tables = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Table));
    checkAndEmit();
  });

  // 3. Orders Snapshot
  onSnapshot(collection(firestoreDb, 'orders'), (snapshot) => {
    loadedData.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    checkAndEmit();
  });

  // 4. Customers Snapshot
  onSnapshot(collection(firestoreDb, 'customers'), (snapshot) => {
    loadedData.customers = snapshot.docs.map(d => ({ phone: d.id, ...d.data() } as Customer));
    checkAndEmit();
  });

  // 5. Settings Snapshot (Single doc settings/config)
  onSnapshot(doc(firestoreDb, 'settings', 'main'), (snapshot) => {
    if (snapshot.exists()) {
      loadedData.settings = snapshot.data() as Settings;
    } else {
      // Initialize settings if empty
      loadedData.settings = localState.settings;
      setDoc(doc(firestoreDb, 'settings', 'main'), localState.settings);
    }
    checkAndEmit();
  });
};

// Subscribe UI components to state updates
export const subscribeToState = (callback: (state: DBState) => void) => {
  subscribers.add(callback);
  // Send current cache immediately
  if (localState.menu.length > 0 || localState.tables.length > 0) {
    callback(localState);
  }
  return () => {
    subscribers.delete(callback);
  };
};

const notifySubscribers = () => {
  subscribers.forEach(cb => cb(localState));
};

// Update State helper
export const updateState = async (partialState: Partial<DBState>) => {
  // Optimistically update local cache
  localState = { ...localState, ...partialState } as DBState;
  notifySubscribers();

  if (isFirebaseMode && firestoreDb) {
    try {
      if (partialState.settings) {
        await setDoc(doc(firestoreDb, 'settings', 'main'), partialState.settings);
      }
      
      if (partialState.menu) {
        for (const item of partialState.menu) {
          await setDoc(doc(firestoreDb, 'menu', item.id), item);
        }
      }
      
      if (partialState.tables) {
        for (const item of partialState.tables) {
          await setDoc(doc(firestoreDb, 'tables', item.id), item);
        }
      }
      
      if (partialState.orders) {
        for (const item of partialState.orders) {
          await setDoc(doc(firestoreDb, 'orders', item.id), item);
        }
      }
      
      if (partialState.customers) {
        for (const item of partialState.customers) {
          await setDoc(doc(firestoreDb, 'customers', item.phone), item);
        }
      }
    } catch (e) {
      console.error('Firebase save failed:', e);
    }
  } else {
    // SSE Mode - post update to Express server
    try {
      await fetch('/api/sync/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialState)
      });
    } catch (e) {
      console.error('SSE backend update failed:', e);
    }
  }
};

// Save Firebase Config
export const saveFirebaseConfig = (config: any) => {
  if (config) {
    localStorage.setItem('firebase_config', JSON.stringify(config));
  } else {
    localStorage.removeItem('firebase_config');
  }
  initSync(); // Re-initialize
};

export const getActiveFirebaseConfig = () => {
  return getFirebaseConfig();
};

export const getIsFirebaseMode = () => {
  return isFirebaseMode;
};
