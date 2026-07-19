'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

const PRICE_PER_HEAD = 65;
const EVENT_DATE = new Date("2026-07-24T19:00:00+04:00").getTime();

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+971');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [tickets, setTickets] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Countdown State
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', mins: '00', secs: '00' });

  // Ziina Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    bookingRef: string;
    intentId: string;
    redirectUrl: string;
    embeddedUrl: string;
    amountAed: number;
    tickets: number;
  } | null>(null);

  // Check URL params for cancellation warning
  useEffect(() => {
    if (searchParams.get('status') === 'cancelled') {
      setErrorMessage('Payment was cancelled or interrupted. You can try submitting again below.');
    }
  }, [searchParams]);

  // Countdown Timer Effect
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = EVENT_DATE - now;

      if (distance <= 0) {
        setTimeLeft({ days: '00', hours: '00', mins: '00', secs: '00' });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        mins: String(mins).padStart(2, '0'),
        secs: String(secs).padStart(2, '0')
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Payment Verification Polling Effect
  useEffect(() => {
    if (!modalData?.intentId || !isModalOpen) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/verify-payment?intent_id=${modalData.intentId}`);
        if (res.ok) {
          const data = await res.json();
          if (['paid', 'completed', 'succeeded'].includes(data.status)) {
            clearInterval(interval);
            router.push(`/thank-you?ref=${modalData.bookingRef}&status=success`);
          }
        }
      } catch (e) {
        console.warn('Polling verify error:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [modalData, isModalOpen, router]);

  const handleTicketChange = (delta: number) => {
    setTickets((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > 10) return 10;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const fullPhone = `${countryCode} ${phone.trim()}`;

    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: email,
          phone: fullPhone,
          company: company,
          tickets: tickets
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to initialize Ziina Payment Gateway.');
      }

      setModalData({
        bookingRef: data.booking_ref,
        intentId: data.payment_intent_id,
        redirectUrl: data.redirect_url,
        embeddedUrl: data.embedded_url,
        amountAed: data.amount_aed,
        tickets: data.tickets
      });
      setIsModalOpen(true);

      // Automatically redirect to Ziina secure payment page
      setTimeout(() => {
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        }
      }, 1200);

    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = tickets * PRICE_PER_HEAD;

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

      {/* Main Container */}
      <main className="main-container">
        
        {/* Left Column: Event Details */}
        <section className="glass-card">
          <div className="event-badge">Upcoming Founder Gathering</div>
          <h1 className="section-title">2 Hour Cruise & Networking</h1>

          {/* Countdown Timer */}
          <div className="countdown-box">
            <div className="countdown-label">Event Starts In</div>
            <div className="timer-grid">
              <div className="timer-item">
                <span className="timer-val">{timeLeft.days}</span>
                <span className="timer-unit">Days</span>
              </div>
              <div className="timer-item">
                <span className="timer-val">{timeLeft.hours}</span>
                <span className="timer-unit">Hours</span>
              </div>
              <div className="timer-item">
                <span className="timer-val">{timeLeft.mins}</span>
                <span className="timer-unit">Mins</span>
              </div>
              <div className="timer-item">
                <span className="timer-val">{timeLeft.secs}</span>
                <span className="timer-unit">Secs</span>
              </div>
            </div>
          </div>

          {/* Details List */}
          <div className="details-list">
            <div className="detail-item">
              <div className="detail-icon">📍</div>
              <div className="detail-content">
                <div className="detail-title">Location</div>
                <div className="detail-text">Al Jaddaf next to Versace Hotel, Dubai</div>
                <a
                  href="https://maps.app.goo.gl/aFkohoFcf376TbJH6?g_st=ic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-btn"
                >
                  🗺️ Open in Google Maps &rarr;
                </a>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">📅</div>
              <div className="detail-content">
                <div className="detail-title">Date</div>
                <div className="detail-text">Thursday, 24 July</div>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">⏰</div>
              <div className="detail-content">
                <div className="detail-title">Time</div>
                <div className="detail-text">7:00 PM – 9:00 PM GST</div>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">🚤</div>
              <div className="detail-content">
                <div className="detail-title">Experience</div>
                <div className="detail-text">2 Hour Sunset & Night Cruise</div>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">🎟️</div>
              <div className="detail-content">
                <div className="detail-title">Investment</div>
                <div className="detail-text" style={{ color: 'var(--gold-light)' }}>
                  65 AED per head
                </div>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">🍢</div>
              <div className="detail-content">
                <div className="detail-title">Inclusions</div>
                <div className="detail-text">Gourmet Snacks & Premium Beverages 🥤</div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Registration Form */}
        <section className="glass-card">
          <h2 className="section-title">Reserve Your Seat</h2>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name <span className="req">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                className="form-input"
                placeholder="e.g. Alexander Wright"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address <span className="req">*</span>
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="alexander@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Contact Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Contact Number <span className="req">*</span>
              </label>
              <div className="phone-input-group">
                <select
                  className="country-select"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+974">🇶🇦 +974</option>
                  <option value="+965">🇰🇼 +965</option>
                  <option value="+968">🇴🇲 +968</option>
                  <option value="+973">🇧🇭 +973</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+1">🇺🇸 +1</option>
                </select>
                <input
                  type="tel"
                  id="phone"
                  className="form-input"
                  placeholder="50 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="company">
                Company / Startup Name
              </label>
              <input
                type="text"
                id="company"
                className="form-input"
                placeholder="e.g. Apex Innovations (Optional)"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Ticket Counter */}
            <div className="form-group">
              <label className="form-label">Number of Tickets</label>
              <div className="ticket-counter-box">
                <div className="counter-controls">
                  <button type="button" className="counter-btn" onClick={() => handleTicketChange(-1)}>
                    -
                  </button>
                  <span className="counter-val">{tickets}</span>
                  <button type="button" className="counter-btn" onClick={() => handleTicketChange(1)}>
                    +
                  </button>
                </div>
                <div className="price-summary">
                  <div className="price-total">{totalAmount} AED</div>
                  <div className="price-sub">{tickets} x {PRICE_PER_HEAD} AED</div>
                </div>
              </div>
            </div>

            {/* Ziina Payment Badge */}
            <div className="ziina-brand-badge">
              <span>🔒 Secured by</span>
              <span className="ziina-logo-text">Ziina Payment Gateway</span>
              <span>(Inner Circle Theme)</span>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-gold-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span>PROCESSING...</span>
                  <span className="spinner"></span>
                </>
              ) : (
                <span>PROCEED TO PAYMENT ({totalAmount} AED)</span>
              )}
            </button>

            {errorMessage && (
              <div style={{ color: '#F87171', fontSize: '0.85rem', marginTop: '0.8rem', textAlign: 'center' }}>
                {errorMessage}
              </div>
            )}
          </form>
        </section>

      </main>

      {/* Ziina Payment Transition Modal */}
      {isModalOpen && modalData && (
        <div className="modal-backdrop active">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
              ✕
            </button>

            <div className="brand-subtitle" style={{ fontSize: '1rem', color: 'var(--gold-light)' }}>
              THE INNER CIRCLE DXB
            </div>
            <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: 'var(--gold-light)', marginTop: '0.4rem' }}>
              Redirecting to Payment Gateway
            </h3>

            <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '16px', border: '1px solid var(--border-gold)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.4rem' }}>
                Order Summary
              </div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.8rem', color: '#FFF', fontWeight: '700' }}>
                {modalData.amountAed} AED
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gold-light)', marginTop: '0.2rem' }}>
                {modalData.tickets} Guest Ticket{modalData.tickets > 1 ? 's' : ''} (Ref: {modalData.bookingRef})
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', margin: '1.25rem 0', color: 'var(--gold-light)' }}>
              <span className="spinner"></span>
              <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Securing payment session with Ziina...</span>
            </div>

            <a
              href={modalData.redirectUrl}
              className="btn-gold-submit"
              style={{ textDecoration: 'none', width: '100%', marginTop: '1rem', justifyContent: 'center' }}
            >
              💳 PROCEED TO ZIINA CHECKOUT NOW &rarr;
            </a>
          </div>
        </div>
      )}

      <footer>
        &copy; 2026 The Inner Circle DXB. All rights reserved. Exclusively for Founders & Entrepreneurs.
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="text-center p-10 text-amber-300">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
