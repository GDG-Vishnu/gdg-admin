"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/admin/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, X, Save } from "lucide-react";
import GoogleLoader from "@/components/GoogleLoader";

type Department = {
  id: string;
  name: string;
  order: number;
  logo: string;
  bgColor: string;
  isActive: boolean;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLogo, setNewLogo] = useState("");
  const [newBgColor, setNewBgColor] = useState("#e6fffa");
  const [saving, setSaving] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/departments", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDepartments(data.sort((a, b) => a.order - b.order));
        setError(null);
      } else {
        setError(data.error || "Failed to load departments");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, logo: newLogo, bgColor: newBgColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create department");
      } else {
        setAddOpen(false);
        setNewName("");
        setNewLogo("");
        setNewBgColor("#e6fffa");
        fetchDepartments();
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this department? This only works if no members belong to it.")) return;
    const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to delete department");
    } else {
      fetchDepartments();
    }
  }

  async function handleReorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= departments.length) return;

    const a = departments[index];
    const b = departments[target];

    const reordered = [...departments];
    reordered[index] = { ...b, order: a.order };
    reordered[target] = { ...a, order: b.order };
    reordered.sort((x, y) => x.order - y.order);
    setDepartments(reordered);

    await Promise.all([
      fetch(`/api/admin/departments/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: b.order }),
      }),
      fetch(`/api/admin/departments/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: a.order }),
      }),
    ]);
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Departments" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
            <p className="text-muted-foreground">
              Each department has its own display order, logo, and color. Members reference a
              department instead of duplicating these fields.
            </p>
          </div>
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <GoogleLoader message="Loading departments..." />
          </div>
        ) : (
          <div className="space-y-2">
            {departments.map((dept, index) => (
              <Card key={dept.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleReorder(index, -1)}
                      disabled={index === 0}
                      className="p-0.5 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleReorder(index, 1)}
                      disabled={index === departments.length - 1}
                      className="p-0.5 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div
                    className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: dept.bgColor || "#eee" }}
                  >
                    {dept.logo && (
                      <img src={dept.logo} alt="" className="h-6 w-6 object-contain" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">Order: {dept.order}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(dept.id)}
                    aria-label={`Delete ${dept.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {departments.length === 0 && (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No departments yet. Add one to get started.
              </p>
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
            className="relative w-[90vw] max-w-md bg-card rounded-lg shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAddOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <form onSubmit={handleCreate} className="space-y-4">
              <h2 className="text-lg font-bold">Add Department</h2>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Logo URL</label>
                <Input value={newLogo} onChange={(e) => setNewLogo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Background Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={newBgColor}
                    onChange={(e) => setNewBgColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <Input value={newBgColor} onChange={(e) => setNewBgColor(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Creating..." : "Create Department"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
