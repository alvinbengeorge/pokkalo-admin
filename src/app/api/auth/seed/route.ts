import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');
    
    // Check if users collection already exists or has documents
    const count = await db.collection('users').countDocuments();
    
    if (count > 0) {
      return NextResponse.json({
        message: 'Users collection already seeded.',
        hint: 'You can manage users from the admin panel.'
      });
    }

    const defaultStaff = [
      { username: 'Anoop', passwordHash: hashPassword('anoop123'), role: 'staff', createdAt: new Date() },
      { username: 'Benney', passwordHash: hashPassword('benney123'), role: 'staff', createdAt: new Date() },
      { username: 'Gracious', passwordHash: hashPassword('gracious123'), role: 'staff', createdAt: new Date() },
    ];

    await db.collection('users').insertMany(defaultStaff);

    return NextResponse.json({
      success: true,
      message: 'Seeded default staff accounts successfully.',
      defaultAccounts: {
        Anoop: 'anoop123',
        Benney: 'benney123',
        Gracious: 'gracious123',
      }
    });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { error: 'Database seeding failed', details: error.message },
      { status: 500 }
    );
  }
}
