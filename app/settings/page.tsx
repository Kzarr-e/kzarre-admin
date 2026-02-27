"use client";

import React, { useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
type TabType = "general" | "maintenance";

const API = process.env.NEXT_PUBLIC_BACKEND_API_URL!;
const getToken = () =>
  typeof window !== "undefined"
    ? sessionStorage.getItem("refresh_token") ||
    sessionStorage.getItem("access_token")
    : null;


export default function SystemConfigurationPage() {
  const [activeTab, setActiveTab] = useState<TabType>("general");

  /* =========================
     GENERAL SETTINGS STATE
  ========================= */

  /* =========================
     MAINTENANCE STATE
  ========================= */
  const [maintenance, setMaintenance] = useState({
    autoBackup: true,
    developerAccess: false,
    maintenanceMode: false,
    maintenanceMessage: "We are under scheduled maintenance.",
    maintenanceEta: "",
    clearCache: false,
    rebuildIndex: false,
    forceLogoutAll: false,
    readOnlyMode: false,
    adminIpWhitelist: "",
  });

  /* =========================
     SAVE HANDLERS
  ========================= */

  const saveMaintenanceSettings = async () => {
    try {

      await fetch(`${API}/api/admin/system/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance }),
      });


      alert("Maintenance & Advanced settings saved successfully");
    } catch (err) {
      alert("Failed to save maintenance settings");
    }
  };


  const triggerManualBackup = async () => {
    try {
      const token = getToken();

      await fetch(`${API}/api/system/backup/manual`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      alert("Manual backup triggered successfully");
    } catch {
      alert("Backup failed");
    }
  };


  const runAdvancedAction = async (action: string) => {
    try {
      const token = getToken();

      await fetch(`${API}/api/system/action/${action}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      alert(`${action} executed successfully`);
    } catch {
      alert("Action failed");
    }
  };


  /* =========================
      FONT MANAGER STATE
  ========================= */
  const [fontName, setFontName] = useState("");
  const [fontFile, setFontFile] = useState<any>(null);
  const [fontPreviewUrl, setFontPreviewUrl] = useState("");

  const handleFontUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFontFile(file);
    setFontPreviewUrl(URL.createObjectURL(file));
  };

  const saveFontToServer = async () => {
    if (!fontName || !fontFile) {
      alert("Please enter font name and upload font file");
      return;
    }

    const form = new FormData();
    form.append("fontName", fontName);
    form.append("fontFile", fontFile);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/cms/font/add`, {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    if (data.success) {
      alert("Font uploaded successfully!");
      setFontName("");
      setFontFile(null);
      setFontPreviewUrl("");
    } else {
      alert("Font upload failed.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-bold">System Configuration</h1>
        <p className="text-sm text-gray-500">
          General settings, maintenance mode, backups & advanced controls
        </p>
      </div>

      {/* ================= TABS ================= */}
      <div className="flex gap-6 border-b pb-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`text-sm font-medium ${activeTab === "general"
              ? "text-[var(--accent-green)] border-b-2 !border-[var(--accent-green)]"
              : "text-gray-500"
            }`}
        >
          GENERAL SETTINGS
        </button>

        <button
          onClick={() => setActiveTab("maintenance")}
          className={`text-sm font-medium ${activeTab === "maintenance"
              ? "text-[var(--accent-green)] border-b-2 !border-[var(--accent-green)]"
              : "text-gray-500"
            }`}
        >
          MAINTENANCE & ADVANCED
        </button>
      </div>

      {/* ========================= GENERAL TAB ========================= */}
      {activeTab === "general" && (
        <div className="space-y-6 max-w-3xl">
          {/* ---------- FONT MANAGER CARD ---------- */}
          <div className="border rounded-xl p-6 space-y-6">
            <h3 className="font-semibold text-lg">Font Manager</h3>

            {/* Font Name */}
            <div>
              <label className="block text-sm mb-1">Font Name</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Poppins, CustomFont"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
              />
            </div>

            {/* Font Upload */}
            <div>
              <label className="block text-sm mb-1">Upload Font File</label>
              <input
                type="file"
                accept=".ttf,.woff,.woff2"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                onChange={handleFontUpload}
              />
              <p className="text-xs text-gray-500 pt-1">
                Supported formats: .ttf, .woff, .woff2
              </p>
            </div>

            {/* Live Preview */}
            {fontPreviewUrl && (
              <div className="p-4 rounded-lg border">
                <style>
                  {`
                    @font-face {
                      font-family: '${fontName}';
                      src: url('${fontPreviewUrl}');
                    }
                  `}
                </style>

                <p
                  style={{ fontFamily: fontName, fontSize: "20px" }}
                  className="font-medium"
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            )}

            <button
              onClick={saveFontToServer}
              className="bg-[var(--accent-green)] text-white px-6 py-2 rounded-lg"
            >
              Save Font
            </button>
          </div>
        </div>
      )}

      {/* ========================= MAINTENANCE TAB ========================= */}
      {activeTab === "maintenance" && (
        <div className="space-y-6 max-w-4xl">

          {/* Maintenance Mode */}
          <div className="border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Website Under Maintenance</h3>

            <div className="flex justify-between items-center">
              <span>Enable Maintenance Mode</span>
              <input
                type="checkbox"
                checked={maintenance.maintenanceMode}
                onChange={(e) =>
                  setMaintenance({
                    ...maintenance,
                    maintenanceMode: e.target.checked,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Maintenance Message
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={maintenance.maintenanceMessage}
                onChange={(e) =>
                  setMaintenance({
                    ...maintenance,
                    maintenanceMessage: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Estimated Restore Time
              </label>
              <input
                type="datetime-local"
                className="border rounded px-3 py-2 text-sm"
                value={maintenance.maintenanceEta}
                onChange={(e) =>
                  setMaintenance({
                    ...maintenance,
                    maintenanceEta: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Backups */}
          <div className="border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Backups</h3>

            <div className="flex justify-between items-center">
              <span>Automatic Scheduled Backups</span>
              <input
                type="checkbox"
                checked={maintenance.autoBackup}
                onChange={(e) =>
                  setMaintenance({
                    ...maintenance,
                    autoBackup: e.target.checked,
                  })
                }
              />
            </div>

            <button
              onClick={triggerManualBackup}
              className="border px-4 py-2 rounded-lg"
            >
              Run Manual Backup
            </button>
          </div>

          {/* Advanced Controls */}
          <div className="border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Advanced Controls</h3>

            <button
              className="border px-4 py-2 rounded"
              onClick={() => runAdvancedAction("Cache Cleared")}
            >
              Clear System Cache
            </button>

            <button
              className="border px-4 py-2 rounded"
              onClick={() => runAdvancedAction("Search Index Rebuilt")}
            >
              Rebuild Search Index
            </button>

            <button
              className="border px-4 py-2 rounded text-red-600"
              onClick={() => runAdvancedAction("All Users Logged Out")}
            >
              Force Logout All Users
            </button>

            <div className="flex justify-between items-center">
              <span>Read-only Emergency Mode</span>
              <input
                type="checkbox"
                checked={maintenance.readOnlyMode}
                onChange={(e) =>
                  setMaintenance({
                    ...maintenance,
                    readOnlyMode: e.target.checked,
                  })
                }
              />
            </div>
          </div>

          {/* Developer Access */}
          <div className="border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Developer & Database Access</h3>

            <div className="flex justify-between items-center">
              <span>Advanced Database Tools</span>
              <input
                type="checkbox"
                checked={maintenance.developerAccess}
                onChange={(e) =>
                  setMaintenance({
                    ...maintenance,
                    developerAccess: e.target.checked,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Admin IP Whitelist</label>
              <input
                placeholder="e.g. 192.168.1.1, 103.21.244.0"
                className="w-full border rounded px-3 py-2 text-sm"
                value={maintenance.adminIpWhitelist}
                onChange={(e) =>
                  setMaintenance({
                    ...maintenance,
                    adminIpWhitelist: e.target.value,
                  })
                }
              />
            </div>

            <button
              onClick={async () => {
                await saveMaintenanceSettings();
              }}
              className={`px-6 py-2 rounded-lg text-white ${maintenance.maintenanceMode
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[var(--accent-green)] hover:opacity-90"
                }`}
            >
              {maintenance.maintenanceMode
                ? "End Maintenance"
                : "Start Maintenance"}
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
