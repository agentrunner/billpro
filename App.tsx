
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Receipt, 
  History, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft,
  Download,
  Boxes,
  MinusCircle,
  PlusCircle,
  X,
  Clock,
  IndianRupee,
  Menu,
  Bell,
  Settings,
  ArrowRight,
  TrendingUp,
  Zap,
  ShieldCheck,
  MoreVertical,
  ShoppingCart,
  ArrowUpCircle,
  PlusSquare,
  Coins,
  Activity,
  BarChart3,
  Store,
  ChevronRight,
  Info,
  Pencil,
  Trash2,
  AlertCircle,
  Tag,
  Phone
} from 'lucide-react';
import { AppData, Product, Client, Transaction, InventoryLog, Tab, UnitType } from './types.ts';
import { generateInvoicePDF } from './services/pdfService.ts';

const INITIAL_DATA: AppData = {
  inventory: [],
  inventoryLogs: [],
  clients: [],
  transactions: [],
  settings: {
    companyName: 'NexGen Solutions',
    nextBillNo: 1001
  }
};

const formatFullDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SidebarItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
    }`}
  >
    <span className={`${active ? 'text-white' : 'group-hover:text-indigo-400'} transition-colors`}>{icon}</span>
    <span className="font-semibold text-sm tracking-wide">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
  </button>
);

const Card: React.FC<{ children?: React.ReactNode; className?: string; stagger?: string }> = ({ children, className = "", stagger = "" }) => (
  <div className={`bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 animate-slide-up opacity-0 ${stagger} ${className}`}>
    {children}
  </div>
);

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('billstock_data');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modal states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showReportClientSale, setShowReportClientSale] = useState(false);
  
  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [purchaseMode, setPurchaseMode] = useState<'existing' | 'new'>('existing');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientForReport, setSelectedClientForReport] = useState<string>('');

  // Dispatch rate pre-fill logic
  const [dispatchRate, setDispatchRate] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('billstock_data', JSON.stringify(data));
  }, [data]);

  const addLog = (log: Omit<InventoryLog, 'id' | 'timestamp'>) => {
    const newLog: InventoryLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    setData(prev => ({ ...prev, inventoryLogs: [newLog, ...prev.inventoryLogs] }));
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setSelectedClientId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Handlers for Creation ---

  const handleAddProduct = (name: string, unit: UnitType, stock: number, purchaseRate: number, saleRate: number) => {
    const now = Date.now();
    const productId = crypto.randomUUID();
    const newProduct: Product = {
      id: productId,
      name,
      unit,
      currentStock: stock,
      avgPurchaseRate: purchaseRate,
      saleRate,
      createdAt: now,
      lastUpdated: now
    };

    let newTransactions = [...data.transactions];
    if (stock > 0) {
      newTransactions.unshift({
        id: crypto.randomUUID(),
        productId,
        productName: name,
        type: 'purchase',
        quantity: stock,
        rate: purchaseRate,
        total: stock * purchaseRate,
        timestamp: now
      });
      
      addLog({
        productId,
        productName: name,
        type: 'purchase',
        change: stock,
        reason: `Initial stock acquisition @ ₹${purchaseRate}`
      });
    } else {
      addLog({
        productId,
        productName: name,
        type: 'manual',
        change: 0,
        reason: 'New product registration'
      });
    }

    setData(prev => ({ 
      ...prev, 
      inventory: [...prev.inventory, newProduct],
      transactions: newTransactions
    }));
    
    setShowAddProduct(false);
  };

  const handleAddClient = (name: string, phone: string, address: string) => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      name,
      phone,
      address,
      createdAt: Date.now()
    };
    setData(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
    setShowAddClient(false);
  };

  const handlePurchase = (productId: string, quantity: number, rate: number, newName?: string, unit?: UnitType) => {
    const now = Date.now();
    let updatedInventory = [...data.inventory];
    let targetProduct: Product | undefined;

    if (purchaseMode === 'new' && newName && unit) {
      targetProduct = {
        id: crypto.randomUUID(),
        name: newName,
        unit,
        currentStock: 0,
        avgPurchaseRate: rate,
        saleRate: rate * 1.2,
        createdAt: now,
        lastUpdated: now
      };
      updatedInventory.push(targetProduct);
    } else {
      targetProduct = updatedInventory.find(p => p.id === productId);
      if (!targetProduct) return;
      
      const totalStockBefore = targetProduct.currentStock;
      const oldRate = targetProduct.avgPurchaseRate;
      const newRate = totalStockBefore + quantity > 0 
        ? ((totalStockBefore * oldRate) + (quantity * rate)) / (totalStockBefore + quantity)
        : rate;
      
      targetProduct.avgPurchaseRate = newRate;
    }

    const total = quantity * rate;
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      productId: targetProduct.id,
      productName: targetProduct.name,
      type: 'purchase',
      quantity,
      rate,
      total,
      timestamp: now
    };

    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions],
      inventory: updatedInventory.map(p => 
        p.id === targetProduct!.id ? { ...p, currentStock: p.currentStock + quantity, lastUpdated: now } : p
      )
    }));

    addLog({
      productId: targetProduct.id,
      productName: targetProduct.name,
      type: 'purchase',
      change: quantity,
      reason: `New purchase added (Rate: ₹${rate})`
    });

    setShowPurchase(false);
    setPurchaseMode('existing');
  };

  const handleDispatch = (clientId: string, productId: string, quantity: number, rate: number, customTimestamp: number) => {
    const client = data.clients.find(c => c.id === clientId);
    const product = data.inventory.find(p => p.id === productId);
    
    if (!client || !product || product.currentStock < quantity) {
      alert("Insufficient stock or invalid selection");
      return;
    }

    const billNumber = `INV-${data.settings.nextBillNo}`;
    const total = quantity * rate;
    const profit = (rate - product.avgPurchaseRate) * quantity;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      clientId,
      productId,
      productName: product.name,
      type: 'dispatch',
      quantity,
      rate,
      total,
      profit,
      billNumber,
      timestamp: customTimestamp
    };

    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions],
      inventory: prev.inventory.map(p => 
        p.id === productId ? { ...p, currentStock: p.currentStock - quantity, lastUpdated: Date.now() } : p
      ),
      settings: { ...prev.settings, nextBillNo: prev.settings.nextBillNo + 1 }
    }));

    addLog({
      productId,
      productName: product.name,
      type: 'dispatch',
      change: -quantity,
      reason: `Dispatched to client: ${client.name} (Ref: ${billNumber})`
    });

    generateInvoicePDF({
      companyName: data.settings.companyName,
      billNumber,
      client: { name: client.name, phone: client.phone, address: client.address },
      product: { name: product.name, quantity, rate, total, unit: product.unit },
      date: formatFullDate(customTimestamp)
    });
    setShowDispatch(false);
  };

  const handleClientSale = (clientId: string, productId: string, quantity: number, rate: number) => {
    const client = data.clients.find(c => c.id === clientId);
    const product = data.inventory.find(p => p.id === productId);
    if (!client || !product) return;

    const clientStock = data.transactions
      .filter(t => t.clientId === clientId && t.productId === productId)
      .reduce((acc, t) => acc + (t.type === 'dispatch' ? t.quantity : t.type === 'client_sale' ? -t.quantity : 0), 0);

    if (clientStock < quantity) {
      alert("Client does not have enough stock to fulfill this sale.");
      return;
    }

    const total = quantity * rate;
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      clientId,
      productId,
      productName: product.name,
      type: 'client_sale',
      quantity,
      rate,
      total,
      timestamp: Date.now()
    };

    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions]
    }));

    setShowReportClientSale(false);
  };

  const handleUpdateProduct = (id: string, name: string, unit: UnitType, stock: number, purchaseRate: number, saleRate: number) => {
    setData(prev => {
      const product = prev.inventory.find(p => p.id === id);
      if (!product) return prev;
      
      const stockDiff = stock - product.currentStock;
      if (stockDiff !== 0) {
        addLog({
          productId: id,
          productName: name,
          type: 'manual',
          change: stockDiff,
          reason: `Manual stock edit from ${product.currentStock} to ${stock}`
        });
      }

      return {
        ...prev,
        inventory: prev.inventory.map(p => 
          p.id === id ? { ...p, name, unit, currentStock: stock, avgPurchaseRate: purchaseRate, saleRate, lastUpdated: Date.now() } : p
        )
      };
    });
    setEditingProduct(null);
  };

  const handleUpdateClient = (id: string, name: string, phone: string, address: string) => {
    setData(prev => ({
      ...prev,
      clients: prev.clients.map(c => 
        c.id === id ? { ...c, name, phone, address } : c
      )
    }));
    setEditingClient(null);
  };

  const handleUpdateTransaction = (id: string, clientId: string, productId: string, quantity: number, rate: number) => {
    setData(prev => {
      const trans = prev.transactions.find(t => t.id === id);
      if (!trans) return prev;
      
      const product = prev.inventory.find(p => p.id === productId);
      const diff = quantity - trans.quantity;
      
      let updatedInventory = prev.inventory;
      if (product) {
        if (trans.type === 'dispatch') {
          updatedInventory = prev.inventory.map(p => 
            p.id === productId ? { ...p, currentStock: p.currentStock - diff } : p
          );
        } else if (trans.type === 'purchase') {
          updatedInventory = prev.inventory.map(p => 
            p.id === productId ? { ...p, currentStock: p.currentStock + diff } : p
          );
        }
      }

      const updatedTrans: Transaction = {
        ...trans,
        clientId,
        productId,
        productName: product?.name || trans.productName,
        quantity,
        rate,
        total: quantity * rate,
        profit: trans.type === 'dispatch' && product 
          ? (rate - product.avgPurchaseRate) * quantity 
          : trans.profit
      };

      return {
        ...prev,
        inventory: updatedInventory,
        transactions: prev.transactions.map(t => t.id === id ? updatedTrans : t)
      };
    });
    setEditingTransaction(null);
  };

  const updateProductStock = (id: string, change: number, reason: string) => {
    const now = Date.now();
    setData(prev => {
      const product = prev.inventory.find(p => p.id === id);
      if (!product) return prev;
      
      const newInventory = prev.inventory.map(p => 
        p.id === id ? { ...p, currentStock: Math.max(0, p.currentStock + change), lastUpdated: now } : p
      );

      addLog({
        productId: id,
        productName: product.name,
        type: 'manual',
        change,
        reason
      });

      return { ...prev, inventory: newInventory };
    });
  };

  const clientPerformance = useMemo(() => {
    return data.clients.map(client => {
      const clientTransactions = data.transactions.filter(t => t.clientId === client.id);
      const stockProvided = clientTransactions.filter(t => t.type === 'dispatch');
      const salesMade = clientTransactions.filter(t => t.type === 'client_sale');

      const stockSummary = data.inventory.map(p => {
        const provided = stockProvided.filter(t => t.productId === p.id).reduce((acc, t) => acc + t.quantity, 0);
        const sold = salesMade.filter(t => t.productId === p.id).reduce((acc, t) => acc + t.quantity, 0);
        return {
          productId: p.id,
          name: p.name,
          provided,
          sold,
          inHand: provided - sold,
          unit: p.unit
        };
      }).filter(s => s.provided > 0);

      const totalRevenue = salesMade.reduce((acc, t) => acc + (t.total || 0), 0);
      const totalUnitsSold = salesMade.reduce((acc, t) => acc + t.quantity, 0);
      const totalUnitsProvided = stockProvided.reduce((acc, t) => acc + t.quantity, 0);

      return {
        ...client,
        stockSummary,
        totalRevenue,
        totalUnitsSold,
        totalUnitsProvided,
        salesEfficiency: totalUnitsProvided > 0 ? (totalUnitsSold / totalUnitsProvided) * 100 : 0,
        recentActivity: clientTransactions.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5)
      };
    });
  }, [data]);

  const selectedClient = useMemo(() => 
    clientPerformance.find(c => c.id === selectedClientId),
  [clientPerformance, selectedClientId]);

  const renderContent = () => {
    if (selectedClientId && selectedClient) {
      return (
        <div className="space-y-8 animate-slide-up">
           <button 
             onClick={() => setSelectedClientId(null)}
             className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:gap-3 transition-all"
           >
             <ArrowDownLeft size={16} /> Back to Directory
           </button>

           <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-500 rounded-[28px] flex items-center justify-center font-black text-3xl shadow-lg relative group">
                   {selectedClient.name.charAt(0).toUpperCase()}
                   <button 
                     onClick={(e) => { e.stopPropagation(); setEditingClient(selectedClient); }}
                     className="absolute -bottom-1 -right-1 w-8 h-8 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <Pencil size={14} />
                   </button>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black tracking-tight">{selectedClient.name}</h2>
                    <button onClick={() => setEditingClient(selectedClient)} className="p-2 text-indigo-400 hover:text-white transition-colors">
                      <Pencil size={18} />
                    </button>
                  </div>
                  <p className="text-indigo-300 font-bold text-sm mt-1">{selectedClient.phone} • {selectedClient.address}</p>
                </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => { setSelectedClientForReport(selectedClient.id); setShowReportClientSale(true); }} className="px-6 py-3 bg-white text-slate-900 font-black rounded-2xl text-sm shadow-xl hover:bg-slate-50 transition-colors">Report Sale</button>
                 <button onClick={() => { setPurchaseMode('existing'); setShowDispatch(true); }} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl text-sm shadow-xl hover:bg-indigo-700 transition-colors">Dispatch Stock</button>
              </div>
           </header>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Efficiency</p>
                <div className="flex items-baseline gap-2 mt-2">
                   <h3 className="text-3xl font-black">{selectedClient.salesEfficiency.toFixed(1)}%</h3>
                </div>
                <div className="mt-4 w-full bg-slate-100 h-1 rounded-full">
                  <div className="bg-emerald-500 h-full rounded-full" style={{width: `${selectedClient.salesEfficiency}%`}} />
                </div>
              </Card>
              <Card className="p-6">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Retail Revenue</p>
                <h3 className="text-3xl font-black mt-2">₹{selectedClient.totalRevenue.toLocaleString()}</h3>
              </Card>
              <Card className="p-6">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Units Sold</p>
                <h3 className="text-3xl font-black mt-2">{selectedClient.totalUnitsSold}</h3>
              </Card>
              <Card className="p-6">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Stock Balance</p>
                <h3 className="text-3xl font-black mt-2">{selectedClient.totalUnitsProvided - selectedClient.totalUnitsSold}</h3>
              </Card>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card className="p-0 overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                       <Boxes size={18} className="text-indigo-600" /> Stock In-Hand at Client Site
                    </h4>
                  </div>
                  <div className="p-6">
                    <table className="w-full text-left">
                      <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="pb-4">Product</th>
                          <th className="pb-4">Provided</th>
                          <th className="pb-4">Sold</th>
                          <th className="pb-4 text-right">In-Hand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedClient.stockSummary.map(ss => (
                          <tr key={ss.productId} className="group hover:bg-slate-50 transition-colors">
                            <td className="py-4 font-bold text-slate-900">{ss.name}</td>
                            <td className="py-4 text-slate-500 font-semibold">{ss.provided}</td>
                            <td className="py-4 text-emerald-600 font-bold">{ss.sold}</td>
                            <td className="py-4 text-right">
                              <span className={`font-black ${ss.inHand < 5 ? 'text-rose-600' : 'text-slate-900'}`}>{ss.inHand} {ss.unit}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                    <h4 className="font-black text-slate-900">Recent Transactions</h4>
                  </div>
                  <div className="p-4 space-y-2">
                    {selectedClient.recentActivity.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'dispatch' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {t.type === 'dispatch' ? <ArrowUpRight size={18} /> : <BarChart3 size={18} />}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">{t.productName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {t.type === 'dispatch' ? 'Dispatch' : 'Client Sale'} • {formatFullDate(t.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-black ${t.type === 'dispatch' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                              {t.type === 'dispatch' ? '+' : '-'}{t.quantity}
                            </p>
                          </div>
                          <button onClick={() => setEditingTransaction(t)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 transition-all">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="space-y-8">
                <Card className="p-8 bg-indigo-50 border-none">
                  <Info className="text-indigo-600 mb-4" size={24} />
                  <h4 className="font-black text-slate-900 text-lg">Inventory Tracking</h4>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed font-medium">
                    This client is currently managing <span className="text-indigo-600 font-black">{selectedClient.stockSummary.length} products</span>. 
                    Site balances update instantly with reports.
                  </p>
                </Card>
              </div>
           </div>
        </div>
      );
    }

    switch (activeTab) {
      case Tab.Dashboard:
        const totalSales = data.transactions
          .filter(t => t.type === 'dispatch')
          .reduce((acc, t) => acc + (t.total || 0), 0);
        const totalProfit = data.transactions
          .filter(t => t.type === 'dispatch')
          .reduce((acc, t) => acc + (t.profit || 0), 0);
        const totalSpend = data.transactions
          .filter(t => t.type === 'purchase')
          .reduce((acc, t) => acc + (t.total || 0), 0);
        const totalClientRevenue = data.transactions
          .filter(t => t.type === 'client_sale')
          .reduce((acc, t) => acc + (t.total || 0), 0);

        return (
          <div className="space-y-10 animate-slide-up">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                     <ShieldCheck size={12} /> Enterprise Ready
                   </span>
                   <span className="text-slate-300">•</span>
                   <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Overview</h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedClientForReport(''); setShowReportClientSale(true); }} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">
                  <Activity size={18} /> Report Client Sale
                </button>
                <button onClick={() => { setPurchaseMode('existing'); setShowPurchase(true); }} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm shadow-xl shadow-violet-200 hover:bg-violet-700 transition-all">
                  <ShoppingCart size={18} /> Record Purchase
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 border-none group overflow-hidden relative shadow-lg shadow-indigo-100" stagger="stagger-1">
                <div className="relative z-10 text-white">
                  <p className="text-indigo-100/70 text-xs font-black uppercase tracking-[0.2em]">Gross Sales</p>
                  <h3 className="text-3xl font-black mt-2">₹{totalSales.toLocaleString('en-IN')}</h3>
                </div>
              </Card>

              <Card className="p-8 bg-gradient-to-br from-emerald-500 to-emerald-700 border-none group overflow-hidden relative shadow-lg shadow-emerald-200" stagger="stagger-2">
                <div className="relative z-10 text-white">
                  <p className="text-emerald-100/70 text-xs font-black uppercase tracking-[0.2em]">Net Profit</p>
                  <h3 className="text-3xl font-black mt-2 leading-none">₹{totalProfit.toLocaleString('en-IN')}</h3>
                </div>
              </Card>

              <Card className="p-8 bg-gradient-to-br from-amber-500 to-amber-600 border-none group overflow-hidden relative shadow-lg shadow-amber-200" stagger="stagger-3">
                 <div className="relative z-10 text-white">
                  <p className="text-amber-100/70 text-xs font-black uppercase tracking-[0.2em]">Market Reach</p>
                  <h3 className="text-3xl font-black mt-2">₹{totalClientRevenue.toLocaleString('en-IN')}</h3>
                </div>
              </Card>

              <Card className="p-8 border-slate-100 group" stagger="stagger-4">
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Asset Spend</p>
                <h3 className="text-3xl font-black text-slate-900 mt-2">₹{totalSpend.toLocaleString('en-IN')}</h3>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <Card className="lg:col-span-3 p-0 overflow-hidden border-none" stagger="stagger-3">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    Primary Dispatch History
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {data.transactions.filter(t => t.type === 'dispatch').slice(0, 6).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-5 hover:bg-slate-50 rounded-[20px] transition-all border border-transparent hover:border-slate-100 group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center transition-all group-hover:bg-emerald-600 group-hover:text-white">
                          <ArrowUpRight size={20} />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-base">{t.productName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.billNumber} • {formatFullDate(t.timestamp)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-black text-lg text-slate-800">₹{t.total?.toLocaleString()}</p>
                          <p className="text-[11px] text-emerald-600 font-black mt-0.5">Profit: ₹{t.profit?.toLocaleString()}</p>
                        </div>
                        <button onClick={() => setEditingTransaction(t)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600">
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-2 p-0 overflow-hidden border-none" stagger="stagger-4">
                <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-rose-600 rounded-full"></div>
                    Stock Overview
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  {data.inventory.slice(0, 5).map(p => (
                    <div key={p.id} className="p-5 border border-slate-50 rounded-[20px] hover:bg-slate-50 transition-all flex items-center justify-between group">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-black text-slate-800">{p.name}</h4>
                          <span className="text-[10px] font-black text-indigo-500 uppercase">Cost: ₹{p.avgPurchaseRate.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${p.currentStock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, p.currentStock)}%` }} />
                        </div>
                        <p className="mt-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">{p.currentStock} {p.unit} in hand</p>
                      </div>
                      <button onClick={() => setEditingProduct(p)} className="opacity-0 group-hover:opacity-100 ml-4 p-2 text-slate-400 hover:text-indigo-600 transition-all">
                        <Pencil size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        );

      case Tab.Inventory:
        return (
          <div className="space-y-8 animate-slide-up">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inventory</h2>
                <p className="text-slate-500 font-medium">Global stock management</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddProduct(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-xl shadow-indigo-100 active:scale-95"
                >
                  <Plus size={20} /> Register Product
                </button>
              </div>
            </header>

            <Card className="overflow-hidden border-none shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-900 text-white uppercase tracking-wider text-[11px] font-black">
                    <tr>
                      <th className="px-8 py-5">Product Name</th>
                      <th className="px-8 py-5">Current Stock</th>
                      <th className="px-8 py-5">Purchase Cost (₹)</th>
                      <th className="px-8 py-5">Sale Rate (₹)</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.inventory.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-5">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{p.unit}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-4 py-1.5 rounded-full font-black text-xs ${p.currentStock > 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {p.currentStock}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-slate-600 font-black text-sm">₹{p.avgPurchaseRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-8 py-5 text-indigo-600 font-black text-sm">₹{p.saleRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-8 py-5">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => updateProductStock(p.id, 1, 'Quick add')} className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><PlusCircle size={18} /></button>
                            <button onClick={() => setEditingProduct(p)} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Pencil size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      case Tab.ClientSales:
        return (
          <div className="space-y-8 animate-slide-up">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Secondary Sales</h2>
              </div>
              <button 
                onClick={() => { setSelectedClientForReport(''); setShowReportClientSale(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-xl shadow-indigo-100 active:scale-95"
              >
                <Plus size={20} /> Report Sale
              </button>
            </header>

            <div className="grid grid-cols-1 gap-8">
              {clientPerformance.map((client) => (
                <Card key={client.id} className="p-0 overflow-hidden border-none cursor-pointer hover:border-indigo-500 transition-all" onClick={() => setSelectedClientId(client.id)}>
                  <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center font-black text-2xl">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-black flex items-center gap-2">{client.name} <ChevronRight size={18} className="text-indigo-400" /></h3>
                      </div>
                    </div>
                    <div className="flex gap-10">
                      <div className="text-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-tighter">Units Sold</p>
                        <p className="text-xl font-black">{client.totalUnitsSold}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-tighter">Perf. Index</p>
                        <p className="text-xl font-black">{client.salesEfficiency.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case Tab.Clients:
        return (
          <div className="space-y-8 animate-slide-up">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Clients</h2>
                <p className="text-slate-500 font-medium">Customer database</p>
              </div>
              <button onClick={() => setShowAddClient(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-xl shadow-indigo-100 active:scale-95">
                <Plus size={20} /> Register Client
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {clientPerformance.map((c, i) => (
                <Card key={c.id} className="p-7 border-none group cursor-pointer hover:bg-slate-50 transition-all" onClick={() => setSelectedClientId(c.id)} stagger={`stagger-${(i % 4) + 1}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[22px] flex items-center justify-center font-black text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-xl leading-tight">{c.name}</h3>
                        <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">Active Partner</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingClient(c); }}
                      className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
                  <div className="space-y-4 pt-5 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-sm text-slate-600 font-semibold">
                      <Phone size={16} className="text-slate-400" /> {c.phone}
                    </div>
                    <div className="flex items-start gap-3 text-sm text-slate-600 font-semibold">
                      <Store size={16} className="text-slate-400 shrink-0" /> <span className="line-clamp-2">{c.address}</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-50 flex justify-between items-center">
                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Efficiency: {c.salesEfficiency.toFixed(0)}%</div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-all" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case Tab.Billing:
        return (
          <div className="space-y-8 animate-slide-up">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Invoices</h2>
                <p className="text-slate-500 font-medium">Primary sales history</p>
              </div>
              <button onClick={() => setShowDispatch(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-xl shadow-emerald-100 active:scale-95">
                <Receipt size={20} /> Create Invoice
              </button>
            </header>

            <Card className="overflow-hidden border-none shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-900 text-white uppercase tracking-wider text-[11px] font-black">
                    <tr>
                      <th className="px-8 py-5">Invoice ID</th>
                      <th className="px-8 py-5">Client</th>
                      <th className="px-8 py-5">Product Details</th>
                      <th className="px-8 py-5 text-right">Amount</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.transactions.filter(t => t.type === 'dispatch').map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-5 font-mono text-indigo-600 font-black text-xs">{t.billNumber}</td>
                        <td className="px-8 py-5 font-bold text-slate-800">
                          {data.clients.find(c => c.id === t.clientId)?.name}
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-semibold">{t.productName} x{t.quantity}</span>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-slate-800">₹{t.total?.toLocaleString()}</td>
                        <td className="px-8 py-5">
                           <div className="flex justify-end gap-2">
                             <button onClick={() => setEditingTransaction(t)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 transition-all">
                               <Pencil size={16} />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      case Tab.Logs:
        return (
          <div className="space-y-8 animate-slide-up">
            <header>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Audit Trail</h2>
            </header>
            <Card className="overflow-hidden border-none shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-900 text-white uppercase tracking-wider text-[11px] font-black">
                    <tr>
                      <th className="px-8 py-5">Time</th>
                      <th className="px-8 py-5">Asset</th>
                      <th className="px-8 py-5">Operation</th>
                      <th className="px-8 py-5 text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.inventoryLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-[11px] font-mono text-slate-400 font-semibold">{formatFullDate(log.timestamp)}</td>
                        <td className="px-8 py-5 font-bold text-slate-900">{log.productName}</td>
                        <td className="px-8 py-5 text-slate-500 text-sm italic">{log.reason}</td>
                        <td className="px-8 py-5 text-right font-black">
                          <span className={log.change > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {log.change > 0 ? '+' : ''}{log.change}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans relative">
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-6 z-40">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Boxes size={20} />
          </div>
          BillStock
        </h1>
        <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-2 active:bg-slate-100 rounded-xl transition-colors">
          <Menu size={26} />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[55] w-72 bg-slate-900 text-white flex flex-col transform transition-transform duration-500 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none'}`}>
        <div className="p-8">
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Boxes className="text-indigo-500" size={32} /> 
            <span>BillStock</span>
          </h1>
          <p className="text-slate-500 text-[10px] mt-1.5 uppercase tracking-[0.2em] font-black">Enterprise OS</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <SidebarItem active={activeTab === Tab.Dashboard} onClick={() => handleTabChange(Tab.Dashboard)} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarItem active={activeTab === Tab.Inventory} onClick={() => handleTabChange(Tab.Inventory)} icon={<Package size={20} />} label="Inventory" />
          <SidebarItem active={activeTab === Tab.Clients} onClick={() => handleTabChange(Tab.Clients)} icon={<Users size={20} />} label="Clients" />
          <SidebarItem active={activeTab === Tab.ClientSales} onClick={() => handleTabChange(Tab.ClientSales)} icon={<BarChart3 size={20} />} label="Client Sales" />
          <SidebarItem active={activeTab === Tab.Billing} onClick={() => handleTabChange(Tab.Billing)} icon={<Receipt size={20} />} label="Invoices" />
          <SidebarItem active={activeTab === Tab.Logs} onClick={() => handleTabChange(Tab.Logs)} icon={<History size={20} />} label="Audit Trail" />
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-5 md:p-10 pt-24 md:pt-10">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {[
        { show: showAddProduct, title: "Register New Product", icon: <Package className="text-indigo-600" />, content: (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddProduct(
              formData.get('name') as string, 
              formData.get('unit') as UnitType, 
              Number(formData.get('stock')),
              Number(formData.get('purchaseRate')),
              Number(formData.get('saleRate'))
            );
          }}>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3">Product Name</label>
              <input required name="name" type="text" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Unit</label>
                <select name="unit" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold">
                  <option value="units">Units</option>
                  <option value="kg">Kgs</option>
                  <option value="bags">Bags</option>
                  <option value="liters">Liters</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Initial Stock</label>
                <input required name="stock" type="number" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" defaultValue="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Purchase Rate (Cost)</label>
                <input required name="purchaseRate" type="number" step="0.01" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" placeholder="₹ 0.00" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Sale Rate (Price)</label>
                <input required name="saleRate" type="number" step="0.01" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" placeholder="₹ 0.00" />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Add Product</button>
          </form>
        ), setter: setShowAddProduct },

        { show: !!editingProduct, title: "Edit Product", icon: <Pencil className="text-indigo-600" />, content: editingProduct && (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleUpdateProduct(
              editingProduct.id, 
              formData.get('name') as string, 
              formData.get('unit') as UnitType, 
              Number(formData.get('stock')),
              Number(formData.get('purchaseRate')),
              Number(formData.get('saleRate'))
            );
          }}>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3">Product Name</label>
              <input required name="name" type="text" defaultValue={editingProduct.name} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Unit</label>
                <select name="unit" defaultValue={editingProduct.unit} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold">
                  <option value="units">Units</option>
                  <option value="kg">Kgs</option>
                  <option value="bags">Bags</option>
                  <option value="liters">Liters</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Current Stock</label>
                <input required name="stock" type="number" defaultValue={editingProduct.currentStock} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Purchase Rate</label>
                <input required name="purchaseRate" type="number" step="0.01" defaultValue={editingProduct.avgPurchaseRate} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Sale Rate</label>
                <input required name="saleRate" type="number" step="0.01" defaultValue={editingProduct.saleRate} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Save Changes</button>
          </form>
        ), setter: () => setEditingProduct(null) },

        { show: showAddClient, title: "Register Client", icon: <Users className="text-indigo-600" />, content: (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddClient(formData.get('name') as string, formData.get('phone') as string, formData.get('address') as string);
          }}>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3">Client Name</label>
              <input required name="name" type="text" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3">Phone</label>
              <input required name="phone" type="tel" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3">Address</label>
              <textarea required name="address" rows={3} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-medium text-sm" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Save Client</button>
          </form>
        ), setter: setShowAddClient },

        { show: !!editingClient, title: "Edit Client", icon: <Pencil className="text-indigo-600" />, content: editingClient && (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleUpdateClient(editingClient.id, formData.get('name') as string, formData.get('phone') as string, formData.get('address') as string);
          }}>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3">Client Name</label>
              <input required name="name" type="text" defaultValue={editingClient.name} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3">Phone</label>
              <input required name="phone" type="tel" defaultValue={editingClient.phone} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3">Address</label>
              <textarea required name="address" rows={3} defaultValue={editingClient.address} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-medium text-sm" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Update Profile</button>
          </form>
        ), setter: () => setEditingClient(null) },

        { show: !!editingTransaction, title: "Edit Transaction", icon: <Pencil className="text-emerald-600" />, content: editingTransaction && (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleUpdateTransaction(editingTransaction.id, formData.get('clientId') as string, formData.get('productId') as string, Number(formData.get('quantity')), Number(formData.get('rate')));
          }}>
            <div className="bg-rose-50 p-4 rounded-2xl flex items-start gap-3 border border-rose-100 mb-6">
               <AlertCircle size={18} className="text-rose-600 shrink-0" />
               <p className="text-[10px] text-rose-800 font-bold leading-relaxed">Warning: Changing quantities will recalculate inventory balances. Use with caution.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Linked Entity</label>
                <select name="clientId" defaultValue={editingTransaction.clientId} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold">
                  <option value="">N/A</option>
                  {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Item</label>
                <select name="productId" defaultValue={editingTransaction.productId} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold">
                  {data.inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Quantity</label>
                  <input required name="quantity" type="number" defaultValue={editingTransaction.quantity} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Rate (₹)</label>
                  <input required name="rate" type="number" step="0.01" defaultValue={editingTransaction.rate} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" />
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-100">Save Transaction</button>
          </form>
        ), setter: () => setEditingTransaction(null) },

        { show: showDispatch, title: "Sales Dispatch", icon: <Receipt className="text-emerald-600" />, content: (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleDispatch(formData.get('clientId') as string, formData.get('productId') as string, Number(formData.get('quantity')), Number(formData.get('rate')), Date.now());
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Customer</label>
                <select name="clientId" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold">
                  <option value="">Select client...</option>
                  {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Item</label>
                <select 
                  name="productId" 
                  required 
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold"
                  onChange={(e) => {
                    const prod = data.inventory.find(p => p.id === e.target.value);
                    if (prod) {
                      setDispatchRate(prod.saleRate);
                    }
                  }}
                >
                  <option value="">Select item...</option>
                  {data.inventory.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currentStock} left)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Qty</label>
                  <input required name="quantity" type="number" min="1" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Selling Rate</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input 
                      required 
                      name="rate" 
                      type="number" 
                      step="0.01" 
                      value={dispatchRate}
                      onChange={(e) => setDispatchRate(Number(e.target.value))}
                      className="w-full pl-8 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" 
                    />
                  </div>
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl">Generate Invoice</button>
          </form>
        ), setter: setShowDispatch },

        { show: showPurchase, title: "Asset Acquisition", icon: <ShoppingCart className="text-violet-600" />, content: (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handlePurchase(
              formData.get('productId') as string, 
              Number(formData.get('quantity')), 
              Number(formData.get('rate')),
              formData.get('newName') as string,
              formData.get('unit') as UnitType
            );
          }}>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                 <button type="button" onClick={() => setPurchaseMode('existing')} className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${purchaseMode === 'existing' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Existing</button>
                 <button type="button" onClick={() => setPurchaseMode('new')} className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${purchaseMode === 'new' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>New</button>
              </div>
              {purchaseMode === 'existing' ? (
                <select name="productId" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold">
                  <option value="">Select product...</option>
                  {data.inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <>
                  <input required name="newName" type="text" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" placeholder="Product Name" />
                  <select name="unit" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold">
                    <option value="units">Units</option>
                    <option value="kg">Kgs</option>
                    <option value="bags">Bags</option>
                    <option value="liters">Liters</option>
                  </select>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <input required name="quantity" type="number" min="1" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" placeholder="Qty" />
                <input required name="rate" type="number" step="0.01" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" placeholder="Rate ₹" />
              </div>
            </div>
            <button type="submit" className="w-full bg-violet-600 text-white font-black py-4 rounded-2xl shadow-xl">Confirm Purchase</button>
          </form>
        ), setter: setShowPurchase },

        { show: showReportClientSale, title: "Report Client Sale", icon: <BarChart3 className="text-indigo-600" />, content: (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleClientSale(formData.get('clientId') as string, formData.get('productId') as string, Number(formData.get('quantity')), Number(formData.get('rate')));
          }}>
            <div className="space-y-4">
              <select 
                name="clientId" 
                required 
                value={selectedClientForReport} 
                onChange={(e) => setSelectedClientForReport(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold"
              >
                <option value="">Select client...</option>
                {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {selectedClientForReport && (
                <>
                  <select name="productId" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold">
                    <option value="">Select product...</option>
                    {clientPerformance.find(cp => cp.id === selectedClientForReport)?.stockSummary.map(ss => (
                      <option key={ss.productId} value={ss.productId}>{ss.name} (Balance: {ss.inHand})</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <input required name="quantity" type="number" min="1" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" placeholder="Qty Sold" />
                    <input required name="rate" type="number" step="0.01" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-black" placeholder="Retail Rate" />
                  </div>
                </>
              )}
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl" disabled={!selectedClientForReport}>Submit Sale</button>
          </form>
        ), setter: setShowReportClientSale }
      ].map((modal, index) => modal.show && (
        <div key={index} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="p-6 px-8 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {modal.icon}
                <h3 className="text-xl font-extrabold text-slate-900">{modal.title}</h3>
              </div>
              <button onClick={() => { 
                if (typeof modal.setter === 'function') {
                  modal.setter(false); 
                }
              }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-8">{modal.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;
