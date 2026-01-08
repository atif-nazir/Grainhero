// "use client";

// import { useCart } from "@/components/CartProvider";
// import { useState, useEffect } from "react";
// import Image from "next/image";
// import { Button } from "@/components/ui/button";
// import { useRouter } from "next/navigation";
// import { X } from "lucide-react";
// import { useTranslations } from 'next-intl';
// import { useAuth } from "@/app/[locale]/providers";
// import { config } from "@/config";

// const shippingOptions = [
//   { label: "Store pickup (in 20 min)", value: "pickup", price: 0, desc: "FREE" },
//   { label: "Delivery at home (under 2-4 days)", value: "delivery", price: 9.9, desc: "9.90€" },
// ];

// // Helper to get full image URL for local images using config.backendUrl
// function getImageUrl(img: string) {
//   if (!img) return "/placeholder.svg";
//   if (img.startsWith('http')) return img;
//   let path = img.replace(/\\/g, '/').replace(/\+/g, '/');
//   if (!path.startsWith('/')) path = '/' + path;
//   let backendUrl = config.backendUrl;
//   if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);
//   return `${backendUrl}${path}`;
// }

// export default function CartPage() {
//   const [shipping, setShipping] = useState("pickup");
//   const router = useRouter();
//   const t = useTranslations('CartPage');
//   const { user, isLoading } = useAuth();

//   const { cart, updateQty, removeFromCart, cartTotal } = useCart();
//   const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
//   const shippingCost = shipping === "pickup" ? 0 : 9.9;
//   const total = subtotal + shippingCost;

//   // Authorization check
//   useEffect(() => {
//     if (!isLoading && !user) {
//       router.push("/auth/login");
//     }
//   }, [user, isLoading, router]);

//   // Get user ID from localStorage
//   const getUserId = (): string | null => {
//     if (typeof window !== 'undefined') {
//       try {
//         const userStr = localStorage.getItem("farm-home-user");
//         if (userStr) {
//           const userData = JSON.parse(userStr);
//           return userData.id || null;
//         }
//       } catch (error) {
//         console.error("Error parsing user data:", error);
//       }
//     }
//     return null;
//   };

//   // Update shipping options with translations
//   const translatedShippingOptions = [
//     { label: t('pickup'), value: "pickup", price: 0, desc: t('free') },
//     { label: t('delivery'), value: "delivery", price: 9.9, desc: "9.90€" },
//   ];

//   // Handle checkout with user ID and order status
//   const handleCheckout = () => {
//     const userId = getUserId();
//     if (!userId) {
//       alert("User not authenticated. Please log in again.");
//       router.push("/auth/login");
//       return;
//     }

//     // Prepare order data with new fields
//     const orderData = {
//       userId: userId,
//       orderStatus: "pending", // Default status as mentioned
//       items: cart.map(item => ({
//         productId: item._id,
//         quantity: item.quantity || 1,
//         price: item.price
//       })),
//       shipping: shipping,
//       shippingCost: shippingCost,
//       subtotal: subtotal,
//       total: total
//     };

//     // Store order data in localStorage for checkout page
//     localStorage.setItem("pending-order", JSON.stringify(orderData));
//     router.push('/checkout');
//   };

//   if (isLoading) {
//     return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>;
//   }

//   if (!user) {
//     return null; // Will redirect to login
//   }

//   return (
//     <div className="min-h-screen w-full bg-white flex rounded-2xl shadow-lg">
//       <div className="w-full bg-white rounded-2xl shadow-lg p-8">
//         <div className="flex justify-between items-center mb-8 ">
//           <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
//           <Button variant="outline" onClick={() => router.push("/products")}>{t('continueShopping')}</Button>
//         </div>
//         {/* Table */}
//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-separate border-spacing-y-4 bg-white border rounded-xl pl-5">
//             <thead>
//               <tr className="text-gray-500 text-sm items-center">
//                 <th className="font-semibold">{t('product')}</th>
//                 <th className="font-semibold">{t('price')}</th>
//                 <th className="font-semibold">{t('qty')}</th>
//                 <th className="font-semibold">{t('total')}</th>
//                 <th></th>
//               </tr>
//             </thead>
//             <tbody>
//               {cart.length === 0 ? (
//                 <tr>
//                   <td colSpan={5} className="text-center text-gray-400 py-12 text-lg">
//                     {t('empty')}<br />
//                     <span className="text-xs text-gray-300">{t('tip')}</span>
//                   </td>
//                 </tr>
//               ) : (
//                 cart.filter(item => item && item._id && item.name && item.price && item.images && item.images.length > 0)
//                   .map((item) => (
//                     <tr key={item._id} className="bg-white rounded-xl shadow-sm">
//                     <td className="flex items-center gap-4 py-4">
//                       <div className="w-16 h-16 rounded-lg overflow-hidden relative border">
//                         <Image
//                           src={getImageUrl(item.images[0] || "/placeholder.svg")}
//                           onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
//                           alt={item.name}
//                           fill
//                           className="object-cover"
//                           sizes="64px"
//                         />
//                       </div>
//                       <div>
//                         <div className="font-semibold text-gray-900 text-base">{item.name}</div>
//                         <div className="text-xs text-gray-400">{t('id')}: {item._id}</div>
//                         {/* Optionally add more details here */}
//                       </div>
//                     </td>
//                     <td className="text-base font-semibold text-gray-700">{item.price.toFixed(2)}€</td>
//                     <td>
//                       <div className="flex items-center gap-2">
//                         <Button size="icon" variant="outline" onClick={() => updateQty(item._id, -1)}>-</Button>
//                         <span className="w-8 text-center font-semibold text-base">{item.quantity || 1}</span>
//                         <Button size="icon" variant="outline" onClick={() => updateQty(item._id, 1)}>+</Button>
//                       </div>
//                     </td>
//                     <td className="text-base font-bold text-gray-900">{(item.price * (item.quantity || 1)).toFixed(2)}€</td>
//                     <td>
//                       <button className="text-gray-400 hover:text-red-500" onClick={() => removeFromCart(item._id)}>
//                         <X className="w-5 h-5" />
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//         {/* Shipping and Summary */}
//         <div className="flex flex-col md:flex-row gap-8 mt-10">
//           <div className="flex-1">
//             <div className="bg-[#f7f8fa] rounded-xl p-6 shadow-inner">
//               <div className="font-semibold mb-4">{t('chooseShipping')}</div>
//               <div className="flex flex-col gap-3">
//                 {translatedShippingOptions.map((opt) => (
//                   <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${shipping === opt.value ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
//                     <input
//                       type="radio"
//                       name="shipping"
//                       value={opt.value}
//                       checked={shipping === opt.value}
//                       onChange={() => setShipping(opt.value)}
//                       className="accent-red-500 w-4 h-4"
//                     />
//                     <span className="font-medium text-gray-700">{opt.label}</span>
//                     <span className={`ml-auto text-sm font-bold ${opt.price === 0 ? 'text-green-600' : 'text-gray-700'}`}>{opt.desc}</span>
//                   </label>
//                 ))}
//               </div>
             
//             </div>
//           </div>
//           <div className="w-full md:w-80">
//             <div className="bg-[#f7f8fa] rounded-xl p-6 shadow-inner flex flex-col gap-4">
//               <div className="flex justify-between text-gray-700">
//                 <span>{t('subtotal')}</span>
//                 <span>{subtotal.toFixed(2)}€</span>
//               </div>
//               <div className="flex justify-between text-gray-700">
//                 <span>{t('shipping')}</span>
//                 <span>{shippingCost === 0 ? t('free') : `${shippingCost.toFixed(2)}€`}</span>
//               </div>
//               <div className="flex justify-between items-center mt-2 pt-2 border-t font-bold text-lg">
//                 <span>{t('total')}</span>
//                 <span className="text-red-500 text-2xl">{total.toFixed(2)}€</span>
//               </div>
//               <Button 
//                 variant="destructive" 
//                 size="lg" 
//                 className="w-full rounded-xl text-base font-semibold py-3 mt-2 hover:bg-black hover:text-white" 
//                 onClick={handleCheckout}
//                 disabled={cart.length === 0}
//               >
//                 {t('checkout')}
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// } 



 