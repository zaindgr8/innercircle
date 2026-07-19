import { NextResponse } from 'next/server';
import { getRegistrationByIntentId, getRegistrationByRef, updateRegistrationStatus } from '@/lib/storage';

const ZIINA_API_KEY = "WQq2Jrqt1L/dKZPsGKHpGnHY4541IPkRSdKMGUh9OLk57UWHidf1FF4/LMiSPlJL";
const ZIINA_URL = "https://api-v2.ziina.com/api/payment_intent";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const intentId = searchParams.get('intent_id');
  const ref = searchParams.get('ref');

  if (!intentId && !ref) {
    return NextResponse.json({ error: "Missing intent_id or ref query parameter" }, { status: 400 });
  }

  let registration = intentId ? getRegistrationByIntentId(intentId) : getRegistrationByRef(ref!);

  if (!registration) {
    return NextResponse.json({ error: "Booking record not found" }, { status: 404 });
  }

  const fetchedIntentId = registration.paymentIntentId || intentId;

  // Check live status with Ziina API if available
  if (fetchedIntentId && registration.status !== 'paid') {
    try {
      const zResp = await fetch(`${ZIINA_URL}/${fetchedIntentId}`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${ZIINA_API_KEY}`,
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (zResp.ok) {
        const zData = await zResp.json();
        const zStatus = zData.status;
        if (['completed', 'succeeded', 'paid', 'captured'].includes(zStatus)) {
          updateRegistrationStatus(fetchedIntentId, 'paid');
          registration.status = 'paid';
        }
      }
    } catch (e) {
      console.warn("Ziina status check notice:", e);
    }
  }

  return NextResponse.json({
    booking_ref: registration.bookingRef,
    name: registration.name,
    email: registration.email,
    phone: registration.phone,
    company: registration.company,
    tickets: registration.tickets,
    amount_aed: registration.amountAed,
    payment_intent_id: registration.paymentIntentId,
    status: registration.status,
    created_at: registration.createdAt
  });
}
