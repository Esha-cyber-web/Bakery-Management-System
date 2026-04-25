import { useState } from 'react';
import { useApp, Product } from './AppContext';
import { Plus, Edit2, Trash2, Package, TrendingUp, DollarSign, BarChart2 } from 'lucide-react';

interface ProductFormData extends Omit<Product, 'id'> {
  costPrice: number;
}

export function InventoryManagement() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '', category: '', unit: 'kg',
    price: 0, costPrice: 0, stock: 0, minStock: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProduct(editingId, formData);
        setEditingId(null);
      } else {
        await addProduct(formData);
      }
      setFormData({ name: '', category: '', unit: 'kg', price: 0, costPrice: 0, stock: 0, minStock: 0 });
      setShowForm(false);
    } catch (error) {
      alert('Failed to save product. Please try again.');
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      costPrice: (product as any).costPrice || 0,
      stock: product.stock,
      minStock: product.minStock,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  // ✅ Summary calculations
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalCostValue = products.reduce((sum, p) => sum + (((p as any).costPrice || 0) * p.stock), 0);
  const totalProfit = totalStockValue - totalCostValue;
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  // ✅ Only show cost/profit columns if ANY product has costPrice > 0
  const hasCostData = products.some(p => (p as any).costPrice > 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Inventory Management</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {totalProducts} products · RS.{totalStockValue.toLocaleString()} total selling value
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', category: '', unit: 'kg', price: 0, costPrice: 0, stock: 0, minStock: 0 });
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-semibold"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* ✅ Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-50 p-2 rounded-lg"><Package className="text-blue-600" size={16}/></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Products</p>
          </div>
          <p className="text-2xl font-black text-gray-800">{totalProducts}</p>
          {lowStockCount > 0 && (
            <p className="text-[10px] text-red-500 font-semibold mt-1">⚠️ {lowStockCount} low stock</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-green-50 p-2 rounded-lg"><BarChart2 className="text-green-600" size={16}/></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Selling Value</p>
          </div>
          <p className="text-xl font-black text-green-600">RS. {totalStockValue.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 mt-1">At selling price</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-orange-50 p-2 rounded-lg"><DollarSign className="text-orange-600" size={16}/></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Cost</p>
          </div>
          {hasCostData ? (
            <>
              <p className="text-xl font-black text-orange-600">RS. {totalCostValue.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 mt-1">Purchase value</p>
            </>
          ) : (
            <>
              <p className="text-xl font-black text-gray-300">—</p>
              <p className="text-[10px] text-gray-400 mt-1">Add cost price to products</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-purple-50 p-2 rounded-lg"><TrendingUp className="text-purple-600" size={16}/></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Expected Profit</p>
          </div>
          {hasCostData ? (
            <>
              <p className={`text-xl font-black ${totalProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                RS. {totalProfit.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {totalCostValue > 0 ? `${((totalProfit / totalCostValue) * 100).toFixed(1)}% margin` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-black text-gray-300">—</p>
              <p className="text-[10px] text-gray-400 mt-1">Add cost price to see profit</p>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-wider">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Product Name</label>
              <input type="text" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="e.g. Rice Basmati"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Category</label>
              <input type="text" required value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="e.g. Grains"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Unit</label>
              <select value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="ltr">Liter (ltr)</option>
                <option value="bag">Bag</option>
                <option value="pcs">Pieces</option>
              </select>
            </div>

            {/* ✅ Cost Price — optional */}
            <div>
              <label className="block text-[11px] font-bold text-orange-500 uppercase mb-1">
                💰 Cost Price (RS.) <span className="text-gray-400 normal-case font-normal">(optional)</span>
              </label>
              <input type="number" min="0" step="0.01"
                value={formData.costPrice || ''}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-orange-200 bg-orange-50 rounded text-sm focus:ring-2 focus:ring-orange-400 outline-none font-bold"
                placeholder="e.g. 80"
              />
              <p className="text-[10px] text-gray-400 mt-1">Price you paid to buy this product</p>
            </div>

            {/* ✅ Selling Price — required */}
            <div>
              <label className="block text-[11px] font-bold text-green-600 uppercase mb-1">
                🏷️ Selling Price (RS.) *
              </label>
              <input type="number" required min="0" step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-green-200 bg-green-50 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none font-bold"
                placeholder="e.g. 100"
              />
              <p className="text-[10px] text-gray-400 mt-1">Price you sell to customers</p>
            </div>

            {/* ✅ Profit Preview — only show if costPrice entered */}
            {formData.costPrice > 0 && formData.price > 0 && (
              <div className="flex items-end">
                <div className={`w-full px-3 py-2 rounded text-sm font-bold border ${
                  formData.price - formData.costPrice >= 0
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <p className="text-[10px] uppercase font-bold mb-1 opacity-70">Profit per unit</p>
                  <p className="text-lg">
                    RS. {(formData.price - formData.costPrice).toLocaleString()}
                    <span className="text-xs ml-1 opacity-70">
                      ({((formData.price - formData.costPrice) / formData.costPrice * 100).toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Current Stock</label>
              <input type="number" required min="0" value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Min Stock Alert</label>
              <input type="number" required min="0" value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2 justify-end pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                className="order-2 sm:order-1 px-4 py-2 border border-gray-200 rounded text-sm font-semibold hover:bg-gray-50"
              >Cancel</button>
              <button type="submit"
                className="order-1 sm:order-2 px-4 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 shadow-sm"
              >{editingId ? 'Update' : 'Add'} Product</button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-green-500 uppercase tracking-wider">Sell Price</th>
                {hasCostData && <th className="px-6 py-3 text-left text-[10px] font-bold text-orange-400 uppercase tracking-wider">Cost Price</th>}
                {hasCostData && <th className="px-6 py-3 text-left text-[10px] font-bold text-purple-400 uppercase tracking-wider">Profit/Unit</th>}
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Value</th>
                {hasCostData && <th className="px-6 py-3 text-left text-[10px] font-bold text-purple-400 uppercase tracking-wider">Total Profit</th>}
                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => {
                const costPrice = (product as any).costPrice || 0;
                const profitPerUnit = product.price - costPrice;
                const totalValue = product.price * product.stock;
                const totalCostForProduct = costPrice * product.stock;
                const totalProfitForProduct = totalValue - totalCostForProduct;

                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-50 p-2 rounded hidden sm:block">
                          <Package className="text-green-600" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{product.category}</td>

                    {/* ✅ Selling Price — always show */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                        RS.{product.price.toLocaleString()}
                      </span>
                    </td>

                    {/* ✅ Cost Price — show — if 0 */}
                    {hasCostData && (
                      <td className="px-6 py-4">
                        {costPrice > 0 ? (
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            RS.{costPrice.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}

                    {/* ✅ Profit/Unit — show — if no cost */}
                    {hasCostData && (
                      <td className="px-6 py-4">
                        {costPrice > 0 ? (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            profitPerUnit >= 0 ? 'text-purple-700 bg-purple-50' : 'text-red-600 bg-red-50'
                          }`}>
                            RS.{profitPerUnit.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}

                    <td className="px-6 py-4 text-xs font-medium text-gray-600">
                      {product.stock} <span className="text-[10px] text-gray-400">{product.unit}</span>
                    </td>
                    <td className="px-6 py-4">
                      {product.stock <= product.minStock ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-red-50 text-red-600 rounded-full border border-red-100 uppercase">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-green-50 text-green-600 rounded-full border border-green-100 uppercase">In Stock</span>
                      )}
                    </td>

                    {/* ✅ Total Value — always show */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-800">
                        RS.{totalValue.toLocaleString()}
                      </span>
                    </td>

                    {/* ✅ Total Profit — show — if no cost */}
                    {hasCostData && (
                      <td className="px-6 py-4">
                        {costPrice > 0 ? (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            totalProfitForProduct >= 0 ? 'text-purple-700 bg-purple-50' : 'text-red-600 bg-red-50'
                          }`}>
                            RS.{totalProfitForProduct.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ✅ Footer Totals */}
            {products.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-xs font-black text-gray-700 uppercase">
                    📊 Totals ({products.length} products)
                  </td>

                  {/* Selling Value total */}
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-green-700">RS.{totalStockValue.toLocaleString()}</span>
                    <p className="text-[9px] text-gray-400 uppercase">Selling Value</p>
                  </td>

                  {hasCostData && (
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-orange-600">RS.{totalCostValue.toLocaleString()}</span>
                      <p className="text-[9px] text-gray-400 uppercase">Total Cost</p>
                    </td>
                  )}

                  {hasCostData && (
                    <td className="px-6 py-4">
                      <span className={`text-xs font-black ${totalProfit >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                        {totalCostValue > 0 ? `${((totalProfit / totalCostValue) * 100).toFixed(1)}%` : '—'}
                      </span>
                      <p className="text-[9px] text-gray-400 uppercase">Avg Margin</p>
                    </td>
                  )}

                  {/* Total Stock units */}
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-gray-600">
                      {products.reduce((sum, p) => sum + p.stock, 0).toLocaleString()} units
                    </span>
                    <p className="text-[9px] text-gray-400 uppercase">Total Stock</p>
                  </td>

                  <td className="px-6 py-4"></td>

                  {/* Total Value */}
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-gray-800">RS.{totalStockValue.toLocaleString()}</span>
                    <p className="text-[9px] text-gray-400 uppercase">Total Value</p>
                  </td>

                  {hasCostData && (
                    <td className="px-6 py-4">
                      <span className={`text-xs font-black ${totalProfit >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                        RS.{totalProfit.toLocaleString()}
                      </span>
                      <p className="text-[9px] text-gray-400 uppercase">Total Profit</p>
                    </td>
                  )}

                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="sm:hidden bg-gray-50 px-4 py-2 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-medium">Swipe left/right to view full table</p>
        </div>
      </div>
    </div>
  );
}