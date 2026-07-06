'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  HiPlus, HiOutlineClipboardDocumentCheck, HiOutlinePencil,
  HiOutlineTrash, HiOutlineChevronRight, HiOutlineSparkles,
  HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineXCircle,
} from 'react-icons/hi2'

// ─────────────────── Types ───────────────────
interface Subject { id: string; name: string }
interface Assessment {
  id: string; title: string; description?: string
  subject: any; type: string; isPublished: boolean; createdAt: string
}
interface QuestionOption { optionText: string; isCorrect: boolean }
interface QuestionDraft {
  _draftId: string   // client-only key, never sent to the API
  questionText: string
  type: string
  points: number
  options: QuestionOption[]
}
interface Question {
  id: string; questionText: string; type: string
  points: number; order: number; options: QuestionOption[]
}
type DraftShape = Omit<QuestionDraft, '_draftId'>

// ─────────────────── Constants ───────────────────
const TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'flashcard', label: 'Flashcard' },
  { value: 'practice_test', label: 'Practice Test' },
  { value: 'homework', label: 'Homework' },
]
const Q_TYPES = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
]
const TEXT_TYPES = ['short_answer', 'essay']
const TYPE_COLORS: Record<string, string> = {
  quiz: 'bg-violet-50 text-violet-700 border-violet-100',
  flashcard: 'bg-sky-50 text-sky-700 border-sky-100',
  practice_test: 'bg-amber-50 text-amber-700 border-amber-100',
  homework: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

function isComplete(q: DraftShape): boolean {
  if (!q.questionText.trim()) return false
  // Short-answer/essay questions are graded manually and need no options.
  if (TEXT_TYPES.includes(q.type)) return true
  if (q.options.length < 2) return false
  if (q.options.some(o => !o.optionText.trim())) return false
  if (!q.options.some(o => o.isCorrect)) return false
  return true
}
function makeDraftId() { return Math.random().toString(36).slice(2) }
function emptyDraft(): QuestionDraft {
  return {
    _draftId: makeDraftId(),
    questionText: '',
    type: 'single_choice',
    points: 1,
    options: [{ optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }],
  }
}

// ─────────────────── QuestionEditor ───────────────────
function QuestionEditor({
  q, onChange, onDelete, headerSlot, complete,
}: {
  q: DraftShape
  onChange: (u: DraftShape) => void
  onDelete?: () => void
  headerSlot?: React.ReactNode
  complete?: boolean
}) {
  const set = (patch: Partial<DraftShape>) => onChange({ ...q, ...patch })
  const setOpt = (i: number, patch: Partial<QuestionOption>) =>
    set({ options: q.options.map((o, ix) => ix === i ? { ...o, ...patch } : o) })
  const isSingle = q.type === 'single_choice' || q.type === 'true_false'
  const isText = TEXT_TYPES.includes(q.type)

  const handleTypeChange = (v: string) => {
    if (v === 'true_false') {
      set({ type: v, options: [{ optionText: 'True', isCorrect: true }, { optionText: 'False', isCorrect: false }] })
    } else if (TEXT_TYPES.includes(v)) {
      // Text questions carry no options.
      set({ type: v, options: [] })
    } else {
      // Choice type: ensure there are at least two option rows to fill in.
      const resetOpts =
        q.options.length >= 2 && q.type !== 'true_false'
          ? q.options
          : [{ optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }]
      set({ type: v, options: resetOpts })
    }
  }

  const toggleCorrect = (i: number, val: boolean) => {
    if (isSingle) {
      set({ options: q.options.map((o, ix) => ({ ...o, isCorrect: ix === i ? val : false })) })
    } else {
      setOpt(i, { isCorrect: val })
    }
  }

  return (
    <div className="border border-border rounded-xl p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {headerSlot}
          {complete !== undefined && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${complete
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {complete
                ? '\u2713 complete — ready to save'
                : isText
                  ? '\u26a0 add question text before saving'
                  : '\u26a0 set a correct answer before saving'}
            </span>
          )}
        </div>
        {onDelete && (
          <button onClick={onDelete} className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer flex-shrink-0">
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Question Text (supports Markdown)</Label>
        <Textarea
          value={q.questionText}
          onChange={e => set({ questionText: e.target.value })}
          placeholder="e.g. What is the capital of Nigeria?"
          rows={2} className="text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Question Type</Label>
          <Select value={q.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Q_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Points</Label>
          <Input type="number" min={1} value={q.points}
            onChange={e => set({ points: Math.max(1, Number(e.target.value)) })}
            className="text-sm" />
        </div>
      </div>

      {isText ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          {q.type === 'essay' ? 'Essay' : 'Short answer'} questions have no options. Students type
          their response and you grade it manually after submission.
        </div>
      ) : (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Options – {isSingle ? 'select ONE correct' : 'select ALL correct'}
        </Label>
        {q.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Checkbox
              checked={opt.isCorrect}
              onCheckedChange={v => toggleCorrect(i, Boolean(v))}
              className="border-secondary data-[state=checked]:bg-secondary flex-shrink-0"
            />
            <Input
              value={opt.optionText}
              onChange={e => setOpt(i, { optionText: e.target.value })}
              placeholder={`Option ${i + 1}`}
              className="text-sm flex-1"
            />
            {q.type !== 'true_false' && (
              <button
                onClick={() => set({ options: q.options.filter((_, ix) => ix !== i) })}
                className="text-muted-foreground hover:text-red-500 cursor-pointer flex-shrink-0"
              >
                <HiOutlineXCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {q.type !== 'true_false' && q.options.length < 8 && (
          <Button variant="outline" size="sm"
            onClick={() => set({ options: [...q.options, { optionText: '', isCorrect: false }] })}
            className="text-xs gap-1 cursor-pointer">
            <HiPlus className="h-3 w-3" /> Add Option
          </Button>
        )}
      </div>
      )}
    </div>
  )
}

// ─────────────────── Main Page ───────────────────
export default function TutorAssessmentsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [qLoading, setQLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', subject: '', type: 'quiz', timeLimitMinutes: 0, passingScore: 70 })
  const [saving, setSaving] = useState(false)

  const [drafts, setDrafts] = useState<QuestionDraft[]>([])
  const [savingQ, setSavingQ] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<DraftShape | null>(null)

  const draftsRef = useRef(drafts)
  const selectedRef = useRef(selected)
  const editTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { draftsRef.current = drafts }, [drafts])
  useEffect(() => { selectedRef.current = selected }, [selected])

  useEffect(() => {
    fetch('/api/subjects?limit=100').then(r => r.json()).then(d => setSubjects(d?.docs || []))
    loadAssessments()
    return () => {
      if (editTimer.current) clearTimeout(editTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAssessments = async () => {
    setIsLoading(true)
    try {
      const r = await fetch('/api/assessments?limit=50')
      const d = await r.json()
      setAssessments(d?.docs || [])
    } finally { setIsLoading(false) }
  }

  const loadQuestions = useCallback(async (id: string) => {
    setQLoading(true)
    try {
      const r = await fetch(`/api/assessments/questions?assessmentId=${id}`)
      const d = await r.json()
      setQuestions(d?.docs || [])
    } finally { setQLoading(false) }
  }, [])

  const selectAssessment = (a: Assessment) => {
    setSelected(a)
    setDrafts([])
    setEditingId(null)
    setEditDraft(null)
    loadQuestions(a.id)
  }

  const handleDraftChange = (draftId: string, updated: QuestionDraft) => {
    setDrafts(prev => prev.map(d => d._draftId === draftId ? updated : d))
  }

  const saveAllDrafts = async () => {
    if (!selected) return
    const pendingDrafts = drafts
    const incomplete = pendingDrafts.filter(d => !isComplete(d))
    if (incomplete.length > 0) {
      if (incomplete.some(d => !d.questionText.trim())) { toast.error('All questions need text'); return }
      toast.error('Mark at least one correct answer per question before saving')
      return
    }
    setSavingQ(true)
    try {
      const saved: Question[] = []
      for (let i = 0; i < pendingDrafts.length; i++) {
        const { _draftId, ...body } = pendingDrafts[i]
        const r = await fetch('/api/assessments/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentId: selected.id, ...body, order: questions.length + i }),
        })
        const d = await r.json()
        if (d.question) saved.push(d.question)
      }
      const savedIds = new Set(pendingDrafts.map(d => d._draftId))
      setQuestions(prev => [...prev, ...saved])
      setDrafts(prev => prev.filter(d => !savedIds.has(d._draftId)))
      toast.success(`${saved.length} question${saved.length > 1 ? 's' : ''} saved!`)
    } catch { toast.error('Failed to save questions') }
    finally { setSavingQ(false) }
  }

  const deleteQuestion = async (id: string) => {
    await fetch(`/api/assessments/questions?questionId=${id}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(q => q.id !== id))
    if (editingId === id) { setEditingId(null); setEditDraft(null) }
    toast.success('Question deleted')
  }

  const startEdit = (q: Question) => {
    if (editTimer.current) clearTimeout(editTimer.current)
    setEditingId(q.id)
    setEditDraft({ questionText: q.questionText, type: q.type, points: q.points, options: q.options || [] })
  }

  const handleEditChange = (updated: DraftShape) => {
    setEditDraft(updated)
    if (editTimer.current) clearTimeout(editTimer.current)
    if (!isComplete(updated) || !editingId) return
    const currentId = editingId
    editTimer.current = setTimeout(() => {
      fetch('/api/assessments/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentId, ...updated }),
      }).then(r => r.json()).then(data => {
        if (data.question) {
          setQuestions(prev => prev.map(q => q.id === currentId ? { ...q, ...updated } : q))
        }
      }).catch(() => { })
    }, 1000)
  }

  const finishEdit = async () => {
    if (!editingId || !editDraft) { setEditingId(null); setEditDraft(null); return }
    if (!isComplete(editDraft)) { toast.error('Mark at least one correct answer before finishing'); return }
    if (editTimer.current) clearTimeout(editTimer.current)
    try {
      const r = await fetch('/api/assessments/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: editingId, ...editDraft }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setQuestions(prev => prev.map(q => q.id === editingId ? { ...q, ...editDraft } : q))
      toast.success('Question updated')
    } catch (err: any) { toast.error(err.message) }
    setEditingId(null)
    setEditDraft(null)
  }

  const createAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.subject) { toast.error('Title and Subject are required'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/assessments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success('Assessment created!')
      setCreateOpen(false)
      setForm({ title: '', description: '', subject: '', type: 'quiz', timeLimitMinutes: 0, passingScore: 70 })
      await loadAssessments()
      selectAssessment(d.assessment)
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="flex h-full">
      <div className={`flex flex-col border-r border-border bg-background ${selected ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 xl:w-96 flex-shrink-0`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">Assessments</h1>
            <p className="text-xs text-muted-foreground">{assessments.length} total</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1 cursor-pointer">
            <HiPlus className="h-4 w-4" /> New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)
            : assessments.length === 0
              ? (
                <div className="text-center py-16">
                  <HiOutlineClipboardDocumentCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No assessments yet.</p>
                  <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="mt-3 cursor-pointer">Create First</Button>
                </div>
              )
              : assessments.map(a => {
                const subjectName = typeof a.subject === 'object' ? a.subject?.name : a.subject
                return (
                  <button key={a.id} onClick={() => selectAssessment(a)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${selected?.id === a.id ? 'border-secondary bg-secondary/10' : 'border-border hover:border-secondary/40 hover:bg-muted/30'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold line-clamp-1">{a.title}</p>
                      <HiOutlineChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${TYPE_COLORS[a.type] || ''}`}>{a.type}</Badge>
                      {subjectName && <span className="text-[10px] text-muted-foreground">{subjectName}</span>}
                    </div>
                  </button>
                )
              })
          }
        </div>
      </div>

      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
            <button onClick={() => setSelected(null)} className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer">←</button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold truncate">{selected.title}</h2>
              <p className="text-xs text-muted-foreground">{questions.length} saved · {drafts.length} drafts</p>
            </div>
            {drafts.length > 0 && (
              <Button size="sm" onClick={saveAllDrafts} disabled={savingQ}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1 cursor-pointer">
                <HiOutlineCheckCircle className="h-4 w-4" />
                {savingQ ? 'Saving…' : `Save ${drafts.length} Question${drafts.length > 1 ? 's' : ''}`}
              </Button>
            )}
            <Button size="sm" variant="outline"
              onClick={() => setDrafts(prev => [...prev, emptyDraft()])}
              disabled={questions.length + drafts.length >= 100}
              className="gap-1 cursor-pointer">
              <HiPlus className="h-4 w-4" /> Add Question
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {qLoading
              ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)
              : questions.map((q, idx) => {
                if (editingId === q.id && editDraft) {
                  return (
                    <div key={q.id} className="relative pt-3">
                      <div className="absolute top-0 left-3 z-10">
                        <Badge className="bg-blue-500 text-white text-[10px] px-2 py-0">Editing Q{idx + 1}</Badge>
                      </div>
                      <QuestionEditor
                        q={editDraft}
                        onChange={handleEditChange}
                        onDelete={() => deleteQuestion(q.id)}
                        complete={isComplete(editDraft)}
                        headerSlot={
                          <Button size="sm" onClick={finishEdit}
                            className="text-xs h-7 bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1 cursor-pointer">
                            <HiOutlineCheckCircle className="h-3 w-3" /> Done editing
                          </Button>
                        }
                      />
                    </div>
                  )
                }
                return (
                  <div key={q.id} className="border border-border rounded-xl p-4 bg-card space-y-2 group relative">
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(q)} title="Edit"
                        className="text-muted-foreground hover:text-secondary p-1 cursor-pointer">
                        <HiOutlinePencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} title="Delete"
                        className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer">
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pr-16">
                      <span className="text-xs font-bold text-muted-foreground">Q{idx + 1}</span>
                      <Badge variant="outline" className="text-[10px] px-2 py-0">{q.type.replace(/_/g, ' ')}</Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm font-medium">{q.questionText}</p>
                    {q.options?.length > 0 && (
                      <div className="space-y-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${opt.isCorrect
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-muted/30 text-muted-foreground'}`}>
                            {opt.isCorrect
                              ? <HiOutlineCheckCircle className="h-3 w-3 shrink-0" />
                              : <HiOutlineDocumentText className="h-3 w-3 shrink-0" />}
                            {opt.optionText}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            }

            {drafts.map((d, i) => (
              <div key={d._draftId} className="relative pt-3">
                <div className="absolute top-0 left-3 z-10">
                  <Badge className="text-white text-[10px] px-2 py-0 bg-amber-500">
                    Draft Q{questions.length + i + 1}
                  </Badge>
                </div>
                <QuestionEditor
                  q={d}
                  onChange={updated => handleDraftChange(d._draftId, { ...updated, _draftId: d._draftId })}
                  onDelete={() => {
                    setDrafts(prev => prev.filter(x => x._draftId !== d._draftId))
                  }}
                  complete={isComplete(d)}
                />
              </div>
            ))}

            {questions.length === 0 && drafts.length === 0 && !qLoading && (
              <div className="text-center py-20 rounded-2xl border border-dashed border-border">
                <HiOutlineSparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">No questions yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Add Question" to start building this assessment.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden lg:flex items-center justify-center bg-muted/10">
          <div className="text-center">
            <HiOutlineClipboardDocumentCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Select an Assessment</p>
            <p className="text-sm text-muted-foreground mt-1">Choose from the list to view and edit questions.</p>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={createAssessment}>
            <DialogHeader>
              <DialogTitle>Create Assessment</DialogTitle>
              <DialogDescription>Set up a new assessment. You can add questions after.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Algebra Mid-Term Quiz" required />
              </div>
              <div className="space-y-1.5">
                <Label>Subject *</Label>
                <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Time Limit (min, 0=none)</Label>
                  <Input type="number" min={0} value={form.timeLimitMinutes}
                    onChange={e => setForm(f => ({ ...f, timeLimitMinutes: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional instructions..." />
              </div>
              <div className="space-y-1.5">
                <Label>Passing Score (%)</Label>
                <Input type="number" min={0} max={100} value={form.passingScore}
                  onChange={e => setForm(f => ({ ...f, passingScore: Number(e.target.value) }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer">
                {saving ? 'Creating…' : 'Create Assessment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
