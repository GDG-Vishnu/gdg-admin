"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mail,
  Linkedin,
  Pencil,
  X,
  Loader2,
  Save,
  Trash2,
  Upload,
  ArrowRightLeft,
  TrendingUp,
  History,
} from "lucide-react";

export type MemberHistoryEntry = {
  deptId: string;
  deptName: string;
  positionId: string;
  positionName: string;
  order: number;
  action: "assigned" | "promoted" | "transferred";
  effectiveDate: string;
  recordedAt: string;
  recordedBy?: string;
};

export type MemberCardProps = {
  id: string;
  name: string;
  imageUrl?: string | null;
  logo?: string | null;
  linkedinUrl?: string | null;
  mail?: string | null;
  isAlumni?: boolean;
  deptId: string;
  positionId: string;
  order: number;
  deptName?: string | null;
  deptBgColor?: string | null;
  deptLogo?: string | null;
  positionName?: string | null;
  positionLevel?: number | null;
  history?: MemberHistoryEntry[];
};

type Department = { id: string; name: string; bgColor: string; logo: string };
type PositionLevel = { id: string; name: string; level: number };

type MemberCardComponentProps = MemberCardProps & {
  onDelete?: (id: string) => void;
  onUpdate?: (updated?: Record<string, unknown>) => void;
};

export default function MemberCard({
  id,
  imageUrl,
  name,
  linkedinUrl,
  mail,
  logo,
  isAlumni,
  deptId,
  order,
  deptName,
  deptBgColor,
  positionName,
  positionLevel,
  history,
  onDelete,
  onUpdate,
}: MemberCardComponentProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<PositionLevel[]>([]);

  useEffect(() => {
    if (transferOpen || promoteOpen) {
      fetch("/api/admin/departments")
        .then((r) => r.json())
        .then((d) => Array.isArray(d) && setDepartments(d));
      fetch("/api/admin/positions")
        .then((r) => r.json())
        .then((d) => Array.isArray(d) && setPositions(d));
    }
  }, [transferOpen, promoteOpen]);

  return (
    <>
      <div className="w-[290px] rounded-lg overflow-hidden border border-border shadow-sm bg-card relative group">
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton label={`History for ${name}`} onClick={() => setHistoryOpen(true)}>
            <History className="w-4 h-4 text-stone-700" />
          </IconButton>
          <IconButton label={`Promote ${name}`} onClick={() => setPromoteOpen(true)}>
            <TrendingUp className="w-4 h-4 text-stone-700" />
          </IconButton>
          <IconButton label={`Transfer ${name}`} onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="w-4 h-4 text-stone-700" />
          </IconButton>
          <IconButton label={`Edit ${name}`} onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 text-stone-700" />
          </IconButton>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-200" />
            <div className="w-3 h-3 rounded-full bg-green-100" />
            <div className="w-3 h-3 rounded-full bg-yellow-100" />
          </div>
          {isAlumni && (
            <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              Alumni
            </div>
          )}
        </div>

        <div
          style={{ backgroundColor: deptBgColor || "#e6fffa" }}
          className="flex items-center justify-center h-[272px] w-[287px]"
        >
          <img
            src={
              imageUrl ||
              "https://res.cloudinary.com/duvr3z2z0/image/upload/v1764391657/Screenshot_2025-11-29_095727_wptmhb.png"
            }
            alt={String(name)}
            className="object-cover h-full w-full"
          />
        </div>

        <div className="px-4 py-3 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-card-foreground w-full text-lg font-productSans">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground">{deptName}</p>
          </div>
          <div className="flex justify-between items-center">
            <h1
              className="text-[20px] mt-1 font-productSans text-wrap"
              style={{ color: deptBgColor || "#38a169" }}
            >
              {positionName}
            </h1>

            <div className="flex space-x-3">
              {mail && (
                <a href={`mailto:${mail}`} aria-label={`Email ${name}`} className="p-2 rounded-md border border-border">
                  <Mail className="w-7 h-7 text-foreground" />
                </a>
              )}
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} on LinkedIn`}
                  className="p-2 rounded-md border border-border"
                >
                  <Linkedin className="w-7 h-7 text-foreground" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <EditDialog
          id={id}
          name={name}
          imageUrl={imageUrl}
          mail={mail}
          linkedinUrl={linkedinUrl}
          logo={logo}
          isAlumni={isAlumni}
          onClose={() => setEditOpen(false)}
          onDeleted={() => {
            setEditOpen(false);
            onDelete?.(id);
          }}
          onSaved={(updated) => {
            setEditOpen(false);
            onUpdate?.(updated);
          }}
        />
      )}

      {transferOpen && (
        <TransferDialog
          id={id}
          currentDeptId={deptId}
          currentOrder={order}
          departments={departments}
          positions={positions}
          onClose={() => setTransferOpen(false)}
          onDone={() => {
            setTransferOpen(false);
            onUpdate?.();
          }}
        />
      )}

      {promoteOpen && (
        <PromoteDialog
          id={id}
          currentLevel={positionLevel ?? null}
          positions={positions}
          onClose={() => setPromoteOpen(false)}
          onDone={() => {
            setPromoteOpen(false);
            onUpdate?.();
          }}
        />
      )}

      {historyOpen && (
        <HistoryDialog name={name} history={history ?? []} onClose={() => setHistoryOpen(false)} />
      )}
    </>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="p-1.5 rounded-md bg-card/80 border border-border hover:bg-card"
    >
      {children}
    </button>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative w-[90vw] max-w-lg max-h-[90vh] bg-card rounded-lg shadow-xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted" aria-label="Close">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        {children}
      </div>
    </div>
  );
}

function EditDialog({
  id,
  name,
  imageUrl,
  mail,
  linkedinUrl,
  logo,
  isAlumni,
  onClose,
  onDeleted,
  onSaved,
}: {
  id: string;
  name: string;
  imageUrl?: string | null;
  mail?: string | null;
  linkedinUrl?: string | null;
  logo?: string | null;
  isAlumni?: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onSaved: (updated: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    name: name || "",
    imageUrl: imageUrl || "",
    mail: mail || "",
    linkedinUrl: linkedinUrl || "",
    logo: logo || "",
    isAlumni: isAlumni ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Upload failed");
      else setForm((p) => ({ ...p, imageUrl: data.url }));
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Update failed");
      else onSaved(data);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Delete failed");
      else onDeleted();
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="text-xl font-bold text-foreground mb-4">Edit Member</h2>
      <div className="space-y-3">
        <img
          src={form.imageUrl || "https://res.cloudinary.com/duvr3z2z0/image/upload/v1764391657/Screenshot_2025-11-29_095727_wptmhb.png"}
          alt={form.name}
          className="w-full max-h-[200px] object-contain rounded-md"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-md bg-card/80 hover:bg-card disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>
        <Field label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
        <Field label="Email" value={form.mail} onChange={(v) => setForm((p) => ({ ...p, mail: v }))} type="email" />
        <Field
          label="LinkedIn URL"
          value={form.linkedinUrl}
          onChange={(v) => setForm((p) => ({ ...p, linkedinUrl: v }))}
          type="url"
        />
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id={`isAlumni-${id}`}
            checked={form.isAlumni}
            onChange={(e) => setForm((p) => ({ ...p, isAlumni: e.target.checked }))}
            className="w-4 h-4 rounded border-border"
          />
          <label htmlFor={`isAlumni-${id}`} className="text-sm font-medium text-foreground">
            Is Alumni?
          </label>
        </div>
      </div>

      <div className="pt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || deleting}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={saving || deleting}
            className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground rounded-md hover:bg-muted disabled:opacity-50 text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
            <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="px-3 py-2 text-sm text-muted-foreground">
              Cancel
            </button>
          </div>
        )}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </Overlay>
  );
}

function TransferDialog({
  id,
  currentDeptId,
  currentOrder,
  departments,
  positions,
  onClose,
  onDone,
}: {
  id: string;
  currentDeptId: string;
  currentOrder: number;
  departments: Department[];
  positions: PositionLevel[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [deptId, setDeptId] = useState(currentDeptId);
  const [positionId, setPositionId] = useState("");
  const [order, setOrder] = useState<number | "">(currentOrder);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deptId || !positionId) {
      setError("Department and position are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deptId,
          positionId,
          order: order === "" ? undefined : order,
          effectiveDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Transfer failed");
      else onDone();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="text-xl font-bold text-foreground mb-4">Transfer Member</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <SelectField label="Department *" value={deptId} onChange={setDeptId}>
          <option value="">Select department...</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Position *" value={positionId} onChange={setPositionId}>
          <option value="">Select position...</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Order within department (optional)"
          value={String(order)}
          onChange={(v) => setOrder(v === "" ? "" : Number(v))}
          type="number"
        />
        <Field label="Effective date *" value={effectiveDate} onChange={setEffectiveDate} type="date" />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
          {saving ? "Transferring..." : "Transfer"}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </Overlay>
  );
}

function PromoteDialog({
  id,
  currentLevel,
  positions,
  onClose,
  onDone,
}: {
  id: string;
  currentLevel: number | null;
  positions: PositionLevel[];
  onClose: () => void;
  onDone: () => void;
}) {
  const eligible = positions.filter((p) => currentLevel == null || p.level < currentLevel);
  const [positionId, setPositionId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!positionId) {
      setError("Select a position to promote to");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId, effectiveDate }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Promotion failed");
      else onDone();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="text-xl font-bold text-foreground mb-4">Promote Member</h2>
      {eligible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This member already holds the highest available position in the hierarchy.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <SelectField label="New position *" value={positionId} onChange={setPositionId}>
            <option value="">Select position...</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <Field label="Date of promotion *" value={effectiveDate} onChange={setEffectiveDate} type="date" />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {saving ? "Promoting..." : "Promote"}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      )}
    </Overlay>
  );
}

function HistoryDialog({
  name,
  history,
  onClose,
}: {
  name: string;
  history: MemberHistoryEntry[];
  onClose: () => void;
}) {
  const sorted = [...history].sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
  return (
    <Overlay onClose={onClose}>
      <h2 className="text-xl font-bold text-foreground mb-4">{name}&apos;s History</h2>
      <div className="space-y-3">
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">No history recorded yet.</p>}
        {sorted.map((h, i) => (
          <div key={i} className="border-l-2 border-primary/40 pl-3 py-1">
            <p className="text-sm font-medium capitalize">{h.action}</p>
            <p className="text-sm text-muted-foreground">
              {h.positionName} · {h.deptName}
            </p>
            <p className="text-xs text-muted-foreground">Effective {h.effectiveDate}</p>
          </div>
        ))}
      </div>
    </Overlay>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {children}
      </select>
    </div>
  );
}
