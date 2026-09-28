// M2: seed ~10 fake support tickets so the "lookupTicket" tool and the
// structured-output summary endpoint have real data to work with.
// Run: node --env-file=.env scripts/seed-tickets.js

import { MongoClient } from 'mongodb';

const TICKETS = [
  { id: 1, customerName: 'Amina B.', vehicleVin: 'VF1RFB00123456789', issue: 'Check engine light on, rough idling', status: 'in_progress', assignedTo: 'agent_2', createdAt: '2026-09-20' },
  { id: 2, customerName: 'Karim T.', vehicleVin: 'WBA3A5C50DF123456', issue: 'Battery not holding charge overnight', status: 'open', assignedTo: 'agent_1', createdAt: '2026-09-21' },
  { id: 3, customerName: 'Salma R.', vehicleVin: '1HGCM82633A123456', issue: 'Grinding noise when braking', status: 'open', assignedTo: 'agent_3', createdAt: '2026-09-21' },
  { id: 4, customerName: 'Youssef M.', vehicleVin: 'JN1CV6EK1CM123456', issue: 'AC blowing warm air', status: 'in_progress', assignedTo: 'agent_2', createdAt: '2026-09-22' },
  { id: 5, customerName: 'Nour H.', vehicleVin: 'KMHDU4AD9AU123456', issue: 'Roadside assistance requested, flat tire on highway', status: 'resolved', assignedTo: 'agent_1', createdAt: '2026-09-18' },
  { id: 6, customerName: 'Wassim K.', vehicleVin: '5YJ3E1EA1JF123456', issue: 'Dashboard warning: low coolant', status: 'open', assignedTo: 'agent_3', createdAt: '2026-09-23' },
  { id: 7, customerName: 'Ines G.', vehicleVin: '3VW2K7AJ0FM123456', issue: 'Scheduled maintenance, 60k km service', status: 'resolved', assignedTo: 'agent_2', createdAt: '2026-09-15' },
  { id: 8, customerName: 'Mehdi L.', vehicleVin: 'WVWZZZ1KZAW123456', issue: 'Diagnostic code P0420 triggered', status: 'in_progress', assignedTo: 'agent_1', createdAt: '2026-09-22' },
  { id: 9, customerName: 'Rania S.', vehicleVin: '2T1BURHE0JC123456', issue: 'Battery replacement requested', status: 'open', assignedTo: 'agent_3', createdAt: '2026-09-24' },
  { id: 10, customerName: 'Hamza D.', vehicleVin: '1FTFW1ET5BFA12345', issue: 'Roadside assistance, engine won’t start', status: 'open', assignedTo: 'agent_2', createdAt: '2026-09-24' },
];

function getConnectionString() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Run with: node --env-file=.env scripts/seed-tickets.js');
  }
  return uri;
}

async function seedTickets(uri) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const collection = client.db('autocare').collection('tickets');
    await collection.deleteMany({});
    const result = await collection.insertMany(TICKETS);
    return result.insertedCount;
  } finally {
    await client.close();
  }
}

async function main() {
  const uri = getConnectionString();
  const count = await seedTickets(uri);
  console.log(`Seeded ${count} tickets into autocare.tickets`);
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
