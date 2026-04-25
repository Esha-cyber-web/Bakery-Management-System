const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  category:  { type: String },
  unit:      { type: String, default: 'kg' },
  price:     { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 }, // ✅ actual purchase price
  stock:     { type: Number, default: 0 },
  minStock:  { type: Number, default: 0 },
  shopId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);