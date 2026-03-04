import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppPreferences, type AppRole } from "@/contexts/AppPreferencesContext";
import { sendEmailNotification } from "@/lib/api/notifications";

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: AppRole;
};

function evaluatePasswordStrength(passwordValue: string): { score: number; label: "Weak" | "Fair" | "Good" | "Strong" } {
  if (!passwordValue) {
    return { score: 0, label: "Weak" };
  }

  let score = 0;
  if (passwordValue.length >= 8) score += 1;
  if (/[A-Z]/.test(passwordValue)) score += 1;
  if (/[0-9]/.test(passwordValue)) score += 1;
  if (/[^A-Za-z0-9]/.test(passwordValue)) score += 1;

  if (score >= 4) return { score, label: "Strong" };
  if (score === 3) return { score, label: "Good" };
  if (score === 2) return { score, label: "Fair" };
  return { score, label: "Weak" };
}

const SettingsPage = () => {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userForm, setUserForm] = useState<UserFormState>({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });
  const [emailConfigDraft, setEmailConfigDraft] = useState({
    providerName: "",
    fromAddress: "",
    supportReplyTo: "",
  });

  const {
    role,
    userName,
    currentUserEmail,
    updateCurrentProfile,
    users,
    addUser,
    updateUserRole,
    selectedCurrency,
    setSelectedCurrency,
    currencies,
    isRatesLoading,
    ratesUpdatedAt,
    systemNotificationsEnabled,
    setSystemNotificationsEnabled,
    emailNotificationsEnabled,
    setEmailNotificationsEnabled,
    emailConfig,
    setEmailConfig,
  } = useAppPreferences();

  useEffect(() => {
    setName(userName ?? "John Doe");
    setEmail(currentUserEmail ?? "john@example.com");
  }, [userName, currentUserEmail]);

  useEffect(() => {
    setEmailConfigDraft(emailConfig);
  }, [emailConfig]);

  const canSave = useMemo(() => name.trim().length > 0 && email.trim().length > 0, [name, email]);

  const canAddUser = useMemo(
    () => userForm.name.trim().length > 0 && userForm.email.trim().length > 0 && userForm.password.trim().length >= 6,
    [userForm],
  );
  const passwordStrength = useMemo(() => evaluatePasswordStrength(password.trim()), [password]);

  const handleSave = () => {
    if (!canSave) {
      toast.error("Name and email are required.");
      return;
    }

    if (role === "admin" && password.trim()) {
      if (confirmPassword.trim().length === 0) {
        toast.error("Please confirm the new password.");
        return;
      }
      if (password.trim() !== confirmPassword.trim()) {
        toast.error("Password and confirm password do not match.");
        return;
      }
    }

    setSaving(true);
    setTimeout(() => {
      const result = updateCurrentProfile({
        name,
        email,
        password: role === "admin" && password.trim() ? password.trim() : undefined,
      });
      setSaving(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      toast.success(result.message);
    }, 600);
  };

  const handleExport = () => {
    if (role !== "admin") {
      toast.error("Only admins can export data.");
      return;
    }

    downloadCsv(
      `settings-export-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Field", "Value"],
      [
        ["Full Name", name],
        ["Email", email],
        ["System Notifications", systemNotificationsEnabled ? "Enabled" : "Disabled"],
        ["Email Notifications", emailNotificationsEnabled ? "Enabled" : "Disabled"],
      ],
    );
    toast.success("Data exported successfully.");
  };

  const handleAddUser = () => {
    if (role !== "admin") {
      toast.error("Only admins can add staff accounts.");
      return;
    }

    const result = addUser(userForm);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setUserForm({ name: "", email: "", password: "", role: "staff" });
  };

  const handleSaveEmailConfig = () => {
    if (role !== "admin") {
      toast.error("Only admins can configure email settings.");
      return;
    }

    if (!emailConfigDraft.providerName || !emailConfigDraft.fromAddress || !emailConfigDraft.supportReplyTo) {
      toast.error("All email configuration fields are required.");
      return;
    }

    setEmailConfig(emailConfigDraft);
    toast.success("Email configuration updated.");
  };

  const handleSendTestEmail = async () => {
    if (role !== "admin") {
      toast.error("Only admins can send test email.");
      return;
    }

    const ok = await sendEmailNotification({
      providerName: emailConfigDraft.providerName,
      fromAddress: emailConfigDraft.fromAddress,
      replyTo: emailConfigDraft.supportReplyTo,
      recipients: [email],
      subject: "DCBS Email Configuration Test",
      message: "This is a test email from your DCBS notification settings.",
    });

    if (!ok) {
      toast.error("Email API is unavailable. Configure backend endpoint and try again.");
      return;
    }

    toast.success(`Test email sent to ${email}.`);
  };

  const handleRoleChange = (userId: string, nextRole: AppRole) => {
    const result = updateUserRole(userId, nextRole);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
  };

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency as typeof selectedCurrency);
    toast.success(`Currency switched to ${currency}.`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage account, staff access and notifications</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
        <Card className="card-shadow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Profile</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Full Name</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-9" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-9 pr-10"
                    placeholder={role === "admin" ? "Enter new password" : "Only admin can update password"}
                    disabled={role !== "admin"}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={role !== "admin"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {role === "admin" && password.trim().length > 0 && (
                  <>
                    <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength.score >= 4
                            ? "bg-success"
                            : passwordStrength.score === 3
                              ? "bg-primary"
                              : passwordStrength.score === 2
                                ? "bg-warning"
                                : "bg-destructive"
                        }`}
                        style={{ width: `${Math.max(15, passwordStrength.score * 25)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength: {passwordStrength.label}. Use 8+ chars with uppercase, number, and symbol.
                    </p>
                  </>
                )}
                {role !== "admin" && (
                  <p className="text-xs text-muted-foreground">Password updates are restricted to admin role.</p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="confirm-password" className="text-sm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-9 pr-10"
                    placeholder={role === "admin" ? "Re-enter new password" : "Only admin can confirm password update"}
                    disabled={role !== "admin"}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={role !== "admin"}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={handleSave} disabled={saving || !canSave} className="bg-gradient-to-r from-primary to-chart-4 hover:opacity-90">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Notifications</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Real-time system and email notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">System Notifications</p>
                <p className="text-xs text-muted-foreground">Show real-time alerts in-app notification center</p>
              </div>
              <Switch checked={systemNotificationsEnabled} onCheckedChange={setSystemNotificationsEnabled} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Send mirrored alerts through the email channel</p>
              </div>
              <Switch checked={emailNotificationsEnabled} onCheckedChange={setEmailNotificationsEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Email Configuration</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Configure sender details for email notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
            <Input
              placeholder="Provider name"
              value={emailConfigDraft.providerName}
              onChange={(event) => setEmailConfigDraft((prev) => ({ ...prev, providerName: event.target.value }))}
              disabled={role !== "admin"}
            />
            <Input
              placeholder="From address"
              value={emailConfigDraft.fromAddress}
              onChange={(event) => setEmailConfigDraft((prev) => ({ ...prev, fromAddress: event.target.value }))}
              disabled={role !== "admin"}
            />
            <Input
              placeholder="Reply-to address"
              value={emailConfigDraft.supportReplyTo}
              onChange={(event) => setEmailConfigDraft((prev) => ({ ...prev, supportReplyTo: event.target.value }))}
              disabled={role !== "admin"}
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveEmailConfig} disabled={role !== "admin"}>Save Email Config</Button>
              <Button variant="outline" onClick={handleSendTestEmail} disabled={role !== "admin"}>Send Test Email</Button>
            </div>
            {role !== "admin" && <p className="text-xs text-muted-foreground">Only admins can change email configuration.</p>}
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Regional Settings</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Currency conversion and FX updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="display-currency" className="text-sm">Display Currency</Label>
              <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger id="display-currency" className="h-9" aria-describedby="currency-help fx-status">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.country} ({currency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="currency-help" className="text-xs text-muted-foreground">
                Supported currencies: Nigeria (NGN), Ghana (GHS), Kenya (KES), South Africa (ZAR), Egypt (EGP), United States (USD).
              </p>
              <p id="fx-status" className="text-xs text-muted-foreground" aria-live="polite">
                {isRatesLoading
                  ? "Refreshing exchange rates..."
                  : ratesUpdatedAt
                    ? `Rates last updated: ${new Date(ratesUpdatedAt).toLocaleString()}`
                    : "Using fallback rates until live rates are available."}
              </p>
            </div>
          </CardContent>
        </Card>

        {role === "admin" && (
          <Card className="card-shadow">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Staff Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Add staff and change role to staff/admin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Full name"
                  value={userForm.name}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={userForm.email}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <Input
                  placeholder="Temp password"
                  type="password"
                  value={userForm.password}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                <div className="flex gap-2">
                  <Select value={userForm.role} onValueChange={(value) => setUserForm((prev) => ({ ...prev, role: value as AppRole }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddUser} disabled={!canAddUser}>Add</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {users.map((appUser) => (
                  <div key={appUser.id} className="border border-border/70 rounded-md p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{appUser.name}</p>
                      <p className="text-xs text-muted-foreground">{appUser.email}</p>
                    </div>
                    <div className="w-full sm:w-44">
                      <Select value={appUser.role} onValueChange={(value) => handleRoleChange(appUser.id, value as AppRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="card-shadow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Data Management</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Manage your transaction data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">Export All Data</p>
                <p className="text-xs text-muted-foreground">Download all transactions as CSV</p>
              </div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={role !== "admin"}>Export</Button>
              </motion.div>
            </div>
            {role !== "admin" && <p className="text-xs text-muted-foreground">Admin role is required for export actions.</p>}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
