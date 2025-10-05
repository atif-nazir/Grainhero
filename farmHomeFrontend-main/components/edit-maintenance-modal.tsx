import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from 'next-intl';

const statusOptions = ["Completed", "Scheduled", "In Progress"];
const priorityOptions = ["High", "Medium", "Routine"];

interface MaintenanceEditFields {
  status: string;
  totalCost: number;
  nextMaintenanceDate: string;
  priority: string;
  notes: string;
}

interface EditMaintenanceModalProps {
  record: any | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Partial<MaintenanceEditFields>) => void;
  loading: boolean;
}

export default function EditMaintenanceModal({ record, open, onClose, onSave, loading }: EditMaintenanceModalProps) {
  const t = useTranslations("MaintenancePage");
  const [form, setForm] = useState<Partial<MaintenanceEditFields>>(record || {});

  useEffect(() => {
    if (record) {
      setForm({
        status: record.status || "",
        totalCost: record.totalCost ?? "",
        nextMaintenanceDate: record.nextMaintenanceDate ? record.nextMaintenanceDate.slice(0, 10) : "",
        priority: record.priority || "",
        notes: record.notes || "",
      });
    } else {
      setForm({});
    }
  }, [record]);

  if (!open || !record) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave({
      ...form,
      nextMaintenanceDate: form.nextMaintenanceDate ? new Date(form.nextMaintenanceDate).toISOString() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{t("edit")}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t("status")}</label>
            <Select value={form.status || ""} onValueChange={(value) => handleSelectChange("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("totalCost")}</label>
            <Input name="totalCost" type="number" value={form.totalCost ?? ""} onChange={handleChange} placeholder={t("totalCost")} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("nextMaintenanceDate")}</label>
            <Input name="nextMaintenanceDate" type="date" value={form.nextMaintenanceDate ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("priority")}</label>
            <Select value={form.priority || ""} onValueChange={(value) => handleSelectChange("priority", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("priority")} />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((priority) => (
                  <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("notes")}</label>
            <Textarea name="notes" value={form.notes ?? ""} onChange={handleChange} placeholder={t("notes")} rows={2} />
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