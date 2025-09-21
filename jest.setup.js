import "@testing-library/jest-dom";

// Mock Firebase
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: {
    fromDate: jest.fn(),
  },
}));

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(),
}));

// Mock FFTT API
jest.mock("@omichalo/ffttapi-node", () => ({
  FFTTApi: jest.fn().mockImplementation(() => ({
    getJoueur: jest.fn(),
    rechercheJoueur: jest.fn(),
    getMatches: jest.fn(),
  })),
}));

// Mock react-beautiful-dnd
jest.mock("react-beautiful-dnd", () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({}, {}),
  Draggable: ({ children }) => children({}, {}),
}));

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:abcdef";
process.env.ID_FFTT = "test-fftt-id";
process.env.PWD_FFTT = "test-fftt-password";
