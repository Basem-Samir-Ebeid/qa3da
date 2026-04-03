import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    let session = await db.getActiveSession(date)
    
    // Create a new session if none exists for today
    if (!session) {
      session = await db.createSession(date)
    }
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json()
    
    if (action === 'reset') {
      // Delete all orders and end all sessions
      await db.deleteAllOrders()
      await db.endAllActiveSessions()
      
      // Create a new session for today
      const today = new Date().toISOString().split('T')[0]
      const session = await db.createSession(today)
      
      return NextResponse.json(session)
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error handling session:', error)
    return NextResponse.json({ error: 'Failed to handle session' }, { status: 500 })
  }
}
