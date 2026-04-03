import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined
}

function getPool() {
  if (!global._pgPool) {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set.')
    }
    global._pgPool = new Pool({ connectionString: dbUrl })
  }
  return global._pgPool
}

async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const client = getPool()
  let query = ''
  const params: any[] = []
  strings.forEach((str, i) => {
    query += str
    if (i < values.length) {
      params.push(values[i])
      query += `$${params.length}`
    }
  })
  const result = await client.query(query, params)
  return result.rows
}

export function getSql() {
  return sql
}

export type QueryResult<T> = T[]

export const db = {
  async getDrinks() {
    return await sql`SELECT * FROM drinks ORDER BY sort_order`
  },

  async getDrinkById(id: string) {
    const result = await sql`SELECT * FROM drinks WHERE id = ${id}`
    return result[0] || null
  },

  async createDrink(data: { name: string; price?: number; image_url?: string | null; sort_order?: number; category?: string }) {
    const result = await sql`
      INSERT INTO drinks (name, price, image_url, sort_order, category)
      VALUES (${data.name}, ${data.price || 0}, ${data.image_url || null}, ${data.sort_order || 0}, ${data.category || 'general'})
      RETURNING *
    `
    return result[0]
  },

  async updateDrink(id: string, data: { name?: string; price?: number; image_url?: string | null }) {
    const result = await sql`
      UPDATE drinks 
      SET name = COALESCE(${data.name}, name),
          price = COALESCE(${data.price}, price),
          image_url = COALESCE(${data.image_url}, image_url),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return result[0]
  },

  async deleteDrink(id: string) {
    await sql`DELETE FROM drinks WHERE id = ${id}`
  },

  async getInventory() {
    return await sql`SELECT * FROM inventory ORDER BY created_at`
  },

  async getInventoryByDrinkId(drinkId: string) {
    const result = await sql`SELECT * FROM inventory WHERE drink_id = ${drinkId}`
    return result[0] || null
  },

  async updateInventory(drinkId: string, quantity: number) {
    const result = await sql`
      INSERT INTO inventory (drink_id, quantity, updated_at)
      VALUES (${drinkId}, ${quantity}, NOW())
      ON CONFLICT (drink_id) DO UPDATE 
      SET quantity = ${quantity}, updated_at = NOW()
      RETURNING *
    `
    return result[0]
  },

  async incrementInventory(drinkId: string, amount: number = 1) {
    const result = await sql`
      INSERT INTO inventory (drink_id, quantity, updated_at)
      VALUES (${drinkId}, ${amount}, NOW())
      ON CONFLICT (drink_id) DO UPDATE 
      SET quantity = inventory.quantity + ${amount}, updated_at = NOW()
      RETURNING *
    `
    return result[0]
  },

  async decrementInventory(drinkId: string, amount: number = 1) {
    const result = await sql`
      INSERT INTO inventory (drink_id, quantity, updated_at)
      VALUES (${drinkId}, 0, NOW())
      ON CONFLICT (drink_id) DO UPDATE 
      SET quantity = GREATEST(0, inventory.quantity - ${amount}), updated_at = NOW()
      RETURNING *
    `
    return result[0]
  },

  async getUsers() {
    return await sql`SELECT * FROM users ORDER BY created_at`
  },

  async getUserByName(name: string) {
    const result = await sql`SELECT * FROM users WHERE name = ${name}`
    return result[0] || null
  },

  async getUserById(id: string) {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`
    return result[0] || null
  },

  async createUser(data: { name: string; password?: string; table_number?: string; role?: string }) {
    const result = await sql`
      INSERT INTO users (name, password, table_number, role)
      VALUES (${data.name}, ${data.password || null}, ${data.table_number || null}, ${data.role || 'customer'})
      RETURNING *
    `
    return result[0]
  },

  async updateUser(id: string, data: { password?: string | null; role?: string; assigned_tables?: string[]; table_number?: string }) {
    if (data.password !== undefined) {
      await sql`UPDATE users SET password = ${data.password}, updated_at = NOW() WHERE id = ${id}`
    }
    if (data.role !== undefined) {
      await sql`UPDATE users SET role = ${data.role}, updated_at = NOW() WHERE id = ${id}`
    }
    if (data.assigned_tables !== undefined) {
      await sql`UPDATE users SET assigned_tables = ${data.assigned_tables}, updated_at = NOW() WHERE id = ${id}`
    }
    if (data.table_number !== undefined) {
      await sql`UPDATE users SET table_number = ${data.table_number}, updated_at = NOW() WHERE id = ${id}`
    }
    const result = await sql`SELECT * FROM users WHERE id = ${id}`
    return result[0]
  },

  async deleteUser(id: string) {
    await sql`DELETE FROM users WHERE id = ${id}`
  },

  async getActiveSession(date: string) {
    const result = await sql`SELECT * FROM sessions WHERE date = ${date} AND is_active = true`
    return result[0] || null
  },

  async createSession(date: string) {
    const result = await sql`
      INSERT INTO sessions (date, is_active)
      VALUES (${date}, true)
      RETURNING *
    `
    return result[0]
  },

  async endAllActiveSessions() {
    await sql`UPDATE sessions SET is_active = false, ended_at = NOW() WHERE is_active = true`
  },

  async getOrdersBySession(sessionId: string) {
    return await sql`
      SELECT 
        o.*,
        json_build_object(
          'id', d.id,
          'name', d.name,
          'price', d.price,
          'image_url', d.image_url,
          'category', d.category
        ) as drink,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'table_number', u.table_number,
          'role', u.role
        ) as user
      FROM orders o
      LEFT JOIN drinks d ON o.drink_id = d.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.session_id = ${sessionId}
      ORDER BY o.created_at DESC
    `
  },

  async createOrder(data: { user_id: string; session_id: string; drink_id: string; quantity: number; sugar_level?: string; notes?: string; total_price?: number }) {
    const result = await sql`
      INSERT INTO orders (user_id, session_id, drink_id, quantity, sugar_level, notes, total_price)
      VALUES (${data.user_id}, ${data.session_id}, ${data.drink_id}, ${data.quantity}, ${data.sugar_level || 'normal'}, ${data.notes || null}, ${data.total_price || 0})
      RETURNING *
    `
    return result[0]
  },

  async updateOrderStatus(id: string, status: string) {
    const result = await sql`
      UPDATE orders SET status = ${status}, updated_at = NOW() WHERE id = ${id}
      RETURNING *
    `
    return result[0]
  },

  async deleteAllOrders() {
    await sql`DELETE FROM orders`
  },

  async getMessages(limit = 5) {
    return await sql`SELECT * FROM admin_messages ORDER BY created_at DESC LIMIT ${limit}`
  },

  async createMessage(data: { title?: string; message: string; user_id?: string }) {
    const result = await sql`
      INSERT INTO admin_messages (title, message, user_id, is_from_admin)
      VALUES (${data.title || null}, ${data.message}, ${data.user_id || null}, true)
      RETURNING *
    `
    return result[0]
  },

  async deleteMessage(id: string) {
    await sql`DELETE FROM admin_messages WHERE id = ${id}`
  },

  async deleteAllMessages() {
    await sql`DELETE FROM admin_messages`
  },

  async getStaffUsers() {
    return await sql`SELECT * FROM staff_users ORDER BY created_at DESC`
  },

  async getStaffByUsername(username: string) {
    const result = await sql`SELECT * FROM staff_users WHERE username = ${username}`
    return result[0] || null
  },

  async createStaffUser(data: { username: string; password: string; name: string }) {
    const result = await sql`
      INSERT INTO staff_users (username, password, name, is_active)
      VALUES (${data.username}, ${data.password}, ${data.name}, true)
      RETURNING *
    `
    return result[0]
  },

  async updateStaffUser(id: string, data: { is_active?: boolean }) {
    if (data.is_active !== undefined) {
      await sql`UPDATE staff_users SET is_active = ${data.is_active} WHERE id = ${id}`
    }
    const result = await sql`SELECT * FROM staff_users WHERE id = ${id}`
    return result[0]
  },

  async deleteStaffUser(id: string) {
    await sql`DELETE FROM staff_users WHERE id = ${id}`
  },

  async getSetting(key: string) {
    const result = await sql`SELECT value FROM app_settings WHERE key = ${key}`
    return result[0]?.value || null
  },

  async setSetting(key: string, value: string) {
    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
    `
  }
}
