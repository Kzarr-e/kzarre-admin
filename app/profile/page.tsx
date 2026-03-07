"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
/* ================= TYPES ================= */
interface Profile {
  name: string;
  email: string;
  role: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  /* ================= STATES ================= */
  const [profile, setProfile] = useState<Profile>({
    name: "User",
    email: "user@system.com",
    role: "Admin",
  });

  const [loading, setLoading] = useState(true);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const password = passwordForm.newPassword;

  const strengthChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const strengthScore =
    Object.values(strengthChecks).filter(Boolean).length;

  let strengthLabel = "Weak";
  let strengthColor = "bg-red-500";

  if (strengthScore >= 4) {
    strengthLabel = "Strong";
    strengthColor = "bg-green-500";
  } else if (strengthScore >= 3) {
    strengthLabel = "Medium";
    strengthColor = "bg-yellow-500";
  }

  const passwordsMatch =
    passwordForm.newPassword &&
    passwordForm.confirmPassword &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchWithAuth(`${API}/api/profile/me`);

        if (!res || !res.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        const user = data.user || data;

        setProfile({
          name: user.name,
          email: user.email,
          role: user.role,
        });
      } catch (error) {
        console.error("Profile load error:", error);
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [API, router]);

  /* ================= PASSWORD CHANGE ================= */
  const handlePasswordChange = async () => {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      toast.error("All fields are required");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setPasswordLoading(true);

      const res = await fetchWithAuth(
        `${API}/api/profile/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Password update failed");
      }

      toast.success("Password updated successfully");

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setPasswordLoading(false);
    }
  };
  const { logout } = useAuthStore();
  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    logout(); // 🔥 Proper logout
    toast.success("Logged out successfully");

    setTimeout(() => {
      router.push("/");
    }, 500);
  };

  /* ================= UI ================= */
  return (
    <div className="max-w-7xl mx-auto p-2">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-9">
        <h1 className="text-2xl text-[var(--textSecondary)] font-bold ">My Profile</h1>

        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          Logout
        </button>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-[var(--background)] rounded-2xl shadow-sm p-6 border ">
        <h2 className="text-lg font-semibold mb-4">Account Details</h2>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Info label="Full Name" value={profile.name} />
            <Info label="Email" value={profile.email} />
            <Info label="Role" value={profile.role} />
          </div>
        )}
      </div>

      {/* CHANGE PASSWORD */}
      <div className="bg-[var(--background)] rounded-2xl shadow-sm p-6 border  mt-6">
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>

        <form
          className="space-y-6 max-w-md"
          onSubmit={(e) => e.preventDefault()}
        >

          {/* CURRENT PASSWORD */}
          <div className="relative group">
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Current Password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              className="w-full px-4 py-3 border rounded-xl bg-[var(--background)] focus:ring-2 focus:ring-green-500 transition-all duration-300 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-4 top-3 text-gray-500 hover:text-black transition"
            >
              {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* NEW PASSWORD */}
          <div className="relative group">
            <input
              type={showNew ? "text" : "password"}
              placeholder="New Password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 bg-[var(--background)] transition-all duration-300 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-4 top-3 text-gray-500 hover:text-black transition"
            >
              {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* PASSWORD STRENGTH BAR */}
          {password && (
            <div className="space-y-2">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-2 ${strengthColor} transition-all duration-500`}
                  style={{ width: `${(strengthScore / 5) * 100}%` }}
                />
              </div>
              <p
                className={`text-sm font-medium transition-colors duration-300 ${strengthScore >= 4
                    ? "text-green-600"
                    : strengthScore >= 3
                      ? "text-yellow-600"
                      : "text-red-500"
                  }`}
              >
                Password Strength: {strengthLabel}
              </p>
            </div>
          )}

          {/* CONFIRM PASSWORD */}
          <div className="relative group">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              className="w-full px-4 py-3 border rounded-xl bg-[var(--background)] focus:ring-2 focus:ring-green-500 transition-all duration-300 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-3 text-gray-500 hover:text-black transition"
            >
              {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* MATCH INDICATOR */}
          {passwordForm.confirmPassword && (
            <p
              className={`text-sm font-medium transition-colors duration-300 ${passwordsMatch ? "text-green-600" : "text-red-500"
                }`}
            >
              {passwordsMatch
                ? "✔ Passwords match"
                : "✖ Passwords do not match"}
            </p>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="button"
            onClick={handlePasswordChange}
            disabled={
              passwordLoading ||
              strengthScore < 3 ||
              !passwordsMatch
            }
            className="w-full py-3 rounded-xl font-semibold text-[var(--textSecondary)] bg-gradient-to-r from-green-500 to-green-600 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ================= INFO COMPONENT ================= */
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm text-[var(--textSecondary)]">{label}</label>
      <p className="mt-1 text-[var(--textSecondary)] font-medium">{value}</p>
    </div>
  );
}