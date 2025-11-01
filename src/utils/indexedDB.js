// IndexedDB utility functions for wishlist storage

const DB_NAME = 'WishlistDB'
const DB_VERSION = 1
const STORE_NAME = 'items'

// Initialize database
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: false })
        objectStore.createIndex('bought', 'bought', { unique: false })
      }
    }
  })
}

// Get all items
export const getAllItems = async () => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(new Error('Failed to get items from IndexedDB'))
      }
    })
  } catch (error) {
    console.error('Error getting items:', error)
    return []
  }
}

// Save item
export const saveItem = async (item) => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(item)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to save item to IndexedDB'))
      }
    })
  } catch (error) {
    console.error('Error saving item:', error)
    throw error
  }
}

// Delete item
export const deleteItem = async (id) => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to delete item from IndexedDB'))
      }
    })
  } catch (error) {
    console.error('Error deleting item:', error)
    throw error
  }
}

// Save all items (batch operation)
export const saveAllItems = async (items) => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      // Clear existing items
      const clearRequest = store.clear()
      
      clearRequest.onsuccess = () => {
        // Add all items
        const promises = items.map(item => {
          return new Promise((resolveItem, rejectItem) => {
            const addRequest = store.put(item)
            addRequest.onsuccess = () => resolveItem()
            addRequest.onerror = () => rejectItem(new Error('Failed to add item'))
          })
        })
        
        Promise.all(promises)
          .then(() => {
            transaction.oncomplete = () => resolve()
            transaction.onerror = () => reject(new Error('Transaction failed'))
          })
          .catch(reject)
      }
      
      clearRequest.onerror = () => {
        reject(new Error('Failed to clear IndexedDB'))
      }
    })
  } catch (error) {
    console.error('Error saving all items:', error)
    throw error
  }
}

