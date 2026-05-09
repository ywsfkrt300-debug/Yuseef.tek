import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { User, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "user" | "admin";
  walletBalance: number;
  phoneNumber?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  register: (email: string, password: string, displayName: string, phone: string, birthDate: string, governorate: string) => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // We temporarily store extra registration data so we can save it to Firestore when onAuthStateChanged triggers after registration
  const [pendingRegistrationData, setPendingRegistrationData] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          let userSnap = await getDoc(userDocRef);
          
          if (!userSnap.exists()) {
            const dataToSave = pendingRegistrationData || {
              displayName: firebaseUser.displayName || "",
              phoneNumber: "",
              birthDate: "",
              governorate: ""
            };
            
            const newProfile = {
              email: firebaseUser.email || "",
              role: "user",
              walletBalance: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              displayName: dataToSave.displayName,
              phoneNumber: dataToSave.phoneNumber,
              birthDate: dataToSave.birthDate,
              governorate: dataToSave.governorate
            };
            await setDoc(userDocRef, newProfile);
            userSnap = await getDoc(userDocRef);
            setPendingRegistrationData(null);
          }

          const userData = userSnap.data();
          if (userData) {
             setUser({
               uid: firebaseUser.uid,
               email: userData.email,
               displayName: userData.displayName,
               role: userData.role,
               walletBalance: userData.walletBalance,
               phoneNumber: userData.phoneNumber,
             });
          }
        } catch (error) {
           handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
           setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pendingRegistrationData]);

  const register = async (email: string, password: string, displayName: string, phone: string, birthDate: string, governorate: string) => {
    setPendingRegistrationData({ displayName, phoneNumber: phone, birthDate, governorate });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
       console.error("Registration failed", error);
       throw error;
    }
  };

  const login = async (identifier: string, password: string) => {
    let emailToUse = identifier;

    // Check if it's likely a phone number (e.g. starts with 09 or just digits)
    if (/^\d+$/.test(identifier)) {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const q = query(collection(db, "users"), where("phoneNumber", "==", identifier));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error("لم يتم العثور على حساب مرتبط بهذا الرقم");
      }
      emailToUse = snap.docs[0].data().email;
    }

    try {
      await signInWithEmailAndPassword(auth, emailToUse, password);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error("خطأ في البيانات أو كلمة المرور");
      }
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
