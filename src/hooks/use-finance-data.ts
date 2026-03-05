import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/finance";
import type { TransactionsFilters } from "@/types/finance";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => financeApi.getDashboard(),
  });
}

export function useTransactionsData(filters: TransactionsFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => financeApi.getTransactions(filters),
  });
}

export function useDailyReportData() {
  return useQuery({
    queryKey: ["daily-report"],
    queryFn: () => financeApi.getDailyReport(),
  });
}

export function useUploadStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => financeApi.uploadStatement(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useStatementDiagnostics() {
  return useMutation({
    mutationFn: ({ file, sampleSize = 5 }: { file: File; sampleSize?: number }) =>
      financeApi.diagnoseStatement(file, sampleSize),
  });
}
