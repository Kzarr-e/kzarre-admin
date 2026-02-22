// Part 1/3
"use client";
import { usePathname } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Upload,
  Image as ImageIcon,
  Save,
  FileText,
  Package,
  ShoppingCart,
  TrendingUp,
  RotateCcw,
  Filter,
  Download,
  MoreVertical,
  AlertCircle,
  Check,
  ChevronDown,
  Tag,
  DollarSign,
  Percent,
  Box,
  Barcode as BarcodeIcon,
  Grid,
  List,
} from "lucide-react";

import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

// -------------------- Types --------------------
interface Variant {
  _id?: string;
  id: number | string;
  size?: string;
  color?: string;
  material?: string;
  price?: number;
  stock?: number;
  lowStockAlert?: number;
  barcode?: string;
}

interface Product {
  _id?: string;
  id?: string | number;
  name?: string;
  description?: string;
  sku?: string;
  stock?: number;
  stockQuantity?: number;
  threshold?: number;
  price?: string | number;
  purchase?: string | number;
  valuation?: string | number;
  vendor?: string;
  category?: string;
  tags?: string[];
  gender?: string[];
  variants?: Variant[];
  gallery?: string[];
  inStock?: boolean;

  // extra fields
  highlights?: string;
  materialDetails?: string;
  careInstructions?: string;
  notes?: string;
  terms?: string;
  specifications?: {
    material?: string;
    fit?: string;
    washCare?: string;
    pattern?: string;
    origin?: string;
    brand?: string;
    others?: string;
  };
  faq?: Array<{ question?: string; answer?: string }>;
  customerPhotos?: string[]; // URLs
}

interface Order {
  _id: string; // ✅ MongoDB ID
  orderId?: string; // ✅ Optional human-readable ID (if exists)
  amount?: number;
  status?: string;
  createdAt?: string;
  items?: any[];
  address?: {
    name?: string;
    phone?: string;
    pincode?: string;
    city?: string;
    state?: string;
    line1?: string;
  };
}

interface Discount {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  applicableProducts?: string[]; // Product IDs
  applicableCategories?: string[]; // Category names
  applicableUsers?: string[]; // User IDs
  usageLimit?: number;
  usedCount?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Coupon {
  _id?: string;
  id: string;
  code: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  applicableProducts?: string[]; // Product IDs
  applicableCategories?: string[]; // Category names
  applicableUsers?: string[]; // User IDs
  usageLimit?: number;
  usageLimitPerUser?: number;
  usedCount?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const getStockBadgeColor = (statusText: string) => {
  switch (statusText) {
    case "Critical":
      return "bg-red-500 badge-text-white";
    case "Low Stock":
      return "bg-yellow-500 badge-text-white";
    case "In Stock":
      return "bg-[var(--accent-green)] badge-text-white";
    default:
      return "bg-gray-500 badge-text-white";
  }
};

// -------------------- Component --------------------
const ECommerceSection: React.FC = () => {
  // Navigation states
  const [currentView, setCurrentView] = useState<
    "inventory" | "addProduct" | "orders" | "discounts"
  >("inventory");
  const [activeTab, setActiveTab] = useState("product");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setImagePreviews((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);

      // Fix selected image index
      if (selectedImage === oldIndex) {
        setSelectedImage(newIndex);
      } else if (
        selectedImage > oldIndex &&
        selectedImage <= newIndex
      ) {
        setSelectedImage(selectedImage - 1);
      } else if (
        selectedImage < oldIndex &&
        selectedImage >= newIndex
      ) {
        setSelectedImage(selectedImage + 1);
      }

      return newItems;
    });
  };


  // Product management states
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();

  // Sync tab with URL on refresh
  useEffect(() => {
    if (pathname?.includes("/ecom/inventory") || pathname?.endsWith("/ecom")) {
      setActiveTab("inventory");
      setCurrentView("inventory");
    } else if (pathname?.includes("/ecom/orders")) {
      setActiveTab("order");
      setCurrentView("orders");
    } else if (pathname?.includes("/ecom/discounts")) {
      setActiveTab("discounts");
    }
  }, [pathname]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/products`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Products fetch failed: ${res.status} ${txt}`);
      }

      const data = await res.json();
      // Normalize possible structures
      const productsArray: Product[] = Array.isArray(data.products)
        ? data.products
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

      setProducts(productsArray);
    } catch (err: any) {
      console.error("❌ Error fetching products:", err);
      setError(err.message || "Failed to fetch products.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const [orderDetailsModal, setOrderDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [modalOrder, setModalOrder] = useState<OrderDetailsModel | null>(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState("pending");

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);


  const updateStatus = async (status: string) => {
    if (!statusOrderId) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/orders/${statusOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        toast.error(`Failed: ${data.message}`);
        return;
      }

      // 🔥 Update UI instantly
      setOrders((prev: any[]) =>
        prev.map((o) => (o._id === statusOrderId ? { ...o, status } : o))
      );

      toast.success("Status updated successfully!");

      setShowStatusModal(false);
    } catch (error) {
      console.error("UPDATE STATUS ERROR:", error);
      toast.error("Something went wrong");
    }
  };

  // Fetch orders (production)
  const [orders, setOrders] = useState<Order[]>([]);
  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/orders`
      );
      if (!res.ok) {
        const txt = await res.text();
        console.warn("Orders fetch failed:", res.status, txt);
        setOrders([]);
        return;
      }
      const data = await res.json();
      const ordersArray: Order[] = Array.isArray(data.orders)
        ? data.orders
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
      setOrders(ordersArray);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    }
  };

  // Fetch discounts and coupons
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const fetchDiscounts = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/discounts`
      );
      if (!res.ok) {
        console.warn("Discounts fetch failed:", res.status, "- Using mock data");
        // Mock data for demonstration
        setDiscounts([
          {
            _id: "1",
            id: "SUMMER2024",
            name: "Summer Sale Discount",
            description: "20% off on summer collection",
            type: "percentage",
            value: 20,
            minOrderAmount: 50,
            maxDiscountAmount: 100,
            usageLimit: 1000,
            usedCount: 45,
            startDate: "2024-06-01T00:00",
            endDate: "2024-08-31T23:59",
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          {
            _id: "2",
            id: "WELCOME",
            name: "Welcome Discount",
            description: "15% off for new customers",
            type: "percentage",
            value: 15,
            minOrderAmount: 25,
            usageLimit: 500,
            usedCount: 123,
            isActive: true,
            createdAt: new Date().toISOString(),
          }
        ]);
        return;
      }
      const data = await res.json();
      const discountsArray: Discount[] = Array.isArray(data.discounts)
        ? data.discounts
        : Array.isArray(data)
          ? data
          : [];
      setDiscounts(discountsArray);
    } catch (err) {
      console.error("Error fetching discounts:", err, "- Using mock data");
      // Mock data for demonstration
      setDiscounts([
        {
          _id: "1",
          id: "SUMMER2024",
          name: "Summer Sale Discount",
          description: "20% off on summer collection",
          type: "percentage",
          value: 20,
          minOrderAmount: 50,
          maxDiscountAmount: 100,
          usageLimit: 1000,
          usedCount: 45,
          startDate: "2024-06-01T00:00",
          endDate: "2024-08-31T23:59",
          isActive: true,
          createdAt: new Date().toISOString(),
        }
      ]);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/coupons`
      );
      if (!res.ok) {
        console.warn("Coupons fetch failed:", res.status, "- Using mock data");
        // Mock data for demonstration
        setCoupons([
          {
            _id: "1",
            id: "SAVE20",
            code: "SAVE20",
            name: "Save 20 Dollars",
            description: "$20 off orders over $100",
            type: "fixed",
            value: 20,
            minOrderAmount: 100,
            usageLimit: 500,
            usageLimitPerUser: 1,
            usedCount: 67,
            startDate: "2024-01-01T00:00",
            endDate: "2024-12-31T23:59",
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          {
            _id: "2",
            id: "FLASH50",
            code: "FLASH50",
            name: "Flash Sale",
            description: "50% off flash sale",
            type: "percentage",
            value: 50,
            minOrderAmount: 0,
            maxDiscountAmount: 200,
            usageLimit: 100,
            usageLimitPerUser: 1,
            usedCount: 23,
            startDate: "2024-07-15T00:00",
            endDate: "2024-07-15T23:59",
            isActive: true,
            createdAt: new Date().toISOString(),
          }
        ]);
        return;
      }
      const data = await res.json();
      const couponsArray: Coupon[] = Array.isArray(data.coupons)
        ? data.coupons
        : Array.isArray(data)
          ? data
          : [];
      setCoupons(couponsArray);
    } catch (err) {
      console.error("Error fetching coupons:", err, "- Using mock data");
      // Mock data for demonstration
      setCoupons([
        {
          _id: "1",
          id: "SAVE20",
          code: "SAVE20",
          name: "Save 20 Dollars",
          description: "$20 off orders over $100",
          type: "fixed",
          value: 20,
          minOrderAmount: 100,
          usageLimit: 500,
          usageLimitPerUser: 1,
          usedCount: 67,
          isActive: true,
          createdAt: new Date().toISOString(),
        }
      ]);
    }
  };

  // Fetch once when component mounts
useEffect(() => {
  fetchProducts();
  fetchOrders();
  fetchDiscounts();
  fetchCoupons();

  const interval = setInterval(() => {
    if (currentView === "inventory") fetchProducts();
    if (currentView === "orders") fetchOrders();
    if (currentView === "discounts") {
      fetchDiscounts();
      fetchCoupons();
    }
  }, 30000);

  return () => clearInterval(interval);
}, [currentView]);

  // Selected product modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Edit Product
  const [variants, setVariants] = useState<Variant[]>([]);

  // Discount/Coupon Management States
  const [currentDiscountView, setCurrentDiscountView] = useState<"discounts" | "coupons" | "addDiscount" | "addCoupon" | "editDiscount" | "editCoupon">("discounts");
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);

  // Discount Form State
  const [discountForm, setDiscountForm] = useState<Partial<Discount>>({
    name: "",
    description: "",
    type: "percentage",
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    applicableProducts: [],
    applicableCategories: [],
    applicableUsers: [],
    usageLimit: 0,
    startDate: "",
    endDate: "",
    isActive: true,
  });

  // Coupon Form State
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({
    code: "",
    name: "",
    description: "",
    type: "percentage",
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    applicableProducts: [],
    applicableCategories: [],
    applicableUsers: [],
    usageLimit: 0,
    usageLimitPerUser: 1,
    startDate: "",
    endDate: "",
    isActive: true,
  });

  // DELETE
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    const prev = products;
    setProducts((p) => p.filter((x) => (x._id ?? x.id) !== id));

    try {
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("access_token") || ""
          : "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/products/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Delete failed with ${res.status}`);
      }

      toast.success("Product deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Something went wrong");
      setProducts(prev);
    }
  };

  // ================= DISCOUNT API FUNCTIONS =================

  const handleCreateDiscount = async () => {
    try {
      const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") || "" : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/discounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(discountForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Create failed with ${res.status}`);
      }

     toast.success("Discount created successfully!");
      setCurrentDiscountView("discounts");
      setDiscountForm({
        name: "",
        description: "",
        type: "percentage",
        value: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        applicableProducts: [],
        applicableCategories: [],
        applicableUsers: [],
        usageLimit: 0,
        startDate: "",
        endDate: "",
        isActive: true,
      });
      await fetchDiscounts();
    } catch (err) {
      console.error("Create discount error:", err);
      // For demo purposes, simulate success since backend doesn't exist
      toast.success("✅ Demo: Discount created successfully! (Backend API not implemented yet)");
      setCurrentDiscountView("discounts");
      setDiscountForm({
        name: "",
        description: "",
        type: "percentage",
        value: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        applicableProducts: [],
        applicableCategories: [],
        applicableUsers: [],
        usageLimit: 0,
        startDate: "",
        endDate: "",
        isActive: true,
      });
      await fetchDiscounts();
    }
  };

  const handleUpdateDiscount = async (id: string) => {
    try {
      const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") || "" : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/discounts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(discountForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Update failed with ${res.status}`);
      }

      toast.success("Discount updated successfully!");
      setCurrentDiscountView("discounts");
      setSelectedDiscount(null);
      await fetchDiscounts();
    } catch (err) {
      console.error("Update discount error:", err);
      toast.error("Something went wrong");
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this discount?")) return;

    try {
      const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") || "" : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/discounts/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Delete failed with ${res.status}`);
      }

      toast.success("Discount deleted successfully!");
      await fetchDiscounts();
    } catch (err) {
      console.error("Delete discount error:", err);
     toast.error("Something went wrong");
    }
  };

  // ================= COUPON API FUNCTIONS =================

  const handleCreateCoupon = async () => {
    try {
      const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") || "" : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/coupons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(couponForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Create failed with ${res.status}`);
      }

      toast.success("Coupon created successfully!");
      setCurrentDiscountView("coupons");
      setCouponForm({
        code: "",
        name: "",
        description: "",
        type: "percentage",
        value: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        applicableProducts: [],
        applicableCategories: [],
        applicableUsers: [],
        usageLimit: 0,
        usageLimitPerUser: 1,
        startDate: "",
        endDate: "",
        isActive: true,
      });
      await fetchCoupons();
    } catch (err) {
      console.error("Create coupon error:", err);
      // For demo purposes, simulate success since backend doesn't exist
      toast.success("✅ Demo: Coupon created successfully! (Backend API not implemented yet)");
      setCurrentDiscountView("coupons");
      setCouponForm({
        code: "",
        name: "",
        description: "",
        type: "percentage",
        value: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        applicableProducts: [],
        applicableCategories: [],
        applicableUsers: [],
        usageLimit: 0,
        usageLimitPerUser: 1,
        startDate: "",
        endDate: "",
        isActive: true,
      });
      await fetchCoupons();
    }
  };

  const handleUpdateCoupon = async (id: string) => {
    try {
      const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") || "" : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/coupons/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(couponForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Update failed with ${res.status}`);
      }

      toast.success("Coupon updated successfully!");
      setCurrentDiscountView("coupons");
      setSelectedCoupon(null);
      await fetchCoupons();
    } catch (err) {
      console.error("Update coupon error:", err);
      toast.error("Something went wrong");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const token = typeof window !== "undefined" ? sessionStorage.getItem("access_token") || "" : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/coupons/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Delete failed with ${res.status}`);
      }

      toast.success("Coupon deleted successfully!");
      await fetchCoupons();
    } catch (err) {
      console.error("Delete coupon error:", err);
      toast.error("Something went wrong");
    }
  };

  // Stats
  const stats = {
    totalProducts: products.length,

    totalStock: products.reduce(
      (sum, p) => sum + (Number(p.stockQuantity ?? p.stock ?? 0) || 0),
      0
    ),

    sold: orders.reduce((sum, order) => {
      if (order.status !== "paid" && order.status !== "delivered") return sum;

      return (
        sum +
        (order.items?.reduce(
          (itemSum, item) => itemSum + (Number(item.qty) || 0),
          0
        ) || 0)
      );
    }, 0),


    returns: orders.filter((o) => o.status === "cancelled").length,
  };


  // -------------------- Product Form (extended) --------------------
  type ProductForm = {
    name: string;
    description: string;
    gender: string[]; // we will also keep category single-select
    basePrice: string;
    sellPrice: string;
    discount: string;
    discountType: "percentage" | "fixed" | string;
    category: string; // single-select
    vendor: string;
    tags: string[];
    primaryTag: string;
    secondaryTag: string;
    sku: string;
    barcode: string;

    // extras
    highlights: string;
    materialDetails: string;
    careInstructions: string;
    notes: string;
    terms: string;
    specifications: {
      material: string;
      fit: string;
      washCare: string;
      pattern: string;
      origin: string;
      brand: string;
      others: string;
    };
    faq: Array<{ question: string; answer: string }>;
  };

  const [productForm, setProductForm] = useState<ProductForm>({
    name: "",
    description: "",
    gender: [],
    basePrice: "",
    sellPrice: "",
    discount: "",
    discountType: "percentage",
    category: "",
    vendor: "",
    tags: [],
    primaryTag: "",
    secondaryTag: "",
    sku: "",
    barcode: "",

    highlights: "",
    materialDetails: "",
    careInstructions: "",
    notes: "",
    terms: "",
    specifications: {
      material: "",
      fit: "",
      washCare: "",
      pattern: "",
      origin: "",
      brand: "",
      others: "",
    },
    faq: [],
  });

  // upload / image states
  const [newVariant, setNewVariant] = useState<Partial<Variant>>({
    size: "",
    color: "",
    material: "",
    lowStockAlert: undefined,
    stock: undefined,
    barcode: "",
  });
  const [showAddVariant, setShowAddVariant] = useState(false);

  // Option 1 states (stable upload model)
  // existingImages: URLs already on S3 (strings). These are shown for edit.
  // newImages: File[] that will be uploaded when saving.
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  // previews for both (combined)
  const [imagePreviews, setImagePreviews] = useState<
    { id: number; url: string | ArrayBuffer | null; name: string }[]
  >([]);

  const [existingCustomerPhotos, setExistingCustomerPhotos] = useState<
    string[]
  >([]); // URLs
  const [newCustomerPhotoFiles, setNewCustomerPhotoFiles] = useState<File[]>(
    []
  );
  const [customerPhotosPreview, setCustomerPhotosPreview] = useState<
    { id: number; url: string | ArrayBuffer | null; name: string }[]
  >([]);

  const [selectedImage, setSelectedImage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // percent 0-100

  // -------------------- file handlers --------------------
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleNewImageFiles(Array.from(files));
    }
  };

  // Helper: push previews for files
  const addPreviewsForFiles = (files: File[]) => {
    const previews: {
      id: number;
      url: string | ArrayBuffer | null;
      name: string;
    }[] = [];
    let processed = 0;
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        processed++;
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push({
          id: Date.now() + Math.random(),
          url: e.target?.result || "",
          name: file.name,
        });
        processed++;
        if (processed === files.length) {
          setImagePreviews((prev) => [...prev, ...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
    // if none are image files, nothing will be pushed
  };

  // Called on file input change for product images
  const handleNewImageFiles = (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    setNewImages((prev) => [...prev, ...imgs]);
    addPreviewsForFiles(imgs);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleNewImageFiles(Array.from(files));
    }
  };

  // remove existing image (by URL)
  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
    // also remove preview entries that match url
    setImagePreviews((prev) => prev.filter((p) => p.url !== url));
  };

  // remove new image file (by name) - will remove preview by name too
  const removeNewImage = (name: string) => {
    setNewImages((prev) => prev.filter((f) => f.name !== name));
    setImagePreviews((prev) => prev.filter((p) => p.name !== name));
  };

  // new: customer photos file select
  const handleCustomerPhotosSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    // add to newCustomerPhotoFiles
    setNewCustomerPhotoFiles((prev) => [...prev, ...arr]);

    // add previews
    const previews: {
      id: number;
      url: string | ArrayBuffer | null;
      name: string;
    }[] = [];
    let processed = 0;
    arr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previews.push({
          id: Date.now() + Math.random(),
          url: ev.target?.result || "",
          name: file.name,
        });
        processed++;
        if (processed === arr.length) {
          setCustomerPhotosPreview((prev) => [...prev, ...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingCustomerPhoto = (url: string) => {
    setExistingCustomerPhotos((prev) => prev.filter((u) => u !== url));
    setCustomerPhotosPreview((prev) => prev.filter((p) => p.url !== url));
  };

  const removeNewCustomerPhotoFile = (name: string) => {
    setNewCustomerPhotoFiles((prev) => prev.filter((f) => f.name !== name));
    setCustomerPhotosPreview((prev) => prev.filter((p) => p.name !== name));
  };

  // -------------------- form handlers --------------------
  const handleProductInputChange = (field: string, value: any) => {
    setProductForm((prev) => ({
      ...prev,
      // @ts-ignore dynamic
      [field]: value,
    }));
  };

  const handleGenderChange = (gender: string) => {
    setProductForm((prev) => ({
      ...prev,
      gender: prev.gender.includes(gender)
        ? prev.gender.filter((g) => g !== gender)
        : [...prev.gender, gender],
    }));
  };

  const handleAddVariant = () => {
    if (newVariant.size) {
      const variant: Variant = {
        id: Date.now(),
        size: newVariant.size,
        color: newVariant.color,
        material: newVariant.material,
        price: Number(productForm.sellPrice) || 0,
        stock: Number(newVariant.stock) || 0,
        barcode: newVariant.barcode,
      };
      setVariants((prev) => [...prev, variant]);
      setNewVariant({
        size: "",
        color: "",
        material: "",
        lowStockAlert: undefined,
        stock: undefined,
        barcode: "",
      });
      setShowAddVariant(false);
    }
  };

  const removeVariant = (id: number | string) =>
    setVariants((prev) => prev.filter((v) => v.id !== id));

  const generateSKU = () => {
    const sku = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 11)}`.toUpperCase();
    handleProductInputChange("sku", sku);
  };

  const generateBarcode = () =>
    Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");


  const handleEditProduct = (product: Product) => {
    setProductForm((prev) => ({
      ...prev,
      name: product.name || "",
      description: product.description || "",
      tags: product.tags || [],
      gender: product.gender || [],
      sku: product.sku || prev.sku,
      vendor: product.vendor || prev.vendor,
      category: product.category || prev.category,
      sellPrice: String(product.price ?? prev.sellPrice),
      basePrice: String(product.purchase ?? prev.basePrice),

      // extras
      highlights: product.highlights || "",
      materialDetails: product.materialDetails || "",
      careInstructions: product.careInstructions || "",
      notes: product.notes || "",
      terms: product.terms || "",
      specifications: {
        material: product.specifications?.material || "",
        fit: product.specifications?.fit || "",
        washCare: product.specifications?.washCare || "",
        pattern: product.specifications?.pattern || "",
        origin: product.specifications?.origin || "",
        brand: product.specifications?.brand || "",
        others: product.specifications?.others || "",
      },
      faq: product.faq?.length
        ? product.faq.map((f) => ({
          question: f.question || "",
          answer: f.answer || "",
        }))
        : [],
    }));

    setVariants(product.variants || []);
    setExistingImages(product.gallery || []);
    setImagePreviews(
      (product.gallery || []).map((g) => ({
        id: Date.now() + Math.random(),
        url: g,
        name: g.split("/").slice(-1)[0] || g,
      }))
    );

    setExistingCustomerPhotos(product.customerPhotos || []);
    setCustomerPhotosPreview(
      (product.customerPhotos || []).map((g) => ({
        id: Date.now() + Math.random(),
        url: g,
        name: g.split("/").slice(-1)[0] || g,
      }))
    );

    setEditingProductId(String(product._id)); // ✅ THIS FIXES UPDATE VS CREATE
    setCurrentView("addProduct");
  };



  // Part 2/3 (continued)
  // -------------------- Save product (uploads to backend) --------------------
  const handleSaveProduct = async () => {
    try {
      if (!productForm.name || !productForm.category) {
        toast.error("Please fill in product name and category.");
        return;
      }

      // if creating new product and no existingImages and no newImages -> require at least one image
      if (existingImages.length === 0 && newImages.length === 0) {
        toast.error(
          'Please upload at least one valid image using "Browse Files" or drag and drop.'
        );
        return;
      }


      const formData = new FormData();
      formData.append("name", productForm.name);
      formData.append("description", productForm.description);
      formData.append("price", productForm.sellPrice);
      formData.append("category", productForm.category); // single select
      formData.append("vendor", productForm.vendor);
      formData.append("tags", JSON.stringify(productForm.tags || []));
      // keep old gender array for compat, but "category" is the main single-select.
      formData.append("gender", JSON.stringify(productForm.gender || []));
      formData.append("variants", JSON.stringify(variants || []));

      // extra fields
      formData.append("highlights", productForm.highlights || "");
      formData.append("materialDetails", productForm.materialDetails || "");
      formData.append("careInstructions", productForm.careInstructions || "");
      formData.append("notes", productForm.notes || "");
      formData.append("terms", productForm.terms || "");
      formData.append(
        "specifications",
        JSON.stringify(productForm.specifications || {})
      );
      formData.append("faq", JSON.stringify(productForm.faq || []));

      // IMPORTANT: include existing image URLs so backend can keep them (no reupload)
      // Extract ordered URLs from imagePreviews
      const orderedGallery: string[] = imagePreviews
        .map((p) => (typeof p.url === "string" ? p.url : null))
        .filter((url): url is string => typeof url === "string");

      orderedGallery.forEach((url) => {
        formData.append("existingGallery[]", url);
      });




      formData.append(
        "existingCustomerPhotos",
        JSON.stringify(existingCustomerPhotos || [])
      );

      // append new product images (files)
      newImages.forEach((file) => {
        if (file instanceof File) formData.append("images", file);
      });

      // append new customer photos (files)
      newCustomerPhotoFiles.forEach((file) => {
        if (file instanceof File) formData.append("customerPhotos", file);
      });

      // If editing an existing product we should send product id; your UI currently doesn't track "editing id" separately.
      // We'll infer: if productForm.sku matches an existing product's SKU OR if selectedProduct exists, send selectedProduct._id
      if (editingProductId) {
        formData.append("productId", editingProductId); // ✅ ALWAYS RELIABLE
      }


      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("access_token") || ""
          : "";

      setUploading(true);
      setUploadProgress(0);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/products/upload`;
        xhr.open("POST", apiUrl, true);

        xhr.withCredentials = true;

        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = async () => {
          setUploading(false);
          setUploadProgress(100);

          if (xhr.status === 201 || xhr.status === 200) {
            try {
              const resp = JSON.parse(xhr.responseText);
              if (resp && resp.product) {
                // if product returned, update list (replace if same id)
                setProducts((prev) => {
                  const idx = prev.findIndex(
                    (p) => (p._id ?? p.id) === resp.product._id
                  );
                  if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = resp.product;
                    return copy;
                  }
                  return [resp.product, ...prev];
                });
              } else if (resp && resp.products) {
                setProducts(resp.products);
              } else {
                // fallback: push a synthetic product
                const newProduct: Product = {
                  id: Date.now(),
                  name: productForm.name,
                  stockQuantity: variants.reduce(
                    (sum, v) => sum + (Number(v.stock) || 0),
                    0
                  ),
                  threshold: 20,
                  purchase: `$${productForm.basePrice}`,
                  price: `$${productForm.sellPrice}`,
                  valuation: `${variants.reduce(
                    (sum, v) => sum + (Number(v.stock) || 0),
                    0
                  ) * (Number(productForm.sellPrice) || 0)
                    }`,
                  vendor: productForm.vendor || "Unknown",
                  category: productForm.category,
                  sku: productForm.sku,
                  variants,
                  gallery: existingImages,
                  customerPhotos: existingCustomerPhotos,
                };
                setProducts((prev) => [newProduct, ...prev]);
              }

              // await fetchProducts();

              // reset form
              setProductForm({
                name: "",
                description: "",
                gender: [],
                basePrice: "",
                sellPrice: "",
                discount: "",
                discountType: "percentage",
                category: "",
                vendor: "",
                tags: [],
                primaryTag: "",
                secondaryTag: "",
                sku: "",
                barcode: "",

                highlights: "",
                materialDetails: "",
                careInstructions: "",
                notes: "",
                terms: "",
                specifications: {
                  material: "",
                  fit: "",
                  washCare: "",
                  pattern: "",
                  origin: "",
                  brand: "",
                  others: "",
                },
                faq: [],
              });

              setVariants([]);
              setExistingImages([]);
              setNewImages([]);
              setImagePreviews([]);
              setSelectedImage(0);
              setExistingCustomerPhotos([]);
              setNewCustomerPhotoFiles([]);
              setCustomerPhotosPreview([]);
              setSelectedProduct(null);

              setCurrentView("inventory");
              resolve();
            } catch (err) {
              console.error("Error parsing upload response:", err);
              reject(err);
            }
          } else {
            console.error("❌ Upload failed:", xhr.status, xhr.responseText);
            toast.error(`Upload failed (${xhr.status}) — ${xhr.statusText}`);
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => {
          setUploading(false);
          console.error("Network error during upload");
         toast.error("Network error during upload");
          reject(new Error("Network error"));
        };

        xhr.send(formData);
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("An unexpected error occurred while uploading the product.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock <= 5)
      return { text: "Critical", color: "text-red-600 bg-red-50" };
    if (stock <= threshold)
      return { text: "Low Stock", color: "text-yellow-600 bg-yellow-50" };
    return { text: "In Stock", color: "text-green-600 bg-[var(--accent-green)]" };
  };

  // -------------------- TABS (vertical sidebar) UI state --------------------
  const [detailsTab, setDetailsTab] = useState<
    "details" | "specs" | "faq" | "customer" | "notes" | "terms"
  >("details");

  // ------------------ helper small UI functions ------------------
  const isPreviewFromExisting = (preview: {
    id: number;
    url: any;
    name: string;
  }) => {
    // we identify existing previews by url being a string that matches an existingImages entry
    return (
      typeof preview.url === "string" &&
      existingImages.includes(preview.url as string)
    );
  };

  const isPreviewFromNewFile = (preview: {
    id: number;
    url: any;
    name: string;
  }) => {
    return newImages.some((f) => f.name === preview.name);
  };
  // Part 3/3 (continued)
  // ------------- Render Inventory -------------
  const renderInventory = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl p-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--textSecondary)] text-sm">
              Total Products
            </span>
            <Package className="text-gray-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-[var(--textPrimary)]">
            {stats.totalProducts}
          </div>
        </div>

        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl p-6 border ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--textSecondary)] text-sm">
              Total Stock
            </span>
            <Box className="text-gray-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-[var(--textPrimary)]">
            {stats.totalStock}
          </div>
        </div>

        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl p-6 border ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--textSecondary)] text-sm">Sold</span>
            <ShoppingCart className="text-gray-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-[var(--textPrimary)]">
            {stats.sold}
          </div>
        </div>

        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl p-6 border ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--textSecondary)] text-sm">Return</span>
            <RotateCcw className="text-gray-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-[var(--textPrimary)]">
            {stats.returns}
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border ">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--textPrimary)]">
              Product List
            </h2>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Filter size={20} className="text-[var(--textSecondary)]" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Download size={20} className="text-[var(--textSecondary)]" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b  bg-[var(--background)] dark:bg-[var(--bgCard)]">
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                  {" "}
                  Product
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                  {" "}
                  Stock
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                  {" "}
                  Threshold
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                  {" "}
                  Purchase
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                  {" "}
                  Price
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                  {" "}
                  Valuation
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                  {" "}
                  Supplier
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                  {" "}
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    <RotateCcw
                      className="inline-block animate-spin mr-2"
                      size={18}
                    />{" "}
                    Loading products...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-6 text-red-600 bg-red-50 border-y"
                  >
                    ⚠️ {error}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-6 text-gray-500 bg-[var(--background)] dark:bg-[var(--bgCard)]"
                  >
                    No products found. Try adding one.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const status = getStockStatus(
                    product.stockQuantity ?? product.variants?.[0]?.stock ?? 0,
                    product.threshold || 20
                  );
                  return (
                    <tr
                      key={product._id ?? product.id}
                      className="border-b  hover:bg-[var(--background)] dark:bg-[var(--bgCard)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-[var(--textPrimary)]">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            SKU: {product.sku || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--textPrimary)]">
                            {product.stockQuantity ?? 0}
                          </span>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStockBadgeColor(
                              status.text
                            )}`}
                          >
                            {status.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                        {product.threshold || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                        ${product.purchase || "0.00"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--textPrimary)]">
                        ${product.price || "0.00"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                        ${product.valuation || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                        {product.vendor || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowProductModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-[var(--accent-green)] text-green-600"
                            title="View Details"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                            title="Edit Product"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteProduct(
                                String(product._id ?? product.id)
                              )
                            }
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                            title="Delete Product"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Product Details Modal */}
        {showProductModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div
              className={`dark: bg-[var(--background)] border  rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative overflow-y-auto max-h-[92vh] transition-all duration-300`}
            >
              <button
                onClick={() => setShowProductModal(false)}
                className="absolute top-3 right-3 text-[var(--textSecondary)] hover:text-[var(--textPrimary)] transition"
              >
                <X size={24} />
              </button>

              <h2 className="text-2xl font-bold text-[var(--textPrimary)] mb-6">
                {selectedProduct.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--textPrimary)] mb-3">
                    Images
                  </h3>
                  <div className="w-full h-72 md:h-80 rounded-xl overflow-hidden border  bg-[var(--background)] dark:bg-[var(--background)] flex items-center justify-center">
                    {selectedProduct.gallery?.[0] ? (
                      <img
                        src={selectedProduct.gallery[0]}
                        alt="product"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[var(--textSecondary)]">
                        No Image
                      </span>
                    )}
                  </div>

                  {selectedProduct.gallery &&
                    selectedProduct.gallery.length > 1 && (
                      <div className="mt-4 flex gap-3">
                        {selectedProduct.gallery.map(
                          (img: string, idx: number) => (
                            <div
                              key={idx}
                              className="w-20 h-20 rounded-lg overflow-hidden border bg-[var(--background)] dark:bg-[var(--background)] shadow-sm"
                            >
                              <img
                                src={img}
                                alt=""
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[var(--textPrimary)] mb-4">
                    Details
                  </h3>
                  <ul className="text-sm space-y-2 text-[var(--textPrimary)]">
                    <li>
                      <strong>Category:</strong>{" "}
                      {selectedProduct.category || "—"}
                    </li>
                    <li>
                      <strong>Vendor:</strong> {selectedProduct.vendor || "—"}
                    </li>
                    <li>
                      <strong>Gender:</strong>{" "}
                      {selectedProduct.gender?.join(", ") || "—"}
                    </li>
                    <li>
                      <strong>Tags:</strong>{" "}
                      {selectedProduct.tags?.join(", ") || "—"}
                    </li>
                    <li>
                      <strong>Price:</strong> ${selectedProduct.price ?? "—"}
                    </li>
                    <li>
                      <strong>Stock:</strong>{" "}
                      {selectedProduct.stockQuantity ?? "—"}
                    </li>
                    <li>
                      <strong>SKU:</strong> {selectedProduct.sku || "—"}
                    </li>
                    <li>
                      <strong>Status:</strong>{" "}
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${selectedProduct.inStock
                          ? "bg-[var(--accent-green)] text-white"
                          : "bg-red-600 text-white"
                          }`}
                      >
                        {selectedProduct.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {Array.isArray(selectedProduct?.variants) &&
                selectedProduct.variants.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-[var(--textPrimary)] mb-4">
                      Variants
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border  text-sm rounded-lg">
                        <thead className="bg-[var(--background-card)]">
                          <tr>
                            <th className="py-2 px-3 text-left">Size</th>
                            <th className="py-2 px-3 text-left">Color</th>
                            <th className="py-2 px-3 text-left">Stock</th>
                            <th className="py-2 px-3 text-left">Material</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct.variants.map((v, idx) => (
                            <tr
                              key={idx}
                              className="border-t "
                            >
                              <td className="py-2 px-3">{v.size || "—"}</td>
                              <td className="py-2 px-3">{v.color || "—"}</td>
                              <td className="py-2 px-3">{v.stock ?? 0}</td>
                              <td className="py-2 px-3">{v.material || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function SortableImage({
    img,
    index,
    selectedImage,
    setSelectedImage,
  }: any) {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: img.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <button
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setSelectedImage(index)}
        className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 ${selectedImage === index ? "border-green-500" : ""
          }`}
      >
        <img
          src={String(img.url)}
          alt={img.name}
          className="w-full h-full object-cover"
        />
      </button>
    );
  }

  // -------------------- Render Add Product (with vertical tabs) --------------------
  const renderAddProduct = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Product Details (main) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Basic Information */}
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border  p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <FileText size={20} className="" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--textPrimary)]">
              Add / Edit Product
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium dark:text-white text-gray-700 mb-2">
                Name Product
              </label>
              <input
                type="text"
                value={productForm.name}
                onChange={(e) =>
                  handleProductInputChange("name", e.target.value)
                }
                className="w-full px-4 py-2.5 border dark:bg-[var(--bgCard)] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-white text-gray-700 mb-2">
                Description Product
              </label>
              <textarea
                value={productForm.description}
                onChange={(e) =>
                  handleProductInputChange("description", e.target.value)
                }
                className="w-full px-4 py-2.5 border dark:bg-[var(--bgCard)] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Enter product description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium  dark:text-white text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) =>
                    handleProductInputChange("category", e.target.value)
                  }
                  className="w-full px-4 py-2.5 border dark:bg-[var(--bgCard)] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select category</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Heritage">Heritage</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium dark:bg-[var(--bgCard)] dark:text-whitetext-gray-700 mb-2">
                  Gender
                </label>
                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={productForm.gender.includes("Men")}
                      onChange={(e) => {
                        if (e.target.checked)
                          handleProductInputChange("gender", [
                            ...productForm.gender,
                            "Men",
                          ]);
                        else
                          handleProductInputChange(
                            "gender",
                            productForm.gender.filter((g) => g !== "Men")
                          );
                      }}
                    />
                    <span>Men</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={productForm.gender.includes("Women")}
                      onChange={(e) => {
                        if (e.target.checked)
                          handleProductInputChange("gender", [
                            ...productForm.gender,
                            "Women",
                          ]);
                        else
                          handleProductInputChange(
                            "gender",
                            productForm.gender.filter((g) => g !== "Women")
                          );
                      }}
                    />
                    <span>Women</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={productForm.gender.includes("Unisex")}
                      onChange={(e) => {
                        if (e.target.checked)
                          handleProductInputChange("gender", [
                            ...productForm.gender,
                            "Unisex",
                          ]);
                        else
                          handleProductInputChange(
                            "gender",
                            productForm.gender.filter((g) => g !== "Unisex")
                          );
                      }}
                    />
                    <span>Unisex</span>
                  </label>
                </div>

                <p className="text-xs text-[var(--textSecondary)] mt-1">
                  Multi select — Choose who this product is for
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-white  text-gray-700 mb-2">
                  Vendor
                </label>
                <input
                  type="text"
                  value={productForm.vendor}
                  onChange={(e) =>
                    handleProductInputChange("vendor", e.target.value)
                  }
                  className="w-full px-4 py-2.5 border  dark:bg-[var(--bgCard)] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter vendor name"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing and Stock */}
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border  p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <DollarSign size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--textPrimary)]">
              Pricing and Stock
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Pricing
              </label>
              <input
                type="number"
                value={productForm.basePrice}
                onChange={(e) =>
                  handleProductInputChange("basePrice", e.target.value)
                }
                className="w-full px-4 py-2.5 border  rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sell Price
              </label>
              <input
                type="number"
                value={productForm.sellPrice}
                onChange={(e) =>
                  handleProductInputChange("sellPrice", e.target.value)
                }
                className="w-full px-4 py-2.5 border  rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount
              </label>
              <input
                type="number"
                value={productForm.discount}
                onChange={(e) =>
                  handleProductInputChange("discount", e.target.value)
                }
                className="w-full px-4 py-2.5 border  rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount type
              </label>
              <select
                value={productForm.discountType}
                onChange={(e) =>
                  handleProductInputChange("discountType", e.target.value)
                }
                className="w-full px-4 py-2.5 border  rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Variants (unchanged) */}
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border   p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[var(--textPrimary)]">
              Add Variants
            </h2>
            {!showAddVariant && (
              <button
                onClick={() => setShowAddVariant(true)}
                className="px-4 py-2 text-black text-sm font-medium rounded-lg hover:opacity-90"
                style={{ backgroundColor: "#A0EDA8" }}
              >
                Add Variants
              </button>
            )}
          </div>

          {showAddVariant && (
            <div className="bg-[var(--background)] dark:bg-[var(--bgCard)] rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={String(newVariant.size ?? "")}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, size: e.target.value })
                    }
                    className="w-full px-3 py-2 border   rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., M, L, XL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={String(newVariant.color ?? "")}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, color: e.target.value })
                    }
                    className="w-full px-3 py-2 border   rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Black, Blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material
                  </label>
                  <input
                    type="text"
                    value={String(newVariant.material ?? "")}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, material: e.target.value })
                    }
                    className="w-full px-3 py-2 border   rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Wool, Cotton"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    value={String(newVariant.lowStockAlert ?? "")}
                    onChange={(e) =>
                      setNewVariant({
                        ...newVariant,
                        lowStockAlert: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border   rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="21"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={String(newVariant.stock ?? "")}
                    onChange={(e) =>
                      setNewVariant({
                        ...newVariant,
                        stock: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border   rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="77"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode value
                  </label>
                  <input
                    type="text"
                    value={String(newVariant.barcode ?? "")}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, barcode: e.target.value })
                    }
                    className="w-full px-3 py-2 border   rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="2324kvbs-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) =>
                      handleProductInputChange("sku", e.target.value)
                    }
                    className="w-full px-3 py-2 border   rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="2324kvbs-2"
                  />
                </div>
                <div className="flex items-center gap-3 mt-7">
                  <button
                    onClick={handleAddVariant}
                    className="px-4 py-2 text-black text-sm font-medium rounded-lg hover:opacity-90"
                    style={{ backgroundColor: "#A0EDA8" }}
                  >
                    Add Variants
                  </button>
                  <button
                    onClick={generateSKU}
                    className="px-4 py-2 bg-[var(--background-card)] dark:bg-[var(--bgCard)] border  text-gray-700 text-sm font-medium rounded-lg hover:bg-[var(--background)] dark:bg-[var(--bgCard)]"
                  >
                    Generate SKU
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Variants Table */}
          {variants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b ">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--textPrimary)]">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--textPrimary)]">
                      Color
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--textPrimary)]">
                      Material
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--textPrimary)]">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--textPrimary)]">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--textPrimary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => (
                    <tr
                      key={
                        variant._id ||
                        variant.id ||
                        `${variant.size}-${variant.color}-${Math.random()}`
                      }
                      className="border-b "
                    >
                      <td className="px-4 py-3 text-sm text-[var(--textPrimary)]">
                        {variant.size}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--textSecondary)]">
                        {variant.color}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--textSecondary)]">
                        {variant.material}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--textPrimary)]">
                        ${variant.price}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--textSecondary)]">
                        {variant.stock}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeVariant(variant.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Upload, Metadata, and Vertical Tabs */}
      <div className="lg:col-span-1 space-y-6">
        {/* Upload Images */}
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border  p-6">
          <h3 className="text-lg font-semibold text-[var(--textPrimary)] mb-4">
            Upload img
          </h3>

          {/* Combined preview: existingImages (URLs) + newImages (previews) */}
          <div className="space-y-4">
            {/* Main preview */}
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              {imagePreviews[selectedImage] ? (
                <img
                  src={String(imagePreviews[selectedImage].url)}
                  alt="Product"
                  className="w-full h-64 object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-[var(--textSecondary)]">
                  No image selected
                </div>
              )}

              {/* Controls */}
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => {
                    // if preview from existing, remove existing; otherwise remove new file
                    const p = imagePreviews[selectedImage];
                    if (!p) return;
                    if (isPreviewFromExisting(p))
                      removeExistingImage(String(p.url));
                    else removeNewImage(p.name);
                    // remove preview at index
                    setImagePreviews((prev) =>
                      prev.filter((x, idx) => idx !== selectedImage)
                    );
                    setSelectedImage(0);
                  }}
                  className="p-1.5 bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-full shadow-md hover:shadow-lg"
                >
                  <X size={16} className="text-[var(--textSecondary)]" />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 items-center">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={imagePreviews.map((i) => i.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex gap-2 items-center">
                    {imagePreviews.map((img, index) => (
                      <SortableImage
                        key={img.id}
                        img={img}
                        index={index}
                        selectedImage={selectedImage}
                        setSelectedImage={setSelectedImage}
                      />
                    ))}

                    {/* Add More Button */}

                  </div>
                </SortableContext>
              </DndContext>


              {/* Add new files */}
              <label
                htmlFor="add-more-images"
                className="w-16 h-16 border-2 border-dashed  rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500"
              >
                <Plus size={20} className="text-gray-400" />
                <input
                  id="add-more-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files)
                      handleNewImageFiles(Array.from(e.target.files));
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-[var(--textSecondary)] mt-3">
            Existing images are preserved when saving — new images will be
            uploaded.
          </p>
        </div>

        {/* Vertical Tabs + Tab Content */}
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border  p-4 flex gap-4">
          {/* Sidebar */}
          <div className="w-36 border-r  pr-3">
            <button
              onClick={() => setDetailsTab("details")}
              className={`w-full text-left py-2 px-2 rounded ${detailsTab === "details"
                ? "bg-[var(--accent-green)]"
                : "hover:bg-[var(--background)]"
                }`}
            >
              Details
            </button>
            <button
              onClick={() => setDetailsTab("specs")}
              className={`w-full text-left py-2 px-2 rounded ${detailsTab === "specs"
                ? "bg-[var(--accent-green)]"
                : "hover:bg-[var(--background)]"
                }`}
            >
              Specifications
            </button>
            <button
              onClick={() => setDetailsTab("faq")}
              className={`w-full text-left py-2 px-2 rounded ${detailsTab === "faq"
                ? "bg-[var(--accent-green)]"
                : "hover:bg-[var(--background)]"
                }`}
            >
              FAQ
            </button>
            <button
              onClick={() => setDetailsTab("customer")}
              className={`w-full text-left py-2 px-2 rounded ${detailsTab === "customer"
                ? "bg-[var(--accent-green)]"
                : "hover:bg-[var(--background)]"
                }`}
            >
              Customer Photos
            </button>
            <button
              onClick={() => setDetailsTab("notes")}
              className={`w-full text-left py-2 px-2 rounded ${detailsTab === "notes"
                ? "bg-[var(--accent-green)]"
                : "hover:bg-[var(--background)]"
                }`}
            >
              Notes
            </button>
            <button
              onClick={() => setDetailsTab("terms")}
              className={`w-full text-left py-2 px-2 rounded ${detailsTab === "terms"
                ? "bg-[var(--accent-green)]"
                : "hover:bg-[var(--background)]"
                }`}
            >
              Terms
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {detailsTab === "details" && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Highlights
                </label>
                <textarea
                  value={productForm.highlights}
                  onChange={(e) =>
                    handleProductInputChange("highlights", e.target.value)
                  }
                  className="w-full p-3 border  rounded"
                  rows={3}
                />
                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Material Details
                </label>
                <input
                  type="text"
                  value={productForm.materialDetails}
                  onChange={(e) =>
                    handleProductInputChange("materialDetails", e.target.value)
                  }
                  className="w-full p-2 border  rounded"
                />
                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Care Instructions
                </label>
                <input
                  type="text"
                  value={productForm.careInstructions}
                  onChange={(e) =>
                    handleProductInputChange("careInstructions", e.target.value)
                  }
                  className="w-full p-2 border  rounded"
                />
              </div>
            )}

            {detailsTab === "specs" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Material
                </label>
                <input
                  type="text"
                  value={productForm.specifications.material}
                  onChange={(e) =>
                    handleProductInputChange("specifications", {
                      ...productForm.specifications,
                      material: e.target.value,
                    })
                  }
                  className="w-full p-2 border  rounded"
                />

                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Fit
                </label>
                <input
                  type="text"
                  value={productForm.specifications.fit}
                  onChange={(e) =>
                    handleProductInputChange("specifications", {
                      ...productForm.specifications,
                      fit: e.target.value,
                    })
                  }
                  className="w-full p-2 border  rounded"
                />

                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Wash Care
                </label>
                <input
                  type="text"
                  value={productForm.specifications.washCare}
                  onChange={(e) =>
                    handleProductInputChange("specifications", {
                      ...productForm.specifications,
                      washCare: e.target.value,
                    })
                  }
                  className="w-full p-2 border  rounded"
                />

                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Pattern
                </label>
                <input
                  type="text"
                  value={productForm.specifications.pattern}
                  onChange={(e) =>
                    handleProductInputChange("specifications", {
                      ...productForm.specifications,
                      pattern: e.target.value,
                    })
                  }
                  className="w-full p-2 border  rounded"
                />

                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Origin
                </label>
                <input
                  type="text"
                  value={productForm.specifications.origin}
                  onChange={(e) =>
                    handleProductInputChange("specifications", {
                      ...productForm.specifications,
                      origin: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded"
                />

                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Others
                </label>
                <input
                  type="text"
                  value={productForm.specifications.others}
                  onChange={(e) =>
                    handleProductInputChange("specifications", {
                      ...productForm.specifications,
                      others: e.target.value,
                    })
                  }
                  className="w-full p-2 border  rounded"
                />
              </div>
            )}

            {detailsTab === "faq" && (
              <div>
                <div className="space-y-3">
                  {productForm.faq.map((f, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          placeholder="Question"
                          value={f.question}
                          onChange={(e) => {
                            const list = [...productForm.faq];
                            list[idx].question = e.target.value;
                            handleProductInputChange("faq", list);
                          }}
                          className="w-full p-2 border  rounded mb-2"
                        />
                        <input
                          placeholder="Answer"
                          value={f.answer}
                          onChange={(e) => {
                            const list = [...productForm.faq];
                            list[idx].answer = e.target.value;
                            handleProductInputChange("faq", list);
                          }}
                          className="w-full p-2 border  rounded"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const list = productForm.faq.filter(
                            (_, i) => i !== idx
                          );
                          handleProductInputChange("faq", list);
                        }}
                        className="text-red-600 ml-2"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() =>
                    handleProductInputChange("faq", [
                      ...productForm.faq,
                      { question: "", answer: "" },
                    ])
                  }
                  className="mt-3 px-3 py-1 rounded bg-[var(--background-card)] border "
                >
                  Add FAQ
                </button>
              </div>
            )}

            {detailsTab === "customer" && (
              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Customer Photos
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCustomerPhotosSelect}
                  className="mb-2"
                />
                <div className="flex gap-2 flex-wrap">
                  {/* show existing customer photos first */}
                  {existingCustomerPhotos.map((url) => (
                    <div
                      key={url}
                      className="w-20 h-20 rounded overflow-hidden relative border "
                    >
                      <img
                        src={url}
                        alt={url}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeExistingCustomerPhoto(url)}
                        className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* then show previews for new customer photos */}
                  {customerPhotosPreview.map((p) => (
                    <div
                      key={p.id}
                      className="w-20 h-20 rounded overflow-hidden relative border "
                    >
                      <img
                        src={typeof p.url === "string" ? p.url : ""}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeNewCustomerPhotoFile(p.name)}
                        className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailsTab === "notes" && (
              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Notes
                </label>
                <textarea
                  value={productForm.notes}
                  onChange={(e) =>
                    handleProductInputChange("notes", e.target.value)
                  }
                  className="w-full p-2 border  rounded"
                  rows={4}
                />
              </div>
            )}

            {detailsTab === "terms" && (
              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)]">
                  Terms & Conditions
                </label>
                <textarea
                  value={productForm.terms}
                  onChange={(e) =>
                    handleProductInputChange("terms", e.target.value)
                  }
                  className="w-full p-2 border  rounded"
                  rows={4}
                />
              </div>
            )}
          </div>
        </div>

        {/* Tags & Save */}
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border  p-6">
          <h3 className="text-lg font-semibold text-[var(--textPrimary)] mb-4">
            Tag
          </h3>
          <input
            type="text"
            value={productForm.tags.join(", ")}
            onChange={(e) =>
              handleProductInputChange(
                "tags",
                e.target.value.split(",").map((s) => s.trim())
              )
            }
            className="w-full px-4 py-2.5 border  rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
            placeholder="Enter tags separated by comma"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveProduct}
              className="flex-1 px-4 py-2 text-black text-sm font-medium rounded-lg hover:opacity-90"
              style={{ backgroundColor: "#A0EDA8" }}
            >
              {uploading ? (
                <>
                  <RotateCcw
                    size={16}
                    className="animate-spin inline-block mr-2"
                  />{" "}
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>Save & Publish</>
              )}
            </button>
            <button
              onClick={() => {
                setCurrentView("inventory");
              }}
              className="flex-1 px-4 py-2 bg-[var(--background-card)]  dark:bg-[var(--bgCard)] border text-white font-medium rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/order/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "",
          },
          body: JSON.stringify({ status: "failed" }),
        }
      );

      if (!res.ok) throw new Error("Cancel failed");

      toast.success("Order cancelled");
      fetchOrders();
    } catch (err) {
      toast.error("Cancel order error");
      console.error(err);
    }
  };

  // ===================== ORDER DETAILS MODAL =====================
  interface OrderItem {
    product: string;
    qty: number;
    price: number;
    name?: string;
    image?: string;
    size?: string;
    color?: string;
  }

  interface OrderAddress {
    name?: string;
    phone?: string;
    pincode?: string;
    city?: string;
    state?: string;
    line1?: string;
  }

  interface OrderDetailsModel {
    orderId: string;
    amount: number;
    status: string;
    createdAt: string;
    items: OrderItem[];
    address: OrderAddress;
  }

  interface OrderDetailsModalProps {
    order: OrderDetailsModel | null;
    onClose: () => void;
    onStatusClick: (order: any) => void;
    onPrintClick: (order: any) => void;
  }
  interface StatusModalProps {
    orderId: string;
    currentStatus: string;
    onClose: () => void;
    onUpdate: (newStatus: string) => void;
  }

  const StatusModal: React.FC<StatusModalProps> = ({
    orderId,
    currentStatus,
    onClose,
    onUpdate,
  }) => {
    const [status, setStatus] = React.useState(currentStatus);

    const statuses = [
      "pending",
      "paid",
      "failed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl shadow-xl w-full max-w-md p-6 relative">
          {/* Close Button */}
          <button
            className="absolute top-3 right-3 p-2 bg-gray-200 hover:bg-gray-300 rounded-full"
            onClick={onClose}
          >
            ✕
          </button>

          <h2 className="text-xl font-bold text-[var(--textPrimary)] mb-4">
            Update Order Status
          </h2>

          <p className="text-[var(--textSecondary)] mb-3">
            Order: <strong>{orderId}</strong>
          </p>

          {/* Status Dropdown */}
          <label className="block text-sm text-[var(--textPrimary)] mb-1">
            Select Status
          </label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2 border  rounded bg-[var(--background)] dark:bg-[var(--bgCard)] text-[var(--textPrimary)]"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>

            <button
              onClick={() => onUpdate(status)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handlePrintLabel = (order: any) => {
    if (!order) return;

    const brandLogo = "/logo.png"; // YOUR BRAND LOGO
    const carrierLogo =
      "https://upload.wikimedia.org/wikipedia/commons/4/4e/USPS_logo.png"; // USPS Logo
    const qrValue = `${window.location.origin}/track/${order._id}`;
    const trackingNumber = order._id.slice(-10).toUpperCase();
    // Fake tracking number

    const item = order.items?.[0] || {};

    const sku = item.sku || "N/A";
    const weight = item.weight || "0.45 kg";
    const category = order.category || "Apparel";

    const printWindow = window.open("", "_blank", "width=400,height=600");

    printWindow!.document.write(`
  <html>
  <head>
    <title>Shipping Label</title>
    <style>
      body {
        width: 4in;
        height: 6in;
        margin: 0;
        padding: 12px;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      }
      .label {
        border: 2px solid #000;
        padding: 10px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      /* HEADER */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #000;
        padding-bottom: 6px;
        margin-bottom: 6px;
      }
      .header img {
        height: 40px;
      }

      .section-title {
        font-weight: bold;
        margin: 6px 0 2px;
        font-size: 13px;
      }

      .info {
        font-size: 12px;
        line-height: 1.3;
      }

      .barcode-box {
        text-align: center;
        margin: 10px 0;
      }

      .small-line {
        font-size: 11px;
        border-top: 1px solid #000;
        padding-top: 3px;
        margin-top: 5px;
      }

      .product-title {
        font-size: 12px;
        font-weight: bold;
        margin-top: 5px;
      }

      .flex-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
      }
    </style>
  </head>

  <body>
    <div class="label">

      <!-- HEADER -->
      <div class="header">
        <img src="${brandLogo}" />
        <img src="${carrierLogo}" />
      </div>

      <!-- FROM -->
      <div>
        <div class="section-title">FROM:</div>
        <div class="info">
          KZARRE Fashion<br/>
          48B Shreysh Colony<br/>
          Taloda, MH 425413<br/>
          Phone: 7498722304
        </div>
      </div>

      <!-- TO -->
      <div>
        <div class="section-title">TO:</div>
        <div class="info">
          ${order.address?.name}<br/>
          ${order.address?.line1}<br/>
          ${order.address?.city}, ${order.address?.state} ${order.address?.pincode
      }<br/>
          Phone: ${order.address?.phone}
        </div>
      </div>

      <!-- TRACKING + BARCODE -->
      <div class="barcode-box">
        <div class="section-title">Tracking Number:</div>
        <div>${trackingNumber}</div>
        <svg id="barcode"></svg>
        <div id="qrcode" style="margin-top:4px;"></div>
      </div>

      <!-- SKU / WEIGHT / CATEGORY -->
      <div class="flex-row">
        <div>SKU: ${sku}</div>
        <div>Weight: ${weight}</div>
        <div>Category: ${category}</div>
      </div>

      <!-- PRODUCT SHORT TITLE -->
      <div class="product-title">${item.name || "Product"}</div>

      <!-- SERVICE LINE -->
      <div class="small-line">
        Service: USPS Priority | Zone: 3 | Batch: B12
      </div>

    </div>

    <!-- JS LIBRARIES -->
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>

    <script>
      // BARCODE
      JsBarcode("#barcode", "${trackingNumber}", {
        format: "CODE128",
        width: 2,
        height: 45,
        displayValue: true
      });

      // QR CODE
      QRCode.toCanvas(
        document.getElementById("qrcode"),
        "${qrValue}",
        { width: 90 },
        () => {}
      );

      window.onload = () => {
        window.print();
        setTimeout(() => window.close(), 500);
      };
    </script>

  </body>
  </html>
  `);

    printWindow!.document.close();
  };

  const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
    order,
    onClose,
    onStatusClick,
    onPrintClick,
  }) => {
    if (!order) return null;

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
        <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl shadow-xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-auto">
          {/* Close Button */}
          <button
            className="absolute top-3 right-3 p-2 bg-gray-200 hover:bg-gray-300 rounded-full"
            onClick={onClose}
          >
            ✕
          </button>

          {/* Header */}
          <h2 className="text-2xl font-bold text-[var(--textPrimary)] mb-4">
            Order Details — {order.orderId}
          </h2>

          {/* Customer Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[var(--textPrimary)]">
              Customer Information
            </h3>
            <p className="text-[var(--textSecondary)] text-sm mt-2">
              <strong>Name:</strong> {order.address?.name || "—"} <br />
              <strong>Phone:</strong> {order.address?.phone || "—"} <br />
              <strong>City:</strong> {order.address?.city || "—"} <br />
              <strong>State:</strong> {order.address?.state || "—"} <br />
              <strong>Address:</strong> {order.address?.line1 || "—"}
            </p>
          </div>

          {/* Ordered Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[var(--textPrimary)] mb-3">
              Ordered Items
            </h3>

            {order.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-4 p-3 border  rounded-lg mb-3"
              >
                {/* Product Image */}
                <img
                  src={item.image || "/no-image.png"}
                  alt=""
                  className="w-20 h-20 rounded object-cover border"
                />

                <div>
                  <p className="font-medium text-[var(--textPrimary)]">
                    {item.name}
                  </p>
                  <p className="text-[var(--textSecondary)] text-sm">
                    Qty: {item.qty}
                  </p>
                  <p className="text-[var(--textSecondary)] text-sm">
                    Size: {item.size || "—"}
                  </p>
                  <p className="text-[var(--textSecondary)] text-sm">
                    Color: {item.color || "—"}
                  </p>
                  <p className="font-semibold text-[var(--textPrimary)] mt-1">
                    ${item.price}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[var(--textPrimary)]">
              Order Summary
            </h3>
            <p className="text-sm text-[var(--textSecondary)] mt-2">
              <strong>Total Amount:</strong> ${order.amount} <br />
              <strong>Status:</strong>{" "}
              <span
                className={`px-2 py-1 rounded text-xs ${order.status === "paid"
                  ? "bg-[var(--accent-green)]text-green-800"
                  : order.status === "failed"
                    ? "bg-red-200 text-red-800"
                    : "bg-yellow-200 text-yellow-800"
                  }`}
              >
                {order.status}
              </span>
              <br />
              <strong>Placed On:</strong>{" "}
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString()
                : "—"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6">
            {/* LEFT BUTTONS */}
            <div className="flex gap-3">
              {/* UPDATE STATUS */}
              <button
                onClick={() => onStatusClick(order)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Update Status
              </button>

              {/* PRINT LABEL */}
              <button
                onClick={() => onPrintClick(order)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
              >
                Print Shipping Label
              </button>
            </div>

            {/* CLOSE */}
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOrders = () => (
    <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border ">
      <div className="p-6 border-b ">
        <h2 className="text-xl font-semibold text-[var(--textPrimary)]">
          Orders Management
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b  bg-[var(--background)] dark:bg-[var(--bgCard)]">
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                Order ID
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                Placed At
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                Items
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                Total
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr
                key={order._id}
                className="border-b  hover:bg-[var(--background)] transition-colors"
              >
                {/* ORDER ID */}
                <td className="px-6 py-4 text-sm font-medium text-[var(--textPrimary)]">
                  {order._id}
                </td>

                {/* CUSTOMER */}
                <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                  {order.address?.name || "—"}
                </td>

                {/* DATE */}
                <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString()
                    : "—"}
                </td>

                {/* ITEM COUNT */}
                <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                  {order.items?.length}
                </td>

                {/* AMOUNT */}
                <td className="px-6 py-4 text-sm font-medium text-[var(--textPrimary)]">
                  ${order.amount}
                </td>

                {/* STATUS */}
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full
                  ${order.status === "delivered"
                        ? "bg-[var(--accent-green)] text-green-800"
                        : order.status === "shipped"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                  >
                    {order.status}
                  </span>
                </td>

                {/* ACTIONS DROPDOWN */}
                <td className="px-6 py-4 relative">
                  <button
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === order._id ? null : order._id
                      )
                    }
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>

                  {openDropdown === order._id && (
                    <div className="absolute right-6 mt-2 w-48 bg-white dark:bg-[var(--bgCard)] border  rounded-lg shadow-lg z-50">
                      {/* VIEW DETAILS */}
                      <button
                        onClick={() => {
                          setModalOrder({
                            orderId: order.orderId || order._id, // ✅ guaranteed string
                            amount: Number(order.amount || 0),
                            status: order.status || "pending",
                            createdAt:
                              order.createdAt || new Date().toISOString(),
                            items: order.items || [],
                            address: order.address || {},
                          });
                          setShowOrderModal(true);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        View Details
                      </button>

                      {/* UPDATE STATUS */}
                      <button
                        onClick={() => {
                          setStatusOrderId(order._id);

                          setNewStatus(order.status || "pending");

                          setShowStatusModal(true);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Update Status
                      </button>

                      {/* PRINT LABEL */}
                      <button
                        onClick={() => toast("Print Label Coming Soon")}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Print Shipping Label
                      </button>

                      {/* INVOICE */}
                      <button
                        onClick={() => toast("Invoice Download Coming Soon")}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Download Invoice
                      </button>

                      {/* CANCEL ORDER */}
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                      >
                        Cancel Order
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ORDER DETAILS MODAL */}
      {showOrderModal && modalOrder && (
        <OrderDetailsModal
          order={modalOrder}
          onClose={() => setShowOrderModal(false)}
          onStatusClick={(order) => {
            setStatusOrderId(order.orderId || order._id);
            setNewStatus(order.status || "pending");
            setShowStatusModal(true);
          }}
          onPrintClick={handlePrintLabel}
        />
      )}

      {/* STATUS MODAL */}
      {showStatusModal && (
        <StatusModal
          orderId={statusOrderId!}
          currentStatus={newStatus}
          onClose={() => setShowStatusModal(false)}
          onUpdate={(status) => updateStatus(status)}
        />
      )}
    </div>
  );

  const renderDiscounts = () => (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border ">
        <div className="p-6 border-b ">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--textPrimary)]">
              Discounts & Coupons Management
            </h2>
            <div className="flex gap-3">
              {currentDiscountView === "discounts" && (
                <button
                  onClick={() => setCurrentDiscountView("addDiscount")}
                  className="px-4 py-2 text-black font-medium rounded-lg hover:opacity-90 flex items-center gap-2"
                  style={{ backgroundColor: "#A0EDA8" }}
                >
                  <Plus size={18} /> Add Discount
                </button>
              )}
              {currentDiscountView === "coupons" && (
                <button
                  onClick={() => setCurrentDiscountView("addCoupon")}
                  className="px-4 py-2 text-black font-medium rounded-lg hover:opacity-90 flex items-center gap-2"
                  style={{ backgroundColor: "#A0EDA8" }}
                >
                  <Plus size={18} /> Add Coupon
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setCurrentDiscountView("discounts")}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${currentDiscountView === "discounts" || currentDiscountView === "addDiscount" || currentDiscountView === "editDiscount"
                ? "text-[var(--accent-green)] !border-[var(--accent-green)]"
                : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
                }`}
            >
              Automatic Discounts
            </button>
            <button
              onClick={() => setCurrentDiscountView("coupons")}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${currentDiscountView === "coupons" || currentDiscountView === "addCoupon" || currentDiscountView === "editCoupon"
                ? "text-[var(--accent-green)] !border-[var(--accent-green)]"
                : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
                }`}
            >
              Coupon Codes
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Discounts List */}
        {(currentDiscountView === "discounts") && (
          <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border ">
            <div className="p-6 border-b ">
              <h3 className="text-lg font-semibold text-[var(--textPrimary)]">
                Automatic Discounts ({discounts.length})
              </h3>
              <p className="text-sm text-[var(--textSecondary)] mt-1">
                Discounts applied automatically based on conditions
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b  bg-[var(--background)] dark:bg-[var(--bgCard)]">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Value</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Min Order</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Usage</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-[var(--textSecondary)]">
                        No automatic discounts created yet
                      </td>
                    </tr>
                  ) : (
                    discounts.map((discount) => (
                      <tr key={discount._id} className="border-b  hover:bg-[var(--background)] transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--textPrimary)]">
                          {discount.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                          <span className={`px-2 py-1 rounded-full text-xs ${discount.type === "percentage"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                            }`}>
                            {discount.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                          {discount.type === "percentage" ? `${discount.value}%` : `$${discount.value}`}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                          {discount.minOrderAmount ? `$${discount.minOrderAmount}` : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                          {discount.usedCount || 0}
                          {discount.usageLimit ? ` / ${discount.usageLimit}` : ""}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${discount.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                            }`}>
                            {discount.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedDiscount(discount);
                                setDiscountForm(discount);
                                setCurrentDiscountView("editDiscount");
                              }}
                              className="p-1 hover:bg-gray-100 rounded text-blue-600"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteDiscount(discount._id!)}
                              className="p-1 hover:bg-gray-100 rounded text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coupons List */}
        {currentDiscountView === "coupons" && (
          <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border ">
            <div className="p-6 border-b ">
              <h3 className="text-lg font-semibold text-[var(--textPrimary)]">
                Coupon Codes ({coupons.length})
              </h3>
              <p className="text-sm text-[var(--textSecondary)] mt-1">
                Code-based discounts that customers can apply at checkout
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b  bg-[var(--background)] dark:bg-[var(--bgCard)]">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Code</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Value</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Usage</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--textPrimary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-[var(--textSecondary)]">
                        No coupon codes created yet
                      </td>
                    </tr>
                  ) : (
                    coupons.map((coupon) => (
                      <tr key={coupon._id} className="border-b hover:bg-[var(--background)] transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--textPrimary)] font-mono">
                          {coupon.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                          {coupon.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                          <span className={`px-2 py-1 rounded-full text-xs ${coupon.type === "percentage"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                            }`}>
                            {coupon.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                          {coupon.type === "percentage" ? `${coupon.value}%` : `$${coupon.value}`}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--textSecondary)]">
                          {coupon.usedCount || 0}
                          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${coupon.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                            }`}>
                            {coupon.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedCoupon(coupon);
                                setCouponForm(coupon);
                                setCurrentDiscountView("editCoupon");
                              }}
                              className="p-1 hover:bg-gray-100 rounded text-blue-600"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon._id!)}
                              className="p-1 hover:bg-gray-100 rounded text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Discount Form */}
        {(currentDiscountView === "addDiscount" || currentDiscountView === "editDiscount") && (
          <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border  p-6">
            <h3 className="text-lg font-semibold text-[var(--textPrimary)] mb-6">
              {currentDiscountView === "addDiscount" ? "Create Automatic Discount" : "Edit Discount"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Discount Name *
                </label>
                <input
                  type="text"
                  value={discountForm.name}
                  onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder="e.g., Summer Sale Discount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Discount Type *
                </label>
                <select
                  value={discountForm.type}
                  onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value as "percentage" | "fixed" })}
                  className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Discount Value *
                </label>
                <input
                  type="number"
                  value={discountForm.value}
                  onChange={(e) => setDiscountForm({ ...discountForm, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder={discountForm.type === "percentage" ? "10" : "50"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Minimum Order Amount
                </label>
                <input
                  type="number"
                  value={discountForm.minOrderAmount}
                  onChange={(e) => setDiscountForm({ ...discountForm, minOrderAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Maximum Discount Amount
                </label>
                <input
                  type="number"
                  value={discountForm.maxDiscountAmount}
                  onChange={(e) => setDiscountForm({ ...discountForm, maxDiscountAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder="No limit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Usage Limit
                </label>
                <input
                  type="number"
                  value={discountForm.usageLimit}
                  onChange={(e) => setDiscountForm({ ...discountForm, usageLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={discountForm.startDate}
                  onChange={(e) => setDiscountForm({ ...discountForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={discountForm.endDate}
                  onChange={(e) => setDiscountForm({ ...discountForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                Description
              </label>
              <textarea
                value={discountForm.description}
                onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                rows={3}
                placeholder="Optional description for this discount"
              />
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={discountForm.isActive}
                  onChange={(e) => setDiscountForm({ ...discountForm, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-[var(--textPrimary)]">Active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (currentDiscountView === "addDiscount") {
                    handleCreateDiscount();
                  } else {
                    handleUpdateDiscount(selectedDiscount!._id!);
                  }
                }}
                className="px-6 py-2 text-black font-medium rounded-lg hover:opacity-90"
                style={{ backgroundColor: "#A0EDA8" }}
              >
                {currentDiscountView === "addDiscount" ? "Create Discount" : "Update Discount"}
              </button>
              <button
                onClick={() => {
                  setCurrentDiscountView("discounts");
                  setSelectedDiscount(null);
                  setDiscountForm({
                    name: "",
                    description: "",
                    type: "percentage",
                    value: 0,
                    minOrderAmount: 0,
                    maxDiscountAmount: 0,
                    applicableProducts: [],
                    applicableCategories: [],
                    applicableUsers: [],
                    usageLimit: 0,
                    startDate: "",
                    endDate: "",
                    isActive: true,
                  });
                }}
                className="px-6 py-2 bg-[var(--background)] border  text-[var(--textPrimary)] rounded-lg hover:bg-[var(--background-card)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit Coupon Form */}
        {(currentDiscountView === "addCoupon" || currentDiscountView === "editCoupon") && (
          <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] rounded-xl border  p-6">
            <h3 className="text-lg font-semibold text-[var(--textPrimary)] mb-6">
              {currentDiscountView === "addCoupon" ? "Create Coupon Code" : "Edit Coupon"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-[var(--textPrimary)] font-mono"
                  placeholder="SUMMER2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Coupon Name *
                </label>
                <input
                  type="text"
                  value={couponForm.name}
                  onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder="Summer Sale 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Discount Type *
                </label>
                <select
                  value={couponForm.type}
                  onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value as "percentage" | "fixed" })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Discount Value *
                </label>
                <input
                  type="number"
                  value={couponForm.value}
                  onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder={couponForm.type === "percentage" ? "10" : "50"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Minimum Order Amount
                </label>
                <input
                  type="number"
                  value={couponForm.minOrderAmount}
                  onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Usage Limit
                </label>
                <input
                  type="number"
                  value={couponForm.usageLimit}
                  onChange={(e) => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Usage Limit Per User
                </label>
                <input
                  type="number"
                  value={couponForm.usageLimitPerUser}
                  onChange={(e) => setCouponForm({ ...couponForm, usageLimitPerUser: Number(e.target.value) })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={couponForm.startDate}
                  onChange={(e) => setCouponForm({ ...couponForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={couponForm.endDate}
                  onChange={(e) => setCouponForm({ ...couponForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border  rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-[var(--textPrimary)] mb-2">
                Description
              </label>
              <textarea
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] text-[var(--textPrimary)]"
                rows={3}
                placeholder="Optional description for this coupon"
              />
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={couponForm.isActive}
                  onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-[var(--textPrimary)]">Active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (currentDiscountView === "addCoupon") {
                    handleCreateCoupon();
                  } else {
                    handleUpdateCoupon(selectedCoupon!._id!);
                  }
                }}
                className="px-6 py-2 text-black font-medium rounded-lg hover:opacity-90"
                style={{ backgroundColor: "#A0EDA8" }}
              >
                {currentDiscountView === "addCoupon" ? "Create Coupon" : "Update Coupon"}
              </button>
              <button
                onClick={() => {
                  setCurrentDiscountView("coupons");
                  setSelectedCoupon(null);
                  setCouponForm({
                    code: "",
                    name: "",
                    description: "",
                    type: "percentage",
                    value: 0,
                    minOrderAmount: 0,
                    maxDiscountAmount: 0,
                    applicableProducts: [],
                    applicableCategories: [],
                    applicableUsers: [],
                    usageLimit: 0,
                    usageLimitPerUser: 1,
                    startDate: "",
                    endDate: "",
                    isActive: true,
                  });
                }}
                className="px-6 py-2 bg-[var(--background)] border  text-[var(--textPrimary)] rounded-lg hover:bg-[var(--background-card)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // -------------------- Main Render --------------------
  return (
    
    <div className="min-h-screen bg-[var(--background)] text-[var(--textPrimary)] transition-colors duration-300">
    
      <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] border-b  p-1 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--textPrimary)]">
              E-Commerce Management
            </h1>
            <p className="text-sm text-[var(--textSecondary)] mt-1">
              Manage your website's Ecommerce
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentView === "inventory" && (
              <button
                onClick={() => setCurrentView("addProduct")}
                className="px-4 py-2 text-black font-medium rounded-lg hover:opacity-90 flex items-center gap-2"
                style={{ backgroundColor: "#A0EDA8" }}
              >
                <Plus size={18} className="dark:text-white" /> Add Product
              </button>
            )}
            {currentView === "addProduct" && (
              <>
                <button
                  onClick={() => setCurrentView("inventory")}
                  className="px-4 py-2 bg-[var(--background-card)] dark:bg-[var(--bgCard)] border text-gray-100 font-medium rounded-lg hover:bg-white)"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-4 py-2 text-black font-medium rounded-lg hover:opacity-90 flex items-center gap-2"
                  style={{ backgroundColor: "#A0EDA8" }}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <RotateCcw size={18} className="animate-spin" /> Uploading{" "}
                      {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Save & Publish
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--background-card)] dark:bg-[var(--bgCard)] border-b  px-6">
        <div className="flex gap-6">
          <button
            onClick={() => {
              setActiveTab("inventory");
              setCurrentView("inventory");
            }}
            className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "inventory"
              ? "text-[var(--accent-green)] !border-[var(--accent-green)]"
              : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
              }`}
          >
            Inventory
          </button>
          <button
            onClick={() => {
              setActiveTab("order");
              setCurrentView("orders");
            }}
            className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "order"
              ? "text-[var(--accent-green)] !border-[var(--accent-green)]"
              : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
              }`}
          >
            Order
          </button>
          <button
            onClick={() => setActiveTab("discounts")}
            className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === "discounts"
              ? "text-[var(--accent-green)] !border-[var(--accent-green)]"
              : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
              }`}
          >
            Discounts & Coupons
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {currentView === "inventory" && renderInventory()}
        {currentView === "addProduct" && renderAddProduct()}
        {currentView === "orders" && renderOrders()}
        {currentView === "discounts" && renderDiscounts()}
      </div>
    </div>
  );
};

export default ECommerceSection;
