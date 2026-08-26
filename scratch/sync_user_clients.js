import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';

const firebaseConfig = {
  apiKey: 'AIzaSyCB_pSS1-1VFkdHjzN2W8ozW55W0lF3BD8',
  authDomain: 'anexar-9820c.firebaseapp.com',
  projectId: 'anexar-9820c',
  storageBucket: 'anexar-9820c.firebasestorage.app',
  messagingSenderId: '1069657020241',
  appId: '1:1069657020241:web:741f0a7c4ecf003aede570'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const APPLY = process.argv.includes('--apply');

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const as = [...a].sort();
  const bs = [...b].sort();
  return as.every((v, i) => v === bs[i]);
}

async function run() {
  const target = JSON.parse(readFileSync('scratch/target_user_clients.json', 'utf8'));
  const currentSnap = await getDocs(collection(db, 'user_clients'));
  const current = {};
  currentSnap.forEach((d) => { current[d.id] = d.data(); });

  const targetKeys = new Set();
  const toCreate = [];
  const toUpdate = [];
  const unchanged = [];

  for (const person of target) {
    const key = person.email.trim().toLowerCase();
    targetKeys.add(key);
    const existing = current[key];

    if (!existing) {
      toCreate.push({ key, person });
      continue;
    }

    const clientsChanged = !sameSet(existing.clients || [], person.clients || []);
    const roleChanged = (existing.role || '') !== (person.role || '');
    const nameChanged = (existing.name || '') !== (person.name || '');

    if (clientsChanged || roleChanged || nameChanged) {
      toUpdate.push({
        key, person, existing,
        diffs: {
          ...(clientsChanged ? { clients: { from: existing.clients || [], to: person.clients || [] } } : {}),
          ...(roleChanged ? { role: { from: existing.role, to: person.role } } : {}),
          ...(nameChanged ? { name: { from: existing.name, to: person.name } } : {})
        }
      });
    } else {
      unchanged.push(key);
    }
  }

  const extraInFirestore = Object.keys(current).filter((k) => !targetKeys.has(k));

  const report = {
    totalTarget: target.length,
    totalCurrentFirestore: Object.keys(current).length,
    toCreateCount: toCreate.length,
    toCreate: toCreate.map((c) => ({ email: c.key, name: c.person.name, role: c.person.role, clients: c.person.clients })),
    toUpdateCount: toUpdate.length,
    toUpdate: toUpdate.map((u) => ({ email: u.key, diffs: u.diffs })),
    unchangedCount: unchanged.length,
    extraInFirestoreNotInTarget: extraInFirestore
  };

  writeFileSync('scratch/sync_report.json', JSON.stringify(report, null, 2));
  console.log(`Target: ${report.totalTarget} | Existing: ${report.totalCurrentFirestore} | To create: ${report.toCreateCount} | To update: ${report.toUpdateCount} | Unchanged: ${report.unchangedCount} | Extra (untouched): ${extraInFirestore.length}`);

  if (!APPLY) {
    console.log('DRY RUN ONLY (no --apply flag). Report written to scratch/sync_report.json. No writes performed.');
    process.exit(0);
  }

  console.log('Applying writes...');
  let written = 0;
  for (const { key, person } of [...toCreate, ...toUpdate]) {
    await setDoc(doc(db, 'user_clients', key), {
      email: key,
      name: person.name,
      role: person.role,
      clients: person.clients || []
    }, { merge: true });
    written++;
  }
  console.log(`Wrote ${written} documents to user_clients.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('ERROR', err);
  process.exit(1);
});
