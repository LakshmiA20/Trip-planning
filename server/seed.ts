import { db, seed } from './store.js';
seed();
console.log('Demo database seeded. Login: demo@wayfarer.app / wander123');
db.close();
