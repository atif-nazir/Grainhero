import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from 'next-intl';

const statusOptions = ["Successful", "Failed", "In Progress"];

interface BreedingRecord {
  _id: string;
  status: string;
  cost: number;
  actualDelivery: string;
  numberOfOffspring: number;
  notes?: string;
}

interface EditBreedingModalProps {
  record: BreedingRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Partial<BreedingRecord>) => void;
  loading: boolean;
}

export default function EditBreedingModal({ record, open, onClose, onSave, loading }: EditBreedingModalProps) {
  const t = useTranslations("BreedingPage");
  const [form, setForm] = useState<Partial<BreedingRecord>>(record || {});

  useEffect(() => {
    if (record) {
      setForm({
        ...record,
        actualDelivery: record.actualDelivery ? record.actualDelivery.slice(0, 10) : "",
      });
    } else {
      setForm({});
    }
  }, [record]);

  if (!open || !record) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "cost" || name === "numberOfOffspring" ? Number(value) : value }));
  };

  const handleSave = () => {
    onSave({
      ...form,
      actualDelivery: form.actualDelivery ? new Date(form.actualDelivery).toISOString() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{t("edit")}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t("status")}</label>
            <select name="status" value={form.status || ""} onChange={handleChange} className="w-full border rounded px-2 py-1">
              <option value="">{t("selectStatus")}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("cost")}</label>
            <Input name="cost" type="number" value={form.cost ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("actualDelivery")}</label>
            <Input name="actualDelivery" type="date" value={form.actualDelivery ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("numberOfOffspring")}</label>
            <Input name="numberOfOffspring" type="number" value={form.numberOfOffspring ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("notes")}</label>
            <textarea name="notes" value={form.notes ?? ""} onChange={handleChange} className="w-full border rounded px-2 py-1" rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="secondary" disabled={loading}>{t("cancel")}</Button>
          <Button onClick={handleSave} disabled={loading} variant="default">{loading ? t("saving") : t("save")}</Button>
        </div>
      </div>
    </div>
  );
} 