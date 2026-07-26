import { useState, useEffect, useRef } from 'react';
import { type MenuItem, type Table, type Order, type Settings, type Customer, subscribeToState, updateState, getRestaurantTenant } from '../services/db';
import { 
  Search, 
  ShoppingBag, 
  MessageSquare, 
  Sparkles, 
  User, 
  X, 
  Plus, 
  Minus,
  Utensils,
  ChevronRight,
  Send,
  Loader2,
  MapPin,
  QrCode,
  Flame,
  Compass,
  Lightbulb,
  CheckCircle,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface CustomerDashboardProps {
  restaurantId: string;
  tableId: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedCustomizations: string[];
  notes: string;
}



const translations = {
  en: {
    menu: "Menu",
    scan: "Scan",
    cart: "Cart",
    status: "Status",
    vegOnly: "Veg Only",
    searchPlaceholder: "Search dishes, drinks, desserts...",
    addToCart: "Add to Cart",
    checkout: "Checkout",
    placeOrder: "Place Order",
    subtotal: "Subtotal",
    tax: "Tax",
    discount: "Discount",
    grandTotal: "Grand Total",
    orderPlaced: "Order Placed Successfully",
    orderStatusTimeline: "Order Live Status Tracking",
    placed: "Placed",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    completed: "Completed",
    welcome: "Welcome",
    scanTable: "Scan Table QR to Order",
    aiChatbot: "AI Dining Assistant",
    chatPlaceholder: "Ask me anything about the menu...",
    selectCustomization: "Customize your order",
    loyaltyPoints: "Loyalty Points",
    redeemPoints: "Redeem Points",
    applyPromo: "Promo Applied",
    tableGuest: "Table Guest",
    cartEmpty: "Your cart is empty 🥣",
    todaysSpecial: "Today's Special"
  },
  hi: {
    menu: "मेनू",
    scan: "स्कैन",
    cart: "कार्ट",
    status: "ऑर्डर स्थिति",
    vegOnly: "केवल शाकाहारी",
    searchPlaceholder: "व्यंजन, पेय, डेसर्ट खोजें...",
    addToCart: "कार्ट में जोड़ें",
    checkout: "चेकआउट",
    placeOrder: "ऑर्डर दें",
    subtotal: "उपयोग राशि",
    tax: "टैक्स",
    discount: "छूट",
    grandTotal: "कुल राशि",
    orderPlaced: "ऑर्डर सफलतापूर्वक सबमिट हुआ",
    orderStatusTimeline: "लाइव ऑर्डर ट्रैकर",
    placed: "ऑर्डर भेजा गया",
    accepted: "स्वीकार किया गया",
    preparing: "तैयार हो रहा है",
    ready: "तैयार है",
    completed: "पूरा हुआ",
    welcome: "स्वागत है",
    scanTable: "ऑर्डर करने के लिए क्यूआर कोड स्कैन करें",
    aiChatbot: "AI भोजन सहायक",
    chatPlaceholder: "मेन्यू के बारे में कुछ भी पूछें...",
    selectCustomization: "ऑर्डर कस्टमाइज़ करें",
    loyaltyPoints: "लॉयल्टी पॉइंट्स",
    redeemPoints: "पॉइंट्स का उपयोग करें",
    applyPromo: "प्रोमो कोड लागू हुआ",
    tableGuest: "टेबल अतिथि",
    cartEmpty: "आपकी कार्ट अभी खाली है 🥣",
    todaysSpecial: "आज का विशेष"
  },
  gu: {
    menu: "મેનૂ",
    scan: "સ્કેન",
    cart: "કાર્ટ",
    status: "ઓર્ડર સ્થિતિ",
    vegOnly: "ફક્ત શાકાહારી",
    searchPlaceholder: "વાનગી, પીણાં, મીઠાઈ શોધો...",
    addToCart: "કાર્ટમાં ઉમેરો",
    checkout: "ચેકઆઉટ",
    placeOrder: "ઓર્ડર કરો",
    subtotal: "પેટા સરવાળો",
    tax: "ટેક્સ",
    discount: "ડિસ્કાઉન્ટ",
    grandTotal: "કુલ ચૂકવવાપાત્ર",
    orderPlaced: "ઓર્ડર સફળતાપૂર્વક થઈ ગયો છે",
    orderStatusTimeline: "લાઈવ ઓર્ડર ટ્રેકિંગ",
    placed: "ઓર્ડર થયો",
    accepted: "સ્વીકારાયો",
    preparing: "તૈયાર થાય છે",
    ready: "તૈયાર છે",
    completed: "પૂરો થયો",
    welcome: "સ્વાગત છે",
    scanTable: "ઓર્ડર કરવા માટે ટેબલ QR સ્કેન કરો",
    aiChatbot: "AI ભોજન મદદગાર",
    chatPlaceholder: "મેનૂ વિશે કંઈ પણ પૂછો...",
    selectCustomization: "ઓર્ડર કસ્ટમાઇઝ કરો",
    loyaltyPoints: "લોયલ્ટી પોઈન્ટ્સ",
    redeemPoints: "પોઇન્ટ્સ વાપરો",
    applyPromo: "પ્રોમો કોડ લાગુ થયો",
    tableGuest: "ટેબલ મહેમાન",
    cartEmpty: "તમારું કાર્ટ ખાલી છે 🥣",
    todaysSpecial: "આજનું ખાસ"
  }
};

const CATEGORY_TRANSLATIONS: { [key: string]: string } = {
  'Cold Beverages': 'ઠંડા પીણા',
  'Mocktail': 'મોકટેલ્સ',
  'Mocktails': 'મોકટેલ્સ',
  'Starters': 'સ્ટાર્ટર્સ',
  'Pizza': 'પિઝા',
  'Soup': 'સૂપ',
  'Salad & Papad': 'શાલાડ અને પાપડ',
  'Main Course Paneer': 'મુખ્ય પનીર વાનગીઓ',
  'Main Course Veg': 'મુખ્ય શાકાહારી વાનગીઓ',
  'Rice': 'રાઇસ / ભાત',
  'Indian Bread': 'રોટલી / રોટી',
  'Desserts': 'મીઠાઈ / ડિઝર્ટ',
  'Mains': 'મુખ્ય વાનગીઓ',
  'Beverages': 'પીણાં'
};

const ITEM_TRANSLATIONS: { [key: string]: { name: string; desc?: string } } = {
  'Fresh Lime Soda': { name: 'ફ્રેશ લાઈમ સોડા', desc: 'લીંબુ અને સોડા સાથે તાજગી આપતું પીણું' },
  'Fresh Fruit Juice': { name: 'તાજા ફળોનો રસ', desc: 'મોસમી ફળોનો તાજો રસ' },
  'Cold Coffee With Ice Cream': { name: 'કોલ્ડ કોફી વિથ આઈસ્ક્રીમ', desc: 'વેનીલા આઈસ્ક્રીમ સાથે ઠંડી કોફી' },
  'Cold Coffee with Ice Cream': { name: 'કોલ્ડ કોફી વિથ આઈસ્ક્રીમ', desc: 'વેનીલા આઈસ્ક્રીમ સાથે ઠંડી કોફી' },
  'Butter Milk': { name: 'છાશ', desc: 'મસાલેદાર ઠંડી છાશ' },
  'Dry Fruit Lassi': { name: 'ડ્રાયફ્રૂટ લસ્સી', desc: 'કાજુ, બદામ અને પિસ્તા સાથે લસ્સી' },
  'Lassi': { name: 'લસ્સી', desc: 'મીઠી દહીંની લસ્સી' },
  'Milk Shake': { name: 'મિલ્ક શેક', desc: 'ટેસ્ટી મિલ્ક શેક' },
  'Fruit Punch': { name: 'ફ્રૂટ પંચ', desc: 'મિક્સ ફળો સાથે મોકટેલ' },
  'Pineapple Mint Cooler': { name: 'પાઈનેપલ મીન્ટ કુલર', desc: 'અનાનસ અને ફુદીના સાથે ઠંડુ પીણું' },
  'Luxura Special Cooler': { name: 'લક્ઝુરા સ્પેશિયલ કુલર', desc: 'અમારું ખાસ સિગ્નેચર પીણું' },
  'Blue Lagoon': { name: 'બ્લુ લગૂન', desc: 'બ્લુ ક્યુરાકાઓ ફ્લેવર્ડ મોકટેલ' },
  'Green Goddess': { name: 'ગ્રીન ગોડ્ડેસ', desc: 'તાજી જડીબુટ્ટીઓ સાથે ઠંડુ પીણું' },
  'Paneer Chilli Dry': { name: 'પનીર ચીલી ડ્રાય', desc: 'ચીલી સોસમાં સોફ્ટ પનીર સ્ટિર-ફ્રાઈડ' },
  'Vegetable Pepper Salt': { name: 'વેજીટેબલ પેપર સોલ્ટ', desc: 'મરી અને મીઠા સાથે ક્રિસ્પી શાકભાજી' },
  'Chilli Potato': { name: 'ચીલી પોટેટો', desc: 'તીખો અને મીઠો બટાકાનો નાસ્તો' },
  'Mixed Tandoori Platter': { name: 'મિક્સ તંદૂરી પ્લેટર', desc: 'વિવિધ પ્રકારની તંદૂરી વાનગીઓનો સંગ્રહ' },
  'Margherita Pizza': { name: 'માર્ગેરિટા પિઝા', desc: 'ચીઝ અને ટામેટા સોસ સાથે ક્લાસિક પિઝા' },
  'Italian Pizza': { name: 'ઇટાલિયન પિઝા', desc: 'ઇટાલિયન સીઝનિંગ અને ટોપિંગ્સ સાથે પિઝા' },
  'Mexican Pizza': { name: 'મેક્સિકન પિઝા', desc: 'તીખા સોસ અને કોર્ન સાથે મેક્સિકન સ્વાદ' },
  'Luxura Special Pizza': { name: 'લક્ઝુરા સ્પેશિયલ પિઝા', desc: 'બધી શાકભાજી અને એક્સ્ટ્રા ચીઝ સાથે સ્પેશિયલ પિઝા' },
  'Paneer Chilli Gravy': { name: 'પનીર ચીલી ગ્રેવી', desc: 'ગ્રેવી સાથે પનીર ચીલી' },
  'Veg Manchurian Gravy': { name: 'વેજ મંચુરિયન ગ્રેવી', desc: 'ચાઈનીઝ ગ્રેવીમાં મંચુરિયન બોલ્સ' },
  'Stir Fried Chinese Gravy': { name: 'સ્ટિર ફ્રાઈડ ચાઈનીઝ ગ્રેવી', desc: 'ચાઈનીઝ શૈલીની સ્વાદિષ્ટ ગ્રેવી' },
  'Dal Fry': { name: 'દાળ ફ્રાય', desc: 'તડકા વાળી ટેસ્ટી પીળી દાળ' },
  'Dal Fry + Tawa Roti Combo': { name: 'દાળ ફ્રાય + તવા રોટી કોમ્બો', desc: 'દાળ ફ્રાય અને ગરમ તવા રોટી' },
  'Jeera Rice': { name: 'જીરા રાઇસ', desc: 'જીરા અને ઘી સાથે બનાવેલ બાસમતી ચોખા' },
  'Steamed Rice': { name: 'સાદા ભાત', desc: 'ગરમાગરમ બાફેલા ચોખા' },
  'Tandoori Roti': { name: 'તંદૂરી રોટી', desc: 'તંદૂરમાં શેકેલી રોટલી' },
  'Butter Roti': { name: 'બટર રોટી', desc: 'માખણ વાળી ગરમ રોટલી' },
  'Butter Naan': { name: 'બટર નાન', desc: 'માખણ વાળું સોફ્ટ નાન' },
  'Garlic Naan': { name: 'ગાર્લિક નાન', desc: 'લસણ અને માખણ વાળું નાન' },
  'Veg Pulao': { name: 'વેજ પુલાવ', desc: 'શાકભાજી સાથે બનાવેલ ચોખા' },
  'Veg Biryani': { name: 'વેજ બિરયાની', desc: 'મસાલેદાર અને સુગંધિત બિરયાની' },
  'Gulab Jamun': { name: 'ગુલાબ જામુન', desc: 'ગરમાગરમ સ્વાદિષ્ટ ગુલાબ જામુન' },
  'Vanilla Ice Cream': { name: 'વેનીલા આઈસ્ક્રીમ', desc: 'ક્લાસિક વેનીલા ફ્લેવર' },
  'Chocolate Brownie': { name: 'ચોકલેટ બ્રાઉની', desc: 'આઈસ્ક્રીમ સાથે ગરમ બ્રાઉની' }
};

const translateCategory = (cat: string, lang: 'en' | 'hi' | 'gu') => {
  if (lang === 'gu') return CATEGORY_TRANSLATIONS[cat] || cat;
  return cat;
};

const translateItemName = (item: MenuItem, lang: 'en' | 'hi' | 'gu') => {
  if (lang === 'gu') {
    if (item.nameGujarati?.trim()) return item.nameGujarati;
    return ITEM_TRANSLATIONS[item.name]?.name || item.name;
  }
  return item.name;
};

const translateItemDesc = (item: MenuItem, lang: 'en' | 'hi' | 'gu') => {
  if (lang === 'gu') {
    if (item.descriptionGujarati?.trim()) return item.descriptionGujarati;
    return ITEM_TRANSLATIONS[item.name]?.desc || item.description;
  }
  return item.description;
};

export default function CustomerDashboard({ restaurantId, tableId }: CustomerDashboardProps) {
  // Translation States
  const [lang, setLang] = useState<'en' | 'hi' | 'gu'>((localStorage.getItem('app_lang') as any) || 'en');
  const t = (translations as any)[lang];

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'hi' : lang === 'hi' ? 'gu' : 'en';
    setLang(nextLang);
    localStorage.setItem('app_lang', nextLang);
  };

  // DB States
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings>({
    restaurantName: 'Lumière Dining',
    upiId: 'lumiere@upi',
    address: '',
    logoUrl: '',
    taxPercentage: 10,
    currencySymbol: '₹'
  });
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Tenant subscription checking states
  const [tenantStatus, setTenantStatus] = useState<'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED' | null>(null);
  const [tenantName, setTenantName] = useState<string>('Lumière Dining');

  useEffect(() => {
    const loadTenant = async () => {
      const tenant = await getRestaurantTenant(restaurantId);
      if (tenant) {
        setTenantStatus(tenant.status);
        setTenantName(tenant.name);
      } else {
        setTenantStatus('ACTIVE'); // fallback
      }
    };
    loadTenant();
  }, [restaurantId]);

  // Navigation tab: 'menu' | 'scan' | 'cart' | 'status'
  const [activeTab, setActiveTab] = useState<'menu' | 'scan' | 'cart' | 'status'>('menu');

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  // Customization Modal States
  const [customizationChoices, setCustomizationChoices] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [diningMode, setDiningMode] = useState<'Dine In' | 'Take Away'>('Dine In');
  const [applyPromoCode, setApplyPromoCode] = useState(true); // LUMIERE_WELCOME applied by default

  // Table Scan State (if no tableId is set originally in route)
  const [scannedTableId, setScannedTableId] = useState<string>(tableId || '');
  const [manualTableNumber, setManualTableNumber] = useState('');
  const [isManualTableInputOpen, setIsManualTableInputOpen] = useState(false);

  // Loyalty Program States
  const [phoneLookup, setPhoneLookup] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);

  // Chat Widget States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Namaste! 🙏 Welcome to Lumière Dining. I can recommend our signature Truffle Tagliatelle or Indigo Spark cocktail, answer dietary restrictions, or calculate pairings. What can I fetch for you?' }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load state and subscribe
  useEffect(() => {
    const unsubscribe = subscribeToState((state) => {
      setMenu(state.menu);
      setTables(state.tables);
      setOrders(state.orders);
      setSettings(state.settings);
      setCustomers(state.customers);
    });
    return unsubscribe;
  }, []);

  // Sync route param tableId
  useEffect(() => {
    if (tableId) {
      setScannedTableId(tableId);
    }
  }, [tableId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatOpen]);

  // Auto-route to scan screen if no table selected
  useEffect(() => {
    if (!scannedTableId) {
      setActiveTab('scan');
    }
  }, [scannedTableId]);

  const activeTable = tables.find(t => t.id === scannedTableId);
  const activeOrder = orders.find(o => o.tableId === scannedTableId && o.status !== 'COMPLETED' && o.status !== 'REJECTED');

  // Categories list
  const categories = ['All', 'Starters', 'Mains', 'Desserts', 'Beverages'];

  // Filtered Menu
  const filteredMenu = menu.filter(item => {
    if (!item.isAvailable) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesVeg = !vegOnly || item.isVeg;
    return matchesSearch && matchesCategory && matchesVeg;
  });

  const openCustomizationModal = (item: MenuItem) => {
    setSelectedItem(item);
    setCustomizationChoices([]);
    setItemNotes('');
    setItemQuantity(1);
  };

  const toggleCustomization = (option: string) => {
    if (customizationChoices.includes(option)) {
      setCustomizationChoices(customizationChoices.filter(c => c !== option));
    } else {
      setCustomizationChoices([...customizationChoices, option]);
    }
  };

  const addToCart = () => {
    if (!selectedItem) return;
    
    const existingIndex = cart.findIndex(c => 
      c.menuItem.id === selectedItem.id && 
      JSON.stringify(c.selectedCustomizations.sort()) === JSON.stringify(customizationChoices.sort()) &&
      c.notes === itemNotes
    );

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += itemQuantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        menuItem: selectedItem,
        quantity: itemQuantity,
        selectedCustomizations: customizationChoices,
        notes: itemNotes
      }]);
    }

    setSelectedItem(null);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  const updateCartQty = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  // Cart Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  
  // Promo code Welcome discount (10% discount)
  const promoDiscount = applyPromoCode ? parseFloat((cartSubtotal * 0.1).toFixed(2)) : 0;
  
  // Loyalty Points discount (1 point = $1)
  const maxRedeemablePoints = activeCustomer ? Math.min(activeCustomer.points, cartSubtotal - promoDiscount) : 0;
  const loyaltyPointsDiscount = redeemPoints ? maxRedeemablePoints : 0;

  const totalDiscount = promoDiscount + loyaltyPointsDiscount;
  
  // Service fee calculation (10%)
  const serviceFee = parseFloat((cartSubtotal * 0.1).toFixed(2));
  const cartGrandTotal = Math.max(0, cartSubtotal + serviceFee - totalDiscount);

  // Loyalty lookup
  const handleLoyaltyLookup = () => {
    const customer = customers.find(c => c.phone === phoneLookup);
    if (customer) {
      setActiveCustomer(customer);
    } else {
      const newCust: Customer = {
        phone: phoneLookup,
        name: `Guest (${phoneLookup.slice(-4)})`,
        points: 50
      };
      const updatedCustomers = [...customers, newCust];
      updateState({ customers: updatedCustomers });
      setActiveCustomer(newCust);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0 || !scannedTableId) return;

    try {
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        restaurantId,
        tableId: scannedTableId,
        items: cart.map(c => ({
          menuItemId: c.menuItem.id,
          name: c.menuItem.name,
          price: c.menuItem.price,
          quantity: c.quantity,
          notes: c.notes || '',
          customizations: c.selectedCustomizations || []
        })),
        subtotal: cartSubtotal,
        tax: serviceFee,
        discount: totalDiscount,
        grandTotal: cartGrandTotal,
        status: 'PLACED',
        timestamp: Date.now(),
        customerPhone: activeCustomer?.phone || ''
      };

      // Loyalty points calculations
      if (activeCustomer) {
        const updatedCustomers = customers.map(c => {
          if (c.phone === activeCustomer.phone) {
            let pts = c.points;
            if (redeemPoints) {
              pts -= maxRedeemablePoints;
            }
            pts += Math.floor(cartSubtotal * 0.1);
            return { ...c, points: pts };
          }
          return c;
        });
        await updateState({ customers: updatedCustomers });
        setActiveCustomer(updatedCustomers.find(c => c.phone === activeCustomer.phone) || null);
      }

      const updatedOrders = [...orders, newOrder];
      const updatedTables = tables.map(t => {
        if (t.id === scannedTableId) {
          return { ...t, status: 'occupied', activeOrderId: newOrder.id } as Table;
        }
        return t;
      });

      await updateState({ orders: updatedOrders, tables: updatedTables });
      setCart([]);
      setRedeemPoints(false);
      setActiveTab('status'); // transition to order status tracker!

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e: any) {
      console.error(e);
      alert(`Firebase Sync Error: ${e.message || 'Permission denied or connection issue'}.\n\nPlease check if your Firestore Database is in "Test Mode" and allows reads/writes. Go to Firebase Console > Firestore > Rules and set: "allow read, write: if true;"`);
    }
  };

  // Submit manual table scan input
  const handleManualTableSubmit = () => {
    if (!manualTableNumber.trim()) return;
    const resolvedTableId = `table-${manualTableNumber.trim()}`;
    const matchedTable = tables.find(t => t.id === resolvedTableId || t.name.toLowerCase().includes(manualTableNumber.trim().toLowerCase()));
    
    if (matchedTable) {
      setScannedTableId(matchedTable.id);
      setIsManualTableInputOpen(false);
      setManualTableNumber('');
      setActiveTab('menu');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 }
      });
    } else {
      alert('Table not found. Please enter a valid number (e.g. 1 to 8).');
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userText }]);
    setIsAiTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: chatHistory,
          tableId: scannedTableId
        })
      });
      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
      
      if (data.orderPlaced) {
        setTimeout(() => {
          setIsChatOpen(false);
          setActiveTab('status');
        }, 2500);
      }
    } catch (e) {
      console.error('Failed to chat:', e);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "I'm having a connection issue. Can you please repeat that? ☕" }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const getTimelineStage = (status: Order['status']) => {
    switch (status) {
      case 'PLACED': return 1;
      case 'ACCEPTED_BY_KITCHEN': return 2;
      case 'PREPARING': return 3;
      case 'READY': return 4;
      case 'BILLED': return 5;
      case 'COMPLETED': return 5;
      case 'REJECTED': return 0;
      default: return 1;
    }
  };

  if (tenantStatus === 'PENDING_PAYMENT' || tenantStatus === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Glowing shapes */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-red-600/10 blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-lg">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3.5 py-1.5 rounded-full inline-block">
              Subscription Inactive
            </span>
            <h1 className="text-2xl font-black text-white mt-4 tracking-tight leading-none font-display">
              {tenantName}
            </h1>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              This restaurant's ordering portal is temporarily locked. Please ask the manager or owner to settle the monthly platform subscription of <strong>₹499</strong> to restore access.
            </p>
          </div>

          <div className="w-full border-t border-slate-800 pt-4 flex flex-col gap-2 text-left text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Tenant Status:</span>
              <span className="font-bold text-red-500 uppercase">{tenantStatus}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee:</span>
              <span className="font-bold text-white">₹499 / month</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] pb-32 font-sans select-none text-slate-900 relative">
      
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-[30px] border-b border-white/40 shadow-[0px_20px_20px_0px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 overflow-hidden border border-primary-500/20 flex items-center justify-center">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings.restaurantName} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-primary-600 font-black text-sm uppercase">
                  {settings.restaurantName ? settings.restaurantName.charAt(0) : 'R'}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-base text-primary-500 tracking-tight leading-none">
                {settings.restaurantName || 'Restaurant'}
              </h1>
              <span className="text-[9px] font-bold text-primary-600 mt-0.5 block">
                {activeTable ? activeTable.name : 'Table Guest'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleLanguage}
              className="text-[10px] font-extrabold text-primary-600 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-lg hover:bg-primary-100 transition-colors"
            >
              {lang === 'en' ? 'हिंदी' : lang === 'hi' ? 'ગુજરાતી' : 'English'}
            </button>
            <button 
              onClick={() => setActiveTab('scan')}
              className="text-primary-500 hover:opacity-85 transition-opacity p-1"
              title="Scan QR Code"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-md mx-auto pt-20 px-6">
        
        {/* TAB 1: MENU CATALOG */}
        {activeTab === 'menu' && (
          <div className="flex flex-col gap-6">
            
            {/* Category Filter Chips */}
            <section className="mt-2 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#546067]" />
                <input 
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                />
              </div>

              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 grow">
                  {categories.map(cat => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2 rounded-full font-bold text-[10px] whitespace-nowrap transition-all duration-300 cursor-pointer ${
                          isActive 
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                            : 'glass-card text-[#546067]'
                        }`}
                      >
                        {translateCategory(cat, lang)}
                      </button>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => setVegOnly(!vegOnly)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border cursor-pointer font-bold text-[10px] shrink-0 transition-colors ${
                    vegOnly 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${vegOnly ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                  {t.vegOnly}
                </button>
              </div>
            </section>

            {/* Today's Special Card with Real Image */}
            {selectedCategory === 'All' && filteredMenu.length > 0 && (() => {
              const featuredItem = filteredMenu.find(item => item.price > 100) || filteredMenu[0];
              return (
                <section className="mb-6">
                  <div className="glass-card rounded-[24px] overflow-hidden relative shadow-[0px_20px_20px_0px_rgba(0,0,0,0.05)] min-h-[160px] flex items-center justify-between p-5 group transition-all duration-300 hover:scale-[1.01]">
                    <div className="z-10 w-[55%]">
                      <span className="bg-primary-500/10 text-primary-600 px-3 py-1 rounded-full text-[9px] font-bold mb-2.5 inline-block uppercase tracking-wider">
                        {t.todaysSpecial}
                      </span>
                      <h2 className="text-base font-extrabold text-slate-800 mb-1.5 leading-tight">
                        {featuredItem.name}
                      </h2>
                      <p className="text-[#546067] text-[10px] leading-relaxed line-clamp-2 mb-3">
                        {featuredItem.description}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-primary-500 font-extrabold text-sm">
                          {settings.currencySymbol}{featuredItem.price.toFixed(2)}
                        </span>
                        <button 
                          onClick={() => openCustomizationModal(featuredItem)}
                          className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-md shadow-primary-500/10 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                    </div>
                    
                    {/* Real Image of the Item */}
                    <div className="w-[40%] h-28 rounded-2xl overflow-hidden shadow-md border border-slate-100 shrink-0">
                      <img 
                        src={featuredItem.image} 
                        alt={featuredItem.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300';
                        }}
                      />
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Menu Grid */}
            <section className="grid grid-cols-2 gap-4 pb-12">
              {filteredMenu.map(item => (
                <div 
                  key={item.id} 
                  className="glass-card rounded-[24px] p-3 flex flex-col justify-between shadow-[0px_20px_20px_0px_rgba(0,0,0,0.05)] hover:scale-[1.02] transition-transform"
                >
                  <div className="h-28 w-full rounded-xl overflow-hidden mb-3.5 relative bg-slate-50 border border-slate-100">
                    <img 
                      src={item.image} 
                      alt={translateItemName(item, lang)} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                      }}
                    />
                    <span className={`absolute top-2 left-2 w-3.5 h-3.5 border rounded flex items-center justify-center bg-white ${
                      item.isVeg ? 'border-green-600' : 'border-red-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                    </span>
                  </div>

                  <div className="grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-800 mb-0.5 leading-snug line-clamp-1">{translateItemName(item, lang)}</h3>
                      <p className="text-[#546067] text-[10px] line-clamp-1 leading-normal mb-3">{translateItemDesc(item, lang)}</p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-primary-500 font-extrabold text-xs">
                        {settings.currencySymbol}{item.price.toFixed(2)}
                      </span>
                      <button 
                        onClick={() => openCustomizationModal(item)}
                        className="w-7 h-7 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors shadow-md shadow-primary-500/10 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* TAB 2: CAMERA QR SCANNER */}
        {activeTab === 'scan' && (
          <div className="relative flex flex-col items-center pt-2">
            
            {/* Mock camera view frame */}
            <div className="w-full h-96 rounded-3xl overflow-hidden relative border border-slate-200 shadow-md">
              <div 
                className="w-full h-full bg-cover bg-center opacity-85" 
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544025162-d76694265947?w=600')" }}
              ></div>
              <div className="absolute inset-0 bg-black/10"></div>
              
              {/* Laser animation */}
              <div className="scan-laser top-10"></div>
              
              {/* Central viewfinder bracket box */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 scanner-frame rounded-[24px] flex items-center justify-center relative">
                  <div className="glass-card px-4 py-2 rounded-xl text-primary-500 font-bold text-xs flex items-center gap-1.5 shadow-sm animate-pulse">
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>Scanning...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruction labels */}
            <div className="text-center mt-6">
              <h2 className="text-base font-extrabold text-slate-800">Scan Menu QR</h2>
              <p className="text-xs text-[#546067] mt-1">Align the QR code on your table within the frame.</p>
            </div>

            {/* Enter Table Number manually */}
            <div className="mt-6 w-full">
              {isManualTableInputOpen ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="E.g. 3"
                    value={manualTableNumber}
                    onChange={e => setManualTableNumber(e.target.value.replace(/\D/g, ''))}
                    className="grow px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs bg-white shadow-sm"
                  />
                  <button 
                    onClick={handleManualTableSubmit}
                    className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-4 py-2 rounded-full text-xs shadow-sm cursor-pointer"
                  >
                    Go
                  </button>
                  <button 
                    onClick={() => setIsManualTableInputOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsManualTableInputOpen(true)}
                  className="glass-card w-full py-3.5 rounded-full flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform font-bold text-xs text-primary-500 cursor-pointer shadow-sm"
                >
                  <Utensils className="w-4 h-4 text-primary-500" />
                  <span>Enter Table Number Manually</span>
                </button>
              )}
            </div>

            {/* Tips Card */}
            <section className="w-full mt-6 pb-12">
              <div className="glass-card p-5 rounded-3xl shadow-sm flex gap-4 border border-white/50">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tips for Scanning</h4>
                  <p className="text-[11px] text-[#546067] mt-1 leading-relaxed">
                    Ensure there is enough ambient lighting and hold your phone stable for a quick, automatic scan.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: YOUR CART CHECKOUT */}
        {activeTab === 'cart' && (
          <div className="flex flex-col gap-6 pb-12">
            
            {/* Loyalty Check header */}
            {!activeCustomer ? (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-amber-100/50 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
                <div className="flex gap-2.5">
                  <div className="p-2 bg-amber-100 rounded-xl flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-amber-600" /></div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Rewards Club</h3>
                    <p className="text-[10px] text-[#546067]">Verify phone to redeem points.</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <input 
                    type="tel"
                    maxLength={10}
                    placeholder="Phone"
                    value={phoneLookup}
                    onChange={e => setPhoneLookup(e.target.value.replace(/\D/g, ''))}
                    className="w-24 px-2 py-1.5 rounded-xl border border-gray-200 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  />
                  <button 
                    onClick={handleLoyaltyLookup}
                    disabled={phoneLookup.length < 10}
                    className="bg-primary-500 disabled:bg-gray-300 text-white text-[10px] px-2.5 py-1 rounded-xl font-bold hover:bg-primary-600 cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-800">{activeCustomer.name}</p>
                    <p className="text-[10px] text-green-700 font-semibold">{activeCustomer.points} Points Available</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setActiveCustomer(null); setRedeemPoints(false); }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dining Mode tabs */}
            <section className="space-y-2">
              <h2 className="text-[10px] font-bold text-[#546067] uppercase tracking-widest">Dining Mode</h2>
              <div className="glass-card p-1 rounded-2xl flex border border-white/50">
                <button 
                  onClick={() => setDiningMode('Dine In')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    diningMode === 'Dine In' 
                      ? 'bg-primary-500 text-white shadow-md' 
                      : 'text-[#546067] hover:bg-slate-100/50'
                  }`}
                >
                  Dine In
                </button>
                <button 
                  onClick={() => setDiningMode('Take Away')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    diningMode === 'Take Away' 
                      ? 'bg-primary-500 text-white shadow-md' 
                      : 'text-[#546067] hover:bg-slate-100/50'
                  }`}
                >
                  Take Away
                </button>
              </div>
            </section>

            {/* Cart list items */}
            <section className="space-y-3">
              <h2 className="text-[10px] font-bold text-[#546067] uppercase tracking-widest">Order Details</h2>
              
              {cart.length > 0 ? (
                cart.map((item, index) => (
                  <div 
                    key={index}
                    className="glass-card p-4 rounded-3xl flex gap-3 shadow-[0px_20px_20px_0px_rgba(0,0,0,0.05)] border border-white/50"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50">
                      <img src={item.menuItem.image} alt={translateItemName(item.menuItem, lang)} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-between grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-extrabold text-xs text-slate-800">{translateItemName(item.menuItem, lang)}</h3>
                          {item.selectedCustomizations.length > 0 && (
                            <p className="text-[9px] text-[#546067] font-medium mt-0.5">{item.selectedCustomizations.join(', ')}</p>
                          )}
                          {item.notes && (
                            <p className="text-[9px] text-gray-400 italic mt-0.5">"{item.notes}"</p>
                          )}
                        </div>
                        <span className="font-extrabold text-xs text-primary-500">
                          {settings.currencySymbol}{item.menuItem.price * item.quantity}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          onClick={() => updateCartQty(index, -1)}
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-primary-500 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(index, 1)}
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-primary-500 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 flex flex-col items-center gap-2">
                  <Utensils className="w-8 h-8 text-gray-300" />
                  <p className="text-xs font-bold text-gray-400">Cart is empty.</p>
                  <button 
                    onClick={() => setActiveTab('menu')}
                    className="text-xs font-bold text-primary-500 cursor-pointer"
                  >
                    Browse Menu
                  </button>
                </div>
              )}
            </section>

            {/* Promo Code section */}
            <section className="space-y-1.5">
              <h2 className="text-[10px] font-bold text-[#546067] uppercase tracking-widest">Rewards</h2>
              <div className="glass-card p-4 rounded-3xl flex items-center justify-between border border-white/50">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  <span className="font-bold text-xs text-slate-800">LUMIERE_WELCOME</span>
                </div>
                <button 
                  onClick={() => setApplyPromoCode(!applyPromoCode)}
                  className="text-primary-500 font-bold text-xs cursor-pointer hover:underline"
                >
                  {applyPromoCode ? 'Applied' : 'Apply'}
                </button>
              </div>
            </section>

            {/* Bill checkout Calculations */}
            {cart.length > 0 && (
              <section className="glass-card rounded-[32px] p-5 shadow-[0px_25px_30px_rgba(0,0,0,0.05)] border border-white/60">
                <div className="space-y-2 mb-4 border-b border-gray-100/60 pb-4">
                  <div className="flex justify-between items-center text-xs text-[#546067]">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-800">{settings.currencySymbol}{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#546067]">
                    <span>Service Fee (10%)</span>
                    <span className="font-bold text-slate-800">{settings.currencySymbol}{serviceFee.toFixed(2)}</span>
                  </div>
                  
                  {/* Applied discounts breakdown */}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-green-600">
                      <span>Promo Discount (10%)</span>
                      <span className="font-bold">-{settings.currencySymbol}{promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {activeCustomer && activeCustomer.points > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-dashed border-gray-200">
                      <label className="flex items-center gap-1.5 font-bold text-green-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={redeemPoints}
                          onChange={e => setRedeemPoints(e.target.checked)}
                          className="accent-green-600"
                        />
                        Redeem {maxRedeemablePoints} Points
                      </label>
                      <span className="font-extrabold text-green-700">-{settings.currencySymbol}{loyaltyPointsDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 text-sm font-extrabold text-slate-900">
                    <span>Total</span>
                    <span className="text-primary-500 font-black">{settings.currencySymbol}{cartGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  onClick={placeOrder}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white h-12 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.98]"
                >
                  Place Order
                  <ChevronRight className="w-4 h-4" />
                </button>
              </section>
            )}
          </div>
        )}

        {/* TAB 4: ORDER STATUS TRACKER */}
        {activeTab === 'status' && (
          <div className="flex flex-col gap-6 pb-12">
            {activeOrder ? (
              <div className="flex flex-col gap-6">
                
                {/* Order Identification Card */}
                <section>
                  <div className="glass-card rounded-3xl p-5 shadow-[0px_20px_20px_0px_rgba(0,0,0,0.05)] flex items-center gap-4 border border-white/50">
                    <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-sm text-slate-800">Order #{activeOrder.id.slice(-6).toUpperCase()}</h2>
                      <p className="text-[11px] text-[#546067] mt-0.5">Estimated arrival: 20-25 mins</p>
                    </div>
                  </div>
                </section>

                {/* Preparing Live illustration banner */}
                <section className="relative overflow-hidden h-52 rounded-3xl bg-slate-100/50 border border-slate-200/50 flex flex-col items-center justify-center p-4">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-3 animate-pulse">
                      <Flame className="w-10 h-10 text-primary-500" />
                    </div>
                    <div className="bg-primary-500 px-3.5 py-0.5 rounded-full shadow-sm">
                      <span className="text-white font-extrabold uppercase tracking-widest text-[9px]">Preparing Live</span>
                    </div>
                    <p className="text-[11px] text-primary-500 font-bold mt-3 text-center">
                      Chef is putting the final touches on your order.
                    </p>
                  </div>
                </section>

                {/* Vertical Progress Timeline */}
                <section className="relative pl-12 space-y-8 mt-2">
                  {/* Connector Line background */}
                  <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-slate-200"></div>
                  
                  {/* Connector Line active progress */}
                  <div 
                    className="absolute left-[23px] top-6 w-0.5 bg-primary-500 transition-all duration-1000"
                    style={{ 
                      height: `${Math.max(0, (getTimelineStage(activeOrder.status) - 1) * 25)}%` 
                    }}
                  ></div>

                  {/* Stage 1: Placed */}
                  <div className={`relative flex items-start ${getTimelineStage(activeOrder.status) >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="absolute -left-[41px] z-10 w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center shadow-md text-white">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">Order Placed</h3>
                      <p className="text-[10px] text-[#546067] mt-0.5">
                        Received at {new Date(activeOrder.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Stage 2: Accepted by Kitchen */}
                  <div className={`relative flex items-start ${getTimelineStage(activeOrder.status) >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`absolute -left-[41px] z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md ${
                      activeOrder.status === 'ACCEPTED_BY_KITCHEN' ? 'bg-primary-500 text-white animate-pulse' : 'bg-primary-500 text-white'
                    }`}>
                      <Utensils className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">Kitchen Accepted</h3>
                      <p className="text-[10px] text-[#546067] mt-0.5">
                        {getTimelineStage(activeOrder.status) >= 2 ? 'Confirmed by Chef' : 'Waiting for confirmation...'}
                      </p>
                    </div>
                  </div>

                  {/* Stage 3: Preparing */}
                  <div className={`relative flex items-start ${getTimelineStage(activeOrder.status) >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`absolute -left-[41px] z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md ${
                      activeOrder.status === 'PREPARING' ? 'bg-white border-2 border-primary-500 text-primary-500 animate-spin' : 'bg-primary-500 text-white'
                    }`} style={{ animationDuration: '4s' }}>
                      <Flame className="w-5 h-5" />
                    </div>
                    
                    {activeOrder.status === 'PREPARING' ? (
                      <div className="pulse-active glass-card rounded-2xl p-4 border border-primary-500/20 grow">
                        <h3 className="font-bold text-xs text-primary-500">Kitchen Preparing</h3>
                        <p className="text-[10px] text-primary-500/80 mt-0.5">Chef has started cooking your order</p>
                        
                        <div className="mt-2.5 w-full bg-primary-500/10 h-1 rounded-full overflow-hidden">
                          <div className="bg-primary-500 h-full w-2/3 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-bold text-xs text-slate-800">Kitchen Preparing</h3>
                        <p className="text-[10px] text-[#546067] mt-0.5">
                          {getTimelineStage(activeOrder.status) > 3 ? 'Cooking completed successfully' : 'Queued for preparation'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Stage 4: Ready */}
                  <div className={`relative flex items-start ${getTimelineStage(activeOrder.status) >= 4 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="absolute -left-[41px] z-10 w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">Order Ready</h3>
                      <p className="text-[10px] text-[#546067] mt-0.5">
                        {getTimelineStage(activeOrder.status) >= 4 ? 'Food is ready! Sent to cashier for billing.' : 'Waiting to be served'}
                      </p>
                    </div>
                  </div>

                  {/* Stage 5: Settle Bill */}
                  <div className={`relative flex items-start ${getTimelineStage(activeOrder.status) >= 5 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="absolute -left-[41px] z-10 w-9 h-9 rounded-full bg-slate-200 text-[#546067] flex items-center justify-center shadow-sm">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">Payment Completed</h3>
                      <p className="text-[10px] text-[#546067] mt-0.5">
                        {getTimelineStage(activeOrder.status) >= 5 ? 'Bill paid. Thank you for dining with us!' : 'Pending payment settlement'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Items Summary list */}
                <section className="mt-6 border-t border-slate-200/60 pt-6">
                  <h4 className="text-[10px] font-bold text-[#546067] mb-3 uppercase tracking-widest">Order Summary</h4>
                  <div className="space-y-2 text-xs">
                    {activeOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-slate-700">{item.quantity}x {lang === 'gu' ? (ITEM_TRANSLATIONS[item.name]?.name || item.name) : item.name}</span>
                        <span className="font-bold text-slate-800">{settings.currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="text-center py-20 flex flex-col items-center gap-2">
                <Utensils className="w-10 h-10 text-gray-300" />
                <h3 className="text-xs font-bold text-gray-400">No active orders</h3>
                <p className="text-[11px] text-gray-500">Go to Menu tab to add items and place order.</p>
                <button 
                  onClick={() => setActiveTab('menu')}
                  className="mt-2 text-xs font-bold text-primary-500"
                >
                  Browse Menu
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating AI Chat Assistant Trigger */}
      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => setIsChatOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 to-amber-500 hover:from-primary-500 hover:to-amber-400 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white"></span>
        </button>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 max-w-md mx-auto translate-x-[-50%] left-1/2">
        <div className="bg-white/70 backdrop-blur-[30px] rounded-t-xl border-t border-white/40 shadow-[0px_-10px_20px_0px_rgba(0,0,0,0.05)] flex justify-around items-center px-4 pb-6 pt-3 h-20">
          <button 
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer ${
              activeTab === 'menu' ? 'text-primary-500 font-bold' : 'text-[#546067] opacity-60'
            }`}
          >
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">{t.menu}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer ${
              activeTab === 'scan' ? 'text-primary-500 font-bold' : 'text-[#546067] opacity-60'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">{t.scan}</span>
          </button>
 
          <button 
            onClick={() => setActiveTab('cart')}
            className={`flex flex-col items-center justify-center relative transition-transform hover:scale-105 cursor-pointer ${
              activeTab === 'cart' ? 'text-primary-500 font-bold' : 'text-[#546067] opacity-60'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">{t.cart}</span>
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary-500 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white">
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </span>
            )}
          </button>
 
          <button 
            onClick={() => setActiveTab('status')}
            className={`flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer ${
              activeTab === 'status' ? 'text-primary-500 font-bold' : 'text-[#546067] opacity-60'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">{t.status}</span>
          </button>
        </div>
      </nav>

      {/* ITEM CUSTOMIZATION MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="h-44 relative bg-gray-100">
                <img 
                  src={selectedItem.image} 
                  alt={translateItemName(selectedItem, lang)} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                  }}
                />
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto grow flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 border border-gray-400 rounded flex items-center justify-center shrink-0 bg-white`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedItem.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                    </span>
                    <h2 className="text-base font-extrabold text-slate-800">{translateItemName(selectedItem, lang)}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{translateItemDesc(selectedItem, lang)}</p>
                </div>

                {selectedItem.customizations.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customizations</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.customizations.map(opt => {
                        const active = customizationChoices.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleCustomization(opt)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              active 
                                ? 'border-primary-500 bg-primary-50 text-primary-600' 
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Special Instructions</h3>
                  <textarea
                    placeholder="E.g. Extra hot, no dressing, allergy notes..."
                    value={itemNotes}
                    onChange={e => setItemNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs resize-none h-18 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50">
                <div className="flex items-center border border-gray-200 bg-white rounded-xl">
                  <button 
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                    className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-800">{itemQuantity}</span>
                  <button 
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                    className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={addToCart}
                  className="grow bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-between cursor-pointer"
                >
                  <span>Add to Order</span>
                  <span className="font-extrabold">{settings.currencySymbol}{(selectedItem.price * itemQuantity).toFixed(2)}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHATBOT DRAWER */}
      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl relative"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary-500 to-amber-500 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold">Lumière AI Assistant</h2>
                    <p className="text-[10px] text-white/80 font-medium">Chef's Helper Assistant</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grow overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50">
                {chatHistory.map((h, i) => (
                  <div 
                    key={i} 
                    className={`flex ${h.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                      h.role === 'user' 
                        ? 'bg-primary-500 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                    }`}>
                      {h.content.split('\n').map((line, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 rounded-2xl rounded-tl-none border border-gray-100 px-4 py-3 shadow-sm flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Chef is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-gray-100 flex items-center gap-2 bg-white">
                <input 
                  type="text" 
                  placeholder="Ask for recommendations, descriptions..."
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                  className="grow px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                />
                <button 
                  onClick={sendChatMessage}
                  disabled={!chatMessage.trim() || isAiTyping}
                  className="bg-primary-500 disabled:bg-gray-200 text-white p-3 rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
