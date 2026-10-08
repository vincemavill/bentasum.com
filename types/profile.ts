export interface ProfileTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  selectedColumns: string[];
  sumColumns: string[];
  orderIdColumn?: string;
  calculatedColumns?: CalculatedColumnConfig[];
}

export interface IndividualFileInfo {
  fileName: string;
  fileSize: number;
  rowCount: number;
  rows?: Record<string, any>[];
}

export interface ParsedSpreadsheet {
  fileName: string;
  fileSize: number;
  headers: string[];
  summableHeaders?: string[];
  dateHeaders?: string[];
  rows: Record<string, any>[];
  totalRowCount: number;
  fileCount?: number;
  fileNames?: string[];
  files?: IndividualFileInfo[];
}

export interface SecondaryLookupFile {
  fileName: string;
  fileSize: number;
  headers: string[];
  summableHeaders?: string[];
  dateHeaders?: string[];
  rows: Record<string, any>[];
  totalRowCount: number;
}

export interface JoinColumnMapping {
  sourceColumn: string; // column in secondary lookup file
  targetColumn: string; // name in merged dataset (e.g. "Cost of Goods Sold" or "[Lookup] Status")
}

export interface JoinConfig {
  primaryKey: string;      // column in primary file
  secondaryKey: string;    // column in lookup file
  selectedColumns: string[]; // list of secondary source columns to include
  columnAliases?: Record<string, string>; // custom target column name per secondary source column
}

export type CalcOperation = '+' | '-' | '*';

export interface CalculatedColumnConfig {
  id: string;
  name: string;           // output column name (e.g. "Net Margin")
  leftColumn: string;     // e.g. "Deal Price"
  operation: CalcOperation; // '+' or '-'
  rightColumn: string;    // e.g. "Product Cost (COGS)"
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
