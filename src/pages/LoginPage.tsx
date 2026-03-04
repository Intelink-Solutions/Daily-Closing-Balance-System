import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import { toast } from "sonner";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAppPreferences();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Email and password are required.");
      return;
    }

    const result = login(email.trim(), password);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-md">
        <Card className="card-shadow">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Access Daily Closing Balance System</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                Login
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Demo accounts: admin@dcbs.com / admin123 and staff@dcbs.com / staff123
              </p>
            </form>
          </CardContent>
        </Card>
        </motion.div>
      </div>
      <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
        © 2026 Intelink SOLUTIONS
      </footer>
    </div>
  );
};

export default LoginPage;
