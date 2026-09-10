
import { db } from '../firebase';
import firebase from 'firebase/compat/app';

export const dbService = {
  /**
   * Obtém o ano a partir de uma data (string ISO ou objeto Date)
   */
  getYearFromDate: (date: any): string => {
    if (!date) return new Date().getFullYear().toString();
    if (typeof date === 'string') {
      const trimmed = date.trim();
      const ymd = trimmed.match(/^(\d{4})/);
      if (ymd) return ymd[1];
      const dmy = trimmed.match(/\/(\d{4})/);
      if (dmy) return dmy[1];
      const d = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T12:00:00`);
      if (!isNaN(d.getTime())) return d.getFullYear().toString();
      return trimmed.split('-')[0];
    }
    if (date instanceof Date) {
      return date.getFullYear().toString();
    }
    return new Date().getFullYear().toString();
  },

  /**
   * Obtém o mês (1 a 12) a partir de uma data de forma imune a timezones
   */
  getMonthFromDate: (date: any): number => {
    if (!date) return new Date().getMonth() + 1;
    if (typeof date === 'string') {
      const trimmed = date.trim();
      const ymd = trimmed.match(/^\d{4}-(\d{1,2})/);
      if (ymd) return parseInt(ymd[1], 10);
      const dmy = trimmed.match(/^\d{1,2}\/(\d{1,2})/);
      if (dmy) return parseInt(dmy[1], 10);
      const d = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T12:00:00`);
      if (!isNaN(d.getTime())) return d.getMonth() + 1;
    }
    if (date instanceof Date) {
      return date.getMonth() + 1;
    }
    return new Date().getMonth() + 1;
  },

  /**
   * Obtém a chave mensal no formato YYYY-MM (ex: 2026-03)
   */
  getMonthKeyFromDate: (date: any): string => {
    const year = dbService.getYearFromDate(date);
    const month = String(dbService.getMonthFromDate(date)).padStart(2, '0');
    return `${year}-${month}`;
  },

  /**
   * Retorna a chave do documento de armazenamento:
   * - 'transacoes': particionado mensalmente (ex: "2026-03") para manter documentos leves
   * - demais coleções: particionadas anualmente (ex: "2026")
   */
  getDocKey: (collection: string, date: any): string => {
    if (collection === 'transacoes') {
      return dbService.getMonthKeyFromDate(date);
    }
    return dbService.getYearFromDate(date);
  },

  /**
   * Salva um item em um documento (mensal para transações, anual para demais coleções)
   */
  saveItem: async (uid: string, collection: string, item: any) => {
    const docKey = dbService.getDocKey(collection, item.date);
    const docRef = db.collection('usuarios').doc(uid).collection(collection).doc(docKey);
    
    const newItem = { 
      ...item, 
      id: item.id || Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      createdAt: item.createdAt || new Date().toISOString()
    };

    await docRef.set({
      items: firebase.firestore.FieldValue.arrayUnion(newItem)
    }, { merge: true });

    return newItem.id;
  },

  /**
   * Salva múltiplos itens (batch) particionados adequadamente
   */
  saveItems: async (uid: string, collection: string, items: any[]) => {
    const byKey: Record<string, any[]> = {};
    items.forEach(item => {
      const docKey = dbService.getDocKey(collection, item.date);
      if (!byKey[docKey]) byKey[docKey] = [];
      const newItem = { 
        ...item, 
        id: item.id || Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        createdAt: item.createdAt || new Date().toISOString()
      };
      byKey[docKey].push(newItem);
    });

    for (const docKey in byKey) {
      const docRef = db.collection('usuarios').doc(uid).collection(collection).doc(docKey);
      await docRef.set({
        items: firebase.firestore.FieldValue.arrayUnion(...byKey[docKey])
      }, { merge: true });
    }
  },

  /**
   * Atualiza um item com suporte a mudança de documento (mês ou ano)
   */
  updateItem: async (uid: string, collection: string, itemId: string, docKeyHint: string, updatedData: any) => {
    const colRef = db.collection('usuarios').doc(uid).collection(collection);
    let targetDocRef: firebase.firestore.DocumentReference | null = null;
    let oldItem: any = null;

    // 1. Tentar localizar direto pelo hint (pode ser "2026-03" ou "2026")
    if (docKeyHint) {
      const hintRef = colRef.doc(docKeyHint);
      const hintSnap = await hintRef.get();
      if (hintSnap.exists) {
        const items = hintSnap.data()?.items || [];
        const found = items.find((i: any) => i.id === itemId);
        if (found) {
          targetDocRef = hintRef;
          oldItem = found;
        }
      }
    }

    // 2. Se não encontrou pelo hint, procurar em todos os docs da coleção
    if (!oldItem) {
      const snap = await colRef.get();
      for (const doc of snap.docs) {
        const items = doc.data()?.items || [];
        const found = items.find((i: any) => i.id === itemId);
        if (found) {
          targetDocRef = doc.ref;
          oldItem = found;
          break;
        }
      }
    }

    if (!oldItem || !targetDocRef) {
      // Se não encontrou o item anterior, salva como novo
      await dbService.saveItem(uid, collection, { id: itemId, ...updatedData });
      return;
    }

    const newDocKey = dbService.getDocKey(collection, updatedData.date || oldItem.date);
    const isSameDoc = targetDocRef.id === newDocKey;

    if (!isSameDoc) {
      // Remove do documento antigo
      await targetDocRef.update({
        items: firebase.firestore.FieldValue.arrayRemove(oldItem)
      });
      // Adiciona no novo documento mensal/anual
      await dbService.saveItem(uid, collection, { ...oldItem, ...updatedData });
    } else {
      // Atualiza dentro do mesmo documento
      const docSnap = await targetDocRef.get();
      const items = docSnap.data()?.items || [];
      const index = items.findIndex((i: any) => i.id === itemId);
      if (index !== -1) {
        items[index] = { ...oldItem, ...updatedData };
        await targetDocRef.update({ items });
      }
    }
  },

  /**
   * Exclui um item de um documento com suporte a chave mensal ou anual
   */
  deleteItem: async (uid: string, collection: string, itemId: string, docKeyHint?: string) => {
    const colRef = db.collection('usuarios').doc(uid).collection(collection);

    // 1. Tentar direto pelo hint
    if (docKeyHint) {
      const hintRef = colRef.doc(docKeyHint);
      const hintSnap = await hintRef.get();
      if (hintSnap.exists) {
        const items = hintSnap.data()?.items || [];
        const itemToDelete = items.find((i: any) => i.id === itemId);
        if (itemToDelete) {
          await hintRef.update({
            items: firebase.firestore.FieldValue.arrayRemove(itemToDelete)
          });
          return;
        }
      }
    }

    // 2. Se não achou pelo hint, procurar em todos os documentos da coleção
    const snap = await colRef.get();
    for (const doc of snap.docs) {
      const items = doc.data()?.items || [];
      const itemToDelete = items.find((i: any) => i.id === itemId);
      if (itemToDelete) {
        await doc.ref.update({
          items: firebase.firestore.FieldValue.arrayRemove(itemToDelete)
        });
        return;
      }
    }
  },

  /**
   * Escuta uma coleção e retorna todos os itens de todos os anos achatados
   */
  listenCollection: (uid: string, collection: string, callback: (items: any[]) => void) => {
    return db.collection('usuarios').doc(uid).collection(collection)
      .onSnapshot(snap => {
        let allItems: any[] = [];
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data && Array.isArray(data.items)) {
            allItems = [...allItems, ...data.items];
          }
        });
        callback(allItems);
      }, (err) => {
        console.warn(`Erro ao escutar coleção ${collection}:`, err);
        callback([]);
      });
  },

  /**
   * Busca um item específico pelo ID em todos os anos (fallback lento)
   */
  getItemById: async (uid: string, collection: string, itemId: string) => {
    const snap = await db.collection('usuarios').doc(uid).collection(collection).get();
    for (const doc of snap.docs) {
      const items = doc.data()?.items || [];
      const found = items.find((i: any) => i.id === itemId);
      if (found) return { ...found, year: doc.id };
    }
    return null;
  },

  /**
   * Busca todos os itens de uma coleção (one-time fetch)
   */
  getCollection: async (uid: string, collection: string) => {
    const snap = await db.collection('usuarios').doc(uid).collection(collection).get();
    let allItems: any[] = [];
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (data && Array.isArray(data.items)) {
        allItems = [...allItems, ...data.items];
      }
    });
    return allItems;
  }
};
