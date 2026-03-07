"use client";

import React, { useEffect, useState } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import toast from "react-hot-toast";
/* ================= TYPES ================= */

type PageKey =
  | "contact"
  | "faq"
  | "returns"
  | "shipping"
  | "legal"
  | "return-policy"
  | "about"
  | "sustainability"
  | "accessibility";

type PageType = "contact" | "faq" | "about" | "policy" | "generic";

function inferPageType(key: PageKey): PageType {
  if (key === "faq") return "faq";
  if (key === "about" || key === "sustainability" || key === "accessibility")
    return "about";
  if (
    key === "legal" ||
    key === "return-policy" ||
    key === "shipping" ||
    key === "returns"
  )
    return "policy";
  if (key === "contact") return "contact";
  return "generic";
}

interface CmsSection {
  id: string;
  type: "text" | "qa" | "hero";
  html: string;
  meta?: {
    question?: string;
    answer?: string;
  };
  createdAt?: string;
}

interface CmsPage {
  _id?: string;
  key: PageKey;
  title: string;
  type: PageType;
  sections: CmsSection[];
  updatedAt?: string;
}

/* ================= CONFIG ================= */

const PAGE_LIST: { key: PageKey; label: string }[] = [
  { key: "contact", label: "Contact Us" },
  { key: "faq", label: "FAQ" },
  { key: "shipping", label: "Shipping" },
  { key: "legal", label: "Legal & Privacy" },
  { key: "return-policy", label: "Return Policy" },
  { key: "sustainability", label: "Sustainability" },
  { key: "accessibility", label: "Accessibility" },
];

/* ================= MAIN ================= */

export default function ContentCompliancePage() {
  const API = process.env.NEXT_PUBLIC_BACKEND_API_URL!;
  
const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem("access_token");

  if (!token) {
    console.warn("❌ No access_token in sessionStorage");
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};




  const [activePage, setActivePage] = useState<PageKey>("contact");
  const [pageData, setPageData] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ================= FETCH PAGE ================= */

  useEffect(() => {
    fetchPage(activePage);
  }, [activePage]);

  const fetchPage = async (key: PageKey) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/pages/${key}`, {
        headers: getAuthHeaders(),
      
      });

      const data = await res.json();
      const page = data.page || {};

      setPageData({
        _id: page._id,
        key,
        title: page.title || PAGE_LIST.find((p) => p.key === key)?.label || "",
        type: page.type || inferPageType(key),
        sections: Array.isArray(page.sections)
          ? page.sections.map((s: any) => ({
              ...s,
              createdAt:
                s.createdAt ||
                page.createdAt ||
                new Date().toISOString(),
            }))
          : [],
        updatedAt: page.updatedAt,
      });
    } catch (err) {
      console.error("Fetch page failed:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SAVE PAGE ================= */

  const savePage = async () => {
    if (!pageData) return;

    setSaving(true);

    const res = await fetch(`${API}/api/admin/pages/${pageData.key}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        title: pageData.title,
        type: pageData.type,
        sections: pageData.sections,
      }),
      
    });

    if (!res.ok) {
      toast.error("Failed to save page");
      setSaving(false);
      return;
    }

    const data = await res.json();
    setPageData(data.page);

    toast.success("Page saved successfully");
    setSaving(false);
  };

  /* ================= SECTION HELPERS ================= */

  const addSection = (type: CmsSection["type"]) => {
    if (!pageData) return;

    setPageData({
      ...pageData,
      sections: [
        ...pageData.sections,
        {
          id: crypto.randomUUID(),
          type,
          html: "",
          meta: type === "qa" ? { question: "", answer: "" } : undefined,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  const updateSection = (id: string, html: string, meta?: any) => {
    if (!pageData) return;

    setPageData({
      ...pageData,
      sections: pageData.sections.map((s) =>
        s.id === id
          ? meta
            ? { ...s, meta }
            : { ...s, html }
          : s
      ),
    });
  };

  const removeSection = (id: string) => {
    if (!pageData) return;

    const ok = window.confirm("Remove this section?");
    if (!ok) return;

    setPageData({
      ...pageData,
      sections: pageData.sections.filter((s) => s.id !== id),
    });
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Content & Compliance Manager</h1>
        <p className="text-sm text-gray-500">
          Manage Contact, FAQ, Policies, About & Legal pages
        </p>
      </div>

      <div className="flex gap-8 ">
        {/* LEFT SIDEBAR */}
        <aside className="w-64 border rounded-xl p-4 space-y-2 bg-[var(--background-card)] dark:bg-[var(--bgCard)] ">
          <h3 className="font-semibold mb-3 text-sm text-gray-500">
            PAGES
          </h3>

          {PAGE_LIST.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePage(p.key)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                activePage === p.key
                  ? "bg-[var(--accent-green)] text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </aside>

        {/* MAIN EDITOR */}
        <main className="flex-1 border rounded-xl p-6 space-y-6 bg-[var(--background-card)] dark:bg-[var(--bgCard)] ">
          {loading || !pageData ? (
            <div className="text-gray-400">Loading page…</div>
          ) : (
            <>
              {/* TITLE */}
              <div>
                <label className="block text-sm mb-1 font-medium">
                  Page Title
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm bg-[var(--background-card)]"
                  value={pageData.title}
                  onChange={(e) =>
                    setPageData({ ...pageData, title: e.target.value })
                  }
                />
              </div>

              {/* ================= SECTION OVERVIEW TABLE ================= */}
              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 font-semibold bg-[var(--background-card)]  border-b">
                  Sections Overview
                </div>

                {pageData.sections.length === 0 ? (
                  <div className="p-4 text-sm bg-[var(--background-card)] text-gray-500">
                    No sections added yet.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--background-card)] border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Created</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.sections.map((s, idx) => (
                        <tr key={s.id} className="border-t">
                          <td className="px-3 py-2 text-gray-400">
                            {idx + 1}
                          </td>

                          <td className="px-3 py-2">
                            <span
                              className={`inline-block px-2 py-1 text-xs rounded ${
                                s.type === "qa"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {s.type.toUpperCase()}
                            </span>
                          </td>

                          <td className="px-3 py-2 text-gray-500">
                            {s.createdAt
                              ? new Date(s.createdAt).toLocaleString()
                              : "—"}
                          </td>

                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => removeSection(s.id)}
                              className="text-red-500 text-xs hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ================= SECTION EDITORS ================= */}
              <div className="space-y-8 ">
                {pageData.sections.map((section, idx) => (
                  <SectionEditor
                    key={section.id}
                    index={idx + 1}
                    section={section}
                    onChange={(html, meta) =>
                      updateSection(section.id, html, meta)
                    }
                    onRemove={() => removeSection(section.id)}
                  />
                ))}
              </div>

              {/* ADD SECTION */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => addSection("text")}
                  className="border px-4 py-2 rounded text-sm hover:bg-gray-50"
                >
                  + Add Text Section
                </button>

                {pageData.type === "faq" && (
                  <button
                    onClick={() => addSection("qa")}
                    className="border px-4 py-2 rounded text-sm hover:bg-gray-50"
                  >
                    + Add FAQ Section
                  </button>
                )}
              </div>

              {/* META */}
              {pageData.updatedAt && (
                <p className="text-xs text-gray-500">
                  Last updated:{" "}
                  {new Date(pageData.updatedAt).toLocaleString()}
                </p>
              )}

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  disabled={saving}
                  onClick={savePage}
                  className="bg-[var(--accent-green)] text-white px-6 py-2 rounded-lg disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Page"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ================= SECTION EDITOR ================= */

function SectionEditor({
  section,
  index,
  onChange,
  onRemove,
}: {
  section: CmsSection;
  index: number;
  onChange: (html: string, meta?: any) => void;
  onRemove: () => void;

}) {
  const isFAQ = section.type === "qa";
  const [question, setQuestion] = useState(section.meta?.question || "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: isFAQ
      ? section.meta?.answer || "<p></p>"
      : section.html || "<p></p>",
    onUpdate({ editor }) {
      const html = editor.getHTML();

      if (isFAQ) {
        onChange("", {
          question,
          answer: html,
        });
      } else {
        onChange(html);
      }
    },
  });

  return (
    <div className="border rounded-xl p-5 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-2">
        <div className="font-semibold text-sm">
          Section {index} — {section.type.toUpperCase()}
        </div>
        <button
          onClick={onRemove}
          className="text-red-500 text-xs hover:underline"
        >
          Remove Section
        </button>
      </div>

      {/* FAQ QUESTION */}
      {isFAQ && (
        <div>
          <label className="block text-xs font-medium mb-1  text-gray-600">
            Question
          </label>
          <input
            className="w-full border rounded px-3 bg-[var(--background-card)] dark:bg-[var(--bgCard)]  py-2 text-sm"
            value={question}
            onChange={(e) => {
              const q = e.target.value;
              setQuestion(q);
              onChange("", {
                question: q,
                answer: section.meta?.answer || "",
              });
            }}
            placeholder="Enter FAQ question"
          />
        </div>
      )}

      {/* ANSWER / CONTENT */}
      <div>
        <label className="block text-xs font-medium mb-1 text-gray-600">
          {isFAQ ? "Answer" : "Content"}
        </label>

        {/* TOOLBAR */}
        <div className="flex gap-2 border p-2 rounded  bg-[var(--background-card)] dark:bg-[var(--bgCard)] flex-wrap mb-2">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} label="B" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} label="I" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} label="U" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} label="• List" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} label="1. List" />
        </div>

        <EditorContent
          editor={editor}
          className="ProseMirror min-h-[150px] border rounded p-3 dark:bg-[var(--bgCard)]"
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 border rounded text-xs hover:bg-gray-200"
    >
      {label}
    </button>
  );
}
