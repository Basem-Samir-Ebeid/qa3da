'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { Drink, User, OrderWithDetails, Session } from '@/lib/types'
import { DrinkCard } from '@/components/drink-card'
import { OrderBoard } from '@/components/order-board'
import { AdminPanel } from '@/components/admin-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Coffee, Grid3x2 as Grid3X3, Settings, ChevronLeft, ChevronRight, DollarSign, Users, Calendar, Bell, X, Printer, CircleCheck as CheckCircle2, LogOut, Eye } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { ReceiptModal } from '@/components/receipt-modal'
import Image from 'next/image'

const apiFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const fetcher = async (key: string) => {
  if (key === 'drinks') {
    return apiFetcher('/api/drinks')
  }
  if (key === 'users') {
    return apiFetcher('/api/users')
  }
  if (key === 'session') {
    return apiFetcher('/api/sessions')
  }
  if (key === 'messages') {
    return apiFetcher('/api/messages')
  }
  return null
}

interface AdminMessage {
  id: string
  title: string
  message: string
  created_at: string
}

type TabType = 'menu' | 'board' | 'admin'

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userName, setUserName] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [loginError, setLoginError] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<TabType>('menu')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeName, setWelcomeName] = useState('')
  const [showMessages, setShowMessages] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [cartNotes, setCartNotes] = useState<Record<string, string>>({})
  const [showTableModal, setShowTableModal] = useState(false)
  const [pendingTableNumber, setPendingTableNumber] = useState('')
  const [tableModalError, setTableModalError] = useState('')
  const [showSurpriseModal, setShowSurpriseModal] = useState(false)
  const [surpriseDrink, setSurpiseDrink] = useState<Drink | null>(null)
  const [isSurprising, setIsSurprising] = useState(false)

  const { data: drinks = [], mutate: mutateDrinks } = useSWR<Drink[]>('drinks', fetcher, { refreshInterval: 5000 })
  const { data: users = [], mutate: mutateUsers } = useSWR<User[]>('users', fetcher, { refreshInterval: 5000 })
  const { data: session, mutate: mutateSession } = useSWR<Session>('session', fetcher)
  const { data: messages = [], mutate: mutateMessages } = useSWR<AdminMessage[]>('messages', fetcher, { refreshInterval: 2000 })
  const { data: inventory = [] } = useSWR<{ drink_id: string; quantity: number }[]>('/api/inventory', apiFetcher, { refreshInterval: 5000 })
  
  // Create inventory map for quick lookup
  const inventoryMap = inventory.reduce((acc, item) => {
    acc[item.drink_id] = item.quantity
    return acc
  }, {} as Record<string, number>)

  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [previousPendingOrderIds, setPreviousPendingOrderIds] = useState<Set<string>>(new Set())
  const [floatingMessage, setFloatingMessage] = useState<AdminMessage | null>(null)
  const processedMessageIds = useRef<Set<string>>(new Set())
  
  const unreadMessages = messages

  // Restore user session from localStorage on page load/refresh
  useEffect(() => {
    setSelectedDate(new Date())
    try {
      const saved = localStorage.getItem('qa3da_user')
      if (saved) {
        const user = JSON.parse(saved) as User
        setCurrentUser(user)
      }
    } catch {}
  }, [])

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.wav')
    audio.volume = 0.5
    audio.play().catch(() => {})
  }

  // Show floating message when new admin message arrives
  useEffect(() => {
    if (messages.length > 0 && currentUser && !floatingMessage) {
      const newMessage = messages.find(msg => !processedMessageIds.current.has(msg.id))
      if (newMessage) {
        processedMessageIds.current.add(newMessage.id)
        setFloatingMessage(newMessage)
        
        // Play sound
        playNotificationSound()
        
        // Auto-delete from database
        fetch(`/api/messages/${newMessage.id}`, { method: 'DELETE' }).then(() => {
          mutateMessages(messages.filter(m => m.id !== newMessage.id), false)
        })
      }
    }
  }, [messages, currentUser, floatingMessage, mutateMessages])

  const dismissFloatingMessage = () => {
    setFloatingMessage(null)
  }

  const handleDismissMessage = async (msgId: string) => {
    await fetch(`/api/messages/${msgId}`, { method: 'DELETE' })
    mutateMessages(messages.filter(m => m.id !== msgId), false)
  }

  // Auto-delete messages when user opens the messages modal
  const handleOpenMessages = async () => {
    setShowMessages(true)
    // Mark all messages as read by deleting them when viewed
    if (messages.length > 0) {
      // Delete all messages after user views them
      for (const msg of messages) {
        await fetch(`/api/messages/${msg.id}`, { method: 'DELETE' })
      }
      // Update local state after a short delay to let user read
      setTimeout(() => {
        mutateMessages([], false)
      }, 5000) // Give user 5 seconds to read before clearing
    }
  }

  const fetchOrders = useCallback(async () => {
    if (!session?.id) return
    try {
      const res = await fetch(`/api/orders?session_id=${session.id}`)
      const data = await res.json()
      
      const newOrders = Array.isArray(data) ? data : []
    
    // Check for completed orders for the current user
    if (currentUser) {
      const userOrders = newOrders.filter(o => o.user_id === currentUser.id)
      const currentPendingIds = new Set(
        userOrders.filter(o => o.status === 'pending').map(o => o.id)
      )
      
      // Find orders that were pending but now completed
      previousPendingOrderIds.forEach(orderId => {
        if (!currentPendingIds.has(orderId)) {
          const completedOrder = userOrders.find(o => o.id === orderId && o.status === 'completed')
          if (completedOrder) {
            toast.success(
              `طلبك جاهز: ${completedOrder.drink?.name}`,
              {
                duration: 6000,
                icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
                description: 'يمكنك استلام طلبك الآن'
              }
            )
          }
        }
      })
      
      // Update previous pending orders
      setPreviousPendingOrderIds(currentPendingIds)
    }
    
    setOrders(newOrders)
    } catch (err) {
      console.error('[v0] Error fetching orders:', err)
    }
  }, [session?.id, currentUser, previousPendingOrderIds])

  useEffect(() => {
    // Initialize inventory system on first load
    fetch('/api/setup-inventory', { method: 'POST' })
      .then(res => res.json())
      .then(data => console.log('[v0] Inventory setup:', data))
      .catch(err => console.error('[v0] Inventory setup error:', err))
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        mutateSession()
        fetchOrders()
      }
    }
    const interval = setInterval(checkMidnight, 60000)
    return () => clearInterval(interval)
  }, [mutateSession, fetchOrders])

  const handleLogin = async () => {
    setLoginError('')
    if (!userName.trim()) {
      setLoginError('أدخل اسمك أولاً')
      return
    }

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName.trim(), password: userPassword })
      })

      if (!res.ok && res.status !== 401) {
        setLoginError('حدث خطأ في الاتصال. حاول تاني')
        return
      }

      const data = await res.json()

      if (data.error) {
        if (data.error.toLowerCase().includes('database') || data.error.toLowerCase().includes('not configured')) {
          setLoginError('خطأ في قاعدة البيانات. تواصل مع المسؤول')
        } else {
          setLoginError('كلمة المرور غلط')
        }
        return
      }

      if (!data.exists) {
        setLoginError('الاسم ده مش موجود. اضغط على Sign Up عشان تسجل حساب جديد')
        return
      }

      if (data.requiresPassword) {
        setLoginError('أدخل كلمة المرور')
        return
      }

      setCurrentUser(data.user)
      localStorage.setItem('qa3da_user', JSON.stringify(data.user))
      setWelcomeName(data.user.name)
      setShowWelcome(true)
      setTimeout(() => setShowWelcome(false), 3000)
    } catch (err) {
      console.error('[v0] Login error:', err)
      setLoginError('حدث خطأ. تأكد من الاتصال بالإنترنت')
    }
  }

  const handleCreateUser = async () => {
    if (!newPassword.trim()) {
      setLoginError('الباسورد مطلوب')
      return
    }
    if (newPassword !== confirmPassword) {
      setLoginError('الباسورد مش متطابق')
      return
    }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: userName.trim(),
        password: newPassword
      })
    })
    const data = await res.json()

    if (data.error) {
      if (data.code === '23505') {
        setLoginError('الاسم ده موجود قبل كده')
      } else {
        setLoginError('حصل مشكلة في إنشاء الحساب: ' + data.error)
      }
      return
    }

    setCurrentUser(data)
    localStorage.setItem('qa3da_user', JSON.stringify(data))
    setIsNewUser(false)
    setWelcomeName(data.name)
    setShowWelcome(true)
    setTimeout(() => setShowWelcome(false), 3000)
    mutateUsers()
  }

  const handleLogout = () => {
    localStorage.removeItem('qa3da_user')
    setCurrentUser(null)
    setUserName('')
    setUserPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTableNumber('')
    setCart({})
    setCartNotes({})
    setIsNewUser(false)
    setLoginError('')
  }

  const handleAddToCart = (drinkId: string) => {
    setCart(prev => ({
      ...prev,
      [drinkId]: (prev[drinkId] || 0) + 1
    }))
  }

  const handleRemoveFromCart = (drinkId: string) => {
    setCart(prev => {
      const newCart = { ...prev }
      if (newCart[drinkId] > 1) {
        newCart[drinkId]--
      } else {
        delete newCart[drinkId]
      }
      return newCart
    })
  }

  const handleSubmitOrder = async () => {
    if (!currentUser || !session) return

    const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0)
    if (cartItems.length === 0) return

    // Show table number modal — pre-fill only if set today
    const today = new Date().toISOString().slice(0, 10)
    const savedDate = localStorage.getItem('qa3da_table_date')
    const savedTable = localStorage.getItem('qa3da_table_today')
    const isSameDay = savedDate === today
    setPendingTableNumber(isSameDay && savedTable ? savedTable : '')
    setTableModalError('')
    setShowTableModal(true)
  }

  const handleConfirmTableAndSubmit = async () => {
    if (!currentUser || !session) return
    if (!pendingTableNumber.trim()) {
      setTableModalError('رقم الطربيزة مطلوب')
      return
    }

    // Save table number to user
    await fetch(`/api/users/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_number: pendingTableNumber.trim() })
    })

    // Update local user state
    const newUser = { ...currentUser, table_number: pendingTableNumber.trim() }
    setCurrentUser(newUser)
    localStorage.setItem('qa3da_user', JSON.stringify(newUser))

    // Remember table number for today only
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('qa3da_table_date', today)
    localStorage.setItem('qa3da_table_today', pendingTableNumber.trim())

    setShowTableModal(false)

    const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0)

    for (const [drinkId, quantity] of cartItems) {
      const drink = drinks.find(d => d.id === drinkId)
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          user_id: currentUser.id,
          drink_id: drinkId,
          quantity,
          total_price: (drink?.price || 0) * quantity,
          notes: cartNotes[drinkId]?.trim() || null
        })
      })

      await fetch(`/api/inventory/${drinkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decrement', quantity })
      })
    }

    setCart({})
    setCartNotes({})
    fetchOrders()
    setActiveTab('board')
  }

  const handleSurpriseMe = () => {
    const available = drinks.filter(d => (inventoryMap[d.id] ?? 0) > 0)
    if (available.length === 0) return
    setIsSurprising(true)
    setSurpiseDrink(null)
    setShowSurpriseModal(true)
    let count = 0
    const maxSpins = 12
    const interval = setInterval(() => {
      const random = available[Math.floor(Math.random() * available.length)]
      setSurpiseDrink(random)
      count++
      if (count >= maxSpins) {
        clearInterval(interval)
        setIsSurprising(false)
      }
    }, 120)
  }

  const handleDeleteOrder = async (orderId: string) => {
    // Note: We need to add delete endpoint for orders
    fetchOrders()
  }

  const handleUserPasswordReset = async (userId: string) => {
    await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: null })
    })
    mutateUsers()
  }

  const handleUserPasswordSet = async (userId: string, password: string) => {
    await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    mutateUsers()
  }

  const handleUserDelete = async (userId: string) => {
    await fetch(`/api/users/${userId}`, { method: 'DELETE' })
    mutateUsers()
  }

const handleAdminLogin = () => {
  if (adminPassword === 'Basem.s.ebeid#@55!') {
  setIsAdmin(true)
  setShowAdminLogin(false)
  setAdminPassword('')
  setAdminError('')
  setActiveTab('admin')
    } else {
      setAdminError('كلمة المرور غلط')
    }
  }

  const cartTotal = Object.entries(cart).reduce((total, [drinkId, qty]) => {
    const drink = drinks.find(d => d.id === drinkId)
    return total + (drink?.price || 0) * qty
  }, 0)

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)

  const totalOrdersPrice = orders.reduce((total, order) => {
    return total + (order.drink?.price || 0) * order.quantity
  }, 0)

  const uniqueUsers = [...new Set(orders.map(o => o.user_id))].length

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-EG', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const effectiveDate = selectedDate ?? new Date()
  const isToday = effectiveDate.toDateString() === new Date().toDateString()

  // Header Component
  const Header = () => (
    <header className="sticky top-0 z-40 border-b border-zinc-700/60 bg-zinc-800/90 backdrop-blur-sm">
      {/* Creative developer attribution bar */}
      <div className="relative overflow-hidden py-[5px]" style={{ background: 'linear-gradient(90deg, #1a0a00, #3d1f00, #6b3a00, #D4A017, #6b3a00, #3d1f00, #1a0a00)' }}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] tracking-widest uppercase text-amber-200/60 font-medium">✦</span>
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: '#ffe8a0', textShadow: '0 0 12px rgba(212,160,23,0.8), 0 0 24px rgba(212,160,23,0.4)' }}>
            Developed by Basem Samir Ebeid
          </span>
          <span className="text-[10px] tracking-widest uppercase text-amber-200/60 font-medium">✦</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('menu'); setIsAdmin(false); setShowAdminLogin(false) }}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              activeTab === 'menu' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Coffee className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setActiveTab('board'); setIsAdmin(false); setShowAdminLogin(false) }}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              activeTab === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => { 
              if (isAdmin) {
                setActiveTab('admin')
              } else {
                setShowAdminLogin(true)
              }
            }}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              activeTab === 'admin' || showAdminLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && (
            <>
              <button
                onClick={handleLogout}
                className="flex h-11 w-11 items-center justify-center rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                title="تسجيل خروج"
              >
                <LogOut className="h-5 w-5" />
              </button>
              <button
                onClick={handleOpenMessages}
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <Bell className="h-5 w-5" />
                {unreadMessages.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadMessages.length}
                  </span>
                )}
              </button>
            </>
          )}
          <span className="text-lg font-bold text-foreground">قعدة</span>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary">
            <Coffee className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </div>
    </header>
  )

  // Login Screen
  if (!currentUser) {
    return (
      <main className="relative min-h-screen bg-black overflow-hidden" dir="ltr">
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
        {/* Version tag */}
        <div className="w-full flex items-center justify-end px-4 py-2">
          <span className="text-xs text-gray-600 font-mono">V1.0</span>
        </div>

        <div className="relative z-10 flex min-h-[calc(100vh-32px)] items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            {/* Logo and Branding */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white shadow-lg">
                <Image
                  src="/images/qa3da-logo.jpg"
                  alt="قعدة"
                  fill
                  className="object-cover scale-[2.2]"
                  sizes="96px"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-4xl font-bold" style={{ color: '#C17A3A', fontFamily: 'Georgia, serif', textShadow: '0 0 24px rgba(193,122,58,0.4)', letterSpacing: '0.05em' }}>
                  قعدة
                </p>
                <div className="h-0.5 w-16 mx-auto rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D4A017, transparent)' }} />
                <p className="text-xs tracking-[0.25em] text-gray-400 uppercase font-medium pt-1">Powered by</p>
                <p className="text-2xl font-bold" style={{ color: '#D4A017', textShadow: '0 0 20px rgba(212,160,23,0.3)' }}>
                  SipFlow
                </p>
              </div>
            </div>

            {/* Welcome Header */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-white">
                <span className="text-5xl">👋</span> Welcome Back
              </h1>
              <p className="text-center text-base font-medium" style={{ color: '#D4A017', textShadow: '0 0 16px rgba(212,160,23,0.5)' }}>
                ✨ كل قعدة حكاية... وكل مشروب لحظة ✨
              </p>
            </div>

            {!isNewUser ? (
              <div className="space-y-5">
                {/* Full Name Input */}
                <div className="space-y-2">
                  <label className="text-base font-semibold text-white block text-right">Full Name</label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="Enter mobile number"
                    className="h-14 border-0 bg-[#1a1a1a] text-white placeholder:text-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="text-base font-semibold text-white block text-right">Password</label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      placeholder="Enter your Password"
                      className="h-14 border-0 bg-[#1a1a1a] text-white placeholder:text-gray-600 pr-12 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base"
                    />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400">
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Forgot password and Remember me */}
                <div className="flex items-center justify-between">
                  <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                    Forgot password
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-400">Remember me</span>
                    <input type="checkbox" className="w-5 h-5 rounded border-0 bg-white/10 text-blue-500 cursor-pointer" />
                  </label>
                </div>

                {loginError && (
                  <p className="text-center text-sm text-red-400">{loginError}</p>
                )}

                {/* Log In Button */}
                <Button
                  className="h-14 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all font-semibold rounded-full text-lg shadow-lg"
                  onClick={handleLogin}
                >
                  Log In
                </Button>

                {/* Sign Up Link */}
                <div className="text-center space-y-4">
                  <p className="text-gray-400">
                    <button
                      onClick={() => setIsNewUser(true)}
                      className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                    >
                      Sign Up
                    </button>
                    {' '}?Don't have an account
                  </p>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-gray-500">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Social Login Buttons */}
                  <div className="space-y-3">
                    <button className="h-14 w-full rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-white font-medium text-base">
                      <span className="text-2xl">🍎</span>
                      <span>Login with Apple</span>
                    </button>
                    <button className="h-14 w-full rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-white font-medium text-base">
                      <span className="font-bold text-xl">G</span>
                      <span>Login with Google</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-white/5 backdrop-blur-sm p-4 text-center">
                  <p className="text-sm text-gray-300">
                    أهلاً <strong className="text-white">{userName}</strong>! أنشئ Password لحسابك
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-300">Password *</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter Password..."
                    className="mt-1 h-12 border-0 bg-white/10 text-white placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-300">Confirm Password *</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password..."
                    className="mt-1 h-12 border-0 bg-white/10 text-white placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                {loginError && (
                  <p className="text-center text-sm text-red-400">{loginError}</p>
                )}
                <Button
                  className="h-12 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all font-semibold rounded-full text-base shadow-lg"
                  onClick={handleCreateUser}
                >
                  Create Account
                </Button>
                <Button
                  className="h-12 w-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors rounded-full text-base backdrop-blur-sm"
                  onClick={() => {
                    setIsNewUser(false)
                    setNewPassword('')
                    setConfirmPassword('')
                    setLoginError('')
                  }}
                >
                  Back
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                  <Coffee className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <h2 className="mb-2 text-center text-xl font-bold text-foreground">دخول الإدارة</h2>
              <p className="mb-6 text-center text-sm text-muted-foreground">أدخل كلمة المرور للوصول للوحة التحكم</p>
              <div className="space-y-4">
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="كلمة المرور..."
                  className="h-12 border-border bg-muted text-center text-foreground placeholder:text-muted-foreground"
                />
                {adminError && (
                  <p className="text-center text-sm text-destructive">{adminError}</p>
                )}
                <Button
                  className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleAdminLogin}
                >
                  دخول
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => { setShowAdminLogin(false); setAdminPassword(''); setAdminError(''); }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  // Main App
  return (
    <main className="relative min-h-screen bg-zinc-900 overflow-hidden">
      {/* Background decorative shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>
      
      <div className="relative z-10">
        <Header />
      </div>

      {/* Messages Modal */}
      {showMessages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                رسائل من الإدارة
              </h2>
              <button
                onClick={() => setShowMessages(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 max-h-[60vh]">
              {messages.length > 0 ? messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className="rounded-xl border border-primary/30 bg-primary/5 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{msg.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{msg.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleDateString('ar-EG', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDismissMessage(msg.id)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                      title="تم القراءة"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد رسائل حتى الآن</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Welcome Message Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl text-center animate-in fade-in zoom-in duration-300">
            <div className="mb-4 flex justify-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-full">
                <Image 
                  src="/images/qa3da-logo.jpg" 
                  alt="قعدة" 
                  fill 
                  className="object-cover scale-150"
                />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">أهلاً وسهلاً</h2>
            <p className="text-xl font-semibold text-foreground mb-1">{welcomeName}</p>
            <p className="text-muted-foreground">نورت القعدة!</p>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-2xl p-4">
        {/* Surprise Me Modal */}
        {showSurpriseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(160deg, #1a0050, #3a0080)' }}>
              {/* Header */}
              <div className="p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #fff 0%, transparent 60%)' }} />
                <p className="text-5xl mb-2">{isSurprising ? '🎲' : '✨'}</p>
                <h2 className="text-xl font-black text-white">
                  {isSurprising ? 'جاري الاختيار...' : 'مشروبك العشوائي!'}
                </h2>
              </div>
              {/* Drink Display */}
              <div className={`mx-4 mb-4 rounded-2xl bg-white/10 p-5 text-center transition-all duration-100 ${isSurprising ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
                {surpriseDrink ? (
                  <>
                    {surpriseDrink.image_url && (
                      <div className="relative w-24 h-24 mx-auto mb-3 rounded-2xl overflow-hidden">
                        <Image src={surpriseDrink.image_url} alt={surpriseDrink.name} fill className="object-cover" />
                      </div>
                    )}
                    {!surpriseDrink.image_url && <p className="text-6xl mb-3">☕</p>}
                    <h3 className="text-2xl font-black text-white mb-1">{surpriseDrink.name}</h3>
                    <p className="text-purple-200 text-lg font-bold">{surpriseDrink.price} ج.م</p>
                  </>
                ) : (
                  <p className="text-white/50 py-6">...</p>
                )}
              </div>
              {/* Actions */}
              {!isSurprising && surpriseDrink && (
                <div className="flex gap-3 p-4 pt-0">
                  <Button
                    className="flex-1 h-12 font-bold text-base rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #9000ff, #6a00cc)', color: '#fff' }}
                    onClick={() => {
                      handleAddToCart(surpriseDrink.id)
                      setShowSurpriseModal(false)
                    }}
                  >
                    أضفه للسلة 🛒
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 px-4 rounded-xl border-white/20 text-white hover:bg-white/10"
                    onClick={handleSurpriseMe}
                  >
                    🔄
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-12 px-4 rounded-xl text-white/60 hover:bg-white/10"
                    onClick={() => setShowSurpriseModal(false)}
                  >
                    لأ
                  </Button>
                </div>
              )}
              {isSurprising && (
                <div className="flex justify-center p-4 pt-0">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-purple-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table Number Modal */}
        {showTableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl text-center" dir="rtl">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-4xl">
                  🪑
                </div>
              </div>
              <h2 className="mb-1 text-xl font-bold text-foreground">رقم الطربيزة</h2>
              <p className="mb-5 text-sm text-muted-foreground">أدخل رقم الطربيزة عشان الستاف يوصلك</p>
              <Input
                value={pendingTableNumber}
                onChange={(e) => { setPendingTableNumber(e.target.value); setTableModalError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmTableAndSubmit()}
                placeholder="مثال: 5"
                className="h-12 text-center text-lg font-bold border-2 border-amber-500/40 bg-background focus:ring-2 focus:ring-amber-500 rounded-xl mb-3"
              />
              {tableModalError && (
                <p className="text-sm text-red-400 mb-3">{tableModalError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-base"
                  onClick={handleConfirmTableAndSubmit}
                >
                  تأكيد وإرسال الطلب
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-4 rounded-xl"
                  onClick={() => setShowTableModal(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                  <Coffee className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <h2 className="mb-2 text-center text-xl font-bold text-foreground">دخول الإدارة</h2>
              <p className="mb-6 text-center text-sm text-muted-foreground">أدخل كلمة المرور للوصول للوحة التحكم</p>
              <div className="space-y-4">
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="كلمة المرور..."
                  className="h-12 border-border bg-muted text-center text-foreground placeholder:text-muted-foreground"
                />
                {adminError && (
                  <p className="text-center text-sm text-destructive">{adminError}</p>
                )}
                <Button 
                  className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleAdminLogin}
                >
                  دخول
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => { setShowAdminLogin(false); setAdminPassword(''); setAdminError(''); }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">منيو المشروبات</h1>
              <p className="text-muted-foreground">اختار اللي يعجبك يا {currentUser.name}</p>
            </div>

            {/* Surprise Me Banner */}
            <button
              onClick={handleSurpriseMe}
              className="w-full relative overflow-hidden rounded-2xl p-4 text-right transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1a0050, #3a0080, #6a00cc, #9000ff)' }}
            >
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 0%, transparent 50%)' }} />
              <div className="relative flex items-center justify-between">
                <span className="text-4xl animate-spin" style={{ animationDuration: '3s' }}>🎲</span>
                <div className="text-right">
                  <p className="text-lg font-black text-white">مش عارف تختار؟</p>
                  <p className="text-sm text-purple-200">اضغط وهنفاجئك بمشروب عشوائي ✨</p>
                </div>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3">
              {drinks.map((drink) => (
<DrinkCard
key={drink.id}
drink={drink}
quantity={cart[drink.id] || 0}
stock={inventoryMap[drink.id] ?? 0}
note={cartNotes[drink.id] || ''}
onAdd={() => handleAddToCart(drink.id)}
onRemove={() => handleRemoveFromCart(drink.id)}
onNoteChange={(note) => setCartNotes(prev => ({ ...prev, [drink.id]: note }))}
/>
              ))}
            </div>

            {cartCount > 0 && (
              <div className="sticky bottom-4 rounded-xl border border-border bg-card p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {cartCount} صنف في السلة
                  </span>
                  {cartTotal > 0 && (
                    <span className="font-bold text-primary">{cartTotal.toFixed(2)} ج.م</span>
                  )}
                </div>
                <Button 
                  className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSubmitOrder}
                >
                  تأكيد الطلب
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Board Tab */}
        {activeTab === 'board' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowReceipt(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Printer className="h-4 w-4" />
                طباعة الفاتورة
              </button>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-foreground">لوحة القعدة</h1>
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span>تحديث مباشر كل 3 ثواني</span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">الأشخاص</p>
                    <p className="text-2xl font-bold text-foreground">{uniqueUsers}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">الإجمالي</p>
                    <p className="text-2xl font-bold text-foreground">
                      {totalOrdersPrice > 0 ? `${totalOrdersPrice.toFixed(0)}` : '-'}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setSelectedDate(new Date(effectiveDate.getTime() - 86400000))}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-foreground" suppressHydrationWarning>{formatDate(effectiveDate)}</span>
                  </div>
                  {isToday && (
                    <span className="rounded-full bg-primary/20 px-3 py-0.5 text-xs text-primary">النهارده</span>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedDate(new Date(effectiveDate.getTime() + 86400000))}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Orders */}
            <OrderBoard
              orders={orders}
              drinks={drinks}
              currentUser={currentUser}
              onDeleteOrder={handleDeleteOrder}
            />
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isAdmin && (
          <AdminPanel
            drinks={drinks}
            users={users}
            orders={orders}
            onDrinkAdded={() => mutateDrinks()}
            onDrinkUpdated={() => mutateDrinks()}
            onDrinkDeleted={() => mutateDrinks()}
            onSessionReset={() => { mutateSession(); fetchOrders(); }}
            onUserPasswordReset={handleUserPasswordReset}
            onUserPasswordSet={handleUserPasswordSet}
            onUserDelete={handleUserDelete}
            isInline={true}
          />
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <ReceiptModal
          orders={orders}
          drinks={drinks}
          currentUser={currentUser}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Floating Admin Message */}
      {floatingMessage && currentUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border-2 border-primary bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-primary px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-primary-foreground" />
                <h3 className="text-lg font-bold text-primary-foreground">رسالة من الإدارة</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {floatingMessage.title && (
                <h4 className="text-xl font-bold text-foreground text-center">{floatingMessage.title}</h4>
              )}
              <p className="text-lg text-muted-foreground text-center leading-relaxed">{floatingMessage.message}</p>
            </div>
            <div className="px-6 pb-6">
              <Button 
                onClick={dismissFloatingMessage}
                className="w-full h-12 text-lg font-bold"
              >
                حسناً، فهمت
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster 
        position="top-center" 
        richColors 
        toastOptions={{
          style: {
            direction: 'rtl'
          }
        }}
      />
    </main>
  )
}
