"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { languages, type LanguageCode, type TranslationKey } from "@/lib/languages"
import { usePathname } from "next/navigation"
import { config } from "@/config"

export interface User {
  id: string
  name: string
  email: string
  role: "super_admin" | "admin" | "manager" | "assistant"
  language: LanguageCode
  phone?: string
  avatarUrl?: string // Add avatarUrl as optional for extensibility
  hasAccess?: string // Add hasAccess as optional for extensibility
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateLanguage: (language: LanguageCode) => void
  isLoading: boolean
  refreshUser: () => Promise<void>
}

interface LanguageContextType {
  currentLanguage: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: TranslationKey) => string
  availableLanguages: Array<{ code: LanguageCode; name: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Plan Context
const PlanContext = createContext({
  plan: "basic",
  setPlan: (plan: string) => {},
});

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export function usePlan() {
  return useContext(PlanContext);
}

function LanguageProvider({
  children,
  initialLanguage = "en",
}: { children: React.ReactNode; initialLanguage?: LanguageCode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(initialLanguage)
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  useEffect(() => {
    // Extract locale from the URL
    const segments = pathname.split("/")
    const urlLocale = segments[1]
    const isValidLocale = (code: string): code is LanguageCode => Object.keys(languages).includes(code)
    if (urlLocale && isValidLocale(urlLocale)) {
      setCurrentLanguage(urlLocale)
      localStorage.setItem("farm-home-language", urlLocale)
    } else {
      // fallback to saved or initial
      const savedLanguage = localStorage.getItem("farm-home-language") as LanguageCode
      if (savedLanguage && languages[savedLanguage]) {
        setCurrentLanguage(savedLanguage)
      } else {
        setCurrentLanguage(initialLanguage)
      }
    }
  }, [pathname, initialLanguage])

  const setLanguage = (language: LanguageCode) => {
    setCurrentLanguage(language)
    localStorage.setItem("farm-home-language", language)
  }

  const t = (key: TranslationKey): string => {
    const translations = languages[currentLanguage]?.translations;
    if (translations && key in translations) {
      return translations[key as keyof typeof translations] as string;
    }
    const enTranslations = languages.en.translations;
    if (enTranslations && key in enTranslations) {
      return enTranslations[key as keyof typeof enTranslations] as string;
    }
    return key;
  }

  const availableLanguages = Object.values(languages).map((lang) => ({
    code: lang.code as LanguageCode,
    name: lang.name,
  }))

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Simple (demo) encryption helpers using base64 (replace with real crypto for production)
function encryptPlan(plan: string): string {
  return btoa(plan);
}
function decryptPlan(encrypted: string): string {
  try {
    return atob(encrypted);
  } catch {
    return "basic";
  }
}
function encryptAccess(access: string): string {
  return btoa(access);
}
function decryptAccess(encrypted: string): string {
  try {
    return atob(encrypted);
  } catch {
    return "none";
  }
}

function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlanState] = useState<string>("basic");

  useEffect(() => {
    const saved = localStorage.getItem("subscriptionPlan");
    if (saved) setPlanState(decryptPlan(saved));
  }, []);

  const setPlan = (plan: string) => {
    setPlanState(plan);
    localStorage.setItem("subscriptionPlan", encryptPlan(plan));
  };

  return (
    <PlanContext.Provider value={{ plan, setPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem("farm-home-user")
    const savedAccess = localStorage.getItem("farm-home-access")
    let parsedUser = savedUser ? JSON.parse(savedUser) : null;
    if (parsedUser && savedAccess) {
      parsedUser.hasAccess = decryptAccess(savedAccess);
    }
    setUser(parsedUser)
    setIsLoading(false)

    // Listen for user updates from other components (e.g., PlansPage)
    const handleUserUpdate = (e: any) => {
      if (e.detail) {
        setUser(e.detail);
      }
    };
    window.addEventListener('farm-home-user-updated', handleUserUpdate);
    return () => {
      window.removeEventListener('farm-home-user-updated', handleUserUpdate);
    };
  }, [])

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${config.backendUrl}/auth/me`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
      });
      console.log(1)
      if (!res.ok) throw new Error('Failed to fetch user info');
      const data = await res.json();
      if (data.hasAccess) {
        localStorage.setItem('farm-home-access', encryptAccess(data.hasAccess));
      }
      console.log(2)
      const userObj = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        language: data.language || 'en',
        phone: data.phone,
        avatarUrl: data.avatar,
        hasAccess: data.hasAccess || 'none',
      };
      setUser(userObj);
      console.log(3)
      localStorage.setItem('farm-home-user', JSON.stringify(userObj));
    } catch (err) {
      // Optionally handle error
    }
    console.log(4)
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${config.backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error("Login failed")
      const data = await res.json()
      // Persist JWT for authenticated API calls
      if (data.token) {
        localStorage.setItem("token", data.token)
      }
      // Save encrypted hasAccess
      if (data.hasAccess) {
        localStorage.setItem("farm-home-access", encryptAccess(data.hasAccess))
      }
      // Save user info
      const userObj = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        language: data.language || "en",
        phone: data.phone,
        avatarUrl: data.avatar,
        hasAccess: data.hasAccess || "none",
      }
      setUser(userObj)
      localStorage.setItem("farm-home-user", JSON.stringify(userObj))
    } catch (err) {
      setUser(null)
      localStorage.removeItem("token")
    }
    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("farm-home-user")
    localStorage.removeItem("farm-home-access")
    localStorage.removeItem("token")
  }

  const updateLanguage = (language: LanguageCode) => {
    if (user) {
      const updatedUser = { ...user, language }
      setUser(updatedUser)
      localStorage.setItem("farm-home-user", JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateLanguage, isLoading, refreshUser }}>
      <LanguageProvider initialLanguage={user?.language || "en"}>
        <PlanProvider>{children}</PlanProvider>
      </LanguageProvider>
    </AuthContext.Provider>
  )
}
