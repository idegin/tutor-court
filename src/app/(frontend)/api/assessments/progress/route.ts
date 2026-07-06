import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/** Safely read an id from a relationship field that may be an id or a populated object. */
function relId(rel: any): string | null {
  if (rel == null) return null
  return String(typeof rel === 'object' ? rel.id : rel)
}

/**
 * GET /api/assessments/progress
 *
 * Role-aware aggregation of the `assessment-results` collection into a single
 * progress payload (summary stats, score trend, per-subject breakdown and a
 * flat results table). Only completed (submitted) results are considered.
 *
 * Query params:
 *   - studentId: focus a single student (tutor: any of their students; parent: one of their children)
 *   - classId:   (tutor only) focus a single class
 */
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const role = user.accountType
  if (role !== 'tutor' && role !== 'student' && role !== 'parent') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const studentFilter = searchParams.get('studentId') || undefined
  const classFilter = searchParams.get('classId') || undefined

  const empty = {
    summary: {
      totalAssessments: 0,
      averageScore: 0,
      passRate: 0,
      bestScore: 0,
      latestScore: 0,
    },
    trend: [] as any[],
    bySubject: [] as any[],
    results: [] as any[],
    students: [] as { id: string; name: string }[],
  }

  try {
    // Resolve which students this user is allowed to see, and validate any filter.
    let childIds: string[] | null = null // null = not applicable (student/tutor)
    if (role === 'parent') {
      const childrenRes = await payload.find({
        collection: 'users',
        where: {
          and: [{ parent: { equals: user.id } }, { accountType: { equals: 'student' } }],
        },
        limit: 200,
        depth: 0,
      })
      childIds = childrenRes.docs.map((d: any) => String(d.id))
      if (childIds.length === 0) return NextResponse.json(empty)
      if (studentFilter && !childIds.includes(String(studentFilter))) {
        return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
      }
    }

    // Build the base where clause (only completed results, scoped to the role).
    const and: any[] = [{ submittedAt: { exists: true } }]
    if (role === 'tutor') {
      and.push({ tutor: { equals: user.id } })
    } else if (role === 'student') {
      and.push({ student: { equals: user.id } })
    } else if (role === 'parent') {
      and.push({ student: { in: childIds } })
    }

    const resultsRes = await payload.find({
      collection: 'assessment-results',
      where: { and },
      // depth 3 so tutorAssessment.assessment.subject.name resolves
      // (result → tutorAssessment(1) → assessment(2) → subject(3)).
      depth: 3,
      limit: 500,
      sort: 'submittedAt',
    })

    const allDocs = resultsRes.docs as any[]

    // Build the stable student list (from the full, unfiltered set) so the
    // filter dropdown does not collapse when a single student is selected.
    const studentMap = new Map<string, string>()
    for (const doc of allDocs) {
      const s = doc.student
      const sid = relId(s)
      if (!sid) continue
      const name =
        typeof s === 'object'
          ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email || 'Student'
          : 'Student'
      if (!studentMap.has(sid)) studentMap.set(sid, name)
    }
    const students = Array.from(studentMap.entries()).map(([id, name]) => ({ id, name }))

    // Apply optional in-memory filters for the aggregations.
    const docs = allDocs.filter((doc) => {
      if (studentFilter && relId(doc.student) !== String(studentFilter)) return false
      if (classFilter) {
        const ta = doc.tutorAssessment
        const cls = typeof ta === 'object' ? ta?.class : null
        if (relId(cls) !== String(classFilter)) return false
      }
      return true
    })

    if (docs.length === 0) {
      return NextResponse.json({ ...empty, students })
    }

    // Flatten each result into a table-friendly row.
    const rows = docs.map((doc) => {
      const ta = typeof doc.tutorAssessment === 'object' ? doc.tutorAssessment : null
      const assessment = ta && typeof ta.assessment === 'object' ? ta.assessment : null
      const subjectRel = assessment ? assessment.subject : null
      const subject =
        typeof subjectRel === 'object' && subjectRel ? subjectRel.name || 'General' : 'General'
      const cls = ta && typeof ta.class === 'object' ? ta.class : null
      const student = typeof doc.student === 'object' ? doc.student : null
      const studentName = student
        ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email || 'Student'
        : 'Student'

      return {
        id: String(doc.id),
        title: assessment?.title || 'Assessment',
        subject,
        studentName,
        studentId: relId(doc.student),
        className: cls?.title || null,
        score: Math.round(doc.score || 0),
        passed: Boolean(doc.passed),
        passingScore:
          assessment && typeof assessment.passingScore === 'number' ? assessment.passingScore : 70,
        attempt: doc.attempt || 1,
        submittedAt: doc.submittedAt || null,
        tutorAssessmentId: relId(doc.tutorAssessment),
      }
    })

    // Summary.
    const totalAssessments = rows.length
    const scoreSum = rows.reduce((acc, r) => acc + r.score, 0)
    const averageScore = Math.round(scoreSum / totalAssessments)
    const passedCount = rows.filter((r) => r.passed).length
    const passRate = Math.round((passedCount / totalAssessments) * 100)
    const bestScore = rows.reduce((max, r) => Math.max(max, r.score), 0)
    // rows are already sorted oldest→newest by submittedAt.
    const latestScore = rows[rows.length - 1].score

    // Trend (oldest → newest).
    const trend = rows.map((r) => ({
      date: r.submittedAt,
      score: r.score,
      title: r.title,
    }))

    // Per-subject breakdown.
    const subjectAgg = new Map<string, { total: number; count: number }>()
    for (const r of rows) {
      const cur = subjectAgg.get(r.subject) || { total: 0, count: 0 }
      cur.total += r.score
      cur.count += 1
      subjectAgg.set(r.subject, cur)
    }
    const bySubject = Array.from(subjectAgg.entries())
      .map(([subject, { total, count }]) => ({
        subject,
        averageScore: Math.round(total / count),
        count,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)

    // Return the flat rows newest-first for the table.
    const resultsDesc = [...rows].reverse()

    return NextResponse.json({
      summary: { totalAssessments, averageScore, passRate, bestScore, latestScore },
      trend,
      bySubject,
      results: resultsDesc,
      students,
    })
  } catch (err) {
    console.error('[assessments/progress] Failed to build progress payload:', err)
    return NextResponse.json({ error: 'Failed to load progress.' }, { status: 500 })
  }
}
