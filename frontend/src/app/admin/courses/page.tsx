"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError, productsApi } from "@/lib/api";
import type { Product, ProductInput } from "@/lib/types";

const EMPTY_FORM: ProductInput = {
  title: "",
  description: "",
  category: "",
  level: "Beginner",
  price: 0,
  old_price: null,
  instructor: "",
  duration_label: "",
  lessons_count: 0,
  rating: 4.5,
  reviews_count: 0,
  tags: "",
  image_url: null,
};

function numberField(value: string): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

const inputClass =
  "w-full px-3 h-10 border border-gw-border rounded-[9px] text-sm outline-none bg-gw-surface text-gw-ink focus:border-gw-primary-border";
const textareaClass =
  "w-full px-3 py-2.5 border border-gw-border rounded-[9px] text-sm outline-none bg-gw-surface text-gw-ink focus:border-gw-primary-border";

export default function AdminCoursesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && user?.role !== "admin") router.push("/login");
  }, [loading, user, router]);

  const loadProducts = useCallback(() => {
    setFetching(true);
    productsApi
      .list({ limit: 100 })
      .then(setProducts)
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description,
      category: p.category,
      level: p.level,
      price: p.price,
      old_price: p.old_price,
      instructor: p.instructor,
      duration_label: p.duration_label,
      lessons_count: p.lessons_count,
      rating: p.rating,
      reviews_count: p.reviews_count,
      tags: p.tags,
      image_url: p.image_url,
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await productsApi.update(editingId, form, token);
      } else {
        await productsApi.create(form, token);
      }
      setFormOpen(false);
      loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save course.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setConfirmingDeleteId(null);
    await productsApi.remove(id, token);
    loadProducts();
  }

  if (loading || user?.role !== "admin") {
    return <div className="max-w-[1440px] mx-auto px-6 py-16 text-gw-text-muted">Checking access…</div>;
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-9">
      <div className="flex items-end gap-4 mb-6">
        <div>
          <div className="font-mono text-[10px] tracking-wider uppercase text-gw-text-faint">Admin</div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Course management</h1>
        </div>
        <button
          onClick={openCreate}
          className="ml-auto h-10 px-4 rounded-[10px] bg-gw-primary text-white text-sm font-medium border-0 cursor-pointer hover:bg-gw-primary-hover"
        >
          + Add course
        </button>
      </div>

      <div className="bg-gw-surface border border-gw-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gw-border-hairline text-left">
              <th className="px-5 py-3 font-mono text-[10px] tracking-wider uppercase text-gw-text-faint font-normal">
                Title
              </th>
              <th className="px-5 py-3 font-mono text-[10px] tracking-wider uppercase text-gw-text-faint font-normal">
                Category
              </th>
              <th className="px-5 py-3 font-mono text-[10px] tracking-wider uppercase text-gw-text-faint font-normal">
                Level
              </th>
              <th className="px-5 py-3 font-mono text-[10px] tracking-wider uppercase text-gw-text-faint font-normal">
                Price
              </th>
              <th className="px-5 py-3 font-mono text-[10px] tracking-wider uppercase text-gw-text-faint font-normal">
                Synced
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {fetching ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gw-text-faint">
                  Loading…
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-gw-border-hairline last:border-0 hover:bg-gw-surface-muted">
                  <td className="px-5 py-3 font-medium">{p.title}</td>
                  <td className="px-5 py-3 text-gw-text-muted">{p.category}</td>
                  <td className="px-5 py-3 text-gw-text-muted">{p.level}</td>
                  <td className="px-5 py-3 font-mono text-xs">${p.price}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-mono ${p.vector_synced ? "text-gw-success" : "text-gw-error"}`}>
                      {p.vector_synced ? "● synced" : "● pending"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs font-medium text-gw-primary bg-transparent border-0 cursor-pointer hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      onBlur={() => setConfirmingDeleteId(null)}
                      className="text-xs font-medium text-gw-error bg-transparent border-0 cursor-pointer ml-3 hover:underline"
                    >
                      {confirmingDeleteId === p.id ? "Confirm delete?" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-6">
          <div className="bg-gw-surface rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-7">
            <h2 className="text-xl font-semibold">{editingId ? "Edit course" : "New course"}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-5">
              <Field label="Title">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={textareaClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Category">
                  <input
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Level">
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className={inputClass}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Price ($)">
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: numberField(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Old price ($, optional)">
                  <input
                    type="number"
                    step="0.01"
                    value={form.old_price ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, old_price: e.target.value ? numberField(e.target.value) : null })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Instructor">
                <input
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Duration (e.g. 6H 30M)">
                  <input
                    value={form.duration_label}
                    onChange={(e) => setForm({ ...form, duration_label: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Lessons">
                  <input
                    type="number"
                    value={form.lessons_count}
                    onChange={(e) => setForm({ ...form, lessons_count: numberField(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Rating">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: numberField(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Reviews count">
                  <input
                    type="number"
                    value={form.reviews_count}
                    onChange={(e) => setForm({ ...form, reviews_count: numberField(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Tags (comma-separated)">
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Cover image URL (optional)">
                <input
                  value={form.image_url ?? ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value || null })}
                  placeholder="/static/covers/1.jpg or https://..."
                  className={inputClass}
                />
              </Field>

              {error && <div className="text-sm text-gw-error">{error}</div>}

              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-4 rounded-[10px] bg-gw-primary text-white text-sm font-medium border-0 cursor-pointer hover:bg-gw-primary-hover disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create course"}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="h-10 px-4 rounded-[10px] bg-transparent border border-gw-border text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gw-text mb-1.5">{label}</span>
      {children}
    </label>
  );
}
