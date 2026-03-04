import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, CalendarIcon, X } from "lucide-react";
import { endOfDay, format, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTransactionsData } from "@/hooks/use-finance-data";
import type { Transaction } from "@/types/finance";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";

const Transactions = () => {
  const { formatAmount } = useAppPreferences();
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const pageSize = 5;

  const normalizedFromDate = fromDate ? format(startOfDay(fromDate), "yyyy-MM-dd") : undefined;
  const normalizedToDate = toDate ? format(endOfDay(toDate), "yyyy-MM-dd") : undefined;

  const filters = useMemo(
    () => ({
      search,
      fromDate: normalizedFromDate,
      toDate: normalizedToDate,
      page,
      pageSize,
    }),
    [search, normalizedFromDate, normalizedToDate, page],
  );

  const { data, isLoading } = useTransactionsData(filters);
  const paginated = data?.items ?? [];
  const totalCount = data?.total ?? 0;
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, maxPage);

  const clearDates = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date);
    setPage(1);
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Transactions</h2>
        <p className="text-sm text-muted-foreground mt-1">View and search all processed transactions</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="card-shadow">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <CardTitle className="text-base sm:text-lg">All Transactions</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Filter:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[130px] sm:w-[160px] justify-start text-left text-xs sm:text-sm font-normal h-8 sm:h-9",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {fromDate ? format(fromDate, "PP") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={fromDate} onSelect={handleFromDateChange} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                <span className="text-xs text-muted-foreground">to</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[130px] sm:w-[160px] justify-start text-left text-xs sm:text-sm font-normal h-8 sm:h-9",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {toDate ? format(toDate, "PP") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={toDate} onSelect={handleToDateChange} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                {(fromDate || toDate) && (
                  <Button variant="ghost" size="sm" onClick={clearDates} className="h-8 px-2 text-xs">
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {/* Mobile card view */}
            <div className="sm:hidden space-y-2">
              <AnimatePresence>
                {paginated.length === 0 && !isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No transactions found.</p>
                ) : (
                  paginated.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{tx.date}</p>
                          <p className="text-[11px] text-muted-foreground">{tx.time}</p>
                          <p className="text-sm font-medium truncate mt-0.5">{tx.narration}</p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground shrink-0 ml-2 mt-1" />
                      </div>
                      <div className="flex gap-4 text-sm">
                        {tx.debit && <span className="text-destructive font-semibold">-{formatAmount(tx.debit)}</span>}
                        {tx.credit && <span className="text-success font-semibold">+{formatAmount(tx.credit)}</span>}
                        <span className="ml-auto font-bold">{formatAmount(tx.balance)}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Narration</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Debit</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Credit</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Balance</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && !isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">No transactions found.</td>
                    </tr>
                  ) : (
                    paginated.map((tx, i) => (
                      <motion.tr
                        key={tx.id}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <td className="py-3 px-4 whitespace-nowrap" onClick={() => setSelectedTx(tx)}>{tx.date}</td>
                        <td className="py-3 px-4 whitespace-nowrap" onClick={() => setSelectedTx(tx)}>{tx.time}</td>
                        <td className="py-3 px-4 max-w-xs truncate" onClick={() => setSelectedTx(tx)}>{tx.narration}</td>
                        <td className="py-3 px-4 text-right text-destructive font-medium" onClick={() => setSelectedTx(tx)}>{tx.debit ? formatAmount(tx.debit) : "—"}</td>
                        <td className="py-3 px-4 text-right text-success font-medium" onClick={() => setSelectedTx(tx)}>{tx.credit ? formatAmount(tx.credit) : "—"}</td>
                        <td className="py-3 px-4 text-right font-semibold" onClick={() => setSelectedTx(tx)}>{formatAmount(tx.balance)}</td>
                        <td className="py-3 px-4 text-center">
                          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedTx(tx)} className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
              <p className="text-xs sm:text-sm text-muted-foreground">
                {totalCount} total
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </motion.div>
                <span className="text-xs sm:text-sm font-medium px-2">Page {currentPage} of {maxPage}</span>
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Full details for the selected transaction</DialogDescription>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-3 pt-2">
              {[
                ["Date", selectedTx.date],
                ["Time", selectedTx.time],
                ["Narration", selectedTx.narration],
                ["Debit", selectedTx.debit ? formatAmount(selectedTx.debit) : "—"],
                ["Credit", selectedTx.credit ? formatAmount(selectedTx.credit) : "—"],
                ["Balance", formatAmount(selectedTx.balance)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-border/50 gap-4">
                  <span className="text-muted-foreground text-sm shrink-0">{label}</span>
                  <span className="font-semibold text-sm text-right">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
