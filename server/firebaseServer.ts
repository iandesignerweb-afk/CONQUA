import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import config from '../firebase-applet-config.json' with { type: 'json' };

const app = !getApps().length ? initializeApp(config) : getApp();

export const db = getFirestore(app, config.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Helper function to convert Firestore docs to typed JS objects with string `id`
function snapToData<T>(snap: any): T[] {
  return snap.docs.map((d: any) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
    } as T;
  });
}

// -------------------------------------------------------------
// FIRESTORE CRUD HELPERS
// -------------------------------------------------------------

// Collection reference helper
const col = (name: string) => collection(db, name);

// USERS
export async function getUsers() {
  const snap = await getDocs(col('users'));
  return snapToData<any>(snap);
}

export async function getUserById(id: string) {
  const d = await getDoc(doc(db, 'users', String(id)));
  if (!d.exists()) return null;
  return { ...d.data(), id: d.id } as any;
}

export async function findUserByUsernameOrEmail(identifier: string) {
  const clean = identifier.trim().toLowerCase();
  const allUsers = await getUsers();
  return allUsers.find(
    (u: any) =>
      (u.usuario && u.usuario.toLowerCase() === clean) ||
      (u.email && u.email.toLowerCase() === clean)
  ) || null;
}

export async function createUserDoc(data: any) {
  const newId = data.id ? String(data.id) : doc(col('users')).id;
  const newDoc = {
    ...data,
    id: newId,
    created_at: data.created_at || new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', newId), newDoc);
  return newDoc;
}

export async function updateUserDoc(id: string, updates: any) {
  const ref = doc(db, 'users', String(id));
  await updateDoc(ref, updates);
  const updated = await getDoc(ref);
  return { ...updated.data(), id: updated.id } as any;
}

export async function deleteUserDoc(id: string) {
  await deleteDoc(doc(db, 'users', String(id)));
}

// CIDADES
export async function getCidades() {
  const snap = await getDocs(col('cidades'));
  const list = snapToData<any>(snap);
  return list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

export async function getCidadeById(id: string) {
  const d = await getDoc(doc(db, 'cidades', String(id)));
  if (!d.exists()) return null;
  return { ...d.data(), id: d.id } as any;
}

export async function createCidadeDoc(data: any) {
  const ref = doc(col('cidades'));
  const newDoc = {
    ...data,
    id: ref.id,
    created_at: new Date().toISOString(),
  };
  await setDoc(ref, newDoc);
  return newDoc;
}

export async function updateCidadeDoc(id: string, updates: any) {
  const ref = doc(db, 'cidades', String(id));
  await updateDoc(ref, updates);
  const updated = await getDoc(ref);
  return { ...updated.data(), id: updated.id } as any;
}

export async function deleteCidadeDoc(id: string) {
  await deleteDoc(doc(db, 'cidades', String(id)));
}

// BAIRROS
export async function getBairros() {
  const snap = await getDocs(col('bairros'));
  const list = snapToData<any>(snap);
  return list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

export async function getBairroById(id: string) {
  const d = await getDoc(doc(db, 'bairros', String(id)));
  if (!d.exists()) return null;
  return { ...d.data(), id: d.id } as any;
}

export async function createBairroDoc(data: any) {
  const ref = doc(col('bairros'));
  const newDoc = {
    ...data,
    id: ref.id,
    created_at: new Date().toISOString(),
  };
  await setDoc(ref, newDoc);
  return newDoc;
}

export async function updateBairroDoc(id: string, updates: any) {
  const ref = doc(db, 'bairros', String(id));
  await updateDoc(ref, updates);
  const updated = await getDoc(ref);
  return { ...updated.data(), id: updated.id } as any;
}

export async function deleteBairroDoc(id: string) {
  await deleteDoc(doc(db, 'bairros', String(id)));
}

// QUADRAS
export async function getQuadras() {
  const snap = await getDocs(col('quadras'));
  return snapToData<any>(snap);
}

export async function getQuadraById(id: string) {
  const d = await getDoc(doc(db, 'quadras', String(id)));
  if (!d.exists()) return null;
  return { ...d.data(), id: d.id } as any;
}

export async function createQuadraDoc(data: any) {
  const ref = doc(col('quadras'));
  const newDoc = {
    ...data,
    id: ref.id,
    created_at: new Date().toISOString(),
  };
  await setDoc(ref, newDoc);
  return newDoc;
}

export async function bulkCreateQuadrasDocs(inserts: any[]) {
  const created: any[] = [];
  for (const item of inserts) {
    const ref = doc(col('quadras'));
    const newDoc = {
      ...item,
      id: ref.id,
      created_at: new Date().toISOString(),
    };
    await setDoc(ref, newDoc);
    created.push(newDoc);
  }
  return created;
}

export async function updateQuadraDoc(id: string, updates: any) {
  const ref = doc(db, 'quadras', String(id));
  await updateDoc(ref, updates);
  const updated = await getDoc(ref);
  return { ...updated.data(), id: updated.id } as any;
}

export async function deleteQuadraDoc(id: string) {
  await deleteDoc(doc(db, 'quadras', String(id)));
}

// CARTOES
export async function getCartoes() {
  const snap = await getDocs(col('cartoes'));
  return snapToData<any>(snap);
}

export async function getCartaoById(id: string) {
  const d = await getDoc(doc(db, 'cartoes', String(id)));
  if (!d.exists()) return null;
  return { ...d.data(), id: d.id } as any;
}

export async function createCartaoDoc(data: any) {
  const ref = doc(col('cartoes'));
  const newDoc = {
    ...data,
    id: ref.id,
    created_at: new Date().toISOString(),
  };
  await setDoc(ref, newDoc);
  return newDoc;
}

export async function updateCartaoDoc(id: string, updates: any) {
  const ref = doc(db, 'cartoes', String(id));
  await updateDoc(ref, updates);
  const updated = await getDoc(ref);
  return { ...updated.data(), id: updated.id } as any;
}

export async function deleteCartaoDoc(id: string) {
  await deleteDoc(doc(db, 'cartoes', String(id)));
}

// CARTAO_QUADRAS (Joins)
export async function getCartaoQuadras() {
  const snap = await getDocs(col('cartao_quadras'));
  return snapToData<any>(snap);
}

export async function addCartaoQuadras(joins: { cartao_id: string; quadra_id: string }[]) {
  for (const j of joins) {
    const ref = doc(col('cartao_quadras'));
    await setDoc(ref, { ...j, id: ref.id, created_at: new Date().toISOString() });
  }
}

export async function deleteCartaoQuadrasByCartaoId(cartaoId: string) {
  const snap = await getDocs(col('cartao_quadras'));
  for (const d of snap.docs) {
    if (d.data().cartao_id === String(cartaoId)) {
      await deleteDoc(d.ref);
    }
  }
}

// CARTAO_DESIGNACOES
export async function getCartaoDesignacoes() {
  const snap = await getDocs(col('cartao_designacoes'));
  return snapToData<any>(snap);
}

export async function addCartaoDesignacoes(rows: any[]) {
  for (const r of rows) {
    const ref = doc(col('cartao_designacoes'));
    await setDoc(ref, { ...r, id: ref.id, created_at: new Date().toISOString() });
  }
}

export async function deleteCartaoDesignacoesByCartaoId(cartaoId: string) {
  const snap = await getDocs(col('cartao_designacoes'));
  for (const d of snap.docs) {
    if (d.data().cartao_id === String(cartaoId)) {
      await deleteDoc(d.ref);
    }
  }
}

// HISTORICO
export async function getHistorico() {
  const snap = await getDocs(col('historico'));
  const list = snapToData<any>(snap);
  return list.sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || ''));
}

export async function addHistoricoDocs(entries: any | any[]) {
  const list = Array.isArray(entries) ? entries : [entries];
  for (const item of list) {
    const ref = doc(col('historico'));
    await setDoc(ref, {
      ...item,
      id: ref.id,
      data_hora: item.data_hora || new Date().toISOString(),
    });
  }
}

// AUDIT LOGS
export async function getAuditLogs() {
  const snap = await getDocs(col('audit_logs'));
  const list = snapToData<any>(snap);
  return list.sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || ''));
}

export async function addAuditLogDoc(entry: any) {
  const ref = doc(col('audit_logs'));
  await setDoc(ref, {
    ...entry,
    id: ref.id,
    data_hora: entry.data_hora || new Date().toISOString(),
  });
}
