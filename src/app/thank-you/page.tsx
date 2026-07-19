'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

interface BookingInfo {
  booking_ref: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  tickets: number;
  amount_aed: number;
  status: string;
}

function ThankYouContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const intentId = searchParams.get('intent_id');

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      if (!ref && !intentId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/verify-payment?ref=${ref || ''}&intent_id=${intentId || ''}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data);
        }
      } catch (e) {
        console.error('Failed to fetch booking:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [ref, intentId]);

  const bookingRef = booking?.booking_ref || ref || 'ICD-CONFIRMED';
  const name = booking?.name ? `${booking.name}${booking.company ? ` (${booking.company})` : ''}` : 'Inner Circle VIP Guest';
  const contact = booking ? `${booking.email} | ${booking.phone}` : 'Confirmed via Ziina Payment';
  const ticketsText = booking ? `${booking.tickets} Ticket${booking.tickets > 1 ? 's' : ''} (${booking.amount_aed} AED Paid)` : '1 Guest Ticket (65 AED Paid)';

  const qrText = encodeURIComponent(`The Inner Circle DXB | Pass: ${bookingRef} | Guest: ${booking?.name || 'VIP'} | Tickets: ${booking?.tickets || 1}`);
  const qrCodeUrl = `https://quickchart.io/qr?text=${qrText}&size=180&margin=1`;

  const gcalTitle = encodeURIComponent("The Inner Circle DXB - 2 Hour Cruise & Networking");
  const gcalDetails = encodeURIComponent(`Exclusive Founders & Entrepreneurs Event.\nRef: ${bookingRef}\nIncludes: Snacks & Beverages.\nLocation: Al Jaddaf next to Versace Hotel.`);
  const gcalLocation = encodeURIComponent("Al Jaddaf next to Versace Hotel, Dubai, UAE");
  const gcalDates = "20260724T150000Z/20260724T170000Z";
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${gcalDates}&details=${gcalDetails}&location=${gcalLocation}`;

  const downloadIcs = () => {
    const icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//The Inner Circle DXB//NONSGML v1.0//EN
BEGIN:VEVENT
UID:icd-cruise-20260724@innercircle.dxb
DTSTAMP:20260719T120000Z
DTSTART:20260724T150000Z
DTEND:20260724T170000Z
SUMMARY:The Inner Circle DXB - 2 Hour Cruise & Networking
DESCRIPTION:Exclusive 2-Hour Cruise for Private Founders & Entrepreneurs Community. Includes Snacks and Beverages.
LOCATION:Al Jaddaf next to Versace Hotel, Dubai, UAE
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'The_Inner_Circle_DXB_Cruise.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Brand Header */}
      <header className="brand-header">
        <div className="relative w-[180px] h-[180px] mb-4">
          <Image
            src="/logo.JPG"
            alt="The Inner Circle DXB Logo"
            width={180}
            height={180}
            className="brand-logo-img object-contain"
            priority
          />
        </div>
        <div className="gold-divider">
          <div className="gold-divider-diamond"></div>
        </div>
        <div className="brand-subtitle">Private Founders & Entrepreneurs Community</div>
      </header>

      <main className="thankyou-container">
        
        {/* VIP Pass Card */}
        <div className="vip-pass-card">
          <div className="pass-header">
            <div>
              <div className="brand-subtitle" style={{ fontSize: '0.85rem', color: 'var(--gold-light)', margin: 0 }}>
                OFFICIAL VIP EVENT PASS
              </div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: '#FFF', marginTop: '0.2rem' }}>
                2 Hour Sunset Cruise
              </h2>
            </div>
            <div className="pass-status-badge">
              <span>✓</span> CONFIRMED & PAID
            </div>
          </div>

          <div className="pass-grid">
            <div>
              <div className="pass-field-label">Member / Guest</div>
              <div className="pass-field-value">{loading ? 'Loading...' : name}</div>
            </div>

            <div>
              <div className="pass-field-label">Booking Reference</div>
              <div className="pass-field-value" style={{ fontFamily: 'Cinzel, serif', letterSpacing: '1px' }}>
                {bookingRef}
              </div>
            </div>

            <div>
              <div className="pass-field-label">Contact Details</div>
              <div className="pass-field-value" style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                {contact}
              </div>
            </div>

            <div>
              <div className="pass-field-label">Ticket Access</div>
              <div className="pass-field-value">{ticketsText}</div>
            </div>

            <div>
              <div className="pass-field-label">Event Date & Time</div>
              <div className="pass-field-value" style={{ fontSize: '0.95rem' }}>
                24 July 2026 | 7:00 – 9:00 PM GST
              </div>
            </div>

            <div>
              <div className="pass-field-label">Venue Location</div>
              <div className="pass-field-value" style={{ fontSize: '0.95rem' }}>
                Al Jaddaf next to Versace Hotel 📍
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="qr-section">
            <img src={qrCodeUrl} alt="VIP Pass QR Code" className="qr-code-img" />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Present QR Code at Boarding Entrance
            </div>
          </div>
        </div>

        {/* Welcome Summary & Actions */}
        <div className="glass-card" style={{ width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: 'var(--gold-light)', marginBottom: '0.75rem' }}>
            Welcome to The Inner Circle
          </h3>
          <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Your reservation for the 2 Hour Cruise & Networking event is confirmed. We look forward to hosting you for an unforgettable evening of high-level networking, gourmet snacks, and beverages.
          </p>

          <div className="action-buttons-group">
            <a
              href="https://maps.app.goo.gl/aFkohoFcf376TbJH6?g_st=ic"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-gold"
            >
              📍 Open Location Map
            </a>
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-gold"
            >
              📅 Add to Google Calendar
            </a>
            <button onClick={downloadIcs} className="btn-secondary-gold">
              📥 Download .ics Invite
            </button>
            <button onClick={() => window.print()} className="btn-secondary-gold">
              🖨️ Print VIP Pass
            </button>
          </div>
        </div>

      </main>

      <footer>
        &copy; 2026 The Inner Circle DXB. All rights reserved.
      </footer>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="text-center p-10 text-amber-300">Loading VIP Pass...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}
