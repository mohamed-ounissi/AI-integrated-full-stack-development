// Run: node --env-file=.env scripts/mongo-connection-check.js

import { MongoClient } from 'mongodb';

function getConnectionString() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env and run with: node --env-file=.env scripts/mongo-connection-check.js');
  }
  return uri;
}

async function checkConnection(uri) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    return client.db().databaseName;
  } finally {
    await client.close();
  }
}

async function main() {
  const uri = getConnectionString();
  console.log('Pinging MongoDB Atlas cluster...');

  const dbName = await checkConnection(uri);

  console.log(`\nConnected. Default database: "${dbName}"`);
}

main().catch((err) => {
  console.error('\nM0 check failed:', err.message);
  process.exit(1);
});
