"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import useAuthStore from "@/store/useAuthStore";

function VerifyOTPPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginStore = useAuthStore((state) => state.login);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const userId = searchParams.get("userId");

  useEffect(() => {
    if (!userId) {
      toast.error("Invalid verification link");
      router.push("/signup");
    }
  }, [userId, router]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; 
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData
        .split("")
        .concat(Array(6 - pastedData.length).fill(""));
      setOtp(newOtp.slice(0, 6));
      const lastInput = document.getElementById(
        `otp-${Math.min(pastedData.length, 5)}`
      );
      lastInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, otp: otpString }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to verify OTP");
      }

      const data = await response.json();
      loginStore(data.user, data.token);
      toast.success("Email verified successfully!");
      router.push("/");
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Invalid OTP. Please try again.";
      toast.error(errorMessage);
      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId) return;

    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to resend OTP");
      }

      toast.success("OTP resent to your email");
      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to resend OTP";
      toast.error(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F7ECFF] via-white to-[#FFE9F0] px-4 py-12">
      <Card className="w-full max-w-md space-y-8 bg-white/95 shadow-2xl">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Email Verification
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900">
            Enter Verification Code
          </h1>
          <p className="text-sm text-neutral-500">
            We&apos;ve sent a 6-digit code to your email. Please enter it below.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-2xl font-semibold border-2 border-neutral-300 rounded-lg focus:border-[var(--color-button)] focus:outline-none transition"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <Button type="submit" className="w-full" isLoading={loading}>
            Verify Email
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-neutral-500">
            Didn&apos;t receive the code?
          </p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm font-semibold text-brand hover:underline disabled:opacity-50"
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>
        </div>
      </Card>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <VerifyOTPPageContent />
    </Suspense>
  );
}
