/**
 * Shared authorization for whiteboard endpoints.
 *
 * - `canWrite`: the whiteboard owner or an admin (may add/edit/delete slides).
 * - `canRead`: writers, plus enrolled members of the whiteboard's class, plus
 *   anyone if the board is public. Prevents unauthenticated / cross-class reads.
 */
export async function getWhiteboardAccess(
  payload: any,
  whiteboardId: number,
  user: any,
): Promise<{ whiteboard: any | null; canRead: boolean; canWrite: boolean }> {
  const whiteboard = await payload
    .findByID({ collection: 'whiteboards', id: whiteboardId, depth: 0 })
    .catch(() => null)

  if (!whiteboard) return { whiteboard: null, canRead: false, canWrite: false }

  const ownerId = typeof whiteboard.owner === 'object' ? whiteboard.owner?.id : whiteboard.owner
  const isAdmin = user?.accountType === 'admin'
  const canWrite = Boolean(user) && (ownerId === user.id || isAdmin)

  let isMember = false
  const classId = typeof whiteboard.class === 'object' ? whiteboard.class?.id : whiteboard.class
  if (classId && user) {
    const cls = await payload
      .findByID({ collection: 'classes', id: classId, depth: 0 })
      .catch(() => null)
    if (cls) {
      const tutorId = typeof cls.tutor === 'object' ? cls.tutor?.id : cls.tutor
      const studentIds = (cls.students || []).map((s: any) => (typeof s === 'object' ? s.id : s))
      const parentIds = (cls.parents || []).map((p: any) => (typeof p === 'object' ? p.id : p))
      isMember =
        user.id === tutorId || studentIds.includes(user.id) || parentIds.includes(user.id)
    }
  }

  const canRead = canWrite || isMember || Boolean(whiteboard.isPublic)
  return { whiteboard, canRead, canWrite }
}
