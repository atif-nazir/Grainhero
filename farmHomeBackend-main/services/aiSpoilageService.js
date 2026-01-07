const EventEmitter = require('events');
const SpoilagePrediction = require('../models/SpoilagePrediction');
const Advisory = require('../models/Advisory');
const SensorReading = require('../models/SensorReading');
const GrainBatch = require('../models/GrainBatch');
const GrainAlert = require('../models/GrainAlert');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { getRiskLevel, getRiskLevelDetails, requiresAction, requiresAlert } = require('../configs/risk-thresholds');

class AISpoilageService extends EventEmitter {
    constructor() {
        super();
        this.modelPath = path.join(__dirname, '../ml/smartbin_model.pkl');
        this.smartbinScript = path.join(__dirname, '../ml/smartbin_predict.py');
        this.pythonScript = path.join(__dirname, '../ml/spoilage_predictor.py');
        this.isModelLoaded = false;
        this.predictionQueue = [];
        this.isProcessing = false;
        
        this.initializeModel();
        this.startPredictionProcessor();
    }

    /**
     * Initialize the ML model
     */
    async initializeModel() {
        try {
            // Check if model file exists
            await fs.access(this.modelPath);
            this.isModelLoaded = true;
            console.log('AI Spoilage model loaded successfully');
            this.emit('modelLoaded');
        } catch (error) {
            console.log('No pre-trained model found, using fallback prediction system');
            this.isModelLoaded = false;
            this.emit('modelFallback');
        }
    }

    /**
     * Predict spoilage for a grain batch
     */
    async predictSpoilage(batchId, environmentalData, options = {}) {
        try {
            const predictionId = uuidv4();
            
            // Add to prediction queue
            this.predictionQueue.push({
                predictionId,
                batchId,
                environmentalData,
                options,
                timestamp: new Date()
            });

            // Process if not already processing
            if (!this.isProcessing) {
                this.processPredictionQueue();
            }

            return { predictionId, status: 'queued' };

        } catch (error) {
            console.error('Predict spoilage error:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Process prediction queue
     */
    async processPredictionQueue() {
        if (this.isProcessing || this.predictionQueue.length === 0) return;
        
        this.isProcessing = true;

        while (this.predictionQueue.length > 0) {
            const prediction = this.predictionQueue.shift();
            
            try {
                await this.processPrediction(prediction);
            } catch (error) {
                console.error('Process prediction error:', error);
                this.emit('predictionError', { predictionId: prediction.predictionId, error });
            }
        }

        this.isProcessing = false;
    }

    /**
     * Process individual prediction
     */
    async processPrediction(prediction) {
        try {
            const { predictionId, batchId, environmentalData, options } = prediction;

            // Get batch information
            const batch = await GrainBatch.findById(batchId);
            if (!batch) {
                throw new Error(`Batch ${batchId} not found`);
            }

            // Prepare features for ML model
            const features = this.prepareFeatures(environmentalData, batch);
            console.log("ML FEATURES SENT:", features);

            // Get prediction from ML model
            let predictionResult;
            if (this.isModelLoaded) {
                predictionResult = await this.getMLPrediction(features);
            } else {
                predictionResult = await this.getFallbackPrediction(features);
            }

            // Create spoilage prediction record
            const spoilagePrediction = new SpoilagePrediction({
                prediction_id: predictionId,
                tenant_id: batch.tenant_id,
                silo_id: batch.silo_id,
                batch_id: batchId,
                prediction_type: options.predictionType || 'general_spoilage',
                risk_score: predictionResult.risk_score,
                risk_level: this.calculateRiskLevel(predictionResult.risk_score),
                confidence_score: predictionResult.confidence,
                prediction_horizon: options.horizon || 7, // days
                predicted_date: new Date(Date.now() + (options.horizon || 7) * 24 * 60 * 60 * 1000),
                environmental_factors: this.analyzeEnvironmentalFactors(environmentalData),
                grain_factors: this.analyzeGrainFactors(batch, environmentalData),
                model_info: {
                    model_version: '1.0.0',
                    model_type: this.isModelLoaded ? 'xgboost' : 'fallback',
                    training_data_size: 10000,
                    last_trained: new Date(),
                    accuracy_score: predictionResult.accuracy || 0.85
                },
                feature_importance: predictionResult.feature_importance,
                prediction_details: {
                    primary_risk_factors: predictionResult.primary_risk_factors,
                    secondary_risk_factors: predictionResult.secondary_risk_factors,
                    mitigation_effectiveness: predictionResult.mitigation_effectiveness,
                    time_to_spoilage: predictionResult.time_to_spoilage,
                    severity_indicators: predictionResult.severity_indicators
                },
                created_by: options.userId || batch.created_by
            });

            await spoilagePrediction.save();

            // Generate advisories if risk requires action (high or critical)
            if (requiresAction(spoilagePrediction.risk_score)) {
                await this.generateAdvisories(spoilagePrediction);
            }

            // Create alert if risk is critical
            if (requiresAlert(spoilagePrediction.risk_score)) {
                await this.createSpoilageAlert(spoilagePrediction);
            }

            this.emit('predictionCompleted', {
                predictionId,
                riskScore: spoilagePrediction.risk_score,
                riskLevel: spoilagePrediction.risk_level
            });

        } catch (error) {
            console.error('Process prediction error:', error);
            throw error;
        }
    }

    /**
     * Get ML model prediction using SmartBin model
     */
    async getMLPrediction(features) {
        return new Promise((resolve, reject) => {
            // Try SmartBin model first
            const smartbin = spawn('python', [this.smartbinScript, JSON.stringify(features)]);
            
            let output = '';
            let error = '';

            smartbin.stdout.on('data', (data) => {
                output += data.toString();
            });

            smartbin.stderr.on('data', (data) => {
                error += data.toString();
            });

            smartbin.on('close', (code) => {
                if (code !== 0) {
                    console.error('SmartBin model error:', error);
                    // Fallback to original prediction script
                    this.getFallbackMLPrediction(features).then(resolve).catch(reject);
                } else {
                    try {
                        const result = JSON.parse(output);
                        resolve(result);
                    } catch (parseError) {
                        console.error('Parse SmartBin result error:', parseError);
                        this.getFallbackMLPrediction(features).then(resolve).catch(reject);
                    }
                }
            });
        });
    }

    /**
     * Fallback ML prediction using original script
     */
    async getFallbackMLPrediction(features) {
        return new Promise((resolve, reject) => {
            const python = spawn('python', [this.pythonScript, JSON.stringify(features)]);
            
            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    console.error('Fallback Python script error:', error);
                    resolve(this.getFallbackPrediction(features));
                } else {
                    try {
                        const result = JSON.parse(output);
                        resolve(result);
                    } catch (parseError) {
                        console.error('Parse fallback result error:', parseError);
                        resolve(this.getFallbackPrediction(features));
                    }
                }
            });
        });
    }

    /**
     * Get fallback prediction using JavaScript
     */
    async getFallbackPrediction(features) {
        // Calculate risk score based on features
        let riskScore = 0;
        const primaryRiskFactors = [];
        const secondaryRiskFactors = [];

        // Temperature risk
        if (features.temperature > 30) {
            riskScore += 25;
            primaryRiskFactors.push('high_temperature');
        } else if (features.temperature > 25) {
            riskScore += 15;
            secondaryRiskFactors.push('elevated_temperature');
        }

        // Humidity risk
        if (features.humidity > 80) {
            riskScore += 30;
            primaryRiskFactors.push('high_humidity');
        } else if (features.humidity > 70) {
            riskScore += 20;
            secondaryRiskFactors.push('elevated_humidity');
        }

        // CO2 risk
        if (features.co2 > 1000) {
            riskScore += 20;
            primaryRiskFactors.push('poor_air_quality');
        } else if (features.co2 > 800) {
            riskScore += 10;
            secondaryRiskFactors.push('elevated_co2');
        }

        // Moisture risk
        if (features.moisture > 15) {
            riskScore += 25;
            primaryRiskFactors.push('high_moisture');
        } else if (features.moisture > 12) {
            riskScore += 15;
            secondaryRiskFactors.push('elevated_moisture');
        }

        // Storage duration risk
        if (features.storage_duration > 180) {
            riskScore += 15;
            secondaryRiskFactors.push('long_storage');
        }

        // Grain type risk
        if (features.grain_type === 'rice' && features.humidity > 70) {
            riskScore += 10;
            secondaryRiskFactors.push('rice_humidity_sensitivity');
        }

        // Seasonal factors
        if (features.seasonal_risk > 0.5) {
            riskScore += 10;
            secondaryRiskFactors.push('seasonal_risk');
        }

        // Calculate confidence based on data quality
        const confidence = Math.min(0.95, 0.6 + (features.data_quality * 0.3));

        return {
            risk_score: Math.min(100, riskScore),
            confidence: confidence,
            primary_risk_factors: primaryRiskFactors,
            secondary_risk_factors: secondaryRiskFactors,
            mitigation_effectiveness: 0.7,
            time_to_spoilage: this.calculateTimeToSpoilage(riskScore),
            severity_indicators: this.getSeverityIndicators(riskScore),
            feature_importance: {
                temperature: 0.3,
                humidity: 0.25,
                co2: 0.2,
                moisture: 0.15,
                storage_duration: 0.1
            }
        };
    }

    /**
     * Prepare features for SmartBin ML model
     */
    prepareFeatures(environmentalData, batch) {
        // IoT Spec: SmartBin model expects these exact features (VOC-first)
        // Inputs: T_core, RH_core, Dew_Point, VOC_index, VOC_relative, VOC_rate,
        // Grain_Moisture, Airflow/fan telemetry, Rainfall, derived trends/deltas
        return {
            Temperature: environmentalData.temperature || 25, // T_core
            Humidity: environmentalData.humidity || 60, // RH_core
            Storage_Days: this.calculateStorageDuration(batch),
            Grain_Type: this.encodeGrainType(batch.grain_type), // Rice=1, Wheat=2
            Airflow: environmentalData.airflow || 0, // Fan_Speed_Factor × Fan_Duty_Cycle (0.0-1.0)
            Dew_Point: this.calculateDewPoint(environmentalData.temperature, environmentalData.humidity),
            Ambient_Light: environmentalData.light || 100, // Optional BH1750
            Pest_Presence: environmentalData.pest_presence || environmentalData.pest_presence_score || 0, // Derived from VOC patterns
            Grain_Moisture: batch.moisture_content || environmentalData.moisture || 12, // Capacitive probe (0-10%=dry, 13-14%=risk, >=15%=spoilage)
            Rainfall: environmentalData.rainfall || environmentalData.precipitation || 0, // OpenWeather API
            // VOC-first features (IoT spec)
            VOC_index: environmentalData.voc || environmentalData.voc_index || 0,
            VOC_relative: environmentalData.voc_relative || environmentalData.voc_relative_5min || 0,
            VOC_rate_5min: environmentalData.voc_rate_5min || 0,
            VOC_rate_30min: environmentalData.voc_rate_30min || 0,
            
            // Additional features for fallback/context
            co2: environmentalData.co2 || 400, // Optional CCS811
            pressure: environmentalData.pressure || 1013, // BME680
            ph: environmentalData.ph || 7,
            
            // Grain-specific features
            initial_quality: batch.quality_score || 85,
            
            // Temporal features (IoT spec: rolling windows)
            hour_of_day: new Date().getHours(),
            day_of_year: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)),
            season: this.getSeason(),
            
            // Historical features (IoT spec: rolling 5m/30m/6h + deltas)
            temperature_trend: this.calculateTrend(environmentalData.temperature_history),
            humidity_trend: this.calculateTrend(environmentalData.humidity_history),
            delta_temp: environmentalData.delta_temp || 0, // ΔT_core
            delta_rh: environmentalData.delta_rh || 0, // ΔRH_core
            moisture_trend_6h: environmentalData.moisture_trend_6h || 0,
            
            // Data quality
            data_quality: this.assessDataQuality(environmentalData),
            
            // Seasonal risk
            seasonal_risk: this.calculateSeasonalRisk(),
            
            // Fan telemetry (IoT spec)
            fan_state: environmentalData.fan_state || 0, // 0=OFF, 1=ON
            fan_duty: environmentalData.fan_duty_cycle || 0, // 0-100%
            fan_rpm: environmentalData.fan_rpm || 0
        };
    }

    /**
     * Generate advisories for spoilage prediction
     */
    async generateAdvisories(spoilagePrediction) {
        try {
            const advisories = spoilagePrediction.generateAdvisories();
            
            for (const advisoryData of advisories) {
                const advisory = new Advisory({
                    advisory_id: advisoryData.advisory_id,
                    tenant_id: spoilagePrediction.tenant_id,
                    silo_id: spoilagePrediction.silo_id,
                    prediction_id: spoilagePrediction._id,
                    title: this.generateAdvisoryTitle(advisoryData),
                    description: advisoryData.description,
                    advisory_type: this.mapActionToAdvisoryType(advisoryData.action_type),
                    priority: advisoryData.priority,
                    severity: this.mapPriorityToSeverity(advisoryData.priority),
                    action_type: advisoryData.action_type,
                    implementation_details: this.generateImplementationDetails(advisoryData),
                    effectiveness_score: advisoryData.effectiveness_score,
                    impact_assessment: this.calculateImpactAssessment(advisoryData),
                    urgency_level: this.calculateUrgencyLevel(advisoryData),
                    recommended_timing: this.calculateRecommendedTiming(advisoryData),
                    ai_context: {
                        model_version: spoilagePrediction.model_info.model_version,
                        confidence_score: spoilagePrediction.confidence_score,
                        feature_importance: spoilagePrediction.feature_importance,
                        prediction_accuracy: spoilagePrediction.model_info.accuracy_score
                    },
                    environmental_context: {
                        temperature: spoilagePrediction.environmental_factors.temperature.current,
                        humidity: spoilagePrediction.environmental_factors.humidity.current,
                        air_quality: spoilagePrediction.environmental_factors.co2.current
                    },
                    created_by: spoilagePrediction.created_by
                });

                await advisory.save();
            }

            this.emit('advisoriesGenerated', {
                predictionId: spoilagePrediction.prediction_id,
                advisoryCount: advisories.length
            });

        } catch (error) {
            console.error('Generate advisories error:', error);
            throw error;
        }
    }

    /**
     * Create spoilage alert
     */
    async createSpoilageAlert(spoilagePrediction) {
        try {
            const alert = new GrainAlert({
                alert_id: uuidv4(),
                tenant_id: spoilagePrediction.tenant_id,
                silo_id: spoilagePrediction.silo_id,
                batch_id: spoilagePrediction.batch_id,
                title: `CRITICAL SPOILAGE RISK: ${spoilagePrediction.prediction_type.toUpperCase()}`,
                message: `High risk of ${spoilagePrediction.prediction_type} spoilage detected. Risk score: ${spoilagePrediction.risk_score}%. Immediate action required.`,
                alert_type: 'in-app',
                priority: 'critical',
                source: 'ai',
                sensor_type: 'spoilage_prediction',
                trigger_conditions: {
                    prediction_id: spoilagePrediction.prediction_id,
                    risk_score: spoilagePrediction.risk_score,
                    risk_level: spoilagePrediction.risk_level,
                    predicted_date: spoilagePrediction.predicted_date
                }
            });

            await alert.save();
            this.emit('spoilageAlertCreated', alert);

        } catch (error) {
            console.error('Create spoilage alert error:', error);
        }
    }

    // Helper methods
    calculateRiskLevel(riskScore, options = {}) {
        // Use centralized risk threshold configuration
        return getRiskLevel(riskScore, options);
    }

    analyzeEnvironmentalFactors(environmentalData) {
        return {
            temperature: {
                current: environmentalData.temperature,
                trend: this.calculateTrend(environmentalData.temperature_history),
                impact_score: this.calculateTemperatureImpact(environmentalData.temperature)
            },
            humidity: {
                current: environmentalData.humidity,
                trend: this.calculateTrend(environmentalData.humidity_history),
                impact_score: this.calculateHumidityImpact(environmentalData.humidity)
            },
            co2: {
                current: environmentalData.co2,
                trend: this.calculateTrend(environmentalData.co2_history),
                impact_score: this.calculateCO2Impact(environmentalData.co2)
            },
            moisture: {
                current: environmentalData.moisture,
                trend: this.calculateTrend(environmentalData.moisture_history),
                impact_score: this.calculateMoistureImpact(environmentalData.moisture)
            },
            air_quality: {
                current: this.calculateAirQualityIndex(environmentalData),
                trend: 'stable',
                impact_score: this.calculateAirQualityImpact(environmentalData)
            }
        };
    }

    analyzeGrainFactors(batch, environmentalData) {
        return {
            grain_type: batch.grain_type,
            storage_duration_days: this.calculateStorageDuration(batch),
            initial_quality_score: batch.quality_score || 85,
            moisture_content: batch.moisture_content || 12,
            temperature_history: environmentalData.temperature_history || [],
            humidity_history: environmentalData.humidity_history || []
        };
    }

    calculateTimeToSpoilage(riskScore) {
        if (riskScore >= 90) return 24; // hours
        if (riskScore >= 70) return 72; // hours
        if (riskScore >= 40) return 168; // hours (1 week)
        return 720; // hours (1 month)
    }

    getSeverityIndicators(riskScore) {
        const indicators = [];
        if (riskScore >= 90) indicators.push('immediate_action_required');
        if (riskScore >= 70) indicators.push('high_risk_conditions');
        if (riskScore >= 40) indicators.push('monitoring_required');
        return indicators;
    }

    encodeGrainType(grainType) {
        const encoding = {
            'wheat': 1,
            'rice': 2,
            'corn': 3,
            'barley': 4,
            'oats': 5,
            'sorghum': 6
        };
        return encoding[grainType?.toLowerCase()] || 0;
    }

    calculateStorageDuration(batch) {
        return Math.floor((new Date() - new Date(batch.created_at)) / (1000 * 60 * 60 * 24));
    }

    getSeason() {
        const month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    }

    calculateTrend(history) {
        if (!history || history.length < 2) return 'stable';
        const recent = history.slice(-5);
        const older = history.slice(-10, -5);
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        const change = (recentAvg - olderAvg) / olderAvg;
        if (change > 0.1) return 'increasing';
        if (change < -0.1) return 'decreasing';
        return 'stable';
    }

    assessDataQuality(environmentalData) {
        let quality = 1.0;
        const requiredFields = ['temperature', 'humidity', 'co2', 'moisture'];
        const missingFields = requiredFields.filter(field => !environmentalData[field]);
        quality -= missingFields.length * 0.2;
        return Math.max(0, quality);
    }

    calculateSeasonalRisk() {
        const season = this.getSeason();
        const seasonalRisks = {
            'summer': 0.8,
            'autumn': 0.6,
            'spring': 0.4,
            'winter': 0.2
        };
        return seasonalRisks[season] || 0.5;
    }

    /**
     * Calculate dew point from temperature and humidity
     */
    calculateDewPoint(temperature, humidity) {
        if (!temperature || !humidity) return 15;
        
        // Magnus formula for dew point calculation
        const a = 17.27;
        const b = 237.7;
        const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
        const dewPoint = (b * alpha) / (a - alpha);
        
        return Math.round(dewPoint * 100) / 100;
    }

    generateAdvisoryTitle(advisoryData) {
        const titles = {
            'temperature_control': 'Temperature Control Required',
            'humidity_control': 'Humidity Management Needed',
            'air_quality_improvement': 'Air Quality Enhancement',
            'inspection': 'Storage Area Inspection',
            'emergency_response': 'Emergency Spoilage Prevention'
        };
        return titles[advisoryData.action_type] || 'Storage Management Advisory';
    }

    mapActionToAdvisoryType(actionType) {
        const mapping = {
            'temperature_control': 'preventive',
            'humidity_control': 'preventive',
            'air_quality_improvement': 'preventive',
            'inspection': 'monitoring',
            'emergency_response': 'emergency'
        };
        return mapping[actionType] || 'preventive';
    }

    mapPriorityToSeverity(priority) {
        const mapping = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'critical': 'critical'
        };
        return mapping[priority] || 'medium';
    }

    generateImplementationDetails(advisoryData) {
        const details = {
            steps: [
                {
                    step_number: 1,
                    description: `Implement ${advisoryData.action_type.replace('_', ' ')} measures`,
                    estimated_time: advisoryData.implementation_time,
                    required_resources: ['staff', 'equipment'],
                    safety_considerations: ['follow_safety_protocols']
                }
            ],
            estimated_duration: advisoryData.implementation_time,
            required_skills: ['storage_management'],
            required_equipment: ['monitoring_equipment'],
            safety_requirements: ['safety_gear']
        };
        return details;
    }

    calculateImpactAssessment(advisoryData) {
        return {
            spoilage_prevention: advisoryData.effectiveness_score,
            cost_savings: advisoryData.cost_estimate * 10,
            risk_reduction: advisoryData.effectiveness_score * 0.8,
            implementation_cost: advisoryData.cost_estimate,
            maintenance_cost: advisoryData.cost_estimate * 0.1
        };
    }

    calculateUrgencyLevel(advisoryData) {
        if (advisoryData.priority === 'critical') return 'immediate';
        if (advisoryData.priority === 'high') return 'urgent';
        if (advisoryData.priority === 'medium') return 'soon';
        return 'scheduled';
    }

    calculateRecommendedTiming(advisoryData) {
        const now = new Date();
        const urgency = this.calculateUrgencyLevel(advisoryData);
        let startTime, completionDeadline;

        switch (urgency) {
            case 'immediate':
                startTime = now;
                completionDeadline = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
                break;
            case 'urgent':
                startTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
                completionDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
                break;
            case 'soon':
                startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
                completionDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
                break;
            default:
                startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
                completionDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
        }

        return {
            start_time: startTime,
            completion_deadline: completionDeadline,
            optimal_conditions: ['normal_operating_hours']
        };
    }

    // Impact calculation methods
    calculateTemperatureImpact(temperature) {
        if (temperature > 35) return 0.9;
        if (temperature > 30) return 0.7;
        if (temperature > 25) return 0.4;
        if (temperature < 5) return 0.8;
        if (temperature < 10) return 0.5;
        return 0.1;
    }

    calculateHumidityImpact(humidity) {
        if (humidity > 85) return 0.9;
        if (humidity > 75) return 0.7;
        if (humidity > 65) return 0.4;
        if (humidity < 30) return 0.6;
        return 0.1;
    }

    calculateCO2Impact(co2) {
        if (co2 > 1500) return 0.8;
        if (co2 > 1000) return 0.6;
        if (co2 > 800) return 0.4;
        return 0.1;
    }

    calculateMoistureImpact(moisture) {
        if (moisture > 18) return 0.9;
        if (moisture > 15) return 0.7;
        if (moisture > 12) return 0.4;
        return 0.1;
    }

    calculateAirQualityIndex(environmentalData) {
        const co2 = environmentalData.co2 || 400;
        const voc = environmentalData.voc || 100;
        const aqi = (co2 / 1000) * 50 + (voc / 500) * 50;
        return Math.min(500, aqi);
    }

    calculateAirQualityImpact(environmentalData) {
        const aqi = this.calculateAirQualityIndex(environmentalData);
        if (aqi > 200) return 0.8;
        if (aqi > 150) return 0.6;
        if (aqi > 100) return 0.4;
        return 0.1;
    }

    /**
     * Start prediction processor
     */
    startPredictionProcessor() {
        setInterval(() => {
            if (this.predictionQueue.length > 0 && !this.isProcessing) {
                this.processPredictionQueue();
            }
        }, 5000); // Process every 5 seconds
    }

    /**
     * Retrain model with new data
     */
    async retrainModel(options) {
        try {
            const { trainingData, modelVersion, userId } = options;
            
            console.log(`Starting model retraining with ${trainingData.length} samples...`);
            
            // Prepare training data for Python script
            const trainingDataPath = path.join(__dirname, '../ml/training_data.json');
            await fs.writeFile(trainingDataPath, JSON.stringify(trainingData, null, 2));
            
            // Run Python training script
            const python = spawn('python', [
                path.join(__dirname, '../ml/train_spoilage_model.py'),
                '--data', trainingDataPath,
                '--version', modelVersion,
                '--output', this.modelPath
            ]);
            
            let output = '';
            let error = '';
            
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            return new Promise((resolve, reject) => {
                python.on('close', (code) => {
                    if (code !== 0) {
                        console.error('Python training error:', error);
                        reject(new Error(`Training failed: ${error}`));
                    } else {
                        console.log('Model retraining completed successfully');
                        this.isModelLoaded = true;
                        this.emit('modelRetrained', {
                            version: modelVersion,
                            samples: trainingData.length,
                            accuracy: this.extractAccuracy(output)
                        });
                        resolve({
                            success: true,
                            version: modelVersion,
                            samples: trainingData.length,
                            accuracy: this.extractAccuracy(output),
                            output: output
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('Retrain model error:', error);
            this.emit('retrainError', error);
            throw error;
        }
    }
    
    /**
     * Upload model file
     */
    async uploadModel(options) {
        try {
            const { modelPath, modelVersion, userId } = options;
            
            // Copy uploaded model to our model path
            if (modelPath && modelPath !== this.modelPath) {
                await fs.copyFile(modelPath, this.modelPath);
            }
            
            // Reload model
            await this.initializeModel();
            
            this.emit('modelUploaded', {
                version: modelVersion,
                path: this.modelPath
            });
            
            return {
                success: true,
                version: modelVersion,
                path: this.modelPath,
                loaded: this.isModelLoaded
            };
            
        } catch (error) {
            console.error('Upload model error:', error);
            throw error;
        }
    }
    
    /**
     * Extract accuracy from training output
     */
    extractAccuracy(output) {
        const accuracyMatch = output.match(/accuracy[:\s]+([\d.]+)/i);
        return accuracyMatch ? parseFloat(accuracyMatch[1]) : 0.85;
    }
    
    /**
     * Get service statistics
     */
    getStats() {
        return {
            isModelLoaded: this.isModelLoaded,
            queueLength: this.predictionQueue.length,
            isProcessing: this.isProcessing,
            modelPath: this.modelPath,
            lastRetrained: this.lastRetrained || null
        };
    }
}

module.exports = new AISpoilageService();
