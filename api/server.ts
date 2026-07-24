import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;

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
    currencySymbol: '$'
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
    status: 'pending',
    timestamp: Date.now()
  };

  dbState.orders.push(newOrder);
  dbState.tables = dbState.tables.map(t => {
    if (t.id === resolvedTableId) {
      return { ...t, status: 'occupied', activeOrderId: newOrder.id };
    }
    return t;
  }) as any[];

  broadcastUpdate();
  return { success: true, orderId: newOrder.id };
}

// Google Gemini AI chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history, tableId } = req.body;
  
  // Construct menu text context for Gemini
  const menuContext = dbState.menu
    .filter(item => item.isAvailable)
    .map(item => `- ${item.name} (${item.category}, ${dbState.settings.currencySymbol}${item.price}): ${item.description}. Customization options: ${item.customizations.join(', ')}`)
    .join('\n');

  const systemPrompt = `You are a warm, extremely polite, and helpful AI Dining Assistant at "${dbState.settings.restaurantName}". 
Our restaurant details:
Address: ${dbState.settings.address}
Tax Rate: ${dbState.settings.taxPercentage}% Service Fee.
Currency: ${dbState.settings.currencySymbol}

Here is our current active menu:
${menuContext}

Guidelines:
1. Provide dish recommendations, flavor descriptions, allergy advice, dietary guidance (e.g. identify which are vegetarian/non-vegetarian), and drink pairings.
2. If asked for a recommendation, recommend actual dishes from our menu listed above. Speak highly of our Chef's specials like Truffle Tagliatelle or Signature Lumière Burger.
3. Be concise and keep formatting neat. Use emoji icons to make recommendations appetizing!
4. Always speak in first-person as a representative of the restaurant (e.g., "We offer...", "Our chef recommends...").
5. Do NOT make up menu items. Only recommend items from our actual list.
6. Important: If the customer asks to order items, buy them, or add them to their bill, invoke the "placeOrder" tool/function. Make sure you extract the correct menu names and quantities.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found, using mock agent response.');
    const userMsg = message.toLowerCase();
    let reply = '';
    
    if (userMsg.includes('hello') || userMsg.includes('hi') || userMsg.includes('hey')) {
      reply = `Hello! Welcome to **${dbState.settings.restaurantName}**! 🍽️ I am your Smart Dining Assistant. How can I help you today? I can recommend dishes, answer ingredient questions, or suggest beverage pairings!`;
    } else if (userMsg.includes('veg') || userMsg.includes('vegetarian')) {
      const vegItems = dbState.menu.filter(i => i.isVeg && i.isAvailable).map(i => `• **${i.name}** (${dbState.settings.currencySymbol}${i.price}) - *${i.description}*`).slice(0, 4).join('\n');
      reply = `We have delicious vegetarian options! Here are some of our guest favorites:\n\n${vegItems}\n\nWould you like me to pair one of these with a drink, such as our fresh **Mango Lassi**? 🥭`;
    } else if (userMsg.includes('recommend') || userMsg.includes('best') || userMsg.includes('special')) {
      reply = `I highly recommend starting with our crispy **Black Truffle Fries** 🍟 (USD 14.00) or our **Shrimp Caesar** salad 🥗 (USD 16.00), followed by the rich **Signature Lumière Burger** 🍔 (USD 24.00) or the creamy **Truffle Tagliatelle** 🍝 (USD 18.50). For dessert, the **Lava Delice** 🍫 (USD 9.50) is an absolute must-try!`;
    } else if (userMsg.includes('sweet') || userMsg.includes('dessert') || userMsg.includes('lava') || userMsg.includes('delice')) {
      reply = `To satisfy your sweet tooth, I highly recommend our **Lava Delice** 🍫 (USD 9.50) served warm with vanilla bean gelato. It is the perfect way to finish your meal!`;
    } else if (userMsg.includes('drink') || userMsg.includes('beverage') || userMsg.includes('spark')) {
      reply = `We offer refreshing beverages! You must try our **Indigo Spark** cocktail 🍸 (USD 12.00) which has blueberries, premium gin, and fresh lime juice!`;
    } else if (userMsg.includes('order') || userMsg.includes('buy') || userMsg.includes('add')) {
      // Mock order placement trigger
      const orderResult = executePlaceOrder([{ name: 'Signature Lumière Burger', quantity: 1 }], tableId || 'table-1');
      if (orderResult.success) {
        reply = `🍽️ **Mock Order Placed!**\n\nI have placed an order for **1x Signature Lumière Burger** on your table since no API key is configured. You can see it preparing now!`;
        res.json({ reply, orderPlaced: true });
      } else {
        reply = `Could not place order: ${orderResult.error}`;
        res.json({ reply });
      }
      return;
    } else {
      reply = `That sounds delightful! If you're looking for recommendations, our Chef's favorites are the creamy **Truffle Tagliatelle** or **Signature Lumière Burger** served warm. Let me know if you have any dietary restrictions or need drink pairings! 🍹`;
    }
    
    setTimeout(() => {
      res.json({ reply });
    }, 800);
    return;
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      tools: [{ functionDeclarations: [placeOrderDeclaration] }]
    });
    
    const contents = history.map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nUser request: ${message}` }]
    });

    const result = await model.generateContent({ contents });
    const response = result.response;
    
    const replyText = typeof response.text === 'function' ? response.text() : ((response as any).text || '');
    const functionCalls = typeof response.functionCalls === 'function' ? response.functionCalls() : ((response as any).functionCalls || []);

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'placeOrder') {
        const args = call.args as any;
        const targetTable = args.tableId || tableId || 'table-1';
        const orderResult = executePlaceOrder(args.items, targetTable);
        
        if (orderResult.success) {
          res.json({
            reply: `🍽️ **Order Placed via AI!**\n\nI have successfully placed the order for:\n${args.items.map((i: any) => `• ${i.quantity}x **${i.name}**`).join('\n')}\non your table! It has been sent directly to the kitchen.`,
            orderPlaced: true
          });
        } else {
          res.json({
            reply: `⚠️ I tried to place the order, but encountered an issue: ${orderResult.error}. Please confirm the dish names and table scanning!`
          });
        }
        return;
      }
    }

    res.json({ reply: replyText || "I apologize, but I'm having trouble processing that request right now. How else can I assist you with our menu?" });
  } catch (error: any) {
    console.error('Gemini AI API Error:', error);
    res.status(500).json({ error: 'Failed to generate dining recommendation.' });
  }
});

// Setup Vite dev server or serve static production bundle
const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(rootDir, 'dist'));

if (!isProduction) {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  }).then(vite => {
    app.use(vite.middlewares);
  }).catch(err => {
    console.error('Vite dev server failed to start:', err);
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
