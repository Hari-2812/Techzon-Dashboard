const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // e.g. 'TZ-RGS', 'TZ-BDE'
    seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', CounterSchema);
