import { redirect } from 'next/navigation'

// The tutor browse/discovery experience lives at /search. Keep /tutors working
// as an entry point (several CTAs link here) by redirecting to it.
export default function TutorsIndexPage() {
  redirect('/search')
}
