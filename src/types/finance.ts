export type DashboardSummary = {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  closingBalance: number;
  closingBalanceDelta: number;
};

export type BalancePoint = {
  date: string;
  balance: number;
};

export type ClosingEntry = {
  date: string;
  closingBalance: number;
  dailyDifference: number;
};

export type Transaction = {
  id: string;
  date: string;
  time: string;
  narration: string;
  debit: number | null;
  credit: number | null;
  balance: number;
};

export type DailyReportRow = {
  date: string;
  opening: number;
  credits: number;
  debits: number;
  closing: number;
};

export type TransactionsFilters = {
  search?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type UploadStatementResponse = {
  transactionsSaved: number;
  dailyClosingDays: number;
  extractedRange?: {
    from: string;
    to: string;
  };
  message: string;
};

export type StatementDiagnosticRow = {
  date: string;
  time: string | null;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  action: string;
};

export type StatementDiagnosticsResponse = {
  profile: string;
  transactionsParsed: number;
  sampleRows: StatementDiagnosticRow[];
  warnings: string[];
};

export type DashboardPayload = {
  summary: DashboardSummary;
  trend: BalancePoint[];
  recentClosings: ClosingEntry[];
};
