import * as XLSX from 'xlsx';
import { ColumnMetric, ExportFormat, ParsedSpreadsheet } from '@/types/profile';

/**
 * Sanitizes currency strings and numeric text into a valid JavaScript float.
 * Handles currencies like ₱, $, RM, Rp, SGD, THB, negative values in parentheses (₱123.45),
 * commas, trailing spaces, etc.
 */
export function sanitizeCurrencyToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Check for negative in parentheses: "(₱1,250.00)" or "(1250.00)"
  const isParenNegative = /^\(.*\)$/.test(str);

  // Strip currencies, commas, spaces, currency codes
  let cleaned = str
    .replace(/[₱$€£]/g, '')
    .replace(/\b(RM|PHP|SGD|MYR|IDR|THB|VND|USD|EUR)\b/gi, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '');

  if (!cleaned) return null;

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  return isParenNegative ? -Math.abs(num) : num;
}

/**
 * Parse an Excel (.xlsx, .xls) or CSV file in the browser using SheetJS.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No sheet found in the uploaded file.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse as raw 2D array to intelligently identify the true header row
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error('Spreadsheet appears to be empty.');
  }

  // Find header row: some marketplace exports (like Shopee or Lazada) have a title or metadata in row 0
  // The header row is usually the first row with >= 3 non-empty string cells
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawMatrix.length, 10); i++) {
    const row = rawMatrix[i];
    const stringCells = row.filter((cell) => cell !== '' && cell !== null && cell !== undefined);
    if (stringCells.length >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = rawMatrix[headerRowIndex].map((h: any, idx: number) => {
    const str = String(h ?? '').trim();
    return str || `Column_${idx + 1}`;
  });

  // Ensure header names are unique
  const headerCountMap = new Map<string, number>();
  const headers = rawHeaders.map((header) => {
    const count = headerCountMap.get(header) || 0;
    headerCountMap.set(header, count + 1);
    return count > 0 ? `${header}_${count}` : header;
  });

  // Convert subsequent rows into records
  const dataRows: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const rawRow = rawMatrix[r];
    // Check if row has any content
    const hasContent = rawRow.some((val) => val !== '' && val !== null && val !== undefined);
    if (!hasContent) continue;

    // Skip marketplace instructional/guidance rows (e.g. TikTok Shop row 1: "Platform unique order ID.")
    const firstCellStr = String(rawRow[0] ?? '').trim().toLowerCase();
    if (
      firstCellStr.includes('platform unique order id') ||
      firstCellStr.includes('platform order id') ||
      firstCellStr.includes('platform sku id')
    ) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    headers.forEach((hdr, colIdx) => {
      let cellVal = rawRow[colIdx];
      if (cellVal instanceof Date) {
        if (!isNaN(cellVal.getTime())) {
          const y = cellVal.getFullYear();
          const m = String(cellVal.getMonth() + 1).padStart(2, '0');
          const d = String(cellVal.getDate()).padStart(2, '0');
          const hh = cellVal.getHours();
          const mm = cellVal.getMinutes();
          const ss = cellVal.getSeconds();
          if (hh === 0 && mm === 0 && ss === 0) {
            cellVal = `${y}-${m}-${d}`;
          } else {
            cellVal = `${y}-${m}-${d} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
          }
        } else {
          cellVal = '';
        }
      }
      rowObj[hdr] = cellVal ?? '';
    });
    dataRows.push(rowObj);
  }

  const summableHeaders = detectSummableColumns(headers, dataRows);
  const dateHeaders = detectDateColumns(headers, dataRows);

  return {
    fileName: file.name,
    fileSize: file.size,
    headers,
    summableHeaders,
    dateHeaders,
    rows: dataRows,
    totalRowCount: dataRows.length,
    fileCount: 1,
    fileNames: [file.name],
  };
}

/**
 * Checks whether two header lists share the same format (column names match).
 */
export function haveSameHeadersFormat(headers1: string[], headers2: string[]): boolean {
  if (headers1.length !== headers2.length) return false;
  const norm1 = headers1.map((h) => h.toLowerCase().trim());
  const norm2 = headers2.map((h) => h.toLowerCase().trim());

  // 1. Direct match by index (most marketplace multi-part exports)
  const isDirectOrder = norm1.every((h, i) => h === norm2[i]);
  if (isDirectOrder) return true;

  // 2. Set equality
  const set2 = new Set(norm2);
  return norm1.every((h) => set2.has(h));
}

/**
 * Parses multiple Excel/CSV spreadsheet files.
 * Validates that all files share the exact same format; throws an error if any file differs.
 */
export async function parseMultipleSpreadsheets(files: File[]): Promise<ParsedSpreadsheet> {
  if (files.length === 0) {
    throw new Error('No files provided.');
  }

  if (files.length === 1) {
    return parseSpreadsheetFile(files[0]);
  }

  // Parse all files concurrently
  const parsedList = await Promise.all(files.map((file) => parseSpreadsheetFile(file)));

  // Ensure every file has readable data rows
  for (let i = 0; i < parsedList.length; i++) {
    if (parsedList[i].rows.length === 0) {
      throw new Error(`File "${files[i].name}" contains no readable rows or transactions.`);
    }
  }

  // Verify that all uploaded files share the exact same format as the first file
  const baseHeaders = parsedList[0].headers;
  for (let i = 1; i < parsedList.length; i++) {
    const current = parsedList[i];
    if (!haveSameHeadersFormat(baseHeaders, current.headers)) {
      throw new Error('Please make sure all uploaded Excel files share the same format.');
    }
  }

  // Combine rows across all files, preserving base header keys
  const combinedRows: Record<string, any>[] = [];
  for (const parsed of parsedList) {
    const keyMap = new Map<string, string>();
    for (const hBase of baseHeaders) {
      const match = parsed.headers.find(
        (h) => h.toLowerCase().trim() === hBase.toLowerCase().trim()
      );
      if (match) {
        keyMap.set(match, hBase);
      }
    }

    for (const row of parsed.rows) {
      const normalizedRow: Record<string, any> = {};
      for (const hBase of baseHeaders) {
        const origKey =
          Array.from(keyMap.entries()).find(([_, target]) => target === hBase)?.[0] || hBase;
        normalizedRow[hBase] = row[origKey] ?? row[hBase] ?? '';
      }
      combinedRows.push(normalizedRow);
    }
  }

  const totalFileSize = files.reduce((acc, f) => acc + f.size, 0);
  const fileNames = files.map((f) => f.name);
  const displayFileName = `${files[0].name} (+${files.length - 1} more)`;

  const summableHeaders = detectSummableColumns(baseHeaders, combinedRows);
  const dateHeaders = detectDateColumns(baseHeaders, combinedRows);

  return {
    fileName: displayFileName,
    fileSize: totalFileSize,
    headers: baseHeaders,
    summableHeaders,
    dateHeaders,
    rows: combinedRows,
    totalRowCount: combinedRows.length,
    fileCount: files.length,
    fileNames,
  };
}

/**
 * Robustly parses various date formats common in marketplace exports:
 * - ISO / YYYY-MM-DD (Shopee, standard exports)
 * - DD MMM YYYY (Lazada)
 * - MM/DD/YYYY or DD/MM/YYYY with optional 12/24hr time (TikTok Shop)
 * - Excel serial dates (44000+)
 */
export function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Exclude booleans, dashes, and common placeholder tokens
  if (/^(true|false|yes|no|null|undefined|nan|-|--|n\/a)$/i.test(str)) return null;

  // Excel serial dates: 35000 to 65000 (~1995 to ~2078)
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num >= 35000 && num <= 65000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  // Reject pure numbers (currency amounts, quantities, IDs)
  if (/^-?\d+(\.\d+)?$/.test(str)) return null;

  // 1. Format: YYYY-MM-DD or YYYY/MM/DD (with optional time)
  const ymdMatch = str.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );
  if (ymdMatch) {
    const [_, y, m, d, hh, mm, ss] = ymdMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    const hours = hh ? parseInt(hh, 10) : 0;
    const mins = mm ? parseInt(mm, 10) : 0;
    const secs = ss ? parseInt(ss, 10) : 0;
    const date = new Date(year, month, day, hours, mins, secs);
    if (!isNaN(date.getTime())) return date;
  }

  // 2. Format: DD MMM YYYY (e.g. "01 Oct 2026 14:42" or "1 Oct 2026")
  const dMmmYMatch = str.match(
    /^(\d{1,2})[\s-]([A-Za-z]{3,9})[\s-](\d{4})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/i
  );
  if (dMmmYMatch) {
    const direct = new Date(str);
    if (!isNaN(direct.getTime())) return direct;
  }

  // 3. Format: MM/DD/YYYY or DD/MM/YYYY (e.g. "10/01/2026 5:00:01 PM")
  const slashMatch = str.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i
  );
  if (slashMatch) {
    const direct = new Date(str);
    if (!isNaN(direct.getTime()) && direct.getFullYear() >= 1990 && direct.getFullYear() <= 2100) {
      return direct;
    }
    const [_, part1, part2, yearStr] = slashMatch;
    const p1 = parseInt(part1, 10);
    const p2 = parseInt(part2, 10);
    const yr = parseInt(yearStr, 10);
    // If part1 > 12, it must be DD/MM/YYYY
    if (p1 > 12 && p2 <= 12) {
      const date = new Date(yr, p2 - 1, p1);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // 4. Fallback for strings containing date-like punctuation or month names
  if (/[-/:,\s]/.test(str)) {
    const direct = new Date(str);
    if (!isNaN(direct.getTime()) && direct.getFullYear() >= 1990 && direct.getFullYear() <= 2100) {
      return direct;
    }
  }

  return null;
}

/**
 * Checks whether a column contains date/timestamp values.
 */
export function isDateColumn(header: string, rows: Record<string, any>[]): boolean {
  const h = header.toLowerCase().trim();

  // Exclude non-date columns explicitly
  const excludeKeywords =
    /(fee|price|amount|cost|payout|rebate|tax|subtotal|discount|rate|quantity|qty|count|weight|sku|phone|mobile|contact|postcode|zip|address|street|city|province|country|name|username|email|buyer|seller|reason|comment|remark|status|tracking|url|link|method|option|channel|provider|\bid\b|_id\b)/i;

  if (excludeKeywords.test(h)) {
    return false;
  }

  const dateKeywords =
    /(date|time|timestamp|created|updated|create_time|update_time|createtime|updatetime|shipped|delivered|paid|sla|period|completed)/i;
  const hasDateKeyword = dateKeywords.test(h);

  let validDateCount = 0;
  let totalChecked = 0;

  for (let i = 0; i < rows.length && totalChecked < 30; i++) {
    const val = rows[i][header];
    if (val === undefined || val === null || val === '') continue;

    // Skip informational / instruction rows (like TikTok notes)
    const firstCell = String(Object.values(rows[i])[0] ?? '').toLowerCase();
    if (firstCell.includes('platform unique order id') || firstCell.includes('platform sku id')) {
      continue;
    }

    totalChecked++;
    const parsed = parseDateValue(val);
    if (parsed) validDateCount++;
  }

  if (totalChecked === 0) {
    return hasDateKeyword;
  }

  if (hasDateKeyword) {
    return validDateCount / totalChecked >= 0.5;
  }

  return validDateCount / totalChecked >= 0.75;
}

/**
 * Returns all headers in the spreadsheet that qualify as date columns.
 */
export function detectDateColumns(headers: string[], rows: Record<string, any>[]): string[] {
  return headers.filter((header) => isDateColumn(header, rows));
}

/**
 * Checks whether a given cell's date falls within [startDateStr, endDateStr] (inclusive).
 * Dates are compared in local day precision.
 */
export function isDateInRange(
  dateValue: unknown,
  startDateStr?: string,
  endDateStr?: string
): boolean {
  if (!startDateStr && !endDateStr) return true;

  const date = parseDateValue(dateValue);
  if (!date) return false;

  const time = date.getTime();

  if (startDateStr) {
    const [sY, sM, sD] = startDateStr.split('-').map(Number);
    const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
    if (time < start) return false;
  }

  if (endDateStr) {
    const [eY, eM, eD] = endDateStr.split('-').map(Number);
    const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();
    if (time > end) return false;
  }

  return true;
}

/**
 * Computes the minimum date and maximum date found in a given column for the dataset.
 */
export function getDateColumnBounds(
  rows: Record<string, any>[],
  columnName: string
): { minDate: Date | null; maxDate: Date | null; validCount: number } {
  let minTime = Infinity;
  let maxTime = -Infinity;
  let validCount = 0;

  for (const row of rows) {
    const d = parseDateValue(row[columnName]);
    if (d) {
      const t = d.getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
      validCount++;
    }
  }

  return {
    minDate: minTime !== Infinity ? new Date(minTime) : null,
    maxDate: maxTime !== -Infinity ? new Date(maxTime) : null,
    validCount,
  };
}

/**
 * Format a Date object to YYYY-MM-DD for native <input type="date">.
 */
export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object for friendly user display (e.g., "Sep 1, 2026").
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


/**
 * Detects whether a column represents a numeric/financial metric that can be summed.
 * Explicitly rejects identifiers (order IDs, SKU IDs, tracking IDs), dates/times,
 * telephone numbers, postal codes, and text/metadata fields.
 */
export function isSummableColumn(header: string, rows: Record<string, any>[]): boolean {
  const h = header.toLowerCase().trim();

  // 1. Exclude identifiers, numbers that represent codes/identifiers, and SKU codes
  // Exception: count phrases like "number of items" or "items count"
  const isId =
    /(\bid\b|_id|\bno\b|\bnumber\b)/i.test(h) &&
    !/number\s+of\s+items|items\s+count|no\.\s*of\s+items/i.test(h);

  // 2. Exclude dates, timestamps, SLA, periods
  const isDateOrTime = /(date|time|timestamp|sla|created|updated|year|month|day)/i.test(h);

  // 3. Exclude phone numbers, postal codes, contacts
  const isPhoneOrZip = /(phone|mobile|tel|contact|zip|postal|postcode)/i.test(h);

  // 4. Exclude textual metadata, statuses, reasons, and addresses
  const isTextOrMeta =
    /(name|username|email|address|street|city|province|country|region|district|town|barangay|note|remark|reason|option|method|channel|provider|category|url|link|handle|status|type|indicator|invoice)/i.test(
      h
    );

  if (isId || isDateOrTime || isPhoneOrZip || isTextOrMeta) {
    return false;
  }

  // 5. If header has "sku" but NOT any metric word (price, subtotal, discount, weight, amount, cost), reject
  if (/\bsku\b/i.test(h) && !/(price|subtotal|discount|weight|amount|cost)/i.test(h)) {
    return false;
  }

  // 6. Data sampling check
  let validNumericCount = 0;
  let totalChecked = 0;

  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const val = rows[i][header];
    if (val === undefined || val === null || val === '') continue;
    totalChecked++;

    const str = String(val).trim();
    // Strip currencies, currency codes, commas, parentheses, spaces
    const cleaned = str
      .replace(/[₱$€£]/g, '')
      .replace(/\b(RM|PHP|SGD|MYR|IDR|THB|VND|USD|EUR)\b/gi, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '')
      .replace(/[()]/g, '');

    // Strict numeric check: must be a real number, not containing letters or underscores
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
      // Long pure integers (>= 10 digits without decimal) are typically phone numbers or barcodes or order IDs
      if (cleaned.length >= 10 && !cleaned.includes('.')) {
        if (!/price|amount|total|subtotal|fee|tax|cost|sales|revenue/i.test(h)) {
          return false;
        }
      }
      validNumericCount++;
    }
  }

  if (totalChecked === 0) return false;
  // At least 65% of sampled non-empty values must be valid numbers
  return validNumericCount / totalChecked >= 0.65;
}

/**
 * Returns all headers in the spreadsheet that qualify as summable columns.
 */
export function detectSummableColumns(headers: string[], rows: Record<string, any>[]): string[] {
  return headers.filter((header) => isSummableColumn(header, rows));
}

/**
 * Computes metric aggregates (Total, Count, Average) for the configured sumColumns.
 */
export function calculateColumnMetrics(
  rows: Record<string, any>[],
  sumColumns: string[],
  deduplicateByOrderId: boolean = false,
  orderIdColumn?: string
): Record<string, ColumnMetric> {
  const metrics: Record<string, ColumnMetric> = {};

  // Deduplicate rows if requested and orderId column exists
  let targetRows = rows;
  if (deduplicateByOrderId && orderIdColumn && rows.length > 0) {
    const seenOrderIds = new Set<string>();
    targetRows = rows.filter((row) => {
      const orderIdVal = String(row[orderIdColumn] ?? '').trim();
      if (!orderIdVal) return true; // keep if no orderId
      if (seenOrderIds.has(orderIdVal)) {
        return false;
      }
      seenOrderIds.add(orderIdVal);
      return true;
    });
  }

  for (const col of sumColumns) {
    let total = 0;
    let count = 0;

    for (const row of targetRows) {
      const num = sanitizeCurrencyToNumber(row[col]);
      if (num !== null) {
        total += num;
        count++;
      }
    }

    metrics[col] = {
      columnName: col,
      total,
      count,
      average: count > 0 ? total / count : 0,
    };
  }

  return metrics;
}

/**
 * Format a number as currency or standard decimal.
 */
export function formatCurrency(
  value: number,
  currencySymbol: string = '₱',
  fractionDigits: number = 2
): string {
  const isNegative = value < 0;
  const absVal = Math.abs(value);
  const formattedNumber = absVal.toLocaleString('en-PH', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return isNegative ? `-${currencySymbol}${formattedNumber}` : `${currencySymbol}${formattedNumber}`;
}

/**
 * Exports the filtered columns and data rows to .xlsx or .csv using SheetJS.
 */
export function exportCleanedSpreadsheet({
  rows,
  selectedColumns,
  sumColumns,
  format,
  baseFileName,
  includeTotalsRow = true,
}: {
  rows: Record<string, any>[];
  selectedColumns: string[];
  sumColumns: string[];
  format: ExportFormat;
  baseFileName: string;
  includeTotalsRow?: boolean;
}): void {
  if (selectedColumns.length === 0) {
    throw new Error('Please select at least one column to export.');
  }

  // Build filtered row data
  const exportData = rows.map((row) => {
    const cleanRow: Record<string, any> = {};
    for (const col of selectedColumns) {
      cleanRow[col] = row[col] ?? '';
    }
    return cleanRow;
  });

  // Calculate totals row if requested
  if (includeTotalsRow && sumColumns.length > 0 && exportData.length > 0) {
    const totalsRow: Record<string, any> = {};
    const firstCol = selectedColumns[0];
    totalsRow[firstCol] = 'TOTAL';

    for (const col of selectedColumns) {
      if (sumColumns.includes(col)) {
        let sum = 0;
        for (const row of rows) {
          const num = sanitizeCurrencyToNumber(row[col]);
          if (num !== null) sum += num;
        }
        totalsRow[col] = Number(sum.toFixed(2));
      } else if (col !== firstCol) {
        totalsRow[col] = '';
      }
    }
    exportData.push(totalsRow);
  }

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData, { header: selectedColumns });

  // Auto-fit column widths
  const colWidths = selectedColumns.map((col) => {
    const colNameLen = col.length;
    let maxValLen = 0;
    // Check first 50 rows for max length
    for (let i = 0; i < Math.min(exportData.length, 50); i++) {
      const valStr = String(exportData[i]?.[col] ?? '');
      if (valStr.length > maxValLen) maxValLen = valStr.length;
    }
    return { wch: Math.min(Math.max(colNameLen, maxValLen) + 4, 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cleaned Data');

  const cleanName = baseFileName.replace(/\.[^/.]+$/, '');
  const outFileName = `${cleanName}_bentasum_cleaned.${format}`;

  XLSX.writeFile(workbook, outFileName, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
}
