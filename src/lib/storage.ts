import fs from 'fs';
import path from 'path';

export interface Registration {
  id: string;
  bookingRef: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  tickets: number;
  amountAed: number;
  paymentIntentId: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
}

const DB_PATH = path.join(process.cwd(), 'registrations_data.json');

function readDb(): Registration[] {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Storage read error:', e);
  }
  return [];
}

function writeDb(data: Registration[]): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

export function saveRegistration(reg: Registration): void {
  const list = readDb();
  list.unshift(reg);
  writeDb(list);
}

export function getRegistrationByRef(ref: string): Registration | undefined {
  const list = readDb();
  return list.find((r) => r.bookingRef === ref);
}

export function getRegistrationByIntentId(intentId: string): Registration | undefined {
  const list = readDb();
  return list.find((r) => r.paymentIntentId === intentId);
}

export function updateRegistrationStatus(intentId: string, status: 'pending' | 'paid' | 'cancelled'): void {
  const list = readDb();
  const target = list.find((r) => r.paymentIntentId === intentId);
  if (target) {
    target.status = status;
    writeDb(list);
  }
}
