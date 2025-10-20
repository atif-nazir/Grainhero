const { spawn } = require('child_process');
const path = require('path');

// Test the SmartBin ML model
async function testMLModel() {
    console.log('🧪 Testing SmartBin ML Model...\n');
    
    const pythonScript = path.join(__dirname, 'ml/smartbin_predict.py');
    
    // Test data - simulating rice storage conditions
    const testData = {
        temperature: 28,
        humidity: 75,
        grain_moisture: 16,
        dew_point: 22,
        storage_days: 20,
        airflow: 1.2,
        ambient_light: 150,
        pest_presence: 0,
        rainfall: 0.5
    };
    
    console.log('📊 Test Input Data:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('\n🤖 Running ML Model...\n');
    
    const python = spawn('python', [pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
        error += data.toString();
    });
    
    python.on('close', (code) => {
        console.log('📈 ML Model Results:');
        console.log('='.repeat(50));
        
        if (code === 0) {
            try {
                const result = JSON.parse(output);
                console.log('✅ Model Prediction:', result.prediction);
                console.log('🎯 Confidence:', (result.confidence * 100).toFixed(1) + '%');
                console.log('⚠️  Risk Score:', result.risk_score + '/100');
                console.log('⏰ Time to Spoilage:', result.time_to_spoilage_hours + ' hours');
                console.log('🔍 Key Risk Factors:', result.key_risk_factors.join(', ') || 'None');
                console.log('🤖 Model Used:', result.model_used);
                console.log('📅 Timestamp:', result.timestamp);
                
                // Interpretation
                console.log('\n📋 Interpretation:');
                if (result.prediction === 'Safe') {
                    console.log('✅ Grain is in good condition');
                } else if (result.prediction === 'Risky') {
                    console.log('⚠️  Grain needs attention - monitor closely');
                } else if (result.prediction === 'Spoiled') {
                    console.log('❌ Grain is spoiled - immediate action required');
                }
                
                if (result.risk_score > 70) {
                    console.log('🚨 HIGH RISK: Immediate intervention needed');
                } else if (result.risk_score > 40) {
                    console.log('⚠️  MEDIUM RISK: Monitor and take preventive measures');
                } else {
                    console.log('✅ LOW RISK: Continue normal monitoring');
                }
                
            } catch (e) {
                console.log('📄 Raw Output:', output);
                console.log('⚠️  Could not parse JSON, but model ran successfully');
            }
        } else {
            console.log('❌ Model Error:', error);
            console.log('📄 Raw Output:', output);
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('🎯 Model Status:', code === 0 ? '✅ WORKING' : '❌ FAILED');
    });
    
    // Send test data to Python script
    python.stdin.write(JSON.stringify(testData));
    python.stdin.end();
}

// Run the test
testMLModel().catch(console.error);
