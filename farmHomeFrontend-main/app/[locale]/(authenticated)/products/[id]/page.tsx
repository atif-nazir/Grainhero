"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, Star, Minus, Plus, ShoppingCart, Shield, Truck, RotateCcw, ShoppingCart as CartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/components/CartProvider";
import { apiFetch } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { config } from "@/config";
import { Input } from "@/components/ui/input";

// Helper to get full image URL for local images using config.backendUrl
function getImageUrl(img: string) {
  if (!img) return "/placeholder.svg";
  if (img.startsWith('http')) return img;
  // Ensure leading slash
  let path = img.replace(/\\/g, '/').replace(/\+/g, '/');
  if (!path.startsWith('/')) path = '/' + path;
  // Use config.backendUrl for protocol/host/port
  let backendUrl = config.backendUrl;
  if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);
  return `${backendUrl}${path}`;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);
  const { addToCart, cart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Remove state and logic for user rating form

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState<any>(null);

  const t = useTranslations('ProductDetailPage');

  // Fetch product details from backend
  useEffect(() => {
    setLoading(true);
    apiFetch(`/products/${params.id}`)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Log product details when loaded
  useEffect(() => {
    if (product) {
      console.log('Product details:', product);
      if (product.images) {
        console.log('Product images:', product.images);
      }
    }
  }, [product]);

  // Helper: calculate average rating
  const averageRating = product && product.ratings && product.ratings.length > 0
    ? product.ratings.reduce((sum: number, r: any) => sum + r.value, 0) / product.ratings.length
    : 0;

  // Remove buyerInfo fetch on mount
  // useEffect(() => {
  //   const fetchBuyerInfo = async (buyerId: string) => {
  //     try {
  //       const res = await fetch(`${config.backendUrl}/user/${buyerId}`);
  //       if (!res.ok) throw new Error("Failed to fetch user info");
  //       const data = await res.json();
  //       setBuyerInfo(data);
  //     } catch (err: any) {
  //       setBuyerInfo(null);
  //     }
  //   };
  //   if (userId) fetchBuyerInfo(userId);
  // }, [userId]);

  const handleRequestQuote = async () => {
    setQuoteLoading(true);
    setQuoteError(null);
    setQuoteSuccess(false);
    try {
      // Fetch buyer info when button is pressed
      let info = buyerInfo;
      if (!info) {
        let localUserId = null;
        if (typeof window !== 'undefined') {
          try {
            localUserId = localStorage.getItem('id');
            if (localUserId) {
              localUserId = localUserId.trim();
              localUserId = localUserId.replace(/^"+|"+$/g, "");
            }
          } catch {}
        }
        const res = await fetch(`${config.backendUrl}/auth/user/${localUserId}`);
        if (!res.ok) throw new Error("Failed to fetch user info");
        info = await res.json();
        setBuyerInfo(info);
        console.log('Fetched buyer info:', info);
      }
      console.log('Requesting quote with:', {
        userId: info?._id,
        productId: product._id,
        productName: product.name,
        quantity
      });
      const res = await fetch(`${config.backendUrl}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product._id,
          productName: product.name,
          productCurrentPrice: product.price,
          buyerId: info._id,
          buyerName: info.name,
          buyerEmail: info.email,
          quantity,
          buyerPhone: info.phone
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to request quote");
      }
      setQuoteSuccess(true);
    } catch (err: any) {
      setQuoteError(err.message);
    } finally {
      setQuoteLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">{t('loading')}</div>;
  }
  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('notFound')}</h1>
          <Button onClick={() => router.push("/products")}>{t('back')}</Button>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (change: number) => {
    setQuantity(Math.max(1, quantity + change));
  };

  // Add swipe handlers for carousel
  const handleDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -50) {
      setSelectedImage((prev) => (prev + 1) % product.images.length);
    } else if (info.offset.x > 50) {
      setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const handleAddToCart = () => {
    addToCart({ ...product, quantity, tags: [] });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  // Cart badge count
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="min-h-screen min-w-full flex px-4">
      <div className="w-full mx-auto">
        {/* Top Row: Back Button and Cart Button */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.push("/products")}
            className="">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => router.push('/cart')}>
              <CartIcon className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5 font-bold border-2 border-white">{cartCount}</span>
              )}
            </Button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Product Images */}
          <div className="space-y-4 w-full">
            <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-center overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                <motion.img
                  key={product.images[selectedImage]}
                  src={getImageUrl(product.images[selectedImage] || "/placeholder.svg")}
                  alt={product.name}
                  className="object-contain w-full h-full rounded-lg"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  style={{ cursor: product.images.length > 1 ? "grab" : "default" }}
                />
              </AnimatePresence>
            </div>
            {/* Navigation Dots: always show, even for one image */}
            <div className="flex justify-center gap-2 mt-2">
              {product.images.map((_: unknown, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    selectedImage === idx ? "bg-black border-black" : "bg-gray-200 border-gray-300"
                  }`}
                  aria-label={`${t('goToImage')} ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-600 leading-relaxed mb-4">{product.description}</p>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-2xl font-bold text-gray-900">${product.price}</span>
            </div>
            {/* Location */}
            {product.location && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{t('location')}: {product.location}</span>
              </div>
            )}
            {/* Average Rating */}
            <div className="flex items-center gap-2">
              {averageRating > 0 ? (
                <>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-5 h-5 ${i <= Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">({product.ratings.length})</span>
                </>
              ) : (
                <span className="text-xs text-gray-400">{t('noRatings')}</span>
              )}
            </div>
            {/* All Ratings */}
            {product.ratings && product.ratings.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">{t('allRatings')}</h3>
                <div className="space-y-2">
                  {product.ratings.map((r: any, idx: number) => (
                    <div key={idx} className="border rounded p-2 bg-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} className={`w-4 h-4 ${star <= r.value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">{r.comment || t('noComment')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-medium">{t('quantity')}:</span>
                <div className="flex items-center border rounded-lg">
                  <Button variant="ghost" size="sm" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="px-4 py-2 font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuantityChange(1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button
                size="lg"
                className={`w-full bg-blue-600 hover:bg-blue-700 ${added ? "bg-green-600 hover:bg-green-700" : ""}`}
                onClick={handleAddToCart}
                disabled={added}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {added ? t('added') : t('addToCart')}
              </Button>
              {/* Quote feedback messages */}
              {quoteError && (
                <div className="mb-2 text-red-500 text-sm text-center">{quoteError}</div>
              )}
              {quoteSuccess && (
                <div className="mb-2 text-green-600 text-sm text-center">Quote requested! We will contact you soon.</div>
              )}
              <Button
                size="lg"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={handleRequestQuote}
                disabled={quoteLoading}
              >
                {quoteLoading ? "Requesting..." : "Request a Quote"}
              </Button>
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => router.push(`/checkout?productId=${product._id}&quantity=${quantity}`)}
              >
                {t('buyNow')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 