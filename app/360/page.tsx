"use client";
import { useEffect, useState } from "react";
import {
    User,
    MapPin,
    Mail,
    Phone,
    ShieldAlert,
    CalendarCheck,
    FileText,
    PlusCircle,
    X,
    FilterX
} from "lucide-react";
import toast from "react-hot-toast";

type Customer = {
    fulfilledCount: number;
    breachedCount: number;
    pendingCount: number;
    addresses: any;
    _id: string;
    name: string;
    email: string;
    phone?: string;

    metrics?: {
        ltv: number;
        aov: number;
        returnRate: number;
    };

    lastPromiseCreatedAt?: string | null;
    lastPromiseDueDate?: string | null;
    lastPromiseStatus?: "pending" | "breached" | "fulfilled" | null; // 🔥 ADD
};


type CustomerFilter = "promise" | "all" | "pending" | "breached" | "fulfilled";

type NoteRecord = {
    _id: string;
    customerId: string;
    message: string;
    createdAt: string;
    createdBy?: string;
};

type TimelineItem = {
    _id: string;
    type: "order" | "ticket" | "chat" | "email" | "note";
    title: string;
    description?: string;
    createdAt: string;

    // 🔥 For orders
    orderId?: string;
};


type PromiseRecord = {
    _id: string;
    type: "replacement" | "discount" | "delivery";
    status: "pending" | "fulfilled" | "breached";
    dueDate: string;
    notes?: string;
    attachmentUrl?: string;
};
type ContactMessage = {
    _id: string;
    name: string;
    email: string;
    message: string;
    status: string;
    createdAt: string;
};



/* =========================================================
   MAIN CRM PAGE
========================================================= */
export default function MiniCRMPage() {
    const [showOnlyPromiseCustomers, setShowOnlyPromiseCustomers] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
        null
    );

    const clearCustomerFilter = () => {
        setCustomerFilter("all");
    };

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"timeline" | "promises" | "messages">("timeline");
    const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    const [customerFilter, setCustomerFilter] = useState<CustomerFilter>("promise");
    const [returns, setReturns] = useState<any[]>([]);

    const filteredCustomers = customers.filter((c) => {
        const hasPromise =
            c.lastPromiseCreatedAt || c.lastPromiseDueDate;


        if (customerFilter === "promise") {
            return hasPromise;
        }

        if (customerFilter === "all") {
            return true;
        }

        // 🔥 TEMP LOGIC using LAST promise status (once backend sends it)
        if (customerFilter === "pending") {
            return (c as any).pendingCount > 0;
        }

        if (customerFilter === "breached") {
            return (c as any).breachedCount > 0;
        }


        if (customerFilter === "fulfilled") {
            return (c as any).fulfilledCount > 0;
        }


        return true;
    });
    const filterCounts = {
        all: customers.length,
        pending: customers.filter(c => (c as any).pendingCount > 0).length,
        breached: customers.filter(c => (c as any).breachedCount > 0).length,
        fulfilled: customers.filter(c => (c as any).fulfilledCount > 0).length,
    };
    const isFilterDisabled = (key: string) =>
        key !== "all" &&
        filterCounts[key as keyof typeof filterCounts] === 0;
    const disabledBtn =
        "opacity-50 cursor-not-allowed pointer-events-none";
    const [customerAddress, setCustomerAddress] = useState<any | null>(null);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [promises, setPromises] = useState<PromiseRecord[]>([]);
    const [notes, setNotes] = useState<NoteRecord[]>([]);

    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(false);

    const [showDetails, setShowDetails] = useState(false); // 🔥 overlay control

    const [refundOverride, setRefundOverride] = useState(false);
    const [guardrailBlocked, setGuardrailBlocked] = useState(false);

    const [noteText, setNoteText] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    const [showPromiseForm, setShowPromiseForm] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const t = sessionStorage.getItem("access_token");
        setToken(t);
    }, []);
    const getTomorrowDate = () => {
        const now = new Date();

        const tomorrow = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
        );

        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const day = String(tomorrow.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;   // 🔥 NO toISOString
    };

    const approveReturn = async (orderId: string) => {
        const token = sessionStorage.getItem("access_token");
        await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/admin/orders/return/approve/${orderId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                
                body: JSON.stringify({ orderId }),
            }
        );

        fetchOrderDetails(orderId);
    };

    const rejectReturn = async (orderId: string) => {
        const reason = prompt("Reason for rejecting return?");
        const token = sessionStorage.getItem("access_token");
        if (!reason) return;

        await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/admin/orders/return/reject`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                
                body: JSON.stringify({ orderId, reason }),
            }
        );

        fetchOrderDetails(orderId);
    };

    const fetchReturns = async () => {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/crm/returns`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        const data = await res.json();
        setReturns(data.returns || []);
    };

    useEffect(() => {
        fetchReturns();
    }, []);

    const fetchLatestAddress = async (email: string) => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/orders?email=${email}&limit=1`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) {
                setCustomerAddress(null);
                return;
            }

            const data = await res.json();
            const latestOrder = data.orders?.[0];

            if (latestOrder?.shippingAddress) {
                setCustomerAddress(latestOrder.shippingAddress);
            } else {
                setCustomerAddress(null);
            }
        } catch (err) {
            console.error("Fetch address failed:", err);
            setCustomerAddress(null);
        }
    };

    useEffect(() => {
        if (!customer) return;

        fetchTimeline();
        fetchPromises();
        fetchNotes();
        fetchLatestAddress(customer.email);   // 🔥 ADD THIS
    }, [selectedCustomerId]);


    const [promiseForm, setPromiseForm] = useState({
        type: "replacement",
        dueDate: getTomorrowDate(),   // 🔥 default = Tommorrow
        notes: "",
    });

    const fetchOrderDetails = async (orderId: string) => {
        try {
            setShowOrderDetails(true);   // 🔥 open immediately
            setSelectedOrder(null);
            setLoadingOrder(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/orders/${orderId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) {
                toast.error("Failed to load order details");
                setShowOrderDetails(false);
                return;
            }

            const data = await res.json();
            setSelectedOrder(data.order);

        } catch (err) {
            console.error("Fetch order details failed:", err);
            setShowOrderDetails(false);
        } finally {
            setLoadingOrder(false);
        }
    };

    const [activeIndex, setActiveIndex] = useState(0);
    const [recentCustomerId, setRecentCustomerId] = useState<string | null>(null);

    useEffect(() => {
        fetchCustomerList();
    }, []);

    const fetchCustomerList = async () => {
        try {
            setLoadingCustomers(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/crm/customers`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) return;

            const data = await res.json();
            const list = Array.isArray(data) ? data : [];

            setCustomers(list);

            // 🔥 Only auto-select first customer ON FIRST LOAD
            if (!selectedCustomerId && list.length > 0) {
                setCustomer(list[0]);
                setSelectedCustomerId(list[0]._id);
            }

        } catch (err) {
            console.error("Fetch customers failed:", err);
        } finally {
            setLoadingCustomers(false);
        }
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!customers.length) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, customers.length - 1));
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
            }

            if (e.key === "Enter") {
                const c = customers[activeIndex];
                if (c) {
                    selectCustomer(c);
                }
            }

            if (e.key === "Escape") {
                setShowDetails(false);
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [customers, activeIndex]);

    /* =========================================================
       SEARCH CUSTOMER
    ========================================================= */
    const searchCustomer = async (value?: string) => {
        try {
            if (!value || !value.trim()) return;

            const cleanValue = value.trim();
            setNotFound(false);

            let params = "";
            let searchedByOrder = false; // 🔥 NEW FLAG

            // 1️⃣ EMAIL
            if (cleanValue.includes("@")) {
                params = `email=${encodeURIComponent(cleanValue)}`;
            }
            // 2️⃣ PHONE
            else if (/^\+?\d{8,15}$/.test(cleanValue.replace(/\s+/g, ""))) {
                const onlyDigits = cleanValue.replace(/\D/g, "");
                params = `phone=${encodeURIComponent(onlyDigits)}`;
            }
            // 3️⃣ ORDER ID
            else {
                params = `orderId=${encodeURIComponent(cleanValue)}`;
                searchedByOrder = true; // 🔥 MARK ORDER SEARCH
            }

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/crm/search?${params}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) {
                setCustomer(null);
                setSelectedCustomerId(null);
                setNotFound(true);
                return;
            }

            const data = await res.json();

            let selected: Customer | null = null;

            if (Array.isArray(data)) {
                if (data.length === 0) {
                    setNotFound(true);
                    return;
                }
                const first = data[0];
                selected = customers.find(c => c._id === first._id) || first;
            } else {
                selected = customers.find(c => c._id === data._id) || data;
            }

            if (selected) {
                selectCustomer(selected, searchedByOrder);


                // 🔥 ONLY HIGHLIGHT WHEN SEARCHED BY ORDER ID

            }

        } catch (err) {
            console.error("Search failed:", err);
            setCustomer(null);
            setSelectedCustomerId(null);
            setNotFound(true);
        }
    };

    /* =========================================================
       SELECT CUSTOMER (central handler)
    ========================================================= */
    const selectCustomer = (c: Customer, highlight = false) => {
        setCustomer(c);
        setSelectedCustomerId(c._id);
        setNotFound(false);
        setShowDetails(true);

        if (highlight) {
            setRecentCustomerId(c._id);
            setTimeout(() => setRecentCustomerId(null), 3000);
        }
    };

    /* =========================================================
       FETCH DETAILS
    ========================================================= */
    useEffect(() => {
        if (!selectedCustomerId) return;
        fetchTimeline();
        fetchPromises();
        fetchNotes();

        // 🔥 IMPORTANT: refresh customer list so lastPromiseStatus updates

    }, [selectedCustomerId]);


    const fetchTimeline = async () => {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/crm/timeline/${selectedCustomerId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        const data = await res.json();
        setTimeline(Array.isArray(data) ? data : []);
    };

    const fetchPromises = async () => {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/crm/promises/${selectedCustomerId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        const data = await res.json();
        setPromises(Array.isArray(data) ? data : []);
    };

    const fetchNotes = async () => {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/crm/notes/${selectedCustomerId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        const data = await res.json();
        setNotes(Array.isArray(data) ? data : []);
    };

    const updatePromiseStatus = async (
        promiseId: string,
        newStatus: "fulfilled"
    ) => {
        const token = sessionStorage.getItem("access_token");
        if (!customer) return;

        const ok = window.confirm("Mark this promise as FULFILLED?");
        if (!ok) return;

        // 🔥 Optimistically update UI first
        setPromises((prev) =>
            prev.map((p) =>
                p._id === promiseId
                    ? { ...p, status: "fulfilled" }
                    : p
            )
        );

        try {
            await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/crm/promises/update-status`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    
                    body: JSON.stringify({
                        promiseId,
                        newStatus: "fulfilled",
                    }),
                }
            );

            // Optional: re-fetch to sync with backend
            fetchPromises();
            fetchCustomerList();
        } catch (err) {
            toast.error("Failed to update status. Reverting.");
            // rollback on failure
            fetchPromises();
        }
    };
    /* =========================================================
       CREATE NOTE
    ========================================================= */

    /* =========================================================
       CREATE PROMISE
    ========================================================= */
    const createPromise = async () => {
        const token = sessionStorage.getItem("access_token");
        if (!promiseForm.dueDate || !customer) {
            toast.error("Select due date");
            return;
        }
        if (!promiseForm.notes.trim()) {
            toast.error("Notes are required. Please explain this promise.");
            return;
        }
        await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/crm/promises/create`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    customerId: customer._id,
                    type: promiseForm.type,
                    dueDate: promiseForm.dueDate,
                    notes: promiseForm.notes,
                }),
            }
        );

        setShowPromiseForm(false);
        setPromiseForm({
            type: "replacement",
            dueDate: getTomorrowDate(),
            notes: "",
        });

        fetchPromises();
        fetchCustomerList();
    };

    /* =========================================================
       DISPUTE GUARDRAILS
    ========================================================= */
    const attemptRefund = () => {
        const hasOpen = promises.some(
            (p) => p.status === "pending" || p.status === "breached"
        );

        if (hasOpen && !refundOverride) {
            setGuardrailBlocked(true);
            return;
        }

        toast.error("Refund allowed by policy.");
        setGuardrailBlocked(false);
    };

    const fetchContactMessages = async () => {
        if (!customer || !token) return;

        try {
            setLoadingMessages(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/admin/messages/contact`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await res.json();

            setContactMessages(Array.isArray(data.messages) ? data.messages : []);
        } catch (err) {
            console.error("Fetch contact messages failed:", err);
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        if (!selectedCustomerId || !customer) return;

        fetchTimeline();
        fetchPromises();
        fetchNotes();
        fetchContactMessages();   // 🔥 ADD THIS
        fetchLatestAddress(customer.email);

    }, [selectedCustomerId]);

    /* =========================================================
       UI
    ========================================================= */
    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <User /> Customer 360
            </h1>
            {/* SEARCH BAR */}
            <div className="flex flex-wrap gap-2 items-center">
                <input
                    className="border px-3 py-2 rounded w-full max-w-md bg-[var(--background-card)] border-[var(--sidebar-border)]"
                    placeholder="Search by Order ID / Phone / Email"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            const value = (e.target as HTMLInputElement).value;
                            searchCustomer(value);
                        }
                    }}
                    id="crm-search"
                />
                <button
                    onClick={() => {
                        const input = document.getElementById(
                            "crm-search"
                        ) as HTMLInputElement;
                        searchCustomer(input.value);
                    }}
                    className="px-4 py-2 rounded border text-sm"
                >
                    Search
                </button>

                <button
                    onClick={() => {
                        setCustomer(null);
                        setTimeline([]);
                        setPromises([]);
                        setSelectedCustomerId(null);
                        setNotFound(false);
                        setShowDetails(false);

                        const input = document.getElementById(
                            "crm-search"
                        ) as HTMLInputElement;
                        if (input) input.value = "";
                    }}
                    className="px-4 py-2 rounded border text-sm"
                >
                    Clear
                </button>
            </div>

            {notFound && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm max-w-md">
                    Customer not found.
                </div>
            )}

            {/* ================= FULL SCREEN CUSTOMER TABLE ================= */}
            <div className="border rounded-xl overflow-hidden">
                <div className="p-4 font-semibold bg-[var(--background-card)] border-b">
                    Customers
                </div>

                {!loadingCustomers && customers.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 py-2 border-b bg-[var(--background-card)] dark:bg-[var(--bgCard)]text-sm items-center">

                        {[
                            { key: "all", label: "All Customers" },
                            { key: "pending", label: "Pending" },
                            { key: "breached", label: "Breached" },
                            { key: "fulfilled", label: "Fulfilled" },
                        ].map((f) => {
                            const active = customerFilter === f.key;
                            const disabled = isFilterDisabled(f.key);

                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setCustomerFilter(f.key as CustomerFilter)}
                                    disabled={disabled}
                                    className={` bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]
            px-3 py-1 rounded border transition
            ${active
                                            ? "bg-blue-100 text-blue-700 border-blue-300"
                                            : "bg-white hover:bg-gray-100"
                                        }
              ${disabled ? "opacity-40 cursor-not-allowed" : ""}
          `}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                        {/* 🔥 CLEAR FILTER (always enabled) */}
                        <button
                            onClick={clearCustomerFilter}
                            disabled={customerFilter === "all"}
                            className={`bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]
        ml-2 p-2 rounded border transition
        ${customerFilter !== "all"
                                    ? "text-gray-600 hover:bg-red-50 hover:text-red-600"
                                    : "opacity-30 cursor-not-allowed"
                                }
      `}
                            title="Clear filter"
                        >
                            <FilterX size={16} />
                        </button>

                    </div>
                )}

                {loadingCustomers && customers.length > 0 && (
                    <div className="divide-y">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex gap-3 p-3 animate-pulse">
                                <div className="h-4 w-24 bg-gray-200 rounded" />
                                <div className="h-4 w-32 bg-gray-200 rounded" />
                                <div className="h-4 w-20 bg-gray-200 rounded" />
                                <div className="h-4 w-16 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </div>
                )}
                {loadingCustomers ? (
                    <div className="p-4 text-sm  text-gray-500">Loading…</div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                        No customers found.
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[70vh]">
                        {/* DETAIL TABS */}
                        <div className="flex gap-2 border-b mb-4">
                            {[
                                { key: "timeline", label: "Timeline" },
                                { key: "promises", label: "Promises" },
                                { key: "messages", label: "Messages" },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`px-4 py-2 text-sm border-b-2 transition ${activeTab === tab.key
                                        ? "border-blue-500 text-blue-600 font-medium"
                                        : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                                    {tab.label}
                                    {tab.key === "messages" && contactMessages.length > 0 && (
                                        <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                            {contactMessages.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)] border-b sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2 text-left">Phone</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                    <th className="px-3 py-2 text-left">LTV</th>
                                    <th className="px-3 py-2 text-left">Last Promise</th>
                                    <th className="px-3 py-2 text-left">Valid Till</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredCustomers.map((c, index) => (
                                    <tr
                                        key={c._id}
                                        onClick={() => selectCustomer(c)}
                                        className={`cursor-pointer border-t transition
    ${index === activeIndex
                                                ? "bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800"
                                                : ""
                                            }
    ${customer?._id === c._id
                                                ? "bg-white dark:bg-[var(--bgCard)] font-semibold"
                                                : ""
                                            }
    ${recentCustomerId === c._id
                                                ? "bg-yellow-50 dark:bg-yellow-900/30 animate-pulse"
                                                : ""
                                            }
  `}
                                    >
                                        <td className="px-3 py-2 ">{c.name}</td>
                                        <td className="px-3 py-2">{c.email}</td>
                                        <td className="px-3 py-2">{c.phone || "—"}</td>
                                        <td className="px-3 py-2 ">
                                            {(() => {
                                                let displayStatus = c.lastPromiseStatus;

                                                // 🔥 STRICT MODE OVERRIDE BASED ON ACTIVE FILTER
                                                if (customerFilter === "fulfilled" && c.fulfilledCount > 0) {
                                                    displayStatus = "fulfilled";
                                                }

                                                if (customerFilter === "breached" && c.breachedCount > 0) {
                                                    displayStatus = "breached";
                                                }

                                                if (customerFilter === "pending" && c.pendingCount > 0) {
                                                    displayStatus = "pending";
                                                }

                                                if (!displayStatus) {
                                                    return <span className="text-gray-400">—</span>;
                                                }

                                                if (displayStatus === "fulfilled") {
                                                    return (
                                                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                                                            FULFILLED
                                                        </span>
                                                    );
                                                }

                                                if (displayStatus === "breached") {
                                                    return (
                                                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                                                            BREACHED
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                                                        PENDING
                                                    </span>
                                                );
                                            })()}
                                        </td>

                                        <td className="px-3 py-2">
                                            ${c.metrics?.ltv ?? 0}
                                        </td>

                                        <td className="px-3 py-2">
                                            {c.lastPromiseCreatedAt
                                                ? new Date(c.lastPromiseCreatedAt).toLocaleDateString()
                                                : "—"}
                                        </td>

                                        <td className="px-3 py-2">
                                            {c.lastPromiseDueDate
                                                ? new Date(c.lastPromiseDueDate).toLocaleDateString()
                                                : "—"}
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ================= RIGHT SIDE OVERLAY DETAILS ================= */}
            {showDetails && customer && (
                <div className="fixed inset-0 bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]  bg-black/40 z-50 flex items-center justify-center">
                    <div className="w-full max-w-4xl h-[90vh] bg-[var(--background-card)] shadow-xl rounded-xl overflow-y-auto">


                        {/* Overlay Header */}
                        <div className="sticky top-0 bg-[var(--background-card)] border-b p-4 flex items-center justify-between z-10">
                            <div className="font-semibold text-lg">{customer.name}</div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="px-3 py-1 border rounded text-sm hover:bg-red-600"
                            >
                                Close
                            </button>
                        </div>

                        {/* ================= DETAILS CONTENT ================= */}
                        <div className="p-6 space-y-6">

                            {/* CUSTOMER PROFILE */}
                            <div className="border rounded-xl overflow-hidden">
                                <div className="p-4 font-semibold bg-[var(--background-card)] border-b">
                                    Customer Profile
                                </div>

                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-t">
                                            <td className="px-4 py-2 font-medium">Name</td>
                                            <td className="px-4 py-2">{customer.name}</td>
                                        </tr>

                                        <tr className="border-t">
                                            <td className="px-4 py-2 font-medium">Email</td>
                                            <td className="px-4 py-2 flex gap-2">
                                                <Mail size={14} /> {customer.email}
                                            </td>
                                        </tr>

                                        <tr className="border-t">
                                            <td className="px-4 py-2 font-medium">Phone</td>
                                            <td className="px-4 py-2 flex gap-2">
                                                <Phone size={14} /> {customer.phone || "-"}
                                            </td>
                                        </tr>

                                        <tr className="border-t align-top">
                                            <td className="px-4 py-2 font-medium">Addresses</td>
                                            <td className="px-4 py-2">
                                                {customerAddress ? (
                                                    <div className="flex flex-col gap-1 text-sm">
                                                        {customerAddress.name && <div><b>{customerAddress.name}</b></div>}
                                                        {customerAddress.phone && <div>{customerAddress.phone}</div>}
                                                        {customerAddress.line1 && <div>{customerAddress.line1}</div>}
                                                        {customerAddress.line2 && <div>{customerAddress.line2}</div>}
                                                        {(customerAddress.city || customerAddress.state) && (
                                                            <div>
                                                                {customerAddress.city}, {customerAddress.state}
                                                            </div>
                                                        )}
                                                        {customerAddress.pincode && <div>{customerAddress.pincode}</div>}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">No address found</span>
                                                )}

                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* LIFETIME METRICS */}
                            <div className="border rounded-xl overflow-hidden">
                                <div className="p-4 font-semibold bg-[var(--background-card)] border-b">
                                    Lifetime Metrics
                                </div>

                                <div className="grid grid-cols-3 divide-x text-center">
                                    <div className="p-4">
                                        <div className="text-xs text-gray-500">LTV</div>
                                        <div className="text-lg font-bold">
                                            ${customer.metrics?.ltv ?? 0}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="text-xs text-gray-500">AOV</div>
                                        <div className="text-lg font-bold">
                                            ${customer.metrics?.aov ?? 0}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="text-xs text-gray-500">Return Rate</div>
                                        <div className="text-lg font-bold">
                                            {customer.metrics?.returnRate ?? 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* UNIFIED TIMELINE */}
                            <div className="border rounded-xl p-4 space-y-2">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <FileText size={18} /> Unified Timeline
                                </h2>

                                {timeline.length === 0 ? (
                                    <div className="text-gray-500 text-sm">
                                        No activity recorded.
                                    </div>
                                ) : (
                                    timeline.map((item) => (

                                        <div
                                            key={item._id}
                                            className="border-b py-2 flex justify-between text-sm"
                                        >
                                            <div>
                                                <b>{item.type.toUpperCase()}</b> — {item.title}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {item.type.toLowerCase() === "order" && (
                                                    <button
                                                        onClick={() => {
                                                            const match = item.title.match(/ORD-\d+/);
                                                            if (match) {
                                                                fetchOrderDetails(match[0]);
                                                            } else {
                                                                toast.error("Order ID not found in timeline item");
                                                            }
                                                        }}
                                                        className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                                                    >
                                                        View Order
                                                    </button>
                                                )}



                                                <div className="text-xs text-gray-400">
                                                    {new Date(item.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))

                                )}
                            </div>

                            {/* CUSTOMER PROMISES */}
                            <div className="border rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <CalendarCheck size={18} /> Customer Promises
                                    </h2>

                                    <button
                                        onClick={() => setShowPromiseForm(!showPromiseForm)}
                                        className="flex items-center gap-1 border px-3 py-1 rounded text-sm"
                                    >
                                        {showPromiseForm ? <X size={14} /> : <PlusCircle size={14} />}
                                        {showPromiseForm ? "Close" : "Add Promise"}
                                    </button>

                                </div>

                                {showPromiseForm && (
                                    <div className="border p-4 rounded space-y-4 bg-[var(--background-card)] dark:bg-[var(--bgCard)]">

                                        {/* Promise Type */}
                                        <div className="flex flex-col gap-1 bg-[var(--background-card)]">
                                            <label className="text-xs font-medium text-gray-600">
                                                Promise Type
                                            </label>
                                            <select
                                                className="w-full border p-2 rounded dark:bg-[var(--bgCard)] "
                                                value={promiseForm.type}
                                                onChange={(e) =>
                                                    setPromiseForm({
                                                        ...promiseForm,
                                                        type: e.target.value,
                                                    })
                                                }
                                            >
                                                <option value="replacement">Replacement</option>
                                                <option value="discount">Discount</option>
                                                <option value="delivery">Delivery</option>
                                            </select>
                                        </div>

                                        {/* Due Date */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">
                                                Due Date
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full border p-2 rounded bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]"
                                                min={getTomorrowDate()}   // 🔥 Only tomorrow onwards allowed
                                                value={promiseForm.dueDate}
                                                onChange={(e) =>
                                                    setPromiseForm({
                                                        ...promiseForm,
                                                        dueDate: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>

                                        {/* Notes */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">
                                                Notes <span className="text-red-500">*</span>
                                            </label>

                                            <textarea
                                                className="w-full border p-2 rounded bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)] "
                                                placeholder="Explain why this promise is being created..."
                                                value={promiseForm.notes}
                                                onChange={(e) =>
                                                    setPromiseForm({
                                                        ...promiseForm,
                                                        notes: e.target.value,
                                                    })
                                                }
                                            />

                                        </div>

                                        {/* Save Button */}
                                        <button
                                            onClick={createPromise}
                                            className="w-full border py-2 rounded text-sm font-medium bg-[var(--background-card)] dark:bg-[var(--bgCard)] hover:bg-gray-100"
                                        >
                                            Save Promise
                                        </button>
                                    </div>
                                )}


                                {promises.length === 0 ? (
                                    <div className="text-sm text-gray-500">
                                        No promises found.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm border rounded-lg">
                                            <thead className="bg-[var(--background-card)] border-b">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Type</th>
                                                    <th className="px-3 py-2 text-left">Status</th>
                                                    <th className="px-3 py-2 text-left">Due Date</th>
                                                    <th className="px-3 py-2 text-left">Notes</th>
                                                    <th className="px-3 py-2 text-left">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {promises.map((p) => {
                                                    const effectiveStatus =
                                                        p.status === "pending" && new Date(p.dueDate) < new Date()
                                                            ? "breached"
                                                            : p.status;


                                                    return (
                                                        <tr key={p._id} className="border-t">
                                                            {/* TYPE */}
                                                            <td className="px-3 py-2 font-medium">
                                                                {p.type.toUpperCase()}
                                                            </td>

                                                            {/* STATUS */}
                                                            <td className="px-3 py-2">
                                                                {(() => {
                                                                    if (effectiveStatus === "fulfilled") {
                                                                        return (
                                                                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                                                                                FULFILLED
                                                                            </span>
                                                                        );
                                                                    }

                                                                    if (effectiveStatus === "breached") {
                                                                        return (
                                                                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                                                                                BREACHED
                                                                            </span>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                                                                            PENDING
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </td>



                                                            {/* DUE DATE */}
                                                            <td className="px-3 py-2">
                                                                {new Date(p.dueDate).toLocaleDateString()}
                                                            </td>

                                                            {/* NOTES */}
                                                            <td className="px-3 py-2 text-gray-400">
                                                                {p.notes || "—"}
                                                            </td>

                                                            {/* ACTION */}
                                                            <td className="px-3 py-2">
                                                                {effectiveStatus === "pending" && (
                                                                    <button
                                                                        onClick={() =>
                                                                            updatePromiseStatus(p._id, "fulfilled")
                                                                        }
                                                                        className="px-3 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                                                                    >
                                                                        Mark Fulfilled
                                                                    </button>

                                                                )}

                                                                {effectiveStatus !== "pending" && (
                                                                    <span className="text-xs text-gray-400">—</span>
                                                                )}
                                                            </td>
                                                        </tr>

                                                    );
                                                })}
                                            </tbody>

                                        </table>
                                    </div>
                                )}
                            </div>


                            <div className="border rounded-xl p-4">
                                <h2 className="font-semibold mb-3">Return Requests</h2>

                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th>Order</th>
                                            <th>Status</th>
                                            <th>Reason</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returns.map((o) => (
                                            <tr key={o._id} className="border-t relative">
                                                {/* ORDER */}
                                                <td className="font-medium">{o.orderId}</td>

                                                {/* STATUS */}
                                                <td>
                                                    <span
                                                        className={`inline-block px-2 py-1 text-xs rounded ${o.return.status === "requested"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : o.return.status === "approved"
                                                                ? "bg-blue-100 text-blue-800"
                                                                : o.return.status === "rejected"
                                                                    ? "bg-red-100 text-red-800"
                                                                    : "bg-gray-100 text-gray-600"
                                                            }`}
                                                    >
                                                        {o.return.status.toUpperCase()}
                                                    </span>
                                                </td>

                                                {/* REASON */}
                                                <td className="max-w-xs truncate">{o.return.reason || "—"}</td>

                                                {/* ACTIONS */}
                                                <td className="relative">
                                                    {/* ⋮ BUTTON */}
                                                    <button
                                                        onClick={() =>
                                                            setOpenMenuId(openMenuId === o._id ? null : o._id)
                                                        }
                                                        className="px-2 py-1 rounded hover:bg-gray-100 text-lg"
                                                    >
                                                        ⋮
                                                    </button>

                                                    {/* DROPDOWN */}
                                                    {openMenuId === o._id && (
                                                        <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-50">
                                                            <button
                                                                onClick={() => {
                                                                    fetchOrderDetails(o.orderId);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                                            >
                                                                View Order
                                                            </button>

                                                            {o.return.status === "requested" && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            approveReturn(o.orderId);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-green-700"
                                                                    >
                                                                        Approve Return
                                                                    </button>

                                                                    <button
                                                                        onClick={() => {
                                                                            rejectReturn(o.orderId);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
                                                                    >
                                                                        Reject Return
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>

                                </table>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {showOrderDetails && (
                <div className="fixed inset-0  bg-black/40 z-[60] flex items-center justify-center">
                    <div className="w-full max-w-3xl bg-[var(--background-card)] rounded-xl shadow-xl overflow-hidden">

                        {/* Header */}
                        <div className="p-4 border-b flex justify-between items-center">
                            <div className="font-semibold text-lg">
                                Order Details
                            </div>
                            <button
                                onClick={() => setShowOrderDetails(false)}
                                className="px-3 py-1 border rounded text-sm hover:bg-red-600"
                            >
                                Close
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4 text-sm ">

                            {loadingOrder && (
                                <div className="text-center py-10 text-gray-500">
                                    Loading order details...
                                </div>
                            )}

                            {!loadingOrder && selectedOrder && (
                                <>
                                    {/* BASIC INFO */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><b>Status:</b> {selectedOrder.status}</div>
                                        <div><b>Total:</b> ${selectedOrder.amount}</div>
                                        <div><b>Created:</b> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                                        <div><b>Payment:</b> {selectedOrder.paymentMethod || selectedOrder.paymentStatus || "—"}</div>

                                    </div>
                                    {selectedOrder.return && (
                                        <div className="border rounded p-4 bg-[var(--background-card)] px-4 py-2 dark:bg-[var(--bgCard)]">
                                            <div className="font-medium mb-2 ">Return Request</div>

                                            <div className="text-sm space-y-1 ">
                                                <div>
                                                    <b>Status:</b>{" "}
                                                    {selectedOrder.return.status.toUpperCase()}
                                                </div>

                                                <div>
                                                    <b>Reason:</b>{" "}
                                                    {selectedOrder.return.reason}
                                                </div>

                                                {selectedOrder.return.rejectionReason && (
                                                    <div className="text-red-600">
                                                        <b>Rejected Reason:</b>{" "}
                                                        {selectedOrder.return.rejectionReason}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ADMIN ACTIONS */}
                                            {selectedOrder.return.status === "requested" && (
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => approveReturn(selectedOrder.orderId)}
                                                        className="px-3 py-1 rounded bg-green-600 text-white text-sm"
                                                    >
                                                        Accept
                                                    </button>

                                                    <button
                                                        onClick={() => rejectReturn(selectedOrder.orderId)}
                                                        className="px-3 py-1 rounded bg-red-600 text-white text-sm"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}


                                    {/* ITEMS */}
                                    <div className="border rounded">
                                        <div className="p-2 font-bold bg-[var(--background-card)] dark:bg-[var(--bgCard)] border-b text-m">Items</div>
                                        <table className="w-full text-sm">
                                            <thead className="border-b">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Product</th>
                                                    <th className="px-3 py-2 text-left">Qty</th>
                                                    <th className="px-3 py-2 text-left">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedOrder.items || []).map((it: any, i: number) => {
                                                    const imageUrl =
                                                        it.image ||
                                                        it.productImage ||
                                                        it.thumbnail ||
                                                        (it.product?.images && it.product.images[0]) ||
                                                        null;

                                                    return (
                                                        <tr key={i} className="border-t">
                                                            {/* PRODUCT */}
                                                            <td className="px-3 py-2 flex items-center gap-3">
                                                                {imageUrl ? (
                                                                    <img
                                                                        src={imageUrl}
                                                                        alt={it.name}
                                                                        className="w-40 h-40 object-cover  border"
                                                                    />
                                                                ) : (
                                                                    <div className="w-60 h-60 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">
                                                                        No Img
                                                                    </div>
                                                                )}

                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{it.name}</span>
                                                                    {it.size && (
                                                                        <span className="text-xs text-gray-400">Size: {it.size}</span>
                                                                    )}
                                                                    {it.color && (
                                                                        <span className="text-xs text-gray-400">Color: {it.color}</span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* QTY */}
                                                            <td className="px-3 py-2">
                                                                {it.qty ?? it.quantity ?? 1}
                                                            </td>

                                                            {/* PRICE */}
                                                            <td className="px-3 py-2">
                                                                $ {it.price}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>

                                        </table>
                                    </div>

                                    {/* TRACKING */}
                                    <div className="border rounded p-4">
                                        <div className="font-medium mb-2">Tracking Status</div>

                                        {selectedOrder.tracking ? (
                                            <div className="space-y-1">
                                                <div><b>Courier:</b> {selectedOrder.tracking.courier}</div>
                                                <div><b>Tracking ID:</b> {selectedOrder.tracking.trackingId}</div>
                                                <div><b>Current Status:</b> {selectedOrder.tracking.status}</div>
                                                <div><b>Last Update:</b> {new Date(selectedOrder.tracking.updatedAt).toLocaleString()}</div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-500">No tracking available.</div>
                                        )}
                                    </div>
                                </>
                            )}

                        </div>
                    </div>
                </div>
            )}
            {activeTab === "messages" && (
                <div className="border rounded-xl p-4 space-y-3">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Mail size={18} /> Contact Messages
                    </h2>

                    {loadingMessages ? (
                        <div className="text-sm text-gray-500">Loading messages...</div>
                    ) : contactMessages.length === 0 ? (
                        <div className="text-sm text-gray-500">
                            No contact messages from this customer.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border rounded-lg">
                                <thead className="bg-[var(--background-card)] border-b">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Name</th>
                                        <th className="px-3 py-2 text-left">Email</th>

                                        <th className="px-3 py-2 text-left">Message</th>
                                        <th className="px-3 py-2 text-left">Status</th>
                                        <th className="px-3 py-2 text-left">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contactMessages.map((m) => (
                                        <tr key={m._id} className="border-t">
                                            <td className="px-3 py-2 font-medium">
                                                {m.name}
                                            </td>

                                            {/* EMAIL */}
                                            <td className="px-3 py-2 text-gray-600">
                                                {m.email}
                                            </td>

                                            <td className="px-3 py-2 max-w-md">
                                                <div className="whitespace-pre-wrap">
                                                    {m.message}
                                                </div>
                                            </td>

                                            <td className="px-3 py-2">
                                                {m.status === "new" ? (
                                                    <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                                                        NEW
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                                                        {m.status.toUpperCase()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {new Date(m.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
