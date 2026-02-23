"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldown > 0) {
      return toast.error(`Wait ${cooldown}s before retrying`);
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccess(true);
      startCooldown();
      toast.success("Reset link sent successfully.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow border text-center">

        {!success ? (
          <>
            <h2 className="text-2xl font-bold mb-4">
              Forgot Password
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg transition disabled:opacity-60"
              >
                {loading
                  ? "Sending..."
                  : cooldown > 0
                  ? `Retry in ${cooldown}s`
                  : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 150 }}
            className="flex flex-col items-center space-y-4"
          >
            <motion.svg
              viewBox="0 0 52 52"
              className="w-20 h-20"
            >
              <circle
                cx="26"
                cy="26"
                r="25"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
              />
              <motion.path
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                d="M14 27l7 7 16-16"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6 }}
              />
            </motion.svg>

            <h3 className="text-xl font-semibold text-green-600">
              Email Sent!
            </h3>

            <p className="text-gray-500 text-sm">
              Check your inbox for the reset link.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}