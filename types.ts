
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  supplierName?: string; // Added Supplier Name
  currentStock: number;
  reorderPoint: number;
  price: number;
}

export type RepairStatus = 
  | 'Pending' 
  | 'Under Diagnosis' 
  | 'Waiting for Parts' 
  | 'In Progress' 
  | 'Quality Testing' 
  | 'Completed' 
  | 'Picked Up'
  | 'Delivered' 
  | 'Returned (Not Fixed)'
  | 'Cancelled';

export interface RepairOrder {
  id: string;
  invoiceId?: string; // Linked Invoice ID
  customerName: string;
  customerMobile?: string;
  deviceModel: string;
  issue: string;
  status: RepairStatus;
  dateCreated: string;
  storeLocation: string;
  technicianName?: string;
  estimatedCompletion: string;
  actualCompletion?: string;
  partsUsed: Array<{ name: string; cost: number; inventoryId?: string }>;
  laborCost: number;
  notes?: string; // Repair Notes / Updates Log
  internalNotes?: string; // Internal Technician Notes
  snoozedUntil?: string; // Timestamp for snoozing overdue notifications
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface GeneratedInvoice {
  invoice_id: string;
  date: string;
  customer_name: string;
  customer_mobile?: string;
  sales_person?: string;
  technician_name?: string; // Added Technician Name
  device_type?: string;
  device_brand?: string;
  device_model?: string;
  device_color?: string;
  device_passcode?: string;
  device_pattern?: string;
  received_sim_tray?: boolean; // Checkbox
  received_sim_card?: boolean; // Checkbox
  received_battery?: boolean;  // Checkbox
  estimated_cost?: number;
  estimated_completion?: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface RestockSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  recommendedRestock: number;
  reasoning: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  totalSpent: number;
  activeRepairs: number;
  tags: string[];
  notes: string;
  history: {
    date: string;
    type: 'Repair' | 'Purchase' | 'Inquiry';
    description: string;
    amount?: number;
  }[];
}

export interface SupplierLedgerEntry {
  id: string;
  date: string;
  type: 'Invoice' | 'Payment' | 'Return';
  description: string;
  amount: number; // Absolute value
  reference?: string; // Check #, Invoice #
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  balance: number; // Positive = We Owe Them
  ledger: SupplierLedgerEntry[];
}

export interface PurchaseOrderItem {
  itemId?: string; // Link to existing inventory item if applicable
  sku?: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  brand?: string;
  model?: string;
  category?: string;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  supplierName: string;
  status: 'Ordered' | 'Received' | 'Cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  expectedDate?: string;
}

export interface Technician {
  id: string;
  name: string;
  specialization: string; // e.g., Microsoldering, Screen Repair
  active: boolean;
}

export interface SalesPerson {
  id: string;
  name: string;
  active: boolean;
}

export interface BrandData {
  name: string;
  models: string[];
}

export interface AppSettings {
  storeName: string;
  storeLocation: string;
  storePhone: string;
  ownerPhone: string;
  taxRate: number;
  invoicePrefix: string;
  currencySymbol: string;
  storeAddress?: string;
  storeEmail?: string;
  gstNumber?: string;
  website?: string;
  whatsappWebLink: string;
  whatsappApiLink: string;
  whatsappConnected?: boolean;
  whatsappAutoSend?: boolean;
  smsEnabled: boolean;
  smsGatewayUrl?: string;
  smsApiKey?: string;
  // Backup Settings
  googleDriveEnabled: boolean;
  googleClientId?: string;
  googleApiKey?: string;
  googleDriveFolderLink?: string; // Manual link to Drive Folder
  lastBackupDate?: string;
  autoBackupEnabled: boolean;
  teraBoxUrl?: string; // TeraBox / External Cloud Link
}

export type UserRole = 'Admin' | 'Technician' | 'Sales';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  avatarInitials: string;
  password?: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  REPAIRS = 'REPAIRS',
  INVOICE = 'INVOICE',
  CHAT = 'CHAT',
  CRM = 'CRM',
  SETTINGS = 'SETTINGS',
  REPORTS = 'REPORTS',
}