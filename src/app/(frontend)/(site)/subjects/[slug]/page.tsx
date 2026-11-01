import { redirect } from 'next/navigation'

export default function SubjectDetailPage() {
    redirect('/search')
}

export function generateMetadata() {
    return { robots: { index: false } }
}
