import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function logAction(
  userId: string,
  userEmail: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: 'Vehicle' | 'Purchase' | 'Sale' | 'Document' | 'Party',
  entityId: string,
  details: any
) {
  try {
    if (!db) return;
    await addDoc(collection(db, 'audit_logs'), {
      timestamp: Timestamp.now(),
      userId,
      userEmail,
      action,
      entityType,
      entityId,
      details,
    });
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}
