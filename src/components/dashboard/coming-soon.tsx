import Link from 'next/link'
import { HiOutlineWrenchScrewdriver, HiOutlineArrowLeft } from 'react-icons/hi2'

type ComingSoonProps = {
  /** The name of the feature that is not ready yet, e.g. "Profile" or "Settings". */
  feature: string
  /** Optional supporting copy shown under the heading. */
  description?: string
  /** Where the "Back to dashboard" link points. */
  backHref: string
}

export function ComingSoon({ feature, description, backHref }: ComingSoonProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-tutor-purple-50 text-tutor-purple-600">
        <HiOutlineWrenchScrewdriver className="h-8 w-8" />
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-tutor-purple-600">
        Coming soon
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        {feature} is on the way
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        {description ||
          `We're still building the ${feature.toLowerCase()} experience. Check back soon — it'll be here before long.`}
      </p>
      <Link
        href={backHref}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-tutor-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-tutor-purple-700"
      >
        <HiOutlineArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  )
}
