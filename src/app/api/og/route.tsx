import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

const BRAND = '#4FF397'
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' }

const ALLOWED_IMAGE_HOSTS = [
  'fly.storage.tigris.dev',
  'tutorcourt.com',
  's3.amazonaws.com',
  'cloudfront.net',
  'res.cloudinary.com',
]

function isSafeImageUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_IMAGE_HOSTS.some(host => parsed.hostname.endsWith(host))
  } catch {
    return false
  }
}

function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : BRAND
}

function getLogoSrc(): string {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'logo.png'))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') ?? 'default'
  const logoSrc = getLogoSrc()

  if (type === 'tutor') {
    const name = searchParams.get('name') ?? 'Expert Tutor'
    const headline = searchParams.get('headline') ?? 'Professional Tutor'
    const subjectsRaw = searchParams.get('subjects') ?? ''
    const subjects = subjectsRaw ? subjectsRaw.split(',').filter(Boolean).slice(0, 3) : []
    const rawImageUrl = searchParams.get('imageUrl') ?? ''
    const safeImageUrl = isSafeImageUrl(rawImageUrl) ? rawImageUrl : ''
    const isVerified = searchParams.get('isVerified') === 'true'

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            background: 'linear-gradient(140deg, #071408 0%, #0d1f0a 45%, #081509 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Radial glow behind avatar */}
          <div style={{
            position: 'absolute',
            left: '-40px',
            top: '65px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(79,243,151,0.10) 0%, rgba(79,243,151,0) 70%)`,
            display: 'flex',
          }} />

          {/* Top accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: BRAND, display: 'flex' }} />

          {/* Left — avatar */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '380px',
            flexShrink: 0,
            gap: '18px',
            padding: '50px 0 50px 55px',
          }}>
            <div style={{
              width: '274px',
              height: '274px',
              borderRadius: '50%',
              background: BRAND,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{
                width: '262px',
                height: '262px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#1a3d2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {safeImageUrl ? (
                  <img src={safeImageUrl} width={262} height={262} />
                ) : (
                  <div style={{ color: BRAND, fontSize: '120px', display: 'flex' }}>👤</div>
                )}
              </div>
            </div>

            {isVerified && (
              <div style={{
                background: BRAND,
                color: '#071408',
                padding: '7px 18px',
                borderRadius: '999px',
                fontSize: '14px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                letterSpacing: '0.02em',
              }}>
                ✓ Verified Tutor
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{
            width: '1px',
            background: 'rgba(79,243,151,0.15)',
            margin: '60px 0',
            display: 'flex',
            flexShrink: 0,
          }} />

          {/* Right — content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            padding: '55px 60px 55px 55px',
            gap: '14px',
            overflow: 'hidden',
          }}>
            {/* Logo + brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {logoSrc && <img src={logoSrc} width={32} height={32} style={{ borderRadius: '6px' }} />}
              <div style={{
                color: BRAND,
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                display: 'flex',
              }}>
                TUTORCOURT
              </div>
            </div>

            <div style={{
              color: '#ffffff',
              fontSize: name.length > 22 ? '44px' : '52px',
              fontWeight: 900,
              lineHeight: 1.05,
              display: 'flex',
              letterSpacing: '-0.02em',
            }}>
              {name.length > 28 ? name.slice(0, 28) + '…' : name}
            </div>

            <div style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '19px',
              fontWeight: 500,
              display: 'flex',
            }}>
              {headline.length > 65 ? headline.slice(0, 65) + '…' : headline}
            </div>

            {subjects.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                {subjects.map((s) => (
                  <div key={s} style={{
                    background: 'rgba(79,243,151,0.12)',
                    border: `1px solid rgba(79,243,151,0.35)`,
                    color: BRAND,
                    padding: '7px 16px',
                    borderRadius: '999px',
                    fontSize: '15px',
                    fontWeight: 600,
                    display: 'flex',
                  }}>
                    {s}
                  </div>
                ))}
              </div>
            )}

            <div style={{
              color: 'rgba(79,243,151,0.35)',
              fontSize: '16px',
              marginTop: '12px',
              display: 'flex',
            }}>
              tutorcourt.com
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers: CACHE_HEADERS }
    )
  }

  if (type === 'search') {
    const q = searchParams.get('q') ?? ''
    const subjectsRaw = searchParams.get('subjects') ?? ''
    const subjects = subjectsRaw ? subjectsRaw.split(',').filter(Boolean).slice(0, 4) : []

    return new ImageResponse(
      (
        <div style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(150deg, #071408 0%, #0b1f0e 60%, #071408 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: BRAND, display: 'flex' }} />

          {/* Background decoration — large search circle */}
          <div style={{
            position: 'absolute',
            right: '-120px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            border: `2px solid rgba(79,243,151,0.07)`,
            display: 'flex',
          }} />
          <div style={{
            position: 'absolute',
            right: '-60px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            border: `1px solid rgba(79,243,151,0.05)`,
            display: 'flex',
          }} />

          {/* Content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            padding: '65px 90px',
            gap: '20px',
          }}>
            {/* Logo + brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              {logoSrc && <img src={logoSrc} width={40} height={40} style={{ borderRadius: '8px' }} />}
              <div style={{ color: BRAND, fontSize: '15px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', display: 'flex' }}>
                TUTORCOURT
              </div>
            </div>

            <div style={{
              color: '#ffffff',
              fontSize: '62px',
              fontWeight: 900,
              lineHeight: 1.0,
              display: 'flex',
              letterSpacing: '-0.03em',
            }}>
              {q
                ? `"${q.length > 28 ? q.slice(0, 28) + '…' : q}"`
                : 'Find Expert Tutors'}
            </div>

            <div style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '22px',
              display: 'flex',
            }}>
              {subjects.length > 0
                ? `Browsing tutors for ${subjects.join(', ')}`
                : 'Browse verified tutors. Compare rates. Book instantly.'}
            </div>

            {subjects.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                {subjects.map(s => (
                  <div key={s} style={{
                    background: 'rgba(79,243,151,0.1)',
                    border: '1px solid rgba(79,243,151,0.3)',
                    color: BRAND,
                    padding: '8px 18px',
                    borderRadius: '999px',
                    fontSize: '16px',
                    fontWeight: 600,
                    display: 'flex',
                  }}>
                    {s}
                  </div>
                ))}
              </div>
            )}

            <div style={{ color: 'rgba(79,243,151,0.3)', fontSize: '17px', marginTop: '8px', display: 'flex' }}>
              tutorcourt.com/search
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers: CACHE_HEADERS }
    )
  }

  if (type === 'subject') {
    const name = searchParams.get('name') ?? 'Subject'
    const category = searchParams.get('category') ?? ''
    const description = searchParams.get('description') ?? ''
    const tutorCount = searchParams.get('tutorCount') ?? '0'
    const color = sanitizeColor(searchParams.get('color') ?? BRAND)

    return new ImageResponse(
      (
        <div style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#f8faf4',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '70px 90px',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: '10px',
            background: color,
            display: 'flex',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
            {category ? (
              <div style={{ color: color, fontSize: '16px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'flex' }}>
                {category}
              </div>
            ) : <div style={{ display: 'flex' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {logoSrc && <img src={logoSrc} width={32} height={32} style={{ borderRadius: '6px' }} />}
              <div style={{ color: '#071408', fontSize: '20px', fontWeight: 900, display: 'flex' }}>TutorCourt</div>
            </div>
          </div>

          <div style={{ color: '#0f1f06', fontSize: name.length > 20 ? '60px' : '80px', fontWeight: 900, lineHeight: 1.0, display: 'flex', marginBottom: '24px' }}>
            {name.length > 30 ? name.slice(0, 30) + '…' : name}
          </div>

          {description && (
            <div style={{ color: '#4a6830', fontSize: '22px', lineHeight: 1.5, display: 'flex', marginBottom: '32px', maxWidth: '800px' }}>
              {description.length > 120 ? description.slice(0, 120) + '…' : description}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 'auto' }}>
            <div style={{
              background: color,
              color: '#071408',
              padding: '10px 24px',
              borderRadius: '999px',
              fontSize: '18px',
              fontWeight: 700,
              display: 'flex',
            }}>
              {tutorCount} tutors available
            </div>
            <div style={{ color: '#8aaa60', fontSize: '18px', display: 'flex' }}>tutorcourt.com/subjects</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers: CACHE_HEADERS }
    )
  }

  // Default OG
  return new ImageResponse(
    (
      <div style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        background: '#071408',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ width: '10px', background: BRAND, height: '100%', display: 'flex', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '70px 80px', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {logoSrc && <img src={logoSrc} width={52} height={52} style={{ borderRadius: '10px' }} />}
            <div style={{ color: BRAND, fontSize: '18px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'flex' }}>
              Nigeria's trusted tutoring marketplace
            </div>
          </div>
          <div style={{ color: '#ffffff', fontSize: '90px', fontWeight: 900, lineHeight: 1.0, display: 'flex', letterSpacing: '-0.03em' }}>
            TutorCourt
          </div>
          <div style={{ color: 'rgba(79,243,151,0.6)', fontSize: '28px', display: 'flex' }}>
            Connect with vetted, expert tutors for K-12 learning
          </div>
          <div style={{ color: 'rgba(79,243,151,0.3)', fontSize: '20px', marginTop: '16px', display: 'flex' }}>
            tutorcourt.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: CACHE_HEADERS }
  )
}
