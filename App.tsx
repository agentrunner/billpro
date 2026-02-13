
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
  Trash2,
  ChevronRight,
  TrendingUp,
  Boxes,
  MinusCircle,
  PlusCircle,
  X,
  Clock,
  Calendar
} from 'lucide-react';
import { AppData, Product, Client, Transaction, InventoryLog, Tab, UnitType } from './types';
import { generateInvoicePDF } from './services/pdfService';

const INITIAL_DATA: AppData = {
  inventory: [],
  inventoryLogs: [],
  clients: [],
  transactions: [],
  settings: {
    companyName: 'My Enterprise',
    nextBillNo: 1001
  }
};

const formatFullDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('billstock_data');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleAddProduct = (name: string, unit: UnitType, stock: number) => {
    const now = Date.now();
    const newProduct: Product = {
      id: crypto.randomUUID(),
      name,
      unit,
      currentStock: stock,
      createdAt: now,
      lastUpdated: now
    };
    setData(prev => ({ ...prev, inventory: [...prev.inventory, newProduct] }));
    addLog({
      productId: newProduct.id,
      productName: name,
      type: 'manual',
      change: stock,
      reason: 'Initial product registration'
    });
  };

  const updateProductStock = (id: string, change: number, reason: string) => {
    const now = Date.now();
    setData(prev => {
      const product = prev.inventory.find(p => p.id === id);
      if (!product) return prev;
      
      const newInventory = prev.inventory.map(p => 
        p.id === id ? { ...p, currentStock: p.currentStock + change, lastUpdated: now } : p
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

  const handleAddClient = (name: string, phone: string, address: string) => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      name,
      phone,
      address,
      createdAt: Date.now()
    };
    setData(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
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
    const now = Date.now();

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      clientId,
      productId,
      productName: product.name,
      type: 'dispatch',
      quantity,
      rate,
      total,
      billNumber,
      timestamp: customTimestamp // Use the user-provided date for the record
    };

    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions],
      inventory: prev.inventory.map(p => 
        p.id === productId ? { ...p, currentStock: p.currentStock - quantity, lastUpdated: now } : p
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

    // Execute PDF Generation immediately
    generateInvoicePDF({
      companyName: data.settings.companyName,
      billNumber,
      client: { name: client.name, phone: client.phone, address: client.address },
      product: { name: product.name, quantity, rate, total, unit: product.unit },
      date: formatFullDate(customTimestamp)
    });
  };

  const handleClientSale = (clientId: string, productId: string, quantity: number) => {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      clientId,
      productId,
      productName: data.inventory.find(p => p.id === productId)?.name || 'Unknown',
      type: 'sale',
      quantity,
      timestamp: Date.now()
    };

    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions]
    }));
  };

  const getClientStock = (clientId: string, productId: string) => {
    return data.transactions
      .filter(t => t.clientId === clientId && t.productId === productId)
      .reduce((acc, t) => t.type === 'dispatch' ? acc + t.quantity : acc - t.quantity, 0);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="text-blue-400" /> BillStock
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem active={activeTab === Tab.Dashboard} onClick={() => setActiveTab(Tab.Dashboard)} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarItem active={activeTab === Tab.Inventory} onClick={() => setActiveTab(Tab.Inventory)} icon={<Package size={20} />} label="Inventory" />
          <SidebarItem active={activeTab === Tab.Clients} onClick={() => setActiveTab(Tab.Clients)} icon={<Users size={20} />} label="Clients" />
          <SidebarItem active={activeTab === Tab.Billing} onClick={() => setActiveTab(Tab.Billing)} icon={<Receipt size={20} />} label="Billing" />
          <SidebarItem active={activeTab === Tab.Logs} onClick={() => setActiveTab(Tab.Logs)} icon={<History size={20} />} label="System Logs" />
        </nav>
        <div className="p-4 bg-slate-800 m-4 rounded-xl text-sm opacity-80">
          <p>Logged in as Admin</p>
          <p className="font-mono text-xs">{data.settings.companyName}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b px-8 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search database..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === Tab.Dashboard && <DashboardView data={data} setActiveTab={setActiveTab} />}
          {activeTab === Tab.Inventory && <InventoryView data={data} onAddProduct={handleAddProduct} onUpdateStock={updateProductStock} />}
          {activeTab === Tab.Clients && <ClientsView data={data} onAddClient={handleAddClient} onRecordSale={handleClientSale} getClientStock={getClientStock} />}
          {activeTab === Tab.Billing && <BillingView data={data} onDispatch={handleDispatch} />}
          {activeTab === Tab.Logs && <LogsView data={data} />}
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const DashboardView = ({ data, setActiveTab }: { data: AppData, setActiveTab: (t: Tab) => void }) => {
  const stats = useMemo(() => ({
    totalProducts: data.inventory.length,
    totalClients: data.clients.length,
    totalDispatches: data.transactions.filter(t => t.type === 'dispatch').length,
    lowStock: data.inventory.filter(p => p.currentStock < 10).length
  }), [data]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Stock Items" value={stats.totalProducts} icon={<Package className="text-blue-500" />} />
        <StatCard title="Active Clients" value={stats.totalClients} icon={<Users className="text-green-500" />} />
        <StatCard title="Total Dispatches" value={stats.totalDispatches} icon={<ArrowUpRight className="text-purple-500" />} />
        <StatCard title="Low Stock Alerts" value={stats.lowStock} icon={<TrendingUp className="text-orange-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Recent Transactions (Sales & Transfers)</h3>
            <button onClick={() => setActiveTab(Tab.Billing)} className="text-blue-600 text-sm hover:underline">New Invoice</button>
          </div>
          <div className="space-y-4">
            {data.transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${t.type === 'dispatch' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {t.type === 'dispatch' ? <ArrowUpRight size={20} /> : <TrendingUp size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{t.productName}</p>
                    <p className="text-xs text-slate-500">{t.type === 'dispatch' ? 'Dispatched to Client' : 'Reported Client Sale'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700">{t.quantity} Units</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">{formatFullDate(t.timestamp)}</p>
                </div>
              </div>
            ))}
            {data.transactions.length === 0 && <p className="text-center text-slate-400 py-8">No transaction activity recorded yet.</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-6">Inventory Levels</h3>
          <div className="space-y-6">
            {data.inventory.slice(0, 5).map(p => (
              <div key={p.id}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">{p.name}</span>
                  <span className="text-slate-500 font-bold">{p.currentStock} {p.unit}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${p.currentStock < 10 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((p.currentStock / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {data.inventory.length === 0 && <p className="text-center text-slate-400 py-8">No products found.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string, value: number, icon: any }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h4 className="text-3xl font-bold mt-1 text-slate-800">{value}</h4>
      </div>
      <div className="p-3 bg-slate-50 rounded-xl">
        {icon}
      </div>
    </div>
  </div>
);

const InventoryView = ({ data, onAddProduct, onUpdateStock }: { data: AppData, onAddProduct: any, onUpdateStock: any }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: 'kg' as UnitType, stock: 0 });
  const [adjustData, setAdjustData] = useState({ amount: 0, reason: '' });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Warehouse Inventory</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={20} /> New Item
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4">Created On</th>
                <th className="px-6 py-4">Last Modified</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {data.inventory.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">Unit: {p.unit.toUpperCase()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full font-bold text-xs ${p.currentStock < 10 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                      {p.currentStock} {p.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{formatFullDate(p.createdAt)}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-medium">{formatFullDate(p.lastUpdated)}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button 
                      onClick={() => setViewingHistory(p)}
                      className="text-slate-400 hover:text-slate-600 font-medium text-xs underline decoration-dotted"
                    >
                      Audit Trail
                    </button>
                    <button 
                      onClick={() => {
                        setAdjustingProduct(p);
                        setAdjustData({ amount: 0, reason: '' });
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.inventory.length === 0 && <div className="p-16 text-center text-slate-400 italic">No inventory records found. Click "New Item" to start.</div>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 w-full max-md shadow-2xl border">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold">Register New Product</h4>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm"
                  placeholder="e.g. Basmati Rice"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Measurement Unit</label>
                  <select 
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm"
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="bags">Bags</option>
                    <option value="liters">Liters (L)</option>
                    <option value="units">Units (pcs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opening Stock</label>
                  <input 
                    type="number" 
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm"
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-3 border rounded-xl hover:bg-slate-50 font-bold text-sm">Cancel</button>
                <button 
                  onClick={() => {
                    if (formData.name) {
                      onAddProduct(formData.name, formData.unit, formData.stock);
                      setShowAdd(false);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-md"
                >
                  Save Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adjustingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-xl font-bold">Manual Stock Adjust</h4>
                <p className="text-sm text-slate-500">Item: <span className="font-bold text-slate-700">{adjustingProduct.name}</span></p>
              </div>
              <button onClick={() => setAdjustingProduct(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Available Quantity</p>
                  <p className="text-xl font-black text-slate-800">{adjustingProduct.currentStock} {adjustingProduct.unit}</p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="flex-1 text-right">
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">New Balance</p>
                   <p className="text-xl font-black text-blue-600">{(adjustingProduct.currentStock + adjustData.amount)} {adjustingProduct.unit}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Adjust Quantity (+/-)</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setAdjustData(prev => ({ ...prev, amount: prev.amount - 1 }))}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl border shadow-sm transition-all"
                  ><MinusCircle size={28} /></button>
                  <input 
                    type="number" 
                    className="flex-1 p-3 border rounded-xl text-center font-black text-2xl outline-none focus:ring-4 focus:ring-blue-100 bg-white"
                    value={adjustData.amount}
                    onChange={(e) => setAdjustData({ ...adjustData, amount: parseInt(e.target.value) || 0 })}
                  />
                  <button 
                    onClick={() => setAdjustData(prev => ({ ...prev, amount: prev.amount + 1 }))}
                    className="p-3 text-green-600 hover:bg-green-50 rounded-xl border shadow-sm transition-all"
                  ><PlusCircle size={28} /></button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Note / Reason</label>
                <textarea 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 min-h-[90px] text-sm"
                  placeholder="e.g. Stock correction, Damaged stock found, Gift/Sample issued..."
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button onClick={() => setAdjustingProduct(null)} className="flex-1 px-4 py-3 border rounded-xl hover:bg-slate-50 font-bold text-sm">Cancel</button>
                <button 
                  disabled={adjustData.amount === 0 || !adjustData.reason}
                  onClick={() => {
                    onUpdateStock(adjustingProduct.id, adjustData.amount, adjustData.reason);
                    setAdjustingProduct(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-sm transition-all disabled:opacity-30 shadow-lg"
                >
                  Commit Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl border flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h4 className="text-xl font-bold flex items-center gap-2">
                  <Clock size={22} className="text-blue-500" />
                  Inventory Audit Trail
                </h4>
                <p className="text-sm text-slate-500">History for <span className="font-bold text-slate-700">{viewingHistory.name}</span></p>
              </div>
              <button onClick={() => setViewingHistory(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                <span>Timeline</span>
                <span>Change & Reason</span>
              </div>
              {data.inventoryLogs.filter(l => l.productId === viewingHistory.id).map(log => (
                <div key={log.id} className="p-4 bg-white border rounded-xl shadow-sm flex justify-between gap-6 hover:border-blue-200 transition-colors">
                   <div className="w-40 shrink-0">
                      <p className="text-xs font-bold text-slate-800">{formatFullDate(log.timestamp)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-tighter">{log.type === 'manual' ? 'Manual Edit' : 'Client Dispatch'}</p>
                   </div>
                   <div className="flex-1 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${log.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                         {log.change > 0 ? '+' : ''}{log.change} {viewingHistory.unit}
                      </span>
                      <p className="text-xs text-slate-600 italic leading-snug">{log.reason}</p>
                   </div>
                </div>
              ))}
              {data.inventoryLogs.filter(l => l.productId === viewingHistory.id).length === 0 && (
                <div className="py-12 text-center text-slate-400">No logs for this item.</div>
              )}
            </div>
            <div className="p-4 bg-slate-100 border-t flex justify-between text-xs text-slate-500 px-8">
               <span>Registered: {formatFullDate(viewingHistory.createdAt)}</span>
               <span>Last Change: {formatFullDate(viewingHistory.lastUpdated)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientsView = ({ data, onAddClient, onRecordSale, getClientStock }: { data: AppData, onAddClient: any, onRecordSale: any, getClientStock: any }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });
  
  const clientTransactions = data.transactions.filter(t => t.clientId === selectedClient?.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Client Portfolios</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={20} /> Register Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.clients.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border shadow-sm hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer" onClick={() => setSelectedClient(c)}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Users size={24} />
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
            </div>
            <h4 className="text-lg font-bold text-slate-800">{c.name}</h4>
            <p className="text-slate-500 text-sm mt-1">{c.phone}</p>
            <p className="text-slate-400 text-[10px] mt-2 line-clamp-1 italic">{c.address}</p>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Joined: {formatFullDate(c.createdAt)}</span>
              <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">Profile & History</span>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold">New Client Profile</h4>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company / Name</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm"
                  placeholder="e.g. Acme Retailers"
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Phone</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm"
                  placeholder="+91-0000-000-000"
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Address</label>
                <textarea 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 min-h-[100px] text-sm"
                  placeholder="Complete billing address..."
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-3 border rounded-xl hover:bg-slate-50 font-bold text-sm">Cancel</button>
                <button 
                  onClick={() => {
                    if (newClient.name) {
                      onAddClient(newClient.name, newClient.phone, newClient.address);
                      setShowAdd(false);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-md transition-colors"
                >
                  Create Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{selectedClient.name}</h3>
                  <div className="flex items-center gap-2 text-slate-500 mt-1">
                     <span className="text-sm font-medium">{selectedClient.phone}</span>
                     <span className="h-1 w-1 bg-slate-300 rounded-full" />
                     <span className="text-xs uppercase tracking-tighter">Member since {formatFullDate(selectedClient.createdAt)}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors border">
                  <X className="text-slate-600" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3">Live Stock on Hand</p>
                  <div className="space-y-2.5">
                    {data.inventory.map(p => {
                      const stockWithClient = getClientStock(selectedClient.id, p.id);
                      if (stockWithClient <= 0) return null;
                      return (
                        <div key={p.id} className="flex justify-between text-sm group">
                          <span className="text-slate-600 font-medium">{p.name}</span>
                          <span className="font-black text-slate-900">{stockWithClient} <span className="text-[10px] text-slate-400 font-normal">{p.unit}</span></span>
                        </div>
                      );
                    })}
                    {!data.inventory.some(p => getClientStock(selectedClient.id, p.id) > 0) && (
                      <p className="text-xs text-slate-400 italic">This client currently holds no warehouse stock.</p>
                    )}
                  </div>
                </div>
                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-all shadow-sm" onClick={() => {
                  const prodId = prompt("Enter Product Name from holding?"); 
                  const amt = parseInt(prompt("Reported Sales Quantity?") || '0');
                  if (amt > 0) {
                    const product = data.inventory.find(p => p.name.toLowerCase() === prodId?.toLowerCase());
                    if (product) onRecordSale(selectedClient.id, product.id, amt);
                    else alert("Product name not matched in inventory list.");
                  }
                }}>
                  <div className="text-center">
                    <TrendingUp className="mx-auto text-blue-600 mb-2" size={28} />
                    <p className="text-xs font-black text-blue-700 uppercase tracking-wide">Log Client Sale</p>
                    <p className="text-[10px] text-blue-400 mt-1">Updates client holding balance</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 border-b pb-2">
                 <h4 className="font-black text-slate-800 flex items-center gap-2"><History size={18} className="text-slate-400" /> Activity Log</h4>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Recent First</span>
              </div>
              
              <div className="space-y-3">
                {clientTransactions.map(t => (
                  <div key={t.id} className="p-4 bg-white border rounded-xl flex justify-between items-center shadow-sm hover:border-slate-300 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className={`p-2 rounded-lg ${t.type === 'dispatch' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type === 'dispatch' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{t.productName}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">{formatFullDate(t.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${t.type === 'dispatch' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'dispatch' ? '+' : '-'}{t.quantity}
                      </p>
                      {t.billNumber && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                           <span className="text-[9px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{t.billNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {clientTransactions.length === 0 && (
                  <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <History size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">No movement records found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BillingView = ({ data, onDispatch }: { data: AppData, onDispatch: any }) => {
  const [billForm, setBillForm] = useState({
    clientId: '',
    productId: '',
    quantity: 0,
    rate: 0,
    date: new Date().toISOString().split('T')[0] // Default to today's date
  });

  const selectedProduct = data.inventory.find(p => p.id === billForm.productId);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom duration-500">
        <div>
          <h3 className="text-2xl font-black text-slate-800 mb-1">Generate Dispatch Invoice</h3>
          <p className="text-slate-500 text-sm">Create a tax invoice and update inventory balances automatically.</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Client</label>
              <select 
                className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-700"
                value={billForm.clientId}
                onChange={(e) => setBillForm({ ...billForm, clientId: e.target.value })}
              >
                <option value="">-- Choose Target Client --</option>
                {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Item</label>
              <select 
                className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-700"
                value={billForm.productId}
                onChange={(e) => setBillForm({ ...billForm, productId: e.target.value })}
              >
                <option value="">-- Select Product --</option>
                {data.inventory.map(p => <option key={p.id} value={p.id}>{p.name} (Qty: {p.currentStock})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quantity to Send</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-800"
                  placeholder="0.00"
                  value={billForm.quantity || ''}
                  onChange={(e) => setBillForm({ ...billForm, quantity: parseFloat(e.target.value) || 0 })}
                />
                {selectedProduct && <span className="absolute right-4 top-4 text-slate-400 font-bold text-xs uppercase">{selectedProduct.unit}</span>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unit Price (INR)</label>
              <input 
                type="number" 
                className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-800"
                placeholder="0.00"
                value={billForm.rate || ''}
                onChange={(e) => setBillForm({ ...billForm, rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Dispatch Date
            </label>
            <input 
              type="date" 
              className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-700"
              value={billForm.date}
              onChange={(e) => setBillForm({ ...billForm, date: e.target.value })}
            />
          </div>

          <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
               <Receipt size={100} />
            </div>
            <div className="relative z-10 flex justify-between items-center">
              <div>
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Invoice Grand Total</span>
                 <p className="text-4xl font-black mt-1 tracking-tight">INR {(billForm.quantity * billForm.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                 <p className="text-xs font-medium text-slate-400">Tax inclusive</p>
              </div>
            </div>
          </div>

          <button 
            disabled={!billForm.clientId || !billForm.productId || !billForm.quantity || billForm.quantity <= 0}
            onClick={() => {
              const selectedTimestamp = new Date(billForm.date + 'T00:00:00').getTime();
              onDispatch(billForm.clientId, billForm.productId, billForm.quantity, billForm.rate, selectedTimestamp);
              setBillForm({ ...billForm, quantity: 0, productId: '' });
            }}
            className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale shadow-xl active:scale-[0.98]"
          >
            <Download size={22} /> Confirm Dispatch & Print Bill
          </button>
        </div>
      </div>
    </div>
  );
};

const LogsView = ({ data }: { data: AppData }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold">System Audit Logs</h3>
          <p className="text-sm text-slate-500">Master record of all inventory modifications</p>
        </div>
        <div className="text-right">
           <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full border">Secure Ledger</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Full Timestamp</th>
                <th className="px-8 py-5">Inventory Subject</th>
                <th className="px-8 py-5">Quantity Change</th>
                <th className="px-8 py-5">Activity / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {data.inventoryLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-5">
                     <p className="text-slate-800 font-bold text-xs">{formatFullDate(log.timestamp)}</p>
                     <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">{log.type === 'manual' ? 'Manual Correction' : 'Invoice Dispatch'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-bold text-slate-700">{log.productName}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`font-black inline-flex items-center px-3 py-1 rounded-full text-[11px] ${log.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.change > 0 ? '+' : ''}{log.change}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-slate-600 italic text-xs leading-relaxed max-w-xs">{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.inventoryLogs.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center">
             <History size={48} className="text-slate-200 mb-4" />
             <p className="text-slate-400 font-medium">No system logs recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
