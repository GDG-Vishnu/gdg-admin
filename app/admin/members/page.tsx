"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/layout/PageHeader";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Loader2,
  Plus,
  X,
  Save,
  Upload,
} from "lucide-react";
import GoogleLoader from "@/components/GoogleLoader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MemberCard, {
  type MemberCardProps,
} from "@/components/admin/cards/MemberCard";

type Department = { id: string; name: string; order: number; bgColor: string; logo: string };
type PositionLevel = { id: string; name: string; level: number };

const EMPTY_FORM = {
  name: "",
  mail: "",
  linkedinUrl: "",
  imageUrl: "",
  logo: "",
  isAlumni: false,
  deptId: "",
  positionId: "",
};

export default function MembersPage() {
  const [members, setMembers] = useState<MemberCardProps[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<PositionLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addUploading, setAddUploading] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/members", { cache: "no-store" });
      const json = await res.json();
      if (Array.isArray(json)) {
        setMembers(json);
        setError(null);
      } else if (json.error) {
        setError(json.error);
      } else {
        setError("Unexpected response format");
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setError("Network error fetching members");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    const [deptRes, posRes] = await Promise.all([
      fetch("/api/admin/departments", { cache: "no-store" }),
      fetch("/api/admin/positions", { cache: "no-store" }),
    ]);
    const [depts, poss] = await Promise.all([deptRes.json(), posRes.json()]);
    if (Array.isArray(depts)) setDepartments(depts.sort((a, b) => a.order - b.order));
    if (Array.isArray(poss)) setPositions(poss.sort((a, b) => a.level - b.level));
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchLookups();
  }, [fetchMembers, fetchLookups]);

  function openAddDialog() {
    setAddForm({ ...EMPTY_FORM, deptId: departments[0]?.id ?? "", positionId: positions[0]?.id ?? "" });
    setCreateError(null);
    setAddOpen(true);
  }

  function handleAddChange(field: string, value: string | boolean) {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddImageUpload(file: File) {
    setAddUploading(true);
    setCreateError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Upload failed");
      } else {
        handleAddChange("imageUrl", data.url);
      }
    } catch {
      setCreateError("Image upload failed");
    } finally {
      setAddUploading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim()) {
      setCreateError("Name is required");
      return;
    }
    if (!addForm.deptId) {
      setCreateError("Department is required");
      return;
    }
    if (!addForm.positionId) {
      setCreateError("Position is required");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create member");
      } else {
        setAddOpen(false);
        fetchMembers();
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  }

  function handleDelete(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function handleUpdate(updatedMember?: Record<string, unknown>) {
    if (updatedMember && updatedMember.id && !updatedMember.deptId) {
      // Basic-field edit (PATCH) returns a partial — merge it in directly.
      setMembers((prev) =>
        prev.map((m) => (m.id === updatedMember.id ? { ...m, ...updatedMember } : m)),
      );
    } else {
      // Transfer/promote changed dept or position — refetch for the join.
      fetchMembers();
    }
  }

  const filtered = search.trim()
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.positionName || "").toLowerCase().includes(search.toLowerCase()) ||
          (m.deptName || "").toLowerCase().includes(search.toLowerCase()) ||
          (m.mail || "").toLowerCase().includes(search.toLowerCase()),
      )
    : members;

  const stats = [
    { title: "Total Members", value: String(members.length), description: "All team members", icon: Users },
    {
      title: "With LinkedIn",
      value: String(members.filter((m) => m.linkedinUrl).length),
      description: "Profiles linked",
      icon: UserPlus,
    },
    {
      title: "With Email",
      value: String(members.filter((m) => m.mail).length),
      description: "Contactable",
      icon: UserCheck,
    },
    {
      title: "Departments",
      value: String(departments.length),
      description: "Active departments",
      icon: UserX,
    },
  ];

  function renderGroup(groupMembers: MemberCardProps[], isAlumniGroup: boolean) {
    const grouped = groupMembers.reduce<Record<string, MemberCardProps[]>>((acc, member) => {
      const key = member.deptId || "unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(member);
      return acc;
    }, {});

    const sortedEntries = Object.entries(grouped).sort((a, b) => {
      const deptA = departments.find((d) => d.id === a[0]);
      const deptB = departments.find((d) => d.id === b[0]);
      return (deptA?.order ?? 999) - (deptB?.order ?? 999);
    });

    sortedEntries.forEach(([, groupMembers]) => {
      groupMembers.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return (a.name || "").localeCompare(b.name || "");
      });
    });

    return sortedEntries.map(([deptId, groupMembers]) => {
      const deptName = groupMembers[0]?.deptName || "Unassigned";
      const deptBgColor = groupMembers[0]?.deptBgColor;
      return (
        <section key={`${isAlumniGroup ? "alumni" : "active"}-${deptId}`} className="flex flex-col items-center w-full">
          <div
            style={{ backgroundColor: deptBgColor || undefined }}
            className="w-[330px] h-[54px] sm:w-[370px] lg:w-[800px] text-center rounded-[100px] items-center justify-center flex border-2 border-foreground"
          >
            <h2 className="text-xl font-semibold sm:m-1 p-2 text-center text-foreground">{deptName}</h2>
          </div>
          <div className="h-4" />
          <div className="w-full px-4 flex flex-wrap gap-6 justify-center">
            {groupMembers.map((m) => (
              <MemberCard
                key={m.id}
                id={m.id}
                imageUrl={m.imageUrl || "/file.svg"}
                name={m.name}
                linkedinUrl={m.linkedinUrl || undefined}
                mail={m.mail || undefined}
                logo={m.logo || undefined}
                isAlumni={m.isAlumni}
                deptId={m.deptId}
                positionId={m.positionId}
                order={m.order}
                deptName={m.deptName}
                deptBgColor={m.deptBgColor}
                deptLogo={m.deptLogo}
                positionName={m.positionName}
                positionLevel={m.positionLevel}
                history={m.history}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </section>
      );
    });
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Members" />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
            <p className="text-muted-foreground">
              Manage and view all GDG community team members.
            </p>
          </div>
          <Button variant="outline" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="max-w-sm">
          <Input
            placeholder="Search by name, position, department, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <GoogleLoader message="Loading members..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">
              {search.trim() ? "No members match your search" : "No team members found"}
            </p>
            <p className="text-sm">
              {search.trim() ? "Try a different search term." : "Add team members to see them here."}
            </p>
          </div>
        ) : (
          <div className="space-y-8 w-full">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6 pl-4 border-l-4 border-primary">
                Active Team Members
              </h3>
              <div className="space-y-4 w-full">
                {renderGroup(filtered.filter((m) => !m.isAlumni), false)}
              </div>
            </div>

            {filtered.filter((m) => m.isAlumni).length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-6 pl-4 border-l-4 border-stone-400">
                  Alumni Team Members
                </h3>
                <div className="space-y-8 w-full">
                  {renderGroup(filtered.filter((m) => m.isAlumni), true)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="relative w-[90vw] max-w-3xl max-h-[90vh] bg-card rounded-lg shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAddOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <form onSubmit={handleCreate}>
              <div className="flex flex-col md:flex-row">
                <div
                  style={{ backgroundColor: departments.find((d) => d.id === addForm.deptId)?.bgColor || "#e6fffa" }}
                  className="md:w-1/2 flex flex-col items-center justify-center p-6 gap-4"
                >
                  <img
                    src={
                      addForm.imageUrl ||
                      "https://res.cloudinary.com/duvr3z2z0/image/upload/v1764391657/Screenshot_2025-11-29_095727_wptmhb.png"
                    }
                    alt={addForm.name || "New member"}
                    className="w-full max-h-[350px] object-contain rounded-md"
                  />
                  <div className="w-full">
                    <label className="text-xs font-medium text-muted-foreground">Photo</label>
                    <input
                      ref={addFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAddImageUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addFileInputRef.current?.click()}
                      disabled={addUploading}
                      className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-md bg-card/80 hover:bg-card transition-colors disabled:opacity-50"
                    >
                      {addUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {addUploading ? "Uploading..." : "Upload Photo"}
                    </button>
                  </div>
                </div>

                <div className="md:w-1/2 p-6 space-y-4">
                  <h2 className="text-xl font-bold text-foreground">Add New Member</h2>

                  <div className="space-y-3">
                    <AddField label="Name *" value={addForm.name} onChange={(v) => handleAddChange("name", v)} required />
                    <AddField label="Email" value={addForm.mail} onChange={(v) => handleAddChange("mail", v)} type="email" />
                    <AddField
                      label="LinkedIn URL"
                      value={addForm.linkedinUrl}
                      onChange={(v) => handleAddChange("linkedinUrl", v)}
                      type="url"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Department *</label>
                        <select
                          value={addForm.deptId}
                          onChange={(e) => handleAddChange("deptId", e.target.value)}
                          required
                          className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select...</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Position *</label>
                        <select
                          value={addForm.positionId}
                          onChange={(e) => handleAddChange("positionId", e.target.value)}
                          required
                          className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select...</option>
                          {positions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="isAlumni-add"
                        checked={addForm.isAlumni}
                        onChange={(e) => handleAddChange("isAlumni", e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <label htmlFor="isAlumni-add" className="text-sm font-medium text-foreground">
                        Is Alumni?
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
                    >
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {creating ? "Creating..." : "Create Member"}
                    </button>
                    {createError && <span className="text-red-600 text-sm">{createError}</span>}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AddField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
      />
    </div>
  );
}
