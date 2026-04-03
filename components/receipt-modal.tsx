'use client'

import { OrderWithDetails, User, Drink } from '@/lib/types'
import { X, Printer, Coffee, Users, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRef, useState } from 'react'

interface ReceiptModalProps {
  orders: OrderWithDetails[]
  drinks: Drink[]
  currentUser: User | null
  onClose: () => void
}

type ReceiptType = 'all' | 'user'

export function ReceiptModal({ orders, drinks, currentUser, onClose }: ReceiptModalProps) {
  const [receiptType, setReceiptType] = useState<ReceiptType>('all')
  const printRef = useRef<HTMLDivElement>(null)

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

  const calculateUserTotal = (userOrders: OrderWithDetails[]) => {
    return userOrders.reduce((total, order) => {
      const drink = drinks.find(d => d.id === order.drink_id)
      return total + (drink?.price || 0) * order.quantity
    }, 0)
  }

  const totalOrdersPrice = orders.reduce((total, order) => {
    return total + (order.drink?.price || 0) * order.quantity
  }, 0)

  // Get current user orders
  const currentUserOrders = currentUser 
    ? orders.filter(o => o.user_id === currentUser.id)
    : []
  
  const currentUserTotal = calculateUserTotal(currentUserOrders)

  const formatDate = () => {
    return new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة القعدة</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: white;
            color: #1a1a1a;
            direction: rtl;
          }
          .receipt {
            max-width: 300px;
            margin: 0 auto;
            background: white;
          }
          .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 2px dashed #ccc;
            margin-bottom: 15px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #f59e0b;
            margin-bottom: 5px;
          }
          .date {
            font-size: 12px;
            color: #666;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            background: #f5f5f5;
            padding: 8px;
            margin: 10px 0;
            border-radius: 4px;
          }
          .user-section {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #ddd;
          }
          .user-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 8px;
            color: #333;
          }
          .order-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 13px;
          }
          .order-name {
            flex: 1;
          }
          .order-qty {
            color: #666;
            margin: 0 10px;
          }
          .order-price {
            font-weight: 500;
          }
          .user-total {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #eee;
            color: #f59e0b;
          }
          .grand-total {
            text-align: center;
            padding: 15px;
            margin-top: 15px;
            background: #f59e0b;
            color: white;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px dashed #ccc;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body {
              padding: 0;
            }
            .receipt {
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            طباعة الفاتورة
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setReceiptType('all')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              receiptType === 'all'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Users className="h-4 w-4" />
            فاتورة القعدة كلها
          </button>
          <button
            onClick={() => setReceiptType('user')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              receiptType === 'user'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Coffee className="h-4 w-4" />
            فاتورتي فقط
          </button>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div ref={printRef} className="receipt bg-white text-zinc-900 rounded-xl p-4">
            {/* Receipt Header */}
            <div className="header text-center pb-4 border-b-2 border-dashed border-zinc-300 mb-4">
              <div className="logo text-3xl font-bold text-primary mb-1">قعدة</div>
              <div className="date text-xs text-zinc-500">{formatDate()}</div>
            </div>

            {receiptType === 'all' ? (
              // All Session Orders
              <>
                <div className="section-title text-sm font-bold bg-zinc-100 p-2 rounded mb-3 text-zinc-700">
                  جميع طلبات القعدة
                </div>
                
                {Object.entries(ordersByUser).map(([userId, { user, orders: userOrders }]) => {
                  const userTotal = calculateUserTotal(userOrders)
                  return (
                    <div key={userId} className="user-section mb-4 pb-3 border-b border-dashed border-zinc-200">
                      <div className="user-name font-bold text-sm mb-2 text-zinc-800">{user.name}</div>
                      {userOrders.map((order) => {
                        const orderTotal = (order.drink?.price || 0) * order.quantity
                        return (
                          <div key={order.id} className="order-item flex justify-between text-sm py-1">
                            <span className="order-name text-zinc-700">{order.drink.name}</span>
                            <span className="order-qty text-zinc-500 mx-2">x{order.quantity}</span>
                            <span className="order-price font-medium text-zinc-800">
                              {orderTotal > 0 ? `${orderTotal.toFixed(0)} ج.م` : '-'}
                            </span>
                          </div>
                        )
                      })}
                      <div className="user-total flex justify-between font-bold mt-2 pt-2 border-t border-zinc-200 text-primary">
                        <span>إجمالي {user.name}</span>
                        <span>{userTotal > 0 ? `${userTotal.toFixed(0)} ج.م` : '-'}</span>
                      </div>
                    </div>
                  )
                })}

                <div className="grand-total text-center p-4 mt-4 bg-primary text-white rounded-lg text-lg font-bold">
                  إجمالي القعدة: {totalOrdersPrice > 0 ? `${totalOrdersPrice.toFixed(0)} ج.م` : '-'}
                </div>
              </>
            ) : (
              // Current User Orders Only
              <>
                <div className="section-title text-sm font-bold bg-zinc-100 p-2 rounded mb-3 text-zinc-700">
                  طلبات {currentUser?.name}
                </div>
                
                {currentUserOrders.length > 0 ? (
                  <div className="user-section">
                    {currentUserOrders.map((order) => {
                      const orderTotal = (order.drink?.price || 0) * order.quantity
                      return (
                        <div key={order.id} className="order-item flex justify-between text-sm py-2 border-b border-zinc-100">
                          <span className="order-name text-zinc-700">{order.drink.name}</span>
                          <span className="order-qty text-zinc-500 mx-2">x{order.quantity}</span>
                          <span className="order-price font-medium text-zinc-800">
                            {orderTotal > 0 ? `${orderTotal.toFixed(0)} ج.م` : '-'}
                          </span>
                        </div>
                      )
                    })}
                    
                    <div className="grand-total text-center p-4 mt-4 bg-primary text-white rounded-lg text-lg font-bold">
                      إجمالي طلباتك: {currentUserTotal > 0 ? `${currentUserTotal.toFixed(0)} ج.م` : '-'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <Coffee className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد طلبات لك حتى الآن</p>
                  </div>
                )}
              </>
            )}

            {/* Receipt Footer */}
            <div className="footer text-center mt-6 pt-4 border-t-2 border-dashed border-zinc-300 text-xs text-zinc-500">
              <p>شكراً لزيارتكم</p>
              <p className="mt-1">قعدة - نورتونا</p>
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="border-t border-border p-4">
          <Button 
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handlePrint}
          >
            <Printer className="ml-2 h-5 w-5" />
            طباعة الفاتورة
          </Button>
        </div>
      </div>
    </div>
  )
}
