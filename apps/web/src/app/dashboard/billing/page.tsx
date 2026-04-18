"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Receipt,
  Plus,
  Zap,
  Crown,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    period: "/mo",
    icon: Zap,
    description: "For individuals getting started",
    features: [
      "5 recordings per month",
      "30 min max per recording",
      "Basic AI summaries",
      "Text export only",
      "Community support",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "£12",
    period: "/mo",
    icon: Crown,
    description: "For professionals who need more",
    features: [
      "Unlimited recordings",
      "Unlimited recording length",
      "Advanced AI summaries",
      "AI Q&A chat",
      "Phone recording (Twilio)",
      "Auto-email summaries",
      "All export formats",
      "Priority support",
    ],
    highlighted: true,
    badge: "Most Popular",
  },
  {
    id: "team",
    name: "Team",
    price: "£29",
    period: "/mo per user",
    icon: Users,
    description: "For teams and organisations",
    features: [
      "Everything in Pro",
      "Team workspace",
      "Admin controls & roles",
      "Shared recording library",
      "Usage analytics",
      "SSO / SAML",
      "Dedicated account manager",
      "Priority support",
    ],
    highlighted: false,
  },
];

const USAGE_STATS = {
  recordings_used: 3,
  recordings_limit: 5,
  storage_used_mb: 48,
  storage_limit_mb: 500,
  minutes_used: 67,
  minutes_limit: 150,
};

const BILLING_HISTORY = [
  { date: "No billing history", amount: "", status: "" },
];

export default function BillingPage() {
  const [currentPlan] = useState("free");

  const usagePercentage = Math.round(
    (USAGE_STATS.recordings_used / USAGE_STATS.recordings_limit) * 100
  );
  const storagePercentage = Math.round(
    (USAGE_STATS.storage_used_mb / USAGE_STATS.storage_limit_mb) * 100
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Billing & Plans</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your subscription and billing
          </p>
        </div>
      </div>

      {/* Current Plan & Usage */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Current Plan
          </CardTitle>
          <CardDescription>
            You are currently on the{" "}
            <span className="font-semibold text-foreground capitalize">
              {currentPlan}
            </span>{" "}
            plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Recordings usage */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Recordings</span>
                <span className="font-medium text-foreground">
                  {USAGE_STATS.recordings_used}/{USAGE_STATS.recordings_limit}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-primary transition-all"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Storage usage */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium text-foreground">
                  {USAGE_STATS.storage_used_mb} MB / {USAGE_STATS.storage_limit_mb} MB
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-primary transition-all"
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Minutes usage */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minutes</span>
                <span className="font-medium text-foreground">
                  {USAGE_STATS.minutes_used}/{USAGE_STATS.minutes_limit} min
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-primary transition-all"
                  style={{
                    width: `${Math.min(
                      Math.round(
                        (USAGE_STATS.minutes_used / USAGE_STATS.minutes_limit) * 100
                      ),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Choose Your Plan
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md",
                  plan.highlighted
                    ? "border-2 border-blue-primary shadow-md"
                    : "border-border"
                )}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-primary text-white text-xs px-3 h-6">
                    {plan.badge}
                  </Badge>
                )}

                <div className="mb-4 flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      plan.highlighted
                        ? "bg-blue-primary/10 text-blue-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <plan.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-card-foreground">
                    {plan.name}
                  </h3>
                </div>

                <div className="mb-1 flex items-baseline">
                  <span className="text-3xl font-bold text-card-foreground">
                    {plan.price}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">
                  {plan.description}
                </p>

                <ul className="mb-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-card-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      "w-full",
                      plan.highlighted
                        ? "bg-blue-primary text-white hover:bg-blue-dark"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    )}
                  >
                    Upgrade to {plan.name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Payment Method */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Payment Method
          </CardTitle>
          <CardDescription>
            Add a payment method to upgrade your plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No payment method
                </p>
                <p className="text-xs text-muted-foreground">
                  Add a card to enable paid plans
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Billing History
          </CardTitle>
          <CardDescription>
            Your past invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {BILLING_HISTORY[0].amount ? (
            <div className="divide-y">
              {BILLING_HISTORY.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {entry.date}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.status}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {entry.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No billing history yet. Upgrade to a paid plan to see invoices here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
