'use client'

import { OrderWithDetails, User, Drink } from '@/lib/types'
import { Trash2, Coffee, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderBoardProps {
  orders: OrderWithDetails[]
  drinks: Drink[]
  currentUser: User | null
  onDeleteOrder: (orderId: string) => void
}

export function OrderBoard({ orders, drinks, currentUser, onDeleteOrder }: OrderBoardProps) {
  // Group orders by user
  const ordersByUser = orders.reduce((acc, order) => {
    const userId = order.user_id
    if (!acc[userId]) {
      acc[userId] = {
        user: order.user,
        orders: []
      }
    }
    acc[userId].orders.push(order)
    return acc
  }, {} as Record<string, { user: User; orders: OrderWithDetails[] }>)

  const calculateTotal = (userOrders: OrderWithDetails[]) => {
    return userOrders.reduce((total, order) => {
      const drink = drinks.find(d => d.id === order.drink_id)
      return total + (drink?.price || 0) * order.quantity
    }, 0)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ar-EG', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-EG', { 
      day: 'numeric',
      month: 'short'
    })
  }

  const countTotalItems = (userOrders: OrderWithDetails[]) => {
    return userOrders.reduce((count, order) => count + order.quantity, 0)
  }

  if (Object.keys(ordersByUser).length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Coffee className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">القعدة لسه فاضية</h3>
        <p className="text-muted-foreground">أطلب أول مشروب وافتح القعدة!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(ordersByUser).map(([userId, { user, orders: userOrders }]) => {
        const total = calculateTotal(userOrders)
        const totalItems = countTotalItems(userOrders)
        return (
          <div 
            key={userId} 
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            {/* User Header with Summary */}
            <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                  {total > 0 ? `${total.toFixed(0)} ج.م` : '-'}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {totalItems} {totalItems === 1 ? 'صنف' : 'أصناف'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">{user.name}</h3>
            </div>
            
            {/* Orders List with Date/Time */}
            <div className="space-y-2">
              {userOrders.map((order) => {
                const drinkPrice = order.drink?.price || 0
                const orderTotal = drinkPrice * order.quantity
                return (
                  <div 
                    key={order.id} 
                    className="group rounded-xl bg-muted px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      {currentUser?.id === userId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => onDeleteOrder(order.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <div className="flex flex-1 items-center justify-end gap-3">
                        <span className="text-sm text-primary font-medium">
                          {orderTotal > 0 ? `${orderTotal.toFixed(0)} ج.م` : ''}
                        </span>
                        <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
                          x{order.quantity}
                        </span>
                        <span className="font-medium text-foreground">{order.drink.name}</span>
                      </div>
                    </div>
                    {/* Date & Time Row */}
                    <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(order.created_at)}</span>
                      <span>-</span>
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* User Total Summary Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-lg font-bold text-primary">
                {total > 0 ? `${total.toFixed(0)} ج.م` : '-'}
              </span>
              <span className="text-sm text-muted-foreground">
                إجمالي {user.name}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
