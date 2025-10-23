const axios = require('axios');
const cron = require('node-cron');

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.airQualityUrl = 'https://api.openweathermap.org/data/2.5/air_pollution';
    this.forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
    
    if (!this.apiKey) {
      console.warn('OPENWEATHER_API_KEY not found in environment variables');
    }
  }

  /**
   * Get current weather data for a specific location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Weather data
   */
  async getCurrentWeather(lat, lon) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeather API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching current weather:', error.message);
      throw error;
    }
  }

  /**
   * Get air quality data for a specific location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Air quality data
   */
  async getAirQuality(lat, lon) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeather API key not configured');
      }

      const response = await axios.get(this.airQualityUrl, {
        params: {
          lat,
          lon,
          appid: this.apiKey
        }
      });

      return this.formatAirQualityData(response.data);
    } catch (error) {
      console.error('Error fetching air quality:', error.message);
      throw error;
    }
  }

  /**
   * Get weather forecast for a specific location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Forecast data
   */
  async getWeatherForecast(lat, lon) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeather API key not configured');
      }

      const response = await axios.get(this.forecastUrl, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return this.formatForecastData(response.data);
    } catch (error) {
      console.error('Error fetching weather forecast:', error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive environmental data (weather + air quality)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Combined environmental data
   */
  async getEnvironmentalData(lat, lon) {
    try {
      const [weather, airQuality, forecast] = await Promise.all([
        this.getCurrentWeather(lat, lon),
        this.getAirQuality(lat, lon),
        this.getWeatherForecast(lat, lon)
      ]);

      return {
        weather,
        airQuality,
        forecast,
        timestamp: new Date(),
        location: { lat, lon }
      };
    } catch (error) {
      console.error('Error fetching environmental data:', error.message);
      throw error;
    }
  }

  /**
   * Format weather data for database storage
   * @param {Object} data - Raw weather data from API
   * @returns {Object} Formatted weather data
   */
  formatWeatherData(data) {
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: data.wind?.speed || 0,
      wind_direction: data.wind?.deg || 0,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      visibility: data.visibility / 1000, // Convert to km
      uv_index: data.uvi || 0,
      cloudiness: data.clouds?.all || 0,
      weather_condition: data.weather[0]?.main || 'Unknown',
      weather_description: data.weather[0]?.description || 'Unknown',
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      timestamp: new Date(data.dt * 1000)
    };
  }

  /**
   * Format air quality data for database storage
   * @param {Object} data - Raw air quality data from API
   * @returns {Object} Formatted air quality data
   */
  formatAirQualityData(data) {
    const aqi = data.list[0];
    const components = aqi.components;

    return {
      aqi: aqi.main.aqi,
      co: components.co,
      no: components.no,
      no2: components.no2,
      o3: components.o3,
      so2: components.so2,
      pm2_5: components.pm2_5,
      pm10: components.pm10,
      nh3: components.nh3,
      timestamp: new Date(aqi.dt * 1000)
    };
  }

  /**
   * Format forecast data for database storage
   * @param {Object} data - Raw forecast data from API
   * @returns {Object} Formatted forecast data
   */
  formatForecastData(data) {
    return data.list.map(item => ({
      timestamp: new Date(item.dt * 1000),
      temperature: item.main.temp,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      wind_speed: item.wind?.speed || 0,
      precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0,
      weather_condition: item.weather[0]?.main || 'Unknown',
      weather_description: item.weather[0]?.description || 'Unknown'
    }));
  }

  /**
   * Get AQI level description
   * @param {number} aqi - Air Quality Index value
   * @returns {Object} AQI level information
   */
  getAQILevel(aqi) {
    const levels = {
      1: { level: 'Good', color: '#00E400', description: 'Air quality is satisfactory' },
      2: { level: 'Fair', color: '#FFFF00', description: 'Air quality is acceptable' },
      3: { level: 'Moderate', color: '#FF7E00', description: 'Sensitive people may experience minor breathing discomfort' },
      4: { level: 'Poor', color: '#FF0000', description: 'Sensitive people may experience breathing discomfort' },
      5: { level: 'Very Poor', color: '#8F3F97', description: 'Everyone may experience breathing discomfort' }
    };

    return levels[aqi] || { level: 'Unknown', color: '#666666', description: 'Unknown air quality level' };
  }

  /**
   * Get weather condition impact on grain storage
   * @param {Object} weather - Weather data
   * @returns {Object} Impact assessment
   */
  assessWeatherImpact(weather) {
    const impacts = {
      temperature_risk: 'low',
      humidity_risk: 'low',
      precipitation_risk: 'low',
      overall_risk: 'low',
      recommendations: []
    };

    // Temperature assessment
    if (weather.temperature > 30) {
      impacts.temperature_risk = 'high';
      impacts.recommendations.push('High temperature detected - consider ventilation');
    } else if (weather.temperature > 25) {
      impacts.temperature_risk = 'medium';
      impacts.recommendations.push('Moderate temperature - monitor storage conditions');
    }

    // Humidity assessment
    if (weather.humidity > 80) {
      impacts.humidity_risk = 'high';
      impacts.recommendations.push('High humidity detected - risk of mold growth');
    } else if (weather.humidity > 70) {
      impacts.humidity_risk = 'medium';
      impacts.recommendations.push('Moderate humidity - monitor grain moisture');
    }

    // Precipitation assessment
    if (weather.precipitation > 5) {
      impacts.precipitation_risk = 'high';
      impacts.recommendations.push('Heavy precipitation - check for water ingress');
    } else if (weather.precipitation > 1) {
      impacts.precipitation_risk = 'medium';
      impacts.recommendations.push('Light precipitation - monitor storage integrity');
    }

    // Overall risk assessment
    const risks = [impacts.temperature_risk, impacts.humidity_risk, impacts.precipitation_risk];
    if (risks.includes('high')) {
      impacts.overall_risk = 'high';
    } else if (risks.includes('medium')) {
      impacts.overall_risk = 'medium';
    }

    return impacts;
  }
}

// Create singleton instance
const weatherService = new WeatherService();

module.exports = weatherService;
