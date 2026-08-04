// Fallback avatars (requirement 6): when a user has no uploaded avatar, generate
// a stable, colorful one from a free avatar API keyed on their name/id so the
// same person always renders the same face + color.

const PALETTE = [
  '34d399', // emerald (brand-adjacent)
  '22d3ee', // cyan
  'a78bfa', // violet
  'f472b6', // pink
  'fbbf24', // amber
  'f87171', // red
  '60a5fa', // blue
  '4ade80', // green
]

/** Deterministic 0..n hash so colors/hues are stable per seed. */
export function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** A stable hue (0..359) for a seed — used for whiteboard accents, tiles, etc. */
export function seededHue(seed: string): number {
  return hashSeed(seed) % 360
}

/** A stable brand-palette hex (no #) for a seed. */
export function seededColor(seed: string): string {
  return PALETTE[hashSeed(seed) % PALETTE.length]
}

/**
 * Resolve an avatar URL: the user's own if present, otherwise a deterministic
 * DiceBear "fun-emoji"/initials style tinted with a stable palette color.
 */
export function resolveAvatar(seed: string, existing?: string | null): string {
  if (existing) return existing
  const bg = seededColor(seed)
  const name = encodeURIComponent(seed)
  return `https://api.dicebear.com/9.x/initials/svg?seed=${name}&backgroundColor=${bg}&fontWeight=600&radius=50`
}

/** Two-letter initials fallback for the <AvatarFallback>. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
