import { ArrowLeftRight, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/SummaryCard";
import { useDashboardData } from "@/hooks/use-finance-data";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const Dashboard = () => {
  const { data, isLoading } = useDashboardData();
  const { formatAmount, formatSignedAmount, formatCompactAmount } = useAppPreferences();

  if (isLoading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const { summary, trend, recentClosings } = data;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Overview of your financial activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          title="Total Transactions"
          value={summary.totalTransactions.toLocaleString()}
          icon={ArrowLeftRight}
          trend="+12.5%"
          trendUp
          delay={0}
          gradient="from-chart-4 to-chart-5"
        />
        <SummaryCard
          title="Total Credits"
          value={formatAmount(summary.totalCredits)}
          icon={TrendingUp}
          trend="+8.2%"
          trendUp
          delay={0.1}
          gradient="from-success to-primary"
        />
        <SummaryCard
          title="Total Debits"
          value={formatAmount(summary.totalDebits)}
          icon={TrendingDown}
          trend="+3.1%"
          trendUp={false}
          delay={0.2}
          gradient="from-destructive to-warning"
        />
        <SummaryCard
          title="Closing Balance"
          value={formatAmount(summary.closingBalance)}
          icon={Wallet}
          trend={formatSignedAmount(summary.closingBalanceDelta)}
          trendUp={summary.closingBalanceDelta >= 0}
          delay={0.3}
          gradient="from-chart-5 to-chart-4"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="card-shadow">
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Daily Closing Balance Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-[220px] sm:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(145, 63%, 32%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(145, 63%, 32%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatCompactAmount(v)}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "1px solid hsl(0 0% 88%)",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
                      fontSize: "0.8rem",
                    }}
                    formatter={(value: number) => [formatAmount(value), "Balance"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(145, 63%, 32%)"
                    strokeWidth={2.5}
                    fill="url(#balanceGradient)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-semibold">Recent Daily Closing</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile card view */}
            <div className="sm:hidden space-y-3">
              {recentClosings.map((row, i) => (
                <motion.div
                  key={row.date}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div>
                    <p className="text-sm font-medium">{row.date}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatAmount(row.closingBalance)}</p>
                  </div>
                  <span className={`text-sm font-bold ${row.dailyDifference >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatSignedAmount(row.dailyDifference)}
                  </span>
                </motion.div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Closing Balance</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Daily Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClosings.map((row, i) => (
                    <motion.tr
                      key={row.date}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                    >
                      <td className="py-3 px-4 font-medium">{row.date}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatAmount(row.closingBalance)}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${row.dailyDifference >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatSignedAmount(row.dailyDifference)}
                      </td>
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

export default Dashboard;
