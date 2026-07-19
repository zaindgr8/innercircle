import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import sqlite3
import random
import os
import sys
from datetime import datetime

PORT = 8080
DB_FILE = "database.db"
ZIINA_API_KEY = "WQq2Jrqt1L/dKZPsGKHpGnHY4541IPkRSdKMGUh9OLk57UWHidf1FF4/LMiSPlJL"
ZIINA_URL = "https://api-v2.ziina.com/api/payment_intent"

# Initialize Database
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_ref TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            company TEXT,
            tickets INTEGER NOT NULL,
            amount_aed REAL NOT NULL,
            payment_intent_id TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class InnerCircleRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path == "/api/verify-payment":
            self.handle_verify_payment(query)
        elif path == "/api/booking-details":
            self.handle_booking_details(query)
        elif path == "/api/admin/registrations":
            self.handle_admin_registrations()
        else:
            # Default static file serving
            if path == "/":
                self.path = "/index.html"
            return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == "/api/create-payment":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                self.handle_create_payment(data)
            except Exception as e:
                self.respond_json({"error": f"Invalid payload: {str(e)}"}, status=400)
        else:
            self.respond_json({"error": "Endpoint not found"}, status=404)

    def handle_create_payment(self, data):
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        phone = data.get("phone", "").strip()
        company = data.get("company", "").strip()
        tickets = int(data.get("tickets", 1))

        if not name or not email or not phone:
            self.respond_json({"error": "Name, Email, and Phone number are required."}, status=400)
            return

        if tickets < 1:
            tickets = 1

        price_per_head = 65.0
        total_aed = tickets * price_per_head
        amount_fils = int(total_aed * 100)

        # Generate unique booking reference
        rand_suffix = random.randint(1000, 9999)
        booking_ref = f"ICD-{rand_suffix}"

        # Host URL detection
        host_header = self.headers.get('Host', 'localhost:8080')
        scheme = "https" if self.headers.get('X-Forwarded-Proto') == "https" else "http"
        base_url = f"{scheme}://{host_header}"

        success_url = f"{base_url}/thank-you.html?ref={booking_ref}&status=success&intent_id={{PAYMENT_INTENT_ID}}"
        cancel_url = f"{base_url}/index.html?ref={booking_ref}&status=cancelled"

        ziina_payload = {
            "amount": amount_fils,
            "currency_code": "AED",
            "message": f"The Inner Circle DXB - Cruise Event Ticket ({tickets} Guest{'s' if tickets > 1 else ''})",
            "success_url": success_url,
            "cancel_url": cancel_url
        }

        ziina_headers = {
            "Authorization": f"Bearer {ZIINA_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        req = urllib.request.Request(
            ZIINA_URL,
            data=json.dumps(ziina_payload).encode("utf-8"),
            headers=ziina_headers,
            method="POST"
        )

        try:
            with urllib.request.urlopen(req) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                intent_id = res_data.get("id")
                redirect_url = res_data.get("redirect_url")
                embedded_url = res_data.get("embedded_url")

                # Store pending registration in database
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO registrations (booking_ref, name, email, phone, company, tickets, amount_aed, payment_intent_id, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                ''', (booking_ref, name, email, phone, company, tickets, total_aed, intent_id))
                conn.commit()
                conn.close()

                self.respond_json({
                    "success": True,
                    "booking_ref": booking_ref,
                    "payment_intent_id": intent_id,
                    "redirect_url": redirect_url,
                    "embedded_url": embedded_url,
                    "amount_aed": total_aed,
                    "tickets": tickets
                })
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8')
            print("Ziina API Error:", err_msg)
            self.respond_json({"error": f"Ziina Gateway Error: {err_msg}"}, status=500)
        except Exception as e:
            print("Server Exception:", str(e))
            self.respond_json({"error": f"Server Error: {str(e)}"}, status=500)

    def handle_verify_payment(self, query):
        intent_id = query.get("intent_id", [None])[0]
        booking_ref = query.get("ref", [None])[0]

        if not intent_id and not booking_ref:
            self.respond_json({"error": "Payment Intent ID or Booking Reference required"}, status=400)
            return

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        if intent_id:
            cursor.execute("SELECT * FROM registrations WHERE payment_intent_id = ?", (intent_id,))
        else:
            cursor.execute("SELECT * FROM registrations WHERE booking_ref = ?", (booking_ref,))

        row = cursor.fetchone()

        if not row:
            conn.close()
            self.respond_json({"error": "Booking not found"}, status=404)
            return

        current_status = row[9]
        fetched_intent_id = row[8] or intent_id

        verified_status = current_status
        if fetched_intent_id:
            ziina_verify_url = f"{ZIINA_URL}/{fetched_intent_id}"
            ziina_headers = {
                "Authorization": f"Bearer {ZIINA_API_KEY}",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            req = urllib.request.Request(ziina_verify_url, headers=ziina_headers, method="GET")
            try:
                with urllib.request.urlopen(req) as resp:
                    z_res = json.loads(resp.read().decode("utf-8"))
                    z_status = z_res.get("status")
                    if z_status in ['completed', 'succeeded', 'paid', 'captured']:
                        verified_status = 'paid'
                        cursor.execute("UPDATE registrations SET status = 'paid' WHERE payment_intent_id = ?", (fetched_intent_id,))
                        conn.commit()
            except Exception as e:
                print("Ziina verification check notice:", str(e))

        conn.close()

        self.respond_json({
            "booking_ref": row[1],
            "name": row[2],
            "email": row[3],
            "phone": row[4],
            "company": row[5],
            "tickets": row[6],
            "amount_aed": row[7],
            "payment_intent_id": row[8],
            "status": verified_status,
            "created_at": row[10]
        })

    def handle_booking_details(self, query):
        booking_ref = query.get("ref", [None])[0]
        intent_id = query.get("intent_id", [None])[0]

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        if booking_ref:
            cursor.execute("SELECT * FROM registrations WHERE booking_ref = ?", (booking_ref,))
        elif intent_id:
            cursor.execute("SELECT * FROM registrations WHERE payment_intent_id = ?", (intent_id,))
        else:
            conn.close()
            self.respond_json({"error": "Reference or Intent ID required"}, status=400)
            return

        row = cursor.fetchone()
        conn.close()

        if not row:
            self.respond_json({"error": "Booking not found"}, status=404)
            return

        self.respond_json({
            "booking_ref": row[1],
            "name": row[2],
            "email": row[3],
            "phone": row[4],
            "company": row[5],
            "tickets": row[6],
            "amount_aed": row[7],
            "payment_intent_id": row[8],
            "status": row[9],
            "created_at": row[10]
        })

    def handle_admin_registrations(self):
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT booking_ref, name, email, phone, company, tickets, amount_aed, status, created_at FROM registrations ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()

        registrations = []
        for r in rows:
            registrations.append({
                "booking_ref": r[0],
                "name": r[1],
                "email": r[2],
                "phone": r[3],
                "company": r[4],
                "tickets": r[5],
                "amount_aed": r[6],
                "status": r[7],
                "created_at": r[8]
            })

        self.respond_json({"registrations": registrations, "count": len(registrations)})

    def respond_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

if __name__ == '__main__':
    print(f"Starting Inner Circle DXB Server on http://localhost:{PORT}")
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), InnerCircleRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
