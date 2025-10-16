const express = require('express');
const router = express.Router();

// Mock silo data generation
const generateSiloData = (siloId) => {
  // Generate varied fill levels based on silo ID
  const fillPercentages = {
    'RICE001': 65,
    'RICE002': 85,
    'RICE003': 45,
    'RICE004': 92,
    'RICE005': 78,
    'RICE006': 33
  };
  
  const fillPercentage = fillPercentages[siloId] || 75;
  const currentLevel = Math.round((fillPercentage / 100) * 1000);
  
  const baseData = {
    id: siloId,
    name: `Silo ${siloId}`,
    grainType: 'Rice',
    capacity: 1000,
    currentLevel: currentLevel,
    fillPercentage: fillPercentage,
    temperature: 22.5 + Math.random() * 2,
    humidity: 55 + Math.random() * 10,
    moisture: 14.2 + Math.random() * 1,
    airflow: 1.5 + Math.random() * 0.5,
    co2: 400 + Math.random() * 50,
    pressure: 1013 + Math.random() * 5,
    riskLevel: 'LOW',
    actuators: {
      fan: { 
        status: Math.random() > 0.5 ? 'ON' : 'OFF', 
        speed: Math.floor(Math.random() * 100), 
        lastActive: new Date().toISOString() 
      },
      aeration: { 
        status: Math.random() > 0.7 ? 'ON' : 'OFF', 
        pressure: Math.floor(Math.random() * 50), 
        lastActive: new Date().toISOString() 
      },
      cooling: { 
        status: Math.random() > 0.8 ? 'ON' : 'OFF', 
        temperature: 18 + Math.random() * 5, 
        lastActive: new Date().toISOString() 
      }
    },
    sensors: {
      temperature: { value: 22.5, status: 'NORMAL' },
      humidity: { value: 55, status: 'NORMAL' },
      moisture: { value: 14.2, status: 'NORMAL' },
      airflow: { value: 1.5, status: 'NORMAL' },
      co2: { value: 400, status: 'NORMAL' }
    },
    lastUpdated: new Date().toISOString(),
    storageDays: 45,
    qualityScore: 92
  };

  return baseData;
};

// Get silo by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const siloData = generateSiloData(id);
    
    res.json({
      success: true,
      data: siloData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch silo data',
      message: error.message
    });
  }
});

// Get all silos
router.get('/', (req, res) => {
  try {
    const silos = ['RICE001', 'RICE002', 'RICE003', 'RICE004', 'RICE005', 'RICE006'].map(id => 
      generateSiloData(id)
    );
    
    res.json({
      success: true,
      data: silos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch silos',
      message: error.message
    });
  }
});

// Control actuator
router.post('/:id/actuators/:actuator', (req, res) => {
  try {
    const { id, actuator } = req.params;
    const { action } = req.body; // 'ON' or 'OFF'
    
    // Mock actuator control
    console.log(`Controlling ${actuator} for silo ${id}: ${action}`);
    
    res.json({
      success: true,
      message: `${actuator} ${action} for silo ${id}`,
      data: {
        siloId: id,
        actuator,
        status: action,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to control actuator',
      message: error.message
    });
  }
});

// Get silo history
router.get('/:id/history', (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = '24h' } = req.query;
    
    // Generate historical data
    const history = [];
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      history.push({
        timestamp: timestamp.toISOString(),
        temperature: 22.5 + Math.sin(i * 0.1) * 2 + Math.random() * 1,
        humidity: 55 + Math.sin(i * 0.05) * 5 + Math.random() * 3,
        moisture: 14.2 + Math.sin(i * 0.08) * 1 + Math.random() * 0.5,
        airflow: 1.5 + Math.sin(i * 0.12) * 0.3 + Math.random() * 0.2,
        co2: 400 + Math.sin(i * 0.06) * 30 + Math.random() * 15,
        pressure: 1013 + Math.sin(i * 0.04) * 3 + Math.random() * 2
      });
    }
    
    res.json({
      success: true,
      data: history,
      timeRange,
      totalRecords: history.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch silo history',
      message: error.message
    });
  }
});

module.exports = router;
