'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Download,
  Layers,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { tenderRepository } from '../lib/repositories/tenderRepository';
import { normalizeStatus, normalizeLocation } from '../lib/normalize';
import { toFils, formatAED } from '../lib/money';
import { DuplicateStrategy } from '../types';
import { can } from '../lib/permissions';
import { AccessDenied } from '../components/ui/AccessDenied';

interface ParsedRow {
  index: number;
  raw: Record<string, any>;
  tenderNumber: number;
  clientNameRaw: string;
  location: string;
  status: string;
  tenderAmount: bigint | null;
  totalAreaSqm: number | null;
  sourceRaw: string;
  remarks: string;
  consultantName: string;
  projectNumber: number | null;
  contractDate: string | null;
  fiscalYear: number;
  errors: string[];
  warnings: string[];
}

export const AdminImportView: React.FC = () => {
  const { currentUser, refreshData } = useAuth();

  const [step, setStep] = useState<'upload' | 'preview' | 'completed'>('upload');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('SKIP');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);

  // File drop/upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Parse across all sheets (e.g. 2024, 2025, 2026) or first sheet
        let allParsed: ParsedRow[] = [];
        let globalIndex = 0;

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

          // Infer fiscal year from sheet name if numeric, else default to current year
          const sheetYear = parseInt(sheetName, 10) || new Date().getFullYear();

          rawJson.forEach((row) => {
            globalIndex++;
            const errors: string[] = [];
            const warnings: string[] = [];

            // Match headers flexibly
            const tenderNumRaw =
              row['Tenders Number'] ||
              row['Tender Number'] ||
              row['Tender No'] ||
              row['Tender #'] ||
              row['Tenders No'];
            const tenderNumber = parseInt(tenderNumRaw, 10);

            if (isNaN(tenderNumber) || tenderNumber <= 0) {
              errors.push('Missing or invalid Tender Number');
            }

            const clientNameRaw =
              row['Client Name'] || row['Client'] || row['Client / Employer'] || '';
            if (!clientNameRaw.toString().trim()) {
              errors.push('Client Name is required');
            }

            const locationRaw = row['Location'] || row['Site Location'] || '';
            const location = normalizeLocation(locationRaw.toString());
            if (!location) {
              warnings.push('Location missing; defaulted to Abu Dhabi');
            }

            const statusRaw = row['Status'] || 'Submitted';
            const normStatus = normalizeStatus(statusRaw).status;

            const amountRaw =
              row['Tender Amount'] || row['Tender Amount (AED)'] || row['Amount'] || null;
            const tenderAmount = amountRaw ? toFils(amountRaw) : null;

            const areaRaw =
              row['Total Area In SQM'] ||
              row['Total Area (SQM)'] ||
              row['Area'] ||
              row['Total Area in SQM'] ||
              null;
            const totalAreaSqm = areaRaw ? parseFloat(areaRaw.toString()) : null;

            const sourceRaw = row['Sourced'] || row['Source'] || '';
            const remarks = row['Remarks'] || '';
            const consultantName =
              row['Consultant Company Name'] ||
              row['Consultant Name'] ||
              row['Consultant'] ||
              '';

            // Check for Award project number
            const pjRaw =
              row['Project Number (PJ/N)'] || row['Project Number'] || row['PJ/N'] || row['PJ'];
            let projectNumber: number | null = null;
            if (pjRaw) {
              const cleaned = pjRaw.toString().replace(/\D/g, '');
              if (cleaned) projectNumber = parseInt(cleaned, 10);
            }

            const contractDateRaw =
              row['Contract Execution Date'] || row['Contract Date'] || null;
            const contractDate = contractDateRaw ? contractDateRaw.toString() : null;

            allParsed.push({
              index: globalIndex,
              raw: row,
              tenderNumber,
              clientNameRaw: clientNameRaw.toString().trim(),
              location: location || 'Abu Dhabi',
              status: normStatus,
              tenderAmount,
              totalAreaSqm,
              sourceRaw: sourceRaw.toString().trim(),
              remarks: remarks.toString().trim(),
              consultantName: consultantName.toString().trim(),
              projectNumber,
              contractDate,
              fiscalYear: sheetYear,
              errors,
              warnings,
            });
          });
        });

        setParsedRows(allParsed);
        setStep('preview');
      } catch (err: any) {
        alert('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Run Commit Batch
  const handleCommit = () => {
    setImporting(true);
    try {
      const validRows = parsedRows.filter((r) => r.errors.length === 0);

      const mappedData = validRows.map((r) => ({
        tenderNumber: r.tenderNumber,
        clientNameRaw: r.clientNameRaw,
        location: r.location,
        statusRaw: r.status,
        tenderAmount: r.tenderAmount ? Number(r.tenderAmount / 100n) : null,
        totalAreaSqm: r.totalAreaSqm,
        sourceRaw: r.sourceRaw,
        remarks: r.remarks,
        consultantCompanyRaw: r.consultantName,
        projectNumber: r.projectNumber,
        contractDate: r.contractDate ? new Date(r.contractDate) : null,
        fiscalYear: r.fiscalYear,
      }));

      const res = tenderRepository.commitImportBatch(currentUser, mappedData, duplicateStrategy);
      setImportResult(res);
      setStep('completed');
      refreshData();
    } catch (err: any) {
      alert('Import batch failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  if (!can(currentUser, 'import_excel')) {
    return <AccessDenied requirement="Only the Manager, Admin 1 and Admin 2 can migrate Excel data." />;
  }

  const validCount = parsedRows.filter((r) => r.errors.length === 0).length;
  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length;
  const warningCount = parsedRows.filter((r) => r.warnings.length > 0).length;

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-slate-900">
          Excel Data Import & Historical Migration
        </h1>
        <p className="text-xs text-slate-500">
          Import tenders from the master spreadsheet. Headers are matched and duplicates flagged before anything is written.
        </p>
      </div>

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white p-8 rounded-md border border-slate-300 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#8b151b] flex items-center justify-center mx-auto">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-bold text-base text-gray-900">
              Upload Master Tracking Spreadsheet (.xlsx)
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Supports standard multi-year sheets (e.g. "2024", "2025", "2026") matching Inspire Builders General Contracting legacy schema.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-bold text-xs text-white bg-[#8b151b] hover:bg-[#731217] cursor-pointer transition-all">
            <FileSpreadsheet className="w-4 h-4 text-red-200" />
            <span>Select Excel File to Validate</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="pt-4 border-t border-slate-200 max-w-lg mx-auto text-left">
            <div className="text-[11px] font-medium text-gray-400 mb-2">
              Recognized Legacy Headers:
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-gray-600">
              <span className="px-2 py-0.5 rounded bg-gray-100">Tenders Number</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Client Name</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Location</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Target Date</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Status</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Tender Amount</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Sourced</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Total Area In SQM</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">Consultant Company Name</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Validation */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Validation Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-md border border-emerald-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-semibold text-emerald-900 font-mono">
                  {validCount}
                </div>
                <div className="text-[11px] font-bold text-emerald-700">Valid Rows Ready</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md border border-amber-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-semibold text-amber-900 font-mono">
                  {warningCount}
                </div>
                <div className="text-[11px] font-bold text-amber-700">Rows with Warnings</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md border border-red-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-semibold text-red-900 font-mono">
                  {errorCount}
                </div>
                <div className="text-[11px] font-bold text-red-700">Errors (Will be skipped)</div>
              </div>
            </div>
          </div>

          {/* Duplicate Strategy Radio */}
          <div className="bg-white p-4 rounded-md border border-[var(--border)] space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Duplicate Tender Number Resolution Policy
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-start gap-2 p-3 rounded-md border border-slate-300 bg-gray-50 cursor-pointer hover:bg-white">
                <input
                  type="radio"
                  name="strategy"
                  value="SKIP"
                  checked={duplicateStrategy === 'SKIP'}
                  onChange={() => setDuplicateStrategy('SKIP')}
                  className="mt-0.5 text-[#8b151b] focus:ring-[#8b151b]"
                />
                <div>
                  <div className="font-bold text-gray-900">Skip Duplicates</div>
                  <div className="text-[11px] text-gray-500">
                    Existing database tenders remain untouched
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 p-3 rounded-md border border-slate-300 bg-gray-50 cursor-pointer hover:bg-white">
                <input
                  type="radio"
                  name="strategy"
                  value="OVERWRITE"
                  checked={duplicateStrategy === 'OVERWRITE'}
                  onChange={() => setDuplicateStrategy('OVERWRITE')}
                  className="mt-0.5 text-[#8b151b] focus:ring-[#8b151b]"
                />
                <div>
                  <div className="font-bold text-gray-900">Overwrite Existing</div>
                  <div className="text-[11px] text-gray-500">
                    Updates amounts and statuses with imported file
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 p-3 rounded-md border border-slate-300 bg-gray-50 cursor-pointer hover:bg-white">
                <input
                  type="radio"
                  name="strategy"
                  value="REVISION"
                  checked={duplicateStrategy === 'REVISION'}
                  onChange={() => setDuplicateStrategy('REVISION')}
                  className="mt-0.5 text-[#8b151b] focus:ring-[#8b151b]"
                />
                <div>
                  <div className="font-bold text-gray-900">Append as Revision</div>
                  <div className="text-[11px] text-gray-500">
                    Creates Rev 1 / Rev 2 child tender records
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Parsed Rows Sample Table */}
          <div className="bg-white rounded-md border border-[var(--border)] overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-slate-300 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700">
                Dry-run Preview: {parsedRows.length} Rows from "{fileName}"
              </span>
              <span className="text-gray-500">Showing first 20 records</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 sticky top-0">
                  <tr className="border-b border-slate-300">
                    <th className="p-2">Row</th>
                    <th className="p-2">Validation</th>
                    <th className="p-2">Tender #</th>
                    <th className="p-2">Year</th>
                    <th className="p-2">Client Name</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Amount (AED)</th>
                    <th className="p-2 text-right">Area</th>
                    <th className="p-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {parsedRows.slice(0, 20).map((r) => {
                    const hasErr = r.errors.length > 0;
                    const hasWarn = r.warnings.length > 0;
                    return (
                      <tr
                        key={r.index}
                        className={hasErr ? 'bg-red-50' : hasWarn ? 'bg-amber-50' : ''}
                      >
                        <td className="p-2 font-mono text-gray-400">{r.index}</td>
                        <td className="p-2 whitespace-nowrap">
                          {hasErr ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                              Error
                            </span>
                          ) : hasWarn ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Warning
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Valid
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-mono font-bold text-gray-800">
                          {r.tenderNumber || '—'}
                        </td>
                        <td className="p-2 font-mono text-gray-600">{r.fiscalYear}</td>
                        <td className="p-2 font-medium text-gray-900 truncate max-w-xs">
                          {r.clientNameRaw || <span className="text-red-600">Missing</span>}
                        </td>
                        <td className="p-2 text-gray-700">{r.location}</td>
                        <td className="p-2 font-bold text-[11px]">{r.status}</td>
                        <td className="p-2 text-right font-mono font-semibold text-gray-900">
                          {r.tenderAmount ? formatAED(r.tenderAmount) : '—'}
                        </td>
                        <td className="p-2 text-right font-mono text-gray-600">
                          {r.totalAreaSqm ? `${r.totalAreaSqm} m²` : '—'}
                        </td>
                        <td className="p-2 text-gray-600">{r.sourceRaw || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('upload');
                setParsedRows([]);
              }}
              className="px-4 py-2 rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Cancel & Re-upload</span>
            </button>

            <button
              type="button"
              onClick={handleCommit}
              disabled={importing || validCount === 0}
              className="px-6 py-2.5 rounded-md text-xs font-bold text-white bg-[#8b151b] hover:bg-[#731217] flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              <span>{importing ? 'Processing Batch Ingest...' : `Commit Ingest of ${validCount} Tenders`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Completed */}
      {step === 'completed' && importResult && (
        <div className="bg-white p-8 rounded-md border border-emerald-300 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Batch Successfully Ingested</h2>
            <p className="text-xs text-gray-600 mt-1">
              All parsed entries have been normalized, audit-logged, and merged into the live repository.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto p-4 bg-gray-50 rounded-md border border-slate-200 text-xs">
            <div>
              <div className="text-lg font-semibold text-emerald-800 font-mono">
                {importResult.created}
              </div>
              <div className="text-[11px] font-bold text-gray-500">New Created</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-800 font-mono">
                {importResult.updated}
              </div>
              <div className="text-[11px] font-bold text-gray-500">Updated</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-amber-800 font-mono">
                {importResult.skipped}
              </div>
              <div className="text-[11px] font-bold text-gray-500">Duplicates Skipped</div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('upload');
                setParsedRows([]);
              }}
              className="px-5 py-2.5 rounded-md text-xs font-bold text-white bg-[#8b151b] hover:bg-[#731217] transition-colors cursor-pointer"
            >
              Upload Another Spreadsheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
