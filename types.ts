
export type UnitType = 'kg' | 'bags' | 'units' | 'liters';

export interface Product {
  id: string;
  name: string;
  unit: UnitType;
  currentStock: number;
  avgPurchaseRate: number; // Tracks weighted average cost
  saleRate: number;        // Default selling price
  createdAt: number;
  lastUpdated: number;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  type: 'manual' | 'dispatch' | 'purchase';
  change: number;
  reason: string;
  timestamp: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  clientId?: string;
  productId: string;
  productName: string;
  type: 'dispatch' | 'sale' | 'purchase' | 'client_sale';
  quantity: number;
  rate?: number;
  total?: number;
  profit?: number; // Calculated at time of dispatch or sale
  billNumber?: string;
  timestamp: number;
}

export interface AppData {
  inventory: Product[];
  inventoryLogs: InventoryLog[];
  clients: Client[];
  transactions: Transaction[];
  settings: {
    companyName: string;
    nextBillNo: number;
  };
}

export enum Tab {
  Dashboard = 'dashboard',
  Inventory = 'inventory',
  Clients = 'clients',
  Billing = 'billing',
  ClientSales = 'client_sales',
  Logs = 'logs'
}
