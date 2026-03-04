import { motion } from "framer-motion";
import { Download, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { useDailyReportData } from "@/hooks/use-finance-data";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";

const DailyClosingReport = () => {
  const { data: reportData, isLoading } = useDailyReportData();
  const { formatAmount, role } = useAppPreferences();

  const handleExport = () => {
    if (role !== "admin") {
      toast.error("Only admins can export reports.");
      return;
    }

    if (!reportData?.length) {
      toast.error("No report data available to export.");
      return;
    }

    downloadCsv(
      `daily-closing-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Opening Balance", "Total Credits", "Total Debits", "Closing Balance"],
      reportData.map((row) => [row.date, formatAmount(row.opening), formatAmount(row.credits), formatAmount(row.debits), formatAmount(row.closing)]),
    );
    toast.success("CSV exported successfully.");
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !reportData) {
    return (
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Daily Closing Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Daily Closing Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Day-by-day closing balance summary</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Print</span>
              <span className="sm:hidden">Print</span>
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={role !== "admin"}>
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </motion.div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="card-shadow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Closing Balance Report</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {/* Mobile card view */}
            <div className="sm:hidden space-y-3">
              {reportData.map((row, i) => (
                <motion.div
                  key={row.date}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2"
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">{row.date}</span>
                    <span className="text-sm font-bold">{formatAmount(row.closing)}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-muted-foreground">Open: {formatAmount(row.opening)}</span>
                    <span className="text-success font-medium">+{formatAmount(row.credits)}</span>
                    <span className="text-destructive font-medium">-{formatAmount(row.debits)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Opening Balance</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Credits</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Debits</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, i) => (
                    <motion.tr
                      key={row.date}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <td className="py-3 px-4 font-medium">{row.date}</td>
                      <td className="py-3 px-4 text-right">{formatAmount(row.opening)}</td>
                      <td className="py-3 px-4 text-right text-success font-medium">{formatAmount(row.credits)}</td>
                      <td className="py-3 px-4 text-right text-destructive font-medium">{formatAmount(row.debits)}</td>
                      <td className="py-3 px-4 text-right font-bold">{formatAmount(row.closing)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DailyClosingReport;
