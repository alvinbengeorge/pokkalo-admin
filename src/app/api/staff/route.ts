import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');
    const staff = await db
      .collection('users')
      .find({ role: 'staff' })
      .project({ passwordHash: 0 })
      .toArray();

    return NextResponse.json(staff);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch staff accounts', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing username or password' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const existing = await db.collection('users').findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    const newStaff = {
      username,
      passwordHash: hashPassword(password),
      role: 'staff',
      createdAt: new Date(),
    };

    await db.collection('users').insertOne(newStaff);

    return NextResponse.json({
      success: true,
      message: `Staff member "${username}" created successfully!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create staff member', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username to delete' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const result = await db.collection('users').deleteOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      role: 'staff',
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Staff member "${username}" deleted successfully!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete staff member', details: error.message },
      { status: 500 }
    );
  }
}
