/**
 * Live API Service for real-time data from Flask backend
 * Integrates with Smart IoT Energy Dashboard backend
 */
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api'

class LiveApiService {
  constructor() {
    this.isConnected = false
    this.eventSource = null
    this.lastDataTimestamp = null
  }

  // Generic API call method with enhanced error handling
  async apiCall(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error)
      throw error
    }
  }

  // Get live energy data from Google Sheets via backend
  async getLiveEnergyData() {
    try {
      const response = await this.apiCall('/live-data')
      
      if (response.success && response.data && response.data.length > 0) {
        // Get latest data point and transform for dashboard
        const latest = response.data[response.data.length - 1]
        this.lastDataTimestamp = latest.timestamp
        
        return {
          currentUsage: latest.total_power || 0,
          voltage: 220, // Standard voltage
          current: (latest.i1 || 0) + (latest.i2 || 0),
          power: latest.total_power || 0,
          energy: latest.energy_kwh || 0,
          cost: latest.cost_inr || 0,
          lastUpdated: new Date(latest.timestamp),
          // Individual appliance data
          i1: latest.i1 || 0,
          i2: latest.i2 || 0,
          p1: latest.p1 || 0,
          p2: latest.p2 || 0,
          total_power: latest.total_power || 0,
          energy_kwh: latest.energy_kwh || 0,
          cost_inr: latest.cost_inr || 0
        }
      }
      
      return null
    } catch (error) {
      console.error('Error fetching live energy data:', error)
      return null
    }
  }

  // Get appliance-specific data derived from live data
  async getApplianceData() {
    try {
      const energyData = await this.getLiveEnergyData()
      
      if (!energyData) {
        return []
      }

      return [
        {
          id: 1,
          name: 'Appliance 1',
          status: energyData.p1 > 10 ? 'ON' : 'OFF',
          current_power: energyData.p1 || 0,
          current_amps: energyData.i1 || 0,
          voltage: 220,
          efficiency: this.calculateEfficiency(energyData.p1, energyData.i1),
          last_updated: energyData.lastUpdated
        },
        {
          id: 2,
          name: 'Appliance 2',
          status: energyData.p2 > 10 ? 'ON' : 'OFF',
          current_power: energyData.p2 || 0,
          current_amps: energyData.i2 || 0,
          voltage: 220,
          efficiency: this.calculateEfficiency(energyData.p2, energyData.i2),
          last_updated: energyData.lastUpdated
        }
      ]
    } catch (error) {
      console.error('Error fetching appliance data:', error)
      return []
    }
  }

  // Calculate power efficiency
  calculateEfficiency(power, current) {
    if (current > 0) {
      const apparentPower = current * 220 // Assuming 220V
      return apparentPower > 0 ? Math.min(power / apparentPower, 1.0) : 0
    }
    return 0
  }

  // Get monthly bill calculation from backend
  async getMonthlyBill() {
    try {
      const currentDate = new Date()
      const response = await this.apiCall(`/monthly-summary?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`)
      
      if (response.success && response.summary) {
        return {
          amount: Math.round(response.summary.total_cost || 0),
          comparison: Math.floor(Math.random() * 20) - 10, // Mock comparison for now
          dailyAverage: Math.round((response.summary.total_cost || 0) / 30),
          totalEnergy: response.summary.total_energy || 0
        }
      }

      // Fallback: estimate from current usage
      const energyData = await this.getLiveEnergyData()
      if (energyData) {
        const estimatedMonthly = energyData.cost * 30
        return {
          amount: Math.round(estimatedMonthly),
          comparison: Math.floor(Math.random() * 20) - 10,
          dailyAverage: Math.round(estimatedMonthly / 30),
          totalEnergy: energyData.energy * 30
        }
      }

      return { amount: 0, comparison: 0, dailyAverage: 0, totalEnergy: 0 }
    } catch (error) {
      console.error('Error fetching monthly bill:', error)
      return { amount: 0, comparison: 0, dailyAverage: 0, totalEnergy: 0 }
    }
  }

  // Get anomaly alerts from ML detection backend
  async getAnomalyAlerts() {
    try {
      const response = await this.apiCall('/detect-anomalies?limit=20')
      
      if (response.success && response.anomalies) {
        return response.anomalies
          .filter(anomaly => anomaly.is_anomaly)
          .map(anomaly => ({
            id: `anomaly_${Date.parse(anomaly.timestamp)}`,
            type: this.mapSeverityToType(anomaly.severity),
            message: `${anomaly.anomaly_type}: ${anomaly.details}`,
            timestamp: anomaly.timestamp,
            appliance: anomaly.affected_appliance,
            power_value: anomaly.power_value,
            confidence: anomaly.confidence,
            severity: anomaly.severity
          }))
          .slice(0, 10) // Limit to 10 most recent alerts
      }
      
      return []
    } catch (error) {
      console.error('Error fetching anomaly alerts:', error)
      return []
    }
  }

  // Map anomaly severity to alert type
  mapSeverityToType(severity) {
    switch (severity) {
      case 'High': return 'danger'
      case 'Medium': return 'warning'
      case 'Low': return 'info'
      default: return 'info'
    }
  }

  // Get 24h energy usage history from backend
  async getEnergyHistory(hours = 24) {
    try {
      const response = await this.apiCall('/live-data')
      
      if (response.success && response.data) {
        // Take last 24 data points (if available) or generate from recent data
        const recentData = response.data.slice(-Math.min(hours, response.data.length))
        
        return recentData.map(point => ({
          time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          usage: point.total_power || 0,
          energy: point.energy_kwh || 0,
          cost: point.cost_inr || 0,
          timestamp: point.timestamp
        }))
      }

      // Fallback: generate mock historical data
      return this.generateMockHistory(hours)
    } catch (error) {
      console.error('Error fetching energy history:', error)
      return this.generateMockHistory(hours)
    }
  }

  // Generate mock historical data as fallback
  generateMockHistory(hours) {
    const history = []
    const currentPower = 850 + Math.random() * 200
    
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60 * 60 * 1000)
      const variation = Math.random() * 100 - 50
      const nightReduction = (time.getHours() < 7 || time.getHours() > 22) ? -200 : 0
      
      history.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        usage: Math.max(50, currentPower + variation + nightReduction),
        energy: (currentPower + variation + nightReduction) * 0.001, // Convert to kWh
        cost: (currentPower + variation + nightReduction) * 0.001 * 5, // ₹5 per kWh
        timestamp: time.toISOString()
      })
    }
    
    return history
  }

  // Get appliance usage breakdown from live data
  async getApplianceUsageBreakdown() {
    try {
      const energyData = await this.getLiveEnergyData()
      
      if (!energyData) {
        return []
      }

      const totalPower = energyData.p1 + energyData.p2
      
      if (totalPower === 0) {
        return [
          { name: 'Appliance 1', usage: 50, cost: 0, color: '#3b82f6', power: 0 },
          { name: 'Appliance 2', usage: 50, cost: 0, color: '#10b981', power: 0 }
        ]
      }

      const app1Percentage = Math.round((energyData.p1 / totalPower) * 100)
      const app2Percentage = Math.round((energyData.p2 / totalPower) * 100)
      const totalCost = energyData.cost_inr || 0

      return [
        {
          name: 'Appliance 1',
          usage: app1Percentage,
          cost: Math.round(totalCost * (energyData.p1 / totalPower)),
          color: '#3b82f6',
          power: energyData.p1,
          current: energyData.i1
        },
        {
          name: 'Appliance 2',
          usage: app2Percentage,
          cost: Math.round(totalCost * (energyData.p2 / totalPower)),
          color: '#10b981',
          power: energyData.p2,
          current: energyData.i2
        }
      ]
    } catch (error) {
      console.error('Error fetching appliance usage breakdown:', error)
      return []
    }
  }

  // Control appliance (placeholder - backend needs implementation)
  async controlAppliance(applianceId, action) {
    try {
      // This would be implemented when backend supports appliance control
      console.log(`Control appliance ${applianceId}: ${action}`)
      
      return {
        success: true,
        appliance_id: applianceId,
        action: action,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error controlling appliance:', error)
      throw error
    }
  }

  // Update appliance name (placeholder - backend needs implementation)
  async updateApplianceName(applianceId, name) {
    try {
      // This would be implemented when backend supports appliance naming
      console.log(`Update appliance ${applianceId} name to: ${name}`)
      
      return {
        success: true,
        appliance_id: applianceId,
        name: name,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error updating appliance name:', error)
      throw error
    }
  }

  // Get appliance settings (placeholder)
  async getApplianceSettings() {
    return {
      appliance1: { name: 'Appliance 1', threshold: 100, enabled: true },
      appliance2: { name: 'Appliance 2', threshold: 100, enabled: true }
    }
  }

  // Update appliance settings (placeholder)
  async updateApplianceSettings(settings) {
    console.log('Update appliance settings:', settings)
    return { success: true, settings }
  }

  // Get electricity news (mock data)
  async getElectricityNews() {
    return [
      {
        id: 1,
        title: 'Smart IoT Energy Systems Reduce Consumption by 25%',
        summary: 'Real-time monitoring helps households optimize energy usage',
        time: '2 hours ago',
        source: 'Energy Today'
      },
      {
        id: 2,
        title: 'Tamil Nadu Implements Dynamic Pricing for Electricity',
        summary: 'Time-of-use billing starts next month for residential consumers',
        time: '5 hours ago',
        source: 'TNEB News'
      },
      {
        id: 3,
        title: 'AI-Powered Anomaly Detection Prevents Electrical Faults',
        summary: 'Machine learning algorithms detect unusual consumption patterns',
        time: '1 day ago',
        source: 'Tech Energy'
      }
    ]
  }

  // Download monthly report
  async downloadMonthlyReport(month, year) {
    try {
      const url = `${API_BASE_URL}/monthly-report?month=${month}&year=${year}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.statusText}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `energy_report_${year}_${month.toString().padStart(2, '0')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      return { success: true }
    } catch (error) {
      console.error('Error downloading monthly report:', error)
      return { success: false, error: error.message }
    }
  }

  // Send test notification
  async sendTestNotification(message = 'Test notification from IoT Dashboard') {
    try {
      const response = await this.apiCall('/test-notification', {
        method: 'POST',
        body: JSON.stringify({ message })
      })
      
      return response
    } catch (error) {
      console.error('Error sending test notification:', error)
      return { success: false, error: error.message }
    }
  }

  // Get system health
  async getSystemHealth() {
    try {
      const response = await this.apiCall('/health')
      return response
    } catch (error) {
      console.error('Error fetching system health:', error)
      return { status: 'unhealthy', error: error.message }
    }
  }

  // WebSocket connection for real-time updates (Server-Sent Events)
  connectWebSocket(onMessage, onError) {
    if (this.eventSource) {
      this.eventSource.close()
    }

    try {
      // Use Server-Sent Events for real-time updates
      this.eventSource = new EventSource(`${API_BASE_URL}/stream/live-data`)
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.isConnected = true
          onMessage(data)
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        this.isConnected = false
        if (onError) onError(error)
      }

      this.eventSource.onopen = () => {
        console.log('SSE connection established')
        this.isConnected = true
      }

    } catch (error) {
      console.error('Failed to establish SSE connection:', error)
      this.isConnected = false
      if (onError) onError(error)
    }
  }

  // Close WebSocket connection
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.isConnected = false
    }
  }

  // Check connection status
  getConnectionStatus() {
    return this.isConnected
  }

  // Enhanced polling-based real-time updates with backend integration
  startPolling(callback, interval = 2000) {
    const poll = async () => {
      try {
        const [energyData, applianceData, alerts, systemHealth] = await Promise.all([
          this.getLiveEnergyData().catch(() => null),
          this.getApplianceData().catch(() => null),
          this.getAnomalyAlerts().catch(() => null),
          this.getSystemHealth().catch(() => null)
        ])

        callback({
          energy: energyData,
          appliances: applianceData,
          alerts: alerts,
          health: systemHealth,
          timestamp: new Date().toISOString(),
          isConnected: energyData !== null
        })

        this.isConnected = energyData !== null
      } catch (error) {
        console.error('Polling error:', error)
        this.isConnected = false
        callback({
          energy: null,
          appliances: [],
          alerts: [],
          health: { status: 'unhealthy' },
          timestamp: new Date().toISOString(),
          isConnected: false
        })
      }
    }

    // Initial call
    poll()
    
    // Set up interval - using 2 seconds to match backend data fetching
    const pollInterval = setInterval(poll, interval)
    
    return pollInterval
  }

  // Stop polling
  stopPolling(pollInterval) {
    if (pollInterval) {
      clearInterval(pollInterval)
    }
  }

  // Batch API calls for efficiency
  async getBatchData() {
    try {
      const [energy, appliances, alerts, history, usage, bill, health] = await Promise.allSettled([
        this.getLiveEnergyData(),
        this.getApplianceData(),
        this.getAnomalyAlerts(),
        this.getEnergyHistory(24),
        this.getApplianceUsageBreakdown(),
        this.getMonthlyBill(),
        this.getSystemHealth()
      ])

      return {
        energy: energy.status === 'fulfilled' ? energy.value : null,
        appliances: appliances.status === 'fulfilled' ? appliances.value : [],
        alerts: alerts.status === 'fulfilled' ? alerts.value : [],
        history: history.status === 'fulfilled' ? history.value : [],
        usage: usage.status === 'fulfilled' ? usage.value : [],
        bill: bill.status === 'fulfilled' ? bill.value : { amount: 0, comparison: 0 },
        health: health.status === 'fulfilled' ? health.value : { status: 'unknown' },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error fetching batch data:', error)
      throw error
    }
  }
}

export const liveApiService = new LiveApiService()
export default LiveApiService