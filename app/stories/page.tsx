"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  Plus,
  Trash2,
  Edit3,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  GripVertical,
  X,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import Placeholder from "@tiptap/extension-placeholder";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Extension } from "@tiptap/core";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import UnderlineExtension from "@tiptap/extension-underline";

const GmailShortcuts = Extension.create({
  addKeyboardShortcuts() {
    return {
      // TEXT
      "Mod-b": () => this.editor.commands.toggleBold(),
      "Mod-i": () => this.editor.commands.toggleItalic(),
      "Mod-u": () => this.editor.commands.toggleUnderline(),

      // LISTS (Gmail style)
      "Mod-Shift-8": () => this.editor.commands.toggleBulletList(),
      "Mod-Shift-7": () => this.editor.commands.toggleOrderedList(),

      // LINK
      "Mod-k": () => {
        const url = window.prompt("Enter link");
        if (!url) return false;
        return this.editor.commands.setLink({ href: url });
      },

      // ALIGNMENT
      "Mod-Shift-l": () => this.editor.commands.setTextAlign("left"),
      "Mod-Shift-e": () => this.editor.commands.setTextAlign("center"),
      "Mod-Shift-r": () => this.editor.commands.setTextAlign("right"),

      // HISTORY
      "Mod-z": () => this.editor.commands.undo(),
      "Mod-Shift-z": () => this.editor.commands.redo(),
    };
  },
});
/* ================= TYPES ================= */
type Story = {
  published: any;
  _id: string;
  title: string;
  subtitle?: string;
  content: string;
  coverImage?: string;
  images?: string[];
  createdAt: string;
};

type ImageItem = {
  id: string;
  file: File | null;
  preview: string;
};

function ToolbarButton({
  onClick,
  icon,
  label,
  shortcut,
  active,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative group p-1 rounded
       ${active
          ? "bg-gray-300 dark:bg-gray-700"
          : "hover:bg-gray-200 text-white dark:hover:bg-gray900"}

      `}
    >
      {icon}
      <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-green text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
        {label} ({shortcut})
      </div>
    </button>
  );
}

/* ================= SORTABLE IMAGE ================= */
function SortableImage({
  item,
  onRemove,
}: {
  item: ImageItem;
  onRemove: () => void;
}) {

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative w-32 h-32 rounded-lg overflow-hidden border bg-gray-100"
    >
      <img src={item.preview} className="w-full h-full object-cover" />

      <button
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 bg-black/60 text-white p-1 rounded cursor-grab"
      >
        <GripVertical size={14} />
      </button>

      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded"
      >
        <X size={14} />
      </button>
    </div>
  );
}



/* ================= COMPONENT ================= */
export default function AdminStories() {
  const API = process.env.NEXT_PUBLIC_BACKEND_API_URL!;
const getAuthHeaders = (): Record<string, string> => {
  const t =
    (typeof window !== "undefined" && (sessionStorage.getItem("access_token") || localStorage.getItem("access_token"))) ||
    null;
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
};

const [previewStory, setPreviewStory] = useState<Story | null>(null);

  const [stories, setStories] = useState<Story[]>([]);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");

  const [coverImage, setCoverImage] = useState<ImageItem | null>(null);
  const [galleryImages, setGalleryImages] = useState<ImageItem[]>([]);

  /* ================= TIPTAP ================= */

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      UnderlineExtension,
      BulletList,
      OrderedList,
      ListItem,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Write your story here…",
      }),
      GmailShortcuts,
    ],
    content: "<p></p>",
    onUpdate({ editor }) {
      setContent(editor.getHTML());
    },
  });





  /* ================= FETCH ================= */
  const fetchStories = async () => {
    const res = await fetch(`${API}/api/admin/stories`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    const data = await res.json();
    setStories(data.stories || []);
  };

  useEffect(() => {
    fetchStories();
  }, []);

  /* ================= AUTOSAVE ================= */
  useEffect(() => {
    if (!editor) return;
    const id = setInterval(() => {
      sessionStorage.setItem(
        "story_draft",
        JSON.stringify({ title, subtitle, content })
      );
    }, 3000);
    return () => clearInterval(id);
  }, [title, subtitle, content, editor]);

  useEffect(() => {
    if (!editor || editingStory) return;
    const saved = sessionStorage.getItem("story_draft");
    if (!saved) return;
    const d = JSON.parse(saved);
    setTitle(d.title || "");
    setSubtitle(d.subtitle || "");
    editor.commands.setContent(d.content || "<p></p>");
  }, [editor]);

  /* ================= EDIT ================= */
  const openEditStory = (story: Story) => {
    setEditingStory(story);
    setShowForm(true);

    setTitle(story.title || "");
    setSubtitle(story.subtitle || "");
    editor?.commands.setContent(story.content || "<p></p>");

    setCoverImage(
      story.coverImage
        ? { id: crypto.randomUUID(), file: null, preview: story.coverImage }
        : null
    );

    setGalleryImages(
      story.images?.map((url) => ({
        id: crypto.randomUUID(),
        file: null,
        preview: url,
      })) || []
    );
  };

  /* ================= SUBMIT ================= */
  const submit = async () => {
    if (!title || !content) return alert("Title & content required");
    if (!editingStory && !coverImage)
      return alert("Cover image required");

    setLoading(true);

    const fd = new FormData();
    fd.append("title", title);
    fd.append("subtitle", subtitle);
    fd.append("content", content);

    if (coverImage?.file) fd.append("coverImage", coverImage.file);
    galleryImages.forEach((i) => i.file && fd.append("images", i.file));

    await fetch(
      editingStory
        ? `${API}/api/admin/stories/${editingStory._id}`
        : `${API}/api/admin/stories/create`,
      {
        method: editingStory ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: fd,
        credentials: "include",
      }
    );


    resetForm();
    fetchStories();
    setLoading(false);
  };

  /* ================= RESET ================= */
  const resetForm = () => {
    sessionStorage.removeItem("story_draft");
    setShowForm(false);
    setEditingStory(null);
    setTitle("");
    setSubtitle("");
    editor?.commands.setContent("<p></p>");
    setCoverImage(null);
    setGalleryImages([]);
  };

  /* ================= DELETE ================= */
  const deleteStory = async (id: string) => {
    if (!confirm("Delete story?")) return;

    try {
      const res = await fetch(`${API}/api/admin/stories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Delete failed");
      }

      // 🔥 Refresh list after delete
      fetchStories();
    } catch (err: any) {
      alert("❌ " + err.message);
    }
  };



  return (
    <ProtectedRoute permissions={["manage_stories"]}>
      <div className="min-h-screen">
        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <h1 className="text-2xl font-bold">Stories</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-black font-medium rounded-lg hover:opacity-90 flex items-center gap-2"
            style={{ backgroundColor: "#A0EDA8" }}
          >
            <Plus size={16} /> Create Story
          </button>
        </div>

        {/* LIST */}
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-gray-100 border-b text-left">
        <th className="px-4 py-3 font-bold text-gray-600 ">Title</th>
        <th className="px-4 py-3 font-bold text-gray-600">Created</th>
        <th className="px-4 py-3 font-bold text-gray-600">Status</th>
        <th className="px-4 py-3 font-bold text-gray-600">
          Actions
        </th>
      </tr>
    </thead>

    <tbody>
      {stories.map((s) => (
        <tr
          key={s._id}
          className="border-b hover:bg-gray-50 transition"
        >
          {/* TITLE */}
          <td className="px-4 py-3 font-medium text-gray-800">
            {s.title}
          </td>

          {/* CREATED DATE */}
          <td className="px-4 py-3 text-gray-500">
            {new Date(s.createdAt).toLocaleDateString()}
          </td>

          {/* STATUS (example: Published/Draft) */}
          <td className="px-4 py-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                s.published
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {s.published ? "Published" : "Draft"}
            </span>
          </td>

          {/* ACTIONS */}
          <td className="px-4 py-3">
            <div className="inline-flex items-center gap-2">
              <button
      onClick={() => setPreviewStory(s)}
      className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
      title="Preview"
    >
    <FileSpreadsheet size={16} />
    </button>
              <button
                onClick={() => openEditStory(s)}
                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                title="Edit"
              >
                <Edit3 size={16} />
              </button>

              <button
                onClick={() => deleteStory(s._id)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

{previewStory && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={() => setPreviewStory(null)}
  >
    <div
      className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl relative"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Story Preview</h2>
        <button
          onClick={() => setPreviewStory(null)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* BODY */}
      <div className="p-6 space-y-6">

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {previewStory.title}
          </h1>
          {previewStory.subtitle && (
            <p className="text-gray-600">
              {previewStory.subtitle}
            </p>
          )}
        </div>

        {/* Cover Image */}
        {previewStory.coverImage && (
          <div className="w-full rounded-lg overflow-hidden border">
            <img
              src={previewStory.coverImage}
              alt={previewStory.title}
              className="w-full max-h-[400px] object-cover"
            />
          </div>
        )}

        {/* Content (HTML render) */}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: previewStory.content }}
        />

        {/* Gallery */}
        {previewStory.images && previewStory.images.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Gallery</h3>
            <div className="grid grid-cols-3 gap-3">
              {previewStory.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  className="w-full h-32 object-cover rounded-lg border"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}

        {/* FORM */}
        {showForm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl relative">

      {/* HEADER */}
      <div className="flex justify-between items-center px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">
          {editingStory ? "Edit Story" : "Create Story"}
        </h2>
        <button
          onClick={resetForm}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* BODY */}
      <div className="p-6">
          <div className="border p-6 rounded-lg bg-white">
            <input
              className="w-full mb-2 p-2 border rounded"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              className="w-full mb-4 p-2 border rounded"
              placeholder="Subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />

            {/* COVER IMAGE */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-1">Cover Image</p>
              {!coverImage ? (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files &&
                    setCoverImage({
                      id: crypto.randomUUID(),
                      file: e.target.files[0],
                      preview: URL.createObjectURL(e.target.files[0]),
                    })
                  }
                />
              ) : (
                <SortableImage
                  item={coverImage}
                  onRemove={() => setCoverImage(null)}
                />
              )}
            </div>

            {/* GALLERY */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-1">Gallery Images</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (!e.target.files) return;
                  const items = Array.from(e.target.files).map((file) => ({
                    id: crypto.randomUUID(),
                    file,
                    preview: URL.createObjectURL(file),
                  }));
                  setGalleryImages((prev) => [...prev, ...items]);
                }}
              />

              {galleryImages.length > 0 && (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => {
                    if (!e.over) return;
                    setGalleryImages((items) =>
                      arrayMove(
                        items,
                        items.findIndex((i) => i.id === e.active.id),
                        items.findIndex((i) => i.id === e.over?.id)
                      )
                    );
                  }}
                >
                  <SortableContext
                    items={galleryImages.map((i) => i.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {galleryImages.map((img) => (
                        <SortableImage
                          key={img.id}
                          item={img}
                          onRemove={() =>
                            setGalleryImages((prev) =>
                              prev.filter((i) => i.id !== img.id)
                            )
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* TOOLBAR (GMAIL STYLE) */}
            <div className="flex gap-2 mb-2 border p-2 rounded bg-gray-50 dark:bg-[#1a1a1a]">
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBold().run()}
                icon={<Bold size={16} />}
                label="Bold"
                shortcut="Ctrl + B"
                active={editor?.isActive("bold")}
              />

              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                icon={<Italic size={16} />}
                label="Italic"
                shortcut="Ctrl + I"
                active={editor?.isActive("italic")}
              />

              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleUnderline().run()
                }
                icon={<Underline size={16} />}
                label="Underline"
                shortcut="Ctrl + U"
                active={editor?.isActive("underline")}
              />

              <div className="w-px bg-gray-300 mx-1" />

              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                icon={<List size={16} />}
                label="Bulleted list"
                shortcut="Ctrl + Shift + 8"
                active={editor?.isActive("bulletList")}

              />

              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                icon={<ListOrdered size={16} />}
                label="Numbered list"
                shortcut="Ctrl + Shift + 7"
                active={editor?.isActive("orderedList")}
              />

              <div className="w-px bg-gray-300 mx-1" />

              <ToolbarButton
                onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                icon={<AlignLeft size={16} />}
                label="Align left"
                shortcut="Ctrl + Shift + L"
                active={editor?.isActive({ textAlign: "left" })}
              />

              <ToolbarButton
                onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                icon={<AlignCenter size={16} />}
                label="Align center"
                shortcut="Ctrl + Shift + E"
                active={editor?.isActive({ textAlign: "center" })}
              />

              <ToolbarButton
                onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                icon={<AlignRight size={16} />}
                label="Align right"
                shortcut="Ctrl + Shift + R"
                active={editor?.isActive({ textAlign: "right" })}

              />

              <div className="w-px bg-gray-300 mx-1" />

              <ToolbarButton
                onClick={() => {
                  const url = prompt("Enter link");
                  if (url) editor?.chain().focus().setLink({ href: url }).run();
                }}
                icon={<Link2 size={16} />}
                label="Insert link"
                shortcut="Ctrl + K"
              />
            </div>

            <EditorContent
              editor={editor}
              className="ProseMirror min-h-[260px] border rounded p-3"
            />


            <div className="flex justify-end gap-3 mt-4">
              <button onClick={resetForm}>Cancel</button>
              <button
                onClick={submit}
                className="bg-[#A0EDA8] text-white px-4 py-2 rounded"
              >
                {loading ? "Saving..." : "Publish"}
              </button>
            </div>
          </div>
          </div>
    </div>
  </div>
)}
      </div>
    </ProtectedRoute>
  );
}
