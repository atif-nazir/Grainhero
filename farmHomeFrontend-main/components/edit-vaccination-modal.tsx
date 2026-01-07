// import { useState, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { useTranslations } from 'next-intl';

// interface VaccinationRecord {
//   _id?: string;
//   id?: string;
//   animalTagId: string;
//   vaccineName: string;
//   manufacturer: string;
//   batchNumber: string;
//   treatmentDate: string;
//   nextDueDate: string;
//   administeredBy: string;
//   status: string;
//   cost: number;
//   vaccinationType: string;
// }

// const statusOptions = ["Completed", "Scheduled", "Overdue"];
// const typeOptions = ["Core", "Non-Core", "Risk-Based"];

// interface EditVaccinationModalProps {
//   record: VaccinationRecord | null;
//   open: boolean;
//   onClose: () => void;
//   onSave: (updated: Partial<VaccinationRecord>) => void;
//   loading: boolean;
// }

// export default function EditVaccinationModal({ record, open, onClose, onSave, loading }: EditVaccinationModalProps) {
//   const t = useTranslations('VaccinationsPage');
//   const [form, setForm] = useState<Partial<VaccinationRecord>>(record || {});

//   useEffect(() => {
//     if (record) {
//       setForm({
//         ...record,
//         treatmentDate: record.treatmentDate ? record.treatmentDate.slice(0, 10) : "",
//         nextDueDate: record.nextDueDate ? record.nextDueDate.slice(0, 10) : "",
//       });
//     } else {
//       setForm({});
//     }
//   }, [record]);

//   if (!open || !record) return null;

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setForm((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSave = () => {
//     const updated = {
//       ...form,
//       treatmentDate: form.treatmentDate ? new Date(form.treatmentDate).toISOString() : undefined,
//       nextDueDate: form.nextDueDate ? new Date(form.nextDueDate).toISOString() : undefined,
//     };
//     onSave(updated);
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
//       <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
//         <h2 className="text-xl font-bold mb-4">{t("edit")} {record.vaccineName}</h2>
//         <div className="space-y-3">
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('animalId')}</label>
//             <Input name="animalTagId" value={form.animalTagId || ""} onChange={handleChange} />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('vaccineName')}</label>
//             <Input name="vaccineName" value={form.vaccineName || ""} onChange={handleChange} />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('manufacturer')}</label>
//             <Input name="manufacturer" value={form.manufacturer || ""} onChange={handleChange} />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('batchNumber')}</label>
//             <Input name="batchNumber" value={form.batchNumber || ""} onChange={handleChange} />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('treatmentDate')}</label>
//             <Input name="treatmentDate" type="date" value={form.treatmentDate || ""} onChange={handleChange} />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('nextDueDate')}</label>
//             <Input name="nextDueDate" type="date" value={form.nextDueDate || ""} onChange={handleChange} />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('administeredBy')}</label>
//             <Input name="administeredBy" value={form.administeredBy || ""} onChange={handleChange} />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('status')}</label>
//             <select name="status" value={form.status || ""} onChange={handleChange} className="w-full border rounded px-2 py-1">
//               <option value="">Select status</option>
//               {statusOptions.map((status) => (
//                 <option key={status} value={status}>{status}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('cost')}</label>
//             <Input name="cost" type="number" value={form.cost || ""} onChange={handleChange} />
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">{t('vaccinationType')}</label>
//             <select name="vaccinationType" value={form.vaccinationType || ""} onChange={handleChange} className="w-full border rounded px-2 py-1">
//               <option value="">Select type</option>
//               {typeOptions.map((type) => (
//                 <option key={type} value={type}>{type}</option>
//               ))}
//             </select>
//           </div>
//         </div>
//         <div className="flex justify-end space-x-2 mt-6">
//           <Button variant="outline" onClick={onClose} disabled={loading}>{t("cancel")}</Button>
//           <Button onClick={handleSave} disabled={loading}>{loading ? t("saving") : t("save")}</Button>
//         </div>
//       </div>
//     </div>
//   )
// } 