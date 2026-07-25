import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc,
  getDoc,
  getDocs
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
  status: 'PLACED' | 'ACCEPTED_BY_KITCHEN' | 'PREPARING' | 'READY' | 'BILLED' | 'COMPLETED' | 'REJECTED';
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
  menu: [
    {
      id: 'm1',
      name: 'Black Truffle Fries',
      description: 'Crispy artisanal fries seasoned with shaved parmesan and fresh herbs.',
      price: 14.00,
      category: 'Starters',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHbia6SqFBy1JYdhlpiwoxutpL6ATkzeMr4e_LMgT05sH_riMmEmnXFM_lQ1zVjl453dM90gXyaWFik8_8Ra5B9kq_Xd1quvP01tL899bI7cph91GfHkj1ThOkkHUWL8dw0efTh1brp0JqbjQ31E8VMKOPYfGLbXQ8wqavHFxef7762CMSRqURMO2qLtLcRzBDKcK4N2RQ1Qi92sh45dI3woV0F-HZBl6ohprwZiyT7TDxwJcex-oHOJTkeg73CN4ZJwh7ZcrpiKA',
      isVeg: true,
      isAvailable: true,
      customizations: ['Extra Aioli', 'Less Salt']
    },
    {
      id: 'm2',
      name: 'Shrimp Caesar',
      description: 'Grilled jumbo prawns served over crisp Caesar greens with herb croutons.',
      price: 16.00,
      category: 'Starters',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdEhCXEl3ireawq8ITqPMdHoQqxtJi3TX4q6cq2JcU23gbatiDH63aH59LVH0PEvNLE58sH_Iuh6I3q5Zp92tz0Tq_8SncMcLPhDssf8dpzPYGVVFcXo7J61O9L0hvndmfmsgDLX_MLnjVUixSIkvvNg9xqTfbBx9IdMctiLgQQfAeQr7eDoNL2-mPMU5ShbshKiJ6V5hWSRsyifp1uqq0ooiCJtrE2VFt5Ts6O5mMNeZv2TQd6K4lbt_J5j1yL7QwXjV3MHAMVwQ',
      isVeg: false,
      isAvailable: true,
      customizations: ['Extra Dressing', 'No Croutons']
    },
    {
      id: 'm3',
      name: 'Signature Lumière Burger',
      description: 'Truffle-infused wagyu beef patty with aged gruyère and caramelized onions on a brioche bun.',
      price: 24.00,
      category: 'Mains',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLLK3ojOPF3rE3CpyG02w_LDVFNpzoiFmiFSoSj7i6YcgOWp3JPDcDJLbSCPrRBhdqecc8KXsCvbku6NuIb4otc-0n2S-LlRb_GMvgO1aRfSuQorKABaCSNyEMCM1XBGeYqL5f6DnfJtEHV7BWbeulpJ70lgRaDNwAKr-LBzT5qFYj6W8HokxGKcsX_z-zjqogdEREYIfdvk-45yjVTIfXLOmn5EWC7QNGqpYEsKhBeoR7phMTqkETVIuL9YIN5HfXSJXxLN2fc88',
      isVeg: false,
      isAvailable: true,
      customizations: ['Medium Rare', 'Well Done', 'No Gruyere']
    },
    {
      id: 'm4',
      name: 'Truffle Tagliatelle',
      description: 'Tagliatelle pasta tossed with wild mushrooms and a rich white truffle cream sauce.',
      price: 18.50,
      category: 'Mains',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiJPeYIuqBUl5CzH7xOmWZnWiLO3VgvwxOyd_3R4hB4oUyeY24HTImtIQMr-CmoyQmRzbdpqGbCUcbdJuDOYp4DaeZd-advsDS8YY6qwsxLBXirLluobCyPniK8lzElo2v90fyKi1N0dicR7jADgf9Ht2XCc_fdgjgJgOqnUwZ8iFWTTxpK2TbtUzXbftfdSEnogZtv9Ib69utZ_FAV9_nsjEAVOgUsOMVMHgaQMUhbBWOhyfAmEHIgKBFhVTj15TGqv3-qpSWKMI',
      isVeg: true,
      isAvailable: true,
      customizations: ['Extra Parmesan', 'Gluten Free']
    },
    {
      id: 'm5',
      name: 'Lava Delice',
      description: 'Molten chocolate lava cake made with 70% cacao, served with vanilla bean gelato.',
      price: 9.50,
      category: 'Desserts',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD41dgPpwdknAuYHMET2-dCXUEWeMfS-qxxCsimDhEr5AHF1p5hRCIwzlU_k1m-87MW0vTHR196JwW9OCErp17Dga9Su_NK2OyBOKMApBAdaiJTb5wTtjQY8qkgf7Hl3TfxozUtiGRCN7qxFxVr73heeMSBXbPolXyWf64PHDec3TRlUBFt0Qvi8E20J07dZKUY4k5H41ODi8xE1wTkhHPVAuHsnZvlPbm_P4qHtKMkJvLPpUyfz4MhhYXJGJx3cqXLT_xYZlobGo8',
      isVeg: true,
      isAvailable: true,
      customizations: ['Extra Gelato']
    },
    {
      id: 'm6',
      name: 'Indigo Spark',
      description: 'A refreshing craft cocktail of blueberry, premium gin, and fresh lime juice.',
      price: 12.00,
      category: 'Beverages',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNGU9x1EEv_D9XEPf8KlYHTl_tnKyYvYecmWNM8b_WvcFSHrC9yu04GWWhIkJ-uZWjPHWfnOMP0Xe5LYxR18mo3ItqsUO5j-Jaa2Up_s8_YZgTZ4ccjEQTWmfXxtjt1Mt4WIsxIMpf5zn66D8o6R_iHeqe2dL2hEr_nxGW_csftMCT5Wc3DEMJes0E5ofnHc0nJnhk2gDRIcOUHSyCplGtkAFtZqfTuOYR51MJGIMnalZQx_-dbkcVMQKLCgwrMzV5RCTSh0Ofc28',
      isVeg: true,
      isAvailable: true,
      customizations: ['Sweet', 'Less Gin', 'Extra Lime']
    }
  ],
  tables: [
    { id: 'table-1', name: 'Table 1', capacity: 2, status: 'vacant', activeOrderId: null },
    { id: 'table-2', name: 'Table 2', capacity: 4, status: 'vacant', activeOrderId: null },
    { id: 'table-3', name: 'Table 3', capacity: 4, status: 'vacant', activeOrderId: null },
    { id: 'table-4', name: 'Table 4', capacity: 6, status: 'vacant', activeOrderId: null },
    { id: 'table-5', name: 'Table 5', capacity: 2, status: 'vacant', activeOrderId: null },
    { id: 'table-6', name: 'Table 6', capacity: 4, status: 'vacant', activeOrderId: null },
    { id: 'table-7', name: 'Table 7', capacity: 8, status: 'vacant', activeOrderId: null },
    { id: 'table-8', name: 'Table 8', capacity: 4, status: 'vacant', activeOrderId: null }
  ],
  orders: [],
  settings: {
    restaurantName: 'Lumière Dining',
    upiId: 'lumiere@upi',
    address: '404 Luxury Avenue, Suite 10, Gourmet Heights, USA',
    logoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150',
    taxPercentage: 10,
    currencySymbol: '₹'
  },
  customers: [
    { phone: '9876543210', name: 'Arjun Sharma', points: 120 },
    { phone: '9999999999', name: 'Demo Customer', points: 500 }
  ]
};

const getFirebaseConfig = () => {
  // Always return the correct Lumiere Dining Firestore project to prevent localstorage mismatch
  return {
    apiKey: "AIzaSyBmMQGivHN43yPPURpFWQFI0Ttjj4sNsWI",
    authDomain: "lumiere-dining-pos.firebaseapp.com",
    projectId: "lumiere-dining-pos",
    storageBucket: "lumiere-dining-pos.firebasestorage.app",
    messagingSenderId: "30146660396",
    appId: "1:30146660396:web:3d3d08a9a7518d63916989",
    measurementId: "G-MKH50EF089"
  };
};

let firebaseApp: any = null;
let firestoreDb: any = null;
let isFirebaseMode = false;
let eventSource: EventSource | null = null;
let activeRestaurantId = 'lumiere-dining'; // default fallback

export const getActiveRestaurantId = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const qId = searchParams.get('restaurantId');
  if (qId) {
    localStorage.setItem('saas_restaurant_id', qId);
    activeRestaurantId = qId;
    return qId;
  }
  const savedId = localStorage.getItem('saas_restaurant_id');
  if (savedId) {
    activeRestaurantId = savedId;
    return savedId;
  }
  return activeRestaurantId;
};

export interface RestaurantTenant {
  id: string;
  name: string;
  ownerPhone: string;
  status: 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED';
  subscriptionExpiresAt: number;
  upiId: string;
  ownerPassword?: string;
  staffPassword?: string;
}

export const getRestaurantTenant = async (restaurantId: string): Promise<RestaurantTenant | null> => {
  if (isFirebaseMode && firestoreDb) {
    try {
      const tenantDoc = await getDoc(doc(firestoreDb, 'restaurants', restaurantId));
      if (tenantDoc.exists()) {
        return { id: tenantDoc.id, ...tenantDoc.data() } as RestaurantTenant;
      }
    } catch (e) {
      console.error('Failed to fetch tenant metadata:', e);
    }
  }
  // Local mock fallback for simulation
  return {
    id: restaurantId,
    name: restaurantId === 'lumiere-dining' ? 'Lumière Dining' : 'Demo Restaurant',
    ownerPhone: '9876543210',
    status: 'ACTIVE',
    subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    upiId: 'lumiere@upi'
  };
};

export const getAllRestaurantTenants = async (): Promise<RestaurantTenant[]> => {
  if (isFirebaseMode && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, 'restaurants'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as RestaurantTenant));
      if (list.length === 0) {
        const defaultTenant: RestaurantTenant = {
          id: 'lumiere-dining',
          name: 'Lumière Dining',
          ownerPhone: '9876543210',
          status: 'ACTIVE',
          subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          upiId: 'lumiere@upi'
        };
        await setDoc(doc(firestoreDb, 'restaurants', 'lumiere-dining'), defaultTenant);
        return [defaultTenant];
      }
      return list;
    } catch (e) {
      console.error('Failed to get tenants:', e);
      throw e;
    }
  }
  // Local mock list
  return [
    {
      id: 'lumiere-dining',
      name: 'Lumière Dining',
      ownerPhone: '9876543210',
      status: 'ACTIVE',
      subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      upiId: 'lumiere@upi'
    }
  ];
};

export const updateRestaurantTenant = async (tenant: RestaurantTenant) => {
  if (isFirebaseMode && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'restaurants', tenant.id), {
        name: tenant.name,
        ownerPhone: tenant.ownerPhone,
        status: tenant.status,
        subscriptionExpiresAt: tenant.subscriptionExpiresAt,
        upiId: tenant.upiId,
        ownerPassword: tenant.ownerPassword || 'owner123',
        staffPassword: tenant.staffPassword || 'staff123'
      });
    } catch (e) {
      console.error('Failed to update tenant:', e);
      throw e;
    }
  } else {
    throw new Error('Database is offline or not running in Firebase Mode.');
  }
};

const subscribers = new Set<(state: DBState) => void>();

// Initialize connection
export const initSync = () => {
  const config = getFirebaseConfig();
  getActiveRestaurantId(); // Resolve restaurant ID
  
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
      console.log('Sync Mode: Firebase Firestore (Tenant:', activeRestaurantId, ')');
      
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
  };
};

// Setup Firestore subscriptions for each collection (Tenant-isolated subcollections)
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
  onSnapshot(collection(firestoreDb, 'restaurants', activeRestaurantId, 'menu'), (snapshot) => {
    if (snapshot.empty) {
      if (activeRestaurantId === 'lumiere-dining') {
        localState.menu.forEach(item => {
          setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'menu', item.id), item);
        });
        loadedData.menu = localState.menu;
      } else {
        loadedData.menu = [];
      }
    } else {
      loadedData.menu = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
    }
    checkAndEmit();
  });

  // 2. Tables Snapshot
  onSnapshot(collection(firestoreDb, 'restaurants', activeRestaurantId, 'tables'), (snapshot) => {
    if (snapshot.empty) {
      if (activeRestaurantId === 'lumiere-dining') {
        localState.tables.forEach(table => {
          setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'tables', table.id), table);
        });
        loadedData.tables = localState.tables;
      } else {
        loadedData.tables = [];
      }
    } else {
      loadedData.tables = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Table));
    }
    checkAndEmit();
  });

  // 3. Orders Snapshot
  onSnapshot(collection(firestoreDb, 'restaurants', activeRestaurantId, 'orders'), (snapshot) => {
    loadedData.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    checkAndEmit();
  });

  // 4. Customers Snapshot
  onSnapshot(collection(firestoreDb, 'restaurants', activeRestaurantId, 'customers'), (snapshot) => {
    if (snapshot.empty) {
      if (activeRestaurantId === 'lumiere-dining') {
        localState.customers.forEach(c => {
          setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'customers', c.phone), c);
        });
        loadedData.customers = localState.customers;
      } else {
        loadedData.customers = [];
      }
    } else {
      loadedData.customers = snapshot.docs.map(d => ({ phone: d.id, ...d.data() } as Customer));
    }
    checkAndEmit();
  });

  // 5. Settings Snapshot
  onSnapshot(doc(firestoreDb, 'restaurants', activeRestaurantId, 'settings', 'main'), (snapshot) => {
    if (snapshot.exists()) {
      loadedData.settings = snapshot.data() as Settings;
      checkAndEmit();
    } else {
      getRestaurantTenant(activeRestaurantId).then(tenant => {
        const initialSettings: Settings = {
          restaurantName: tenant ? tenant.name : 'New Restaurant',
          upiId: tenant ? tenant.upiId : 'default@upi',
          address: '',
          logoUrl: '',
          taxPercentage: 5,
          currencySymbol: '₹'
        };
        setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'settings', 'main'), initialSettings);
        loadedData.settings = initialSettings;
        checkAndEmit();
      });
    }
  });
};

// Subscribe UI components to state updates
export const subscribeToState = (callback: (state: DBState) => void) => {
  subscribers.add(callback);
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

// Update State helper (writes to tenant subcollections)
export const updateState = async (partialState: Partial<DBState>) => {
  const previousState = { ...localState };

  // Optimistically update local cache
  localState = { ...localState, ...partialState } as DBState;
  notifySubscribers();

  if (isFirebaseMode && firestoreDb) {
    try {
      if (partialState.settings) {
        await setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'settings', 'main'), partialState.settings);
      }
      
      if (partialState.menu) {
        for (const item of partialState.menu) {
          const prev = previousState.menu.find(m => m.id === item.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            await setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'menu', item.id), item);
          }
        }
      }
      
      if (partialState.tables) {
        for (const item of partialState.tables) {
          const prev = previousState.tables.find(t => t.id === item.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            await setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'tables', item.id), item);
          }
        }
      }
      
      if (partialState.orders) {
        for (const item of partialState.orders) {
          const prev = previousState.orders.find(o => o.id === item.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            await setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'orders', item.id), item);
          }
        }
      }
      
      if (partialState.customers) {
        for (const item of partialState.customers) {
          const prev = previousState.customers.find(c => c.phone === item.phone);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            await setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'customers', item.phone), item);
          }
        }
      }
    } catch (e) {
      console.error('Firebase save failed:', e);
      throw e;
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

// Auto-initialize sync immediately on module load
initSync();
