
export interface FileWithPreview {
  file: File;
  previewUrl: string;
  base64: string;
}

export interface AnalysisSection {
  title: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  content: string;
  boundingBox?: number[]; // [ymin, xmin, ymax, xmax] (0-1000 scale)
  datasheetImageUri?: string;
  datasheetPageRef?: number;
  correctData?: string;
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface AnalysisResult {
  summary: string;
  sections: AnalysisSection[];
  suggestedFixes: string[];
  missingDatasheet?: boolean;
  sources?: WebSource[];
}

export interface BOMItem {
  partNumber: string;
  description: string;
  manufacturer: string;
  quantity: number;
  designators: string; // e.g., "R1, R2, R5"
  estimatedUnitPrice: number; // USD
  totalPrice: number; // USD
  cadLinks: {
    symbol?: string; // URL to 2D symbol
    footprint?: string; // URL to 2D footprint
    model3d?: string; // URL to 3D STEP/IGES
  };
}

export interface BOMResult {
  items: BOMItem[];
  totalEstimatedCost: number;
  currency: string;
  sources?: WebSource[];
}

export interface PartSearchResult {
  partNumber: string;
  manufacturer: string;
  description: string;
  imageUri?: string;
  specs: Record<string, string>; // Key-Value pairs of specs
  datasheetUri?: string;
  cadLinks: {
    model3d?: string;
    footprint?: string;
    provider?: string;
  };
  pricing: {
    distributor: string;
    price: string;
    stock: string;
    link: string;
  }[];
  alternatives: string[];
}

export interface CodeResult {
  filename: string;
  language: string;
  code: string;
  description: string;
  architecture: string; // e.g., "STM32 HAL", "Arduino", "ESP-IDF"
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  MISSING_DATASHEET = 'MISSING_DATASHEET'
}

export type ViewMode = 'AUDIT' | 'BOM' | 'PART_SEARCH' | 'CODE_GEN';
