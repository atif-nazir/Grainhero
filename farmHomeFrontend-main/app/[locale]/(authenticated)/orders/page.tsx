// "use client"

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Loader2, Trash2 } from "lucide-react"
// import { config } from "@/config"
// import { Badge } from "@/components/ui/badge"
// import { useTranslations } from 'next-intl';
// import { apiFetch } from "@/lib/utils";
// import { Edit, Star } from "lucide-react"
// import { Button } from "@/components/ui/button"

// interface OrderProduct {
//   id: string
//   quantity: number
// }

// interface Order {
//   _id: string
//   userId: string
//   orderStatus: string
//   firstName: string
//   lastName: string
//   email: string
//   phone?: string
//   address: string
//   city: string
//   state: string
//   zipCode: string
//   country: string
//   cardNumber: string
//   expiryDate: string
//   cvv: string
//   cardName: string
//   orderNotes?: string
//   products: OrderProduct[]
//   createdAt: string
//   updatedAt: string
// }

// const ORDER_STATUSES = [
//   "pending",
//   "confirmed",
//   "processing",
//   "shipped",
//   "delivered",
//   "cancelled"
// ]

// function getUserInfoFromLocalStorage() {
//   if (typeof window !== 'undefined') {
//     try {
//       let idRaw = localStorage.getItem('id') || '';
//       let userId = idRaw;
//       try {
//         userId = idRaw ? JSON.parse(idRaw) : '';
//       } catch {
//         userId = idRaw;
//       }
//       // Remove extra quotes if present
//       if (typeof userId === "string") {
//         userId = userId.replace(/^"+|"+$/g, "");
//       }
//       const role = localStorage.getItem('role') || '';
//       const name = localStorage.getItem('name') || '';
//       const email = localStorage.getItem('email') || '';
//       const phone = localStorage.getItem('phone') || '';
//       const token = localStorage.getItem('token') || '';
//       const userInfo = { id: userId, role, name, email, phone, token };
//       console.log('User info from localStorage:', userInfo);
//       return userInfo;
//     } catch (e) {}
//   }
//   return { id: '', role: '', name: '', email: '', phone: '', token: '' };
// }

// // Add a function to get badge color for order status
// const getOrderStatusColor = (status: string) => {
//   switch (status) {
//     case "pending":
//       return "default" // black
//     case "confirmed":
//       return "secondary"
//     case "processing":
//       return "outline" // blue/gray
//     case "shipped":
//     case "delivered":
//       return "default" // will add custom class for green
//     case "cancelled":
//       return "destructive"
//     default:
//       return "secondary"
//   }
// }

// interface ProductRatingModalProps {
//   open: boolean;
//   onClose: () => void;
//   order: Order;
//   products: OrderProduct[];
//   userToken: string;
//   onRatingChange?: (productId: string, rating: { value: number; comment: string } | null) => void;
// }

// type ProductDetailsMap = { [id: string]: { id: string; name: string; ratings: { user: string; value: number; comment: string }[] } };
// type UserRatingsMap = { [id: string]: { user: string; value: number; comment: string } };

// function ProductRatingModal({ open, onClose, order, products, userToken, onRatingChange }: ProductRatingModalProps) {
//   const t = useTranslations('OrdersRatingSection')
//   const [productDetails, setProductDetails] = useState<ProductDetailsMap>({});
//   const [loading, setLoading] = useState(false);
//   const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
//   const [ratingValue, setRatingValue] = useState(0);
//   const [comment, setComment] = useState("");
//   const [ratingLoading, setRatingLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const [userRatings, setUserRatings] = useState<UserRatingsMap>({});

//   useEffect(() => {
//     if (!open) return;
//     setLoading(true);
//     Promise.all(products.map(async (p: OrderProduct) => {
//       try {
//         const prod = await apiFetch(`/products/${p.id}`);
//         return { id: p.id, name: prod.name, ratings: prod.ratings };
//       } catch {
//         return { id: p.id, name: p.id, ratings: [] };
//       }
//     })).then((details: { id: string; name: string; ratings: { user: string; value: number; comment: string }[] }[]) => {
//       const detailsMap: ProductDetailsMap = {};
//       const ratingsMap: UserRatingsMap = {};
//       details.forEach((d) => {
//         detailsMap[d.id] = d;
//         // Find current user's rating for this product
//         const myRating = d.ratings.find((r: { user: string }) => r.user === order.userId);
//         if (myRating) ratingsMap[d.id] = myRating;
//       });
//       setProductDetails(detailsMap);
//       setUserRatings(ratingsMap);
//       setLoading(false);
//     });
//   }, [open, products, order.userId]);

//   const handleOpenProduct = (productId: string) => {
//     setSelectedProduct(productId);
//     setError("");
//     setSuccess("");
//     const myRating = userRatings[productId];
//     setRatingValue(myRating ? myRating.value : 0);
//     setComment(myRating ? myRating.comment : "");
//   };

//   const handleRate = async (method: 'PATCH' | 'PUT' | 'DELETE') => {
//     if (!selectedProduct) return;
//     setRatingLoading(true);
//     setError("");
//     setSuccess("");
//     try {
//       const url = `/orders/${order._id}/product/${selectedProduct}/rate`;
//       const body = method !== 'DELETE' ? { value: ratingValue, comment } : undefined;
//       const res = await fetch(`${config.backendUrl}${url}`, {
//         method: method === 'PATCH' ? 'PATCH' : method === 'PUT' ? 'PUT' : 'DELETE',
//         headers: {
//           'Content-Type': 'application/json',
//           ...(userToken ? { Authorization: `Bearer ${userToken}` } : {})
//         },
//         ...(body ? { body: JSON.stringify(body) } : {})
//       });
//       if (!res.ok) {
//         const data = await res.json().catch(() => ({}));
//         throw new Error(data.error || t('failedToRateProduct'));
//       }
//       setSuccess(method === 'DELETE' ? t('ratingDeleted') : t('ratingSaved'));
//       onRatingChange && onRatingChange(selectedProduct, method === 'DELETE' ? null : { value: ratingValue, comment });
//       // Refresh product details
//       const prod = await apiFetch(`/products/${selectedProduct}`);
//       setProductDetails((prev) => ({ ...prev, [selectedProduct]: { ...prev[selectedProduct], ratings: prod.ratings } }));
//       // Update userRatings
//       const myRating = prod.ratings.find((r: { user: string }) => r.user === order.userId);
//       setUserRatings((prev) => ({ ...prev, [selectedProduct]: myRating }));
//     } catch (err: unknown) {
//       setError((err as Error).message);
//     } finally {
//       setRatingLoading(false);
//     }
//   };

//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
//       <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
//         <h2 className="text-xl font-bold mb-4">{t('modalTitle')}</h2>
//         {loading ? (
//           <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin mr-2" /> {t('loading')}</div>
//         ) : (
//           <div className="space-y-4">
//             {products.map((p) => (
//               <div key={p.id} className="flex items-center justify-between border-b pb-2 mb-2">
//                 <div>
//                   <div className="font-semibold">{productDetails[p.id]?.name || p.id}</div>
//                   <div className="text-xs text-gray-500">{t('productId')} {p.id}</div>
//                 </div>
//                 <Button size="sm" variant="outline" onClick={() => handleOpenProduct(p.id)}>
//                   {userRatings[p.id] ? t('editRating') : t('addRating')}
//                 </Button>
//               </div>
//             ))}
//           </div>
//         )}
//         {selectedProduct && (
//           <div className="mt-4 border-t pt-4">
//             <div className="font-semibold mb-2">{productDetails[selectedProduct]?.name || selectedProduct}</div>
//             <div className="flex items-center gap-2 mb-2">
//               {[1,2,3,4,5].map(star => (
//                 <button
//                   key={star}
//                   type="button"
//                   onClick={() => setRatingValue(star)}
//                   className={star <= ratingValue ? 'text-yellow-400' : 'text-gray-300'}
//                 >
//                   <Star className="w-6 h-6 fill-current" />
//                 </button>
//               ))}
//               <span className="ml-2 text-sm">{ratingValue > 0 ? ratingValue : t('noRatingSelected')}</span>
//             </div>
//             <textarea
//               className="w-full border rounded px-2 py-1 mb-2"
//               placeholder={t('addCommentPlaceholder')}
//               value={comment}
//               onChange={e => setComment(e.target.value)}
//               rows={2}
//             />
//             <div className="flex gap-2">
//               <Button onClick={() => handleRate(userRatings[selectedProduct] ? 'PUT' : 'PATCH')} disabled={ratingLoading || ratingValue < 1 || ratingValue > 5}>
//                 {userRatings[selectedProduct] ? t('updateRating') : t('submitRating')}
//               </Button>
//               {userRatings[selectedProduct] && (
//                 <Button variant="destructive" onClick={() => handleRate('DELETE')} disabled={ratingLoading}>{t('deleteRating')}</Button>
//               )}
//               <Button variant="outline" onClick={() => setSelectedProduct(null)}>{t('cancel')}</Button>
//             </div>
//             {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
//             {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
//           </div>
//         )}
//         <div className="flex justify-end mt-6">
//           <Button variant="outline" onClick={onClose}>{t('close')}</Button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function OrdersPage() {
//   const router = useRouter()
//   const [orders, setOrders] = useState<Order[]>([])
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)
//   const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
//   const [userInfo, setUserInfo] = useState(getUserInfoFromLocalStorage())
//   const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
//   const t = useTranslations('OrdersPage');
//   const tRating = useTranslations('OrdersRatingSection');
//   const [ratingModalOrder, setRatingModalOrder] = useState<Order | null>(null);

//   useEffect(() => {
//     setUserInfo(getUserInfoFromLocalStorage())
//   }, [])

//   // Authentication: redirect if not logged in
//   useEffect(() => {
//     if (!userInfo.id || !userInfo.token) {
//       router.push('/auth/login')
//     }
//   }, [userInfo.id, userInfo.token, router])

//   useEffect(() => {
//     if (!userInfo.id) return
//     const fetchOrders = async () => {
//       setLoading(true)
//       setError(null)
//       try {
//         let url = `${config.backendUrl}/orders/user/${userInfo.id}`
//         if (userInfo.role === "super_admin" || userInfo.role === "superadmin") {
//           url = `${config.backendUrl}/orders`
//         }
//         const res = await fetch(url, {
//           headers: {
//             ...(userInfo.token ? { Authorization: `Bearer ${userInfo.token}` } : {})
//           }
//         })
//         const data = await res.json()
//         setOrders(Array.isArray(data) ? data : (data.orders || []))
//         const ordersArr = Array.isArray(data) ? data : (data.orders || [])
//         if (ordersArr.length === 0) {
//           console.log('No orders found for userId:', userInfo.id, 'with token:', userInfo.token)
//         } else {
//           console.log('Fetched orders:', ordersArr)
//         }
//       } catch (err) {
//         setError(err instanceof Error ? err.message : "Failed to fetch orders")
//       } finally {
//         setLoading(false)
//       }
//     }
//     fetchOrders()
//   }, [userInfo.id, userInfo.role, userInfo.token])

//   const handleStatusChange = async (orderId: string, newStatus: string) => {
//     setStatusUpdating(orderId)
//     try {
//       // Debug: log token and role for 403 errors
//       console.log('PATCH order status with token:', userInfo.token, 'role:', userInfo.role)
//       const res = await fetch(`${config.backendUrl}/orders/${orderId}/status`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//           ...(userInfo.token ? { Authorization: `Bearer ${userInfo.token}` } : {})
//         },
//         body: JSON.stringify({ orderStatus: newStatus })
//       })
//       if (!res.ok) throw new Error("Failed to update status")
//       const updated = await res.json()
//       setOrders((prev) => prev.map(o => o._id === orderId ? { ...o, orderStatus: updated.orderStatus } : o))
//     } catch (err) {
//       alert("Error updating order status")
//     } finally {
//       setStatusUpdating(null)
//     }
//   }

//   const handleDeleteOrder = async (orderId: string) => {
//     if (!window.confirm('Are you sure you want to delete this order?')) return
//     setDeleteLoadingId(orderId)
//     try {
//       const res = await fetch(`${config.backendUrl}/orders/${orderId}`, {
//         method: "DELETE",
//         headers: {
//           ...(userInfo.token ? { Authorization: `Bearer ${userInfo.token}` } : {})
//         }
//       })
//       if (!res.ok) throw new Error("Failed to delete order")
//       setOrders((prev) => prev.filter(o => o._id !== orderId))
//     } catch (err) {
//       alert("Error deleting order")
//     } finally {
//       setDeleteLoadingId(null)
//     }
//   }

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <Loader2 className="h-8 w-8 animate-spin mr-2" /> {t('loading')}
//       </div>
//     )
//   }

//   if (!userInfo.id || !userInfo.token) {
//     return <div className="text-center py-8">{t('notSignedIn')}</div>
//   }

//   const isSuperAdmin = userInfo.role === "super_admin" || userInfo.role === "superadmin";

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
//           <p className="text-gray-600">{t('description')}</p>
//           <div className="mt-2 text-gray-700 text-sm">
//             <div><b>{t('id')}:</b> {userInfo.id}</div>
//             <div><b>{t('role')}:</b> {userInfo.role}</div>
//             <div><b>{t('name')}:</b> {userInfo.name}</div>
//             <div><b>{t('email')}:</b> {userInfo.email}</div>
//           </div>
//         </div>
//       </div>
//       <Card>
//         <CardHeader>
//           <CardTitle>{t('orderHistory')}</CardTitle>
//           <CardDescription>{t('orderHistoryDescription')}</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="rounded-md border overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>{t('orderId')}</TableHead>
//                   <TableHead>{t('status')}</TableHead>
//                   <TableHead>{t('name')}</TableHead>
//                   <TableHead>{t('email')}</TableHead>
//                   <TableHead>{t('address')}</TableHead>
//                   <TableHead>{t('products')}</TableHead>
//                   <TableHead>{t('created')}</TableHead>
//                   {isSuperAdmin && <TableHead>{t('updateStatus')}</TableHead>}
//                   {/* For admin/manager/assistant, add a column for rating if delivered */}
//                   {!isSuperAdmin && <TableHead>{tRating('ratings')}</TableHead>}
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {orders.length === 0 ? (
//                   <TableRow>
//                     <TableCell colSpan={8} className="text-center py-8">{t('noOrders')}</TableCell>
//                   </TableRow>
//                 ) : (
//                   orders.map(order => (
//                     <TableRow key={order._id}>
//                       <TableCell className="font-mono text-xs">{order._id}</TableCell>
//                       <TableCell>
//                         <Badge
//                           variant={getOrderStatusColor(order.orderStatus)}
//                           className={
//                             order.orderStatus === "shipped" || order.orderStatus === "delivered"
//                               ? "bg-green-600 text-white border-green-600 capitalize font-semibold"
//                               : order.orderStatus === "processing"
//                               ? "bg-blue-600 text-white border-blue-600 capitalize font-semibold"
//                               : "capitalize font-semibold"
//                           }
//                         >
//                           {t(`status_${order.orderStatus}`)}
//                         </Badge>
//                       </TableCell>
//                       <TableCell>{order.firstName} {order.lastName}</TableCell>
//                       <TableCell>{order.email}</TableCell>
//                       <TableCell>{order.address}, {order.city}, {order.state}, {order.zipCode}, {order.country}</TableCell>
//                       <TableCell>
//                         <ul className="list-disc pl-4">
//                           {order.products.map((p, idx) => (
//                             <li key={idx}>{t('productId')}: {p.id}, {t('qty')}: {p.quantity}</li>
//                           ))}
//                         </ul>
//                       </TableCell>
//                       <TableCell>{new Date(order.createdAt || '').toLocaleString()}</TableCell>
//                       {isSuperAdmin && (
//                         <TableCell className="flex gap-2 items-center">
//                           <Select
//                             value={order.orderStatus}
//                             onValueChange={val => handleStatusChange(order._id, val)}
//                             disabled={statusUpdating === order._id}
//                           >
//                             <SelectTrigger className="w-[140px]">
//                               <SelectValue placeholder={t('status')} />
//                             </SelectTrigger>
//                             <SelectContent>
//                               {ORDER_STATUSES.map(status => (
//                                 <SelectItem key={status} value={status}>{t(`status_${status}`)}</SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                           {statusUpdating === order._id && <Loader2 className="h-4 w-4 animate-spin ml-2 inline" />}
//                           {/* Only super admin can delete orders */}
//                           {isSuperAdmin && (
//                             <button
//                               className="ml-2 text-red-600 hover:text-red-800"
//                               onClick={() => handleDeleteOrder(order._id)}
//                               disabled={deleteLoadingId === order._id}
//                               title={t('deleteOrder')}
//                             >
//                               {deleteLoadingId === order._id ? (
//                                 <Loader2 className="h-4 w-4 animate-spin" />
//                               ) : (
//                                 <Trash2 className="h-4 w-4" />
//                               )}
//                             </button>
//                           )}
//                         </TableCell>
//                       )}
//                       {/* For admin/manager/assistant, show rating button if delivered */}
//                       {!isSuperAdmin && (
//                         <TableCell>
//                           {order.orderStatus === 'delivered' ? (
//                             <Button size="sm" variant="outline" onClick={() => setRatingModalOrder(order)}>
//                               {tRating('rateProducts')}
//                             </Button>
//                           ) : (
//                             <span className="text-xs text-gray-400">{tRating('notAvailable')}</span>
//                           )}
//                         </TableCell>
//                       )}
//                     </TableRow>
//                   ))
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </CardContent>
//       </Card>
//       {/* Product Rating Modal */}
//       {ratingModalOrder && (
//         <ProductRatingModal
//           open={!!ratingModalOrder}
//           onClose={() => setRatingModalOrder(null)}
//           order={ratingModalOrder}
//           products={Array.isArray(ratingModalOrder.products) ? ratingModalOrder.products : []}
//           userToken={userInfo.token}
//           onRatingChange={() => {}}
//         />
//       )}
//     </div>
//   )
// } 