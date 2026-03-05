"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Rnd } from "react-rnd";
import toast from "react-hot-toast";
/* ================= TYPES ================= */

type BlockType = "text" | "image" | "button";

interface Block {
  id: string;
  type: BlockType;
  content?: string;
  src?: string;
  url?: string;

  color: string;
  bgColor: string;
  fontSize: number;
  padding: number;

  width?: number;     // ✅ ADD
  height?: number;    // ✅ ADD

  alignX: "left" | "center" | "right";
  alignY: "top" | "middle" | "bottom";
  radius: number;
}


interface CanvasStyle {
  background: string;
  border: boolean;
  shadow: "none" | "sm" | "lg";
}

/* ================= SORTABLE BLOCK ================= */

function SortableBlock({
  block,
  selected,
  onSelect,
  onUpdate, // ✅ ADD
}: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, patch: Partial<Block>) => void;
}) {

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`border p-3 mb-2 ${selected ? "border-black" : "border-dashed"
        }`}
      onClick={(e) => {
        e.stopPropagation();     // ✅ IMPORTANT
        onSelect();              // ✅ always select
      }}
    >
      {/* Drag handle ONLY */}
      <div
        {...attributes}
        {...listeners}
        className="text-xs cursor-move text-gray-400 mb-1"
      >
        Drag
      </div>

      {block.type === "text" && block.content}
      {block.type === "image" && block.src && (
        <div className="relative border border-dashed p-2 bg-white">
        <Rnd
          size={{
            width: block.width || 600,
            height: block.height || 300,
          }}
          bounds="parent"
          enableResizing={{
            right: true,
            bottom: true,
            bottomRight: true,
          }}
          onResizeStop={(_, __, ref) => {
            onUpdate(block.id, {
              width: ref.offsetWidth,
              height: ref.offsetHeight,
            });
          }}
        >
          <img
            src={block.src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </Rnd>
        </div>
      )}


      {block.type === "button" && (
        <button className="bg-black text-white px-4 py-2">
          {block.content}
        </button>
      )}
    </div>
  );
}



/* ================= MAIN ================= */

export default function EmailTemplateBuilder() {
  const API = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  const sensors = useSensors(useSensor(PointerSensor));

  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [whiteLabel, setWhiteLabel] = useState(false);

  const [history, setHistory] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);

  const [canvasStyle, setCanvasStyle] = useState<CanvasStyle>({
    background: "#ffffff",
    border: true,
    shadow: "sm",
  });
const [newsletterId, setNewsletterId] = useState<string | null>(null);

  const selectedBlock = blocks.find(b => b.id === selectedId) || null;

  /* ================= BLOCK HELPERS ================= */

  const add = (type: BlockType) => {
    commit([
      ...blocks,
      {
        id: crypto.randomUUID(),
        type,
        content: type !== "image" ? "Edit text" : "",
        fontSize: 16,
        padding: 16,
        color: "#000",
        bgColor: type === "button" ? "#000" : "#fff",
        width: type === "image" ? 600 : undefined,
        height: type === "image" ? 300 : undefined,
        alignX: "center",
        alignY: "middle",
        radius: 6,
      },
    ]);
  };
  const commit = (next: Block[]) => {
    setHistory(h => [...h, blocks]);
    setFuture([]);
    setBlocks(next);
  };


  const update = (id: string, patch: Partial<Block>) =>
    commit(blocks.map(b => (b.id === id ? { ...b, ...patch } : b)));


  const duplicate = () => {
    if (!selectedBlock) return;
    setBlocks(b => [...b, { ...selectedBlock, id: crypto.randomUUID() }]);
  };

  const remove = () => {
    if (!selectedId) return;
    commit(blocks.filter(b => b.id !== selectedId));
    setSelectedId(null);
  };



  /* ================= DND ================= */

  const onDragEnd = (e: any) => {
    if (!e.over) return;
    if (e.active.id !== e.over.id) {
      setBlocks(items => {
        const oldIndex = items.findIndex(i => i.id === e.active.id);
        const newIndex = items.findIndex(i => i.id === e.over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  /* ================= IMAGE UPLOAD ================= */

const uploadImage = async (file: File, blockId: string) => {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API}/api/admin/media/upload`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  const { url } = await res.json();
  update(blockId, { src: url });
};


  /* ================= SPAM SCORE ================= */

  const spamScore = useMemo(() => {
    let score = 0;
    const text = blocks.map(b => b.content || "").join(" ").toLowerCase();

    if (text.includes("free")) score += 20;
    if (text.includes("buy now")) score += 20;
    if (text === text.toUpperCase()) score += 15;
    if (blocks.filter(b => b.type === "image").length === blocks.length)
      score += 30;

    return Math.min(score, 100);
  }, [blocks]);

  /* ================= EMAIL HTML ================= */

  const html = useMemo(
    () => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:${canvasStyle.background}">
${blocks.map(b => {
      const valign =
        b.alignY === "top" ? "top" : b.alignY === "bottom" ? "bottom" : "middle";

      if (b.type === "text")
        return `<tr><td valign="${valign}" align="${b.alignX}" style="padding:${b.padding}px;font-size:${b.fontSize}px;color:${b.color}">${b.content}</td></tr>`;

      if (b.type === "image")
        return `<tr><td align="center" style="padding:${b.padding}px"><img
  src="${b.src}"
  width="${b.width || 600}"
  height="${b.height || ""}"
  style="display:block;margin:auto;border:0"
/>
</td></tr>`;

      if (b.type === "button")
        return `<tr><td align="${b.alignX}" style="padding:${b.padding}px"><a href="${b.url || "#"}" style="background:${b.bgColor};color:#fff;padding:12px 24px;border-radius:${b.radius}px;text-decoration:none">${b.content}</a></td></tr>`;
    }).join("")}
${whiteLabel ? "" : `<tr><td style="font-size:12px;color:#888;text-align:center;padding:10px">KZARRE</td></tr>`}
</table></td></tr></table>
`,
    [blocks, canvasStyle, whiteLabel]
  );

  /* ================= SEND ================= */
const saveNewsletter = async (status: "draft" | "send") => {
if (!subject.trim()) {
  toast.error("Email subject is required");
  return null;
}

  const res = await fetch(`${API}/api/admin/campaign/newsletter`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      content: html,
      blocks,
      status, // ✅ now valid
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    toast.error(data.message || "Failed to save newsletter");
    return null;
  }

  return data.newsletter;
};


const sendCampaign = async (type: "test" | "send") => {
  let id = newsletterId;

  // ✅ If not saved yet → save first
  if (!id) {

   const saved = await saveNewsletter(type === "test" ? "draft" : "send");
    if (!saved) return;
    id = saved._id;
    setNewsletterId(id);
  }

  const res = await fetch(`${API}/api/admin/campaign/send`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newsletterId: id,                // ✅ NOW EXISTS
      testEmail: type === "test" ? "devwithabhijeet@gmail.com" : undefined,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    toast.error(data.message || "Send failed");
    return;
  }

  toast.error(type === "test" ? "Test email sent" : "Campaign sent");
};



  /* ================= UI ================= */

  return (
    <div>
    <div className="grid grid-cols-[260px_1fr_380px] gap-6 p-6 bg-gray-50 min-h-screen">

      {/* LEFT */}
      <div className="bg-white border p-4 space-y-2">
        <button onClick={() => add("text")} className="border p-2 w-full">+ Text</button>
        <button onClick={() => add("image")} className="border p-2 w-full">+ Image</button>
        <button onClick={() => add("button")} className="border p-2 w-full">+ Button</button>
        <div className="flex gap-2">
          <button
            disabled={!history.length}
            className="border px-2 disabled:opacity-50"
            onClick={() => {
              const prev = history.at(-1)!;
              setHistory(h => h.slice(0, -1));
              setFuture(f => [blocks, ...f]);
              setBlocks(prev);
            }}
          >
            Undo
          </button>

          <button
            disabled={!future.length}
            className="border px-2 disabled:opacity-50"
            onClick={() => {
              const next = future[0];
              setFuture(f => f.slice(1));
              setHistory(h => [...h, blocks]);
              setBlocks(next);
            }}
          >
            Redo
          </button>
        </div>


        <input className="border p-2 w-full mt-2"
          placeholder="Template name"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)} />

        <label className="flex gap-2 text-sm mt-2">
          <input type="checkbox" checked={whiteLabel}
            onChange={e => setWhiteLabel(e.target.checked)} />
          White-label
        </label>
      </div>

      {/* CANVAS */}
      <div>
        <DndContext onDragEnd={onDragEnd}>
          <SortableContext
            items={blocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map(b => (
              <SortableBlock
                key={b.id}              // ✅ React
                block={b}               // ✅ UI
                selected={b.id === selectedId}
                onSelect={() => setSelectedId(b.id)}
                 onUpdate={update}
              />
            ))}
          </SortableContext>
        </DndContext>

      </div>

      {/* INSPECTOR + PREVIEW */}
      <div className="bg-white border p-4 space-y-3">
        <h3 className="font-semibold">Inspector</h3>

        {selectedBlock ? (
          <div className="space-y-3">

            {/* TEXT CONTENT */}
            {selectedBlock.type === "text" && (
              <>
                <label className="text-sm font-medium">Text</label>
                <textarea
                  className="border p-2 w-full resize-none"
                  rows={3}
                  value={selectedBlock.content ?? ""}
                  onChange={e =>
                    update(selectedBlock.id, { content: e.target.value })
                  }
                />
              </>
            )}

            {/* IMAGE CONTROLS */}
            {selectedBlock.type === "image" && (
              <>
                <label className="text-sm font-medium">Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e =>
                    e.target.files &&
              uploadImage(e.target.files[0], selectedBlock.id)

                  }
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs">Width (px)</label>
                    <input
                      type="number"
                      className="border p-2 w-full"
                      value={selectedBlock.width ?? 600}
                      onChange={e =>
                        update(selectedBlock.id, { width: +e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs">Height (px)</label>
                    <input
                      type="number"
                      className="border p-2 w-full"
                      value={selectedBlock.height ?? 300}
                      onChange={e =>
                        update(selectedBlock.id, { height: +e.target.value })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {/* BUTTON CONTROLS */}
            {selectedBlock.type === "button" && (
              <>
                <label className="text-sm font-medium">Button Text</label>
                <input
                  className="border p-2 w-full"
                  value={selectedBlock.content ?? ""}
                  onChange={e =>
                    update(selectedBlock.id, { content: e.target.value })
                  }
                />

                <label className="text-sm font-medium">Button URL</label>
                <input
                  className="border p-2 w-full"
                  placeholder="https://example.com"
                  value={selectedBlock.url ?? ""}
                  onChange={e =>
                    update(selectedBlock.id, { url: e.target.value })
                  }
                />
              </>
            )}

            {/* ALIGNMENT */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs">Horizontal Align</label>
                <select
                  className="border p-2 w-full"
                  value={selectedBlock.alignX}
                  onChange={e =>
                    update(selectedBlock.id, { alignX: e.target.value as any })
                  }
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <label className="text-xs">Vertical Align</label>
                <select
                  className="border p-2 w-full"
                  value={selectedBlock.alignY}
                  onChange={e =>
                    update(selectedBlock.id, { alignY: e.target.value as any })
                  }
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>

            {/* TEXT STYLES */}
            {selectedBlock.type !== "image" && (
              <>
                <label className="text-xs">Text Color</label>
                <input
                  type="color"
                  value={selectedBlock.color}
                  onChange={e =>
                    update(selectedBlock.id, { color: e.target.value })
                  }
                />

                <label className="text-xs">Font Size (px)</label>
                <input
                  type="number"
                  className="border p-2 w-full"
                  value={selectedBlock.fontSize}
                  onChange={e =>
                    update(selectedBlock.id, { fontSize: +e.target.value })
                  }
                />
              </>
            )}

            {/* ACTIONS */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={duplicate}
                className="border px-3 py-1 text-sm"
              >
                Duplicate
              </button>

              <button
                onClick={remove}
                className="border px-3 py-1 text-sm text-red-600"
              >
                ✕ Delete
              </button>
            </div>

          </div>
        ) : (
          <p className="text-sm text-gray-400">Select a block</p>
        )}


        <hr />

        <input className="border p-2 w-full"
          placeholder="Email subject"
          value={subject}
          onChange={e => setSubject(e.target.value)} />

        <div className="text-sm">
          Spam score: <b className={spamScore > 50 ? "text-red-600" : "text-green-600"}>{spamScore}/100</b>
        </div>

        <div className="flex gap-2">
          <button className="border px-2" onClick={() => setPreviewMode("desktop")}>Desktop</button>
          <button className="border px-2" onClick={() => setPreviewMode("mobile")}>Mobile</button>
        </div>

       

        <button onClick={() => sendCampaign("test")} className="border p-2 w-full">
          Send Test
        </button>
        <button onClick={() => sendCampaign("send")} className="bg-black text-white p-2 w-full">
          Send Campaign
        </button>
        
      </div>
      
    </div>
     <iframe
          className="border"
          style={{ width: previewMode === "mobile" ? 375 : "100%", height: 420 }}
          srcDoc={html}
        />
    </div>
    
  );
}
