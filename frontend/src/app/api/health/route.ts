import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';

export const runtime = 'nodejs';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  dbConnected: boolean;
  uptime?: number;
  version?: string;
  environment?: string;
}

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 * Returns application status and database connectivity
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();
  let dbConnected = false;
  let status: 'ok' | 'degraded' | 'error' = 'ok';

  try {
    // Attempt to connect to MongoDB
    const mongoose = await dbConnect();

    // Check if connection is established
    if (mongoose.connection.readyState === 1) {
      dbConnected = true;
    } else if (mongoose.connection.readyState === 2) {
      // Connection pending
      status = 'degraded';
      dbConnected = false;
    } else {
      // Connection failed or disconnected
      status = 'degraded';
      dbConnected = false;
    }
  } catch (error) {
    console.error('Health check - Database connection error:', error);
    status = 'degraded';
    dbConnected = false;
  }

  const response: HealthResponse = {
    status,
    timestamp,
    dbConnected,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime ? Math.floor(process.uptime()) : undefined,
  };

  // Return appropriate status code
  const statusCode = status === 'ok' ? 200 : status === 'degraded' ? 503 : 500;

  return NextResponse.json(response, { status: statusCode });
}

/**
 * HEAD /api/health
 * Lightweight health check for load balancers and monitoring
 * Returns only status code without body
 */
export async function HEAD(): Promise<NextResponse> {
  try {
    const mongoose = await dbConnect();
    const isConnected = mongoose.connection.readyState === 1;

    return new NextResponse(null, {
      status: isConnected ? 200 : 503,
    });
  } catch {
    return new NextResponse(null, {
      status: 503,
    });
  }
}
