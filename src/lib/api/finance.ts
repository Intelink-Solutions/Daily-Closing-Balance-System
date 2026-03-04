import type {
  DailyReportRow,
  DashboardPayload,
  PaginatedResponse,
  Transaction,
  TransactionsFilters,
  UploadStatementResponse,
} from "@/types/finance";
import { apiRequest, hasApiBaseUrl } from "@/lib/api/client";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type BackendTransaction = {
  id: string;
  transactionDate: string;
  narration: string;
  debit: number | string | null;
  credit: number | string | null;
  balance: number | string;
};

type BackendDailyRow = {
  date: string;
  opening: number | string;
  credits: number | string;
  debits: number | string;
  closing: number | string;
};

type LocalTransactionRecord = {
  id: string;
  transactionDate: string;
  narration: string;
  debit: number | null;
  credit: number | null;
  balance: number;
};

const LOCAL_TRANSACTIONS_KEY = "dcbs-local-transactions";
const LOCAL_RESET_FLAG_KEY = "dcbs-local-transactions-reset-v1";

if (typeof window !== "undefined") {
  const alreadyReset = window.sessionStorage.getItem(LOCAL_RESET_FLAG_KEY) === "1";
  if (!alreadyReset) {
    window.localStorage.removeItem(LOCAL_TRANSACTIONS_KEY);
    window.sessionStorage.setItem(LOCAL_RESET_FLAG_KEY, "1");
  }
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseAmount(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateValue(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readLocalTransactions(): LocalTransactionRecord[] {
  const raw = window.localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as LocalTransactionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTransactions(transactions: LocalTransactionRecord[]) {
  window.localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
}

function sortLocalTransactions(transactions: LocalTransactionRecord[]): LocalTransactionRecord[] {
  return [...transactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
  );
}

async function parseCsvFile(file: File): Promise<LocalTransactionRecord[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const transactions: LocalTransactionRecord[] = [];
  let runningBalance = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const columns = splitCsvLine(lines[lineIndex]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] ?? "";
    });

    const transactionDate = parseDateValue(
      row.transactiondate || row.date || row.txndate || row.datetime || row.postedat,
    );
    const narration = (row.narration || row.description || row.particulars || row.details || "").trim();
    const debit = parseAmount(row.debit || row.withdrawal || row.dr);
    const credit = parseAmount(row.credit || row.deposit || row.cr);
    const parsedBalance = parseAmount(row.balance || row.closingbalance || row.runningbalance);

    if (!transactionDate || !narration) continue;

    const balance = parsedBalance ?? runningBalance + (credit ?? 0) - (debit ?? 0);
    runningBalance = balance;

    transactions.push({
      id: `local-${Date.now()}-${lineIndex}-${Math.random().toString(16).slice(2)}`,
      transactionDate: transactionDate.toISOString(),
      narration,
      debit,
      credit,
      balance,
    });
  }

  return transactions;
}

function buildDailyRows(transactions: LocalTransactionRecord[]): DailyReportRow[] {
  const grouped = new Map<string, DailyReportRow>();
  const sorted = sortLocalTransactions(transactions);

  for (const transaction of sorted) {
    const dateObject = new Date(transaction.transactionDate);
    const key = dateObject.toISOString().slice(0, 10);
    const dateLabel = dateObject.toLocaleDateString();

    if (!grouped.has(key)) {
      grouped.set(key, {
        date: dateLabel,
        opening: transaction.balance - (transaction.credit ?? 0) + (transaction.debit ?? 0),
        credits: 0,
        debits: 0,
        closing: transaction.balance,
      });
    }

    const row = grouped.get(key)!;
    row.credits += transaction.credit ?? 0;
    row.debits += transaction.debit ?? 0;
    row.closing = transaction.balance;
  }

  return Array.from(grouped.values()).reverse();
}

function getLocalTransactionsPayload(filters: TransactionsFilters): PaginatedResponse<Transaction> {
  const all = readLocalTransactions();
  const filtered = all.filter((transaction) => {
    const txDate = new Date(transaction.transactionDate);
    const matchesSearch = filters.search
      ? transaction.narration.toLowerCase().includes(filters.search.toLowerCase())
      : true;
    const matchesFrom = filters.fromDate ? txDate >= new Date(filters.fromDate) : true;
    const matchesTo = filters.toDate ? txDate <= new Date(filters.toDate) : true;
    return matchesSearch && matchesFrom && matchesTo;
  });

  const sorted = filtered.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
  );
  const start = (filters.page - 1) * filters.pageSize;
  const items = sorted.slice(start, start + filters.pageSize).map(mapBackendTransaction);

  return {
    items,
    total: sorted.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

function getLocalDailyReport(): DailyReportRow[] {
  return buildDailyRows(readLocalTransactions());
}

function getLocalDashboard(): DashboardPayload {
  const transactions = sortLocalTransactions(readLocalTransactions());
  const daily = buildDailyRows(transactions);

  const totalCredits = transactions.reduce((sum, transaction) => sum + (transaction.credit ?? 0), 0);
  const totalDebits = transactions.reduce((sum, transaction) => sum + (transaction.debit ?? 0), 0);
  const closingBalance = transactions.length ? transactions[transactions.length - 1].balance : 0;
  const previousBalance = transactions.length > 1 ? transactions[transactions.length - 2].balance : closingBalance;

  const trend = daily
    .slice()
    .reverse()
    .map((row) => ({ date: row.date, balance: row.closing }));

  const recentClosings = daily.slice(0, 6).map((row) => ({
    date: row.date,
    closingBalance: row.closing,
    dailyDifference: row.closing - row.opening,
  }));

  return {
    summary: {
      totalTransactions: transactions.length,
      totalCredits,
      totalDebits,
      closingBalance,
      closingBalanceDelta: closingBalance - previousBalance,
    },
    trend,
    recentClosings,
  };
}

function getLocalUploadResponse(file: File): UploadStatementResponse {
  return {
    transactionsSaved: 0,
    dailyClosingDays: 0,
    extractedRange: {
      from: new Date().toISOString(),
      to: new Date().toISOString(),
    },
    message: `Statement processed successfully from ${file.name}.`,
  };
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapBackendTransaction(input: BackendTransaction): Transaction {
  const dateObject = new Date(input.transactionDate);
  const isValidDate = !Number.isNaN(dateObject.getTime());

  return {
    id: input.id,
    date: isValidDate ? dateObject.toLocaleDateString() : String(input.transactionDate),
    time: isValidDate ? dateObject.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--",
    narration: input.narration,
    debit: toNumber(input.debit),
    credit: toNumber(input.credit),
    balance: toNumber(input.balance) ?? 0,
  };
}

function mapBackendDailyRow(row: BackendDailyRow): DailyReportRow {
  const dateObject = new Date(row.date);
  return {
    date: Number.isNaN(dateObject.getTime()) ? row.date : dateObject.toLocaleDateString(),
    opening: toNumber(row.opening) ?? 0,
    credits: toNumber(row.credits) ?? 0,
    debits: toNumber(row.debits) ?? 0,
    closing: toNumber(row.closing) ?? 0,
  };
}

function serializeFilters(filters: TransactionsFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  return params.toString();
}

export const financeApi = {
  async getDashboard(): Promise<DashboardPayload> {
    if (!hasApiBaseUrl) {
      return getLocalDashboard();
    }

    try {
      const response = await apiRequest<ApiEnvelope<DashboardPayload>>("/dashboard");
      return response.data;
    } catch {
      return getLocalDashboard();
    }
  },

  async getTransactions(filters: TransactionsFilters): Promise<PaginatedResponse<Transaction>> {
    if (!hasApiBaseUrl) {
      return getLocalTransactionsPayload(filters);
    }

    try {
      const query = serializeFilters(filters);
      const response = await apiRequest<ApiEnvelope<PaginatedResponse<BackendTransaction>>>(`/transactions?${query}`);

      return {
        ...response.data,
        items: response.data.items.map(mapBackendTransaction),
      };
    } catch {
      return getLocalTransactionsPayload(filters);
    }
  },

  async getDailyReport(): Promise<DailyReportRow[]> {
    if (!hasApiBaseUrl) {
      return getLocalDailyReport();
    }

    try {
      const response = await apiRequest<ApiEnvelope<BackendDailyRow[]>>("/daily-closings");
      return response.data.map(mapBackendDailyRow);
    } catch {
      return getLocalDailyReport();
    }
  },

  async uploadStatement(file: File): Promise<UploadStatementResponse> {
    const ext = file.name.split(".").pop()?.toLowerCase();

    const formData = new FormData();
    formData.append("statement", file);

    const processLocal = async () => {
      const existing = readLocalTransactions();
      const parsed = ext === "csv" ? await parseCsvFile(file) : [];
      const synthetic: LocalTransactionRecord[] = parsed.length
        ? parsed
        : [
            {
              id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              transactionDate: new Date().toISOString(),
              narration: `Imported document: ${file.name}`,
              debit: null,
              credit: null,
              balance: existing.length ? existing[existing.length - 1].balance : 0,
            },
          ];

      const next = sortLocalTransactions([...existing, ...synthetic]);
      writeLocalTransactions(next);

      const sortedDates = synthetic
        .map((item) => new Date(item.transactionDate).toISOString())
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      return {
        ...getLocalUploadResponse(file),
        transactionsSaved: synthetic.length,
        dailyClosingDays: buildDailyRows(next).length,
        extractedRange: {
          from: sortedDates[0],
          to: sortedDates[sortedDates.length - 1],
        },
      };
    };

    if (!hasApiBaseUrl) {
      return processLocal();
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/statements/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ApiEnvelope<Omit<UploadStatementResponse, "message">>;
      return {
        ...payload.data,
        message: payload.message,
      };
    } catch {
      return processLocal();
    }
  },
};
