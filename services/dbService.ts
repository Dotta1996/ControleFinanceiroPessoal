
import { db } from '../firebase';
import firebase from 'firebase/compat/app';

export const dbService = {
  /**
   * Obtém o ano a partir de uma data (string ISO ou objeto Date)
   */
  getYearFromDate: (date: any): string => {
    if (!date) return new Date().getFullYear().toString();
    if (typeof date === 'string') {
      return date.split('-')[0];
    }
    if (date instanceof Date) {
      return date.getFullYear().toString();
    }
    return new Date().getFullYear().toString();
  },

  /**
   * Salva um item em um documento anual
   */
  saveItem: async (uid: string, collection: string, item: any) => {
    const year = dbService.getYearFromDate(item.date);
    const docRef = db.collection('usuarios').doc(uid).collection(collection).doc(year);
    
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
   * Salva múltiplos itens (batch) em documentos anuais
   */
  saveItems: async (uid: string, collection: string, items: any[]) => {
    const byYear: Record<string, any[]> = {};
    items.forEach(item => {
      const year = dbService.getYearFromDate(item.date);
      if (!byYear[year]) byYear[year] = [];
      const newItem = { 
        ...item, 
        id: item.id || Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        createdAt: item.createdAt || new Date().toISOString()
      };
      byYear[year].push(newItem);
    });

    for (const year in byYear) {
      const docRef = db.collection('usuarios').doc(uid).collection(collection).doc(year);
      await docRef.set({
        items: firebase.firestore.FieldValue.arrayUnion(...byYear[year])
      }, { merge: true });
    }
  },

  /**
   * Atualiza um item em um documento anual
   */
  updateItem: async (uid: string, collection: string, itemId: string, year: string, updatedData: any) => {
    const docRef = db.collection('usuarios').doc(uid).collection(collection).doc(year);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const items = doc.data()?.items || [];
      const index = items.findIndex((i: any) => i.id === itemId);
      if (index !== -1) {
        const oldItem = items[index];
        const newYear = dbService.getYearFromDate(updatedData.date);
        
        if (newYear !== year) {
          // Remover do ano antigo
          await docRef.update({
            items: firebase.firestore.FieldValue.arrayRemove(oldItem)
          });
          // Adicionar ao novo ano
          await dbService.saveItem(uid, collection, { ...oldItem, ...updatedData });
        } else {
          // Atualizar no mesmo ano
          const updatedItem = { ...oldItem, ...updatedData };
          items[index] = updatedItem;
          await docRef.update({ items });
        }
      }
    }
  },

  /**
   * Exclui um item de um documento anual
   */
  deleteItem: async (uid: string, collection: string, itemId: string, year: string) => {
    const docRef = db.collection('usuarios').doc(uid).collection(collection).doc(year);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const items = doc.data()?.items || [];
      const itemToDelete = items.find((i: any) => i.id === itemId);
      if (itemToDelete) {
        await docRef.update({
          items: firebase.firestore.FieldValue.arrayRemove(itemToDelete)
        });
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
