"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Users,
  Calendar,
  Send,
  Image as ImageIcon,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

/* ================= TYPES ================= */
interface Subscriber {
  _id: string;
  email: string;
  name?: string;
}

interface Campaign {
  _id: string;
  subject: string;
  body: string;
  imageUrl?: string;
  scheduledAt?: string;
  status: "draft" | "scheduled" | "sent";
}

/* ================= COMPONENT ================= */
export default function MarketingCenter() {
  const API = process.env.NEXT_PUBLIC_BACKEND_API_URL!;

 const getAuthHeaders = (): Record<string, string> => {
  const t =
    (typeof window !== "undefined" && (sessionStorage.getItem("access_token") || localStorage.getItem("access_token"))) ||
    null;
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
};


  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // composer state
  const [showComposer, setShowComposer] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [sending, setSending] = useState(false);

  /* ================= FETCH ================= */
  useEffect(() => {
    Promise.all([fetchSubscribers(), fetchCampaigns()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const fetchSubscribers = async () => {
    const res = await fetch(`${API}/api/admin/campaign/subscribers`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const data = await res.json();
    setSubscribers(data.subscribers || []);
  };

  const fetchCampaigns = async () => {
    const res = await fetch(`${API}/api/marketing/campaigns`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const data = await res.json();
    setCampaigns(data.campaigns || []);
  };

  /* ================= SEND / SCHEDULE ================= */
  const submitCampaign = async () => {
    if (!subject || !body) {
      toast.error("Subject and body are required");
      return;
    }

    setSending(true);

    const fd = new FormData();
    fd.append("subject", subject);
    fd.append("body", body);
    if (image) fd.append("image", image);
    if (scheduleAt) fd.append("scheduledAt", scheduleAt);

    const res = await fetch(`${API}/api/marketing/campaigns`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: fd,
      credentials: "include",
    });

    if (!res.ok) {
      toast.error("Failed to create campaign");
      setSending(false);
      return;
    }

    resetComposer();
    fetchCampaigns();
    setSending(false);
  };

  const resetComposer = () => {
    setShowComposer(false);
    setSubject("");
    setBody("");
    setImage(null);
    setPreviewUrl(null);
    setScheduleAt("");
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Center</h1>
          <p className="text-gray-500">Manage subscribers & email campaigns</p>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          className="px-5 py-2 rounded-lg bg-green-600 text-white flex items-center gap-2"
        >
          <Mail size={16} /> New Campaign
        </button>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 ">
        <Kpi title="Subscribers" value={subscribers.length} icon={<Users />} />
        <Kpi
          title="Total Campaigns"
          value={campaigns.length}
          icon={<Mail />}
        />
        <Kpi
          title="Scheduled"
          value={campaigns.filter(c => c.status === "scheduled").length}
          icon={<Calendar />}
        />
        <Kpi
          title="Sent"
          value={campaigns.filter(c => c.status === "sent").length}
          icon={<Send />}
        />
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* SUBSCRIBERS */}
        <Card title="Subscribers">
          {loading ? (
            <Skeleton />
          ) : subscribers.length === 0 ? (
            <Empty text="No subscribers yet" />
          ) : (
            subscribers.map(s => (
              <div
                key={s._id}
                className="flex justify-between py-2 border-b text-sm"
              >
                <span>{s.email}</span>
                {s.name && <span className="text-gray-500">{s.name}</span>}
              </div>
            ))
          )}
        </Card>

        {/* CAMPAIGNS */}
        <Card title="Campaigns">
          {loading ? (
            <Skeleton />
          ) : campaigns.length === 0 ? (
            <Empty text="No campaigns created" />
          ) : (
            campaigns.map(c => (
              <div
                key={c._id}
                className="py-3 border-b text-sm space-y-1"
              >
                <div className="flex justify-between">
                  <b>{c.subject}</b>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      c.status === "sent"
                        ? "bg-green-100 text-green-700"
                        : c.status === "scheduled"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                {c.scheduledAt && (
                  <p className="text-gray-500 text-xs">
                    Scheduled: {new Date(c.scheduledAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))
          )}
        </Card>
      </div>

      {/* ================= COMPOSER MODAL ================= */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Create Campaign</h2>
              <button
                onClick={resetComposer}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-5">
              <input
                className="w-full border rounded p-2"
                placeholder="Email Subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />

              <textarea
                className="w-full border rounded p-2 min-h-[150px]"
                placeholder="Write your marketing email (HTML supported)"
                value={body}
                onChange={e => setBody(e.target.value)}
              />

              {/* IMAGE */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Campaign Image (optional)
                </label>
                {!previewUrl ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setImage(f);
                      setPreviewUrl(URL.createObjectURL(f));
                    }}
                  />
                ) : (
                  <div className="relative w-full max-h-60 overflow-hidden rounded border">
                    <img
                      src={previewUrl}
                      className="w-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setImage(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 bg-white p-1 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* SCHEDULE */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  className="border rounded p-2"
                  value={scheduleAt}
                  onChange={e => setScheduleAt(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to send immediately
                </p>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3">
                <button onClick={resetComposer}>Cancel</button>
                <button
                  disabled={sending}
                  onClick={submitCampaign}
                  className="px-5 py-2 bg-green-600 text-white rounded"
                >
                  {sending
                    ? "Sending..."
                    : scheduleAt
                    ? "Schedule Campaign"
                    : "Send Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= UI HELPERS ================= */

function Kpi({ title, value, icon }: any) {
  return (
    <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] p-5 rounded-xl border shadow-sm flex items-center gap-4">
      <div className="p-3 rounded-lg bg-green-100 dark:bg-green-600">{icon}</div>
      <div>
        <p className="text-sm text-black-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)]  p-6 rounded-xl border shadow-sm">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="max-h-[400px] overflow-y-auto">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-10">{text}</p>;
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="h-4 bg-gray-200 animate-pulse rounded"
        />
      ))}
    </div>
  );
}
