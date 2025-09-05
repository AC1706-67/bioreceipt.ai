/**
 * Barcode Scanning Service
 * Handles barcode scanning and product lookup
 */

import { BarcodeResult, ProductSearchResult } from '../../types/topicals';

export interface BarcodeScannerConfig {
  enableVibration?: boolean;
  enableSound?: boolean;
  showFrame?: boolean;
  frameColor?: string;
  laserColor?: string;
  timeout?: number;
}

export interface ProductDatabase {
  searchByUPC: (upc: string) => Promise<ProductSearchResult | null>;
  searchByName: (name: string) => Promise<ProductSearchResult[]>;
}

class BarcodeService {
  private static instance: BarcodeService;
  private productDatabase: ProductDatabase | null = null;

  private constructor() {}

  static getInstance(): BarcodeService {
    if (!BarcodeService.instance) {
      BarcodeService.instance = new BarcodeService();
    }
    return BarcodeService.instance;
  }

  /**
   * Initialize the barcode scanner
   */
  async initialize(): Promise<void> {
    try {
      // Initialize camera permissions and scanner
      console.log('Initializing barcode scanner...');
      
      // In a real implementation, you would initialize react-native-vision-camera
      // and any barcode scanning libraries here
      
    } catch (error) {
      console.error('Failed to initialize barcode scanner:', error);
      throw new Error('Failed to initialize barcode scanner');
    }
  }

  /**
   * Check if camera permission is granted
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      // In real implementation, check camera permissions
      // For now, return true for development
      return true;
    } catch (error) {
      console.error('Failed to check camera permission:', error);
      return false;
    }
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      // In real implementation, request camera permissions
      // For now, return true for development
      return true;
    } catch (error) {
      console.error('Failed to request camera permission:', error);
      return false;
    }
  }

  /**
   * Start barcode scanning
   */
  async startScanning(config: BarcodeScannerConfig = {}): Promise<BarcodeResult> {
    try {
      // Check permissions first
      const hasPermission = await this.checkCameraPermission();
      if (!hasPermission) {
        const granted = await this.requestCameraPermission();
        if (!granted) {
          throw new Error('Camera permission denied');
        }
      }

      // In real implementation, this would open the camera and scan for barcodes
      // For development, we'll simulate a scan result
      return new Promise((resolve, reject) => {
        // Simulate scanning delay
        setTimeout(() => {
          // Mock barcode result for development
          const mockResult: BarcodeResult = {
            data: '123456789012', // Mock UPC
            type: 'UPC_A',
            bounds: {
              origin: { x: 100, y: 200 },
              size: { width: 200, height: 50 },
            },
          };
          resolve(mockResult);
        }, 2000);
      });

    } catch (error) {
      console.error('Failed to start barcode scanning:', error);
      throw error;
    }
  }

  /**
   * Stop barcode scanning
   */
  async stopScanning(): Promise<void> {
    try {
      // In real implementation, stop the camera and cleanup
      console.log('Stopping barcode scanner...');
    } catch (error) {
      console.error('Failed to stop barcode scanning:', error);
    }
  }

  /**
   * Validate barcode format
   */
  validateBarcode(barcode: string): boolean {
    // Basic UPC/EAN validation
    const upcRegex = /^\d{12}$/; // UPC-A
    const eanRegex = /^\d{13}$/; // EAN-13
    const upcERegex = /^\d{8}$/; // UPC-E
    
    return upcRegex.test(barcode) || eanRegex.test(barcode) || upcERegex.test(barcode);
  }

  /**
   * Set product database for lookups
   */
  setProductDatabase(database: ProductDatabase): void {
    this.productDatabase = database;
  }

  /**
   * Look up product by UPC/barcode
   */
  async lookupProduct(upc: string): Promise<ProductSearchResult | null> {
    try {
      if (!this.validateBarcode(upc)) {
        throw new Error('Invalid barcode format');
      }

      if (!this.productDatabase) {
        // Return mock data for development
        return this.getMockProductData(upc);
      }

      return await this.productDatabase.searchByUPC(upc);
    } catch (error) {
      console.error('Failed to lookup product:', error);
      return null;
    }
  }

  /**
   * Search products by name
   */
  async searchProducts(name: string): Promise<ProductSearchResult[]> {
    try {
      if (!this.productDatabase) {
        // Return mock data for development
        return this.getMockSearchResults(name);
      }

      return await this.productDatabase.searchByName(name);
    } catch (error) {
      console.error('Failed to search products:', error);
      return [];
    }
  }

  /**
   * Get mock product data for development
   */
  private getMockProductData(upc: string): ProductSearchResult {
    const mockProducts: Record<string, ProductSearchResult> = {
      '123456789012': {
        upc: '123456789012',
        name: 'CeraVe Daily Moisturizing Lotion',
        brand: 'CeraVe',
        category: 'skincare',
        ingredients: ['Water', 'Glycerin', 'Caprylic/Capric Triglyceride', 'Cetearyl Alcohol'],
        imageUrl: 'https://example.com/cerave-lotion.jpg',
      },
      '987654321098': {
        upc: '987654321098',
        name: 'Neutrogena Ultra Sheer Sunscreen SPF 55',
        brand: 'Neutrogena',
        category: 'suncare',
        ingredients: ['Avobenzone', 'Homosalate', 'Octisalate', 'Octocrylene'],
        imageUrl: 'https://example.com/neutrogena-sunscreen.jpg',
      },
      '456789123456': {
        upc: '456789123456',
        name: 'L\'Oréal Paris Voluminous Mascara',
        brand: 'L\'Oréal Paris',
        category: 'makeup',
        ingredients: ['Water', 'Paraffin', 'Potassium Cetyl Phosphate', 'Beeswax'],
        imageUrl: 'https://example.com/loreal-mascara.jpg',
      },
    };

    return mockProducts[upc] || {
      upc,
      name: 'Unknown Product',
      brand: 'Unknown Brand',
      category: 'other',
    };
  }

  /**
   * Get mock search results for development
   */
  private getMockSearchResults(name: string): ProductSearchResult[] {
    const allMockProducts = [
      {
        upc: '123456789012',
        name: 'CeraVe Daily Moisturizing Lotion',
        brand: 'CeraVe',
        category: 'skincare',
        ingredients: ['Water', 'Glycerin', 'Caprylic/Capric Triglyceride'],
      },
      {
        upc: '987654321098',
        name: 'Neutrogena Ultra Sheer Sunscreen SPF 55',
        brand: 'Neutrogena',
        category: 'suncare',
        ingredients: ['Avobenzone', 'Homosalate', 'Octisalate'],
      },
      {
        upc: '456789123456',
        name: 'L\'Oréal Paris Voluminous Mascara',
        brand: 'L\'Oréal Paris',
        category: 'makeup',
        ingredients: ['Water', 'Paraffin', 'Potassium Cetyl Phosphate'],
      },
      {
        upc: '789123456789',
        name: 'Dove Beauty Bar Sensitive Skin',
        brand: 'Dove',
        category: 'bodycare',
        ingredients: ['Sodium Lauroyl Isethionate', 'Stearic Acid', 'Sodium Tallowate'],
      },
      {
        upc: '321654987321',
        name: 'Head & Shoulders Classic Clean Shampoo',
        brand: 'Head & Shoulders',
        category: 'haircare',
        ingredients: ['Pyrithione Zinc', 'Water', 'Sodium Laureth Sulfate'],
      },
    ];

    const query = name.toLowerCase();
    return allMockProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query)
    );
  }

  /**
   * Generate barcode check digit (for UPC-A)
   */
  generateCheckDigit(upc: string): string {
    if (upc.length !== 11) {
      throw new Error('UPC must be 11 digits for check digit calculation');
    }

    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(upc[i]);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Validate UPC check digit
   */
  validateUPCCheckDigit(upc: string): boolean {
    if (upc.length !== 12) {
      return false;
    }

    const providedCheckDigit = upc[11];
    const calculatedCheckDigit = this.generateCheckDigit(upc.substring(0, 11));
    
    return providedCheckDigit === calculatedCheckDigit;
  }
}

// Export singleton instance
export const barcodeService = BarcodeService.getInstance();

// Mock product database for development
export class MockProductDatabase implements ProductDatabase {
  async searchByUPC(upc: string): Promise<ProductSearchResult | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return barcodeService['getMockProductData'](upc);
  }

  async searchByName(name: string): Promise<ProductSearchResult[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return barcodeService['getMockSearchResults'](name);
  }
}

// Initialize with mock database for development
barcodeService.setProductDatabase(new MockProductDatabase());