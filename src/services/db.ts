import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc,
  getDoc,
  getDocs,
  deleteDoc
} from 'firebase/firestore';

export interface MenuItem {
  id: string;
  name: string;
  nameGujarati?: string; // legacy support
  description: string;
  descriptionGujarati?: string; // legacy support
  price: number;
  category: string;
  image: string;
  isVeg: boolean;
  isAvailable: boolean;
  customizations: string[];
  // Multilingual JSON fields
  nameLanguages?: {
    en: string;
    gu: string;
  };
  descLanguages?: {
    en: string;
    gu: string;
  };
  categoryLanguages?: {
    en: string;
    gu: string;
  };
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

// Initial mock constants for demo restaurant
const MOCK_MENU: MenuItem[] = [
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
    name: 'Signature Zamvo Burger',
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
];

const MOCK_TABLES: Table[] = [
  { id: 'table-1', name: 'Table 1', capacity: 2, status: 'vacant', activeOrderId: null },
  { id: 'table-2', name: 'Table 2', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 'table-3', name: 'Table 3', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 'table-4', name: 'Table 4', capacity: 6, status: 'vacant', activeOrderId: null },
  { id: 'table-5', name: 'Table 5', capacity: 2, status: 'vacant', activeOrderId: null },
  { id: 'table-6', name: 'Table 6', capacity: 4, status: 'vacant', activeOrderId: null },
  { id: 'table-7', name: 'Table 7', capacity: 8, status: 'vacant', activeOrderId: null },
  { id: 'table-8', name: 'Table 8', capacity: 4, status: 'vacant', activeOrderId: null }
];

const MOCK_CUSTOMERS: Customer[] = [
  { phone: '9876543210', name: 'Arjun Sharma', points: 120 },
  { phone: '9999999999', name: 'Demo Customer', points: 500 }
];

let localState: DBState = {
  menu: [],
  tables: [],
  orders: [],
  settings: {
    restaurantName: 'Restaurant',
    upiId: '',
    address: '',
    logoUrl: '',
    taxPercentage: 5,
    currencySymbol: '₹'
  },
  customers: []
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

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage is not accessible:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage is not writeable:', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage is not modifiable:', e);
    }
  }
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
    safeLocalStorage.setItem('saas_restaurant_id', qId);
    activeRestaurantId = qId;
    return qId;
  }
  const savedId = safeLocalStorage.getItem('saas_restaurant_id');
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
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
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
    name: restaurantId === 'lumiere-dining' ? 'Zamvo' : 'Demo Restaurant',
    ownerPhone: '9876543210',
    status: 'ACTIVE',
    subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    upiId: 'zamvo@upi'
  };
};

export const getRestaurantSettings = async (restaurantId: string): Promise<Settings | null> => {
  if (isFirebaseMode && firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'restaurants', restaurantId, 'settings', 'main'));
      if (snap.exists()) {
        return snap.data() as Settings;
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  }
  return {
    restaurantName: restaurantId === 'lumiere-dining' ? 'Zamvo' : 'Demo Restaurant',
    upiId: 'zamvo@upi',
    address: 'Demo Address',
    logoUrl: '',
    taxPercentage: 5,
    currencySymbol: '₹'
  };
};

export const getAllRestaurantTenants = async (): Promise<RestaurantTenant[]> => {
  if (isFirebaseMode && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, 'restaurants'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as RestaurantTenant));
    } catch (e) {
      console.error('Failed to get tenants:', e);
      throw e;
    }
  }
  // Local mock list
  return [];
};

export interface SaasSettings {
  upiId: string;
  upiName: string;
  monthlyPrice: number;
  qrUrl?: string;
}

export const getSaasSettings = async (): Promise<SaasSettings> => {
  if (isFirebaseMode && firestoreDb) {
    try {
      const settingsDoc = await getDoc(doc(firestoreDb, 'global', 'saas_settings'));
      if (settingsDoc.exists()) {
        return settingsDoc.data() as SaasSettings;
      }
    } catch (e) {
      console.error('Failed to fetch global saas settings:', e);
    }
  }
  return {
    upiId: 'zamvo@upi',
    upiName: 'Zamvo Platform',
    monthlyPrice: 499
  };
};

export const updateSaasSettings = async (settings: SaasSettings): Promise<void> => {
  if (isFirebaseMode && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'global', 'saas_settings'), settings);
    } catch (e) {
      console.error('Failed to update global saas settings:', e);
      throw e;
    }
  }
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

export interface UserDocument {
  name: string;
  phone: string;
  password: string;
  role: 'owner' | 'cashier' | 'kitchen' | 'waiter' | 'super_admin';
  restaurantId: string;
}

export const getUserDocument = async (phone: string): Promise<UserDocument | null> => {
  if (isFirebaseMode && firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'users', phone));
      if (snap.exists()) {
        return { phone: snap.id, ...snap.data() } as UserDocument;
      }
    } catch (e) {
      console.error('Failed to get user:', e);
    }
  }
  return null;
};

export const saveUserDocument = async (user: UserDocument) => {
  if (isFirebaseMode && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'users', user.phone), {
        name: user.name,
        password: user.password,
        role: user.role,
        restaurantId: user.restaurantId
      });
    } catch (e) {
      console.error('Failed to save user:', e);
      throw e;
    }
  } else {
    throw new Error('Database is offline or not running in Firebase Mode.');
  }
};

export const deleteUserDocument = async (phone: string) => {
  if (isFirebaseMode && firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, 'users', phone));
    } catch (e) {
      console.error('Failed to delete user:', e);
      throw e;
    }
  }
};

export const getRestaurantUsers = async (restaurantId: string): Promise<UserDocument[]> => {
  if (isFirebaseMode && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, 'users'));
      const list = snap.docs.map(d => ({ phone: d.id, ...d.data() } as UserDocument));
      return list.filter(u => u.restaurantId === restaurantId);
    } catch (e) {
      console.error('Failed to get restaurant users:', e);
      throw e;
    }
  }
  return [];
};


const subscribers = new Set<(state: DBState) => void>();

// Initialize connection
export const initSync = () => {
  const config = getFirebaseConfig();
  getActiveRestaurantId(); // Resolve restaurant ID
  
  if (activeRestaurantId === 'lumiere-dining') {
    localState = {
      menu: MOCK_MENU,
      tables: MOCK_TABLES,
      orders: [],
      settings: {
        restaurantName: 'Zamvo',
        upiId: 'zamvo@upi',
        address: '404 Luxury Avenue, Suite 10, Gourmet Heights, USA',
        logoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150',
        taxPercentage: 10,
        currencySymbol: '₹'
      },
      customers: MOCK_CUSTOMERS
    };
  } else {
    localState = {
      menu: [],
      tables: [],
      orders: [],
      settings: {
        restaurantName: 'Restaurant',
        upiId: '',
        address: '',
        logoUrl: '',
        taxPercentage: 5,
        currencySymbol: '₹'
      },
      customers: []
    };
  }
  
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

let firestoreUnsubscribes: (() => void)[] = [];

// Setup Firestore subscriptions for each collection (Tenant-isolated subcollections)
const setupFirestoreSubscriptions = () => {
  if (!firestoreDb) return;

  // Clear existing listeners
  firestoreUnsubscribes.forEach(unsub => {
    try {
      unsub();
    } catch (e) {
      console.error('Failed to unsubscribe listener:', e);
    }
  });
  firestoreUnsubscribes = [];

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
  const unsubMenu = onSnapshot(collection(firestoreDb, 'restaurants', activeRestaurantId, 'menu'), (snapshot) => {
    if (snapshot.empty) {
      if (activeRestaurantId === 'lumiere-dining') {
        MOCK_MENU.forEach(item => {
          setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'menu', item.id), item);
        });
        loadedData.menu = MOCK_MENU;
      } else {
        loadedData.menu = [];
      }
    } else {
      loadedData.menu = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
    }
    checkAndEmit();
  }, (err) => {
    console.error('Firestore Menu Snapshot Error:', err);
    loadedData.menu = [];
    checkAndEmit();
  });
  firestoreUnsubscribes.push(unsubMenu);

  // 2. Tables Snapshot
  const unsubTables = onSnapshot(collection(firestoreDb, 'restaurants', activeRestaurantId, 'tables'), (snapshot) => {
    if (snapshot.empty) {
      if (activeRestaurantId === 'lumiere-dining') {
        MOCK_TABLES.forEach(table => {
          setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'tables', table.id), table);
        });
        loadedData.tables = MOCK_TABLES;
      } else {
        loadedData.tables = [];
      }
    } else {
      loadedData.tables = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Table));
    }
    checkAndEmit();
  }, (err) => {
    console.error('Firestore Tables Snapshot Error:', err);
    loadedData.tables = [];
    checkAndEmit();
  });
  firestoreUnsubscribes.push(unsubTables);

  // 3. Orders Snapshot
  const unsubOrders = onSnapshot(collection(firestoreDb, 'restaurants', activeRestaurantId, 'orders'), (snapshot) => {
    loadedData.orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    checkAndEmit();
  }, (err) => {
    console.error('Firestore Orders Snapshot Error:', err);
    loadedData.orders = [];
    checkAndEmit();
  });
  firestoreUnsubscribes.push(unsubOrders);

  // 4. Customers Snapshot
  const unsubCustomers = onSnapshot(collection(firestoreDb, 'restaurants', activeRestaurantId, 'customers'), (snapshot) => {
    if (snapshot.empty) {
      if (activeRestaurantId === 'lumiere-dining') {
        MOCK_CUSTOMERS.forEach(c => {
          setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'customers', c.phone), c);
        });
        loadedData.customers = MOCK_CUSTOMERS;
      } else {
        loadedData.customers = [];
      }
    } else {
      loadedData.customers = snapshot.docs.map(d => ({ phone: d.id, ...d.data() } as Customer));
    }
    checkAndEmit();
  }, (err) => {
    console.error('Firestore Customers Snapshot Error:', err);
    loadedData.customers = [];
    checkAndEmit();
  });
  firestoreUnsubscribes.push(unsubCustomers);

  // 5. Settings Snapshot
  const unsubSettings = onSnapshot(doc(firestoreDb, 'restaurants', activeRestaurantId, 'settings', 'main'), (snapshot) => {
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
      }).catch(err => {
        console.error('Failed to get restaurant tenant details:', err);
        const fallbackSettings: Settings = {
          restaurantName: 'New Restaurant',
          upiId: 'default@upi',
          address: '',
          logoUrl: '',
          taxPercentage: 5,
          currencySymbol: '₹'
        };
        loadedData.settings = fallbackSettings;
        checkAndEmit();
      });
    }
  }, (err) => {
    console.error('Firestore Settings Snapshot Error:', err);
    const fallbackSettings: Settings = {
      restaurantName: 'New Restaurant',
      upiId: 'default@upi',
      address: '',
      logoUrl: '',
      taxPercentage: 5,
      currencySymbol: '₹'
    };
    loadedData.settings = fallbackSettings;
    checkAndEmit();
  });
  firestoreUnsubscribes.push(unsubSettings);
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
        for (const prev of previousState.menu) {
          if (!partialState.menu.find(m => m.id === prev.id)) {
            await deleteDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'menu', prev.id));
          }
        }
        for (const item of partialState.menu) {
          const prev = previousState.menu.find(m => m.id === item.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            await setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'menu', item.id), item);
          }
        }
      }
      
      if (partialState.tables) {
        for (const prev of previousState.tables) {
          if (!partialState.tables.find(t => t.id === prev.id)) {
            await deleteDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'tables', prev.id));
          }
        }
        for (const item of partialState.tables) {
          const prev = previousState.tables.find(t => t.id === item.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            await setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'tables', item.id), item);
          }
        }
      }
      
      if (partialState.orders) {
        for (const prev of previousState.orders) {
          if (!partialState.orders.find(o => o.id === prev.id)) {
            await deleteDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'orders', prev.id));
          }
        }
        for (const item of partialState.orders) {
          const prev = previousState.orders.find(o => o.id === item.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            await setDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'orders', item.id), item);
          }
        }
      }
      
      if (partialState.customers) {
        for (const prev of previousState.customers) {
          if (!partialState.customers.find(c => c.phone === prev.phone)) {
            await deleteDoc(doc(firestoreDb, 'restaurants', activeRestaurantId, 'customers', prev.phone));
          }
        }
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
    safeLocalStorage.setItem('firebase_config', JSON.stringify(config));
  } else {
    safeLocalStorage.removeItem('firebase_config');
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
