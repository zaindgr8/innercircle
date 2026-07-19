// Global State
let currentTickets = 1;
const PRICE_PER_HEAD = 65;
let currentPaymentIntentId = null;
let pollTimer = null;

// Determine API Base URL (Supports both http://localhost:8080 and file:// preview)
const API_BASE = (window.location.protocol === 'file:' || !window.location.host) 
  ? 'http://localhost:8080' 
  : '';

// Target Event Date: 24 July 2026, 7:00 PM GST (+04:00)
const EVENT_DATE = new Date("2026-07-24T19:00:00+04:00").getTime();

document.addEventListener("DOMContentLoaded", () => {
  initCountdown();
  checkUrlParams();
});

// 1. Countdown Timer
function initCountdown() {
  function updateTimer() {
    const now = new Date().getTime();
    const distance = EVENT_DATE - now;

    if (distance <= 0) {
      document.getElementById("days").innerText = "00";
      document.getElementById("hours").innerText = "00";
      document.getElementById("mins").innerText = "00";
      document.getElementById("secs").innerText = "00";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").innerText = String(days).padStart(2, '0');
    document.getElementById("hours").innerText = String(hours).padStart(2, '0');
    document.getElementById("mins").innerText = String(mins).padStart(2, '0');
    document.getElementById("secs").innerText = String(secs).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

// 2. Ticket Counter Logic
function updateTickets(change) {
  currentTickets += change;
  if (currentTickets < 1) currentTickets = 1;
  if (currentTickets > 10) currentTickets = 10;

  const totalAmount = currentTickets * PRICE_PER_HEAD;

  document.getElementById("ticketCount").innerText = currentTickets;
  document.getElementById("totalDisplay").innerText = `${totalAmount} AED`;
  document.getElementById("priceBreakdown").innerText = `${currentTickets} x ${PRICE_PER_HEAD} AED`;
  document.getElementById("btnText").innerText = `PROCEED TO PAYMENT (${totalAmount} AED)`;
}

// 3. Handle Form Submission
async function handleRegistrationSubmit(event) {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const countryCode = document.getElementById("countryCode").value;
  const rawPhone = document.getElementById("phone").value.trim();
  const company = document.getElementById("company").value.trim();
  const phone = `${countryCode} ${rawPhone}`;

  const errorEl = document.getElementById("errorMessage");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = document.getElementById("btnText");
  const btnSpinner = document.getElementById("btnSpinner");

  errorEl.style.display = "none";
  submitBtn.disabled = true;
  btnText.innerText = "PROCESSING...";
  btnSpinner.style.display = "inline-block";

  try {
    const response = await fetch(`${API_BASE}/api/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName,
        email: email,
        phone: phone,
        company: company,
        tickets: currentTickets
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "Failed to initialize Ziina Payment Gateway.");
    }

    // Success - Open Ziina Modal
    currentPaymentIntentId = data.payment_intent_id;
    openZiinaModal(data);
    startPaymentVerificationPolling(data.payment_intent_id, data.booking_ref);

  } catch (err) {
    errorEl.innerText = err.message;
    errorEl.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    btnText.innerText = `PROCEED TO PAYMENT (${currentTickets * PRICE_PER_HEAD} AED)`;
    btnSpinner.style.display = "none";
  }
}

// 4. Ziina Modal Controls & Polling
function openZiinaModal(data) {
  const modal = document.getElementById("ziinaModal");
  const modalAmount = document.getElementById("modalAmount");
  const modalTickets = document.getElementById("modalTickets");
  const directBtn = document.getElementById("directZiinaBtn");

  if (modalAmount) modalAmount.innerText = `${data.amount_aed} AED`;
  if (modalTickets) modalTickets.innerText = data.tickets;
  if (directBtn) directBtn.href = data.redirect_url;

  if (modal) modal.classList.add("active");

  setTimeout(() => {
    if (data.redirect_url) {
      window.location.href = data.redirect_url;
    }
  }, 1000);
}

function closeZiinaModal() {
  const modal = document.getElementById("ziinaModal");
  modal.classList.remove("active");
  const ziinaIframe = document.getElementById("ziinaIframe");
  ziinaIframe.src = "about:blank";

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPaymentVerificationPolling(intentId, bookingRef) {
  if (pollTimer) clearInterval(pollTimer);

  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/verify-payment?intent_id=${intentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'paid' || data.status === 'completed' || data.status === 'succeeded') {
          clearInterval(pollTimer);
          const targetUrl = API_BASE ? `thank-you.html?ref=${bookingRef}&status=success` : `/thank-you.html?ref=${bookingRef}&status=success`;
          window.location.href = targetUrl;
        }
      }
    } catch (e) {
      console.warn("Polling verify notice:", e);
    }
  }, 3000);
}

// 5. URL Parameter Check (e.g. Cancelled Payment Return)
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("status") === "cancelled") {
    const errorEl = document.getElementById("errorMessage");
    errorEl.innerText = "Payment was cancelled or interrupted. You can try submitting again below.";
    errorEl.style.display = "block";
  }
}
