import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function validateBookingPayload(body: any, isPut = false) {
  const {
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
    balanceAccount,
  } = body;

  // Enforce Register Number on updates
  if (isPut && (!registerNumber || !registerNumber.trim())) {
    return 'Register Number is required for updates';
  }

  // Mandatory fields
  if (!partner || !name || !mob || !location || !balanceAccount || !balanceAccount.trim()) {
    return 'Missing required guest/staff details (Partner, Name, Mobile, Location, Balance Paid Account)';
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

  // Guide staff must be selected (as array of strings)
  if (!guideStaff || !Array.isArray(guideStaff) || guideStaff.length === 0) {
    return 'At least one Guide Staff is compulsory';
  }

  // Assist staff must be array if present
  if (assistStaff && !Array.isArray(assistStaff)) {
    return 'Assist Staff must be a list';
  }

  // Check if Towing or Boating is selected
  const hasTowing = services.some((s: any) => s.serviceId.includes('towing'));

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
      guideStaff, // Array of strings
      assistStaff, // Array of strings
      customPickupPrice,
      customFoodPrice,
      customRefreshmentPrice,
      guestRemarks,
      serviceRemarks,
      staffRemarks,
      location,
      driverStaff,
      advanceAccount,
      balanceAccount,
    } = body;

    const finalCommission = partner === 'Walk-In' ? 0 : (Number(commission) || 0);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    // Atomic auto-increment counter sequence
    const counterDoc = await db.collection('counters').findOneAndUpdate(
      { _id: 'booking_reg_seq' as any },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    
    // Fallback if upsert returns empty first time (it shouldn't but let's be safe)
    let seqVal = 1001;
    if (counterDoc && typeof counterDoc.seq === 'number') {
      seqVal = counterDoc.seq;
    } else {
      // Find current count
      const count = await db.collection('bookings').countDocuments();
      seqVal = 1000 + count + 1;
      await db.collection('counters').updateOne(
        { _id: 'booking_reg_seq' as any },
        { $set: { seq: seqVal } },
        { upsert: true }
      );
    }

    const autoRegNumber = `REG-${seqVal}`;

    const booking = {
      registerNumber: autoRegNumber,
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
      guideStaff: guideStaff || [],
      assistStaff: assistStaff || [],
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
      registerNumber: autoRegNumber,
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

    const validationError = validateBookingPayload(body, true);
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
      guideStaff, // Array of strings
      assistStaff, // Array of strings
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
        guideStaff: guideStaff || [],
        assistStaff: assistStaff || [],
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
    
    // Auto-migration & rewrite of existing bookings to have auto-incrementing REG numbers
    const allBookings = await db.collection('bookings').find({}).sort({ createdAt: 1 }).toArray();
    let nextIndex = 1001;
    let migrationsRequired = false;

    // Check if migration is required
    for (let i = 0; i < allBookings.length; i++) {
      const expectedReg = `REG-${1001 + i}`;
      if (allBookings[i].registerNumber !== expectedReg) {
        migrationsRequired = true;
        break;
      }
    }

    if (migrationsRequired) {
      for (const b of allBookings) {
        const expectedReg = `REG-${nextIndex}`;
        
        // Normalize single guide/assistance strings to arrays if they are strings
        const guides = Array.isArray(b.guideStaff) 
          ? b.guideStaff 
          : b.guideStaff ? [b.guideStaff] : [];
        const assistants = Array.isArray(b.assistStaff) 
          ? b.assistStaff 
          : b.assistStaff ? [b.assistStaff] : [];

        await db.collection('bookings').updateOne(
          { _id: b._id },
          { 
            $set: { 
              registerNumber: expectedReg,
              guideStaff: guides,
              assistStaff: assistants,
            } 
          }
        );
        nextIndex++;
      }
      
      // Update counters collection
      await db.collection('counters').updateOne(
        { _id: 'booking_reg_seq' as any },
        { $set: { seq: nextIndex - 1 } },
        { upsert: true }
      );
    }

    // Fetch refreshed bookings
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
