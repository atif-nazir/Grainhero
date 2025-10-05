"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Lock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, useCart } from "@/components/CartProvider";
import { apiFetch } from "@/lib/utils";
import { loadStripe } from '@stripe/stripe-js';
import { useTranslations } from 'next-intl';
import { useAuth } from "@/app/[locale]/providers";
import { config } from "@/config";

const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY || 'pk_test_demo_key';

function getCartItems(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

// Helper to get full image URL for local images using config.backendUrl
function getImageUrl(img: string) {
  if (!img) return "/placeholder.svg";
  if (img.startsWith('http')) return img;
  let path = img.replace(/\\/g, '/').replace(/\+/g, '/');
  if (!path.startsWith('/')) path = '/' + path;
  let backendUrl = config.backendUrl;
  if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);
  return `${backendUrl}${path}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { setCart } = useCart();
  const { user, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Move formData useState here, before any early returns
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardName: "",
    orderNotes: "",
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const t = useTranslations();

  // Authorization check
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  // Helper to check if expiry date is in the future
  function isExpiryDateInFuture(expiry: string): boolean {
    // Accept MM/YY or MM/YYYY
    const match = expiry.match(/^(\d{2})\/(\d{2,4})$/);
    if (!match) return false;
    
    const mm = match[1];
    const yy = match[2];
    const month = parseInt(mm, 10);
    let year = parseInt(yy, 10);
    
    if (yy.length === 2) {
      year += 2000;
    }
    
    if (month < 1 || month > 12) return false;
    
    const now = new Date();
    const expiryDate = new Date(year, month - 1, 1);
    // Set to end of month
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    expiryDate.setDate(0);
    return expiryDate >= new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Validation function
  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.firstName.trim()) errors.firstName = t('CheckoutPage.firstNameRequired');
    if (!formData.lastName.trim()) errors.lastName = t('CheckoutPage.lastNameRequired');
    if (!formData.email.trim()) errors.email = t('CheckoutPage.emailRequired');
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) errors.email = t('CheckoutPage.invalidEmail');
    if (!formData.address.trim()) errors.address = t('CheckoutPage.addressRequired');
    if (!formData.city.trim()) errors.city = t('CheckoutPage.cityRequired');
    if (!formData.state.trim()) errors.state = t('CheckoutPage.stateRequired');
    if (!formData.zipCode.trim()) errors.zipCode = t('CheckoutPage.zipCodeRequired');
    if (!formData.country.trim()) errors.country = t('CheckoutPage.countryRequired');
    if (!formData.cardName.trim()) errors.cardName = t('CheckoutPage.cardNameRequired');
    if (!formData.cardNumber.trim()) errors.cardNumber = t('CheckoutPage.cardNumberRequired');
    else if (!/^\d{12,19}$/.test(formData.cardNumber.replace(/\s/g, ""))) errors.cardNumber = t('CheckoutPage.invalidCardNumber');
    if (!formData.expiryDate.trim()) errors.expiryDate = t('CheckoutPage.expiryDateRequired');
    else if (!/^\d{2}\/\d{2,4}$/.test(formData.expiryDate)) errors.expiryDate = t('CheckoutPage.invalidExpiryDate');
    else if (!isExpiryDateInFuture(formData.expiryDate)) errors.expiryDate = t('CheckoutPage.cardExpiryFuture');
    if (!formData.cvv.trim()) errors.cvv = t('CheckoutPage.cvvRequired');
    else if (!/^\d{3,4}$/.test(formData.cvv)) errors.cvv = t('CheckoutPage.invalidCvv');
    return errors;
  };

  useEffect(() => {
    setCartItems(getCartItems());
    setCartLoaded(true);
    setLoading(true);
    apiFetch("/products")
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Map cart items to product details
  const items = cartItems
    .map((item) => {
      const product = products.find((p) => p._id === item._id);
      return product && item.quantity ? { ...product, quantity: item.quantity, _id: product._id } : null;
    })
    .filter((item): item is { _id: string; name: string; price: number; images: string[]; quantity: number } => item !== null && item !== undefined);

  // Remove the redirect to /cart
  // useEffect(() => {
  //   if (cartLoaded && items.length === 0) {
  //     router.push("/cart");
  //   }
  // }, [items, cartLoaded, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">{t('CheckoutPage.loadingProducts')}</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 text-xl">{error}</div>;
  }

  // Remove early return for items.length === 0
  // if (items.length === 0) {
  //   return null;
  // }

  const subtotal: number = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping: number = subtotal > 50 ? 0 : 0;
  const tax: number = subtotal * 0;
  const total: number = subtotal + shipping + tax;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setIsProcessing(true);
    
    // Add global error handler for browser extension conflicts
    const originalOnError = window.onerror;
    window.onerror = function(msg, url, line, col, error) {
      if (msg && typeof msg === 'string' && msg.includes('inpage.js')) {
        return true; // Prevent the error from being thrown
      }
      if (originalOnError) {
        return originalOnError(msg, url, line, col, error);
      }
      return false;
    };
    
    try {
      // 1. Stripe payment (demo: just simulate success, real: use Stripe Elements)
      try {
      const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
      } catch (stripeError) {
        // Continue with demo payment simulation even if Stripe fails
      }
      
      // Add error boundary for browser extension conflicts
      try {
      // In a real app, you'd use Stripe Elements for card input and confirmCardPayment here.
      // For demo, we just simulate a delay and success.
      await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (extensionError) {
        // Continue with the order process even if there are extension conflicts
      }
      
      // 2. Get user ID from localStorage
      const getUserId = (): string | null => {
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('id');
            if (!raw) return null;
            // Remove extra quotes if present
            let id = raw;
            if (id.startsWith('"') && id.endsWith('"')) {
              id = id.slice(1, -1);
            }
            return id;
          } catch (error) {}
        }
        return null;
      };

      let userId = null;
      try {
        userId = JSON.parse(localStorage.getItem('id') || 'null');
      } catch {
        userId = null;
      }
      
      if (!userId) {
        setError("User not authenticated. Please log in again.");
        setIsProcessing(false);
        return;
      }

      // 3. Get pending order data from localStorage (set by cart page)
      const pendingOrderData = localStorage.getItem("pending-order");
      let orderData = null;
      if (pendingOrderData) {
        try {
          orderData = JSON.parse(pendingOrderData);
        } catch (error) {
          // Handle error silently
        }
      }

      // 4. Prepare order payload with new fields
      const orderPayload = {
        ...formData,
        userId: userId,
        products: items.map((product) => ({ id: product._id, quantity: product.quantity })),
        ...(orderData && {
          shipping: orderData.shipping,
          shippingCost: orderData.shippingCost,
          subtotal: orderData.subtotal,
          total: orderData.total
        })
      };

      

      // 5. Send order to backend
      
      const orderResponse = await apiFetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      
      // Order created successfully
      
      setOrderComplete(true);
      localStorage.removeItem("cart");
      localStorage.removeItem("pending-order"); // Clean up pending order data
      setCart([]);
    } catch (error: any) {
      // Check if it's a network error or API error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError("Network error: Unable to connect to server. Please check your internet connection.");
      } else if (error.response) {
        // API error with response
        setError(`Server error: ${error.response.status} - ${error.response.statusText}`);
      } else {
        setError(error.message || t('CheckoutPage.orderPaymentFailed'));
      }
    } finally {
      // Restore original error handler
      window.onerror = originalOnError;
      setIsProcessing(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('CheckoutPage.orderConfirmed')}</h2>
            <p className="text-gray-600 mb-6">
              {t('CheckoutPage.thankYouPurchase')}
            </p>
            <div className="space-y-2 text-sm text-gray-500 mb-6">
              <p>{t('CheckoutPage.orderNumber')}: ORD-{Date.now()}</p>
              <p>{t('CheckoutPage.total')}: ${total.toFixed(2)}</p>
            </div>
            <Button onClick={() => router.push("/dashboard")} className="w-full">{t('CheckoutPage.continueShopping')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('CheckoutPage.back')}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{t('CheckoutPage.checkout')}</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shipping Information */}
              <Card className="rounded-2xl p-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    {t('CheckoutPage.shippingInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="mb-2">{t('CheckoutPage.firstName')}</Label>
                      <Input
                        id="firstName"
                        required
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="mb-4"
                      />
                      {formErrors.firstName && <div className="text-red-500 text-xs mt-1">{formErrors.firstName}</div>}
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="mb-2">{t('CheckoutPage.lastName')}</Label>
                      <Input
                        id="lastName"
                        required
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className="mb-4"
                      />
                      {formErrors.lastName && <div className="text-red-500 text-xs mt-1">{formErrors.lastName}</div>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="mb-2">{t('CheckoutPage.emailAddress')}</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="mb-4"
                    />
                    {formErrors.email && <div className="text-red-500 text-xs mt-1">{formErrors.email}</div>}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="mb-2">{t('CheckoutPage.phoneNumber')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="mb-4"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address" className="mb-2">{t('CheckoutPage.streetAddress')}</Label>
                    <Input
                      id="address"
                      required
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      className="mb-4"
                    />
                    {formErrors.address && <div className="text-red-500 text-xs mt-1">{formErrors.address}</div>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="mb-2">{t('CheckoutPage.city')}</Label>
                      <Input
                        id="city"
                        required
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        className="mb-4"
                      />
                      {formErrors.city && <div className="text-red-500 text-xs mt-1">{formErrors.city}</div>}
                    </div>
                    <div>
                      <Label htmlFor="state" className="mb-2">{t('CheckoutPage.state')}</Label>
                      <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('CheckoutPage.selectState')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CA">{t('CheckoutPage.california')}</SelectItem>
                          <SelectItem value="NY">{t('CheckoutPage.newYork')}</SelectItem>
                          <SelectItem value="TX">{t('CheckoutPage.texas')}</SelectItem>
                          <SelectItem value="FL">{t('CheckoutPage.florida')}</SelectItem>
                          <SelectItem value="IL">{t('CheckoutPage.illinois')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.state && <div className="text-red-500 text-xs mt-1">{formErrors.state}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipCode" className="mb-2">{t('CheckoutPage.zipCode')}</Label>
                      <Input
                        id="zipCode"
                        required
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange("zipCode", e.target.value)}
                        className="mb-4"
                      />
                      {formErrors.zipCode && <div className="text-red-500 text-xs mt-1">{formErrors.zipCode}</div>}
                    </div>
                    <div>
                      <Label htmlFor="country" className="mb-2">{t('CheckoutPage.country')}</Label>
                      <Select value={formData.country} onValueChange={(value) => handleInputChange("country", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">{t('CheckoutPage.unitedStates')}</SelectItem>
                          <SelectItem value="Canada">{t('CheckoutPage.canada')}</SelectItem>
                          <SelectItem value="United Kingdom">{t('CheckoutPage.unitedKingdom')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.country && <div className="text-red-500 text-xs mt-1">{formErrors.country}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card className="rounded-2xl p-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    {t('CheckoutPage.paymentInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cardName" className="mb-2">{t('CheckoutPage.cardholderName')}</Label>
                    <Input
                      id="cardName"
                      required
                      value={formData.cardName}
                      onChange={(e) => handleInputChange("cardName", e.target.value)}
                      className="mb-4"
                    />
                    {formErrors.cardName && <div className="text-red-500 text-xs mt-1">{formErrors.cardName}</div>}
                  </div>

                  <div>
                    <Label htmlFor="cardNumber" className="mb-2">{t('CheckoutPage.cardNumber')}</Label>
                    <Input
                      id="cardNumber"
                      placeholder={t('CheckoutPage.cardNumberPlaceholder')}
                      required
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                      className="mb-4"
                    />
                    {formErrors.cardNumber && <div className="text-red-500 text-xs mt-1">{formErrors.cardNumber}</div>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate" className="mb-2">{t('CheckoutPage.expiryDate')}</Label>
                      <Input
                        id="expiryDate"
                        placeholder={t('CheckoutPage.expiryDatePlaceholder')}
                        required
                        value={formData.expiryDate}
                        onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                        className="mb-4"
                      />
                      {formErrors.expiryDate && <div className="text-red-500 text-xs mt-1">{formErrors.expiryDate}</div>}
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="mb-2">{t('CheckoutPage.cvv')}</Label>
                      <Input
                        id="cvv"
                        placeholder={t('CheckoutPage.cvvPlaceholder')}
                        required
                        value={formData.cvv}
                        onChange={(e) => handleInputChange("cvv", e.target.value)}
                        className="mb-4"
                      />
                      {formErrors.cvv && <div className="text-red-500 text-xs mt-1">{formErrors.cvv}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <Lock className="w-4 h-4" />
                    <span>{t('CheckoutPage.paymentSecure')}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Order Notes */}
              <Card className="rounded-2xl p-8">
                <CardHeader>
                  <CardTitle>{t('CheckoutPage.orderNotes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder={t('CheckoutPage.orderNotesPlaceholder')}
                    value={formData.orderNotes}
                    onChange={(e) => handleInputChange("orderNotes", e.target.value)}
                    className="mb-4"
                  />
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="rounded-2xl p-8">
              <CardHeader>
                <CardTitle>{t('CheckoutPage.orderSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Items */}
                {items.length === 0 ? (
                  <div className="text-center text-red-600 font-medium py-8 text-md">{t('CheckoutPage.checkoutItems')}</div>
                ) : (
                  items.map((product) => (
                    <div className="flex gap-4" key={product._id}>
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img
                          src={getImageUrl(product.images && product.images.length > 0 ? product.images[0] : "/placeholder.svg")}
                          alt={product.name}
                          className="w-12 h-12 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600">{t('CheckoutPage.qty')}: {product.quantity}</span>
                          <span className="font-medium">${(product.price * product.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <Separator />

                {/* Order Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('CheckoutPage.subtotal')}</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('CheckoutPage.shipping')}</span>
                    <span>{shipping === 0 ? t('CheckoutPage.freeShipping') : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('CheckoutPage.tax')}</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('CheckoutPage.total')}</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {shipping === 0 && items.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <Truck className="w-4 h-4" />
                      <span>{t('CheckoutPage.freeShippingOver')}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Place Order Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={isProcessing || items.length === 0}
              onClick={handleSubmit}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('CheckoutPage.processing')}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  {t('CheckoutPage.placeOrder')} - ${total.toFixed(2)}
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              {t('CheckoutPage.termsPrivacy')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 