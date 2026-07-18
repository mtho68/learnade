const DB_NAME = "learnade";
const STORE = "learning-library";

let databasePromise:Promise<IDBDatabase>|null=null;

function db() {
  databasePromise ||= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

export async function loadLibrary<T>(): Promise<T[]> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLibraryItem<T>(item: T) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const transaction=database.transaction(STORE,"readwrite");
    transaction.objectStore(STORE).put(item);
    transaction.oncomplete=()=>resolve(); transaction.onerror=()=>reject(transaction.error); transaction.onabort=()=>reject(transaction.error);
  });
}

export async function deleteLibraryItem(id: string) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const transaction=database.transaction(STORE,"readwrite");
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete=()=>resolve(); transaction.onerror=()=>reject(transaction.error); transaction.onabort=()=>reject(transaction.error);
  });
}
