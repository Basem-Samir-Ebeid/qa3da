'use client'

import { useState, useRef } from 'react'
import { Drink, User, OrderWithDetails } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Pencil, Upload, RefreshCw, Users, Coffee, Key, BarChart3, TrendingUp, Award, Clock, Send, MessageSquare, Settings2, Hash, UserPlus, UserCog, Minus, Package, Banknote, CheckCircle2, Hourglass, TableProperties, Copy, ExternalLink, Link2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import Image from 'next/image'

// Component for assigning tables to order receivers
function AssignOrderReceiverForm({ user, onAssign }: { user: User, onAssign: (tables: string[]) => void }) {
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [customTable, setCustomTable] = useState('')
  const tableOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

  const toggleTable = (table: string) => {
    setSelectedTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    )
  }

  const addCustomTable = () => {
    if (customTable.trim() && !selectedTables.includes(customTable.trim())) {
      setSelectedTables(prev => [...prev, customTable.trim()])
      setCustomTable('')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-muted-foreground">اختر الطربيزات</Label>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {tableOptions.map((table) => (
            <div
              key={table}
              onClick={() => toggleTable(table)}
              className={`flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border-2 text-sm font-medium transition-colors ${
                selectedTables.includes(table)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
              }`}
            >
              {table}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex gap-2">
        <Input
          value={customTable}
          onChange={(e) => setCustomTable(e.target.value)}
          placeholder="طربيزة أخرى..."
          className="border-border bg-muted text-foreground"
        />
        <Button variant="outline" onClick={addCustomTable} disabled={!customTable.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedTables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTables.map((table) => (
            <span 
              key={table} 
              className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-sm text-primary"
            >
              طربيزة {table}
              <button 
                onClick={() => toggleTable(table)}
                className="ml-1 text-primary/60 hover:text-primary"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <Button 
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
        onClick={() => onAssign(selectedTables)}
        disabled={selectedTables.length === 0}
      >
        <UserPlus className="ml-2 h-4 w-4" />
        تعيين كمنفذ طلبات
      </Button>
    </div>
  )
}

interface AdminPanelProps {
  drinks: Drink[]
  users: User[]
  orders: OrderWithDetails[]
  onDrinkAdded: () => void
  onDrinkUpdated: () => void
  onDrinkDeleted: () => void
  onSessionReset: () => void
  onUserPasswordReset: (userId: string) => void
  onUserPasswordSet: (userId: string, password: string) => void
  onUserDelete: (userId: string) => void
  isInline?: boolean
}

export function AdminPanel({ 
  drinks, 
  users,
  orders,
  onDrinkAdded, 
  onDrinkUpdated, 
  onDrinkDeleted, 
  onSessionReset,
  onUserPasswordReset,
  onUserPasswordSet,
  onUserDelete,
  isInline = false
}: AdminPanelProps) {
  // Add drink state
  const [newDrinkName, setNewDrinkName] = useState('')
  const [newDrinkPrice, setNewDrinkPrice] = useState('')
  const [newDrinkImage, setNewDrinkImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // User password state
  const [settingPasswordForUser, setSettingPasswordForUser] = useState<User | null>(null)
  const [newUserPassword, setNewUserPassword] = useState('')
  const [confirmUserPassword, setConfirmUserPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Admin tabs controlled state
  const [activeAdminTab, setActiveAdminTab] = useState('stats')
  const [staffUrlCopied, setStaffUrlCopied] = useState(false)

  const handleCopyStaffUrl = () => {
    const url = `${window.location.origin}/staff`
    navigator.clipboard.writeText(url).then(() => {
      setStaffUrlCopied(true)
      setTimeout(() => setStaffUrlCopied(false), 2500)
    })
  }

  // Edit drink state
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editImage, setEditImage] = useState<string | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Inventory state
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({})

  // Fetch inventory for all drinks
  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory')
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, number> = {}
        data.forEach((item: { drink_id: string; quantity: number }) => {
          map[item.drink_id] = item.quantity
        })
        setInventoryMap(map)
      }
    } catch (err) {
      console.error('Error fetching inventory:', err)
    }
  }

  // Update inventory for a drink
  const updateInventory = async (drinkId: string, quantity: number) => {
    try {
      await fetch(`/api/inventory/${drinkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      })
      setInventoryMap(prev => ({ ...prev, [drinkId]: quantity }))
    } catch (err) {
      console.error('Error updating inventory:', err)
    }
  }

  // Message state
  const [messageTitle, setMessageTitle] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [isDeletingMessages, setIsDeletingMessages] = useState(false)
  const [messagesDeleted, setMessagesDeleted] = useState(false)

  // Settings state
  const [maxOrderReceivers, setMaxOrderReceivers] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Staff users state
  interface StaffUser {
    id: string
    username: string
    password: string
    name: string
    is_active: boolean
    created_at: string
  }
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [newStaffUsername, setNewStaffUsername] = useState('')
  const [newStaffPassword, setNewStaffPassword] = useState('')
  const [newStaffName, setNewStaffName] = useState('')
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [staffAdded, setStaffAdded] = useState(false)

  // Fetch staff users
  const fetchStaffUsers = async () => {
    const res = await fetch('/api/staff')
    const data = await res.json()
    setStaffUsers(data || [])
  }

  const handleAddStaffUser = async () => {
    if (!newStaffUsername.trim() || !newStaffPassword.trim() || !newStaffName.trim()) return
    
    setIsAddingStaff(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newStaffUsername.trim(),
          password: newStaffPassword.trim(),
          name: newStaffName.trim()
        })
      })
      
      if (res.ok) {
        setNewStaffUsername('')
        setNewStaffPassword('')
        setNewStaffName('')
        setStaffAdded(true)
        setTimeout(() => setStaffAdded(false), 3000)
        fetchStaffUsers()
        setActiveAdminTab('stats')
      }
    } catch (err) {
      console.error('Error adding staff user:', err)
    } finally {
      setIsAddingStaff(false)
    }
  }

  const handleDeleteStaffUser = async (staffId: string) => {
    await fetch(`/api/staff/${staffId}`, { method: 'DELETE' })
    fetchStaffUsers()
  }

  const handleToggleStaffActive = async (staffId: string, isActive: boolean) => {
    await fetch(`/api/staff/${staffId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive })
    })
    fetchStaffUsers()
  }

  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) throw new Error('Upload failed')
      
      const { url } = await response.json()
      if (isEdit) {
        setEditImage(url)
      } else {
        setNewDrinkImage(url)
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddDrink = async () => {
    if (!newDrinkName.trim()) return
    
    const res = await fetch('/api/drinks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newDrinkName.trim(),
        price: parseFloat(newDrinkPrice) || 0,
        image_url: newDrinkImage,
        sort_order: drinks.length + 1
      })
    })
    
    if (res.ok) {
      setNewDrinkName('')
      setNewDrinkPrice('')
      setNewDrinkImage(null)
      onDrinkAdded()
      setActiveAdminTab('stats')
    }
  }

  const handleEditDrink = async () => {
    if (!editingDrink || !editName.trim()) return
    
    const res = await fetch(`/api/drinks/${editingDrink.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName.trim(),
        price: parseFloat(editPrice) || 0,
        image_url: editImage
      })
    })
    
    if (res.ok) {
      setEditingDrink(null)
      setEditDialogOpen(false)
      onDrinkUpdated()
    }
  }

  const handleDeleteDrink = async (drinkId: string) => {
    const res = await fetch(`/api/drinks/${drinkId}`, { method: 'DELETE' })
    if (res.ok) {
      onDrinkDeleted()
    }
  }

  const handleResetSession = async () => {
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    })
    onSessionReset()
  }

  const startEdit = (drink: Drink) => {
    setEditingDrink(drink)
    setEditName(drink.name)
    setEditPrice(drink.price?.toString() || '0')
    setEditStock((inventoryMap[drink.id] ?? 0).toString())
    setEditImage(drink.image_url)
    setEditDialogOpen(true)
  }

  const handleSetPassword = () => {
    setPasswordError('')
    if (!newUserPassword.trim()) {
      setPasswordError('أدخل الباسورد')
      return
    }
    if (newUserPassword !== confirmUserPassword) {
      setPasswordError('الباسورد مش متطابق')
      return
    }
    if (settingPasswordForUser) {
      onUserPasswordSet(settingPasswordForUser.id, newUserPassword)
      setSettingPasswordForUser(null)
      setNewUserPassword('')
      setConfirmUserPassword('')
      setActiveAdminTab('stats')
    }
  }

  const openSetPassword = (user: User) => {
    setSettingPasswordForUser(user)
    setNewUserPassword('')
    setConfirmUserPassword('')
    setPasswordError('')
  }

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) return
    
    setIsSendingMessage(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: messageTitle.trim(),
          message: messageContent.trim()
        })
      })
      
      if (res.ok) {
        setMessageTitle('')
        setMessageContent('')
        setMessageSent(true)
        setTimeout(() => setMessageSent(false), 3000)
        setActiveAdminTab('stats')
      }
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleDeleteMessages = async () => {
    setIsDeletingMessages(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_all' })
      })
      setMessagesDeleted(true)
      setTimeout(() => setMessagesDeleted(false), 3000)
    } catch (err) {
      console.error('Error deleting messages:', err)
    } finally {
      setIsDeletingMessages(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!maxOrderReceivers.trim()) return
    
    setIsSavingSettings(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: 'max_order_receivers', 
          value: maxOrderReceivers.trim()
        })
      })
      
      if (res.ok) {
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 3000)
        setActiveAdminTab('stats')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
    } finally {
      setIsSavingSettings(false)
    }
  }

  if (!isInline) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">لوحة الإدارة</h1>
        <p className="text-muted-foreground">إدارة الأصناف والمستخدمين</p>
      </div>

      <Tabs value={activeAdminTab} onValueChange={(v) => {
        setActiveAdminTab(v)
        if (v === 'staff') fetchStaffUsers()
        if (v === 'inventory') fetchInventory()
      }} className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-8 bg-muted">
          <TabsTrigger value="stats" className="gap-2 data-[state=active]:bg-card">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">الإحصائيات</span>
          </TabsTrigger>
          <TabsTrigger value="drinks" className="gap-2 data-[state=active]:bg-card">
            <Coffee className="h-4 w-4" />
            <span className="hidden sm:inline">الأصناف</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-card">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">المخزون</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-card">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">المستخدمين</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 data-[state=active]:bg-card">
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-card">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">الرسائل</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-card">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">الإعدادات</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2 data-[state=active]:bg-card">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">الخطرة</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">

          {/* === Revenue Card === */}
          {(() => {
            const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(String(o.total_price || 0)), 0)
            return (
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #3d1f00, #6b3a00, #a05c00)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #D4A017 0%, transparent 60%)' }} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-xs tracking-widest uppercase text-amber-200/70 font-medium mb-1">إجمالي الإيرادات اليوم</p>
                    <p className="text-4xl font-black text-white">{totalRevenue.toFixed(0)} <span className="text-xl text-amber-300">ج.م</span></p>
                    <p className="text-xs text-amber-200/60 mt-1">{orders.length} طلب · {new Set(orders.map(o => o.user_id)).size} عميل</p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    <Banknote className="h-8 w-8 text-amber-300" />
                  </div>
                </div>
              </div>
            )
          })()}

          {/* === Order Status Split === */}
          {(() => {
            const pending   = orders.filter(o => o.status === 'pending').length
            const completed = orders.filter(o => o.status === 'completed').length
            const total     = orders.length || 1
            const pct       = Math.round((completed / total) * 100)
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center gap-1">
                  <Hourglass className="h-5 w-5 text-amber-500" />
                  <p className="text-2xl font-bold text-foreground">{pending}</p>
                  <p className="text-xs text-muted-foreground text-center">طلبات معلقة</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center gap-1">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-2xl font-bold text-foreground">{completed}</p>
                  <p className="text-xs text-muted-foreground text-center">طلبات منجزة</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col items-center gap-1">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  <p className="text-2xl font-bold text-emerald-400">{pct}%</p>
                  <p className="text-xs text-muted-foreground text-center">نسبة الإنجاز</p>
                </div>
              </div>
            )
          })()}

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Coffee className="h-4 w-4" />
                <span className="text-sm">إجمالي الطلبات</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {orders.reduce((acc, o) => acc + o.quantity, 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">المستخدمين النشطين</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {new Set(orders.map(o => o.user_id)).size}
              </p>
            </div>
          </div>

          {/* Top Drinks */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">أكثر المشروبات طلباً</h3>
            </div>
            <div className="space-y-3">
              {(() => {
                const drinkStats = orders.reduce((acc, order) => {
                  const drinkId = order.drink_id
                  if (!acc[drinkId]) {
                    acc[drinkId] = { drink: order.drink, total: 0 }
                  }
                  acc[drinkId].total += order.quantity
                  return acc
                }, {} as Record<string, { drink: typeof orders[0]['drink'], total: number }>)
                
                const sorted = Object.values(drinkStats).sort((a, b) => b.total - a.total).slice(0, 5)
                const maxTotal = sorted[0]?.total || 1
                
                return sorted.length > 0 ? sorted.map((item, index) => (
                  <div key={item.drink?.id || index} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{item.drink?.name || 'غير معروف'}</span>
                        <span className="text-sm text-muted-foreground">{item.total} طلب</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div 
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(item.total / maxTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground">لا توجد طلبات بعد</p>
                )
              })()}
            </div>
          </div>

          {/* Top Users */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">أكثر المستخدمين طلباً</h3>
            </div>
            <div className="space-y-3">
              {(() => {
                const userStats = orders.reduce((acc, order) => {
                  const userId = order.user_id
                  if (!acc[userId]) {
                    acc[userId] = { user: order.user, total: 0 }
                  }
                  acc[userId].total += order.quantity
                  return acc
                }, {} as Record<string, { user: typeof orders[0]['user'], total: number }>)
                
                const sorted = Object.values(userStats).sort((a, b) => b.total - a.total).slice(0, 5)
                
                return sorted.length > 0 ? sorted.map((item, index) => (
                  <div key={item.user?.id || index} className="flex items-center justify-between rounded-xl bg-muted p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        index === 0 ? 'bg-amber-500 text-white' : 
                        index === 1 ? 'bg-gray-400 text-white' : 
                        index === 2 ? 'bg-amber-700 text-white' : 
                        'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-foreground">{item.user?.name || 'غير معروف'}</span>
                    </div>
                    <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                      {item.total} طلب
                    </span>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground">لا توجد طلبات بعد</p>
                )
              })()}
            </div>
          </div>

          {/* === Busiest Tables === */}
          {(() => {
            const tableStats = orders.reduce((acc, order) => {
              const table = order.user?.table_number
              if (!table) return acc
              acc[table] = (acc[table] || 0) + order.quantity
              return acc
            }, {} as Record<string, number>)
            const sorted = Object.entries(tableStats).sort((a, b) => b[1] - a[1]).slice(0, 5)
            const maxVal = sorted[0]?.[1] || 1
            return sorted.length > 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-2">
                  <TableProperties className="h-5 w-5 text-violet-400" />
                  <h3 className="font-semibold text-foreground">أنشط الطربيزات</h3>
                </div>
                <div className="space-y-3">
                  {sorted.map(([table, count], i) => (
                    <div key={table} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {table}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground font-medium">طربيزة {table}</span>
                          <span className="text-muted-foreground">{count} مشروب</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(count / maxVal) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {/* Recent Activity */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-foreground">آخر الطلبات</h3>
            </div>
            <div className="space-y-2">
              {orders.slice(-5).reverse().map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{order.user?.name}</span>
                    <span className="text-muted-foreground">طلب</span>
                    <span className="text-primary">{order.quantity}x {order.drink?.name}</span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-center text-muted-foreground">لا توجد طلبات بعد</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="drinks" className="space-y-6">
          {/* Add new drink */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-4 font-semibold text-foreground">إضافة صنف جديد</h3>
            <div className="space-y-4">
              <div 
                className="relative mx-auto h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                {newDrinkImage ? (
                  <Image src={newDrinkImage} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <Upload className="h-6 w-6" />
                    <span className="mt-1 text-xs">رفع صورة</span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">اسم الصنف</Label>
                  <Input
                    value={newDrinkName}
                    onChange={(e) => setNewDrinkName(e.target.value)}
                    placeholder="مثال: كابتشينو"
                    className="mt-1 border-border bg-muted text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">السعر (اختياري)</Label>
                  <Input
                    type="number"
                    value={newDrinkPrice}
                    onChange={(e) => setNewDrinkPrice(e.target.value)}
                    placeholder="0"
                    className="mt-1 border-border bg-muted text-foreground"
                  />
                </div>
              </div>
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                onClick={handleAddDrink} 
                disabled={!newDrinkName.trim()}
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة الصنف
              </Button>
            </div>
          </div>

          {/* Drinks list */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-4 font-semibold text-foreground">الأصناف الحالية ({drinks.length})</h3>
            <div className="space-y-2">
              {drinks.map((drink) => (
                <div 
                  key={drink.id} 
                  className="flex items-center justify-between rounded-xl bg-muted p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-card">
                      {drink.image_url ? (
                        <Image src={drink.image_url} alt={drink.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg text-muted-foreground">
                          <Coffee className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{drink.name}</p>
                      {drink.price > 0 && (
                        <p className="text-xs text-primary">{drink.price} ج.م</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(drink)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">حذف الصنف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف &quot;{drink.name}&quot;؟ هذا الإجراء لا يمكن التراجع عنه.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">إلغاء</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteDrink(drink.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Edit Drink Dialog - Controlled */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-foreground">تعديل الصنف</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div 
                className="relative mx-auto h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary"
                onClick={() => editFileInputRef.current?.click()}
              >
                {editImage ? (
                  <Image src={editImage} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <Upload className="h-6 w-6" />
                    <span className="mt-1 text-xs">رفع صورة</span>
                  </div>
                )}
              </div>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
              />
              <div>
                <Label className="text-muted-foreground">اسم الصنف</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 border-border bg-muted text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">السعر</Label>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="mt-1 border-border bg-muted text-foreground"
                />
              </div>
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                onClick={handleEditDrink}
              >
                حفظ التعديلات
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">إدارة المخزون ({drinks.length} صنف)</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border"
                onClick={fetchInventory}
              >
                <RefreshCw className="ml-2 h-4 w-4" />
                تحديث
              </Button>
            </div>
            <div className="space-y-3">
              {drinks.map((drink) => (
                <div 
                  key={drink.id} 
                  className="flex items-center justify-between rounded-xl bg-muted p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-card">
                      {drink.image_url ? (
                        <Image src={drink.image_url} alt={drink.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg text-muted-foreground">
                          <Coffee className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{drink.name}</p>
                      {drink.price > 0 && (
                        <p className="text-xs text-primary">{drink.price} ج.م</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 border-border"
                      onClick={() => updateInventory(drink.id, Math.max(0, (inventoryMap[drink.id] ?? 0) - 1))}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <Input
                      type="number"
                      value={inventoryMap[drink.id] ?? 0}
                      onChange={(e) => updateInventory(drink.id, parseInt(e.target.value) || 0)}
                      className="h-10 w-20 border-border bg-card text-center text-lg font-bold text-foreground"
                      min="0"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 border-border"
                      onClick={() => updateInventory(drink.id, (inventoryMap[drink.id] ?? 0) + 1)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-4 font-semibold text-foreground">المستخدمين ({users.length})</h3>
            <div className="space-y-2">
              {users.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between rounded-xl bg-muted p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.password ? 'له باسورد' : 'بدون باسورد'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* Set new password button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-border" onClick={() => openSetPassword(user)}>
                          <Key className="ml-2 h-3 w-3" />
                          باسورد
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-border bg-card">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">تعيين باسورد جديد لـ {user.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-muted-foreground">الباسورد الجديد</Label>
                            <Input
                              type="password"
                              value={newUserPassword}
                              onChange={(e) => setNewUserPassword(e.target.value)}
                              placeholder="أدخل الباسورد الجديد..."
                              className="mt-1 border-border bg-muted text-foreground"
                            />
                          </div>
                          <div>
                            <Label className="text-muted-foreground">تأكيد الباسورد</Label>
                            <Input
                              type="password"
                              value={confirmUserPassword}
                              onChange={(e) => setConfirmUserPassword(e.target.value)}
                              placeholder="أعد كتابة الباسورد..."
                              className="mt-1 border-border bg-muted text-foreground"
                            />
                          </div>
                          {passwordError && (
                            <p className="text-center text-sm text-destructive">{passwordError}</p>
                          )}
                          <Button 
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                            onClick={handleSetPassword}
                          >
                            حفظ الباسورد
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Reset password button (if has password) */}
                    {user.password && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-border">
                            <RefreshCw className="ml-2 h-3 w-3" />
                            ريسيت
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-border bg-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">ريسيت الباسورد</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من إزالة باسورد &quot;{user.name}&quot;؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onUserPasswordReset(user.id)}
                              className="bg-primary text-primary-foreground"
                            >
                              ريسيت
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Delete user button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">حذف المستخدم</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف &quot;{user.name}&quot;؟ هذا الإجراء لا يمكن التراجع عنه.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">إلغاء</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onUserDelete(user.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-muted-foreground">لا يوجد مستخدمين حتى الآن</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">إرسال رسالة للمستخدمين</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">عنوان الرسالة</Label>
                <Input
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="مثال: إعلان مهم..."
                  className="mt-1 border-border bg-muted text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">نص الرسالة</Label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={4}
                  className="mt-1 w-full resize-none rounded-md border border-border bg-muted p-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {messageSent && (
                <div className="rounded-lg bg-green-500/20 p-3 text-center text-green-600">
                  تم إرسال الرسالة بنجاح!
                </div>
              )}
              {messagesDeleted && (
                <div className="rounded-lg bg-red-500/20 p-3 text-center text-red-600">
                  تم حذف جميع ��لرسائل!
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" 
                  onClick={handleSendMessage}
                  disabled={!messageTitle.trim() || !messageContent.trim() || isSendingMessage}
                >
                  {isSendingMessage ? (
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="ml-2 h-4 w-4" />
                  )}
                  {isSendingMessage ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  onClick={handleDeleteMessages}
                  disabled={isDeletingMessages}
                  title="حذف جميع الرسائل"
                >
                  {isDeletingMessages ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">

          {/* Staff Page Link Card */}
          <div className="rounded-2xl overflow-hidden border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/5">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-5 w-5 text-violet-400" />
                <h3 className="font-semibold text-foreground">رابط صفحة الستاف</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">ابعت الرابط ده للموظفين عشان يدخلوا على صفحتهم مباشرةً</p>
              <div className="flex items-center gap-2 rounded-xl bg-muted/80 border border-border px-4 py-3 mb-3">
                <span className="flex-1 text-sm font-mono text-violet-300 truncate" dir="ltr">
                  {typeof window !== 'undefined' ? `${window.location.origin}/staff` : '.../staff'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  onClick={handleCopyStaffUrl}
                >
                  {staffUrlCopied ? (
                    <><CheckCircle2 className="h-4 w-4 text-green-500" /> تم النسخ!</>
                  ) : (
                    <><Copy className="h-4 w-4" /> نسخ الرابط</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 px-4"
                  onClick={() => window.open('/staff', '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  فتح
                </Button>
              </div>
            </div>
          </div>

          {/* Add Staff User */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">إضافة موظف جديد</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              أضف مستخدم للوصول لصفحة Staff لطلب المشروبات
            </p>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">اسم الموظف</Label>
                <Input
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="mt-1 border-border bg-muted text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">اسم المستخدم</Label>
                <Input
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  placeholder="مثال: ahmed"
                  className="mt-1 border-border bg-muted text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">كلمة المرور</Label>
                <Input
                  type="password"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="كلمة المرور"
                  className="mt-1 border-border bg-muted text-foreground"
                />
              </div>
              {staffAdded && (
                <div className="rounded-lg bg-green-500/20 p-3 text-center text-green-600">
                  تم إضافة الموظف بنجاح!
                </div>
              )}
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                onClick={handleAddStaffUser}
                disabled={isAddingStaff || !newStaffUsername.trim() || !newStaffPassword.trim() || !newStaffName.trim()}
              >
                {isAddingStaff ? (
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="ml-2 h-4 w-4" />
                )}
                {isAddingStaff ? 'جاري الإضافة...' : 'إضافة موظف'}
              </Button>
            </div>
          </div>

          {/* Staff Users List */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={fetchStaffUsers}>
                <RefreshCw className="ml-2 h-4 w-4" />
                تحديث
              </Button>
              <h3 className="font-semibold text-foreground">الموظفين الحاليين</h3>
            </div>
            <div className="space-y-3">
              {staffUsers.length > 0 ? (
                staffUsers.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/20">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-border bg-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">حذف الموظف</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف {staff.name}؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteStaffUser(staff.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStaffActive(staff.id, staff.is_active)}
                        className={staff.is_active ? 'text-green-600' : 'text-muted-foreground'}
                      >
                        {staff.is_active ? 'نشط' : 'معطل'}
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{staff.name}</p>
                      <p className="text-sm text-muted-foreground">@{staff.username}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">لا يوجد موظفين بعد</p>
              )}
            </div>
          </div>

          {/* Staff Page Link */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <a 
                href="/staff" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary underline hover:no-underline"
              >
                فتح صفحة Staff
              </a>
              <div className="text-right">
                <p className="font-medium text-foreground">رابط صفحة Staff</p>
                <p className="text-sm text-muted-foreground">/staff</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Order Receivers Management */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">منفذي الطلبات</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              اختر المستخدمين الذين سيتلقون الطلبات وحدد الطربيزات المسؤولين عنها
            </p>
            <div className="space-y-3">
              {users.filter(u => u.role === 'order_receiver').length > 0 ? (
                users.filter(u => u.role === 'order_receiver').map((user) => (
                  <div key={user.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-primary">
                        الطربيزات: {user.assigned_tables?.join(', ') || 'غير محدد'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={async () => {
                        await fetch(`/api/users/${user.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ role: 'customer', assigned_tables: null })
                        })
                        onDrinkUpdated()
                      }}
                    >
                      إزالة
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">لا يوجد منفذين للطلبات حالياً</p>
              )}
            </div>
            
            {/* Add Order Receiver */}
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="mb-3 font-medium text-foreground">إضافة منفذ جديد</h4>
              <div className="space-y-3">
                {users.filter(u => u.role !== 'order_receiver' && u.role !== 'admin').map((user) => (
                  <div key={user.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.table_number ? `طربيزة ${user.table_number}` : 'بدون طربيزة'}
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                          <Plus className="ml-1 h-3 w-3" />
                          تعيين
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-border bg-card">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">تعيين {user.name} كمنفذ طلبات</DialogTitle>
                        </DialogHeader>
                        <AssignOrderReceiverForm 
                          user={user} 
                          onAssign={async (tables) => {
                            await fetch(`/api/users/${user.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                role: 'order_receiver', 
                                assigned_tables: tables 
                              })
                            })
                            onDrinkUpdated()
                          }} 
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
                {users.filter(u => u.role !== 'order_receiver' && u.role !== 'admin').length === 0 && (
                  <p className="text-center text-muted-foreground">لا يوجد مستخدمين متاحين</p>
                )}
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">إعدادات عامة</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">الحد الأقصى لمنفذي الطلبات</Label>
                <Input
                  type="number"
                  value={maxOrderReceivers}
                  onChange={(e) => setMaxOrderReceivers(e.target.value)}
                  placeholder="مثال: 5"
                  className="mt-1 border-border bg-muted text-foreground"
                />
              </div>
              {settingsSaved && (
                <div className="rounded-lg bg-green-500/20 p-3 text-center text-green-600">
                  تم حفظ الإعدادات بنجاح!
                </div>
              )}
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Settings2 className="ml-2 h-4 w-4" />
                )}
                {isSavingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="danger" className="space-y-4">
          <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4">
            <h3 className="mb-4 font-semibold text-destructive">تصفير القعدة</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              هذا الإجراء سيمسح كل الطلبات الحالية ويبدأ قعدة جديدة.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="ml-2 h-4 w-4" />
                  تصفير القعدة
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-border bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">تصفير القعدة</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد؟ سيتم مسح كل الطلبات الحالية.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border">إلغاء</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleResetSession}
                    className="bg-destructive text-destructive-foreground"
                  >
                    تصفير
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
