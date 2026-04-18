"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Clock,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface PhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string;
  is_active: boolean;
  created_at: string;
}

interface CallRecord {
  id: string;
  title: string;
  twilio_from: string | null;
  twilio_to: string | null;
  status: string;
  duration_seconds: number | null;
  created_at: string;
}

export default function PhonePage() {
  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("GB");
  const [areaCode, setAreaCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active phone number
      const { data: numbers } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      if (numbers && numbers.length > 0) {
        setPhoneNumber(numbers[0]);
      } else {
        setPhoneNumber(null);
      }

      // Fetch twilio call recordings
      const { data: recordings } = await supabase
        .from("recordings")
        .select(
          "id, title, twilio_from, twilio_to, status, duration_seconds, created_at"
        )
        .eq("user_id", user.id)
        .eq("source", "twilio")
        .order("created_at", { ascending: false })
        .limit(50);

      setCalls(recordings || []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProvision = async () => {
    setProvisioning(true);
    setError(null);

    try {
      const response = await fetch("/api/twilio/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: countryCode.trim().toUpperCase(),
          areaCode: areaCode.trim() || undefined,
          address: {
            customerName: customerName.trim(),
            street: street.trim(),
            city: city.trim(),
            region: region.trim(),
            postalCode: postalCode.trim(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to provision number");
      }

      setPhoneNumber(data.phoneNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision number");
    } finally {
      setProvisioning(false);
    }
  };

  const handleRelease = async () => {
    if (!phoneNumber) return;
    setReleasing(true);
    setError(null);

    try {
      const response = await fetch("/api/twilio/provision", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: phoneNumber.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to release number");
      }

      setPhoneNumber(null);
      setReleaseDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release number");
    } finally {
      setReleasing(false);
    }
  };

  function formatDuration(seconds: number | null): string {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            Ready
          </Badge>
        );
      case "recording":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
            Recording
          </Badge>
        );
      case "transcribing":
      case "summarizing":
      case "processing":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Processing
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Phone Recording</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Record phone calls automatically with a virtual number
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Phone number card */}
      {!phoneNumber ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Get a Virtual Number</CardTitle>
            <CardDescription>
              Provision a phone number to automatically record, transcribe, and
              summarize your calls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Number selection */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Country</label>
                  <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                    <option value="GB">🇬🇧 United Kingdom (+44)</option>
                    <option value="US">🇺🇸 United States (+1)</option>
                    <option value="CA">🇨🇦 Canada (+1)</option>
                    <option value="AU">🇦🇺 Australia (+61)</option>
                    <option value="DE">🇩🇪 Germany (+49)</option>
                    <option value="FR">🇫🇷 France (+33)</option>
                    <option value="ES">🇪🇸 Spain (+34)</option>
                    <option value="IT">🇮🇹 Italy (+39)</option>
                    <option value="NL">🇳🇱 Netherlands (+31)</option>
                    <option value="IE">🇮🇪 Ireland (+353)</option>
                    <option value="SE">🇸🇪 Sweden (+46)</option>
                    <option value="NO">🇳🇴 Norway (+47)</option>
                    <option value="DK">🇩🇰 Denmark (+45)</option>
                    <option value="FI">🇫🇮 Finland (+358)</option>
                    <option value="PT">🇵🇹 Portugal (+351)</option>
                    <option value="BE">🇧🇪 Belgium (+32)</option>
                    <option value="AT">🇦🇹 Austria (+43)</option>
                    <option value="CH">🇨🇭 Switzerland (+41)</option>
                    <option value="PL">🇵🇱 Poland (+48)</option>
                    <option value="JP">🇯🇵 Japan (+81)</option>
                    <option value="KR">🇰🇷 South Korea (+82)</option>
                    <option value="IN">🇮🇳 India (+91)</option>
                    <option value="BR">🇧🇷 Brazil (+55)</option>
                    <option value="MX">🇲🇽 Mexico (+52)</option>
                    <option value="ZA">🇿🇦 South Africa (+27)</option>
                    <option value="NG">🇳🇬 Nigeria (+234)</option>
                    <option value="GH">🇬🇭 Ghana (+233)</option>
                    <option value="KE">🇰🇪 Kenya (+254)</option>
                    <option value="SG">🇸🇬 Singapore (+65)</option>
                    <option value="HK">🇭🇰 Hong Kong (+852)</option>
                    <option value="NZ">🇳🇿 New Zealand (+64)</option>
                    <option value="AE">🇦🇪 UAE (+971)</option>
                    <option value="SA">🇸🇦 Saudi Arabia (+966)</option>
                    <option value="IL">🇮🇱 Israel (+972)</option>
                    <option value="PH">🇵🇭 Philippines (+63)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Area Code (optional)</label>
                  <Input value={areaCode} onChange={(e) => setAreaCode(e.target.value)} placeholder="20" maxLength={5} />
                </div>
              </div>

              {/* Address (required for regulatory compliance) */}
              <Separator />
              <p className="text-xs text-gray-500">Address required for phone number regulatory compliance</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Full Name</label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Stephen Osinowo" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Street Address</label>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Flat A, 345 Brixton Road" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">City</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Region / County</label>
                  <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="London" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Postcode</label>
                  <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="SW9 7DA" />
                </div>
              </div>

              <Button
                className="gap-2 bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto"
                onClick={handleProvision}
                disabled={provisioning || !countryCode.trim() || !customerName.trim() || !street.trim() || !city.trim() || !postalCode.trim()}
              >
                {provisioning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                {provisioning ? "Provisioning..." : "Get Number"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-green-500" />
              Your Virtual Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tracking-wide text-gray-900">
                  {phoneNumber.phone_number}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      phoneNumber.is_active
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    )}
                  >
                    {phoneNumber.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    Since {formatDate(phoneNumber.created_at)}
                  </span>
                </div>
              </div>
              <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
                <DialogTrigger
                  render={
                    <Button variant="destructive" size="sm" className="gap-1.5">
                      <PhoneOff className="h-3.5 w-3.5" />
                      Release
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Release Phone Number?</DialogTitle>
                    <DialogDescription>
                      This will permanently release {phoneNumber.phone_number} and
                      you will no longer receive calls on it. Existing recordings
                      will not be deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="outline" />}
                    >
                      Cancel
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={handleRelease}
                      disabled={releasing}
                    >
                      {releasing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {releasing ? "Releasing..." : "Release Number"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Separator className="my-4" />

            <p className="text-sm text-gray-600">
              Forward your calls to this number or share it directly. All incoming
              calls will be automatically recorded, transcribed, and summarized.
            </p>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                1. Get your virtual number
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Provision a dedicated phone number for recording
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <PhoneCall className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                2. Forward or share the number
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Set up call forwarding or give out the number directly
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                3. Automatic AI processing
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Calls are recorded, transcribed, and summarized automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call history */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Call History
        </h2>
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-12">
            <PhoneCall className="mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-900">No calls yet</p>
            <p className="text-xs text-gray-500">
              Incoming calls to your virtual number will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => (
              <Link
                key={call.id}
                href={`/dashboard/recordings/${call.id}`}
                className="block rounded-lg border bg-white p-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="overflow-hidden">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {call.twilio_from || "Unknown Caller"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(call.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatDuration(call.duration_seconds)}
                    </div>
                    {statusBadge(call.status)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
