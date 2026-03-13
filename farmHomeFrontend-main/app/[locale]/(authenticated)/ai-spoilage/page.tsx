import { redirect } from 'next/navigation'

export default function AISpoilagePage({ params }: { params: { locale: string } }) {
    redirect(`/${params.locale}/ai-predictions`)
}
