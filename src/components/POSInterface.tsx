import { useState } from 'react';
import { useApp } from './AppContext';
import { Search, Plus, Minus, Trash2, ShoppingCart, AlertTriangle, Printer, X } from 'lucide-react';

const printStyles = `
  @media print {
    body * { visibility: hidden !important; }
    #receipt-print, #receipt-print * { visibility: visible !important; }
    #receipt-print {
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 80mm !important;
      padding: 10px !important;
      background: white !important;
    }
  }
`;

export function POSInterface() {
  const { products, customers, accounts, addSale, purchases, sales, addAccountTransaction, getLiveBalance } = useApp();
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [editingPrice, setEditingPrice] = useState<{ [key: string]: boolean }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const liquidAccounts = (accounts || []).filter(acc =>
    acc && (acc.type === 'bank' || acc.type === 'cash')
  );

  const getCostPrices = (productId: string, quantityToSell: number) => {
    let totalCost = 0;
    let totalQuantity = 0;

    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        if (item.productId === productId) {
          totalCost += item.price * item.quantity;
          totalQuantity += item.quantity;
        }
      });
    });

    const weightedAvg = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    const batches: Array<{date: string, price: number, quantity: number, remaining: number}> = [];

    purchases
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(purchase => {
        purchase.items.forEach(item => {
          if (item.productId === productId) {
            batches.push({
              date: purchase.date,
              price: item.price,
              quantity: item.quantity,
              remaining: item.quantity
            });
          }
        });
      });

    let totalSold = 0;
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.productId === productId) {
          totalSold += item.quantity;
        }
      });
    });

    let remainingToDeduct = totalSold;
    for (let i = 0; i < batches.length; i++) {
      if (remainingToDeduct <= 0) break;
      const deductFromBatch = Math.min(batches[i].remaining, remainingToDeduct);
      batches[i].remaining -= deductFromBatch;
      remainingToDeduct -= deductFromBatch;
    }

    let fifoCost = 0;
    let remainingToSell = quantityToSell;

    for (let i = 0; i < batches.length; i++) {
      if (remainingToSell <= 0) break;
      if (batches[i].remaining <= 0) continue;
      const takeFromBatch = Math.min(batches[i].remaining, remainingToSell);
      fifoCost += takeFromBatch * batches[i].price;
      remainingToSell -= takeFromBatch;
    }

    const fifoPerUnit = quantityToSell > 0 ? fifoCost / quantityToSell : 0;

    let finalFifo = fifoPerUnit;
    let finalAvg = weightedAvg;

    if (fifoPerUnit === 0 && batches.length > 0) {
      finalFifo = batches[batches.length - 1].price;
    }

    if (weightedAvg === 0) {
      const product = products.find(p => p.id === productId);
      finalAvg = (product as any)?.costPrice || 0;
      finalFifo = finalFifo || finalAvg;
    }

    return { weightedAverage: finalAvg, fifoCost: finalFifo };
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
      alert(`${product.name} is out of stock!`);
      return;
    }

    const costs = getCostPrices(product.id, 1);
    const avgCost = costs.fifoCost;
    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
      if (existingItem.quantity + 1 > product.stock) {
        alert(`Cannot add more ${product.name}. Only ${product.stock} available in stock.`);
        return;
      }
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price, costPrice: avgCost }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        costPrice: avgCost,
        total: product.price,
      }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return item;
        if (newQuantity > product.stock) {
          alert(`Cannot add more. Only ${product.stock} ${product.unit} available in stock.`);
          return item;
        }
        const costs = getCostPrices(product.id, newQuantity);
        return { ...item, quantity: newQuantity, total: newQuantity * item.price, costPrice: costs.fifoCost };
      }
      return item;
    }));
  };

  const setManualQuantity = (productId: string, newQty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (newQty < 1) { alert('Quantity must be at least 1'); return; }
    if (newQty > product.stock) {
      alert(`Cannot add more. Only ${product.stock} ${product.unit} available in stock.`);
      return;
    }
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const costs = getCostPrices(product.id, newQty);
        return { ...item, quantity: newQty, total: newQty * item.price, costPrice: costs.fifoCost };
      }
      return item;
    }));
  };

  const updatePrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) { alert('Price cannot be negative'); return; }
    setCart(cart.map(item => {
      if (item.productId === productId) {
        return { ...item, price: newPrice, total: item.quantity * newPrice };
      }
      return item;
    }));
  };

  const togglePriceEdit = (productId: string) => {
    setEditingPrice(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;

  const handlePrint = () => {
    window.print();
  };

  const openReceiptPreview = () => {
    const customer = customers.find(c => c.id === selectedCustomer);
    setLastSale({
      customerName: customer?.name || 'Customer',
      items: [...cart],
      subtotal,
      discount,
      total,
      paymentMethod,
      amountPaid: paymentMethod === 'cash' ? total : amountPaid,
      balance: paymentMethod === 'cash' ? 0 : Math.max(0, total - amountPaid),
      date: new Date().toLocaleString(),
      receiptNo: `RCP-${Date.now().toString().slice(-6)}`,
    });
    setShowReceipt(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { alert('Cart is empty'); return; }
    if (!selectedCustomer) { alert('Please select a customer'); return; }

    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product) { alert(`Product ${item.productName} not found`); return; }
      if (product.stock < item.quantity) {
        alert(`Insufficient stock for ${product.name}. Available: ${product.stock}, In cart: ${item.quantity}`);
        return;
      }
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const paidAmount = paymentMethod === 'cash' ? total : amountPaid;
    const balance = total - paidAmount;

    setIsProcessing(true);
    try {
      await addSale({
        customerId: customer.id,
        customerName: customer.name,
        items: cart,
        subtotal,
        discount,
        total,
        paymentMethod,
        amountPaid: paidAmount,
        balance: Math.max(0, balance),
        accountId: selectedAccount || null,
      });

      if (selectedAccount && paidAmount > 0) {
        await addAccountTransaction({
          debitAccountId: selectedAccount,
          creditAccountId: 'SALES_REVENUE',
          amount: paidAmount,
          description: paymentMethod === 'cash'
            ? `Cash Sale - ${customer.name}`
            : `Payment received from ${customer.name}`,
          date: new Date().toISOString().split('T')[0],
          reference: customer.id
        });
      }

      // ✅ Save receipt data
      setLastSale({
        customerName: customer.name,
        items: [...cart],
        subtotal,
        discount,
        total,
        paymentMethod,
        amountPaid: paidAmount,
        balance: Math.max(0, balance),
        date: new Date().toLocaleString(),
        receiptNo: `RCP-${Date.now().toString().slice(-6)}`,
      });

      // ✅ Reset cart
      setCart([]);
      setSelectedCustomer('');
      setSelectedAccount('');
      setDiscount(0);
      setAmountPaid(0);
      setPaymentMethod('cash');
      setEditingPrice({});

      // ✅ Show receipt modal
      setShowReceipt(true);

    } catch (error: any) {
      alert(error.message || 'Failed to complete sale. Please try again.');
      console.error('Sale error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <style>{printStyles}</style>

      {/* ✅ Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <Printer size={20} className="text-green-600" />
                Sale Receipt
              </h3>
              <button
                onClick={() => setShowReceipt(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* ✅ Printable Receipt */}
            <div id="receipt-print" className="p-4 font-mono text-sm">

              {/* Shop Header */}
              <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-3">
                <h2 className="text-lg font-black uppercase tracking-wide">🏪 BMS Shop</h2>
                <p className="text-xs text-gray-500">Business Management System</p>
                <p className="text-xs text-gray-400 mt-1">{lastSale.date}</p>
                <p className="text-xs font-bold text-gray-600">Receipt #: {lastSale.receiptNo}</p>
              </div>

              {/* Customer Info */}
              <div className="mb-3 text-xs">
                <p><span className="font-bold">Customer:</span> {lastSale.customerName}</p>
                <p><span className="font-bold">Payment:</span> {lastSale.paymentMethod === 'cash' ? '💵 Cash' : '📋 Credit'}</p>
              </div>

              {/* Items */}
              <div className="border-t border-dashed border-gray-300 pt-2 mb-3">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-1">
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Price</span>
                  <span>Total</span>
                </div>
                {lastSale.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-xs py-1 border-b border-gray-100">
                    <span className="flex-1 font-medium truncate max-w-[100px]">{item.productName}</span>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <span className="w-16 text-right">RS.{item.price.toFixed(0)}</span>
                    <span className="w-16 text-right font-bold">RS.{item.total.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t-2 border-dashed border-gray-300 pt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">RS.{lastSale.subtotal.toFixed(0)}</span>
                </div>
                {lastSale.discount > 0 && (
                  <div className="flex justify-between text-xs text-red-600">
                    <span>Discount:</span>
                    <span>-RS.{lastSale.discount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-1">
                  <span>TOTAL:</span>
                  <span className="text-green-700">RS.{lastSale.total.toFixed(0)}</span>
                </div>
                {lastSale.paymentMethod === 'credit' && (
                  <>
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Paid:</span>
                      <span>RS.{lastSale.amountPaid.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-orange-600 font-bold">
                      <span>Balance Due:</span>
                      <span>RS.{lastSale.balance.toFixed(0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="text-center mt-4 border-t-2 border-dashed border-gray-300 pt-3">
                <p className="text-xs font-bold text-gray-600">Thank you for your business!</p>
                <p className="text-[10px] text-gray-400 mt-1">Please keep this receipt</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 p-4 border-t border-gray-100">
              <button
                onClick={handlePrint}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer size={18} /> Print Receipt
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product.id)}
                className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                  product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-center h-20 bg-green-50 rounded mb-3">
                  <Package className="text-green-600" size={32} />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-green-700">RS.{product.price}</span>
                  <span className={`text-xs font-medium ${
                    product.stock <= 0 ? 'text-red-600' :
                    product.stock <= product.minStock ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    {product.stock <= 0 ? 'Out of Stock' : `${product.stock} ${product.unit}`}
                  </span>
                </div>
                {product.stock > 0 && product.stock <= product.minStock && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                    <AlertTriangle size={12} />
                    <span>Low stock</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">

          {/* Balance Summary */}
          {liquidAccounts.length > 0 && (
            <div className="bg-green-600 rounded-lg shadow p-3">
              <p className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">
                💰 Available Balances
              </p>
              <div className="space-y-1">
                {liquidAccounts.map(acc => {
                  const balance = getLiveBalance(acc.id, 'account');
                  return (
                    <div key={acc.id} className="flex justify-between items-center bg-green-700 rounded px-2 py-1">
                      <span className="text-green-100 text-xs">{acc.name}</span>
                      <span className={`text-xs font-bold ${balance < 0 ? 'text-red-300' : 'text-white'}`}>
                        RS. {balance.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center border-t border-green-500 pt-1 mt-1">
                  <span className="text-green-100 text-xs font-bold">Total</span>
                  <span className="text-white text-sm font-bold">
                    RS. {liquidAccounts.reduce((sum, acc) => sum + getLiveBalance(acc.id, 'account'), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="text-green-600" size={20} />
              <h3 className="font-semibold text-gray-800">Cart ({cart.length})</h3>
            </div>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.map(item => {
                const product = products.find(p => p.id === item.productId);
                const hasStockIssue = product && item.quantity > product.stock;
                const isPriceEditing = editingPrice[item.productId];

                return (
                  <div key={item.productId} className={`border border-gray-200 rounded p-2 ${hasStockIssue ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-800">{item.productName}</p>
                        <p className="text-xs text-gray-400">FIFO Cost: RS.{((item as any).costPrice || 0).toFixed(2)}</p>
                        {hasStockIssue && (
                          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                            <AlertTriangle size={10} /> Only {product?.stock} available
                          </p>
                        )}
                      </div>
                      <button onClick={() => removeFromCart(item.productId)} className="p-1 hover:bg-red-50 rounded text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">Price:</span>
                      {isPriceEditing ? (
                        <input
                          type="number" min="0" step="0.01" value={item.price}
                          onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                          className="flex-1 px-2 py-1 text-xs font-bold text-green-700 border border-green-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      ) : (
                        <span className="flex-1 text-xs font-bold text-green-700">RS.{item.price.toFixed(2)}</span>
                      )}
                      <button
                        onClick={() => togglePriceEdit(item.productId)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPriceEditing ? 'bg-green-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isPriceEditing ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-gray-100 rounded border border-gray-200">
                          <Minus size={14} />
                        </button>
                        <input
                          type="number" min="1" value={item.quantity}
                          onChange={(e) => setManualQuantity(item.productId, parseInt(e.target.value) || 1)}
                          className="w-12 px-1 py-1 text-sm font-medium text-center border border-gray-200 rounded focus:ring-2 focus:ring-green-500 outline-none"
                        />
                        <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-gray-100 rounded border border-gray-200">
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-bold text-sm text-gray-900">RS.{item.total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              {cart.length === 0 && (
                <p className="text-gray-400 text-center py-8 text-sm">Cart is empty</p>
              )}
            </div>

            <div className="space-y-3 border-t pt-3">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              {/* Account */}
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  💰 Deposit To Account <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- No Account Selected --</option>
                  {liquidAccounts.map(acc => {
                    const balance = getLiveBalance(acc.id, 'account');
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Bal: RS. {balance.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
                {selectedAccount && (
                  <div className="mt-1 text-xs font-semibold text-green-700 bg-green-100 p-2 rounded border border-green-300">
                    Current Balance: RS. {getLiveBalance(selectedAccount, 'account').toLocaleString()}
                  </div>
                )}
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (RS.)</label>
                <input
                  type="number" value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 px-3 py-2 rounded ${paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >Cash</button>
                  <button
                    onClick={() => setPaymentMethod('credit')}
                    className={`flex-1 px-3 py-2 rounded ${paymentMethod === 'credit' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >Credit</button>
                </div>
              </div>

              {paymentMethod === 'credit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (RS.)</label>
                  <input
                    type="number" value={amountPaid}
                    onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">RS.{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium">-RS.{discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-1">
                  <span>Total:</span>
                  <span className="text-green-700">RS.{total.toFixed(2)}</span>
                </div>
                {paymentMethod === 'credit' && (
                  <div className="flex justify-between text-orange-600">
                    <span>Balance Due:</span>
                    <span className="font-semibold">RS.{Math.max(0, total - amountPaid).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* ✅ Preview & Print Button */}
              {cart.length > 0 && selectedCustomer && (
                <button
                  onClick={openReceiptPreview}
                  className="w-full py-2.5 rounded-lg font-semibold border-2 border-green-600 text-green-600 hover:bg-green-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer size={16} /> Preview & Print Receipt
                </button>
              )}

              {/* ✅ Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isProcessing || !selectedCustomer || cart.length === 0}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isProcessing || !selectedCustomer || cart.length === 0
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing Sale...</span>
                  </>
                ) : !selectedCustomer ? (
                  <span>Select Customer First</span>
                ) : cart.length === 0 ? (
                  <span>Add Items to Cart</span>
                ) : (
                  <span>✅ Complete Sale</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Package({ className, size }: { className?: string; size: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}