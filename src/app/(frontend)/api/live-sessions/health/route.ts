import { NextResponse } from 'next/server'
import { isVideoSdkAvailable } from '@/lib/videosdk'

/**
 * Lightweight client probe so the classroom UI can render a friendly
 * "live classes are unavailable" state without trying to mount the SDK.
 */
export async function GET() {
  const available = isVideoSdkAvailable()
  return NextResponse.json({
    available,
    reason: available ? null : 'VideoSDK credentials are not configured.',
  })
}
