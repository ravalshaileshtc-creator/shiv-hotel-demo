import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;

// Initialize Firebase App on backend to sync AI chatbot orders
const firebaseConfig = {
  apiKey: "AIzaSyBmMQGivHN43yPPURpFWQFI0Ttjj4sNsWI",
  authDomain: "lumiere-dining-pos.firebaseapp.com",
  projectId: "lumiere-dining-pos",
  storageBucket: "lumiere-dining-pos.firebasestorage.app",
  messagingSenderId: "30146660396",
  appId: "1:30146660396:web:3d3d08a9a7518d63916989",
  measurementId: "G-MKH50EF089"
};

const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp);

// Initialize mock database state
let dbState = {
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
  orders: [] as any[],
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

// SSE Client list
let sseClients: any[] = [];

// Send update to all SSE clients
function broadcastUpdate() {
  const payload = JSON.stringify(dbState);
  sseClients.forEach(client => {
    client.res.write(`data: ${payload}\n\n`);
  });
}

const app = express();

app.use(cors());
app.use(express.json());

// Real-time synchronization SSE connection
app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send current state on connect
  res.write(`data: ${JSON.stringify(dbState)}\n\n`);
  
  const client = { id: Date.now(), res };
  sseClients.push(client);
  
  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== client.id);
  });
});

// API to update db state
app.post('/api/sync/update', (req, res) => {
  const { menu, tables, orders, settings, customers } = req.body;
  
  if (menu) dbState.menu = menu;
  if (tables) dbState.tables = tables;
  if (orders) dbState.orders = orders;
  if (settings) dbState.settings = settings;
  if (customers) dbState.customers = customers;
  
  broadcastUpdate();
  res.json({ success: true });
});

// Google Gemini AI chat endpoint
const placeOrderDeclaration = {
  name: 'placeOrder',
  description: 'Place an order for menu items on behalf of the customer. Use this when the customer explicitly asks to order, buy, get, or add items to their bill.',
  parameters: {
    type: 'OBJECT',
    properties: {
      items: {
        type: 'ARRAY',
        description: 'The list of menu items to order.',
        items: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'The exact name of the menu item (e.g. "Signature Lumière Burger", "Truffle Tagliatelle", "Indigo Spark", "Shrimp Caesar", "Lava Delice", "Black Truffle Fries").'
            },
            quantity: {
              type: 'INTEGER',
              description: 'The quantity of the item to order.'
            },
            notes: {
              type: 'STRING',
              description: 'Any special instructions or customization requests from the customer.'
            }
          },
          required: ['name', 'quantity']
        }
      },
      tableId: {
        type: 'STRING',
        description: 'The ID of the dining table placing the order.'
      }
    },
    required: ['items']
  }
};

function executePlaceOrder(items: any[], tableId: string) {
  if (!tableId) {
    return { success: false, error: 'Table ID is missing. Please scan a table QR code first.' };
  }

  const resolvedTableId = tableId.startsWith('table-') ? tableId : `table-${tableId}`;
  const matchedTable = dbState.tables.find(t => t.id === resolvedTableId);
  if (!matchedTable) {
    return { success: false, error: `Table "${tableId}" not found in our database.` };
  }

  const orderItems: any[] = [];
  let subtotal = 0;

  for (const item of items) {
    const menuItem = dbState.menu.find(m => 
      m.name.toLowerCase() === item.name.toLowerCase() || 
      m.name.toLowerCase().includes(item.name.toLowerCase())
    );
    if (!menuItem) {
      return { success: false, error: `Menu item "${item.name}" was not found.` };
    }
    if (!menuItem.isAvailable) {
      return { success: false, error: `"${menuItem.name}" is currently sold out.` };
    }
    
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: qty,
      notes: item.notes || '',
      customizations: []
    });
    subtotal += menuItem.price * qty;
  }

  if (orderItems.length === 0) {
    return { success: false, error: 'No valid items to order.' };
  }

  const serviceFee = parseFloat((subtotal * 0.1).toFixed(2));
  const discount = parseFloat((subtotal * 0.1).toFixed(2)); // 10% welcome discount
  const grandTotal = Math.max(0, subtotal + serviceFee - discount);

  const newOrder = {
    id: `ord-${Date.now()}`,
    restaurantId: 'lumiere-1',
    tableId: resolvedTableId,
    items: orderItems,
    subtotal,
    tax: serviceFee,
    discount,
    grandTotal,
    status: 'PLACED',
    timestamp: Date.now()
  };

  dbState.orders.push(newOrder);
  dbState.tables = dbState.tables.map(t => {
    if (t.id === resolvedTableId) {
      const updatedTable = { ...t, status: 'occupied', activeOrderId: newOrder.id };
      // Sync table state to Firestore
      setDoc(doc(firestoreDb, 'tables', resolvedTableId), updatedTable).catch(e => console.error('Server Firestore table update failed:', e));
      return updatedTable;
    }
    return t;
  }) as any[];

  // Sync order to Firestore
  setDoc(doc(firestoreDb, 'orders', newOrder.id), newOrder).catch(e => console.error('Server Firestore order write failed:', e));

  broadcastUpdate();
  return { success: true, orderId: newOrder.id };
}

// Google Gemini AI chat endpoint
app.post('/api/ai-chat', async (req, res) => {
  const { userMessage, restaurantId, tableNumber, cartItems, history } = req.body;

  let activeMenu = dbState.menu;
  let activeSettings = dbState.settings;

  if (restaurantId && firestoreDb) {
    try {
      const menuSnap = await getDocs(collection(firestoreDb, 'restaurants', restaurantId, 'menu'));
      if (!menuSnap.empty) {
        activeMenu = menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      }
      
      const settingsSnap = await getDoc(doc(firestoreDb, 'restaurants', restaurantId, 'settings', 'main'));
      if (settingsSnap.exists()) {
        activeSettings = settingsSnap.data() as any;
      }
    } catch (e) {
      console.error(`Failed to load menu/settings for restaurant ${restaurantId} from Firestore:`, e);
    }
  }

  // Construct menu text context for Gemini
  const menuText = activeMenu
    .filter(item => item.isAvailable)
    .map(item => `- ${item.name} (${item.category}, ₹${item.price}): ${item.description || ''}. Vegetarian: ${item.isVeg ? 'Yes' : 'No'}. Spicy: ${item.spicyLevel || 'Medium'}.`)
    .join('\n');

  const systemInstruction = `You are "Shiv Hotel AI Assistant", an expert AI Chef Assistant at our premium dining restaurant in Gujarat, India.
We only serve food from our available menu.

Here is our current active menu list:
${menuText}

Rules:
1. Only answer restaurant and food related questions. Never discuss other topics or recommend items not listed on the active menu.
2. Recommend available menu items based on customer taste, budget, or spice level.
3. Suggest perfect combos (e.g. Dal Fry + Jeera Rice or Paneer Butter Masala + Garlic Naan).
4. Understand Gujarati, Hindi, and English, and ALWAYS reply in the language selected by the customer.
5. If the customer wants to add/order items (e.g. "Add Paneer Pizza", "Ek lassi add karo", "I want to order paneer tikka"), populate the "addToCart" array with the exact dish name and quantity.
6. Return your response in JSON format matching the schema.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found. Returning fallback/mock response.');
    res.json({
      reply: "AI Chef temporarily unavailable. Please configure GEMINI_API_KEY in the server environment.",
      recommendedItems: [],
      addToCart: []
    });
    return;
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            reply: {
              type: "STRING",
              description: "Polite waiter response explaining dishes, answers, suggestions. Explain the menu items. Use customer's language (English, Gujarati, or Hindi)."
            },
            recommendedItems: {
              type: "ARRAY",
              items: {
                type: "STRING"
              },
              description: "Exact name of menu items recommended (e.g. ['Tava Roti', 'Paneer Butter Masala'])."
            },
            addToCart: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING", description: "Exact name of the menu item to add." },
                  quantity: { type: "INTEGER", description: "Quantity to add." }
                },
                required: ["name"]
              },
              description: "Items that the user explicitly asked to add or order."
            }
          },
          required: ["reply", "recommendedItems", "addToCart"]
        }
      }
    });

    let prompt = `${systemInstruction}\n\n`;
    if (history && history.length > 0) {
      prompt += "Conversation history:\n";
      history.forEach((h: any) => {
        prompt += `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.content}\n`;
      });
    }
    prompt += `Customer Current Cart: ${JSON.stringify(cartItems)}\nTable: ${tableNumber || 'Guest'}\nCustomer: ${userMessage}\nAssistant:`;

    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const responseText = result.response.text();
    const jsonResponse = JSON.parse(responseText);

    res.json(jsonResponse);
  } catch (error: any) {
    console.error('Gemini AI API Error:', error);
    res.json({
      reply: "AI Chef temporarily unavailable. Please try again.",
      recommendedItems: [],
      addToCart: []
    });
  }
});

// Expose legacy path pointing to the new implementation
app.post('/api/chat', async (req, res) => {
  // Map parameters to match new POST /api/ai-chat schema
  const { message, history, tableId, restaurantId } = req.body;
  req.url = '/api/ai-chat';
  req.body = {
    userMessage: message,
    restaurantId,
    tableNumber: tableId,
    cartItems: [],
    history
  };
  app.handle(req, res);
});

// Setup Vite dev server or serve static production bundle
const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(rootDir, 'dist'));

if (!isProduction) {
  import('vite').then(({ createServer }) => {
    createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    }).then(vite => {
      app.use(vite.middlewares);
    }).catch(err => {
      console.error('Vite dev server failed to start:', err);
    });
  }).catch(err => {
    console.error('Dynamic Vite import failed:', err);
  });
} else {
  // Serve production static assets
  app.use(express.static(path.resolve(rootDir, 'dist')));
  app.get('*all', (req, res, next) => {
    // Exclude API routes
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.resolve(rootDir, 'dist/index.html'));
  });
}

// Local server listener activation
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Lumière Dining server running locally on http://localhost:${PORT}`);
  });
}

export default app;
