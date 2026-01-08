import { NextRequest, NextResponse } from 'next/server'

/**
 * Environmental Data API Proxy
 * Forwards requests to the backend environmental API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    const path = params.path.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    const url = `${backendUrl}/api/environmental/${path}${searchParams ? `?${searchParams}` : ''}`

    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Environmental API proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch environmental data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    const path = params.path.join('/')
    const body = await request.json()

    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(`${backendUrl}/api/environmental/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Environmental API proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process environmesntal request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}