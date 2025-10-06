import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "sonner"
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ChatbotProvider } from "@/components/chatbot-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'GrainHero - AI-Powered Grain Storage Management',
  description: "Monitor, predict, and optimize your grain storage with GrainHero's intelligent SaaS platform. AI-powered spoilage prediction, IoT sensors, and real-time analytics.",
  keywords: 'grain storage, AI agriculture, IoT sensors, farm management, grain monitoring, predictive analytics, SaaS platform',
  authors: [{ name: 'GrainHero' }],
  openGraph: {
    title: 'GrainHero - Smart Grain Storage, Powered by AI',
    description: 'AI-powered grain storage management platform with real-time monitoring and predictive analytics.',
    type: 'website',
    locale: 'en_US',
  },
  robots: 'index, follow'
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <Providers>
          <ChatbotProvider>
            <NextIntlClientProvider>{children}</NextIntlClientProvider>
            <Toaster position="top-right" />
          </ChatbotProvider>
        </Providers>
      </body>
    </html>
  );
}

