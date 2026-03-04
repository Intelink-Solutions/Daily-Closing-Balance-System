import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
  gradient?: string;
}

const defaultGradients = [
  "from-primary to-primary/70",
  "from-success to-success/70",
  "from-destructive to-destructive/70",
  "from-chart-4 to-chart-5",
];

export function SummaryCard({ title, value, icon: Icon, trend, trendUp, delay = 0, gradient }: SummaryCardProps) {
  const bg = gradient || defaultGradients[Math.floor(delay * 10) % defaultGradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, type: "spring", stiffness: 100 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="card-shadow hover:card-shadow-lg transition-all duration-300 overflow-hidden group">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
              <motion.p
                className="text-xl sm:text-2xl font-bold text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.3 }}
              >
                {value}
              </motion.p>
              {trend && (
                <motion.p
                  className={`text-xs sm:text-sm font-medium ${trendUp ? "text-success" : "text-destructive"}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.5 }}
                >
                  {trend}
                </motion.p>
              )}
            </div>
            <motion.div
              className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shrink-0 ml-2`}
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
