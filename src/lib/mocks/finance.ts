import type {
  DailyReportRow,
  DashboardPayload,
  PaginatedResponse,
  Transaction,
  TransactionsFilters,
  UploadStatementResponse,
} from "@/types/finance";

const transactionsData: Transaction[] = [
  { id: "1", date: "2026-02-25", time: "09:10", narration: "NEFT-ACME Corp-Salary Feb", debit: null, credit: 85000, balance: 168500 },
  { id: "2", date: "2026-02-24", time: "11:24", narration: "UPI-Amazon Pay-Order #4821", debit: 3299, credit: null, balance: 83500 },
  { id: "3", date: "2026-02-23", time: "14:42", narration: "IMPS-Rent Transfer-Feb 2026", debit: 22000, credit: null, balance: 86799 },
  { id: "4", date: "2026-02-22", time: "16:05", narration: "NEFT-Client Payment-Invoice #892", debit: null, credit: 45000, balance: 108799 },
  { id: "5", date: "2026-02-21", time: "18:31", narration: "UPI-Swiggy-Food Order", debit: 520, credit: null, balance: 63799 },
  { id: "6", date: "2026-02-20", time: "10:12", narration: "ATM Withdrawal-SBI ATM", debit: 10000, credit: null, balance: 64319 },
  { id: "7", date: "2026-02-19", time: "13:05", narration: "NEFT-Freelance Payment", debit: null, credit: 28000, balance: 74319 },
  { id: "8", date: "2026-02-18", time: "15:08", narration: "UPI-Electricity Bill-MSEDCL", debit: 2450, credit: null, balance: 46319 },
];

const reportData: DailyReportRow[] = [
  { date: "2026-02-25", opening: 171000, credits: 85000, debits: 87500, closing: 168500 },
  { date: "2026-02-24", opening: 158400, credits: 45000, debits: 32400, closing: 171000 },
  { date: "2026-02-23", opening: 162800, credits: 12000, debits: 16400, closing: 158400 },
  { date: "2026-02-22", opening: 155200, credits: 28000, debits: 20400, closing: 162800 },
  { date: "2026-02-21", opening: 148500, credits: 18200, debits: 11500, closing: 155200 },
  { date: "2026-02-20", opening: 152000, credits: 8500, debits: 12000, closing: 148500 },
];

const dashboardData: DashboardPayload = {
  summary: {
    totalTransactions: 1284,
    totalCredits: 452000,
    totalDebits: 283500,
    closingBalance: 168500,
    closingBalanceDelta: 18500,
  },
  trend: [
    { date: "Jan 1", balance: 125000 },
    { date: "Jan 5", balance: 132500 },
    { date: "Jan 10", balance: 128000 },
    { date: "Jan 15", balance: 145000 },
    { date: "Jan 20", balance: 138000 },
    { date: "Jan 25", balance: 152000 },
    { date: "Jan 30", balance: 148500 },
    { date: "Feb 5", balance: 155200 },
    { date: "Feb 10", balance: 162800 },
    { date: "Feb 15", balance: 158400 },
    { date: "Feb 20", balance: 171000 },
    { date: "Feb 25", balance: 168500 },
  ],
  recentClosings: [
    { date: "2026-02-25", closingBalance: 168500, dailyDifference: -2500 },
    { date: "2026-02-20", closingBalance: 171000, dailyDifference: 12600 },
    { date: "2026-02-15", closingBalance: 158400, dailyDifference: -4400 },
    { date: "2026-02-10", closingBalance: 162800, dailyDifference: 7600 },
    { date: "2026-02-05", closingBalance: 155200, dailyDifference: 6700 },
    { date: "2026-01-30", closingBalance: 148500, dailyDifference: -3500 },
  ],
};

export function getMockDashboardData(): DashboardPayload {
  return dashboardData;
}

export function getMockDailyReport(): DailyReportRow[] {
  return reportData;
}

export function getMockTransactions(filters: TransactionsFilters): PaginatedResponse<Transaction> {
  const filtered = transactionsData.filter((transaction) => {
    const matchesSearch = filters.search
      ? transaction.narration.toLowerCase().includes(filters.search.toLowerCase())
      : true;

    const txDate = new Date(transaction.date);
    const matchesFrom = filters.fromDate ? txDate >= new Date(filters.fromDate) : true;
    const matchesTo = filters.toDate ? txDate <= new Date(filters.toDate) : true;

    return matchesSearch && matchesFrom && matchesTo;
  });

  const start = (filters.page - 1) * filters.pageSize;
  const end = start + filters.pageSize;

  return {
    items: filtered.slice(start, end),
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export function getMockUploadResponse(file: File): UploadStatementResponse {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const transactionsSaved = ext === "csv" ? 142 : 1;
  const now = new Date().toISOString();

  return {
    transactionsSaved,
    dailyClosingDays: ext === "csv" ? 6 : 1,
    extractedRange: {
      from: now,
      to: now,
    },
    message: `Statement uploaded successfully. ${transactionsSaved} transactions saved.`,
  };
}
