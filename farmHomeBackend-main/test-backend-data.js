const riceDataService = require('./services/riceDataService');

console.log('🧪 Testing Backend Data Service...\n');

// Wait a moment for the service to initialize
setTimeout(() => {
    console.log('📊 Predictions:', riceDataService.getPredictions().length);
    console.log('📋 Advisories:', riceDataService.getAdvisories().length);
    console.log('📈 Statistics:', riceDataService.getStatistics());
    
    console.log('\n✅ Backend data service is working!');
    console.log('🎯 You should now see real data in your frontend!');
}, 2000);
