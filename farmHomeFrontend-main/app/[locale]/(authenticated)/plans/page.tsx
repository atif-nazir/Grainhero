"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import pricingData from "../../pricing-data.js";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/[locale]/providers";
import { useTranslations } from "next-intl";
import { usePlan } from "@/app/[locale]/providers";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { config } from "@/config";

function encryptAccess(access: string): string {
  return btoa(access);
}
export default function PlansPage() {
  const [didCall, setDidCall] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { logout, refreshUser, user } = useAuth();
  const t = useTranslations("PricingPage");
  const { plan, setPlan } = usePlan();
  const email = localStorage.getItem("email");
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const res = await fetch(`${config.backendUrl}/auth/me`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error("Failed to fetch user info");
        const data = await res.json();
        if (data.hasAccess) {
          localStorage.setItem(
            "farm-home-access",
            encryptAccess(data.hasAccess)
          );
        }
        const userObj = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          language: data.language || "en",
          phone: data.phone,
          avatarUrl: data.avatar,
          hasAccess: data.hasAccess || "none",
        };
        // Update context user state directly if possible
        if (typeof window !== "undefined" && window.dispatchEvent) {
          // Custom event to notify Providers to update user state
          window.dispatchEvent(
            new CustomEvent("farm-home-user-updated", { detail: userObj })
          );
        }
        localStorage.setItem("farm-home-user", JSON.stringify(userObj));
      } catch (err) {
        // Optionally handle error
      }
      setIsLoading(false);
    })();
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-4">
          {t("title", { defaultMessage: "Pricing Plans" })}
        </h1>
        <p className="text-center text-gray-600 mb-12">
          {t("subtitle", {
            defaultMessage: "Choose the plan that fits your farm best.",
          })}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {pricingData.map((p) => (
            <Card
              key={p.id}
              className={`flex flex-col h-full ${
                plan === p.id ? "ring-2 ring-green-500" : ""
              }`}
            >
              <CardHeader>
                <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
                  {p.name}
                  {plan === p.id && (
                    <CheckCircle2 className="text-green-600 w-6 h-6" />
                  )}
                </CardTitle>
                <div className="text-3xl font-bold text-center mt-2">
                  {p.priceFrontend}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <CardDescription className="text-center mb-4">
                  {p.description}
                </CardDescription>
                <ul className="mb-6 space-y-2">
                  {p.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <div className="w-full">
                  <Button
                    className="w-full"
                    variant={user?.hasAccess === p.id  ? "outline" : "default"}
                    onClick={() =>
                      router.push(p.link + "?prefilled_email=" + email)
                    }
                    disabled={user?.hasAccess === p.id}
                  >
                    {user?.hasAccess === p.id ? "Subscribed" : "Buy"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="flex justify-center gap-4">
          <Button onClick={() => router.push("/dashboard")}>
            {t("goToDashboard", { defaultMessage: "Go to Dashboard" })}
          </Button>
          <Button variant="outline" onClick={logout}>
            {t("logout", { defaultMessage: "Logout" })}
          </Button>
        </div>
      </div>
    </div>
  );
}
