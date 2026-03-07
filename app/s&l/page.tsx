"use client";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
/* =========================
   AUTH TOKEN FROM COOKIE
========================= */
const getAuthTokenFromCookie = () => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )refresh_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

/* =========================
   TYPES
========================= */
interface CourierPartner {
  _id: string;
  name: string;
  slug: string;
  enabled: boolean;
  environment: "sandbox" | "production";
  baseUrls: {
    sandbox?: string;
    production?: string;
  };
  auth: {
    type: "apiKey" | "bearer";
    apiKey?: string;
    token?: string;
  };
  endpoints?: {
    shipment?: string;
  };
  currency: string;
}

interface AdminOrder {
  _id: string;
  orderId: string;
  status: string;
  amount: number;
  shipment?: {
    carrier?: string;
    trackingId?: string;
    status?: string;
    labelUrl?: string;
  };
}

/* =========================
   MAIN PAGE
========================= */
export default function ShippingAndLogisticsPage() {
  const API = process.env.NEXT_PUBLIC_BACKEND_API_URL!;
  const token = getAuthTokenFromCookie();

  const [couriers, setCouriers] = useState<CourierPartner[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<CourierPartner>>({
    enabled: true,
    environment: "production",
    currency: "USD",
    auth: { type: "bearer" },
    baseUrls: {},
    endpoints: {},
  });

  /* =========================
     FETCH DATA
  ========================= */
  const fetchCouriers = async () => {
    const res = await fetch(`${API}/api/admin/couriers`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setCouriers(await res.json());
  };

  const fetchOrders = async () => {
    const res = await fetch(`${API}/api/admin/orders`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setOrders(await res.json());
  };

  useEffect(() => {
    fetchCouriers();
    fetchOrders();
  }, []);

  /* =========================
     SAVE / UPDATE COURIER
  ========================= */
  const saveCourier = async () => {
    if (!form.name || !form.slug) {
      toast.error("Courier name & slug required");
      return;
    }

    setSaving(true);

    const slug = form.slug.toLowerCase().trim().replace(/\s+/g, "-");

    let payload: any = {
      ...form,
      slug,
      enabled: true,
    };

    /* 🔥 AUTO CONFIG FOR EASYSHIP */
    if (slug === "easyship") {
      payload = {
        ...payload,
        name: "Easyship",

        auth: {
          type: "bearer",
          token: form.auth?.token || "",
        },

        baseUrls: {
          sandbox: "https://public-api-sandbox.easyship.com",
          production: "https://public-api.easyship.com",
        },

        headersTemplate: {
          Authorization: "Bearer {{token}}",
          "Content-Type": "application/json",
        },
        endpoints: {
          createShipment: "/2024-09/shipments",
          getRates: "/2024-09/rates",
          buyLabel: "/2024-09/labels",
          tracking: "/2024-09/trackings",
        }

      };
    }


    await fetch(`${API}/api/admin/couriers/${slug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    setForm({
      enabled: true,
      environment: "production",
      currency: "USD",
      auth: { type: "bearer" },
      baseUrls: {},
      endpoints: {},
    });

    await fetchCouriers();
    setSaving(false);
  };

  /* =========================
     ENABLE / DISABLE COURIER
  ========================= */
  const toggleCourier = async (slug: string, enabled: boolean) => {
    await fetch(`${API}/api/admin/couriers/${slug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ enabled }),
    });

    fetchCouriers();
  };

  /* =========================
     CREATE SHIPMENT
  ========================= */
  const createShipment = async (orderId: string, courier: string) => {
    await fetch(`${API}/api/admin/orders/${orderId}/ship`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ courier }),
    });

    fetchOrders();
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">Shipping & Logistics (Admin)</h1>

      {/* ADD / UPDATE COURIER */}
      <div className="border rounded-xl bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]">
        <h2 className="font-semibold mb-3">Add / Update Courier</h2>

        <div className="grid md:grid-cols-2 gap-3">
          <input
            placeholder="Courier Name"
            className="border px-3 py-2 rounded bg-[var(--background-card)] dark:bg-[var(--bgCard)]"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="Slug (easyship)"
            className="border px-3 py-2 rounded bg-[var(--background-card)] dark:bg-[var(--bgCard)]"
            value={form.slug || ""}
            onChange={(e) =>
              setForm({
                ...form,
                slug: e.target.value.toLowerCase().trim(),
              })
            }
          />

          <select
            className="border p-2 py-2 rounded bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]"
            value={form.auth?.type}
            onChange={(e) =>
              setForm({
                ...form,
                auth: { type: e.target.value as "bearer" | "apiKey" },
              })
            }
          >
            <option value="bearer">Bearer Token</option>
            <option value="apiKey">API Key</option>
          </select>

          <input
            placeholder="API Token"
            className="border px-3 py-2 rounded bg-[var(--background-card)] dark:bg-[var(--bgCard)]"
            value={form.auth?.token || ""}
            onChange={(e) =>
              setForm({
                ...form,
                auth: {
                  type: form.auth?.type ?? "bearer", // ✅ ALWAYS PRESENT
                  token: e.target.value,
                },
              })

            }
          />
        </div>

        <button
          onClick={saveCourier}
          disabled={saving}
          className="mt-4 px-5 py-2 bg-green-600 text-white rounded"
        >
          {saving ? "Saving..." : "Save Courier"}
        </button>
      </div>

      {/* COURIERS */}
      <div className="border rounded-xl p-4 bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]">
        <h2 className="font-semibold mb-3">Courier Partners</h2>

        {couriers.map((c) => (
          <div
            key={c._id}
            className="flex justify-between items-center border p-3 rounded mb-2"
          >
            <div>
              <b>{c.name}</b>
              <p className="text-xs text-gray-500">
                {c.slug} • {c.environment}
              </p>
            </div>

            <button
              onClick={() => toggleCourier(c.slug, !c.enabled)}
              className={`px-3 py-1 rounded text-sm ${c.enabled
                ? "bg-green-600 text-white"
                : "bg-gray-400 text-black"
                }`}
            >
              {c.enabled ? "Enabled" : "Disabled"}
            </button>


          </div>
        ))}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-3">Orders</h2>

        {orders.map((o) => (
          <div key={o._id} className="border rounded-xl p-4 mb-3 bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]">
            <h3 className="font-semibold">Order #{o.orderId}</h3>
            <p>Status: {o.status}</p>
            <p>Amount: ${o.amount}</p>

            {o.shipment ? (
              <div className="mt-2 space-y-1 text-sm">
                <p>Status: <b>{o.shipment.status}</b></p>

                {o.shipment.trackingId && (
                  <p>
                    📦 Tracking: <b>{o.shipment.trackingId}</b>
                  </p>
                )}

                {o.shipment.labelUrl && (
                  <a
                    href={o.shipment.labelUrl}
                    target="_blank"
                    className="inline-block mt-1 px-3 py-1 bg-blue-600 text-white rounded text-xs"
                  >
                    Print Label
                  </a>
                )}

                {!o.shipment.trackingId && (
                  <button
                    onClick={async () => {
                      await fetch(
                        `${API}/api/admin/orders/${o.orderId}/retry-label`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                        }
                      );
                      fetchOrders();
                    }}
                    className="mt-2 px-3 py-1 bg-orange-600 text-white rounded text-xs"
                  >
                    🔁 Retry Label
                  </button>
                )}
              </div>
            ) : (

              <select
                className="border mt-2 px-2 py-1 rounded"
                defaultValue=""
                onChange={(e) =>
                  createShipment(o._id, e.target.value)
                }
              >
                <option value="" disabled>
                  Assign Courier
                </option>
                {couriers
                  .filter((c) => c.enabled)
                  .map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
