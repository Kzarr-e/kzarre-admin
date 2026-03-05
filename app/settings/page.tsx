"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

type TabType = "general" | "maintenance";

const API = process.env.NEXT_PUBLIC_BACKEND_API_URL!;

const getToken = () =>
  typeof window !== "undefined"
    ? sessionStorage.getItem("refresh_token") ||
    sessionStorage.getItem("access_token")
    : null;

export default function SystemConfigurationPage() {
  const [activeTab, setActiveTab] = useState<TabType>("maintenance");

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
  LOAD CURRENT SETTINGS
  ========================= */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = getToken();

        const res = await fetch(`${API}/api/admin/system`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (data?.config?.maintenance) {
          setMaintenance(data.config.maintenance);
        }
      } catch {
        console.warn("Could not load maintenance settings");
      }
    };

    loadSettings();

  }, []);

  /* =========================
  SAVE SETTINGS
  ========================= */

  const saveMaintenanceSettings = async (updated: any) => {
    try {
      const token = getToken();


      await fetch(`${API}/api/admin/system/maintenance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ maintenance: updated }),
      });

      toast.success("Maintenance settings updated");
    } catch {
      toast.error("Failed to update maintenance settings");
    }


  };

  /* =========================
  TOGGLE MAINTENANCE
  ========================= */

  const toggleMaintenance = async () => {
    const updated = {
      ...maintenance,
      maintenanceMode: !maintenance.maintenanceMode,
    };


    setMaintenance(updated);

    await saveMaintenanceSettings(updated);


  };

  return (<div className="p-6 space-y-6">


    {/* HEADER */}
    <div>
      <h1 className="text-2xl font-bold">System Configuration</h1>
      <p className="text-sm text-gray-500">
        Manage maintenance mode and advanced system settings
      </p>
    </div>

    {/* TAB */}
    <div className="flex gap-6 border-b pb-2">
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

    {/* MAINTENANCE TAB */}
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
              onChange={(e) => {
                const updated = {
                  ...maintenance,
                  maintenanceMode: e.target.checked,
                };
                setMaintenance(updated);
              }}
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

        {/* START / END MAINTENANCE BUTTON */}

        <button
          onClick={toggleMaintenance}
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
    )}
  </div>


  );
}
