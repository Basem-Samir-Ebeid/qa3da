'use client'

import { useState, useEffect, useRef } from 'react'
import { OrderWithDetails } from '@/lib/types'
import useSWR from 'swr'
import { Coffee, LogOut, Clock, CheckCircle, Loader2, RefreshCw, ClipboardList, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface StaffUser {
  id: string
  username: string
  name: string
  is_active: boolean
}

interface UserOrderGroup {
  userId: string
  userName: string
  tableNumber?: string
  orders: OrderWithDetails[]
  totalPrice: number
  earliestTime: string
}

export default function StaffPage() {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [completingUserId, setCompletingUserId] = useState<string | null>(null)
  const previousOrderCount = useRef<number>(0)

  const playOrderSound = () => {
    const audio = new Audio('/sounds/order.wav')
    audio.volume = 0.7
    audio.play().catch(() => {})
  }

  const { data: orders = [], mutate: mutateOrders, isLoading } = useSWR<OrderWithDetails[]>(
    staffUser ? 'staff-pending-orders' : null,
    async () => {
      const sessionRes = await fetch('/api/sessions')
      const session = await sessionRes.json()
      if (!session?.id) return []
      const ordersRes = await fetch(`/api/orders?session_id=${session.id}`)
      const allOrders = await ordersRes.json()
      return (allOrders || []).filter((o: OrderWithDetails) => o.status === 'pending' || !o.status)
    },
    { refreshInterval: 3000 }
  )

  // Group orders by user
  const userGroups: UserOrderGroup[] = Object.values(
    orders.reduce((acc: Record<string, UserOrderGroup>, order) => {
      const uid = order.user_id || 'unknown'
      if (!acc[uid]) {
        acc[uid] = {
          userId: uid,
          userName: order.user?.name || 'مستخدم',
          tableNumber: order.user?.table_number,
          orders: [],
          totalPrice: 0,
          earliestTime: order.created_at,
        }
      }
      acc[uid].orders.push(order)
      acc[uid].totalPrice += Number(order.total_price || 0)
      if (new Date(order.created_at) < new Date(acc[uid].earliestTime)) {
        acc[uid].earliestTime = order.created_at
      }
      return acc
    }, {})
  ).sort((a, b) => new Date(a.earliestTime).getTime() - new Date(b.earliestTime).getTime())

  useEffect(() => {
    if (orders.length > previousOrderCount.current && previousOrderCount.current > 0) {
      playOrderSound()
      toast.success('طلب جديد وصل!')
    }
    previousOrderCount.current = orders.length
  }, [orders.length])

  useEffect(() => {
    const savedStaff = localStorage.getItem('staff_user')
    if (savedStaff) {
      try { setStaffUser(JSON.parse(savedStaff)) }
      catch { localStorage.removeItem('staff_user') }
    }
  }, [])

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error('من فضلك أدخل اسم المستخدم وكلمة المرور')
      return
    }
    setIsLoggingIn(true)
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      })
      const data = await res.json()
      if (!res.ok || !data) { toast.error('اسم المستخدم أو كلمة المرور غير صحيحة'); return }
      setStaffUser(data)
      localStorage.setItem('staff_user', JSON.stringify(data))
      toast.success(`أهلاً ${data.name}!`)
    } catch { toast.error('حدث خطأ، حاول مرة أخرى') }
    finally { setIsLoggingIn(false) }
  }

  const handleLogout = () => {
    setStaffUser(null)
    localStorage.removeItem('staff_user')
    setUsername('')
    setPassword('')
  }

  // Mark ALL orders for a user as completed at once
  const markUserOrdersCompleted = async (group: UserOrderGroup) => {
    setCompletingUserId(group.userId)
    try {
      await Promise.all(
        group.orders.map(order =>
          fetch(`/api/orders/${order.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' })
          })
        )
      )
      toast.success(`تم تنفيذ طلب ${group.userName}!`)
      mutateOrders()
    } catch { toast.error('حدث خطأ، حاول مرة أخرى') }
    finally { setCompletingUserId(null) }
  }

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })

  // --- Login Screen ---
  if (!staffUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Developer attribution bar */}
        <div className="relative overflow-hidden py-[5px]" style={{ background: 'linear-gradient(90deg, #1a0a00, #3d1f00, #6b3a00, #D4A017, #6b3a00, #3d1f00, #1a0a00)' }}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] tracking-widest uppercase text-amber-200/60 font-medium">✦</span>
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: '#ffe8a0', textShadow: '0 0 12px rgba(212,160,23,0.8), 0 0 24px rgba(212,160,23,0.4)' }}>
              Developed by Basem Samir Ebeid
            </span>
            <span className="text-[10px] tracking-widest uppercase text-amber-200/60 font-medium">✦</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Coffee className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Staff Page</h1>
            <p className="text-muted-foreground mt-2">تسجيل دخول الموظفين</p>
          </div>
          <div className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">اسم المستخدم</label>
              <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم" className="text-right"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">كلمة المرور</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور" className="text-right"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full">
              {isLoggingIn && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تسجيل الدخول
            </Button>
          </div>
        </div>
        </div>
      </div>
    )
  }

  // --- Main Staff Interface ---
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        {/* Developer attribution bar */}
        <div className="relative overflow-hidden py-[5px]" style={{ background: 'linear-gradient(90deg, #1a0a00, #3d1f00, #6b3a00, #D4A017, #6b3a00, #3d1f00, #1a0a00)' }}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] tracking-widest uppercase text-amber-200/60 font-medium">✦</span>
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: '#ffe8a0', textShadow: '0 0 12px rgba(212,160,23,0.8), 0 0 24px rgba(212,160,23,0.4)' }}>
              Developed by Basem Samir Ebeid
            </span>
            <span className="text-[10px] tracking-widest uppercase text-amber-200/60 font-medium">✦</span>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="h-5 w-5" />
          </Button>
          <div className="text-right">
            <h1 className="font-bold text-foreground">{staffUser.name}</h1>
            <p className="text-xs text-muted-foreground">Staff</p>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => mutateOrders()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            طلبات العملاء
          </h2>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
          </div>
        ) : userGroups.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">لا توجد طلبات معلقة</p>
            <p className="text-muted-foreground">جميع الطلبات تم تنفيذها</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userGroups.map((group) => (
              <div key={group.userId} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

                {/* Card Header - User info */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">{formatTime(group.earliestTime)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{group.userName}</p>
                    {group.tableNumber && (
                      <p className="text-xs text-muted-foreground">طربيزة {group.tableNumber}</p>
                    )}
                  </div>
                </div>

                {/* Drinks list */}
                <div className="px-4 py-3 space-y-2">
                  {group.orders.map((order, idx) => (
                    <div key={order.id} className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Drink name + quantity */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-foreground">{order.drink?.name}</span>
                          {order.quantity > 1 && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              × {order.quantity}
                            </span>
                          )}
                        </div>
                        {/* Notes */}
                        {order.notes && (
                          <div className="mt-1 flex items-start gap-1.5 pr-8">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                            <span className="text-xs text-muted-foreground italic">{order.notes}</span>
                          </div>
                        )}
                      </div>
                      {/* Price per item */}
                      {Number(order.total_price) > 0 && (
                        <span className="shrink-0 text-sm font-medium text-primary">
                          {order.total_price} ج.م
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer - total + action */}
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <Button
                    onClick={() => markUserOrdersCompleted(group)}
                    disabled={completingUserId === group.userId}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {completingUserId === group.userId ? (
                      <Loader2 className="h-5 w-5 animate-spin ml-2" />
                    ) : (
                      <CheckCircle className="h-5 w-5 ml-2" />
                    )}
                    تم التنفيذ
                  </Button>
                  {group.totalPrice > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">الإجمالي</p>
                      <p className="text-lg font-bold text-primary">{group.totalPrice.toFixed(0)} ج.م</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {userGroups.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              {userGroups.length} {userGroups.length === 1 ? 'عميل' : 'عملاء'} في الانتظار
            </span>
            <span className="bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm font-medium">
              {orders.length} صنف إجمالاً
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
