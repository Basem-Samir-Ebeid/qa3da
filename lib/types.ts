export interface Drink {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image_url: string | null
  available: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Inventory {
  id: string
  drink_id: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  name: string
  phone: string | null
  table_number: string | null
  device_id: string | null
  password: string | null
  role: 'customer' | 'order_receiver' | 'admin'
  assigned_tables: string[] | null
  created_at: string
  updated_at: string
}

export interface AppSettings {
  id: string
  key: string
  value: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string | null
  date: string
  is_active: boolean
  created_at: string
  ended_at: string | null
}

export interface Order {
  id: string
  user_id: string
  session_id: string | null
  drink_id: string
  quantity: number
  sugar_level: string
  notes: string | null
  status: string
  total_price: number
  created_at: string
  updated_at: string
}

export interface OrderWithDetails extends Order {
  drink: Drink
  user: User
}

export interface AdminMessage {
  id: string
  user_id: string | null
  title: string | null
  message: string
  is_from_admin: boolean
  is_read: boolean
  created_at: string
}
