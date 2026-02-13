
export type UnitType = 'kg' | 'bags' | 'units' | 'liters';

export interface Product {
  id: string;
  name: string;
  unit: UnitType;
  currentStock: number;
  createdAt: number;
  lastUpdated: number; // Added tracking for edits
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  type: 'manual' | 'dispatch';
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
  clientId: string;
  productId: string;
  productName: string;
  type: 'dispatch' | 'sale';
  quantity: number;
  rate?: number;
  total?: number;
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
  Logs = 'logs'
}
