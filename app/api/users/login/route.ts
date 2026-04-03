import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { name, password } = await request.json()
    
    try {
      const user = await db.getUserByName(name)
      
      if (!user) {
        return NextResponse.json({ exists: false, user: null })
      }
      
      // If user has password, validate it
      if (user.password) {
        if (!password) {
          return NextResponse.json({ exists: true, requiresPassword: true, user: null })
        }
        if (user.password !== password) {
          return NextResponse.json({ exists: true, error: 'Invalid password' }, { status: 401 })
        }
      }
      
      return NextResponse.json({ exists: true, user })
    } catch (dbError: any) {
      if (dbError.message.includes('DATABASE_URL')) {
        return NextResponse.json({ 
          error: 'Database not configured. Please set DATABASE_URL in environment variables.' 
        }, { status: 503 })
      }
      throw dbError
    }
  } catch (error) {
    console.error('[v0] Error logging in:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
