import { describe, it, expect } from 'vitest';
import {
  parseGenericCSV,
  parseCSVFile,
  parseFile,
  buildSummaryContext,
  buildFileContext,
  formatFileSize
} from '../file-parser';
import { ParsedFile } from '../types';

// ---------- parseGenericCSV ----------

describe('parseGenericCSV', () => {
  it('parses CSV data and excludes header from row count', () => {
    const data = [
      ['Name', 'Age'],
      ['Alice', '30'],
      ['Bob', '25']
    ];
    const result = parseGenericCSV(data);
    expect(result.type).toBe('csv');
    expect(result.rows).toBe(2);       // data rows only, header excluded
    expect(result.columns).toBe(2);
    expect(result.headers).toEqual(['Name', 'Age']);
    expect(result.data).toHaveLength(2);
  });

  it('limits to 100 data rows and reports correct count', () => {
    // 1 header + 149 data rows = 150 total
    const data = Array.from({ length: 150 }, (_, i) => [`row${i}`]);
    const result = parseGenericCSV(data);
    expect(result.rows).toBe(149);     // 150 total - 1 header
    expect(result.data).toHaveLength(100);
    expect(result.sampleNote).toContain('149');
  });

  it('handles empty data', () => {
    const result = parseGenericCSV([]);
    expect(result.rows).toBe(0);
    expect(result.columns).toBe(0);
  });

  it('handles header-only CSV', () => {
    const data = [['Name', 'Age']];
    const result = parseGenericCSV(data);
    expect(result.rows).toBe(0);
    expect(result.headers).toEqual(['Name', 'Age']);
    expect(result.data).toHaveLength(0);
    expect(result.sampleNote).toBeNull();
  });
});

// ---------- parseCSVFile ----------

describe('parseCSVFile', () => {
  it('parses a CSV file and returns a ParsedFile', async () => {
    const csvContent = 'Name,Age\nAlice,30\nBob,25';
    const file = new File([csvContent], 'people.csv', { type: 'text/csv' });
    const result = await parseCSVFile(file);

    expect(result.fileName).toBe('people.csv');
    expect(result.fileSize).toBe(csvContent.length);
    expect(result.format).toBe('CSV');
    expect(result.parsedAt).toBeDefined();
    expect(result.data.type).toBe('csv');
    if (result.data.type === 'csv') {
      expect(result.data.headers).toEqual(['Name', 'Age']);
      expect(result.data.rows).toBe(2);
    }
  });

  it('handles single-column CSV', async () => {
    const csvContent = 'Items\napple\nbanana';
    const file = new File([csvContent], 'items.csv', { type: 'text/csv' });
    const result = await parseCSVFile(file);

    if (result.data.type === 'csv') {
      expect(result.data.columns).toBe(1);
      expect(result.data.rows).toBe(2);  // 2 data rows, header excluded
    }
  });
});

// ---------- parseFile dispatcher ----------

describe('parseFile', () => {
  it('routes .csv to CSV parser', async () => {
    const csvContent = 'A,B\n1,2';
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' });
    const result = await parseFile(file);
    expect(result.format).toBe('CSV');
    expect(result.data.type).toBe('csv');
  });

  it('throws for unsupported extensions', async () => {
    const file = new File(['hello'], 'readme.txt', { type: 'text/plain' });
    await expect(parseFile(file)).rejects.toThrow('Unsupported file type: .txt');
  });

  it('throws for files with no extension', async () => {
    const file = new File(['data'], 'Makefile', { type: 'application/octet-stream' });
    await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
  });
});

// ---------- XLSX parsing ----------

// Helper: jsdom's File/Blob may not implement .arrayBuffer(), so we
// attach one manually backed by the raw bytes.
function createTestFile(data: Uint8Array | ArrayBuffer, name: string, type?: string): File {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const file = new File([bytes], name, { type });
  if (typeof file.arrayBuffer !== 'function') {
    (file as File & { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = () =>
      Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
  return file;
}

describe('parseXLSXFile', () => {
  it('parses an XLSX workbook with multiple sheets', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.aoa_to_sheet([
      ['Name', 'Score'],
      ['Alice', '95'],
      ['Bob', '87'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Grades');

    const ws2 = XLSX.utils.aoa_to_sheet([
      ['City', 'Pop'],
      ['NYC', '8M'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Cities');

    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = createTestFile(new Uint8Array(buf), 'report.xlsx');

    const { parseXLSXFile } = await import('../file-parser');
    const result = await parseXLSXFile(file);

    expect(result.format).toBe('XLSX');
    expect(result.fileName).toBe('report.xlsx');
    expect(result.data.type).toBe('xlsx');
    if (result.data.type === 'xlsx') {
      expect(result.data.sheets).toHaveLength(2);
      expect(result.data.sheets[0].name).toBe('Grades');
      expect(result.data.sheets[0].data.rows).toBe(2);      // 2 data rows
      expect(result.data.sheets[0].data.headers).toEqual(['Name', 'Score']);
      expect(result.data.sheets[1].name).toBe('Cities');
      expect(result.data.sheets[1].data.rows).toBe(1);
    }
  });

  it('handles an empty sheet', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Empty');

    const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = createTestFile(new Uint8Array(buf), 'empty.xlsx');

    const { parseXLSXFile } = await import('../file-parser');
    const result = await parseXLSXFile(file);

    if (result.data.type === 'xlsx') {
      expect(result.data.sheets[0].data.rows).toBe(0);
      expect(result.data.sheets[0].data.columns).toBe(0);
    }
  });
});

// ---------- PDF parsing ----------

describe('parsePDFFile', () => {
  // pdfjs-dist needs a worker and a real PDF binary — hard to unit-test in
  // jsdom without significant mocking.  We test via parseFile dispatcher to
  // verify the extension routing rejects/accepts correctly, and defer full
  // PDF integration testing to e2e.

  it('routes .pdf extension through parseFile', async () => {
    // A non-PDF file with .pdf extension should fail inside pdfjs, giving
    // us confidence the dispatcher routes correctly.
    const file = new File(['not-a-real-pdf'], 'doc.pdf', { type: 'application/pdf' });
    await expect(parseFile(file)).rejects.toThrow();
  });
});

// ---------- buildSummaryContext ----------

describe('buildSummaryContext', () => {
  it('includes file name, rows, columns, and headers for CSV', () => {
    const files: ParsedFile[] = [{
      fileName: 'data.csv',
      fileSize: 100,
      parsedAt: '2024-01-01',
      format: 'CSV',
      data: { type: 'csv', rows: 5, columns: 3, headers: ['a', 'b', 'c'], data: [], sampleNote: null }
    }];
    const result = buildSummaryContext(files);
    expect(result).toContain('data.csv');
    expect(result).toContain('Rows: 5');
    expect(result).toContain('Columns: 3');
    expect(result).toContain('Headers: a, b, c');
  });

  it('includes sampleNote when present', () => {
    const files: ParsedFile[] = [{
      fileName: 'big.csv',
      fileSize: 100,
      parsedAt: '2024-01-01',
      format: 'CSV',
      data: { type: 'csv', rows: 200, columns: 2, headers: ['x', 'y'], data: [], sampleNote: 'Showing first 100 of 200 data rows' }
    }];
    const result = buildSummaryContext(files);
    expect(result).toContain('Note: Showing first 100 of 200 data rows');
  });

  it('truncates headers beyond 10 with ellipsis', () => {
    const headers = Array.from({ length: 15 }, (_, i) => `col${i}`);
    const files: ParsedFile[] = [{
      fileName: 'wide.csv',
      fileSize: 100,
      parsedAt: '2024-01-01',
      format: 'CSV',
      data: { type: 'csv', rows: 2, columns: 15, headers, data: [], sampleNote: null }
    }];
    const result = buildSummaryContext(files);
    expect(result).toContain('col9');
    expect(result).toContain('...');
    expect(result).not.toContain('col10');
  });

  it('joins multiple files with separator', () => {
    const files: ParsedFile[] = [
      { fileName: 'a.csv', fileSize: 10, parsedAt: '2024-01-01', format: 'CSV', data: { type: 'csv', rows: 1, columns: 1, headers: ['x'], data: [], sampleNote: null } },
      { fileName: 'b.csv', fileSize: 10, parsedAt: '2024-01-01', format: 'CSV', data: { type: 'csv', rows: 1, columns: 1, headers: ['y'], data: [], sampleNote: null } }
    ];
    const result = buildSummaryContext(files);
    expect(result).toContain('a.csv');
    expect(result).toContain('b.csv');
    expect(result).toContain('==================================================');
  });

  it('generates PDF summary with page count and text preview', () => {
    const files: ParsedFile[] = [{
      fileName: 'doc.pdf',
      fileSize: 5000,
      parsedAt: '2024-01-01',
      format: 'PDF',
      data: { type: 'pdf', text: 'Hello world from PDF', pages: 3, truncated: false }
    }];
    const result = buildSummaryContext(files);
    expect(result).toContain('doc.pdf');
    expect(result).toContain('Pages: 3');
    expect(result).toContain('Hello world from PDF');
  });

  it('generates PDF summary with truncation note', () => {
    const files: ParsedFile[] = [{
      fileName: 'long.pdf',
      fileSize: 100000,
      parsedAt: '2024-01-01',
      format: 'PDF',
      data: { type: 'pdf', text: 'x'.repeat(1000), pages: 50, truncated: true, note: 'Text truncated at 50000 characters' }
    }];
    const result = buildSummaryContext(files);
    expect(result).toContain('Pages: 50');
    expect(result).toContain('Note: Text truncated');
  });

  it('generates XLSX summary with sheet info', () => {
    const files: ParsedFile[] = [{
      fileName: 'report.xlsx',
      fileSize: 8000,
      parsedAt: '2024-01-01',
      format: 'XLSX',
      data: {
        type: 'xlsx',
        sheets: [
          { name: 'Sales', data: { type: 'csv', rows: 50, columns: 4, headers: ['Date', 'Product', 'Qty', 'Revenue'], data: [], sampleNote: null } },
          { name: 'Returns', data: { type: 'csv', rows: 10, columns: 3, headers: ['Date', 'Product', 'Reason'], data: [], sampleNote: null } },
        ]
      }
    }];
    const result = buildSummaryContext(files);
    expect(result).toContain('report.xlsx');
    expect(result).toContain('Sheets: 2');
    expect(result).toContain('Sales');
    expect(result).toContain('50 rows');
    expect(result).toContain('Returns');
    expect(result).toContain('Date, Product, Qty, Revenue');
  });
});

// ---------- buildFileContext ----------

describe('buildFileContext', () => {
  it('returns raw data for small files', () => {
    const parsedFiles: ParsedFile[] = [{
      fileName: 'test.csv',
      fileSize: 100,
      parsedAt: '2024-01-01',
      format: 'CSV',
      data: { type: 'csv', rows: 2, columns: 2, headers: ['a', 'b'], data: [['1', '2']], sampleNote: null }
    }];
    const result = buildFileContext(parsedFiles);
    expect(result.warning).toBeUndefined();
    expect(result.data).toContain('test.csv');
  });

  it('uses summary mode for large data', () => {
    const largeData = 'x'.repeat(500 * 1024);
    const parsedFiles: ParsedFile[] = [{
      fileName: 'big.csv',
      fileSize: 500 * 1024,
      parsedAt: '2024-01-01',
      format: 'CSV',
      data: { type: 'csv', rows: 10000, columns: 50, headers: ['col'], data: [[largeData]], sampleNote: null }
    }];
    const result = buildFileContext(parsedFiles);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('threshold');
  });
});

// ---------- formatFileSize ----------

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });
});

