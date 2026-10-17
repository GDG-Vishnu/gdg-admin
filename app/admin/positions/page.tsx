"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/admin/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Loader2, X, Save, Lock } from "lucide-react";
import GoogleLoader from "@/components/GoogleLoader";

type PositionLevel = {
  id: string;
  name: string;
  level: number;
  isDefault: boolean;
};

export default function PositionsPage() {
  const [positions, setPositions] = useState<PositionLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/positions", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPositions(data.sort((a, b) => a.level - b.level));
        setError(null);
      } else {
        setError(data.error || "Failed to load positions");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create position");
      } else {
        setAddOpen(false);
        setNewName("");
        fetchPositions();
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this position? This only works if no members hold it.")) return;
    const res = await fetch(`/api/admin/positions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to delete position");
    } else {
      fetchPositions();
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Positions" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Positions</h2>
            <p className="text-muted-foreground">
              The hierarchy used when promoting a member. Lead, Co-Lead, and Associate are
              defaults — add more as needed. Lower in the list means lower rank.
            </p>
          </div>
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Position
          </Button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <GoogleLoader message="Loading positions..." />
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map((pos) => (
              <Card key={pos.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <span className="text-xs font-mono text-muted-foreground w-10">
                    #{pos.level}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <p className="font-medium">{pos.name}</p>
                    {pos.isDefault && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded-full px-2 py-0.5">
                        <Lock className="h-3 w-3" /> default
                      </span>
                    )}
                  </div>
                  {!pos.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pos.id)}
                      aria-label={`Delete ${pos.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
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
              <h2 className="text-lg font-bold">Add Position</h2>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Volunteer"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                New positions are added at the bottom of the hierarchy (lowest rank).
              </p>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Creating..." : "Create Position"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
