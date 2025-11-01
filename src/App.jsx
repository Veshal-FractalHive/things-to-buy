import { useState, useEffect } from 'react'
import { getAllItems, saveAllItems, deleteItem as deleteItemFromDB } from './utils/indexedDB'

function App() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    link: '',
    price: ''
  })
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({
    name: '',
    link: '',
    price: ''
  })

  // Load items from IndexedDB on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true)
        const loadedItems = await getAllItems()
        setItems(loadedItems)
        
        // Migrate from localStorage if IndexedDB is empty but localStorage has data
        if (loadedItems.length === 0) {
          const savedItems = localStorage.getItem('wishlistItems')
          if (savedItems) {
            const parsedItems = JSON.parse(savedItems)
            if (parsedItems.length > 0) {
              await saveAllItems(parsedItems)
              setItems(parsedItems)
              localStorage.removeItem('wishlistItems') // Clear localStorage after migration
            }
          }
        }
      } catch (error) {
        console.error('Error loading items:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadItems()
  }, [])

  // Save items to IndexedDB whenever items change (debounced)
  useEffect(() => {
    if (!isLoading && items.length >= 0) {
      const saveItems = async () => {
        try {
          await saveAllItems(items)
        } catch (error) {
          console.error('Error saving items:', error)
        }
      }
      
      // Debounce saves to avoid too many writes
      const timeoutId = setTimeout(saveItems, 300)
      return () => clearTimeout(timeoutId)
    }
  }, [items, isLoading])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle edit input changes
  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Add new item
  const handleAddItem = (e) => {
    e.preventDefault()
    if (formData.name.trim() && formData.link.trim() && formData.price.trim()) {
      const newItem = {
        id: Date.now(),
        name: formData.name.trim(),
        link: formData.link.trim(),
        price: formData.price.trim(),
        bought: false
      }
      setItems(prev => [...prev, newItem])
      setFormData({ name: '', link: '', price: '' })
    }
  }

  // Start editing an item
  const handleStartEdit = (item) => {
    setEditingId(item.id)
    setEditData({
      name: item.name,
      link: item.link,
      price: item.price
    })
  }

  // Save edited item
  const handleSaveEdit = (id) => {
    if (editData.name.trim() && editData.link.trim() && editData.price.trim()) {
      setItems(prev => prev.map(item => 
        item.id === id 
          ? { ...item, name: editData.name.trim(), link: editData.link.trim(), price: editData.price.trim() }
          : item
      ))
      setEditingId(null)
      setEditData({ name: '', link: '', price: '' })
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData({ name: '', link: '', price: '' })
  }

  // Delete item
  const handleDeleteItem = async (id) => {
    try {
      await deleteItemFromDB(id)
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error deleting item:', error)
      // Still update UI even if DB operation fails
      setItems(prev => prev.filter(item => item.id !== id))
    }
  }

  // Toggle bought status
  const handleToggleBought = (id) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, bought: !item.bought } : item
    ))
  }

  // Calculate total price for items not bought
  const calculateTotal = () => {
    return items
      .filter(item => !item.bought)
      .reduce((total, item) => {
        const price = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0
        return total + price
      }, 0)
  }

  const needToBuyItems = items.filter(item => !item.bought)
  const boughtItems = items.filter(item => item.bought)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your wishlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          Things To Buy
        </h1>

        {/* Add Item Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Add New Item</h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Item Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Wireless Headphones"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
                Product Link
              </label>
              <input
                type="url"
                id="link"
                name="link"
                value={formData.link}
                onChange={handleInputChange}
                placeholder="https://www.amazon.com/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="text"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="e.g., ₹1,299 or ₹2,500"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Add Item
            </button>
          </form>
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="text-gray-700">
                <span className="font-semibold">Total Items:</span> {items.length}
              </div>
              <div className="text-gray-700">
                <span className="font-semibold">Need to Buy:</span> {needToBuyItems.length}
              </div>
              <div className="text-gray-700">
                <span className="font-semibold">Bought:</span> {boughtItems.length}
              </div>
              {needToBuyItems.length > 0 && (
                <div className="text-lg font-bold text-blue-600">
                  Total: ₹{calculateTotal().toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items List - Need to Buy */}
        {needToBuyItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Need to Buy ({needToBuyItems.length})
            </h2>
            <div className="space-y-4">
              {needToBuyItems.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  {editingId === item.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={editData.name}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Link
                        </label>
                        <input
                          type="url"
                          name="link"
                          value={editData.link}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price
                        </label>
                        <input
                          type="text"
                          name="price"
                          value={editData.price}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {item.name}
                          </h3>
                          <p className="text-lg font-bold text-blue-600 mb-2">
                            {item.price}
                          </p>
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            View Product
                          </a>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleToggleBought(item.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Mark as Bought
                        </button>
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items List - Bought */}
        {boughtItems.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Bought ({boughtItems.length})
            </h2>
            <div className="space-y-4">
              {boughtItems.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 opacity-75">
                  {editingId === item.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={editData.name}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Link
                        </label>
                        <input
                          type="url"
                          name="link"
                          value={editData.link}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price
                        </label>
                        <input
                          type="text"
                          name="price"
                          value={editData.price}
                          onChange={handleEditChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-800">
                              {item.name}
                            </h3>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                              BOUGHT
                            </span>
                          </div>
                          <p className="text-lg font-bold text-green-600 mb-2">
                            {item.price}
                          </p>
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            View Product
                          </a>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleToggleBought(item.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Mark as Need to Buy
                        </button>
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">Your wishlist is empty. Add some items to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App