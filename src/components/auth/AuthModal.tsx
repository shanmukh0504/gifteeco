"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FaTimes, FaHeart, FaGift, FaStar } from "react-icons/fa";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const loginStore = useAuthStore((state) => state.login);
  const [mode, setMode] = useState<"login" | "signup" | "forgotPassword">(
    initialMode
  );
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    // Reset forgot password state when modal opens/closes
    if (!isOpen) {
      setForgotPasswordEmail("");
      setForgotPasswordSent(false);
    }
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to send reset email");
      }

      setForgotPasswordSent(true);
      toast.success("Password reset link sent to your email!");
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send reset link";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = errorData.error || "Failed to login";

        // If email is not verified, offer to resend OTP
        if (response.status === 403 && error.includes("verify your email")) {
          toast.error(error);
          // Try to get userId to resend OTP
          try {
            const userResponse = await fetch(
              `/api/auth/get-user-by-email?email=${encodeURIComponent(
                loginForm.email
              )}`
            );
            if (userResponse.ok) {
              const userData = await userResponse.json();
              if (userData.userId) {
                // Show option to resend OTP
                const resendResponse = await fetch("/api/auth/resend-otp", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: userData.userId }),
                });
                if (resendResponse.ok) {
                  toast.success(
                    "OTP resent! Redirecting to verification page..."
                  );
                  onClose();
                  window.location.href = `/verify-otp?userId=${userData.userId}`;
                  return;
                }
              }
            }
          } catch (resendError) {
            console.error("Error resending OTP:", resendError);
          }
        }

        throw new Error(error);
      }

      const data = await response.json();
      loginStore(data.user, data.token);
      toast.success("Welcome back!");
      onClose();

      // Reset form
      setLoginForm({ email: "", password: "" });
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Unable to login";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to sign up");
      }

      const data = await response.json();
      toast.success(
        "OTP sent to your email! Please verify to complete registration."
      );

      // Close modal and redirect to OTP verification page
      onClose();
      window.location.href = `/verify-otp?userId=${data.userId}`;

      // Reset form
      setSignupForm({ name: "", email: "", password: "" });
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Unable to sign up";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/* Left Side - Visual/Info */}
          <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#FF9AA2] via-[#FFB3BA] to-[#FFE5E7] p-8 text-white relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
            <div className="absolute top-1/2 right-4 w-32 h-32 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <FaGift className="text-xl" />
                </div>
                <h2 className="text-2xl font-bold">Gifteeco</h2>
              </div>

              <div className="space-y-4">
                <h3 className="text-3xl font-bold leading-tight">
                  {mode === "login"
                    ? "Welcome Back!"
                    : mode === "forgotPassword"
                    ? "Reset Your Password"
                    : "Start Your Journey"}
                </h3>
                <p className="text-white/90 text-lg leading-relaxed">
                  {mode === "login"
                    ? "Access your wishlist, track orders, and discover personalized recommendations tailored just for you."
                    : mode === "forgotPassword"
                    ? "Don't worry! We'll help you regain access to your account. Enter your email and we'll send you a secure reset link."
                    : "Join thousands of happy customers. Create your account to save favorites, track orders, and enjoy exclusive offers."}
                </p>
              </div>

              {/* Feature Icons */}
              <div className="mt-8 flex gap-4">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <FaHeart className="text-sm" />
                  <span className="text-sm font-medium">Wishlist</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <FaStar className="text-sm" />
                  <span className="text-sm font-medium">Personalized</span>
                </div>
              </div>
            </div>

            {/* Bottom Quote */}
            <div className="relative z-10 mt-auto pt-8 border-t border-white/20">
              <p className="text-white/80 italic">
                &ldquo;The best gifts come from the heart&rdquo;
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex flex-col p-8 md:p-12">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="ml-auto mb-6 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-neutral-900 mb-2">
                {mode === "login"
                  ? "Login"
                  : mode === "forgotPassword"
                  ? "Reset Password"
                  : "Create Account"}
              </h2>
              <p className="text-neutral-600">
                {mode === "login"
                  ? "Enter your credentials to continue"
                  : mode === "forgotPassword"
                  ? "Enter your email and we'll send you a reset link"
                  : "Fill in your details to get started"}
              </p>
            </div>

            {/* Form */}
            {mode === "forgotPassword" ? (
              forgotPasswordSent ? (
                <div className="space-y-6 flex-1">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                        Check Your Email
                      </h3>
                      <p className="text-sm text-neutral-600">
                        We&apos;ve sent a password reset link to{" "}
                        <strong>{forgotPasswordEmail}</strong>. Please check
                        your inbox and click the link to reset your password.
                      </p>
                      <p className="text-xs text-neutral-400 mt-2">
                        The link will expire in 1 hour.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        setForgotPasswordSent(false);
                        setForgotPasswordEmail("");
                      }}
                      className="w-full"
                    >
                      Send Another Email
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setForgotPasswordEmail("");
                        setForgotPasswordSent(false);
                      }}
                      className="w-full py-3 px-4 border-2 border-neutral-300 text-neutral-700 rounded-lg font-semibold hover:bg-neutral-50 transition-colors"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleForgotPassword}
                  className="space-y-5 flex-1"
                >
                  <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full mt-6"
                    isLoading={loading}
                  >
                    Send Reset Link
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-neutral-500">
                        Remember your password?
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setForgotPasswordEmail("");
                    }}
                    className="w-full py-3 px-4 border-2 border-[#FF9AA2] text-[#FF9AA2] rounded-lg font-semibold hover:bg-[#FFE5E7] transition-colors"
                  >
                    Login Instead
                  </button>
                </form>
              )
            ) : mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5 flex-1">
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  placeholder="you@example.com"
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="Enter your password"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgotPassword")}
                    className="text-sm font-semibold text-[#FF9AA2] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-6"
                  isLoading={loading}
                >
                  Login
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-neutral-500">
                      New to Gifteeco?
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="w-full py-3 px-4 border-2 border-[#FF9AA2] text-[#FF9AA2] rounded-lg font-semibold hover:bg-[#FFE5E7] transition-colors"
                >
                  Create Account
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-5 flex-1">
                <Input
                  label="Full Name"
                  type="text"
                  name="name"
                  value={signupForm.name}
                  onChange={handleSignupChange}
                  placeholder="John Doe"
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={signupForm.email}
                  onChange={handleSignupChange}
                  placeholder="you@example.com"
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={signupForm.password}
                  onChange={handleSignupChange}
                  placeholder="Choose a secure password"
                  required
                />

                <Button
                  type="submit"
                  className="w-full mt-6"
                  isLoading={loading}
                >
                  Create Account
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-neutral-500">
                      Already have an account?
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="w-full py-3 px-4 border-2 border-[#FF9AA2] text-[#FF9AA2] rounded-lg font-semibold hover:bg-[#FFE5E7] transition-colors"
                >
                  Login Instead
                </button>
              </form>
            )}

            {/* Terms */}
            <p className="text-xs text-neutral-500 text-center mt-6">
              By continuing, you agree to Gifteeco&apos;s{" "}
              <a href="#" className="text-[#FF9AA2] hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#FF9AA2] hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
