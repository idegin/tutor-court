'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineUsers,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCreditCard,
  HiOutlineCalendar,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  student_joined_class: { label: 'Student Joined', icon: HiOutlineUsers, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  parent_accepted_invite: { label: 'Parent Accepted', icon: HiOutlineUsers, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  student_added_to_class: { label: 'Student Added', icon: HiOutlineUsers, color: 'text-violet-600 bg-violet-50 border-violet-100' },
  assessment_completed: { label: 'Assessment Done', icon: HiOutlineClipboardDocumentCheck, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  assessment_sent: { label: 'Assessment Sent', icon: HiOutlineClipboardDocumentCheck, color: 'text-sky-600 bg-sky-50 border-sky-100' },
  new_booking: { label: 'New Booking', icon: HiOutlineCalendar, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  payment_received: { label: 'Payment', icon: HiOutlineCreditCard, color: 'text-green-600 bg-green-50 border-green-100' },
  class_reminder: { label: 'Reminder', icon: HiOutlineCalendar, color: 'text-orange-600 bg-orange-50 border-orange-100' },
  general: { label: 'Notice', icon: HiOutlineSparkles, color: 'text-gray-600 bg-gray-50 border-gray-100' },
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  link?: string
  createdAt: string
}

export default function TutorNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const url = filter === 'unread'
        ? '/api/notifications?unreadOnly=true&limit=50'
        : '/api/notifications?limit=50'
      const res = await fetch(url)
      const data = await res.json()
      setNotifications(data?.docs || [])
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markOne = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const markAll = async () => {
    setIsMarkingAll(true)
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    } finally {
      setIsMarkingAll(false)
    }
  }

  const displayed = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Stay up to date with your classes and students.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            <button
              className={`px-3 py-1.5 transition-colors cursor-pointer ${filter === 'all' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`px-3 py-1.5 transition-colors cursor-pointer ${filter === 'unread' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setFilter('unread')}
            >
              Unread
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAll}
              disabled={isMarkingAll}
              className="rounded-lg text-xs gap-1.5 cursor-pointer"
            >
              <HiOutlineCheckCircle className="h-4 w-4" />
              {isMarkingAll ? 'Marking...' : 'Mark all read'}
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          ))
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted/50 mb-4">
              <HiOutlineBell className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">
              {filter === 'unread' ? 'No unread notifications' : "You're all caught up!"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'unread'
                ? 'Switch to "All" to see your notification history.'
                : 'New notifications will appear here.'}
            </p>
          </div>
        ) : (
          displayed.map((notif) => {
            const meta = TYPE_META[notif.type] || TYPE_META.general
            const Icon = meta.icon
            const timeAgo = formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })

            return (
              <div
                key={notif.id}
                className={`group flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  notif.isRead
                    ? 'bg-card border-border hover:bg-muted/30'
                    : 'bg-secondary/5 border-secondary/20 hover:bg-secondary/10'
                }`}
              >
                {/* Icon */}
                <div className={`shrink-0 flex items-center justify-center h-10 w-10 rounded-xl border text-sm ${meta.color}`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${notif.isRead ? 'text-foreground' : 'text-foreground'}`}>
                        {notif.title}
                        {!notif.isRead && (
                          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-secondary align-middle" />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline" className={`text-[10px] py-0 px-2 border ${meta.color}`}>
                      {meta.label}
                    </Badge>

                    {notif.link && (
                      <Link
                        href={notif.link}
                        className="text-[11px] text-secondary hover:underline flex items-center gap-1"
                      >
                        View <HiOutlineArrowTopRightOnSquare className="h-3 w-3" />
                      </Link>
                    )}

                    {!notif.isRead && (
                      <button
                        onClick={() => markOne(notif.id)}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-auto flex items-center gap-1 cursor-pointer"
                      >
                        <HiOutlineXMark className="h-3 w-3" />
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
