"use client"

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EnvironmentalDataPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale || 'en'
  
  useEffect(() => {
    // Redirect to the environmental page with locale
    router.replace(`/${locale}/environmental`)
  }, [router, locale])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to Environmental Data...</p>
      </div>
    </div>
  )
}

