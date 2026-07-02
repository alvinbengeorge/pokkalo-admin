import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DEFAULT_PRICES = {
  services: {
    'sunrise-kayaking': 1200,
    'sunset-kayaking': 1500,
    'towing': 800,
    'boating': 2000,
    'fishing': 2500,
    'bioluminescence-boating': 1800,
    'bioluminescence-kayaking': 2200,
  },
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

    if (!services) {
      return NextResponse.json(
        { error: 'Missing services configuration' },
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
