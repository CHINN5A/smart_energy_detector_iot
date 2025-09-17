import React, { useState, useEffect, useCallback } from 'react'
import { Element } from 'react-scroll'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Zap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Power,
  Settings,
  Newspaper,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react'
import Card from '../components/Card'
import ApplianceNamingModal from '../components/ApplianceNamingModal'
import { liveApiService } from '../services/liveApiService'

const Dashboard = () => {
  // State for all dashboard data
  const [liveData, setLiveData] = useState({
    currentUsage: 0,
    voltage: 220,
    current: 0,
    power: 0,
    energy: 0,
    lastUpdated: null
  })
  
  const [appliances, setAppliances] = useState([])
  const [monthlyBill, setMonthlyBill] = useState({ amount: 0, comparison: 0 })
  const [alerts, setAlerts] = useState([])
  const [energyHistory, setEnergyHistory] = useState([])
  const [applianceUsage, setApplianceUsage] = useState([])
  const [news, setNews] = useState([])
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [showNamingModal, setShowNamingModal] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  
  // Polling interval reference
  const [pollInterval, setPollInterval] = useState(null)

  // Initialize data fetching
  useEffect(() => {
    initializeDashboard()
    
    return () => {
      // Cleanup
      if (pollInterval) {
        clearInterval(pollInterval)
      }
      liveApiService.disconnect()
    }
  }, [])

  const initializeDashboard = async () => {
    try {
      setLoading(true)
      
      // Try to establish WebSocket connection first
      liveApiService.connectWebSocket(
        handleLiveDataUpdate,
        handleConnectionError
      )
      
      // If WebSocket fails, fall back to polling
      setTimeout(() => {
        if (!liveApiService.getConnectionStatus()) {
          console.log('WebSocket failed, using polling...')
          startPolling()
        }
      }, 3000)
      
      // Load initial data
      await fetchAllData()
      
    } catch (error) {
      console.error('Failed to initialize dashboard:', error)
      // Use mock data as fallback
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const fetchAllData = async () => {
    try {
      const [
        energyData,
        applianceData,
        billData,
        alertData,
        historyData,
        usageData,
        newsData
      ] = await Promise.allSettled([
        liveApiService.getLiveEnergyData(),
        liveApiService.getApplianceData(),
        liveApiService.getMonthlyBill(),
        liveApiService.getAnomalyAlerts(),
        liveApiService.getEnergyHistory(24),
        liveApiService.getApplianceUsageBreakdown(),
        liveApiService.getElectricityNews()
      ])

      // Update state with fetched data or fallbacks
      if (energyData.status === 'fulfilled') {
        setLiveData(prev => ({ ...prev, ...energyData.value, lastUpdated: new Date() }))
        setIsConnected(true)
      }
      
      if (applianceData.status === 'fulfilled') {
        setAppliances(applianceData.value || [])
      }
      
      if (billData.status === 'fulfilled') {
        setMonthlyBill(billData.value || { amount: 0, comparison: 0 })
      }
      
      if (alertData.status === 'fulfilled') {
        setAlerts(alertData.value || [])
      }
      
      if (historyData.status === 'fulfilled') {
        setEnergyHistory(historyData.value || [])
      }
      
      if (usageData.status === 'fulfilled') {
        setApplianceUsage(usageData.value || [])
      }
      
      if (newsData.status === 'fulfilled') {
        setNews(newsData.value || [])
      }
      
      setLastRefresh(new Date())
      
    } catch (error) {
      console.error('Error fetching data:', error)
      setIsConnected(false)
      loadMockData()
    }
  }

  const startPolling = () => {
    const interval = liveApiService.startPolling((data) => {
      if (data.energy) {
        setLiveData(prev => ({ ...prev, ...data.energy, lastUpdated: new Date() }))
        setIsConnected(true)
      }
      if (data.appliances) {
        setAppliances(data.appliances)
      }
      if (data.alerts) {
        setAlerts(data.alerts)
      }
      setLastRefresh(new Date())
    }, 5000) // Poll every 5 seconds
    
    setPollInterval(interval)
  }

  const handleLiveDataUpdate = useCallback((data) => {
    if (data.type === 'energy_update') {
      setLiveData(prev => ({ ...prev, ...data.payload, lastUpdated: new Date() }))
      setIsConnected(true)
    } else if (data.type === 'appliance_update') {
      setAppliances(data.payload || [])
    } else if (data.type === 'alert_update') {
      setAlerts(prev => [...prev, data.payload])
    }
    setLastRefresh(new Date())
  }, [])

  const handleConnectionError = useCallback((error) => {
    console.error('Connection error:', error)
    setIsConnected(false)
    // Start polling as fallback
    startPolling()
  }, [])

  const handleManualRefresh = async () => {
    setLoading(true)
    await fetchAllData()
    setLoading(false)
  }

  const handleApplianceToggle = async (applianceId) => {
    try {
      const appliance = appliances.find(a => a.id === applianceId)
      const newStatus = appliance?.status === 'ON' ? 'OFF' : 'ON'
      
      // Optimistic update
      setAppliances(prev => 
        prev.map(a => 
          a.id === applianceId ? { ...a, status: newStatus } : a
        )
      )
      
      // API call
      await liveApiService.controlAppliance(applianceId, newStatus.toLowerCase())
      
    } catch (error) {
      console.error('Failed to toggle appliance:', error)
      // Revert optimistic update
      setAppliances(prev => 
        prev.map(a => 
          a.id === applianceId ? { ...a, status: a.status === 'ON' ? 'OFF' : 'ON' } : a
        )
      )
    }
  }

  const handleSaveApplianceNames = async (names) => {
    try {
      // Update local state immediately
      setAppliances(prev => 
        prev.map(appliance => ({
          ...appliance,
          name: names[appliance.id] || appliance.name
        }))
      )
      
      // Save to backend
      for (const [applianceId, name] of Object.entries(names)) {
        await liveApiService.updateApplianceName(applianceId, name)
      }
      
    } catch (error) {
      console.error('Failed to save appliance names:', error)
      throw error
    }
  }

  const loadMockData = () => {
    // Fallback mock data when API fails
    setLiveData({
      currentUsage: 85 + Math.random() * 20,
      voltage: 220 + Math.random() * 10,
      current: 3.8 + Math.random() * 1,
      power: 850 + Math.random() * 100,
      energy: 25.5,
      lastUpdated: new Date()
    })
    
    setAppliances([
      { id: 1, name: 'Fan', status: 'ON', current_power: 75 },
      { id: 2, name: 'Bulb', status: 'OFF', current_power: 0 }
    ])
    
    setMonthlyBill({ amount: 1250, comparison: -15 })
    
    setAlerts([
      {
        id: 1,
        type: 'warning',
        message: 'Fan consuming more power than usual',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ])
    
    // Mock energy history (last 24 hours)
    const mockHistory = []
    for (let i = 23; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60 * 60 * 1000)
      mockHistory.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        usage: 50 + Math.random() * 50 + (i < 8 || i > 20 ? -20 : 0) // Lower usage at night
      })
    }
    setEnergyHistory(mockHistory)
    
    setApplianceUsage([
      { name: 'Fan', usage: 60, cost: 120, color: '#3b82f6' },
      { name: 'Bulb', usage: 40, cost: 80, color: '#10b981' }
    ])
    
    setNews([
      {
        id: 1,
        title: 'Tamil Nadu Electricity Board announces new tariff',
        summary: 'New energy-efficient appliance rebates available',
        time: '2 hours ago',
        source: 'TNEB'
      }
    ])
  }

  const getAlertIcon = (type) => {
    const iconClass = "h-4 w-4"
    switch (type) {
      case 'danger': return <AlertTriangle className={`${iconClass} text-red-500`} />
      case 'warning': return <AlertTriangle className={`${iconClass} text-yellow-500`} />
      default: return <Activity className={`${iconClass} text-blue-500`} />
    }
  }

  const getAlertColor = (type) => {
    switch (type) {
      case 'danger': return 'border-red-200 bg-red-50 text-red-800'
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      default: return 'border-blue-200 bg-blue-50 text-blue-800'
    }
  }

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Never'
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your energy dashboard...</p>
          <p className="text-sm text-gray-500">Connecting to IoT devices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with connection status and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Energy Dashboard</h1>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Last updated: {formatLastUpdated(lastRefresh)}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowNamingModal(true)}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            <span>Name Appliances</span>
          </button>
        </div>
      </div>

      {/* Current Usage Section */}
      <Element name="current-usage">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Live Power</p>
                <p className="text-3xl font-bold text-gray-900">{liveData.currentUsage.toFixed(1)} W</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <Activity className="h-4 w-4 mr-1" />
                  Real-time
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Voltage</p>
                <p className="text-3xl font-bold text-gray-900">{liveData.voltage.toFixed(0)} V</p>
                <p className="text-sm text-gray-600">AC Supply</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Power className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current</p>
                <p className="text-3xl font-bold text-gray-900">{liveData.current.toFixed(2)} A</p>
                <p className="text-sm text-gray-600">Live reading</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Energy Today</p>
                <p className="text-3xl font-bold text-gray-900">{liveData.energy.toFixed(1)} kWh</p>
                <p className="text-sm text-gray-600">Accumulated</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      </Element>

      {/* Monthly Bill Section */}
      <Element name="monthly-bill">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Bill Estimate</h3>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-500">Based on current usage</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-600">₹{monthlyBill.amount}</p>
              <p className="text-sm text-green-700 mt-1">Estimated Bill</p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
              {monthlyBill.comparison >= 0 ? (
                <TrendingUp className="h-8 w-8 text-red-600 mx-auto mb-2" />
              ) : (
                <TrendingDown className="h-8 w-8 text-green-600 mx-auto mb-2" />
              )}
              <p className={`text-3xl font-bold ${monthlyBill.comparison >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Math.abs(monthlyBill.comparison)}%
              </p>
              <p className="text-sm text-gray-700 mt-1">vs Last Month</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
              <Zap className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-600">₹{(monthlyBill.amount / 30).toFixed(0)}</p>
              <p className="text-sm text-gray-700 mt-1">Daily Average</p>
            </div>
          </div>
        </Card>
      </Element>

      {/* Active Alerts Section */}
      <Element name="active-alerts">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-sm text-gray-500">{alerts.length} alerts</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {alerts.length > 0 ? alerts.map((alert) => (
              <div key={alert.id} className={`p-4 border rounded-lg ${getAlertColor(alert.type)}`}>
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No active alerts</p>
                <p className="text-sm">Your system is running normally</p>
              </div>
            )}
          </div>
        </Card>
      </Element>

      {/* Energy Usage Chart */}
      <Element name="energy-usage">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Energy Usage (24 Hours)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={energyHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value.toFixed(1)} W`, 'Power Usage']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="usage"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Element>

      {/* Appliance Usage Breakdown */}
      <Element name="appliance-usage">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Appliance Usage Breakdown</h3>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-500">Real-time data</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={applianceUsage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, usage }) => `${name}: ${usage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="usage"
                >
                  {applianceUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-4">
              {applianceUsage.map((appliance, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: appliance.color }}
                    ></div>
                    <span className="font-medium text-gray-900">{appliance.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{appliance.cost}</p>
                    <p className="text-sm text-gray-500">{appliance.usage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Element>

      {/* Device Control Section */}
      <Element name="device-control">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Device Control</h3>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-500">{appliances.length} devices</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appliances.length > 0 ? appliances.map((appliance) => (
              <div key={appliance.id} className="flex items-center justify-between p-6 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${appliance.status === 'ON' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Power className={`h-6 w-6 ${appliance.status === 'ON' ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{appliance.name || `Device ${appliance.id}`}</p>
                    <p className="text-sm text-gray-500">{appliance.current_power || 0}W</p>
                  </div>
                </div>
                <button
                  onClick={() => handleApplianceToggle(appliance.id)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    appliance.status === 'ON' ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      appliance.status === 'ON' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )) : (
              <div className="col-span-2 text-center py-12 text-gray-500">
                <Settings className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium">No devices detected</p>
                <p className="text-sm">Connect your IoT devices to start monitoring</p>
              </div>
            )}
          </div>
        </Card>
      </Element>

      {/* Electricity News Section */}
      <Element name="electricity-news">
        <Card>
          <div className="flex items-center space-x-2 mb-6">
            <Newspaper className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Electricity News & Updates</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {news.length > 0 ? news.map((article) => (
              <div key={article.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-gray-900 mb-2">{article.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{article.summary}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{article.source}</span>
                  <span>{article.time}</span>
                </div>
              </div>
            )) : (
              <div className="col-span-3 text-center py-8 text-gray-500">
                <Newspaper className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No news available</p>
                <p className="text-sm">Check back later for updates</p>
              </div>
            )}
          </div>
        </Card>
      </Element>

      {/* Appliance Naming Modal */}
      <ApplianceNamingModal
        isOpen={showNamingModal}
        onClose={() => setShowNamingModal(false)}
        appliances={appliances}
        onSave={handleSaveApplianceNames}
      />
    </div>
  )
}

export default Dashboard 