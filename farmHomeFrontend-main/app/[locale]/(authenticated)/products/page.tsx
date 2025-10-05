"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Search, Filter, Grid, List, ChevronDown, ShoppingCart, X, Star, MapPin, Pencil, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useCart, Product } from "@/components/CartProvider";
import { apiFetch } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { config } from "@/config";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import LocationAutocomplete from "@/components/LocationAutocomplete";

export default function ProductListingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const router = useRouter();
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const isFirstRender = useRef(true);
  const { cart, addToCart } = useCart();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Add user role detection (from localStorage)
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRole(localStorage.getItem('role'));
    }
  }, []);

  // Admin state for add/edit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    images: [] as File[],
    description: '',
    price: '',
    location: '',
    tags: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit product modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    _id: '',
    name: '',
    images: [] as (File | string)[],
    description: '',
    price: '',
    location: '',
    tags: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const t = useTranslations('ProductsPage');
  const tAdmin = useTranslations('ProductsAdminPage');

  // Function to translate product tags
  const translateTag = (tag: string): string => {
    const tagLower = tag.toLowerCase();
    const translationKey = tagLower as keyof typeof t;
    
    // Check if the translation exists
    try {
      return t(translationKey);
    } catch {
      // If translation doesn't exist, return the original tag
      return tag;
    }
  };

  useEffect(() => {
    setLoading(true);
    apiFetch("/products")
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set([
    ...products.flatMap((product) => product.tags || []),
    'goat', 'meat', 'dairy', 'cheese'
  ]));

  const priceFilters = [
    { label: t('allPrices'), min: 0, max: Infinity },
    { label: t('price0to10'), min: 0, max: 10 },
    { label: t('price10to20'), min: 10, max: 20 },
    { label: t('price20plus'), min: 20, max: Infinity },
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => (product.tags || []).includes(tag));
    const priceRange = priceFilters.find((f: { label: string; min: number; max: number }) => f.label === selectedPrice) || priceFilters[0];
    const matchesPrice = product.price >= priceRange.min && product.price < priceRange.max;
    return matchesSearch && matchesTags && matchesPrice;
  });

  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setTotalPages(Math.ceil(filteredProducts.length / itemsPerPage) || 1);
    if (currentPage > Math.ceil(filteredProducts.length / itemsPerPage)) setCurrentPage(1);
  }, [filteredProducts.length]);

  const paginatedProducts = view === 'list'
    ? filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredProducts;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  // Helper to check if description is 'long' (simulate 2 lines, e.g. > 65 chars)
  const isLongDescription = (desc: string) => desc.length > 60;

  // Handle image upload and preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAddForm({ ...addForm, images: Array.from(e.target.files) });
    }
  };

  // Handle add product submit (real API)
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${config.backendUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: addForm.name,
          description: addForm.description,
          price: addForm.price,
          images: [], // or whatever you want to send
          tags: addForm.tags.split(',').map(t => t.trim()),
          location: addForm.location
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add product');
      }
      setShowAddModal(false);
      setAddLoading(false);
      setAddForm({ name: '', images: [], description: '', price: '', location: '', tags: '' });
      // Optionally refetch products here
      window.location.reload();
    } catch (err: any) {
      setAddError(err.message);
      setAddLoading(false);
    }
  };

  // Handle delete product (real API)
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${config.backendUrl}/products/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete product');
      }
      // Optionally refetch products here
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open edit modal and prefill form
  const handleEditClick = (product: any) => {
    setEditForm({
      _id: product._id,
      name: product.name,
      images: product.images || [],
      description: product.description,
      price: product.price,
      location: product.location || '',
      tags: (product.tags || []).join(', '),
    });
    setShowEditModal(true);
  };

  // Handle image change for edit form
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEditForm({ ...editForm, images: Array.from(e.target.files) });
    }
  };

  // Handle edit product submit
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const formData = new FormData();
      formData.append('name', editForm.name);
      (editForm.images as File[]).forEach((file) => {
        if (typeof file !== 'string') formData.append('images', file);
      });
      formData.append('description', editForm.description);
      formData.append('price', editForm.price);
      formData.append('location', editForm.location);
      formData.append('tags', editForm.tags);
      const res = await fetch(`${config.backendUrl}/products/${editForm._id}`, {
        method: 'PUT',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update product');
      }
      setShowEditModal(false);
      setEditLoading(false);
      setEditForm({ _id: '', name: '', images: [], description: '', price: '', location: '', tags: '' });
      window.location.reload();
    } catch (err: any) {
      setEditError(err.message);
      setEditLoading(false);
    }
  };

  // TODO: Move add product form to /products/new page like alerts/new

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">{t('loading')}</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 text-xl">{t('error')}</div>;
  }
  // Remove early return for filteredProducts.length === 0

  // If super_admin, show admin list view
  if (role === 'super_admin') {
    return (
      <div className="min-h-screen max-w-7xl mx-auto">
        {/* Header with Add Product button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{tAdmin('managementTitle')}</h1>
            <p className="text-gray-600">{tAdmin('managementSubtitle')}</p>
          </div>
          <Link href="/products/new">
            <Button className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition flex items-center gap-2" size="sm">
              <Plus className="h-4 w-4" />
              {tAdmin('addProduct')}
            </Button>
          </Link>
        </div>
        {/* Product Table */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tAdmin('image')}</TableHead>
                <TableHead>{tAdmin('name')}</TableHead>
                <TableHead>{tAdmin('description')}</TableHead>
                <TableHead>{tAdmin('price')}</TableHead>
                <TableHead>{tAdmin('location')}</TableHead>
                <TableHead>{tAdmin('tagsCol')}</TableHead>
                <TableHead>{tAdmin('rating')}</TableHead>
                <TableHead>{tAdmin('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    {product.images && product.images.length > 0 ? (
                      <Image src={getImageUrl(product.images[0])} alt={product.name} width={48} height={48} className="rounded object-cover w-12 h-12" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{product.description}</TableCell>
                  <TableCell>${product.price?.toFixed(2)}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    {product.location && <MapPin className="w-4 h-4 text-green-600" />} {product.location}
                  </TableCell>
                  <TableCell>{product.tags?.join(', ')}</TableCell>
                  <TableCell>
                    {product.ratings && product.ratings.length > 0 ? (
                      (() => {
                        const avg = product.ratings.reduce((sum: number, r: any) => sum + r.value, 0) / product.ratings.length;
                        return (
                          <span className="flex items-center gap-1">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={`w-4 h-4 ${i <= Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                            ))}
                            <span className="text-xs text-gray-400 ml-1">({product.ratings.length})</span>
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-xs text-gray-400">{tAdmin('noRatings')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditClick(product)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product._id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              {`${t('showing')} ${(currentPage - 1) * itemsPerPage + 1} ${t('to')} ${Math.min(currentPage * itemsPerPage, filteredProducts.length)} ${t('of')} ${filteredProducts.length} ${t('results')}`}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        </div>
        {/* Add Product Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold mb-4">{tAdmin('addNewProduct')}</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">{tAdmin('name')}</label>
                  <Input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('images')}</label>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {addForm.images.map((file, idx) => (
                      <img key={idx} src={URL.createObjectURL(file)} alt="preview" className="w-16 h-16 object-cover rounded" />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('description')}</label>
                  <textarea className="w-full border rounded px-2 py-1" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} required />
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('price')}</label>
                  <Input type="number" min="0" step="0.01" value={addForm.price} onChange={e => setAddForm({ ...addForm, price: e.target.value })} required />
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('location')}</label>
                  <LocationAutocomplete
                    value={addForm.location ? { display_name: addForm.location, lat: '', lon: '', address: {} } : null}
                    onChange={option => setAddForm({ ...addForm, location: option ? option.display_name : '' })}
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('tags')}</label>
                  <Input value={addForm.tags} onChange={e => setAddForm({ ...addForm, tags: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>{tAdmin('cancel')}</Button>
                  <Button type="submit" disabled={addLoading}>{addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAdmin('addProduct')}</Button>
                </div>
                {addError && <div className="text-red-500 text-sm mt-2">{addError}</div>}
              </form>
            </div>
          </div>
        )}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowEditModal(false)}><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold mb-4">{tAdmin('editProduct')}</h2>
              <form onSubmit={handleEditProduct} className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">{tAdmin('name')}</label>
                  <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('images')}</label>
                  <input type="file" multiple accept="image/*" onChange={handleEditImageChange} />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {Array.isArray(editForm.images) && editForm.images.length > 0 && editForm.images.map((file, idx) =>
                      typeof file === 'string' ? (
                        <img key={idx} src={getImageUrl(file)} alt="preview" className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <img key={idx} src={URL.createObjectURL(file)} alt="preview" className="w-16 h-16 object-cover rounded" />
                      )
                    )}
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('description')}</label>
                  <textarea className="w-full border rounded px-2 py-1" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} required />
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('price')}</label>
                  <Input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} required />
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('location')}</label>
                  <LocationAutocomplete
                    value={editForm.location ? { display_name: editForm.location, lat: '', lon: '', address: {} } : null}
                    onChange={option => setEditForm({ ...editForm, location: option ? option.display_name : '' })}
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">{tAdmin('tags')}</label>
                  <Input value={editForm.tags} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>{tAdmin('cancel')}</Button>
                  <Button type="submit" disabled={editLoading}>{editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tAdmin('updateProduct')}</Button>
                </div>
                {editError && <div className="text-red-500 text-sm mt-2">{editError}</div>}
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 relative">
              <Button variant="outline" size="sm" onClick={() => setShowPriceFilter((v) => !v)}>
                <Filter className="w-4 h-4 mr-2" />
                {t('filters')}
                <ChevronDown className="ml-1 w-4 h-4" />
              </Button>
              {showPriceFilter && (
                <div className="absolute top-10 left-0 z-20 bg-white border rounded-lg shadow-lg p-2 min-w-[140px]">
                  {priceFilters.map((filter: { label: string; min: number; max: number }) => (
                    <button
                      key={filter.label}
                      className={`block w-full text-left px-3 py-2 rounded hover:bg-green-50 text-sm ${selectedPrice === filter.label ? 'bg-green-100 font-bold' : ''}`}
                      onClick={() => { setSelectedPrice(filter.label); setShowPriceFilter(false); }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}
              <Button variant={view === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setView('grid')}>
                <Grid className="w-4 h-4" />
              </Button>
              <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
                <List className="w-4 h-4" />
              </Button>
              {/* Cart Icon with badge */}
              <div className="relative ">
                <Button variant="outline" size="sm" onClick={() => router.push('/cart')}>
                  <ShoppingCart className="w-5 h-5" />
                  {cart.reduce((sum, item) => sum + (item.quantity || 1), 0) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5 font-bold border-2 border-white">{cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}</span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Button
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleTag(tag)}
                className="capitalize"
              >
                {t(tag)}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid/List */}
        {view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[200px]">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full flex justify-center items-center min-h-[200px]">
                <span className="text-md font-md text-red-500">{t('noProducts')}</span>
              </div>
            ) : (
              filteredProducts
                .filter(product => !!product._id)
                .map((product, index) => {
                const long = isLongDescription(product.description);
                const isHovered = hoveredIndex === index;
                return (
                  <div
                    key={product._id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4 relative group cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => router.push(`/products/${product._id}`)}
                  >
                    {/* Product Image */}
                    <div className="w-full h-60 mb-4 flex items-center justify-center bg-gray-50 rounded-lg cursor-pointer overflow-hidden">
                      <Image
                        src={getImageUrl(product.images[0] || "/placeholder.svg")}
                        alt={product.name}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    {/* Product Info */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.tags && product.tags.length > 0 ? translateTag(product.tags[0]) : ""}</p>
                      {/* Location */}
                      {product.location && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-green-600 inline-block" />
                          <span>{t('location')}: {product.location}</span>
                        </p>
                      )}
                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        {product.ratings && product.ratings.length > 0 ? (
                          (() => {
                            const avg = product.ratings.reduce((sum: number, r: any) => sum + r.value, 0) / product.ratings.length;
                            const stars = [];
                            for (let i = 1; i <= 5; i++) {
                              stars.push(
                                <Star key={i} className={`w-4 h-4 ${i <= Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                              );
                            }
                            return <>
                              {stars}
                              <span className="text-xs text-gray-400 ml-1">({product.ratings.length})</span>
                            </>;
                          })()
                        ) : (
                          <span className="text-xs text-gray-400">{t('noRatings')}</span>
                        )}
                      </div>
                      {/* Price and Description/Button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">${product.price.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* Description or Add to Cart Button */}
                      <div className="min-h-[40px] flex items-center">
                        {isHovered ? (
                          <Button
                            className="w-full bg-green-600 hover:bg-black text-white"
                            onClick={e => { e.stopPropagation(); addToCart(product); }}
                          >
                            {t('addToCart')}
                          </Button>
                        ) : (
                          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="w-full bg-white rounded-2xl p-2 mb-5 shadow-sm hover:shadow-md transition-shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('image')}</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('price')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-red-600 font-semibold py-8 text-lg">{t('noProducts')}</TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts
                    .filter(product => !!product._id)
                    .map((product, index) => {
                    const long = isLongDescription(product.description);
                    return (
                      <TableRow key={product._id} className="cursor-pointer" onClick={() => router.push(`/products/${product._id}`)}>
                        <TableCell>
                          <div className="w-14 h-14 rounded-lg overflow-hidden relative">
                            <Image
                              src={getImageUrl(product.images[0] || "/placeholder.svg")}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">{product.name}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="relative">
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {long
                                ? `${product.description.slice(0, 60)}... `
                                : product.description}
                              {long && (
                                <span className="underline text-gray-600 cursor-default select-none">{t('more')}</span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-lg font-bold text-green-600">${product.price.toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button variant="default" size="sm" className="w-full max-w-[120px]" onClick={e => { e.stopPropagation(); addToCart(product); }}>{t('addToCart')}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                {`${t('showing')} ${(currentPage - 1) * itemsPerPage + 1} ${t('to')} ${Math.min(currentPage * itemsPerPage, filteredProducts.length)} ${t('of')} ${filteredProducts.length} ${t('results')}`}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 

// Helper to normalize image URLs for Next.js <Image />
function normalizeImageUrl(url: string) {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  let normalized = url.replace(/\\/g, "/").replace(/\+/g, "/");
  if (!normalized.startsWith("/")) normalized = "/" + normalized;
  // If it's an upload path, optionally prepend backend URL for dev
  // Uncomment the next line if you want to serve images from backend
  // if (normalized.startsWith("/uploads")) normalized = `${config.backendUrl}${normalized}`;
  return normalized;
} 

// Helper to get full image URL for local images using config.backendUrl
function getImageUrl(img: string) {
  if (!img) return "/placeholder.svg";
  if (img.startsWith('http')) return img;
  // Ensure leading slash
  let path = img.replace(/\\/g, '/').replace(/\+/g, '/');
  if (!path.startsWith('/')) path = '/' + path;
  // Use config.backendUrl for protocol/host/port
  let backendUrl = config.backendUrl;
  // Remove trailing slash if present
  if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);
  return `${backendUrl}${path}`;
} 