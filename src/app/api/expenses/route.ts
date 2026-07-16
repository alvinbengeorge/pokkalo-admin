import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, type, amount, paymentMode, screenshot, remarks, entryUser } = body;

    if (!date || !type || !amount || !paymentMode || !entryUser) {
      return NextResponse.json(
        { error: 'Missing required expense parameters (Date, Type, Amount, Payment Mode, User)' },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Paid Amount must be a positive number' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const expense = {
      date,
      type,
      amount: parsedAmount,
      paymentMode,
      screenshot: screenshot || '', // Base64 string proof image
      remarks: remarks || '',
      entryUser,
      createdAt: new Date(),
    };

    const result = await db.collection('expenses').insertOne(expense);

    return NextResponse.json({
      success: true,
      expenseId: result.insertedId,
      message: 'Expense record saved successfully!',
    });
  } catch (error: any) {
    console.error('Submit expense error:', error);
    return NextResponse.json(
      { error: 'Failed to submit expense', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, date, type, amount, paymentMode, screenshot, remarks } = body;

    if (!id || !date || !type || !amount || !paymentMode) {
      return NextResponse.json(
        { error: 'Missing required expense parameters (ID, Date, Type, Amount, Payment Mode)' },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Paid Amount must be a positive number' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const updateDoc = {
      $set: {
        date,
        type,
        amount: parsedAmount,
        paymentMode,
        screenshot: screenshot || '',
        remarks: remarks || '',
        updatedAt: new Date(),
      }
    };

    const result = await db.collection('expenses').updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Expense details updated successfully!',
    });
  } catch (error: any) {
    console.error('Update expense error:', error);
    return NextResponse.json(
      { error: 'Failed to update expense', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const expenses = await db
      .collection('expenses')
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses', details: error.message },
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
        { error: 'Missing expense ID parameter' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'kayak_club');

    const result = await db.collection('expenses').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Expense record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense record deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense', details: error.message },
      { status: 500 }
    );
  }
}
