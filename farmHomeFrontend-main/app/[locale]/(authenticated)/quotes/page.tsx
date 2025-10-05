"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { config } from "@/config";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [updateLoadingId, setUpdateLoadingId] = useState<string | null>(null);
  const itemsPerPage = 10;
  const router = useRouter();
  const t = useTranslations('QuotesPage');

  const statusOptions = [
    { value: "pending", label: t('status_pending'), badge: "default" },
    { value: "reviewed", label: t('status_reviewed'), badge: "secondary" },
    { value: "approved", label: t('status_approved'), badge: "success" }, // green background for approved
    { value: "rejected", label: t('status_rejected'), badge: "destructive" },
  ];

  // Only allow superadmin
  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
    if (role !== 'super_admin') {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    fetchQuotes(currentPage, itemsPerPage);
  }, [currentPage]);

  const fetchQuotes = async (page = 1, limit = itemsPerPage) => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const url = new URL(`${config.backendUrl}/quotes`);
      // Backend does not support pagination, so fetch all and paginate client-side
      const res = await fetch(url.toString(), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('Failed to fetch quotes');
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : data.quotes || []);
      setTotalQuotes(Array.isArray(data) ? data.length : (data.quotes ? data.quotes.length : 0));
      setTotalPages(Math.ceil((Array.isArray(data) ? data.length : (data.quotes ? data.quotes.length : 0)) / itemsPerPage) || 1);
      setCurrentPage(page);
    } catch (err) {
      setError('Error fetching quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (quoteId: string, status: string) => {
    setUpdateLoadingId(quoteId);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${config.backendUrl}/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setQuotes((prev) => prev.map((q) => (q.quoteId === quoteId ? { ...q, status: updated.status } : q)));
    } catch (err) {
      alert('Error updating quote status');
    } finally {
      setUpdateLoadingId(null);
    }
  };

  // Paginate quotes client-side
  const paginatedQuotes = quotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('description')}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('list')}</CardTitle>
          <CardDescription>{t('listDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('quoteId')}</TableHead>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('buyer')}</TableHead>
                  <TableHead>{t('quantity')}</TableHead>
                  <TableHead>{t('price')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">{t('loading')}</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-red-600">{t('error')}</TableCell>
                  </TableRow>
                ) : paginatedQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">{t('noQuotes')}</TableCell>
                  </TableRow>
                ) : (
                  paginatedQuotes.map((quote) => (
                    <TableRow key={quote.quoteId}>
                      <TableCell className="font-medium">{quote.quoteId}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{quote.productName}</div>
                        <div className="text-xs text-gray-400">ID: {quote.productId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{quote.buyerName}</div>
                        <div className="text-xs text-gray-400">{quote.buyerEmail}</div>
                        <div className="text-xs text-gray-400">{quote.buyerPhone}</div>
                      </TableCell>
                      <TableCell>{quote.quantity}</TableCell>
                      <TableCell>${Number(quote.productCurrentPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          quote.status === 'pending' ? 'default'
                          : quote.status === 'reviewed' ? 'secondary'
                          : quote.status === 'approved' ? 'success'
                          : quote.status === 'rejected' ? 'destructive'
                          : 'outline'
                        }>
                          {t(`status_${quote.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={quote.status} onValueChange={(status) => handleStatusChange(quote.quoteId, status)} disabled={updateLoadingId === quote.quoteId}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {updateLoadingId === quote.quoteId && <Loader2 className="w-4 h-4 animate-spin ml-2 inline-block" />}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              {`${t('showing')} ${(currentPage - 1) * itemsPerPage + 1} ${t('to')} ${Math.min(currentPage * itemsPerPage, totalQuotes)} ${t('of')} ${totalQuotes} ${t('results')}`}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 