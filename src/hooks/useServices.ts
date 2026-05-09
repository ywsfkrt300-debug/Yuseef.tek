import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface ServiceField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
}

export interface Service {
  id: string;
  name: string;
  company: string;
  price: number;
  dynamicPrice?: boolean;
  iconType?: string;
  iconBgClass?: string;
  iconTextClass?: string;
  fields?: ServiceField[];
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export function useServices(onlyActive = true) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, 'services'));
    if (onlyActive) {
      q = query(q, where('isActive', '==', true));
    }
    
    // In production we might order by createdAt desc, but requires index for compound query
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const svcs: Service[] = [];
      snapshot.forEach((doc) => {
        svcs.push({ id: doc.id, ...doc.data() } as Service);
      });
      setServices(svcs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onlyActive]);

  return { services, loading };
}
