import { NextResponse } from 'next/server';
import { saveRegistration } from '@/lib/storage';

const ZIINA_API_KEY = "WQq2Jrqt1L/dKZPsGKHpGnHY4541IPkRSdKMGUh9OLk57UWHidf1FF4/LMiSPlJL";
const ZIINA_URL = "https://api-v2.ziina.com/api/payment_intent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, tickets: rawTickets } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, Email, and Phone number are required." }, { status: 400 });
    }

    const tickets = Math.max(1, parseInt(rawTickets || 1, 10));
    const pricePerHead = 65.0;
    const totalAed = tickets * pricePerHead;
    const amountFils = Math.round(totalAed * 100);

    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = `ICD-${randSuffix}`;

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const successUrl = `${baseUrl}/thank-you?ref=${bookingRef}&status=success&intent_id={PAYMENT_INTENT_ID}`;
    const cancelUrl = `${baseUrl}/?ref=${bookingRef}&status=cancelled`;

    const ziinaPayload = {
      amount: amountFils,
      currency_code: "AED",
      message: `The Inner Circle DXB - Cruise Event Ticket (${tickets} Guest${tickets > 1 ? 's' : ''})`,
      success_url: successUrl,
      cancel_url: cancelUrl
    };

    const ziinaResp = await fetch(ZIINA_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ZIINA_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(ziinaPayload)
    });

    const resData = await ziinaResp.json();

    if (!ziinaResp.ok) {
      console.error("Ziina API Error:", resData);
      return NextResponse.json({ error: `Ziina Error: ${JSON.stringify(resData)}` }, { status: ziinaResp.status });
    }

    const intentId = resData.id;
    const redirectUrl = resData.redirect_url;
    const embeddedUrl = resData.embedded_url;

    // Save registration
    saveRegistration({
      id: intentId || bookingRef,
      bookingRef,
      name,
      email,
      phone,
      company: company || '',
      tickets,
      amountAed: totalAed,
      paymentIntentId: intentId,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      booking_ref: bookingRef,
      payment_intent_id: intentId,
      redirect_url: redirectUrl,
      embedded_url: embeddedUrl,
      amount_aed: totalAed,
      tickets
    });

  } catch (err: any) {
    console.error("Create Payment Exception:", err);
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
}
