import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      entryUser,
      partner,
      name,
      mob,
      pax,
      services,
      addons,
      rate,
      advance,
      discount,
      balance,
      commission,
      total,
      guideStaff,
      assistStaff,
      customPickupPrice,
      customFoodPrice,
    } = body;

    // Simple validation
    if (!entryUser || !partner || !name || !mob || !pax || !guideStaff || !assistStaff) {
      return NextResponse.json(
        { error: 'Missing required guest/staff details (User, Partner, Name, Mobile, Pax, Guide Staff, Assist Staff)' },
        { status: 400 }
      );
    }

    if (!services || services.length === 0) {
      return NextResponse.json(
        { error: 'At least one service type must be selected' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const booking = {
      entryUser,
      partner,
      name,
      mob,
      pax: Number(pax),
      services,
      addons: addons || [],
      rate: Number(rate) || 0,
      advance: Number(advance) || 0,
      discount: Number(discount) || 0,
      balance: Number(balance) || 0,
      commission: Number(commission) || 0,
      total: Number(total) || 0,
      guideStaff,
      assistStaff,
      customPickupPrice: Number(customPickupPrice) || 0,
      customFoodPrice: Number(customFoodPrice) || 0,
      createdAt: new Date(),
    };

    const result = await db.collection('bookings').insertOne(booking);

    return NextResponse.json({
      success: true,
      bookingId: result.insertedId,
      message: 'Booking submitted successfully!',
    });
  } catch (error: any) {
    console.error('Error inserting booking:', error);
    return NextResponse.json(
      { error: 'Failed to submit booking', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');
    const bookings = await db
      .collection('bookings')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
      { status: 500 }
    );
  }
}
