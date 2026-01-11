"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import useAuthStore from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to login");
      }

      const data = await response.json();
      loginStore(data.user, data.token);
      toast.success("Welcome back!");
      router.push(data.user.role === "admin" ? "/admin" : "/");
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF4F1] to-[#FFE1D7] px-4 py-12">
      <Card className="w-full max-w-md space-y-8 bg-white/95 shadow-2xl">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Welcome back
          </p>
          <h1 className="text-3xl font-bold text-neutral-900">
            Login to Gifteeco
          </h1>
          <p className="text-sm text-neutral-500">
            Access your dashboard and keep gifting magic going
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="••••••••"
            required
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full cursor-pointer" isLoading={loading}>
            Login
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-brand hover:underline"
          >
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
