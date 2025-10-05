import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WheatIcon as Sheep, Users, BarChart3, Shield } from "lucide-react"
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
  
export default function HomePage() {
  const t = useTranslations('HomePage');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Sheep className="h-8 w-8 text-green-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">{t('farmHome')}</h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/pricing">
                <Button variant="outline">{t('pricing')}</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline">{t('login')}</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>{t('getStarted')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            {t('modernLivestock')}
            <span className="text-green-600"> {t('management')}</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            {t('heroDescription')}
          </p>
          <div className="mt-10 flex justify-center space-x-4">
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 py-3">
                {t('startFreeTrial')}
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="px-8 py-3 bg-transparent">
                {t('signIn')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card>
            <CardHeader>
              <Sheep className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>{t('animalManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('animalManagementDesc')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>{t('roleBasedAccess')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('roleBasedAccessDesc')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>{t('analyticsDashboard')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('analyticsDashboardDesc')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-red-600 mb-2" />
              <CardTitle>{t('multilingualSupport')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{t('multilingualSupportDesc')}</CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
