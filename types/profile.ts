export interface ProfileTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  selectedColumns: string[];
  sumColumns: string[];
  orderIdColumn?: string;
}

export interface ParsedSpreadsheet {
  fileName: string;
  fileSize: number;
  headers: string[];
  summableHeaders?: string[];
  dateHeaders?: string[];
  rows: Record<string, any>[];
  totalRowCount: number;
}

export interface DateFilterConfig {
  enabled: boolean;
  column: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ColumnMetric {
  columnName: string;
  total: number;
  count: number;
  average: number;
}

export type ExportFormat = 'xlsx' | 'csv';

