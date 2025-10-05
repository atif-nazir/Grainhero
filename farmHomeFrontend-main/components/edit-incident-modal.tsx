import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from 'next-intl';

const statusOptions = ["Resolved", "In Progress", "Under Investigation", "Pending"];
const severityOptions = ["Minor", "Major", "Critical"];

interface IncidentEditFields {
  incidentStatus: string;
  cost: number;
  followUpDate: string;
  severity: string;
  notes: string;
}

interface EditIncidentModalProps {
  record: any | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Partial<IncidentEditFields>) => void;
  loading: boolean;
}

export default function EditIncidentModal({ record, open, onClose, onSave, loading }: EditIncidentModalProps) {
  const t = useTranslations("IncidentsPage");
  const [form, setForm] = useState<Partial<IncidentEditFields>>(record || {});

  useEffect(() => {
    if (record) {
      setForm({
        incidentStatus: record.incidentStatus || "",
        cost: record.cost ?? "",
        followUpDate: record.followUpDate ? record.followUpDate.slice(0, 10) : "",
        severity: record.severity || "",
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
      followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{t("edit")}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t("incidentStatus")}</label>
            <Select value={form.incidentStatus || ""} onValueChange={(value) => handleSelectChange("incidentStatus", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("incidentStatus")} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("cost")}</label>
            <Input name="cost" type="number" value={form.cost ?? ""} onChange={handleChange} placeholder={t("cost")} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("followUpDate")}</label>
            <Input name="followUpDate" type="date" value={form.followUpDate ?? ""} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("severity")}</label>
            <Select value={form.severity || ""} onValueChange={(value) => handleSelectChange("severity", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("severity")} />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((severity) => (
                  <SelectItem key={severity} value={severity}>{severity}</SelectItem>
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