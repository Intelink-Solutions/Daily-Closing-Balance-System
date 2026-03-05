import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { sendEmailNotification } from "@/lib/api/notifications";
import { hasApiBaseUrl } from "@/lib/api/client";
import { loginApi, logoutApi } from "@/lib/api/auth";

export type AppRole = "admin" | "staff" | "user";
export type SupportedCurrency = "NGN" | "GHS" | "KES" | "ZAR" | "EGP" | "USD";
export type AppNotificationChannel = "system" | "email";

export type EmailConfig = {
  providerName: string;
  fromAddress: string;
  supportReplyTo: string;
};

type CurrencyOption = {
  code: SupportedCurrency;
  label: string;
  country: string;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  createdAt: string;
};

type StoredUser = AppUser & {
  password: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  channel: AppNotificationChannel;
  createdAt: string;
  read: boolean;
};

type AppPreferencesContextValue = {
  isAuthenticated: boolean;
  userName: string | null;
  currentUserEmail: string | null;
  role: AppRole;
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => void;
  updateCurrentProfile: (input: { name: string; email: string; password?: string }) => { ok: boolean; message: string };
  users: AppUser[];
  addUser: (input: { name: string; email: string; password: string; role: AppRole }) => { ok: boolean; message: string };
  updateUserRole: (userId: string, role: AppRole) => { ok: boolean; message: string };
  requestPasswordReset: (email: string) => { ok: boolean; message: string };
  selectedCurrency: SupportedCurrency;
  setSelectedCurrency: (currency: SupportedCurrency) => void;
  currencies: CurrencyOption[];
  isRatesLoading: boolean;
  ratesUpdatedAt: string | null;
  formatAmount: (amountInInr: number, currencyCode?: SupportedCurrency) => string;
  formatSignedAmount: (amountInInr: number, currencyCode?: SupportedCurrency) => string;
  formatCompactAmount: (amountInInr: number, currencyCode?: SupportedCurrency) => string;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  systemNotificationsEnabled: boolean;
  setSystemNotificationsEnabled: (enabled: boolean) => void;
  emailNotificationsEnabled: boolean;
  setEmailNotificationsEnabled: (enabled: boolean) => void;
  emailConfig: EmailConfig;
  setEmailConfig: (nextConfig: EmailConfig) => void;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

const AUTH_USER_ID_STORAGE_KEY = "dcbs-auth-user-id";
const USERS_STORAGE_KEY = "dcbs-users";
const CURRENCY_STORAGE_KEY = "dcbs-currency";
const RATE_STORAGE_KEY = "dcbs-rates";
const RATE_UPDATE_STORAGE_KEY = "dcbs-rates-updated-at";
const NOTIFICATIONS_STORAGE_KEY = "dcbs-app-notifications";
const SYSTEM_NOTIFICATION_STORAGE_KEY = "dcbs-system-notifications";
const EMAIL_NOTIFICATION_STORAGE_KEY = "dcbs-email-notifications";
const EMAIL_CONFIG_STORAGE_KEY = "dcbs-email-config";
const FX_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_NOTIFICATION_INTERVAL_MS = 45 * 1000;
const BASE_CURRENCY = "INR";

const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: "NGN", label: "Nigerian Naira", country: "Nigeria" },
  { code: "GHS", label: "Ghanaian Cedi", country: "Ghana" },
  { code: "KES", label: "Kenyan Shilling", country: "Kenya" },
  { code: "ZAR", label: "South African Rand", country: "South Africa" },
  { code: "EGP", label: "Egyptian Pound", country: "Egypt" },
  { code: "USD", label: "US Dollar", country: "United States" },
];

const CURRENCY_LOCALE_MAP: Record<SupportedCurrency, string> = {
  NGN: "en-NG",
  GHS: "en-GH",
  KES: "en-KE",
  ZAR: "en-ZA",
  EGP: "en-EG",
  USD: "en-US",
};

const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.15,
  NGN: 1605,
  GHS: 15.3,
  KES: 129.4,
  ZAR: 18.5,
  EGP: 49.2,
};

const defaultUsers: StoredUser[] = [
  {
    id: "u-admin",
    name: "Admin",
    email: "admin@dcbs.com",
    password: "admin123",
    role: "admin",
    createdAt: new Date().toISOString(),
  },
  {
    id: "u-user",
    name: "Staff",
    email: "staff@dcbs.com",
    password: "staff123",
    role: "staff",
    createdAt: new Date().toISOString(),
  },
];

const defaultEmailConfig: EmailConfig = {
  providerName: "DCBS Mailer",
  fromAddress: "no-reply@dcbs.com",
  supportReplyTo: "support@dcbs.com",
};

function toPublicUser(user: StoredUser): AppUser {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

function buildInrConversionRates(usdRates: Record<string, number>): Record<SupportedCurrency, number> {
  const inrRate = usdRates[BASE_CURRENCY];
  if (!inrRate) {
    return {
      NGN: 1,
      GHS: 1,
      KES: 1,
      ZAR: 1,
      EGP: 1,
      USD: 1,
    };
  }

  return {
    NGN: (usdRates.NGN ?? FALLBACK_USD_RATES.NGN) / inrRate,
    GHS: (usdRates.GHS ?? FALLBACK_USD_RATES.GHS) / inrRate,
    KES: (usdRates.KES ?? FALLBACK_USD_RATES.KES) / inrRate,
    ZAR: (usdRates.ZAR ?? FALLBACK_USD_RATES.ZAR) / inrRate,
    EGP: (usdRates.EGP ?? FALLBACK_USD_RATES.EGP) / inrRate,
    USD: (usdRates.USD ?? 1) / inrRate,
  };
}

function getInitialCurrency(): SupportedCurrency {
  const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY) as SupportedCurrency | null;
  if (saved && SUPPORTED_CURRENCIES.some((currency) => currency.code === saved)) {
    return saved;
  }
  return "NGN";
}

function getInitialRates(): Record<SupportedCurrency, number> {
  const saved = window.localStorage.getItem(RATE_STORAGE_KEY);
  if (!saved) {
    return buildInrConversionRates(FALLBACK_USD_RATES);
  }

  try {
    const parsed = JSON.parse(saved) as Record<SupportedCurrency, number>;
    if (
      typeof parsed.NGN === "number" &&
      typeof parsed.GHS === "number" &&
      typeof parsed.KES === "number" &&
      typeof parsed.ZAR === "number" &&
      typeof parsed.EGP === "number" &&
      typeof parsed.USD === "number"
    ) {
      return parsed;
    }
  } catch {
    return buildInrConversionRates(FALLBACK_USD_RATES);
  }

  return buildInrConversionRates(FALLBACK_USD_RATES);
}

function getInitialUsers(): StoredUser[] {
  const saved = window.localStorage.getItem(USERS_STORAGE_KEY);
  if (!saved) {
    return defaultUsers;
  }

  try {
    const parsed = JSON.parse(saved) as StoredUser[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    return defaultUsers;
  }

  return defaultUsers;
}

function getInitialNotifications(): AppNotification[] {
  const saved = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved) as AppNotification[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return [];
  }

  return [];
}

function getInitialEmailConfig(): EmailConfig {
  const saved = window.localStorage.getItem(EMAIL_CONFIG_STORAGE_KEY);
  if (!saved) {
    return defaultEmailConfig;
  }

  try {
    const parsed = JSON.parse(saved) as EmailConfig;
    if (parsed.providerName && parsed.fromAddress && parsed.supportReplyTo) {
      return parsed;
    }
  } catch {
    return defaultEmailConfig;
  }

  return defaultEmailConfig;
}

async function fetchUsdRates(): Promise<Record<string, number>> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) {
    throw new Error("Failed to fetch exchange rates");
  }

  const data = (await response.json()) as { rates?: Record<string, number> };
  if (!data.rates) {
    throw new Error("Invalid exchange rate payload");
  }

  return data.rates;
}

function createNotificationId() {
  return `n-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createUserId() {
  return `u-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapRole(input: string | undefined): AppRole {
  if (input === "admin") return "admin";
  if (input === "user") return "staff";
  return "staff";
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>(() => getInitialUsers());
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    window.localStorage.getItem(AUTH_USER_ID_STORAGE_KEY),
  );
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(() => getInitialCurrency());
  const [rates, setRates] = useState<Record<SupportedCurrency, number>>(() => getInitialRates());
  const [isRatesLoading, setIsRatesLoading] = useState(false);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(() =>
    window.localStorage.getItem(RATE_UPDATE_STORAGE_KEY),
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getInitialNotifications());
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState<boolean>(
    () => window.localStorage.getItem(SYSTEM_NOTIFICATION_STORAGE_KEY) !== "false",
  );
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(
    () => window.localStorage.getItem(EMAIL_NOTIFICATION_STORAGE_KEY) !== "false",
  );
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(() => getInitialEmailConfig());

  const currentUser = useMemo(() => users.find((user) => user.id === currentUserId) ?? null, [users, currentUserId]);

  useEffect(() => {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUserId) {
      window.localStorage.setItem(AUTH_USER_ID_STORAGE_KEY, currentUserId);
      return;
    }
    window.localStorage.removeItem(AUTH_USER_ID_STORAGE_KEY);
  }, [currentUserId]);

  useEffect(() => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  useEffect(() => {
    window.localStorage.setItem(SYSTEM_NOTIFICATION_STORAGE_KEY, systemNotificationsEnabled ? "true" : "false");
  }, [systemNotificationsEnabled]);

  useEffect(() => {
    window.localStorage.setItem(EMAIL_NOTIFICATION_STORAGE_KEY, emailNotificationsEnabled ? "true" : "false");
  }, [emailNotificationsEnabled]);

  useEffect(() => {
    window.localStorage.setItem(EMAIL_CONFIG_STORAGE_KEY, JSON.stringify(emailConfig));
  }, [emailConfig]);

  useEffect(() => {
    let mounted = true;

    const syncRates = async () => {
      setIsRatesLoading(true);
      try {
        const usdRates = await fetchUsdRates();
        if (!mounted) return;

        const inrRates = buildInrConversionRates(usdRates);
        setRates(inrRates);
        const updatedAt = new Date().toISOString();
        setRatesUpdatedAt(updatedAt);
        window.localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(inrRates));
        window.localStorage.setItem(RATE_UPDATE_STORAGE_KEY, updatedAt);
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) {
          setIsRatesLoading(false);
        }
      }
    };

    syncRates();
    const timer = window.setInterval(syncRates, FX_REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const contextValue = useMemo<AppPreferencesContextValue>(() => {
    const pushNotification = (
      title: string,
      message: string,
      channels: AppNotificationChannel[],
      emailRecipients?: string[],
    ) => {
      const enabledChannels = channels.filter((channel) => {
        if (channel === "system") return systemNotificationsEnabled;
        return emailNotificationsEnabled;
      });

      if (enabledChannels.length === 0) return;

      const createdAt = new Date().toISOString();

      if (enabledChannels.includes("email")) {
        const recipients = emailRecipients?.length
          ? emailRecipients
          : [currentUser?.email ?? emailConfig.supportReplyTo];

        void sendEmailNotification({
          providerName: emailConfig.providerName,
          fromAddress: emailConfig.fromAddress,
          replyTo: emailConfig.supportReplyTo,
          recipients,
          subject: title,
          message,
        });
      }

      const next = enabledChannels.map((channel) => ({
        id: createNotificationId(),
        title,
        message:
          channel === "email"
            ? `${message} (sent via ${emailConfig.providerName} from ${emailConfig.fromAddress})`
            : message,
        channel,
        createdAt,
        read: false,
      }));

      setNotifications((prev) => [...next, ...prev].slice(0, 50));
    };

    const login = async (email: string, password: string) => {
      if (hasApiBaseUrl) {
        const apiResult = await loginApi(email, password);
        if (apiResult.user && apiResult.ok) {
          const userId = String(apiResult.user.id);
          const nextRole = mapRole(apiResult.user.role);
          const existing = users.find((user) => user.id === userId || user.email.toLowerCase() === apiResult.user.email.toLowerCase());

          if (!existing) {
            setUsers((prev) => [
              {
                id: userId,
                name: apiResult.user.name,
                email: apiResult.user.email.toLowerCase(),
                password: "",
                role: nextRole,
                createdAt: apiResult.user.created_at ?? new Date().toISOString(),
              },
              ...prev,
            ]);
          } else {
            setUsers((prev) => prev.map((user) => (
              user.id === existing.id
                ? {
                    ...user,
                    id: userId,
                    name: apiResult.user.name,
                    email: apiResult.user.email.toLowerCase(),
                    role: nextRole,
                    createdAt: apiResult.user.created_at ?? user.createdAt,
                  }
                : user
            )));
          }

          setCurrentUserId(userId);
          pushNotification("Sign-in Alert", `${apiResult.user.name} signed in successfully.`, ["system", "email"]);
          return { ok: true, message: apiResult.message || "Login successful." };
        }

        return { ok: false, message: apiResult.message || "Unable to login with API credentials." };
      }

      const found = users.find((user) => user.email.toLowerCase() === email.toLowerCase().trim());
      if (!found || found.password !== password) {
        return {
          ok: false,
          message: "Invalid email or password. If you intend to use backend accounts, set VITE_API_BASE_URL and restart the frontend.",
        };
      }

      setCurrentUserId(found.id);
      pushNotification("Sign-in Alert", `${found.name} signed in successfully.`, ["system", "email"]);
      return { ok: true, message: "Login successful." };
    };

    const logout = () => {
      if (hasApiBaseUrl) {
        void logoutApi();
      }
      if (currentUser) {
        pushNotification("Sign-out Alert", `${currentUser.name} signed out.`, ["system"]);
      }
      setCurrentUserId(null);
    };

    const updateCurrentProfile = (input: { name: string; email: string; password?: string }) => {
      if (!currentUser) {
        return { ok: false, message: "No active account session." };
      }

      const trimmedName = input.name.trim();
      const trimmedEmail = input.email.trim().toLowerCase();
      if (!trimmedName || !trimmedEmail) {
        return { ok: false, message: "Name and email are required." };
      }

      const duplicate = users.find(
        (user) => user.id !== currentUser.id && user.email.toLowerCase() === trimmedEmail,
      );
      if (duplicate) {
        return { ok: false, message: "Another account already uses this email." };
      }

      const nextPassword = input.password?.trim();
      if (nextPassword && currentUser.role !== "admin") {
        return { ok: false, message: "Only admins can update password." };
      }
      if (nextPassword && nextPassword.length < 6) {
        return { ok: false, message: "Password must be at least 6 characters." };
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === currentUser.id
            ? {
                ...user,
                name: trimmedName,
                email: trimmedEmail,
                ...(nextPassword ? { password: nextPassword } : {}),
              }
            : user,
        ),
      );

      pushNotification("Profile Updated", `${trimmedName} updated profile settings.`, ["system", "email"], [trimmedEmail]);
      return { ok: true, message: "Profile updated successfully." };
    };

    const addUser = (input: { name: string; email: string; password: string; role: AppRole }) => {
      if (currentUser?.role !== "admin") {
        return { ok: false, message: "Only admins can add staff accounts." };
      }

      const exists = users.some((user) => user.email.toLowerCase() === input.email.toLowerCase().trim());
      if (exists) {
        return { ok: false, message: "A user with this email already exists." };
      }

      const nextUser: StoredUser = {
        id: createUserId(),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        role: input.role,
        createdAt: new Date().toISOString(),
      };

      setUsers((prev) => [nextUser, ...prev]);
      pushNotification("Staff Added", `${nextUser.name} was added as ${nextUser.role}.`, ["system", "email"]);
      return { ok: true, message: "Staff account created successfully." };
    };

    const updateUserRole = (userId: string, nextRole: AppRole) => {
      if (currentUser?.role !== "admin") {
        return { ok: false, message: "Only admins can update roles." };
      }

      const target = users.find((user) => user.id === userId);
      if (!target) {
        return { ok: false, message: "User not found." };
      }

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: nextRole } : user)));
      pushNotification("Role Updated", `${target.name} is now assigned the ${nextRole} role.`, ["system", "email"]);
      return { ok: true, message: "User role updated." };
    };

    const requestPasswordReset = (email: string) => {
      const found = users.find((user) => user.email.toLowerCase() === email.toLowerCase().trim());
      if (!found) {
        return { ok: true, message: "If the email exists, a reset message has been sent." };
      }

      const tempPassword = `Temp${Math.floor(100000 + Math.random() * 900000)}`;
      setUsers((prev) => prev.map((user) => (user.id === found.id ? { ...user, password: tempPassword } : user)));

      pushNotification(
        "Password Reset Requested",
        `A temporary password was generated for ${found.email}: ${tempPassword}`,
        ["system", "email"],
        [found.email],
      );

      return { ok: true, message: "Reset instruction sent to your email and system notifications." };
    };

    const markNotificationRead = (id: string) => {
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    };

    const markAllNotificationsRead = () => {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    };

    const convertAmount = (amountInInr: number, currencyCode: SupportedCurrency = selectedCurrency) => {
      const conversionRate = rates[currencyCode] ?? 1;
      return amountInInr * conversionRate;
    };

    const formatAmount = (amountInInr: number, currencyCode: SupportedCurrency = selectedCurrency) => {
      const locale = CURRENCY_LOCALE_MAP[currencyCode] ?? "en-US";
      const converted = convertAmount(amountInInr, currencyCode);
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(converted);
    };

    const formatSignedAmount = (amountInInr: number, currencyCode: SupportedCurrency = selectedCurrency) => {
      const sign = amountInInr >= 0 ? "+" : "-";
      return `${sign}${formatAmount(Math.abs(amountInInr), currencyCode)}`;
    };

    const formatCompactAmount = (amountInInr: number, currencyCode: SupportedCurrency = selectedCurrency) => {
      const locale = CURRENCY_LOCALE_MAP[currencyCode] ?? "en-US";
      const converted = convertAmount(amountInInr, currencyCode);
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(converted);
    };

    return {
      isAuthenticated: !!currentUser,
      userName: currentUser?.name ?? null,
      currentUserEmail: currentUser?.email ?? null,
      role: currentUser?.role ?? "staff",
      login,
      logout,
      updateCurrentProfile,
      users: users.map(toPublicUser),
      addUser,
      updateUserRole,
      requestPasswordReset,
      selectedCurrency,
      setSelectedCurrency,
      currencies: SUPPORTED_CURRENCIES,
      isRatesLoading,
      ratesUpdatedAt,
      formatAmount,
      formatSignedAmount,
      formatCompactAmount,
      notifications,
      unreadNotificationCount: notifications.filter((item) => !item.read).length,
      markNotificationRead,
      markAllNotificationsRead,
      systemNotificationsEnabled,
      setSystemNotificationsEnabled,
      emailNotificationsEnabled,
      setEmailNotificationsEnabled,
      emailConfig,
      setEmailConfig,
    };
  }, [
    currentUser,
    users,
    selectedCurrency,
    rates,
    isRatesLoading,
    ratesUpdatedAt,
    notifications,
    systemNotificationsEnabled,
    emailNotificationsEnabled,
    emailConfig,
  ]);

  useEffect(() => {
    if (!currentUser) return;

    const timer = window.setInterval(() => {
      const now = new Date();
      const hhmm = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const summaries = [
        "Daily settlement sync completed.",
        "New transaction batch imported.",
        "Reconciliation queue processed successfully.",
      ];
      const message = `${summaries[Math.floor(Math.random() * summaries.length)]} (${hhmm})`;

      const enabledChannels: AppNotificationChannel[] = [];
      if (systemNotificationsEnabled) enabledChannels.push("system");
      if (emailNotificationsEnabled) enabledChannels.push("email");

      if (enabledChannels.length === 0) return;

      const createdAt = new Date().toISOString();
      const next = enabledChannels.map((channel) => ({
        id: createNotificationId(),
        title: "Real-time Update",
        message,
        channel,
        createdAt,
        read: false,
      }));

      setNotifications((prev) => [...next, ...prev].slice(0, 50));
    }, LIVE_NOTIFICATION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [currentUser, systemNotificationsEnabled, emailNotificationsEnabled]);

  return <AppPreferencesContext.Provider value={contextValue}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return context;
}
