const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../server/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkBcg() {
  const snapshot = await db.collection('client_documents')
    .where('client', '==', 'BCG')
    .get();
  
  console.log(`Found ${snapshot.size} BCG documents.`);
  if (snapshot.size > 0) {
    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log(`FileName: ${data.fileName}`);
    console.log(`Headers: ${JSON.stringify(data.headers)}`);
    console.log(`Rows count: ${data.rows.length}`);
    console.log(`First 15 Rows:`);
    console.log(data.rows.slice(0, 15));
  }
}

checkBcg().catch(console.error);
