import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import { toast } from "sonner";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { requestPasswordReset } = useAppPreferences();
  const [email, setEmail] = useState("");

  const canSubmit = useMemo(() => email.trim().length > 0, [email]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = requestPasswordReset(email.trim());
    if (response.ok) {
      toast.success(response.message);
      navigate("/login", { replace: true });
      return;
    }

    toast.error(response.message);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-md">
        <Card className="card-shadow">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Forgot Password</CardTitle>
                <CardDescription>Reset your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Account Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                Send Reset Instructions
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")}>Back to login</Button>
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

export default ForgotPasswordPage;
