"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  MoreVertical,
  FileText,
  Edit,
  Trash2,
  X,
  Save,
  Upload,
  Image,
  Calendar,
  Clock,
  Tag,
  FileEdit,
  Hash,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { socket } from "@/app/lib/socket";
import toast from "react-hot-toast";
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
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

function SortableImageItem({
  media,
  id,
  index,
  onRemove,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative rounded-lg overflow-hidden border border-[var(--sidebar-border)] bg-[var(--background)]"
    >
      <img
        src={media.url}
        alt={`Image ${index}`}
        className="w-full h-40 object-cover"
      />

      {/* Drag Handle */}
      <div
        {...listeners}
        className="absolute bottom-2 left-2 px-2 py-1 text-xs rounded bg-black/60 text-white cursor-grab"
      >
        Drag
      </div>

      {/* Position Badge */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        #{index + 1}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 bg-[var(--background-card)] rounded-full"
      >
        <X size={14} />
      </button>
    </div>
  );
}



export default function CMSComplete() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [activeTab, setActiveTab] = useState("pagesAndPosts");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadCompleteToastShown = useRef(false);
  const [selectedPosts, setSelectedPosts] = useState([]);

  const redirectTriggered = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor)
  );
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = uploadedMediaList.findIndex(
      (item) => item.id === active.id
    );

    const newIndex = uploadedMediaList.findIndex(
      (item) => item.id === over.id
    );

    const reordered = arrayMove(uploadedMediaList, oldIndex, newIndex);
    setUploadedMediaList(reordered);

    // 🔥 Move metadata arrays too
    setImageTitles(arrayMove(imageTitles, oldIndex, newIndex));
    setImageDescriptions(arrayMove(imageDescriptions, oldIndex, newIndex));
    setImageMetaTags(arrayMove(imageMetaTags, oldIndex, newIndex));
    setImageMetaDescriptions(arrayMove(imageMetaDescriptions, oldIndex, newIndex));
    setImageKeywords(arrayMove(imageKeywords, oldIndex, newIndex));
    setImageShareLinks(arrayMove(imageShareLinks, oldIndex, newIndex));
  };

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const getAuthToken = () => {
    try {
      const raw = sessionStorage.getItem("auth-storage");
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      return (
        parsed?.state?.token ||
        parsed?.state?.accessToken ||
        parsed?.token ||
        null
      );
    } catch {
      return null;
    }
  };


  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPosts(postsData.map((post) => post._id));
    } else {
      setSelectedPosts([]);
    }
  };
  const handleSelectPost = (postId, checked) => {
    if (checked) {
      setSelectedPosts((prev) => [...prev, postId]);
    } else {
      setSelectedPosts((prev) =>
        prev.filter((id) => id !== postId)
      );
    }
  };


  const handleBulkDelete = async () => {
    if (!selectedPosts.length) return;

    const confirmDelete = confirm(
      `Delete ${selectedPosts.length} selected posts permanently?`
    );

    if (!confirmDelete) return;

    try {
      const token = getAuthToken();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/bulk-delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: selectedPosts }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setPostsData((prev) =>
        prev.filter((p) => !selectedPosts.includes(p._id))
      );

      setSelectedPosts([]);
      toast.success(data.message);

    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    socket.on("cms_bulk_deleted", (data) => {
      const deletedIds = data.ids;

      setPostsData((prev) =>
        prev.filter((post) => !deletedIds.includes(post._id))
      );

      setSelectedPosts([]);
      toast.success("Posts deleted by Super Admin");
    });

    return () => {
      socket.off("cms_bulk_deleted");
    };
  }, []);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("auth-storage");
      if (!raw) return;

      const parsed = JSON.parse(raw);

      const user = parsed?.state?.user;

      if (user?.isSuperAdmin === true) {
        setIsSuperAdmin(true);
      } else if (typeof user?.role === "string") {
        setIsSuperAdmin(user.role.toLowerCase() === "superadmin");
      }
    } catch (err) {
      console.error("❌ Failed to read auth-storage:", err);
    }
  }, []);


  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);


  // =============================
  // POST FORM STATES
  // =============================
  const [postData, setPostData] = useState({
    title: "",
    description: "",
    displayTo: "",
    visibleDate: "",
    visibleTime: "",
    metaTag: "",
    metaDescription: "",
    keywords: "",
    shareLink: "",
    aboutQuoteText: "",
    aboutQuoteHighlight: "",
    aboutIntro: "",
    aboutBody: "",
    aboutFooterHeading: "",
    aboutFooterText: "",
  });
  const [bannerStyle, setBannerStyle] = useState({
    titleColor: "#000000",
    titleSize: "16pt",
    descColor: "#EFBF04",
    descSize: "14pt",
    alignment: "center",
    fontFamily: "inherit",
  });

  const [imageShareLinks, setImageShareLinks] = useState([]);
  const [availableFonts, setAvailableFonts] = useState([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/fonts`)
      .then(res => res.json())
      .then(data => {
        setAvailableFonts(data.fonts || []);
      })
      .catch(err => console.error("Font load error:", err));
  }, []);



  const [postsData, setPostsData] = useState([]);

  // MEDIA STATES
  const [uploadedMedia, setUploadedMedia] = useState(null); // single preview (existing)
  const [uploadedMediaList, setUploadedMediaList] = useState([]); // for multi (grids/carousel)
  const [isDragging, setIsDragging] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Per-image meta inputs (for grids)
  const [imageTitles, setImageTitles] = useState([]);
  const [imageDescriptions, setImageDescriptions] = useState([]);
  const [imageMetaTags, setImageMetaTags] = useState([]);
  const [imageMetaDescriptions, setImageMetaDescriptions] = useState([]);
  const [imageKeywords, setImageKeywords] = useState([]);
  const [enableSchedule, setEnableSchedule] = useState(false);

  // helper: determine if current display type expects multiple files
  const isGrid =
    postData.displayTo === "women-grid" ||
    postData.displayTo === "men-grid" ||
    postData.displayTo === "women-4grid" ||
    postData.displayTo === "men-4grid";

  const isCarousel = postData.displayTo === "home-banner-carousel";

  // expected count for grid (backend currently expects 5 for women-grid/men-grid)W
  let expectedGridCount = 0;

  if (
    postData.displayTo === "women-grid" ||
    postData.displayTo === "men-grid"
  ) {
    expectedGridCount = 5;
  } else if (
    postData.displayTo === "women-4grid" ||
    postData.displayTo === "men-4grid"
  ) {
    expectedGridCount = 4;
  }

  // =============================
  // FETCH CMS CONTENT (DARK-MODE READY)
  // =============================
  useEffect(() => {
    const fetchCMSPosts = async () => {
      try {
        console.log("🚀 Fetching CMS posts...");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content`
        );
        console.log("Response status:", res.status);
        const data = await res.json();
        console.log("CMS DATA:", data);
        if (Array.isArray(data)) {
          const formatted = data.map((item) => ({
            _id: item._id,
            title:
              item.title || (item.heroVideoUrl ? "Hero Video" : "CMS Item"),
            type: item.displayTo || (item.heroVideoUrl ? "Video" : "Banner"),
            author: item.author || "System",
            status: item.status || "Pending Review",
            visibleAt: item.visibleAt,
            lastModified: item.updatedAt
              ? new Date(item.updatedAt).toLocaleDateString()
              : "—",
            url: item.heroVideoUrl || item?.banners?.[0]?.imageUrl || "",
          }));
          setPostsData(formatted);
        }
      } catch (err) {
        console.error("Failed to load CMS content:", err);
      }

    };

    fetchCMSPosts();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      setPostsData(prev => {
        prev.forEach(async (post) => {
          if (
            post.status === "Uploading" ||
            post.status === "Processing"
          ) {
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/status/${post._id}`
              );

              if (!res.ok) return;

              const data = await res.json();

              setPostsData(current =>
                current.map(p =>
                  p._id === post._id
                    ? {
                      ...p,
                      status: data.status,
                      uploadProgress: data.progress ?? p.uploadProgress,
                    }
                    : p
                )
              );
            } catch { }
          }
        });

        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);
  // =============================
  // DRAG & DROP HANDLERS
  // =============================
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // supports multiple dropped files
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) processLocalAndPreview(files);
  };

  // =============================
  // PREVIEW ONLY (UPLOAD ON SAVE)
  // =============================
  // Accepts either a single File or an array of File objects
  const processLocalAndPreview = (filesOrFile) => {
    const files = Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile];

    /* ===============================
       1️⃣ HOME LANDING VIDEO
    =============================== */
    if (postData.displayTo === "home-landing-video") {
      const video = files.find((f) => f.type.startsWith("video/"));
      if (!video) return alert("Please upload a video.");

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedMedia({
          url: e.target.result,
          type: "video",
          name: video.name,
          rawFile: video,
          uploadedUrl: null,
        });
        setUploadedMediaList([]);
      };
      reader.readAsDataURL(video);
      return;
    }

    /* ===============================
       2️⃣ SINGLE IMAGE
    =============================== */
    if (["bannerOne", "bannerTwo", "post"].includes(postData.displayTo)) {
      const image = files.find((f) => f.type.startsWith("image/"));
      if (!image) return alert("Please upload an image.");

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedMedia({
          url: e.target.result,
          type: "image",
          name: image.name,
          rawFile: image,
          uploadedUrl: null,
        });
        setUploadedMediaList([]);
      };
      reader.readAsDataURL(image);
      return;
    }

    /* ===============================
       3️⃣ ABOUT PAGE (KEEP AS IS)
    =============================== */
    if (postData.displayTo === "about-page") {
      const video = files.find((f) => f.type.startsWith("video/"));
      const images = files.filter((f) => f.type.startsWith("image/"));

      if (video) {
        const reader = new FileReader();
        reader.onload = (e) =>
          setUploadedMedia({
            url: e.target.result,
            type: "video",
            rawFile: video,
            uploadedUrl: null,
          });
        reader.readAsDataURL(video);
      }

      if (images.length) {
        const limited = images.slice(0, 2);
        Promise.all(
          limited.map(
            (file) =>
              new Promise((resolve) => {
                const r = new FileReader();
                r.onload = (e) =>
                  resolve({
                    id: crypto.randomUUID(),
                    url: e.target.result,
                    rawFile: file
                  });
                r.readAsDataURL(file);
              })
          )
        ).then(setUploadedMediaList);
      }
      return;
    }

    /* ===============================
       4️⃣ GRID & CAROUSEL (🔥 FIX)
    =============================== */
    if (isGrid || isCarousel) {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (!imageFiles.length) return alert("Please upload images.");

      if (isGrid && imageFiles.length !== expectedGridCount) {
        return alert(`Exactly ${expectedGridCount} images required.`);
      }

      Promise.all(
        imageFiles.map(
          (file) =>
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) =>
                resolve({
                  id: crypto.randomUUID(),
                  url: e.target.result,
                  rawFile: file,
                });
              reader.readAsDataURL(file);
            })
        )
      ).then((previews) => {
        setUploadedMediaList(previews);
        setUploadedMedia(null);

        const count = previews.length;

        // 🔥 THIS IS THE MISSING PART
        setImageTitles(Array(count).fill(""));
        setImageDescriptions(Array(count).fill(""));
        setImageMetaTags(Array(count).fill(""));
        setImageMetaDescriptions(Array(count).fill(""));
        setImageKeywords(Array(count).fill(""));
        setImageShareLinks(Array(count).fill(""));
      });

      return;
    }

    /* ===============================
       5️⃣ FALLBACK
    =============================== */
    const fallback = files.find(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );

    if (fallback) {
      const reader = new FileReader();
      reader.onload = (e) =>
        setUploadedMedia({
          url: e.target.result,
          type: fallback.type.startsWith("video/") ? "video" : "image",
          rawFile: fallback,
        });
      reader.readAsDataURL(fallback);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    processLocalAndPreview(files);
  };

  const removeMedia = () => {
    setUploadedMedia(null);
    setUploadedMediaList([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMediaAt = (index) => {
    const next = uploadedMediaList.filter((_, i) => i !== index);
    setUploadedMediaList(next);
    // also remove associated metadata
    setImageTitles((prev) => prev.filter((_, i) => i !== index));
    setImageDescriptions((prev) => prev.filter((_, i) => i !== index));
    setImageMetaTags((prev) => prev.filter((_, i) => i !== index));
    setImageMetaDescriptions((prev) => prev.filter((_, i) => i !== index));
    setImageKeywords((prev) => prev.filter((_, i) => i !== index));
    setImageShareLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // =============================
  // SAVE POST (FORM + FILE)
  // =============================
  const handleSavePost = async () => {
    if (isSaving) return; // 🔒 Prevent duplicate clicks
    uploadCompleteToastShown.current = false;
    setIsSaving(true);
    // 🚀 Instantly add placeholder row
    const tempId = `temp-${Date.now()}`;
    const tempPost = {
      _id: tempId,
      title: postData.title,
      type: postData.displayTo,
      author: "You",
      status: "Uploading",
      uploadProgress: 0,
      lastModified: new Date().toLocaleDateString(),
    };

    setPostsData(prev => [tempPost, ...prev]);

    // 🚀 Redirect immediately
    setCurrentView("dashboard");
    try {
      if (!postData.title.trim()) {
        alert("Please enter a title.");
        setIsSaving(false);
        return;
      }
      // Validation for grids
      if (isGrid && uploadedMediaList.length !== expectedGridCount) {
        alert(`Please upload exactly ${expectedGridCount} images for this grid.`);
        return;
      }
      if (
        postData.displayTo === "home-landing-video" &&
        !uploadedMedia?.rawFile &&
        !isEditing
      ) {
        alert("Please upload a landing video.");
        return;
      }
      const formData = new FormData();
      // -----------------------------
      // BASIC FIELDS
      // -----------------------------
      Object.entries(postData).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });
      // Banner styling
      formData.append("bannerStyle", JSON.stringify(bannerStyle));
      // -----------------------------
      // ✅ ABOUT PAGE DATA (UPDATED & CORRECT)
      // -----------------------------
      if (postData.displayTo === "about-page") {
        const aboutData = {
          // ⚠️ This is ONLY for edit-mode reference
          // Actual video URL is generated by backend upload
          heroVideo: uploadedMedia?.uploadedUrl || null,

          content: {
            quote: {
              text: postData.aboutQuoteText || "",
              highlight: postData.aboutQuoteHighlight || "",
            },
            intro: postData.aboutIntro || "",
            body: postData.aboutBody || "",
          },

          // ✅ Grid text only (images come from uploaded files)
          grid: uploadedMediaList.map((m, idx) => ({
            text: imageDescriptions[idx] || "",
          })),

          footer: {
            heading: postData.aboutFooterHeading || "",
            text: postData.aboutFooterText || "",
          },
        };

        formData.append("aboutData", JSON.stringify(aboutData));
      }
      // -----------------------------
      // MEDIA UPLOAD (FINAL & SAFE)
      // -----------------------------
      if (isGrid) {
        formData.append("gridCount", String(expectedGridCount));
      }

      // 1️⃣ ABOUT PAGE (video + images)
      if (postData.displayTo === "about-page") {
        // video
        if (uploadedMedia?.rawFile) {
          formData.append("file", uploadedMedia.rawFile);
        }

        // images
        uploadedMediaList.forEach((m) => {
          if (m.rawFile) {
            formData.append("files", m.rawFile);
          }
        });
      }

      // 2️⃣ NORMAL SINGLE MEDIA (image or video)
      else if (!isGrid && !isCarousel) {
        if (uploadedMedia?.rawFile) {
          formData.append("file", uploadedMedia.rawFile);
        }
      }

      // 3️⃣ GRID / CAROUSEL
      else {
        uploadedMediaList.forEach((m, index) => {
          if (m.rawFile) {
            formData.append("files", m.rawFile);
          } else {
            formData.append("existingFiles", m.uploadedUrl || m.url);
          }

          // ✅ Correct order
          formData.append("orders", String(index + 1));
        });


        formData.append("titles", JSON.stringify(imageTitles));
        formData.append("descriptions", JSON.stringify(imageDescriptions));
        formData.append("metaTags", JSON.stringify(imageMetaTags));
        formData.append("metaDescriptions", JSON.stringify(imageMetaDescriptions));
        formData.append("imageKeywords", JSON.stringify(imageKeywords));
        formData.append("shareLinks", JSON.stringify(imageShareLinks));
      }


      // -----------------------------
      // SAVE / UPDATE
      // -----------------------------
      const url = isEditing
        ? `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/update/${editingId}`
        : `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/save`;

      const method = isEditing ? "PUT" : "POST";

      const token = getAuthToken();
      console.log("TOKEN BEING SENT:", token);
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open(method, url);

        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        // 🔥 Upload progress + "Upload complete, saving…" at 100%
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;

          const percent = Math.round(
            (event.loaded / event.total) * 100
          );

          setUploadProgress(percent);

          // 🔥 Update dashboard row progress
          setPostsData(prev =>
            prev.map(p =>
              p._id === tempId
                ? { ...p, uploadProgress: percent }
                : p
            )
          );

          // 🚀 Instant redirect when upload completes

        };
        xhr.onload = async () => {
          if (xhr.status === 401) {
            const refreshToken = sessionStorage.getItem("refresh_token") || localStorage.getItem("refresh_token");

            const refreshRes = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/admin/refresh`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${refreshToken}`,
                },
              }
            );

            if (!refreshRes.ok) {
              sessionStorage.removeItem("access_token");
              sessionStorage.removeItem("refresh_token");
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              window.location.href = "/admin-login";
              return;
            }

            const data = await refreshRes.json();
            const newAccess = data?.accessToken;
            if (newAccess) {
              sessionStorage.setItem("access_token", newAccess);
              if (localStorage.getItem("refresh_token")) localStorage.setItem("access_token", newAccess);
            }

            // 🔁 Retry upload
            window.location.reload();
            return;
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            const responseData = JSON.parse(xhr.responseText);

            setPostsData(prev => {
              // 1️⃣ Remove ALL temp uploading rows
              const filtered = prev.filter(p => !String(p._id).startsWith("temp-"));

              // 2️⃣ Add the real backend post at top
              const realPost = {
                _id: responseData._id,
                title: responseData.title || postData.title,
                type: responseData.displayTo || postData.displayTo,
                author: responseData.author || "You",
                status: responseData.status || "Pending Review",
                uploadProgress: 100,
                visibleAt: responseData.visibleAt,
                lastModified: new Date().toLocaleDateString(),
                url:
                  responseData.heroVideoUrl ||
                  responseData?.banners?.[0]?.imageUrl ||
                  "",
              };

              return [realPost, ...filtered];
            });

            resolve(responseData);
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));

        xhr.send(formData);
      });



      toast.success("Saved!", { id: "cms-upload-status" });
      setCurrentView("dashboard");

      setIsEditing(false);
      setEditingId(null);

      setUploadedMedia(null);
      setUploadedMediaList([]);
      setImageTitles([]);
      setImageDescriptions([]);
      setImageMetaTags([]);
      setImageMetaDescriptions([]);
      setImageKeywords([]);
    } catch (err) {
      toast.error(err.message);
    }
    finally {
      setIsSaving(false); // 🔓 Always release
      setUploadProgress(0);

    }
  };
  // =============================
  // SAVE DRAFT
  // =============================
  const handleSaveDraft = () => {
    const newPost = {
      id: Math.max(...postsData.map((p) => p.id || 0), 0) + 1,
      title: postData.title || "Untitled",
      type: postData.displayTo,
      status: "Draft",
      lastModified: new Date().toISOString().split("T")[0],
    };
    setPostsData([newPost, ...postsData]);
    setCurrentView("dashboard");
  };
  // =============================
  // APPROVE / REJECT / DELETE
  // =============================
  const handleApprovePost = async (postId) => {
    try {
      const token = getAuthToken();

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/approve/${postId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });


      if (!res.ok) throw new Error("Approve failed");

      setPostsData((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, status: "Approved" } : p))
      );

      toast.success("Approved!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRejectPost = async (postId) => {
    const reason = prompt("Reason?");
    if (reason === null) return;

    try {
      const token = getAuthToken();

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/reject/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });


      if (!res.ok) throw new Error("Reject failed");

      setPostsData((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, status: "Rejected" } : p))
      );

      toast.success("Rejected!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Delete this post permanently?")) return;

    try {
      const token = getAuthToken();

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/delete/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });


      if (!res.ok) throw new Error("Delete failed");

      setPostsData((prev) => prev.filter((p) => p._id !== postId));

      toast.success("Deleted successfully");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const isLiveNow = (post) => {
    if (!post.visibleAt) return false;

    return new Date(post.visibleAt) <= new Date();
  };

  const getStatusColor = (status, post) => {
    // 🔴 LIVE overrides Scheduled
    if (status === "Scheduled" && isLiveNow(post)) {
      return "bg-[var(--accent-green)] text-white"; // LIVE
    }

    const map = {
      Approved: "bg-[var(--accent-green)] text-black",
      Draft: "bg-gray-500 text-white",
      "Pending Review": "bg-yellow-500 text-white",
      Rejected: "bg-red-500 text-white",
      Scheduled: "bg-blue-500 text-white",
    };

    return map[status] || "bg-gray-500 text-white";
  };

  // ---------- UI helpers ----------
  const TopBar = ({ back, title, children }) => (
    <div className="px-6 py-4">
      <div className="max-w-9xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {back && (
            <button
              onClick={() => setCurrentView("dashboard")}
              className="p-2 rounded-lg hover:opacity-90 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} className="text-[var(--text-primary)]" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            {title}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex gap-3 items-center">
            {children}
          </div>

          {isSaving && (
            <div className="w-40 mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    backgroundColor: "var(--accent-green)",
                  }}
                />
              </div>
              <p className="text-xs mt-1 text-[var(--text-secondary)] text-right">
                {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleEditPost = async (postId) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/cms-content/${postId}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error("Failed to load post for editing");

      // Load basic post fields
      setPostData({
        title: data.title || "",
        description: data.description || "",
        displayTo: data.displayTo || "",
        visibleDate: data.meta?.visibleDate || "",
        visibleTime: data.meta?.visibleTime || "",
        metaTag: data.meta?.tag || "",
        metaDescription: data.meta?.description || "",
        keywords: data.meta?.keywords || "",
        shareLink: data.shareLink || "",
      });

      // Load banner styling
      if (data.bannerStyle) {
        setBannerStyle({
          titleColor: data.bannerStyle.titleColor || "#000000",
          titleSize: data.bannerStyle.titleSize || "16pt",
          descColor: data.bannerStyle.descColor || "#EFBF04",
          descSize: data.bannerStyle.descSize || "14pt",
          alignment: data.bannerStyle.alignment || "center",
          fontFamily: data.bannerStyle.fontFamily || "inherit",
        });
      }

      if (data.aboutData) {
        setPostData(prev => ({
          ...prev,
          aboutQuoteText: data.aboutData.content?.quote?.text || "",
          aboutQuoteHighlight: data.aboutData.content?.quote?.highlight || "",
          aboutIntro: data.aboutData.content?.intro || "",
          aboutBody: data.aboutData.content?.body || "",
          aboutFooterHeading: data.aboutData.footer?.heading || "",
          aboutFooterText: data.aboutData.footer?.text || "",
        }));
      }

      // ------------------------------
      // LOAD MEDIA (single, 4-grid, 5-grid, carousel)
      // ------------------------------
      // Single image or video (SAFE)
      if (data.media) {
        const url =
          typeof data.media === "string" ? data.media : data.media.url;

        const type =
          data.media?.kind ||
          (typeof url === "string" && url.endsWith(".mp4") ? "video" : "image");

        setUploadedMedia({
          url,
          uploadedUrl: url,
          type,
          name: data.media?.name || "",
          rawFile: null,
        });
      }


      // Multi image (grid or carousel)
      if (Array.isArray(data.mediaGroup)) {
        const sorted = [...data.mediaGroup].sort((a, b) => a.order - b.order);

        // First prepare arrays
        const mediaList = sorted.map((img) => ({
          id: crypto.randomUUID(),
          url: img.imageUrl,
          uploadedUrl: img.imageUrl,
          rawFile: null,
        }));

        const titles = sorted.map((i) => i.title || "");
        const descriptions = sorted.map((i) => i.description || "");
        const metaTags = sorted.map((i) => i.metaTag || "");
        const metaDescriptions = sorted.map((i) => i.metaDescription || "");
        const keywords = sorted.map((i) => i.keywords || "");
        const shareLinks = sorted.map((i) => i.shareLink || "");


        // Then set everything together
        setUploadedMediaList(mediaList);
        setImageTitles(titles);
        setImageDescriptions(descriptions);
        setImageMetaTags(metaTags);
        setImageMetaDescriptions(metaDescriptions);
        setImageKeywords(keywords);
        setImageShareLinks(shareLinks);
      }



      // Switch view → open editor
      setEditingId(postId);
      setIsEditing(true);
      setCurrentView("createPost");
    } catch (err) {
      toast.error(err.message);
    }
  };


  // ---------- Create Post View ----------
  const renderCreatePost = () => (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-all">
      <TopBar
        back={true}
        title={
          <>
            <span className="text-[var(--text-primary)] font-medium">CMS</span>
            <span className="mx-2 text-[var(--text-secondary)]">/</span>
            <span className="text-[var(--text-primary)] font-semibold">
              Create Post
            </span>
          </>
        }

      >

        <button
          onClick={handleSavePost}
          disabled={isSaving}
          className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all ${isSaving ? "opacity-60 cursor-not-allowed" : ""
            }`}
          style={{ backgroundColor: "var(--accent-green)" }}
        >
          {isSaving ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full"></span>
              Uploading...
            </>
          ) : (
            <>
              <Save size={16} />
              Save
            </>
          )}
        </button>

        <button
          onClick={handleSaveDraft}
          className="px-4 py-2 text-sm rounded-lg font-medium bg-[var(--background-card)] border border-[var(--sidebar-border)] text-[var(--text-primary)]"
        >
          <FileText size={16} /> Draft
        </button>
      </TopBar>

      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--background-card)] rounded-xl shadow-sm border border-[var(--sidebar-border)] p-6">
              <h2 className="text-xl font-semibold mb-6 text-[var(--text-primary)]">
                Create post
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Title of post
                  </label>
                  <input
                    type="text"
                    value={postData.title}
                    onChange={(e) =>
                      setPostData((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                    placeholder="Enter post title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Description of post
                  </label>
                  <textarea
                    value={postData.description}
                    onChange={(e) =>
                      setPostData((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                    placeholder="Enter post description"
                    rows={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Display To
                  </label>
                  <select
                    value={postData.displayTo}
                    onChange={(e) =>
                      setPostData((p) => ({ ...p, displayTo: e.target.value }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none transition-all bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                  >
                    <option value="">Select place to display</option>
                    {/* <option value="post">Post (single image)</option> */}
                    <option value="home-landing-video">
                      Home Landing Video (video)
                    </option>
                    <option value="bannerOne">Home Banner One (image)</option>
                    <option value="bannerTwo">Home Banner Two (image)</option>
                    <option value="men-page-video">Men Page Video</option>
                    <option value="women-page-video">Women Page Video</option>
                    <option value="accessories-video">Accessories Video</option>
                    <option value="heritage-video">Heritage Video</option>

                    <option value="women-4grid">
                      Women Banner Grid (4 images)
                    </option>
                    <option value="men-4grid">
                      Men Banner Grid (4 images)
                    </option>
                    <option value="women-grid">
                      Women Banner Grid (5 images)
                    </option>
                    <option value="men-grid">Men Banner Grid (5 images)</option>
                    <option value="about-page">About Page</option>
                    <option value="product-page">Product Page</option>
                  </select>

                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Choose where the uploaded media should be used. This will
                    validate file types.
                  </p>
                </div>

                {/* ================= ABOUT PAGE EDITOR ================= */}
                {postData.displayTo === "about-page" && (
                  <div className="bg-[var(--background-card)] rounded-xl border border-[var(--sidebar-border)] p-6 space-y-5">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      About Page Content
                    </h3>

                    <div>
                      <label className="block text-sm font-medium mb-1">Quote Text</label>
                      <textarea
                        value={postData.aboutQuoteText}
                        onChange={(e) =>
                          setPostData(p => ({ ...p, aboutQuoteText: e.target.value }))
                        }
                        className="w-full p-3 border rounded bg-[var(--background)]"
                        placeholder="Main quote text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Quote Highlight</label>
                      <input
                        type="text"
                        value={postData.aboutQuoteHighlight}
                        onChange={(e) =>
                          setPostData(p => ({ ...p, aboutQuoteHighlight: e.target.value }))
                        }
                        className="w-full p-3 border rounded bg-[var(--background)]"
                        placeholder="Highlighted phrase"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Intro</label>
                      <textarea
                        value={postData.aboutIntro}
                        onChange={(e) =>
                          setPostData(p => ({ ...p, aboutIntro: e.target.value }))
                        }
                        className="w-full p-3 border rounded bg-[var(--background)]"
                        placeholder="Short introduction"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Body</label>
                      <textarea
                        rows={6}
                        value={postData.aboutBody}
                        onChange={(e) =>
                          setPostData(p => ({ ...p, aboutBody: e.target.value }))
                        }
                        className="w-full p-3 border rounded bg-[var(--background)]"
                        placeholder="Main About page content"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Footer Heading</label>
                      <input
                        type="text"
                        value={postData.aboutFooterHeading}
                        onChange={(e) =>
                          setPostData(p => ({ ...p, aboutFooterHeading: e.target.value }))
                        }
                        className="w-full p-3 border rounded bg-[var(--background)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Footer Text</label>
                      <textarea
                        value={postData.aboutFooterText}
                        onChange={(e) =>
                          setPostData(p => ({ ...p, aboutFooterText: e.target.value }))
                        }
                        className="w-full p-3 border rounded bg-[var(--background)]"
                      />
                    </div>
                  </div>
                )}


                {/* Upload */}
                <div className="bg-[var(--background-card)] rounded-xl border border-[var(--sidebar-border)] p-6">
                  <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                    Upload Media
                  </h3>

                  {/* PREVIEW / UPLOAD UI */}
                  {uploadedMedia || uploadedMediaList.length > 0 ? (
                    <div>
                      {/* Single preview (image or video) */}
                      {uploadedMedia ? (
                        <div className="relative rounded-lg overflow-hidden bg-[var(--background)] border border-[var(--sidebar-border)]">
                          {uploadedMedia.type === "video" ? (
                            <video
                              src={
                                uploadedMedia.uploadedUrl || uploadedMedia.url
                              }
                              controls
                              className="w-full h-64 object-contain"
                            />
                          ) : (
                            <img
                              src={
                                uploadedMedia.uploadedUrl || uploadedMedia.url
                              }
                              alt={uploadedMedia.name}
                              className="w-full h-64 object-contain"
                            />
                          )}
                          <button
                            onClick={removeMedia}
                            className="absolute top-2 right-2 p-1.5 bg-[var(--background-card)] rounded-full shadow hover:shadow-lg transition"
                          >
                            <X
                              size={18}
                              className="text-[var(--text-primary)]"
                            />
                          </button>
                        </div>
                      ) : null}

                      {/* Multi previews (grid/carousel) */}
                      {uploadedMediaList.length > 0 && (
                        <div className="space-y-3">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={uploadedMediaList.map((item) => item.id)}
                              strategy={rectSortingStrategy}
                            >
                              <div className="grid grid-cols-2 gap-3">
                                {uploadedMediaList.map((m, idx) => (
                                  <SortableImageItem
                                    key={m.id}
                                    id={m.id}
                                    index={idx}
                                    media={m}
                                    onRemove={() => removeMediaAt(idx)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>


                          {/* Per-image meta inputs */}
                          <div className="grid grid-cols-1 gap-2">
                            {uploadedMediaList.map((_, idx) => (
                              <div key={idx} className="p-3 border rounded">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="text-sm font-medium text-[var(--text-primary)]">
                                    Image #{idx + 1}
                                  </div>
                                </div>

                                <input
                                  type="text"
                                  placeholder="Title (optional)"
                                  value={
                                    imageTitles.length === uploadedMediaList.length
                                      ? imageTitles[idx] || ""
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const copy = [...imageTitles];
                                    copy[idx] = e.target.value;
                                    setImageTitles(copy);
                                  }}
                                  className="w-full px-3 py-2 mb-2 border rounded bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                                />

                                <textarea
                                  placeholder="Description (optional)"
                                  value={
                                    imageDescriptions.length === uploadedMediaList.length
                                      ? imageDescriptions[idx] || ""
                                      : ""
                                  }

                                  onChange={(e) => {
                                    const copy = [...imageDescriptions];
                                    copy[idx] = e.target.value;
                                    setImageDescriptions(copy);
                                  }}
                                  rows={2}
                                  className="w-full px-3 py-2 mb-2 border rounded bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                                />

                                <input
                                  type="text"
                                  placeholder="Share Link (optional) — e.g. /product/123"
                                  value={imageShareLinks[idx] || ""}
                                  onChange={(e) => {
                                    const copy = [...imageShareLinks];
                                    copy[idx] = e.target.value;
                                    setImageShareLinks(copy);
                                  }}
                                  className="w-full px-3 py-2 mb-2 border rounded bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                                />

                                {/* hidden meta fields (use if you want to set meta per image) */}
                                <div style={{ display: "none" }}>
                                  <input
                                    type="text"
                                    value={imageMetaTags[idx] || ""}
                                    onChange={(e) => {
                                      const copy = [...imageMetaTags];
                                      copy[idx] = e.target.value;
                                      setImageMetaTags(copy);
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={imageMetaDescriptions[idx] || ""}
                                    onChange={(e) => {
                                      const copy = [...imageMetaDescriptions];
                                      copy[idx] = e.target.value;
                                      setImageMetaDescriptions(copy);
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={imageKeywords[idx] || ""}
                                    onChange={(e) => {
                                      const copy = [...imageKeywords];
                                      copy[idx] = e.target.value;
                                      setImageKeywords(copy);
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 text-sm text-[var(--text-secondary)]">
                        <p className="font-medium text-[var(--text-primary)]">
                          {uploadedMedia?.name ||
                            `${uploadedMediaList.length} images selected`}
                        </p>
                        {uploadedMedia && <p>{uploadedMedia.size}</p>}
                        <p className="text-xs text-[var(--text-secondary)]">
                          Uploading / preview local
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="relative rounded-lg overflow-hidden">
                        <img
                          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3C/svg%3E"
                          alt="Placeholder"
                          className="w-full h-48 object-cover"
                        />
                      </div>

                      <div
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragLeave={handleDragLeave}
                        className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging
                          ? "border-green-500 bg-[var(--accent-green)]"
                          : "border-[var(--sidebar-border)] bg-[var(--background)]"
                          }`}
                      >
                        <div className="flex flex-col items-center">
                          <Upload
                            size={32}
                            className="mb-3 text-[var(--text-secondary)]"
                          />
                          <p className="text-sm text-[var(--text-secondary)] mb-2">
                            Drag and Drop
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mb-4">
                            or
                          </p>

                          <input
                            ref={fileInputRef}
                            id="file-upload"
                            type="file"
                            multiple={isCarousel || isGrid || postData.displayTo === "about-page"}
                            accept={
                              postData.displayTo === "about-page"
                                ? "image/*,video/*"
                                : [
                                  "home-landing-video",
                                  "men-page-video",
                                  "women-page-video",
                                  "accessories-video",
                                  "heritage-video",
                                ].includes(postData.displayTo)
                                  ? "video/*"
                                  : "image/*"
                            }
                            onChange={handleFileSelect}
                            className="hidden"
                          />


                          <div className="flex gap-3">
                            <label
                              htmlFor="file-upload"
                              className="px-4 py-2 text-sm rounded-lg cursor-pointer font-medium"
                              style={{
                                backgroundColor: "var(--accent-green)",
                                color: "#000",
                              }}
                            >
                              Upload from Device
                            </label>

                            <button
                              onClick={() => setMediaLibraryOpen(true)}
                              className="px-4 py-2 text-sm rounded-lg border border-[var(--sidebar-border)] bg-[var(--background-card)] text-[var(--text-primary)]"
                            >
                              Select from Media Library
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--background-card)] rounded-xl shadow-sm border border-[var(--sidebar-border)] p-6">
              <h3 className="text-lg font-semibold mb-5 text-[var(--text-primary)]">
                Post Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="date"
                    value={postData.visibleDate}
                    onChange={(e) =>
                      setPostData((p) => ({ ...p, visibleDate: e.target.value }))
                    }
                    className="w-full pl-10 pr-4 py-2 border rounded-lg bg-[var(--background)] border-[var(--sidebar-border)]"
                  />
                </div>

                {/* Time */}
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="time"
                    value={postData.visibleTime}
                    onChange={(e) =>
                      setPostData((p) => ({ ...p, visibleTime: e.target.value }))
                    }
                    className="w-full pl-10 pr-4 py-2 border rounded-lg bg-[var(--background)] border-[var(--sidebar-border)]"
                  />
                </div>
              </div>


            </div>
            <div className="bg-[var(--background-card)] rounded-xl shadow-sm border border-[var(--sidebar-border)] p-6">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Redirect / Share Link (Optional)
              </label>

              <input
                type="text"
                value={postData.shareLink}
                onChange={(e) =>
                  setPostData((p) => ({ ...p, shareLink: e.target.value }))
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                placeholder="https://example.com or /men/product-name"
              />

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                When users click this banner, they will be redirected to this link.
              </p>
            </div>

            {/* ---------------- TEXT STYLING (ADDED HERE) ---------------- */}
            {[
              "bannerOne",
              "bannerTwo",
              "women-4grid",
              "men-4grid",
              "women-grid",
              "men-grid",
            ].includes(postData.displayTo) && (

                <div className="bg-[var(--background-card)] rounded-xl shadow-sm border border-[var(--sidebar-border)] p-6">
                  <h3 className="text-lg font-semibold mb-5 text-[var(--text-primary)]">
                    Text Styling
                  </h3>
                  <div className="space-y-6">
                    {/* ================= Title Color ================= */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Title Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={bannerStyle.titleColor}
                          onChange={(e) =>
                            setBannerStyle((prev) => ({ ...prev, titleColor: e.target.value }))
                          }
                          className="w-10 h-10 rounded-full border border-[var(--sidebar-border)] cursor-pointer"
                        />

                        <input
                          type="text"
                          value={bannerStyle.titleColor}
                          onChange={(e) =>
                            setBannerStyle((prev) => ({ ...prev, titleColor: e.target.value }))
                          }
                          className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {/* ================= Title Size ================= */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Title Font Size (Pt)
                      </label>

                      <input
                        type="number"
                        min="10"
                        max="120"
                        value={parseInt(bannerStyle.titleSize)}
                        onChange={(e) =>
                          setBannerStyle((prev) => ({
                            ...prev,
                            titleSize: `${e.target.value}px`,
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                      />
                    </div>

                    {/* ================= Description Color ================= */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Description Color
                      </label>

                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={bannerStyle.descColor}
                          onChange={(e) =>
                            setBannerStyle((prev) => ({ ...prev, descColor: e.target.value }))
                          }
                          className="w-10 h-10 rounded-full border border-[var(--sidebar-border)] cursor-pointer"
                        />

                        <input
                          type="text"
                          value={bannerStyle.descColor}
                          onChange={(e) =>
                            setBannerStyle((prev) => ({ ...prev, descColor: e.target.value }))
                          }
                          className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {/* ================= Description Size ================= */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Description Font Size (px)
                      </label>

                      <input
                        type="number"
                        min="10"
                        max="120"
                        value={parseInt(bannerStyle.descSize)}
                        onChange={(e) =>
                          setBannerStyle((prev) => ({
                            ...prev,
                            descSize: `${e.target.value}px`,
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                      />
                    </div>

                    {/* ================= Alignment ================= */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Text Alignment
                      </label>

                      <select
                        value={bannerStyle.alignment}
                        onChange={(e) =>
                          setBannerStyle((prev) => ({ ...prev, alignment: e.target.value }))
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    {/* ================= Font Family ================= */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Font Family
                      </label>

                      <select
                        value={bannerStyle.fontFamily || ""}
                        onChange={(e) =>
                          setBannerStyle((prev) => ({ ...prev, fontFamily: e.target.value }))
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-[var(--background)] border-[var(--sidebar-border)] text-sm"
                      >
                        <option value="">Default</option>

                        {availableFonts.length === 0 && (
                          <option disabled>No fonts uploaded</option>
                        )}

                        {availableFonts.map((font, idx) => (
                          <option key={idx} value={font.name}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>


                    {/* ================= Live Preview ================= */}
                    <div className="mt-6 p-4 border rounded-lg bg-[var(--background)]">
                      <h4 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">
                        Live Preview
                      </h4>

                      <div style={{ textAlign: bannerStyle.alignment }}>
                        <div
                          style={{
                            color: bannerStyle.titleColor,
                            fontSize: bannerStyle.titleSize,
                            fontFamily: bannerStyle.fontFamily,
                            fontWeight: 700,
                          }}
                        >
                          {postData.title || "Title Preview"}
                        </div>

                        <div
                          style={{
                            color: bannerStyle.descColor,
                            fontSize: bannerStyle.descSize,
                            fontFamily: bannerStyle.fontFamily,
                            marginTop: "5px",
                          }}
                        >
                          {postData.description || "Description Preview"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              )}

            <div className="bg-[var(--background-card)] rounded-xl shadow-sm border border-[var(--sidebar-border)] p-6">
              <h3 className="text-lg font-semibold mb-5 text-[var(--text-primary)]">
                SEO Configuration
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Meta Tag
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={postData.metaTag}
                      onChange={(e) =>
                        setPostData((p) => ({ ...p, metaTag: e.target.value }))
                      }
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none transition bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                      placeholder="Enter meta tag"
                    />
                    <Tag
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Meta Description
                  </label>
                  <div className="relative">
                    <textarea
                      value={postData.metaDescription}
                      onChange={(e) =>
                        setPostData((p) => ({
                          ...p,
                          metaDescription: e.target.value,
                        }))
                      }
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none transition bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm resize-none"
                      placeholder="Enter meta description"
                      rows={3}
                    />
                    <FileEdit
                      size={18}
                      className="absolute left-3 top-3 text-[var(--text-secondary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Keywords
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={postData.keywords}
                      onChange={(e) =>
                        setPostData((p) => ({ ...p, keywords: e.target.value }))
                      }
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none transition bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
                      placeholder="Enter keywords (comma separated)"
                    />
                    <Hash
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    />
                  </div>
                </div>
              </div>
            </div>



          </div>
        </div>
      </div>

      {/* Media Library Modal */}
      {mediaLibraryOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full bg-[var(--background-card)] rounded-xl overflow-hidden shadow-2xl border border-[var(--sidebar-border)]">
            <div className="p-6 border-b border-[var(--sidebar-border)] flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                Media Library
              </h2>
              <button
                onClick={() => setMediaLibraryOpen(false)}
                className="p-2 hover:opacity-90"
              >
                <X size={24} className="text-[var(--text-primary)]" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg overflow-hidden border border-[var(--sidebar-border)] bg-[var(--background)] cursor-pointer flex items-center justify-center"
                    onClick={() => setMediaLibraryOpen(false)}
                  >
                    <Image size={32} className="text-[var(--text-secondary)]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-[var(--sidebar-border)] flex justify-end gap-3">
              <button
                onClick={() => setMediaLibraryOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-[var(--sidebar-border)] bg-[var(--background-card)] text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm rounded-lg"
                style={{ backgroundColor: "var(--accent-green)" }}
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ---------- Dashboard (list) ----------
  const renderDashboard = () => (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="min-h-screen p-1 space-y-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
            Content Management
          </h1>
          <p className="text-[var(--text-secondary)]">
            Manage your Website's pages, posts & media
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex gap-4 border-b border-[var(--sidebar-border)] w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab("pagesAndPosts")}
              className={`pb-3 px-4 font-medium text-sm ${activeTab === "pagesAndPosts"
                ? "border-b-2 !border-[var(--accent-green)]"
                : "text-[var(--text-secondary)]"
                }`}
            >
              Posts
            </button>

          </div>


          <div className="flex gap-3 w-full sm:w-auto">
            {selectedPosts.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2"
                style={{
                  backgroundColor: "rgba(255, 0, 0, 0.1)",
                  color: "rgb(239,68,68)",
                }}
              >
                Delete Selected ({selectedPosts.length})
              </button>
            )}
            {activeTab === "pagesAndPosts" && (
              <button
                onClick={() => setCurrentView("createPost")}
                className="px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2"
                style={{ backgroundColor: "var(--accent-green)" }}
              >
                <Plus size={18} className="flex-shrink-0" />
                Create Post
              </button>
            )}

          </div>
        </div>

        {activeTab === "pagesAndPosts" && (
          <div className="bg-[var(--background-card)] rounded-xl shadow-sm overflow-hidden border border-[var(--sidebar-border)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* <thead>
                  <th className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={
                        selectedPosts.length === postsData.length &&
                        postsData.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <tr className="border-b border-[var(--sidebar-border)] bg-[var(--background)]">
                    {[
                      "Title",
                      "Type",
                      "Author",
                      "Last Modified",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead> */}
                <thead>
                  <tr className="border-b border-[var(--sidebar-border)] bg-[var(--background)]">
                    {/* Select All Checkbox */}
                    <th className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={
                          postsData.length > 0 &&
                          selectedPosts.length === postsData.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>

                    {[
                      "Title",
                      "Type",
                      "Author",
                      "Last Modified",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {postsData.map((post) => (
                    <tr
                      key={post._id}
                      className="border-b border-[var(--sidebar-border)] hover:bg-[var(--background-card)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPosts.includes(post._id)}
                          onChange={(e) =>
                            handleSelectPost(post._id, e.target.checked)
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                        {post.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {post.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {post.author}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {post.lastModified}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3 min-h-[32px]">

                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(
                              post.status,
                              post
                            )}`}
                          >
                            {post.status === "Scheduled" && isLiveNow(post)
                              ? "Live"
                              : post.status}
                          </span>

                          {/* Compact Progress Bar */}
                          {(post.status === "Uploading" ||
                            post.status === "Processing") && (
                              <div className="flex items-center gap-2 w-20">
                                <div className="relative h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                  <div
                                    className="h-full transition-all duration-300"
                                    style={{
                                      width: `${post.uploadProgress || 0}%`,
                                      backgroundColor:
                                        post.status === "Uploading"
                                          ? "var(--accent-green)"
                                          : "#16a34a",
                                    }}
                                  />
                                </div>

                                {post.status === "Uploading" && (
                                  <span className="text-xs text-[var(--text-secondary)] w-8 text-right">
                                    {post.uploadProgress || 0}%
                                  </span>
                                )}
                              </div>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isSuperAdmin &&
                            ["Pending Review"].includes(post.status) && (

                              <>
                                <button
                                  onClick={() => handleApprovePost(post._id)}
                                  className="px-3 py-1 text-sm rounded"
                                  style={{
                                    background: "rgba(34,197,94,0.08)",
                                    color: "rgb(34, 197, 94)",
                                  }}
                                >
                                  Approve
                                </button>

                                <button
                                  onClick={() => handleRejectPost(post._id)}
                                  className="px-3 py-1 text-sm rounded"
                                  style={{
                                    background: "rgba(239,68,68,0.08)",
                                    color: "rgb(239, 68, 68)",
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          <button
                            onClick={() => handleEditPost(post._id)}
                            className="p-1 hover:opacity-90"
                            title="Edit"
                          >
                            <Edit size={16} className="text-blue-500" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="p-1 hover:opacity-90"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


      </div>

      {/* Add/Edit Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-card)] rounded-xl max-w-md w-full shadow-2xl border border-[var(--sidebar-border)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                  {editingCategoryId ? "Edit Category" : "Add Category"}
                </h2>
                <button
                  onClick={() => {
                    /* safe fallback if handlers are not present in your original file */
                    setShowAddCategoryModal(false);
                  }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X size={24} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // use existing handlers if present
                  try {
                    handleAddCategory();
                  } catch {
                    setShowAddCategoryModal(false);
                  }
                }}
                className="space-y-4"
              >
                {/* keep your modal fields */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={
                      "" /* placeholder - your original state was not included in the provided file */
                    }
                    onChange={() => { }}
                    className="w-full px-4 py-2 border rounded-lg bg-[var(--background)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                    placeholder="Enter category name"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-[var(--sidebar-border)] bg-[var(--background-card)] text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: "var(--accent-green)" }}
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ---------- final return ----------
  return (
    <>

      {currentView === "createPost"
        ? renderCreatePost()
        : renderDashboard()}
    </>
  );
}
