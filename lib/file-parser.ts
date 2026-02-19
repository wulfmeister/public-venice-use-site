import Papa from 'papaparse';
import { ParsedFile, ParsedCSVData, ParsedPDFData, ParsedXLSXData } from './types';

const MAX_CONTEXT_SIZE = 400 * 1024; // 400KB threshold
const MAX_PDF_TEXT_LENGTH = 50_000; // 50K chars

export function parseGenericCSV(data: string[][]): ParsedCSVData {
  const dataRows = data.length > 0 ? data.length - 1 : 0;
  return {
    type: 'csv',
    rows: dataRows,
    columns: data.length > 0 ? data[0].length : 0,
    headers: data.length > 0 ? data[0] : [],
    data: data.slice(1, Math.min(101, data.length)),
    sampleNote: dataRows > 100 ? `Showing first 100 of ${dataRows} data rows` : null
  };
}

export async function parseCSVFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      complete: (results) => {
        const data = results.data as string[][];
        const parsedFile: ParsedFile = {
          fileName: file.name,
          fileSize: file.size,
          parsedAt: new Date().toISOString(),
          format: 'CSV',
          data: parseGenericCSV(data)
        };
        resolve(parsedFile);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export async function parsePDFFile(file: File): Promise<ParsedFile> {
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  let truncated = false;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}`;

    if (fullText.length > MAX_PDF_TEXT_LENGTH) {
      fullText = fullText.slice(0, MAX_PDF_TEXT_LENGTH);
      truncated = true;
      break;
    }
  }

  const data: ParsedPDFData = {
    type: 'pdf',
    text: fullText.trim(),
    pages: pdf.numPages,
    truncated,
    ...(truncated ? { note: `Text truncated at ${MAX_PDF_TEXT_LENGTH} characters` } : {}),
  };

  return {
    fileName: file.name,
    fileSize: file.size,
    parsedAt: new Date().toISOString(),
    format: 'PDF',
    data,
  };
}

export async function parseXLSXFile(file: File): Promise<ParsedFile> {
  const XLSX = await import('xlsx');

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheets: ParsedXLSXData['sheets'] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    });
    return { name, data: parseGenericCSV(rows) };
  });

  const data: ParsedXLSXData = { type: 'xlsx', sheets };

  return {
    fileName: file.name,
    fileSize: file.size,
    parsedAt: new Date().toISOString(),
    format: 'XLSX',
    data,
  };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.toLowerCase().split('.').pop();
  switch (ext) {
    case 'csv':
      return parseCSVFile(file);
    case 'pdf':
      return parsePDFFile(file);
    case 'xlsx':
    case 'xls':
      return parseXLSXFile(file);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

function buildCSVSummary(ctx: ParsedFile): string {
  const data = ctx.data as ParsedCSVData;
  let summary = `File: ${ctx.fileName} (${ctx.format})\n`;
  summary += `Rows: ${data.rows}\n`;
  summary += `Columns: ${data.columns}\n`;
  if (data.sampleNote) {
    summary += `Note: ${data.sampleNote}\n`;
  }
  summary += `\nHeaders: ${data.headers.slice(0, 10).join(', ')}${data.headers.length > 10 ? '...' : ''}\n`;
  return summary;
}

function buildPDFSummary(ctx: ParsedFile): string {
  const data = ctx.data as ParsedPDFData;
  let summary = `File: ${ctx.fileName} (${ctx.format})\n`;
  summary += `Pages: ${data.pages}\n`;
  if (data.truncated) {
    summary += `Note: ${data.note}\n`;
  }
  summary += `\nText preview:\n${data.text.slice(0, 500)}${data.text.length > 500 ? '...' : ''}\n`;
  return summary;
}

function buildXLSXSummary(ctx: ParsedFile): string {
  const data = ctx.data as ParsedXLSXData;
  let summary = `File: ${ctx.fileName} (${ctx.format})\n`;
  summary += `Sheets: ${data.sheets.length}\n`;
  data.sheets.forEach((sheet) => {
    summary += `\n  Sheet "${sheet.name}": ${sheet.data.rows} rows, ${sheet.data.columns} columns\n`;
    summary += `  Headers: ${sheet.data.headers.slice(0, 10).join(', ')}${sheet.data.headers.length > 10 ? '...' : ''}\n`;
  });
  return summary;
}

export function buildSummaryContext(parsedFiles: ParsedFile[]): string {
  const summaries = parsedFiles.map(ctx => {
    switch (ctx.data.type) {
      case 'pdf':
        return buildPDFSummary(ctx);
      case 'xlsx':
        return buildXLSXSummary(ctx);
      case 'csv':
      default:
        return buildCSVSummary(ctx);
    }
  });

  return summaries.join('\n\n' + '='.repeat(50) + '\n\n');
}

// Builds the context string sent alongside chat messages. If total file data
// exceeds MAX_CONTEXT_SIZE, falls back to a compact header-only summary.
export function buildFileContext(parsedFiles: ParsedFile[]): { data: string; warning?: string; totalSize: number } {
  let totalSize = 0;
  const rawDataStrings: string[] = [];

  parsedFiles.forEach(ctx => {
    const jsonString = JSON.stringify(ctx);
    totalSize += jsonString.length;
    rawDataStrings.push(jsonString);
  });

  let dataToSend: string;
  let warning: string | undefined;

  if (totalSize > MAX_CONTEXT_SIZE) {
    warning = `Total data size (${formatFileSize(totalSize)}) exceeds threshold. Using summary mode.`;
    dataToSend = buildSummaryContext(parsedFiles);
  } else {
    dataToSend = rawDataStrings.join('\n');
  }

  return {
    data: dataToSend,
    warning,
    totalSize
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
