const express = require('express');
const app = express();

// Test if the rice data service is working
const riceDataService = require('./services/riceDataService');

app.get('/test', (req, res) => {
    try {
        const predictions = riceDataService.getPredictions();
        const advisories = riceDataService.getAdvisories();
        const statistics = riceDataService.getStatistics();
        
        res.json({
            status: 'success',
            message: 'Backend is working!',
            data: {
                predictions_count: predictions.length,
                advisories_count: advisories.length,
                statistics: statistics
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Backend error',
            error: error.message
        });
    }
});

app.listen(5001, () => {
    console.log('🧪 Test server running on port 5001');
    console.log('📊 Testing rice data service...');
    
    setTimeout(() => {
        console.log('📊 Predictions:', riceDataService.getPredictions().length);
        console.log('📋 Advisories:', riceDataService.getAdvisories().length);
        console.log('📈 Statistics:', riceDataService.getStatistics());
        console.log('✅ Test server ready at http://localhost:5001/test');
    }, 2000);
});
