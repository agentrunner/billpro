
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
  Calendar,
  IndianRupee,
  FileText
} from 'lucide-react';
import { AppData, Product, Client, Transaction, InventoryLog, Tab, UnitType } from './types.ts';
import { generateInvoicePDF } from './services/pdfService.ts';

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

// Fixed missing SidebarItem component
const SidebarItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('billstock_data');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);

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
    setShowAddProduct(false);
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
    setShowAddClient(false);
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
      timestamp: customTimestamp
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

    generateInvoicePDF({
      companyName: data.settings.companyName,
      billNumber,
      client: { name: client.name, phone: client.phone, address: client.address },
      product: { name: product.name, quantity, rate, total, unit: product.unit },
      date: formatFullDate(customTimestamp)
    });
    setShowDispatch(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Dashboard:
        const totalStock = data.inventory.reduce((acc, p) => acc + p.currentStock, 0);
        const totalClients = data.clients.length;
        const totalRevenue = data.transactions
          .filter(t => t.type === 'dispatch')
          .reduce((acc, t) => acc + (t.total || 0), 0);

        return (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Welcome to {data.settings.companyName}</h2>
                <p className="text-slate-500">Inventory and Billing Overview</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Stock</p>
                    <h3 className="text-3xl font-bold mt-1">{totalStock.toLocaleString()} Units</h3>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Boxes size={24} />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Total Sales</p>
                    <h3 className="text-3xl font-bold mt-1">₹{totalRevenue.toLocaleString('en-IN')}</h3>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <IndianRupee size={24} />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Clients</p>
                    <h3 className="text-3xl font-bold mt-1">{totalClients} Partners</h3>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Users size={24} />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="text-blue-500" /> Recent Transactions
                </h3>
                <div className="space-y-4">
                  {data.transactions.slice(0, 5).map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={t.type === 'dispatch' ? "bg-orange-100 text-orange-600 p-2 rounded-lg" : "bg-blue-100 text-blue-600 p-2 rounded-lg"}>
                          {t.type === 'dispatch' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{t.productName}</p>
                          <p className="text-xs text-slate-500">{formatFullDate(t.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${t.type === 'dispatch' ? 'text-slate-800' : 'text-blue-600'}`}>
                          {t.type === 'dispatch' ? '-' : '+'}{t.quantity}
                        </p>
                        {t.total && <p className="text-xs text-emerald-600 font-semibold">₹{t.total.toLocaleString()}</p>}
                      </div>
                    </div>
                  ))}
                  {data.transactions.length === 0 && <p className="text-center py-8 text-slate-400">No transactions found</p>}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="text-emerald-500" /> Low Stock Alert
                </h3>
                <div className="space-y-4">
                  {data.inventory.filter(p => p.currentStock < 10).map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div>
                        <p className="font-medium text-red-800">{p.name}</p>
                        <p className="text-xs text-red-600">Urgent restock needed</p>
                      </div>
                      <p className="font-bold text-red-700">{p.currentStock} {p.unit}</p>
                    </div>
                  ))}
                  {data.inventory.filter(p => p.currentStock < 10).length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Boxes className="text-emerald-500" />
                      </div>
                      All stock levels are healthy
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        );

      case Tab.Inventory:
        return (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
                <p className="text-slate-500">Manage products and stock levels</p>
              </div>
              <button 
                onClick={() => setShowAddProduct(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-md"
              >
                <Plus size={20} /> Add Product
              </button>
            </header>

            <Card className="overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700">Product Name</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Unit</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Stock Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Last Updated</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inventory.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{p.name}</td>
                      <td className="px-6 py-4 text-slate-600">{p.unit}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${p.currentStock > 20 ? 'bg-emerald-500' : p.currentStock > 5 ? 'bg-orange-500' : 'bg-red-500'}`}></span>
                          <span className="font-bold">{p.currentStock}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{formatFullDate(p.lastUpdated)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateProductStock(p.id, 1, 'Manual adjustment (Inc)')}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <PlusCircle size={20} />
                          </button>
                          <button 
                            onClick={() => updateProductStock(p.id, -1, 'Manual adjustment (Dec)')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            disabled={p.currentStock <= 0}
                          >
                            <MinusCircle size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.inventory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No products registered. Click "Add Product" to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        );

      case Tab.Clients:
        return (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Client Directory</h2>
                <p className="text-slate-500">Registered customers and partners</p>
              </div>
              <button 
                onClick={() => setShowAddClient(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-md"
              >
                <Plus size={20} /> Register Client
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.clients.map(c => (
                <Card key={c.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-slate-100 p-3 rounded-full text-slate-600">
                        <Users size={24} />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{c.name}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-2 mb-3">
                      <Clock size={14} /> Joined {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-sm text-slate-600"><strong>Phone:</strong> {c.phone}</p>
                      <p className="text-sm text-slate-600"><strong>Address:</strong> {c.address}</p>
                    </div>
                  </div>
                  <button className="mt-4 text-blue-600 font-medium text-sm flex items-center gap-1 hover:underline">
                    View Transaction History <ChevronRight size={14} />
                  </button>
                </Card>
              ))}
              {data.clients.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  No clients registered yet
                </div>
              )}
            </div>
          </div>
        );

      case Tab.Billing:
        return (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Billing & Dispatch</h2>
                <p className="text-slate-500">Create invoices and manage shipments</p>
              </div>
              <button 
                onClick={() => setShowDispatch(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-md"
              >
                <Receipt size={20} /> Create New Bill
              </button>
            </header>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Recent Invoices</h3>
              <div className="space-y-4">
                {data.transactions.filter(t => t.type === 'dispatch').map(t => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-200 transition-colors bg-white">
                    <div className="flex gap-4 items-center">
                      <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                        <FileText size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{t.billNumber}</p>
                        <p className="text-sm text-slate-500">{data.clients.find(c => c.id === t.clientId)?.name || 'Deleted Client'}</p>
                      </div>
                    </div>
                    <div className="px-4 border-l border-slate-100">
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Product</p>
                      <p className="text-slate-700 font-medium">{t.productName} ({t.quantity})</p>
                    </div>
                    <div className="px-4 border-l border-slate-100">
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Amount</p>
                      <p className="text-emerald-600 font-bold">₹{t.total?.toLocaleString()}</p>
                    </div>
                    <div className="px-4 border-l border-slate-100">
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Date</p>
                      <p className="text-slate-600">{new Date(t.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {data.transactions.filter(t => t.type === 'dispatch').length === 0 && (
                  <p className="text-center py-10 text-slate-400 italic">No invoices generated yet</p>
                )}
              </div>
            </Card>
          </div>
        );

      case Tab.Logs:
        return (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">System Activity Logs</h2>
                <p className="text-slate-500">Track all stock changes and movements</p>
              </div>
            </header>

            <Card className="overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Search className="text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Filter logs by product name or reason..." 
                  className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Change</th>
                      <th className="px-6 py-4">Event Type</th>
                      <th className="px-6 py-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.inventoryLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-500 font-mono">{formatFullDate(log.timestamp)}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{log.productName}</td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${log.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {log.change > 0 ? '+' : ''}{log.change}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.type === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 italic">{log.reason}</td>
                      </tr>
                    ))}
                    {data.inventoryLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No logs recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-72 bg-slate-900 text-white flex flex-col hidden md:flex shrink-0">
        <div className="p-8">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Boxes className="text-blue-500" size={32} /> BillStock
          </h1>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Enterprise Edition</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          <SidebarItem active={activeTab === Tab.Dashboard} onClick={() => setActiveTab(Tab.Dashboard)} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarItem active={activeTab === Tab.Inventory} onClick={() => setActiveTab(Tab.Inventory)} icon={<Package size={20} />} label="Inventory" />
          <SidebarItem active={activeTab === Tab.Clients} onClick={() => setActiveTab(Tab.Clients)} icon={<Users size={20} />} label="Clients" />
          <SidebarItem active={activeTab === Tab.Billing} onClick={() => setActiveTab(Tab.Billing)} icon={<Receipt size={20} />} label="Billing" />
          <SidebarItem active={activeTab === Tab.Logs} onClick={() => setActiveTab(Tab.Logs)} icon={<History size={20} />} label="Activity Logs" />
        </nav>

        <div className="p-6 bg-slate-800/30 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg">A</div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Admin User</p>
              <p className="text-xs text-slate-500 mt-1">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Modals Implementation */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">New Product</h3>
              <button onClick={() => setShowAddProduct(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddProduct(
                formData.get('name') as string,
                formData.get('unit') as UnitType,
                Number(formData.get('stock'))
              );
            }}>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Product Name</label>
                <input required name="name" type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Premium Cotton Bags" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Unit of Measure</label>
                <select name="unit" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="units">Units</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="liters">Liters</option>
                  <option value="bags">Bags</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Initial Opening Stock</label>
                <input required name="stock" type="number" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" defaultValue="0" min="0" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors mt-4">Save Product</button>
            </form>
          </div>
        </div>
      )}

      {showAddClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Register Client</h3>
              <button onClick={() => setShowAddClient(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddClient(
                formData.get('name') as string,
                formData.get('phone') as string,
                formData.get('address') as string
              );
            }}>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Client Name</label>
                <input required name="name" type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe or Acme Corp" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                <input required name="phone" type="tel" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+91 XXXXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Address</label>
                <textarea required name="address" rows={3} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter complete billing address"></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors mt-4">Register Client</button>
            </form>
          </div>
        </div>
      )}

      {showDispatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">New Invoice / Dispatch</h3>
              <button onClick={() => setShowDispatch(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleDispatch(
                formData.get('clientId') as string,
                formData.get('productId') as string,
                Number(formData.get('quantity')),
                Number(formData.get('rate')),
                Date.now()
              );
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Select Client</label>
                  <select name="clientId" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Select Product</label>
                  <select name="productId" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    {data.inventory.map(p => <option key={p.id} value={p.id}>{p.name} (Available: {p.currentStock})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Quantity</label>
                  <input required name="quantity" type="number" min="1" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Rate per Unit (₹)</label>
                  <input required name="rate" type="number" step="0.01" min="0" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                <div className="flex items-start gap-3">
                  <Clock className="text-blue-600 shrink-0" size={20} />
                  <p className="text-xs text-blue-700 leading-relaxed font-medium">
                    Dispatching this item will automatically generate a PDF invoice and deduct stock from your inventory. Please verify the quantities before proceeding.
                  </p>
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors mt-4 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                <Download size={20} /> Generate Bill & Dispatch
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
