// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Loader2, ArrowLeft, Image as ImageIcon } from "lucide-react";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { config } from "@/config";
// import React from "react";
// import LocationAutocomplete from "@/components/LocationAutocomplete";
// import { useTranslations } from 'next-intl';

// interface ProductFormProps {
//   onSubmit: (data: { name: string; images: File[]; description: string; price: string; location: string; tags: string }) => void;
//   loading: boolean;
//   submitLabel: string;
// }

// function ProductForm({ onSubmit, loading, submitLabel }: ProductFormProps) {
//   const tAdmin = useTranslations('ProductsAdminPage');
//   const [name, setName] = useState("");
//   const [images, setImages] = useState<File[]>([]);
//   const [description, setDescription] = useState("");
//   const [price, setPrice] = useState("");
//   const [location, setLocation] = useState<string>("");
//   const [locationObj, setLocationObj] = useState<any>(null);
//   const [tags, setTags] = useState("");

//   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files) {
//       setImages(Array.from(e.target.files));
//     }
//   };

//   return (
//     <form
//       className="space-y-4"
//       onSubmit={(e: React.FormEvent) => {
//         e.preventDefault();
//         onSubmit({ name, images, description, price, location, tags });
//       }}
//     >
//       <div>
//         <label className="block font-medium">{tAdmin('name')}</label>
//         <Input value={name} onChange={e => setName(e.target.value)} required />
//       </div>
//       <div>
//         <label className="block font-medium">{tAdmin('images')}</label>
//         <input type="file" multiple accept="image/*" onChange={handleImageChange} />
//         <div className="flex gap-2 mt-2 flex-wrap">
//           {images.length > 0 ? images.map((file, idx) => (
//             <img key={idx} src={URL.createObjectURL(file)} alt="preview" className="w-16 h-16 object-cover rounded" />
//           )) : <ImageIcon className="w-8 h-8 text-gray-300" />}
//         </div>
//       </div>
//       <div>
//         <label className="block font-medium">{tAdmin('description')}</label>
//         <textarea className="w-full border rounded px-2 py-1" value={description} onChange={e => setDescription(e.target.value)} required />
//       </div>
//       <div>
//         <label className="block font-medium">{tAdmin('price')}</label>
//         <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
//       </div>
//       <div>
//         <label className="block font-medium">{tAdmin('location')}</label>
//         <LocationAutocomplete
//           value={locationObj}
//           onChange={option => {
//             setLocationObj(option);
//             setLocation(option ? option.display_name : "");
//           }}
//           required
//         />
//       </div>
//       <div>
//         <label className="block font-medium">{tAdmin('tags')}</label>
//         <Input value={tags} onChange={e => setTags(e.target.value)} />
//       </div>
//       <Button type="submit" disabled={loading} className="bg-black text-white">
//         {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
//       </Button>
//     </form>
//   );
// }

// export default function NewProductPage() {
//   const tAdmin = useTranslations('ProductsAdminPage');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const router = useRouter();

//   const handleCreate = async (data: { name: string; images: File[]; description: string; price: string; location: string; tags: string }) => {
//     setLoading(true);
//     setError(null);
//     try {
//       const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
//       const formData = new FormData();
//       formData.append('name', data.name);
//       data.images.forEach((file: File) => formData.append('images', file));
//       formData.append('description', data.description);
//       formData.append('price', data.price);
//       formData.append('location', data.location);
//       formData.append('tags', data.tags);
//       const res = await fetch(`${config.backendUrl}/products`, {
//         method: "POST",
//         headers: {
//           ...(token ? { Authorization: `Bearer ${token}` } : {})
//         },
//         body: formData,
//       });
//       if (!res.ok) {
//         const data = await res.json().catch(() => ({}));
//         throw new Error(data.error || "Failed to create product");
//       }
//       router.push("/products");
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : String(err));
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center space-x-4">
//         <Link href="/products">
//           <Button variant="ghost" size="sm">
//             <ArrowLeft className="w-4 h-4 mr-2" />
//             {tAdmin('backToProducts')}
//           </Button>
//         </Link>
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900">{tAdmin('addNewProduct')}</h1>
//           <p className="text-gray-600">{tAdmin('createListing')}</p>
//         </div>
//       </div>
//       <Card className="w-full">
//         <CardHeader>
//           <CardTitle>{tAdmin('productInfo')}</CardTitle>
//           <CardDescription>{tAdmin('productInfoDesc')}</CardDescription>
//         </CardHeader>
//         <CardContent>
//           {error && <div className="text-red-500 mb-2">{error}</div>}
//           <ProductForm onSubmit={handleCreate} loading={loading} submitLabel={tAdmin('addProduct')} />
//         </CardContent>
//       </Card>
//     </div>
//   );
// } 