"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to sign up");
      }

      const data = await response.json();
      toast.success(
        "OTP sent to your email! Please verify to complete registration."
      );
      router.push(`/verify-otp?userId=${data.userId}`);
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Unable to sign up";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F7ECFF] via-white to-[#FFE9F0] px-4 py-12">
      <Card className="w-full max-w-md space-y-8 bg-white/95 shadow-2xl">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Join the experience
          </p>
          <h1 className="text-3xl font-bold text-neutral-900">
            Create your account
          </h1>
          <p className="text-sm text-neutral-500">
            Craft delightful gifting journeys for your team & clients.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ava Patel"
            required
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@company.com"
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Choose a secure password"
            required
          />

          <Button type="submit" className="w-full" isLoading={loading}>
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            Login instead
          </Link>
        </p>
      </Card>
    </div>
  );
}
