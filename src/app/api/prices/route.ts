import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DEFAULT_PRICES = {
  services: [
    { id: 'sunrise-kayaking', name: 'Sunrise Kayaking', price: 1200 },
    { id: 'sunset-kayaking', name: 'Sun Set Kayaking', price: 1500 },
    { id: 'towing', name: 'Towing', price: 800 },
    { id: 'boating', name: 'Boating', price: 2000 },
    { id: 'fishing', name: 'Fishing', price: 2505 },
    { id: 'bioluminescence-boating', name: 'Bioluminescence Boating', price: 1800 },
    { id: 'bioluminescence-kayaking', name: 'Bioluminescence Kayaking', price: 2200 }
  ],
  addons: {}
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');
    
    const config = await db.collection('prices').findOne({ _id: 'pricing_config' as any });
    
    if (!config) {
      return NextResponse.json(DEFAULT_PRICES);
    }
    
    return NextResponse.json({
      services: config.services || DEFAULT_PRICES.services,
      addons: {},
    });
  } catch (error: any) {
    console.error('Fetch prices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { services } = body;

    if (!services || !Array.isArray(services)) {
      return NextResponse.json(
        { error: 'Services array is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    await db.collection('prices').updateOne(
      { _id: 'pricing_config' as any },
      {
        $set: {
          services,
          addons: {},
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Prices updated successfully!',
    });
  } catch (error: any) {
    console.error('Update prices error:', error);
    return NextResponse.json(
      { error: 'Failed to update prices', details: error.message },
      { status: 500 }
    );
  }
}
