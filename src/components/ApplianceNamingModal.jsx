import React, { useState, useEffect } from 'react'
import { X, Save, Settings, Lightbulb, Fan, Tv, Wind, Refrigerator, Zap } from 'lucide-react'

const ApplianceNamingModal = ({ isOpen, onClose, appliances, onSave }) => {
  const [applianceNames, setApplianceNames] = useState({})
  const [loading, setSaving] = useState(false)

  // Predefined appliance suggestions with icons
  const applianceSuggestions = [
    { name: 'Fan', icon: Fan },
    { name: 'Bulb', icon: Lightbulb },
    { name: 'LED Light', icon: Lightbulb },
    { name: 'Air Conditioner', icon: Wind },
    { name: 'TV', icon: Tv },
    { name: 'Refrigerator', icon: Refrigerator },
    { name: 'Water Heater', icon: Zap },
    { name: 'Washing Machine', icon: Settings },
    { name: 'Microwave', icon: Zap },
    { name: 'Computer', icon: Settings }
  ]

  useEffect(() => {
    if (appliances) {
      const names = {}
      appliances.forEach(appliance => {
        names[appliance.id] = appliance.name || `Appliance ${appliance.id}`
      })
      setApplianceNames(names)
    }
  }, [appliances])

  const handleNameChange = (applianceId, name) => {
    setApplianceNames(prev => ({
      ...prev,
      [applianceId]: name
    }))
  }

  const selectSuggestion = (applianceId, suggestionName) => {
    handleNameChange(applianceId, suggestionName)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(applianceNames)
      onClose()
    } catch (error) {
      console.error('Failed to save appliance names:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Name Your Appliances</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-80 overflow-y-auto">
          {appliances?.map((appliance) => (
            <div key={appliance.id} className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Device {appliance.id} Name
                  </label>
                  <input
                    type="text"
                    value={applianceNames[appliance.id] || ''}
                    onChange={(e) => handleNameChange(appliance.id, e.target.value)}
                    placeholder={`Enter name for Device ${appliance.id}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="ml-13">
                <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {applianceSuggestions.slice(0, 6).map((suggestion) => (
                    <button
                      key={suggestion.name}
                      onClick={() => selectSuggestion(appliance.id, suggestion.name)}
                      className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    >
                      <suggestion.icon className="h-3 w-3" />
                      <span>{suggestion.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current status */}
              <div className="ml-13 flex items-center space-x-4 text-sm text-gray-500">
                <span>Current: {appliance.current_power || 0}W</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  appliance.status === 'ON' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {appliance.status || 'OFF'}
                </span>
              </div>
            </div>
          ))}

          {(!appliances || appliances.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>No appliances detected.</p>
              <p className="text-sm">Make sure your IoT devices are connected.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            Names will be used across all dashboard sections
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Names'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApplianceNamingModal