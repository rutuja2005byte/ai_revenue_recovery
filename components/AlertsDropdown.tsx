'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BellIcon } from '@heroicons/react/24/outline'

export type AlertItem = {
  id: string
  user_id: string
  message: string
  type: 'info' | 'warning' | 'critical'
  read: boolean
  created_at: string
}

export default function AlertsDropdown() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && data) {
        setAlerts(data)
      }
    } catch (err) {
      console.error('Error fetching alerts:', err)
    }
  }

  useEffect(() => {
    fetchAlerts()

    const handleAlertsUpdate = () => {
      fetchAlerts()
    }
    window.addEventListener('alerts-updated', handleAlertsUpdate)

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchAlerts()
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('alerts-updated', handleAlertsUpdate)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = alerts.filter((a) => !a.read).length

  const markAsRead = async (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
    )
    await supabase.from('alerts').update({ read: true }).eq('id', alertId)
  }

  const markAllAsRead = async () => {
    const unreadIds = alerts.filter((a) => !a.read).map((a) => a.id)
    if (unreadIds.length === 0) return

    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
    await supabase
      .from('alerts')
      .update({ read: true })
      .in('id', unreadIds)
  }

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHour = Math.floor(diffMin / 60)
      const diffDay = Math.floor(diffHour / 24)

      if (diffSec < 60) return 'Just now'
      if (diffMin < 60) return `${diffMin}m ago`
      if (diffHour < 24) return `${diffHour}h ago`
      if (diffDay < 7) return `${diffDay}d ago`
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-amber-500'
      case 'info':
      default:
        return 'border-l-gray-400'
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors focus:outline-none flex items-center justify-center"
        aria-label="Alerts"
      >
        <BellIcon className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-3.5 z-50">
          <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-gray-900">Alerts</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-50 text-red-600 font-medium px-2.5 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {alerts.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No alerts yet
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => markAsRead(alert.id)}
                  className={`p-4 border-l-4 cursor-pointer transition-colors hover:bg-gray-50 ${getBorderColor(
                    alert.type
                  )} ${alert.read ? 'bg-white opacity-60' : 'bg-gray-50/40'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {alert.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(alert.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-snug">
                    {alert.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
