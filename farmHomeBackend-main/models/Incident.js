const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentType: { type: String, required: true },
  incidentDate: { type: Date, required: true },
  reportedBy: { type: String },
  affectedAnimals: { type: String },
  incidentDescription: { type: String },
  actionsTaken: { type: String },
  preventiveMeasures: { type: String },
  incidentStatus: { type: String },
  severity: { type: String },
  cost: { type: Number },
  followUpDate: { type: Date },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema); 