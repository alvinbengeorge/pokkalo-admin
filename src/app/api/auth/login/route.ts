import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing username or password' },
        { status: 400 }
      );
    }

    // 1. Static Admin Credentials Check
    if (username.toLowerCase() === 'admin' && password === 'password123') {
      return NextResponse.json({
        success: true,
        user: {
          username: 'Admin',
          role: 'admin',
        },
      });
    }

    // 2. Query MongoDB for Staff
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const user = await db.collection('users').findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        role: user.role || 'staff',
      },
    });
  } catch (error: any) {
    console.error('Login route error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    );
  }
}
