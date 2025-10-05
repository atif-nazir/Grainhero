"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import { Button } from "@/components/ui/button";

// User type
interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "manager" | "assistant";
  language?: string;
}

interface Alert {
  _id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  createdAt?: string;
  status?: string;
}

// Add AlertFormProps for create/edit
interface AlertFormProps {
  initial?: Partial<Alert>;
  onSubmit: (data: Omit<Alert, '_id' | 'createdAt' | 'status'>) => void;
  loading: boolean;
  submitLabel: string;
}

function AlertForm({ initial = {}, onSubmit, loading, submitLabel }: AlertFormProps) {
  const [title, setTitle] = useState(initial.title || "");
  const [category, setCategory] = useState(initial.category || "");
  const [location, setLocation] = useState(initial.location || "");
  const [description, setDescription] = useState(initial.description || "");

  // Removed useEffect that resets fields on every prop change

  return (
    <form
      className="space-y-2"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ title, category, location, description });
      }}
    >
      <div>
        <label className="block font-medium">Title</label>
        <input className="w-full border rounded px-2 py-1" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="block font-medium">Category</label>
        <input className="w-full border rounded px-2 py-1" value={category} onChange={e => setCategory(e.target.value)} required />
      </div>
      <div>
        <label className="block font-medium">Location</label>
        <input className="w-full border rounded px-2 py-1" value={location} onChange={e => setLocation(e.target.value)} required />
      </div>
      <div>
        <label className="block font-medium">Description</label>
        <textarea className="w-full border rounded px-2 py-1" value={description} onChange={e => setDescription(e.target.value)} required />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded" disabled={loading}>
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

export default function AlertsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const t = useTranslations();

  // Load user info from localStorage
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      try {
        const userStr = localStorage.getItem("farm-home-user");
        let idRaw = localStorage.getItem("id") || "";
        let cleanId = idRaw;
        try {
          cleanId = JSON.parse(idRaw);
        } catch {
          cleanId = idRaw;
        }
        if (typeof cleanId === "string") {
          cleanId = cleanId.replace(/^"+|"+$/g, "");
        }
        const role = localStorage.getItem("role");
        if (userStr) {
          const parsed = JSON.parse(userStr);
          setUser(parsed);
        }
        if (cleanId) setUserId(cleanId);
        if (role) setRole(role);
      } catch {}
      setLoading(false);
    }, 800);
  }, []);

  // Fetch alerts from REST API
  useEffect(() => {
    if (!role || !userId) return;
    const token = localStorage.getItem("token");
    if (!token || token === "") {
      setError("Authentication token missing. Please log in again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let url = "";
    if (role === "super_admin") {
      url = "http://localhost:5000/alerts/all";
    } else if (role === "admin") {
      url = `http://localhost:5000/alerts/by-admin/${userId}`;
    } else if (role === "manager") {
      url = `http://localhost:5000/alerts/by-manager/${userId}`;
    } else if (role === "assistant") {
      url = `http://localhost:5000/alerts/by-assistant/${userId}`;
    } else {
      url = "http://localhost:5000/alerts";
    }
    fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch alerts");
        }
        return res.json();
      })
      .then((data) => {
        setAlerts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [role, userId, creating, editingId, deleteLoadingId]);

  // WebSocket for real-time alerts (admin, manager, assistant only)
  useEffect(() => {
    if (!role || !userId) return;
    if (role === "super_admin") return; // No websocket for super_admin
    let wsUrl = "";
    if (role === "admin") wsUrl = `ws://localhost:5000/alerts/admin/${userId}`;
    else if (role === "manager") wsUrl = `ws://localhost:5000/alerts/manager/${userId}`;
    else if (role === "assistant") wsUrl = `ws://localhost:5000/alerts/assistant/${userId}`;
    else return;
    console.log("WebSocket route:", wsUrl);
    const socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setAlerts(Array.isArray(data) ? data : []);
      } catch {
        // ignore parse errors
      }
    };
    // Optionally handle errors and close
    socket.onerror = (e) => console.error("WebSocket error:", e);
    socket.onclose = () => console.log("WebSocket closed");
    // Clean up on unmount or role/userId change
    return () => {
      socket.close();
    };
  }, [role, userId]);

  // Create alert handler
  const handleCreate = (data: Omit<Alert, '_id' | 'createdAt' | 'status'>) => {
    setCreating(true);
    setError(null);
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create alert");
        }
        return res.json();
      })
      .then(() => {
        setCreating(false);
      })
      .catch((err) => {
        setError(err.message);
        setCreating(false);
      });
  };

  // Edit alert handler
  const handleEdit = (id: string, data: Omit<Alert, '_id' | 'createdAt' | 'status'>) => {
    setEditLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    fetch(`http://localhost:5000/alerts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update alert");
        }
        return res.json();
      })
      .then(() => {
        setEditingId(null);
        setEditLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setEditLoading(false);
      });
  };

  // Delete alert handler
  const handleDelete = (id: string) => {
    setDeleteLoadingId(id);
    setError(null);
    const token = localStorage.getItem("token");
    fetch(`http://localhost:5000/alerts/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to delete alert");
        }
        return res.json();
      })
      .then(() => {
        setDeleteLoadingId(null);
      })
      .catch((err) => {
        setError(err.message);
        setDeleteLoadingId(null);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        {t('AlertsPage.loading')}
      </div>
    );
  }

  // Print user details (id, role, token)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  return (
    <div className="space-y-6">
      {/* Row 1: Heading/subtitle and Add Alert button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('AlertsPage.title')}</h1>
          <p className="text-gray-600">View and manage all alerts.</p>
        </div>
        {role === "super_admin" && (
          <Link href="/alerts/new">
            <Button className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition flex items-center gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Add Alert
            </Button>
          </Link>
        )}
      </div>
      {/* Row 2: User details */}
      <div className="flex flex-col items-start space-y-1">
        <div className="font-semibold text-gray-700">User ID: {userId}</div>
        <div className="font-semibold text-gray-700">Role: {role}</div>
        <div className="font-semibold text-gray-700">{t('AlertsPage.user')}: {user?.name}</div>
        <div className="text-sm text-gray-500">{t('AlertsPage.role')}: {role?.replace("_", " ")}</div>
      </div>
      {/* Only super_admin can create/edit/delete alerts */}
      {/* Removed inline alert creation form, now handled in /alerts/new */}
      <Card>
        <CardHeader>
          <CardTitle>{t('AlertsPage.tableTitle')}</CardTitle>
          <CardDescription>{t('AlertsPage.tableDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('AlertsPage.tableHeaderTitle')}</TableHead>
                  <TableHead>{t('AlertsPage.tableHeaderCategory')}</TableHead>
                  <TableHead>{t('AlertsPage.tableHeaderLocation')}</TableHead>
                  <TableHead>{t('AlertsPage.tableHeaderDescription')}</TableHead>
                  <TableHead>{t('AlertsPage.tableHeaderTime')}</TableHead>
                  <TableHead>{t('AlertsPage.tableHeaderStatus')}</TableHead>
                  {role === "super_admin" && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={role === "super_admin" ? 7 : 6} className="text-center py-8 text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={role === "super_admin" ? 7 : 6} className="text-center py-8 text-gray-400">
                      {t('AlertsPage.noAlerts')}
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow key={alert._id}>
                      {role === "super_admin" && editingId === alert._id ? (
                        <TableCell colSpan={7}>
                          <AlertForm
                            initial={alert}
                            onSubmit={data => handleEdit(alert._id, data)}
                            loading={editLoading}
                            submitLabel="Update Alert"
                          />
                          <button className="text-sm text-gray-500 mt-2" onClick={() => setEditingId(null)} disabled={editLoading}>Cancel</button>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell>{alert.title}</TableCell>
                          <TableCell>{alert.category}</TableCell>
                          <TableCell>{alert.location}</TableCell>
                          <TableCell>{alert.description}</TableCell>
                          <TableCell>{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "-"}</TableCell>
                          <TableCell>{alert.status || t('AlertsPage.statusActive')}</TableCell>
                          {role === "super_admin" && (
                            <TableCell>
                              <button className="text-blue-600 mr-2" onClick={() => setEditingId(alert._id)} disabled={editLoading || deleteLoadingId === alert._id}>Edit</button>
                              <button className="text-red-600" onClick={() => handleDelete(alert._id)} disabled={deleteLoadingId === alert._id}>{deleteLoadingId === alert._id ? "Deleting..." : "Delete"}</button>
                            </TableCell>
                          )}
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 