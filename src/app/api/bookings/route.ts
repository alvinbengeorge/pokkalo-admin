import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      entryUser,
      partner,
      partnerName,
      name,
      mob,
      adults,
      children,
      services, // Array of { serviceId, serviceName, adults, children, rate }
      addons,
      rate,
      advance,
      discount,
      extraCharges,
      balance,
      commission,
      total,
      guideStaff,
      assistStaff,
      customPickupPrice,
      customFoodPrice,
      customRefreshmentPrice,
      promoterUrl,
      promotionFees,
      guestRemarks,
      serviceRemarks,
      staffRemarks,
      location,
    } = body;

    // Simple validation
    if (!entryUser || !partner || !name || !mob || !adults || !guideStaff || !assistStaff || !location) {
      return NextResponse.json(
        { error: 'Missing required guest/staff details (User, Partner, Name, Mobile, Adults, Guide Staff, Assist Staff, Location)' },
        { status: 400 }
      );
    }

    // Require partnerName for partner/broker
    if ((partner === 'Partner' || partner === 'Broker') && !partnerName?.trim()) {
      return NextResponse.json(
        { error: `Partner/Broker Name is required when Partner Type is ${partner}` },
        { status: 400 }
      );
    }

    // Require promoterUrl for promotion
    if (partner === 'Promotion' && !promoterUrl?.trim()) {
      return NextResponse.json(
        { error: 'Promoter URL is required when Partner Type is Promotion' },
        { status: 400 }
      );
    }

    if (!services || services.length === 0) {
      return NextResponse.json(
        { error: 'At least one service type must be added' },
        { status: 400 }
      );
    }

    // Force walk-in commission to 0
    const finalCommission = partner === 'Walk-In' ? 0 : (Number(commission) || 0);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const booking = {
      entryUser,
      partner,
      partnerName: (partner === 'Partner' || partner === 'Broker') ? (partnerName || '') : '',
      promoterUrl: partner === 'Promotion' ? (promoterUrl || '') : '',
      promotionFees: partner === 'Promotion' ? (Number(promotionFees) || 0) : 0,
      name,
      mob,
      adults: Number(adults),
      children: Number(children) || 0,
      services, // Array of structured service details
      addons: addons || [],
      rate: Number(rate) || 0,
      advance: Number(advance) || 0,
      discount: Number(discount) || 0,
      extraCharges: Number(extraCharges) || 0,
      balance: Number(balance) || 0,
      commission: finalCommission,
      total: Number(total) || 0,
      guideStaff,
      assistStaff,
      customPickupPrice: Number(customPickupPrice) || 0,
      customFoodPrice: Number(customFoodPrice) || 0,
      customRefreshmentPrice: Number(customRefreshmentPrice) || 0,
      guestRemarks: guestRemarks || '',
      serviceRemarks: serviceRemarks || '',
      staffRemarks: staffRemarks || '',
      location: location || '',
      createdAt: new Date(),
    };

    const result = await db.collection('bookings').insertOne(booking);

    return NextResponse.json({
      success: true,
      bookingId: result.insertedId,
      message: 'Booking submitted successfully!',
    });
  } catch (error: any) {
    console.error('Submit booking error:', error);
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
    
    // Check if any booking has old structure (services contains strings instead of objects)
    // If so, delete all booking records to start fresh
    const oldBookingExists = await db.collection('bookings').findOne({ 
      'services.0': { $type: 'string' } 
    });
    
    if (oldBookingExists) {
      await db.collection('bookings').deleteMany({});
    }

    const bookings = await db
      .collection('bookings')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
      
    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
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
        { error: 'Missing booking ID parameter' },
        { status: 450 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const result = await db.collection('bookings').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Booking record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Booking record deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete booking error:', error);
    return NextResponse.json(
      { error: 'Failed to delete booking', details: error.message },
      { status: 500 }
    );
  }
}
