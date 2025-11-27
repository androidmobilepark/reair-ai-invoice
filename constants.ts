
import { InventoryItem, RepairOrder, Customer, Technician, AppSettings, BrandData, SalesPerson, Supplier, UserProfile } from './types';

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', sku: 'IP12-SCR', name: 'OLED Screen Assembly', category: 'Screens', brand: 'Apple', model: 'iPhone 12', supplierName: 'MobileSentrix', currentStock: 2, reorderPoint: 5, price: 6500.00 },
  { id: '2', sku: 'IP12-BAT', name: 'High Capacity Battery', category: 'Batteries', brand: 'Apple', model: 'iPhone 12', supplierName: 'Injured Gadgets', currentStock: 12, reorderPoint: 10, price: 2200.00 },
  { id: '3', sku: 'SAM-S21-CHG', name: 'Type-C Charging Port', category: 'Charging Ports', brand: 'Samsung', model: 'Galaxy S21', supplierName: 'Generic Parts Co', currentStock: 0, reorderPoint: 3, price: 450.00 },
  { id: '4', sku: 'UNIV-ADH', name: 'Universal Adhesive Strips', category: 'Consumables', brand: 'Universal', model: 'All', supplierName: 'Amazon Biz', currentStock: 50, reorderPoint: 20, price: 150.00 },
  { id: '5', sku: 'IP13-CAM', name: 'Rear Camera Module', category: 'Cameras', brand: 'Apple', model: 'iPhone 13', supplierName: 'MobileSentrix', currentStock: 1, reorderPoint: 3, price: 7800.00 },
  { id: '6', sku: 'MAC-M1-SCR', name: 'MacBook Air M1 Display Assembly', category: 'Screens', brand: 'Apple', model: 'MacBook Air M1', supplierName: 'Vendor X', currentStock: 1, reorderPoint: 2, price: 28000.00 },
  { id: '7', sku: 'SAM-FOLD-SCR', name: 'Inner Foldable Display', category: 'Screens', brand: 'Samsung', model: 'Z Fold 4', supplierName: 'Samsung Direct', currentStock: 0, reorderPoint: 1, price: 35000.00 },
  { id: '8', sku: 'PIX-7-BAT', name: 'OEM Battery', category: 'Batteries', brand: 'Google', model: 'Pixel 7', supplierName: 'Injured Gadgets', currentStock: 4, reorderPoint: 5, price: 2500.00 },
];

export const MOCK_REPAIRS: RepairOrder[] = [
  { 
    id: 'RO-12345', 
    dateCreated: '2023-10-24',
    storeLocation: 'Mumbai Main',
    customerName: 'Alice Johnson', 
    customerMobile: '+91 98765 43210',
    deviceModel: 'iPhone 12', 
    issue: 'Cracked Screen', 
    status: 'In Progress', 
    technicianName: 'John Doe',
    estimatedCompletion: '2023-10-27T14:00',
    partsUsed: [{ name: 'iPhone 12 Screen Assembly', cost: 6500.00 }],
    laborCost: 1500.00,
    notes: 'Customer reported ghost touch issues.',
    internalNotes: 'Adhesive was very strong. Replaced seal.'
  },
  { 
    id: 'RO-12346', 
    dateCreated: '2023-10-25',
    storeLocation: 'Mumbai Main',
    customerName: 'Bob Smith', 
    deviceModel: 'MacBook Air M1', 
    issue: 'Liquid Damage', 
    status: 'Under Diagnosis', 
    technicianName: 'Sarah Connor',
    estimatedCompletion: '2023-10-29T10:00',
    partsUsed: [],
    laborCost: 0,
    notes: 'Spilled coffee on keyboard.',
    internalNotes: 'Checking logic board for corrosion.'
  },
  { 
    id: 'RO-12347', 
    dateCreated: '2023-10-20',
    storeLocation: 'Mumbai Main',
    customerName: 'Charlie Brown', 
    deviceModel: 'Pixel 6', 
    issue: 'Battery drain', 
    status: 'Completed', 
    technicianName: 'John Doe',
    estimatedCompletion: '2023-10-25T16:00',
    actualCompletion: '2023-10-25T15:30',
    partsUsed: [{ name: 'Pixel 6 Battery', cost: 2500.00 }],
    laborCost: 1000.00,
    notes: 'Battery health was at 78%.',
    internalNotes: 'Calibrated new battery.'
  },
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'C-1001',
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    phone: '+91 98765 43210',
    address: '42 Maple Drive, Mumbai',
    joinDate: '2023-01-15',
    totalSpent: 35000.00,
    activeRepairs: 1,
    tags: ['VIP', 'Loyal'],
    notes: 'Prefers text updates. Always asks for screen protectors.',
    history: [
      { date: '2023-10-24', type: 'Repair', description: 'iPhone 12 Screen Repair', amount: 8000.00 },
      { date: '2023-05-12', type: 'Purchase', description: 'USB-C Cable', amount: 1200.00 },
      { date: '2023-02-10', type: 'Repair', description: 'iPad Air Battery', amount: 25800.00 }
    ]
  },
  {
    id: 'C-1002',
    name: 'Bob Smith',
    email: 'bsmith_design@example.com',
    phone: '+91 91234 56789',
    address: '88 Tech Plaza, Bangalore',
    joinDate: '2023-06-20',
    totalSpent: 9500.00,
    activeRepairs: 1,
    tags: ['Business', 'New'],
    notes: 'Urgent repairs usually. Needs GST invoice.',
    history: [
      { date: '2023-10-25', type: 'Repair', description: 'MacBook Air Diagnostics', amount: 0.00 },
      { date: '2023-06-20', type: 'Purchase', description: 'Laptop Sleeve', amount: 9500.00 }
    ]
  },
  {
    id: 'C-1003',
    name: 'Charlie Brown',
    email: 'charlie.b@example.com',
    phone: '+91 99887 76655',
    address: '12 Peanuts Rd, Delhi',
    joinDate: '2022-11-05',
    totalSpent: 65000.00,
    activeRepairs: 0,
    tags: ['VIP'],
    notes: 'Family plan member. 3 devices registered.',
    history: [
        { date: '2023-10-20', type: 'Repair', description: 'Pixel 6 Battery', amount: 3500.00 },
        { date: '2023-08-15', type: 'Repair', description: 'PS5 HDMI Port', amount: 8500.00 },
        { date: '2022-12-10', type: 'Purchase', description: 'Refurbished iPhone 11', amount: 53000.00 }
    ]
  },
  {
    id: 'C-1004',
    name: 'Diana Prince',
    email: 'diana.p@example.com',
    phone: '+91 88888 99999',
    address: '1 Themyscira Way, Hyderabad',
    joinDate: '2023-09-01',
    totalSpent: 450.00,
    activeRepairs: 0,
    tags: ['Walk-in'],
    notes: 'Asked about custom PC builds.',
    history: [
      { date: '2023-09-01', type: 'Repair', description: 'Screen Protector Install', amount: 450.00 }
    ]
  }
];

export const MOCK_SUPPLIERS: Supplier[] = [
    { 
        id: 'SUP-001', 
        name: 'MobileSentrix', 
        contactPerson: 'Mike Vendor', 
        email: 'orders@mobilesentrix.com', 
        phone: '(888) 555-0101', 
        address: '123 Parts Ln, Chantilly, VA', 
        notes: 'Primary supplier for screens. Fast shipping.',
        balance: 100000.00,
        ledger: [
            { id: 'TRX-001', date: '2023-10-01', type: 'Invoice', description: 'PO #4055 - Screens', amount: 120000.00, reference: 'INV-9988' },
            { id: 'TRX-002', date: '2023-10-05', type: 'Payment', description: 'Wire Transfer', amount: 40000.00, reference: 'WT-2231' },
            { id: 'TRX-003', date: '2023-10-10', type: 'Invoice', description: 'PO #4062 - Batteries', amount: 20000.00, reference: 'INV-1022' }
        ]
    },
    { 
        id: 'SUP-002', 
        name: 'Injured Gadgets', 
        contactPerson: 'Sarah Supply', 
        email: 'support@injuredgadgets.com', 
        phone: '(800) 555-0102', 
        address: '456 Gadget Blvd, Norcross, GA', 
        notes: 'Good for batteries and tools.',
        balance: 0.00,
        ledger: [
             { id: 'TRX-010', date: '2023-09-15', type: 'Invoice', description: 'PO #3900 - Tools', amount: 35000.00, reference: 'INV-554' },
             { id: 'TRX-011', date: '2023-09-20', type: 'Payment', description: 'Credit Card', amount: 35000.00, reference: 'CC-9900' }
        ]
    },
    { 
        id: 'SUP-003', 
        name: 'Samsung Direct', 
        contactPerson: 'Enterprise Support', 
        email: 'b2b@samsung.com', 
        phone: '(800) 726-7864', 
        address: 'Ridgefield Park, NJ', 
        notes: 'OEM parts only. Requires PO.',
        balance: 400000.00,
        ledger: [
            { id: 'TRX-020', date: '2023-10-01', type: 'Invoice', description: 'Bulk Order - Fold Screens', amount: 400000.00, reference: 'INV-SAMS-001' }
        ]
    },
    { 
        id: 'SUP-004', 
        name: 'Generic Parts Co', 
        contactPerson: 'John Cheap', 
        email: 'sales@genericparts.com', 
        phone: '(555) 111-2222', 
        address: 'Online Only', 
        notes: 'Cheap charging ports. Quality varies.',
        balance: -4000.00,
        ledger: [
             { id: 'TRX-030', date: '2023-09-01', type: 'Invoice', description: 'PO #3888', amount: 8000.00, reference: 'INV-001' },
             { id: 'TRX-031', date: '2023-09-05', type: 'Return', description: 'Returned Defective Ports', amount: 12000.00, reference: 'RMA-223' }
        ]
    },
];

export const MOCK_TECHNICIANS: Technician[] = [
    { id: 'T-001', name: 'John Doe', specialization: 'L2 Repairs, iPhones', active: true },
    { id: 'T-002', name: 'Sarah Connor', specialization: 'L3 Microsoldering, MacBooks', active: true },
    { id: 'T-003', name: 'Mike Ross', specialization: 'General Repair, Androids', active: true },
];

export const MOCK_SALES_PERSONS: SalesPerson[] = [
    { id: 'S-001', name: 'Emma Watson', active: true },
    { id: 'S-002', name: 'Chris Evans', active: true },
];

export const MOCK_USERS: UserProfile[] = [
    { id: 'U-001', name: 'John Doe', role: 'Admin', avatarInitials: 'JD', password: '9626207767' },
    { id: 'U-002', name: 'Sarah Connor', role: 'Technician', avatarInitials: 'SC', password: '1234' },
    { id: 'U-003', name: 'Emma Watson', role: 'Sales', avatarInitials: 'EW', password: '1234' },
];

export const DEFAULT_SETTINGS: AppSettings = {
    storeName: 'Android Mobile Park',
    storeLocation: 'Mumbai',
    storePhone: '04373-469443',
    ownerPhone: '9626207767',
    taxRate: 18.0, // GST Standard
    invoicePrefix: 'AMP',
    currencySymbol: '₹',
    whatsappWebLink: 'https://web.whatsapp.com',
    whatsappApiLink: 'https://api.whatsapp.com/send',
    whatsappConnected: false,
    whatsappAutoSend: true,
    smsEnabled: false,
    smsGatewayUrl: 'https://api.example.com/send',
    smsApiKey: '',
    googleDriveEnabled: false,
    autoBackupEnabled: true,
    teraBoxUrl: 'https://www.terabox.com', // Default TeraBox URL
    googleDriveFolderLink: 'https://drive.google.com/drive/u/0/my-drive',
};

export const DEFAULT_BRANDS: BrandData[] = [
  { name: 'Apple', models: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 15', 'iPhone 14', 'iPhone 13', 'iPad Pro', 'iPad Air', 'MacBook Air', 'MacBook Pro'] },
  { name: 'Samsung', models: ['Galaxy S24 Ultra', 'Galaxy S23', 'Galaxy A54', 'Z Fold 5', 'Z Flip 5'] },
  { name: 'Google', models: ['Pixel 9 Pro', 'Pixel 8', 'Pixel 7a', 'Pixel Fold'] },
  { name: 'Motorola', models: ['Razr+', 'Edge', 'Moto G'] },
  { name: 'OnePlus', models: ['OnePlus 12', 'OnePlus 11', 'Nord'] },
  { name: 'Sony', models: ['Xperia 1 V', 'Xperia 5'] },
  { name: 'Dell', models: ['XPS 13', 'XPS 15', 'Inspiron'] },
  { name: 'HP', models: ['Spectre', 'Envy', 'Pavilion'] },
  { name: 'Other', models: ['Generic Device'] }
];

export const DEFAULT_CATEGORIES = ['Smartphone', 'Tablet', 'Laptop', 'Smartwatch', 'Console', 'Desktop', 'Other'];


export const SYSTEM_INSTRUCTION_CHAT = `You are a helpful repair shop assistant for 'Android Mobile Park'. 
You have access to general knowledge about electronics repair. 
When asked about specific repair orders, simulate looking up the data if the user provides an ID (e.g., RO-12345).
Be professional, concise, and friendly.`;

export const SYSTEM_INSTRUCTION_INVOICE = `You are an invoicing assistant. Given a repair order details, generate a professional invoice JSON.`;

export const SYSTEM_INSTRUCTION_INVENTORY = `You are an inventory analyst. Analyze inventory data and identify SKUs below threshold.`;
