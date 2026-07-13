import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function validateBookingPayload(body: any) {
  const {
    entryUser,
    partner,
    partnerName,
    name,
    mob,
    adults,
    services,
    guideStaff,
    assistStaff,
    location,
    registerNumber,
    driverStaff,
    advance,
    advanceAccount,
  } = body;

  // Enforce Register Number
  if (!registerNumber || !registerNumber.trim()) {
    return 'Register Number is required';
  }

  // Mandatory fields
  if (!entryUser || !partner || !name || !mob || !guideStaff || !assistStaff || !location) {
    return 'Missing required guest/staff details (User, Partner, Name, Mobile, Guide, Assist, Location)';
  }

  // Adults must be >= 1
  const parsedAdults = Number(adults);
  if (isNaN(parsedAdults) || parsedAdults < 1) {
    return 'Adult head count is compulsory (minimum 1)';
  }

  // Require partnerName for partner/broker
  if ((partner === 'Partner' || partner === 'Broker') && !partnerName?.trim()) {
    return `Partner/Broker Name is required when Partner Type is ${partner}`;
  }

  if (!services || services.length === 0) {
    return 'At least one service type must be added';
  }

  // Check if Towing or Boating is selected
  const hasTowing = services.some((s: any) => s.serviceId.includes('towing'));
  const hasBoating = services.some((s: any) => s.serviceId.includes('boating'));

  // Towing compulsory driver staff validation
  if (hasTowing && (!driverStaff || !driverStaff.trim())) {
    return 'Driver Staff selection is compulsory for Towing';
  }

  // Advance paid account validation
  const parsedAdvance = Number(advance) || 0;
  if (parsedAdvance > 0 && (!advanceAccount || !advanceAccount.trim())) {
    return 'Advance Paid Account is compulsory when advance payment is made';
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationError = validateBookingPayload(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const {
      entryUser,
      partner,
      partnerName,
      name,
      mob,
      adults,
      children,
      services,
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
      guestRemarks,
      serviceRemarks,
      staffRemarks,
      location,
      registerNumber,
      driverStaff,
      advanceAccount,
      balanceAccount,
    } = body;

    const finalCommission = partner === 'Walk-In' ? 0 : (Number(commission) || 0);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const booking = {
      registerNumber: registerNumber.trim(),
      entryUser,
      partner,
      partnerName: (partner === 'Partner' || partner === 'Broker') ? (partnerName || '') : '',
      name,
      mob,
      adults: Number(adults),
      children: Number(children) || 0,
      services,
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
      driverStaff: driverStaff || '',
      advanceAccount: advanceAccount || '',
      balanceAccount: balanceAccount || '',
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing booking ID parameter' }, { status: 400 });
    }

    const validationError = validateBookingPayload(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const {
      partner,
      partnerName,
      name,
      mob,
      adults,
      children,
      services,
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
      guestRemarks,
      serviceRemarks,
      staffRemarks,
      location,
      registerNumber,
      driverStaff,
      advanceAccount,
      balanceAccount,
    } = body;

    const finalCommission = partner === 'Walk-In' ? 0 : (Number(commission) || 0);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const updateDoc = {
      $set: {
        registerNumber: registerNumber.trim(),
        partner,
        partnerName: (partner === 'Partner' || partner === 'Broker') ? (partnerName || '') : '',
        name,
        mob,
        adults: Number(adults),
        children: Number(children) || 0,
        services,
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
        driverStaff: driverStaff || '',
        advanceAccount: advanceAccount || '',
        balanceAccount: balanceAccount || '',
        customPickupPrice: Number(customPickupPrice) || 0,
        customFoodPrice: Number(customFoodPrice) || 0,
        customRefreshmentPrice: Number(customRefreshmentPrice) || 0,
        guestRemarks: guestRemarks || '',
        serviceRemarks: serviceRemarks || '',
        staffRemarks: staffRemarks || '',
        location: location || '',
        updatedAt: new Date(),
      }
    };

    const result = await db.collection('bookings').updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Booking record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking details updated successfully!',
    });
  } catch (error: any) {
    console.error('Update booking error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking log', details: error.message },
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
        { status: 400 }
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
