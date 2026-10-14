import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, createHmac } from 'node:crypto';

const file = resolve(process.env.DATABASE_PATH || './data/wayfarer.db');
mkdirSync(dirname(file), { recursive: true });
export const db = new DatabaseSync(file);
db.exec(`PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,phone TEXT,password_hash TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS destinations(id TEXT PRIMARY KEY,name TEXT NOT NULL,region TEXT NOT NULL,category TEXT NOT NULL,image TEXT NOT NULL,cost INTEGER NOT NULL,season TEXT NOT NULL,description TEXT NOT NULL,currency TEXT NOT NULL,customs TEXT NOT NULL,advisory TEXT NOT NULL,tags TEXT NOT NULL,attractions TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trips(id INTEGER PRIMARY KEY AUTOINCREMENT,owner_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,start TEXT NOT NULL,end TEXT NOT NULL,travelers INTEGER NOT NULL,currency TEXT NOT NULL DEFAULT 'INR',budget INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'planned',archived INTEGER NOT NULL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS trip_destinations(trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,destination_id TEXT REFERENCES destinations(id),PRIMARY KEY(trip_id,destination_id));
CREATE TABLE IF NOT EXISTS days(id INTEGER PRIMARY KEY AUTOINCREMENT,trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,date TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activities(id INTEGER PRIMARY KEY AUTOINCREMENT,day_id INTEGER REFERENCES days(id) ON DELETE CASCADE,name TEXT NOT NULL,start TEXT NOT NULL,duration INTEGER NOT NULL,location TEXT NOT NULL,category TEXT NOT NULL,cost REAL NOT NULL DEFAULT 0,notes TEXT NOT NULL DEFAULT '',created_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY AUTOINCREMENT,trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,payer TEXT NOT NULL,amount REAL NOT NULL,currency TEXT NOT NULL,category TEXT NOT NULL,date TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',split_method TEXT NOT NULL DEFAULT 'personal',shares TEXT NOT NULL DEFAULT '[]',paid INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY AUTOINCREMENT,trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,type TEXT NOT NULL,name TEXT NOT NULL,provider TEXT NOT NULL,price REAL NOT NULL,status TEXT NOT NULL,reference TEXT NOT NULL,details TEXT NOT NULL,day_id INTEGER REFERENCES days(id));
CREATE TABLE IF NOT EXISTS members(id INTEGER PRIMARY KEY AUTOINCREMENT,trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,email TEXT NOT NULL,name TEXT NOT NULL,permission TEXT NOT NULL DEFAULT 'edit',rsvp TEXT NOT NULL DEFAULT 'pending',UNIQUE(trip_id,email));
CREATE TABLE IF NOT EXISTS wishlist(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,destination_id TEXT REFERENCES destinations(id),saved_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,destination_id));
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,read INTEGER NOT NULL DEFAULT 0);`);
db.exec('CREATE TABLE IF NOT EXISTS shares(id TEXT PRIMARY KEY,trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,created_at TEXT DEFAULT CURRENT_TIMESTAMP);');
db.exec('CREATE TABLE IF NOT EXISTS settlement_payments(id INTEGER PRIMARY KEY AUTOINCREMENT,trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,from_name TEXT NOT NULL,to_name TEXT NOT NULL,amount REAL NOT NULL,paid_at TEXT DEFAULT CURRENT_TIMESTAMP);');

// Older or partially initialized trips may have dates but no itinerary rows.
// Restore those days on startup so the itinerary editor always has a valid day to target.
const tripsWithDates = db.prepare('SELECT id,start,end FROM trips').all() as { id: number; start: string; end: string }[];
const addTripDay = db.prepare('INSERT INTO days(trip_id,date) VALUES(?,?)');
const getTripDays = db.prepare('SELECT date FROM days WHERE trip_id=?');
for (const trip of tripsWithDates) {
  const start = Date.parse(`${trip.start}T00:00:00Z`);
  const end = Date.parse(`${trip.end}T00:00:00Z`);
  const dayCount = Math.floor((end - start) / 86400000) + 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || dayCount < 1 || dayCount > 45) continue;
  const existingDates = new Set((getTripDays.all(trip.id) as { date: string }[]).map(day => day.date));
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
    if (!existingDates.has(date)) addTripDay.run(trip.id, date);
  }
}

export const passwordHash = (password: string, salt = randomBytes(16).toString('hex')) => `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
export const checkPassword = (password: string, value: string) => { const [salt, hash] = value.split(':'); return scryptSync(password, salt, 64).toString('hex') === hash; };
export const signToken = (user: { id: string; name: string; email: string }) => {
  const secret = process.env.JWT_SECRET || 'local-demo-secret-change-before-deploy';
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + 7 * 86400000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
};
export const verifyToken = (token: string) => {
  const secret = process.env.JWT_SECRET || 'local-demo-secret-change-before-deploy';
  const [payload, signature] = token.split('.');
  const expected = createHmac('sha256', secret).update(payload || '').digest('base64url');
  if (!payload || signature !== expected) throw new Error('Invalid session');
  const user = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (user.exp < Date.now()) throw new Error('Session expired');
  return user as { id: string; name: string; email: string };
};

const destinations = [
 ['goa','Goa','West India','Beach','https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=85',32000,'Nov–Feb','Sunlit shores, Portuguese lanes and seafood kitchens make Goa an easy place to slow down.','INR','Dress modestly when visiting churches and ask before photographing locals.','Follow local beach and monsoon safety guidance.',['beach','food','relaxation'],['Fort Aguada','Fontainhas','Palolem Beach','Anjuna Flea Market']],
 ['manali','Manali','Himachal Pradesh','Mountain','https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1000&q=85',28000,'Mar–Jun','A mountain town of cedar forests, river bends and high-altitude adventures.','INR','Carry layers; weather can shift quickly in the mountains.','Check road and weather advisories before high-altitude travel.',['mountain','adventure','nature'],['Old Manali','Solang Valley','Hadimba Temple','Jogini Falls']],
 ['jaipur','Jaipur','Rajasthan','History','https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1000&q=85',26000,'Oct–Mar','Rose-colored palaces, lively bazaars and craft traditions in Rajasthan’s capital.','INR','Bargaining is common in bazaars; agree on a price before a ride.','Use registered transport and keep hydrated in warmer months.',['history','food','culture'],['Amber Fort','Hawa Mahal','City Palace','Jantar Mantar']],
 ['kerala','Alappuzha','Kerala','Relaxation','https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1000&q=85',35000,'Oct–Mar','Backwater canals, coconut groves and unhurried coastal food.','INR','Remove footwear when entering homes and temples.','Check seasonal monsoon notices and boat operator safety.',['relaxation','nature','food'],['Alleppey Backwaters','Marari Beach','Krishnapuram Palace','Pathiramanal']],
 ['mumbai','Mumbai','Maharashtra','City','https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1000&q=85',30000,'Nov–Feb','A city of sea-facing promenades, Art Deco heritage and exceptional street food.','INR','Use local greetings and dress comfortably for humid weather.','Use official transport and follow city travel guidance.',['city','food','history'],['Gateway of India','Marine Drive','Crawford Market','Sanjay Gandhi National Park']],
 ['bali','Ubud','Bali, Indonesia','Island','https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=85',78000,'Apr–Oct','Temple courtyards, emerald rice terraces and island-side calm.','IDR','Wear a sarong at temples and respect local ceremonies.','Check official travel guidance and local ocean conditions.',['beach','culture','relaxation'],['Tegallalang Rice Terraces','Ubud Art Market','Tirta Empul','Campuhan Ridge Walk']]
];

export function seed() {
  const count = Number((db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number }).c);
  const insertDest = db.prepare('INSERT OR IGNORE INTO destinations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const raw of destinations) { const d=raw as [string,string,string,string,string,number,string,string,string,string,string,string[],string[]]; insertDest.run(d[0],d[1],d[2],d[3],d[4],d[5],d[6],d[7],d[8],d[9],d[10],JSON.stringify(d[11]),JSON.stringify(d[12])); }
  if (count) return;
  db.prepare('INSERT INTO users(id,name,email,phone,password_hash) VALUES(?,?,?,?,?)').run('TRV00001','Suhana Asrani','demo@wayfarer.app','+91 98765 43210',passwordHash('wander123'));
  const trip = db.prepare('INSERT INTO trips(owner_id,name,start,end,travelers,currency,budget,status) VALUES(?,?,?,?,?,?,?,?)').run('TRV00001','Goa, at your own pace','2026-10-25','2026-10-29',4,'INR',72000,'planned');
  const tripId = Number(trip.lastInsertRowid);
  db.prepare('INSERT INTO trip_destinations VALUES(?,?)').run(tripId,'goa');
  const day = db.prepare('INSERT INTO days(trip_id,date) VALUES(?,?)');
  for (let i=25;i<=29;i++) day.run(tripId,`2026-10-${i}`);
  const ids = db.prepare('SELECT id FROM days WHERE trip_id=? ORDER BY date').all(tripId) as {id:number}[];
  const activity = db.prepare('INSERT INTO activities(day_id,name,start,duration,location,category,cost,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?)');
  activity.run(ids[0].id,'Arrive & settle in','11:00',60,'Candolim','Travel',0,'Check into the villa','TRV00001');
  activity.run(ids[0].id,'Lunch at the beach','13:00',90,'Calangute Beach','Food',1800,'Try the local fish curry','TRV00001');
  activity.run(ids[0].id,'Sunset at Fort Aguada','17:00',120,'Fort Aguada','History',600,'Golden hour walk','TRV00001');
  activity.run(ids[1].id,'Coffee in Fontainhas','09:00',60,'Fontainhas, Panaji','Food',900,'','TRV00001');
  activity.run(ids[1].id,'Explore the Latin Quarter','10:30',120,'Fontainhas, Panaji','Culture',0,'Keep time for the galleries','TRV00001');
  db.prepare('INSERT INTO expenses(trip_id,payer,amount,currency,category,date,note) VALUES(?,?,?,?,?,?,?)').run(tripId,'TRV00001',2800,'INR','Accommodation','2026-10-13','Villa deposit');
  db.prepare('INSERT INTO members(trip_id,email,name,permission,rsvp) VALUES(?,?,?,?,?)').run(tripId,'maya@example.com','Maya Patel','edit','accepted');
  db.prepare('INSERT INTO members(trip_id,email,name,permission,rsvp) VALUES(?,?,?,?,?)').run(tripId,'arjun@example.com','Arjun Rao','view','pending');
  db.prepare('INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)').run('TRV00001','Your Goa escape is taking shape','A few thoughtful plans are already on the itinerary.');
}
seed();
