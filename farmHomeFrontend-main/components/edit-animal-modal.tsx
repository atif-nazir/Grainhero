import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/app/[locale]/providers"
import { config } from "@/config"
import { useTranslations } from 'next-intl';

interface Animal {
  id: string
  tagId: string
  breed: string
  gender: string
  dob: string
  weight: number
  condition: string
  status: string
  farmhouse?: string
  sireId?: string
  damId?: string
  acquisitionType?: string
  acquisitionDate?: string
}
const conditions = ["Excellent", "Good", "Fair", "Poor"]
const acquisitionTypes = ["Birth", "Purchase", "Gift", "Trade"]
const statusOptions = ["Alive", "Dead"]

interface EditAnimalModalProps {
  animal: Animal | null
  open: boolean
  onClose: () => void
  onSave: (updated: Partial<Animal>) => void
  loading: boolean
}

export default function EditAnimalModal({ animal, open, onClose, onSave, loading }: EditAnimalModalProps) {
  const t = useTranslations("AnimalsPage")
  const [form, setForm] = useState<Partial<Animal>>(animal || {})
  const [farmhouses, setFarmhouses] = useState<{ _id?: string, f_id: string, Name: string }[]>([])
  const [farmhouseLoading, setFarmhouseLoading] = useState(true)

  useEffect(() => {
    if (animal) {
      setForm({
        ...animal,
        dob: animal.dob ? animal.dob.slice(0, 10) : "",
        acquisitionDate: animal.acquisitionDate ? animal.acquisitionDate.slice(0, 10) : "",
      })
    } else {
      setForm({})
    }
  }, [animal])

  useEffect(() => {
    const fetchFarmhouses = async () => {
      setFarmhouseLoading(true)
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`${config.backendUrl}/farmhouse`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        })
        const data = await res.json()
        setFarmhouses(Array.isArray(data.farmhouses) ? data.farmhouses : data)
      } catch (err) {
        setFarmhouses([])
      } finally {
        setFarmhouseLoading(false)
      }
    }
    fetchFarmhouses()
  }, [])

  if (!open || !animal) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    // Convert date fields back to ISO if present
    const updated = {
      ...form,
      dob: form.dob ? new Date(form.dob).toISOString() : undefined,
      acquisitionDate: form.acquisitionDate ? new Date(form.acquisitionDate).toISOString() : undefined,
    }
    onSave(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{t("edit")} {animal.tagId}</h2>
        <div className="space-y-3">
          {/* Editable fields except id, tagId, sireId, damId */}
          <div>
            <label className="block text-sm font-medium mb-1">{t("breed")}</label>
            <Input name="breed" value={form.breed || ""} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("gender")}</label>
            <select name="gender" value={form.gender || ""} onChange={handleChange} className="w-full border rounded px-2 py-1">
              <option value="Male">{t("male")}</option>
              <option value="Female">{t("female")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("dob")}</label>
            <Input name="dob" type="date" value={form.dob || ""} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("weight")}</label>
            <Input name="weight" type="number" value={form.weight || ""} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("condition")}</label>
            <select name="condition" value={form.condition || ""} onChange={handleChange} className="w-full border rounded px-2 py-1">
              <option value="">{t("selectCondition")}</option>
              {conditions.map((condition) => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>
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
            <label className="block text-sm font-medium mb-1">{t("farmhouse")}</label>
            <select
              name="farmhouse"
              value={form.farmhouse || ""}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1"
              disabled={farmhouseLoading}
            >
              <option value="">{t("selectFarmhouse")}</option>
              {farmhouses.map((fh) => (
                <option key={fh._id || fh.f_id} value={fh._id || fh.f_id}>{fh.Name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("acquisitionType")}</label>
            <select name="acquisitionType" value={form.acquisitionType || ""} onChange={handleChange} className="w-full border rounded px-2 py-1">
              <option value="">{t("selectAcquisitionType")}</option>
              {acquisitionTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("acquisitionDate")}</label>
            <Input name="acquisitionDate" type="date" value={form.acquisitionDate || ""} onChange={handleChange} />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t("cancelButton")}</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? t("creating") : t("update")}</Button>
        </div>
      </div>
    </div>
  )
} 