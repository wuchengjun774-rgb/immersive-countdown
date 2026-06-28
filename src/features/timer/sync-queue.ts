export type PendingSession = {
  syncKey: string;
  mode: "focus" | "leisure";
  startedAt: string;
  endedAt: string;
  durationMs: number;
  interrupted: boolean;
};

export interface Queue {
  items(): Promise<PendingSession[]>;
  remove(syncKey: string): Promise<void>;
  put(record: PendingSession): Promise<void>;
}

const DATABASE_NAME = "immersive-countdown";
const STORE_NAME = "timer-session-sync";
const DATABASE_VERSION = 1;

function upsertRecord(records: PendingSession[], record: PendingSession) {
  const next = records.filter((item) => item.syncKey !== record.syncKey);
  next.push(record);
  return next;
}

export function createMemoryQueue(initial: PendingSession[] = []): Queue {
  let records = [...initial];

  return {
    async items() {
      return [...records];
    },
    async remove(syncKey) {
      records = records.filter((record) => record.syncKey !== syncKey);
    },
    async put(record) {
      records = upsertRecord(records, record);
    },
  };
}

function openRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed")));
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed")));
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")));
  });
}

function createIndexedDbQueue(indexedDBFactory: IDBFactory): Queue {
  let dbPromise: Promise<IDBDatabase> | null = null;

  const getDatabase = () => {
    dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDBFactory.open(DATABASE_NAME, DATABASE_VERSION);

      request.addEventListener("upgradeneeded", () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "syncKey" });
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error ?? new Error("Failed to open IndexedDB")));
    });

    return dbPromise;
  };

  return {
    async items() {
      const database = await getDatabase();
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const records = await openRequest(store.getAll()) as PendingSession[];

      await transactionComplete(transaction);

      return records;
    },
    async remove(syncKey) {
      const database = await getDatabase();
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).delete(syncKey);

      await transactionComplete(transaction);
    },
    async put(record) {
      const database = await getDatabase();
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).put(record);

      await transactionComplete(transaction);
    },
  };
}

export function createSessionQueue(options: { indexedDB?: IDBFactory | null } = {}): Queue {
  const indexedDBFactory =
    options.indexedDB === undefined ? globalThis.indexedDB ?? null : options.indexedDB;

  if (indexedDBFactory) {
    return createIndexedDbQueue(indexedDBFactory);
  }

  return createMemoryQueue();
}

let defaultSessionQueue: Queue | null = null;

function getDefaultSessionQueue() {
  defaultSessionQueue ??= createSessionQueue();

  return defaultSessionQueue;
}

export function getDefaultSessionQueueForTests() {
  return getDefaultSessionQueue();
}

export function resetDefaultSessionQueueForTests(options?: { indexedDB?: IDBFactory | null }) {
  defaultSessionQueue = options ? createSessionQueue(options) : null;

  return defaultSessionQueue;
}

export async function enqueueSession(record: PendingSession, queue: Queue = getDefaultSessionQueue()) {
  await queue.put(record);
}

export async function flushSessions(queue: Queue | undefined, send: (r: PendingSession) => Promise<boolean>) {
  const targetQueue = queue ?? getDefaultSessionQueue();

  for (const record of await targetQueue.items()) {
    if (await send(record)) {
      await targetQueue.remove(record.syncKey);
    }
  }
}
