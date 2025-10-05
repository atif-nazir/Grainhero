import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import pricingData from '../pricing-data.js';
import {useTranslations} from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
export const plans = [
  {
    link:'https://buy.stripe.com/test_8x2bJ3cyO4AofwHcBZa3u00',
    priceId:'price_1RoRPZRYMUmJuwVF7aJeMEmm',
    price:20,
    duration:'/month'
  },
  {
    link:'https://buy.stripe.com/test_7sYcN7cyO9UI84f59xa3u01',
    priceId:'price_1RoRUORYMUmJuwVFy0rFzM3G',
    price:50,
    duration:'/month'
  }
]
export default function PricingPage() {
  const t = useTranslations('PricingPage');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center">
          <Link href="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span>{t('goBack', { defaultMessage: 'Go Back' })}</span>
            </Button>
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-4">{t('title', { defaultMessage: 'Pricing Plans' })}</h1>
        <p className="text-center text-gray-600 mb-12">{t('subtitle', { defaultMessage: 'Choose the plan that fits your farm best.' })}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingData.map((plan) => (
            <Card key={plan.id} className="flex flex-col h-full">
              <CardHeader>
                <CardTitle className="text-2xl text-center">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-center mt-2">{plan.price}</div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <CardDescription className="text-center mb-4">{plan.description}</CardDescription>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.id === 'pro' ? 'default' : 'outline'}>
                  {plan.id === 'enterprise' ? t('contactUs', { defaultMessage: 'Contact Us' }) : t('choosePlan', { defaultMessage: 'Choose Plan' })}
                </Button>
                
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 