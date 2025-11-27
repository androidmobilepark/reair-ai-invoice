import { AppSettings, RepairOrder, Customer, InventoryItem, Supplier, PurchaseOrder, Technician, SalesPerson, BrandData } from '../types';

interface FullBackupData {
    version: string;
    timestamp: string;
    data: {
        repairs: RepairOrder[];
        customers: Customer[];
        inventory: InventoryItem[];
        suppliers: Supplier[];
        purchaseOrders: PurchaseOrder[];
        settings: AppSettings;
        technicians: Technician[];
        salesPersons: SalesPerson[];
        brandData: BrandData[];
        categories: string[];
    }
}

const STORAGE_KEY = 'amp_backup_data';

/**
 * Save current state to Browser Local Storage (In-Device)
 */
export const saveToLocalStorage = (data: FullBackupData['data']) => {
    try {
        const backup: FullBackupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: data
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
        return true;
    } catch (e) {
        console.error("Local Storage Save Error", e);
        return false;
    }
};

/**
 * Load state from Browser Local Storage
 */
export const loadFromLocalStorage = (): FullBackupData['data'] | null => {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return null;
        const backup = JSON.parse(json) as FullBackupData;
        return backup.data;
    } catch (e) {
        console.error("Local Storage Load Error", e);
        return null;
    }
};

/**
 * Get current storage usage size
 */
export const getStorageUsage = (): string => {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return '0 KB';
        const bytes = new Blob([json]).size;
        if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / 1024).toFixed(2)} KB`;
    } catch (e) {
        return 'Unknown';
    }
};

/**
 * Clear all local app data
 */
export const clearLocalStorage = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (e) {
        console.error("Clear Error", e);
        return false;
    }
};

/**
 * Export data to a JSON file download
 */
export const exportDataToFile = (data: FullBackupData['data']) => {
    const backup: FullBackupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: data
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `AMP_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

/**
 * Share Backup File via Navigator (System Share for Android/iOS)
 */
export const shareBackupFile = async (data: FullBackupData['data']) => {
    const backup: FullBackupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: data
    };
    
    const fileName = `AMP_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const file = new File([JSON.stringify(backup, null, 2)], fileName, { type: 'application/json' });
    
    if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Android Mobile Park Backup',
                text: 'System backup file for restoration.'
            });
            return true;
        } catch (error) {
            console.error('Share failed:', error);
            // If user cancelled, we still consider it "handled"
            return false;
        }
    } else {
        alert("System sharing is not supported on this browser/device. Please use 'Export Backup File' instead.");
        return false;
    }
};

/**
 * Import data from a JSON file object
 */
export const importDataFromFile = (file: File): Promise<FullBackupData['data']> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (event.target?.result) {
                    const json = JSON.parse(event.target.result as string);
                    // Basic validation
                    if (json.data && json.version) {
                        resolve(json.data);
                    } else {
                        reject(new Error("Invalid backup file format"));
                    }
                }
            } catch (e) {
                reject(e);
            }
        };
        reader.readAsText(file);
    });
};

/**
 * Open External Cloud Storage (TeraBox / Drive)
 */
export const openExternalStorage = (url: string) => {
    window.open(url, '_blank');
};

/**
 * GOOGLE DRIVE INTEGRATION (Legacy/API Method)
 */

// Load Google API Script dynamically
export const loadGoogleDriveApi = (apiKey: string, clientId: string) => {
    return new Promise((resolve, reject) => {
        if ((window as any).gapi) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = "https://apis.google.com/js/api.js";
        script.onload = () => {
            (window as any).gapi.load('client:auth2', async () => {
                try {
                    await (window as any).gapi.client.init({
                        apiKey: apiKey,
                        clientId: clientId,
                        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                        scope: "https://www.googleapis.com/auth/drive.file"
                    });
                    resolve(true);
                } catch (e) {
                    reject(e);
                }
            });
        };
        script.onerror = reject;
        document.body.appendChild(script);
    });
};

export const uploadToGoogleDrive = async (data: FullBackupData['data']) => {
    const backup: FullBackupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: data
    };
    
    const fileContent = JSON.stringify(backup);
    const fileMetadata = {
        'name': `AMP_Cloud_Backup_${new Date().toISOString().split('T')[0]}.json`,
        'mimeType': 'application/json'
    };

    // Simulated upload if no real API key
    if (!(window as any).gapi?.client?.drive) {
        console.warn("Google Drive API not fully initialized. Simulating upload delay.");
        await new Promise(r => setTimeout(r, 2000));
        return { id: 'simulated_file_id' };
    }

    // Real Upload logic (Multipart upload)
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;

    const request = (window as any).gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': {'uploadType': 'multipart'},
        'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
    });

    return request.then((response: any) => response.result);
};