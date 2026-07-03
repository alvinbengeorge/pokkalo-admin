import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');
    const locations = await db.collection('locations').find({}).toArray();
    return NextResponse.json(locations);
  } catch (error: any) {
    console.error('Fetch locations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    // Check if location already exists
    const exists = await db.collection('locations').findOne({ name: name.trim() });
    if (exists) {
      return NextResponse.json(
        { error: 'Location already exists' },
        { status: 400 }
      );
    }

    const result = await db.collection('locations').insertOne({
      name: name.trim(),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      locationId: result.insertedId,
      message: 'Location added successfully!',
    });
  } catch (error: any) {
    console.error('Add location error:', error);
    return NextResponse.json(
      { error: 'Failed to add location', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing location ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const result = await db.collection('locations').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Location removed successfully!',
    });
  } catch (error: any) {
    console.error('Delete location error:', error);
    return NextResponse.json(
      { error: 'Failed to delete location', details: error.message },
      { status: 500 }
    );
  }
}
