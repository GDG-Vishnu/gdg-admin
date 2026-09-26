"use client";
import {
  Card,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/layout/PageHeader";
import {
  Calendar, Plus, Pencil, Trash2, X, Save, Loader2,
  ImageIcon, Users, Star, Hash, Palette, Image as ImageLucide, Upload, Minus,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import GoogleLoader from "@/components/GoogleLoader";
import { Button } from "@/components/ui/button";

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  Date: string | null;
  Time: string | null;
  venue: string | null;
  organizer: string | null;
  coOrganizer: string | null;
  keyHighlights: string[];
  tags: string[];
  status: string | null;
  imageUrl: string | null;
  coverUrl: string | null;
  rank: number;
  eventGallery: string[];
  Theme: string[];
  isDone: boolean;
  MembersParticipated: number;
};

const STATUS_OPTIONS = [
  { value: "Upcoming", label: "Upcoming", color: "bg-blue-500" },
  { value: "Ongoing", label: "Ongoing", color: "bg-yellow-500" },
  { value: "Completed", label: "Completed", color: "bg-green-500" },
  { value: "Cancelled", label: "Cancelled", color: "bg-red-500" },
];

/** Extracts "YYYY-MM-DD" from Firestore date string like "2025-10-18 00:00:00"
 *  Also handles serialized Timestamps { _seconds } and ISO strings */
function toDateInput(dateStr: unknown): string {
  if (!dateStr) return "";

  // Handle serialized Timestamp objects: { _seconds, _nanoseconds }
  if (typeof dateStr === "object" && dateStr !== null) {
    const secs = (dateStr as any)._seconds ?? (dateStr as any).seconds;
    if (typeof secs === "number") {
      const d = new Date(secs * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return "";
  }

  const str = String(dateStr);
  // Try "YYYY-MM-DD..." pattern
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  // Try parsing as a Date string (e.g. ISO format)
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return "";
}

/** Converts "YYYY-MM-DD" back to Firestore format "YYYY-MM-DD 00:00:00" */
function fromDateInput(dateInput: string): string {
  if (!dateInput) return "";
  return `${dateInput} 00:00:00`;
}

/** Parses "HH:MM - HH:MM" into [start, end]. Falls back to ["", ""] */
function parseTimeRange(time: string | null): [string, string] {
  if (!time) return ["", ""];
  const str = String(time);
  const match = str.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (match) return [match[1], match[2]];
  // Single time like "09:00"
  const single = str.match(/(\d{1,2}:\d{2})/);
  if (single) return [single[1], ""];
  return ["", ""];
}

type EditFormState = {
  title: string;
  description: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  venue: string;
  organizer: string;
  coOrganizer: string;
  status: string;
  imageUrl: string;
  coverUrl: string;
  MembersParticipated: number;
  isDone: boolean;
  rank: number;
  keyHighlights: string[];
  tags: string[];
  Theme: string[];
  eventGallery: string[];
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<"details" | "content" | "theme" | "media">("details");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    title: "",
    description: "",
    date: "",
    timeStart: "",
    timeEnd: "",
    venue: "",
    organizer: "",
    coOrganizer: "",
    status: "Upcoming",
    imageUrl: "",
    coverUrl: "",
    MembersParticipated: 0,
    isDone: false,
    rank: 0,
    keyHighlights: [],
    tags: [],
    Theme: [],
    eventGallery: [],
  });

  // Temp inputs for chip/list fields
  const [tagInput, setTagInput] = useState("");
  const [highlightInput, setHighlightInput] = useState("");

  // Upload state
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/events", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function openEdit(event: EventItem) {
    setEditingId(event.id);
    setEditForm({
      title: event.title || "",
      description: event.description || "",
      date: toDateInput(event.Date),
      timeStart: parseTimeRange(event.Time)[0],
      timeEnd: parseTimeRange(event.Time)[1],
      venue: event.venue || "",
      organizer: event.organizer || "",
      coOrganizer: event.coOrganizer || "",
      status: event.status || "Upcoming",
      imageUrl: event.imageUrl || "",
      coverUrl: event.coverUrl || "",
      MembersParticipated: event.MembersParticipated || 0,
      isDone: event.isDone === true || String(event.isDone) === "true",
      rank: event.rank || 0,
      keyHighlights: Array.isArray(event.keyHighlights) ? [...event.keyHighlights] : [],
      tags: Array.isArray(event.tags) ? [...event.tags] : [],
      Theme: Array.isArray(event.Theme) ? [...event.Theme] : [],
      eventGallery: Array.isArray(event.eventGallery) ? [...event.eventGallery] : [],
    });
    setTagInput("");
    setHighlightInput("");
    setActionError(null);
    setEditTab("details");
    setEditOpen(true);
  }

  function updateField<K extends keyof EditFormState>(field: K, value: EditFormState[K]) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  // Array helpers
  function addToArray(field: "tags" | "keyHighlights" | "eventGallery" | "Theme", value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setEditForm((prev) => ({
      ...prev,
      [field]: [...prev[field], trimmed],
    }));
  }

  function removeFromArray(field: "tags" | "keyHighlights" | "eventGallery" | "Theme", index: number) {
    setEditForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }

  function updateInArray(field: "Theme", index: number, value: string) {
    setEditForm((prev) => ({
      ...prev,
      [field]: prev[field].map((v, i) => (i === index ? value : v)),
    }));
  }

  async function handleSave() {
    if (!editingId) return;
    setSaving(true);
    setActionError(null);
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        Date: fromDateInput(editForm.date),
        Time: editForm.timeStart && editForm.timeEnd
          ? `${editForm.timeStart} - ${editForm.timeEnd}`
          : editForm.timeStart || editForm.timeEnd || "",
        venue: editForm.venue,
        organizer: editForm.organizer,
        coOrganizer: editForm.coOrganizer,
        status: editForm.status,
        imageUrl: editForm.imageUrl,
        coverUrl: editForm.coverUrl,
        MembersParticipated: Number(editForm.MembersParticipated) || 0,
        isDone: String(editForm.isDone),
        rank: Number(editForm.rank) || 0,
        keyHighlights: JSON.stringify(editForm.keyHighlights),
        tags: JSON.stringify(editForm.tags),
        Theme: JSON.stringify(editForm.Theme),
        eventGallery: JSON.stringify(editForm.eventGallery),
      };
      const res = await fetch(`/api/admin/events/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Update failed");
      } else {
        setEditOpen(false);
        setEvents((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  title: editForm.title,
                  description: editForm.description,
                  Date: fromDateInput(editForm.date),
                  Time:
                    editForm.timeStart && editForm.timeEnd
                      ? `${editForm.timeStart} - ${editForm.timeEnd}`
                      : editForm.timeStart || editForm.timeEnd || "",
                  venue: editForm.venue,
                  organizer: editForm.organizer,
                  coOrganizer: editForm.coOrganizer,
                  status: editForm.status,
                  imageUrl: editForm.imageUrl,
                  coverUrl: editForm.coverUrl,
                  MembersParticipated: Number(editForm.MembersParticipated) || 0,
                  isDone: editForm.isDone,
                  rank: Number(editForm.rank) || 0,
                  keyHighlights: editForm.keyHighlights,
                  tags: editForm.tags,
                  Theme: editForm.Theme,
                  eventGallery: editForm.eventGallery,
                }
              : e,
          ),
        );
        setEditingId(null);
      }
    } catch {
      setActionError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(eventId: string) {
    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Delete failed");
      } else {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    } catch {
      alert("Network error");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function handleFileUpload(
    file: File,
    target: "poster" | "cover" | "gallery",
  ) {
    const setUploading =
      target === "poster" ? setUploadingPoster
      : target === "cover" ? setUploadingCover
      : setUploadingGallery;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Upload failed");
        return;
      }
      if (target === "poster") {
        updateField("imageUrl", data.url);
      } else if (target === "cover") {
        updateField("coverUrl", data.url);
      } else {
        setEditForm((prev) => ({
          ...prev,
          eventGallery: [...prev.eventGallery, data.url],
        }));
      }
    } catch {
      setActionError("Upload failed — network error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Events" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Event Management
            </h2>
            <p className="text-muted-foreground">
              Organize and manage GDG community events.
            </p>
          </div>
          <Link href="/admin/events/create">
            <Button variant="outline">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>
        <div className="flex flex-col gap-6">
          {loading ? (
            <GoogleLoader message="Loading events..." />
          ) : events.length === 0 ? (
            <Card className="flex items-center justify-center p-12 bg-muted/20 border-dashed">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-xl font-medium text-muted-foreground">
                  No events found.
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Check back later or create a new event.
                </p>
              </div>
            </Card>
          ) : (
            events.map((event) => (
              <Card
                key={event.id}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-none bg-gradient-to-r from-card to-muted/50 shadow-md cursor-pointer p-3"
                onClick={() => router.push(`/admin/events/${event.id}`)}
              >
                <div className="flex flex-col md:flex-row min-h-[180px]">
                  <div className="relative w-full md:w-60 h-48 md:h-auto overflow-hidden rounded-xl flex-shrink-0">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-blue-500/40" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                          event.status === "upcoming"
                            ? "bg-green-500 text-white"
                            : event.status === "ongoing"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-500 text-white"
                        }`}
                      >
                        {(event.status?.charAt(0).toUpperCase() ?? "") +
                          (event.status?.slice(1) ?? "") || "Draft"}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 px-5 py-3 md:px-6 md:py-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-2xl font-bold text-foreground group-hover:text-blue-600 transition-colors">
                          {event.title}
                        </CardTitle>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center text-muted-foreground font-medium">
                            <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="text-sm">
                              {event.Date
                                ? new Date(event.Date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )
                                : "Date TBD"}
                            </span>
                          </div>
                          {/* Edit & Delete buttons */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEdit(event)}
                              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Edit event"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {confirmDeleteId === event.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(event.id)}
                                  disabled={deletingId === event.id}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                  {deletingId === event.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    "Delete"
                                  )}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(event.id)}
                                className="p-2 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                title="Delete event"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                        {event.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 mt-auto">
                      {event.venue && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mr-3">
                            <svg
                              className="w-4 h-4 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          </div>
                          <span>{event.venue}</span>
                        </div>
                      )}
                      {event.organizer && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center mr-3">
                            <svg
                              className="w-4 h-4 text-indigo-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <span>Managed by {event.organizer}</span>
                        </div>
                      )}

                      {event.tags && event.tags.length > 0 && (
                        <div className="flex gap-2 ml-auto">
                          {event.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-muted text-muted-foreground rounded text-[10px] font-bold uppercase tracking-wider"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Event Dialog */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-foreground">Edit Event</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Update event details below</p>
              </div>
              <button
                onClick={() => { setEditOpen(false); setEditingId(null); }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border bg-background px-6 flex-shrink-0">
              {([
                { key: "details" as const, label: "Details", icon: <Calendar className="w-3.5 h-3.5" /> },
                { key: "content" as const, label: "Content", icon: <Star className="w-3.5 h-3.5" /> },
                { key: "theme" as const, label: "Theme", icon: <Palette className="w-3.5 h-3.5" /> },
                { key: "media" as const, label: "Media", icon: <ImageLucide className="w-3.5 h-3.5" /> },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setEditTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    editTab === tab.key
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Tab Body */}
            <div className="overflow-y-auto flex-1 px-6 py-6">

              {/* ══ TAB: Details ══ */}
              {editTab === "details" && (
                <div className="space-y-6">

                  {/* Basic Info */}
                  <section>
                    <SectionLabel icon={<Star className="w-4 h-4" />} title="Basic Info" />
                    <div className="space-y-4 mt-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Event Title</label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => updateField("title", e.target.value)}
                          className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="e.g. Google Cloud Study Jams"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => updateField("description", e.target.value)}
                          rows={4}
                          className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                          placeholder="Describe the event..."
                        />
                      </div>
                    </div>
                  </section>

                  {/* Schedule & Venue */}
                  <section>
                    <SectionLabel icon={<Calendar className="w-4 h-4" />} title="Schedule & Venue" />
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Date</label>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => updateField("date", e.target.value)}
                          className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Venue</label>
                        <input
                          type="text"
                          value={editForm.venue}
                          onChange={(e) => updateField("venue", e.target.value)}
                          className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="e.g. Open Labs, C Block"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                        <input
                          type="time"
                          value={editForm.timeStart}
                          onChange={(e) => updateField("timeStart", e.target.value)}
                          onClick={(e) => (e.currentTarget as any).showPicker?.()}
                          className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">End Time</label>
                        <input
                          type="time"
                          value={editForm.timeEnd}
                          onChange={(e) => updateField("timeEnd", e.target.value)}
                          onClick={(e) => (e.currentTarget as any).showPicker?.()}
                          className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Status */}
                  <section>
                    <SectionLabel icon={<Hash className="w-4 h-4" />} title="Status" />
                    <div className="grid grid-cols-3 gap-x-4 gap-y-4 mt-3 items-end">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Event Status</label>
                        <div className="relative mt-1">
                          <select
                            value={editForm.status}
                            onChange={(e) => updateField("status", e.target.value)}
                            className="w-full h-[42px] px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-background text-foreground pr-8"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_OPTIONS.find((o) => o.value === editForm.status)?.color || "bg-stone-400"}`} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Display Rank</label>
                        <div className="flex items-center gap-0 mt-1">
                          <button
                            type="button"
                            onClick={() => updateField("rank", Math.max(0, editForm.rank - 1))}
                            className="h-[42px] w-10 flex items-center justify-center border border-border rounded-l-lg bg-muted hover:bg-accent transition-colors text-muted-foreground flex-shrink-0"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={editForm.rank}
                            onChange={(e) => updateField("rank", parseInt(e.target.value) || 0)}
                            className="h-[42px] flex-1 min-w-0 px-3 text-sm text-center border-y border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateField("rank", editForm.rank + 1)}
                            className="h-[42px] w-10 flex items-center justify-center border border-border rounded-r-lg bg-muted hover:bg-accent transition-colors text-muted-foreground flex-shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="h-[42px] flex items-center">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={editForm.isDone}
                            onClick={() => updateField("isDone", !editForm.isDone)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.isDone ? "bg-green-500" : "bg-muted"}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editForm.isDone ? "translate-x-6" : "translate-x-1"}`} />
                          </button>
                          <span className="text-sm text-muted-foreground">Completed</span>
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Organizers */}
                  <section>
                    <SectionLabel icon={<Users className="w-4 h-4" />} title="Organizers" />
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Organizer</label>
                        <input
                          type="text"
                          value={editForm.organizer}
                          onChange={(e) => updateField("organizer", e.target.value)}
                          className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Lead organizer name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Co-Organizer</label>
                        <input
                          type="text"
                          value={editForm.coOrganizer}
                          onChange={(e) => updateField("coOrganizer", e.target.value)}
                          className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Co-organizer name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Members Participated</label>
                        <div className="flex items-center gap-0 mt-1">
                          <button
                            type="button"
                            onClick={() => updateField("MembersParticipated", Math.max(0, editForm.MembersParticipated - 1))}
                            className="h-[42px] w-10 flex items-center justify-center border border-border rounded-l-lg bg-muted hover:bg-accent transition-colors text-muted-foreground flex-shrink-0"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={editForm.MembersParticipated}
                            onChange={(e) => updateField("MembersParticipated", parseInt(e.target.value) || 0)}
                            className="h-[42px] flex-1 min-w-0 px-3 text-sm text-center border-y border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateField("MembersParticipated", editForm.MembersParticipated + 1)}
                            className="h-[42px] w-10 flex items-center justify-center border border-border rounded-r-lg bg-muted hover:bg-accent transition-colors text-muted-foreground flex-shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ══ TAB: Content ══ */}
              {editTab === "content" && (
                <div className="space-y-6">

                  {/* Tags */}
                  <section>
                    <SectionLabel icon={<Hash className="w-4 h-4" />} title="Tags" />
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {editForm.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-full text-xs font-medium"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeFromArray("tags", i)}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("tags", tagInput);
                              setTagInput("");
                            }
                          }}
                          className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Type a tag and press Enter"
                        />
                        <button
                          type="button"
                          onClick={() => { addToArray("tags", tagInput); setTagInput(""); }}
                          className="px-3 py-2.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Key Highlights */}
                  <section>
                    <SectionLabel icon={<Star className="w-4 h-4" />} title="Key Highlights" />
                    <div className="mt-3 space-y-2">
                      {editForm.keyHighlights.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 group py-1">
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm text-foreground">{item}</span>
                          <button
                            type="button"
                            onClick={() => removeFromArray("keyHighlights", i)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-muted-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={highlightInput}
                          onChange={(e) => setHighlightInput(e.target.value)}
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addToArray("keyHighlights", highlightInput);
                              setHighlightInput("");
                            }
                          }}
                          className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Add a highlight and press Enter"
                        />
                        <button
                          type="button"
                          onClick={() => { addToArray("keyHighlights", highlightInput); setHighlightInput(""); }}
                          className="px-3 py-2.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ══ TAB: Theme ══ */}
              {editTab === "theme" && (
                <div>
                  <section>
                    <SectionLabel icon={<Palette className="w-4 h-4" />} title="Theme Colors" />
                    <p className="text-sm text-muted-foreground mt-2 mb-4">Pick up to 5 colors for the event page theme. Click a swatch to change its color.</p>
                    <div className="flex flex-wrap gap-4 items-start">
                      {editForm.Theme.map((color, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 group relative">
                          <label className="cursor-pointer">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => updateInArray("Theme", i, e.target.value)}
                              className="sr-only"
                            />
                            <div
                              className="w-14 h-14 rounded-xl border-2 border-border shadow-sm hover:scale-110 transition-transform cursor-pointer"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          </label>
                          <span className="text-[11px] font-mono text-muted-foreground">{color}</span>
                          <button
                            type="button"
                            onClick={() => removeFromArray("Theme", i)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-muted rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-900 transition-all"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                      {editForm.Theme.length < 5 && (
                        <button
                          type="button"
                          onClick={() => addToArray("Theme", "#4285F4")}
                          className="w-14 h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                          title="Add color"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* ══ TAB: Media ══ */}
              {editTab === "media" && (
                <div className="space-y-6">

                  {/* Poster & Cover */}
                  <section>
                    <SectionLabel icon={<ImageLucide className="w-4 h-4" />} title="Poster & Cover" />
                    <div className="grid grid-cols-2 gap-6 mt-3">
                      {/* Poster Image */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Poster Image</label>
                        <input ref={posterInputRef} type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "poster"); e.target.value = ""; }} />
                        {editForm.imageUrl ? (
                          <div className="mt-1 relative group rounded-lg overflow-hidden border border-border h-40">
                            <img src={editForm.imageUrl} alt="Poster" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button type="button" onClick={() => posterInputRef.current?.click()} className="px-3 py-1.5 bg-background rounded-md text-xs font-medium text-foreground hover:bg-muted">
                                Replace
                              </button>
                              <button type="button" onClick={() => updateField("imageUrl", "")} className="px-3 py-1.5 bg-background rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => posterInputRef.current?.click()}
                            disabled={uploadingPoster}
                            className="w-full mt-1 h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            {uploadingPoster ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span className="text-xs font-medium">{uploadingPoster ? "Uploading..." : "Upload Poster"}</span>
                          </button>
                        )}
                      </div>
                      {/* Cover Image */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Cover Image</label>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "cover"); e.target.value = ""; }} />
                        {editForm.coverUrl ? (
                          <div className="mt-1 relative group rounded-lg overflow-hidden border border-border h-40">
                            <img src={editForm.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button type="button" onClick={() => coverInputRef.current?.click()} className="px-3 py-1.5 bg-background rounded-md text-xs font-medium text-foreground hover:bg-muted">
                                Replace
                              </button>
                              <button type="button" onClick={() => updateField("coverUrl", "")} className="px-3 py-1.5 bg-background rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingCover}
                            className="w-full mt-1 h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            {uploadingCover ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span className="text-xs font-medium">{uploadingCover ? "Uploading..." : "Upload Cover"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Event Gallery */}
                  <section>
                    <SectionLabel icon={<ImageIcon className="w-4 h-4" />} title={`Event Gallery (${editForm.eventGallery.length} images)`} />
                    <div className="mt-3">
                      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const files = e.target.files;
                        if (files) {
                          Array.from(files).forEach((f) => handleFileUpload(f, "gallery"));
                        }
                        e.target.value = "";
                      }} />
                      {editForm.eventGallery.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                          {editForm.eventGallery.map((url, i) => (
                            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = ""; e.currentTarget.className = "w-full h-full bg-muted"; }} />
                              <button
                                type="button"
                                onClick={() => removeFromArray("eventGallery", i)}
                                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={uploadingGallery}
                        className="w-full h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:border-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {uploadingGallery ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        <span className="text-xs font-medium">{uploadingGallery ? "Uploading..." : "Upload Gallery Images"}</span>
                      </button>
                    </div>
                  </section>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-muted flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditOpen(false); setEditingId(null); }}
                className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              {actionError && (
                <span className="text-red-600 text-sm ml-auto">{actionError}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-foreground font-semibold text-sm border-b border-border pb-2">
      {icon}
      {title}
    </div>
  );
}
