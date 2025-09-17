import React from 'react'
import { Link as ScrollLink } from 'react-scroll'
import { 
  BarChart3, 
  Zap, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  Settings, 
  Newspaper,
  Activity
} from 'lucide-react'

const Sidebar = () => {
  const menuItems = [
    { 
      icon: Activity, 
      label: 'Current Usage', 
      target: 'current-usage',
      description: 'Live energy monitoring'
    },
    { 
      icon: DollarSign, 
      label: 'Monthly Bill', 
      target: 'monthly-bill',
      description: 'Cost analysis'
    },
    { 
      icon: AlertTriangle, 
      label: 'Active Alerts', 
      target: 'active-alerts',
      description: 'System notifications'
    },
    { 
      icon: BarChart3, 
      label: 'Energy Usage', 
      target: 'energy-usage',
      description: '24h consumption chart'
    },
    { 
      icon: TrendingUp, 
      label: 'Appliance Usage', 
      target: 'appliance-usage',
      description: 'Device-wise breakdown'
    },
    { 
      icon: Settings, 
      label: 'Device Control', 
      target: 'device-control',
      description: 'Control appliances'
    },
    { 
      icon: Newspaper, 
      label: 'Electricity News', 
      target: 'electricity-news',
      description: 'Latest updates'
    }
  ]

  return (
    <aside className="w-64 bg-white shadow-sm border-r min-h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <Zap className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Smart Energy</h2>
            <p className="text-xs text-gray-500">IoT Dashboard</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {menuItems.map((item, index) => (
            <ScrollLink
              key={index}
              to={item.target}
              spy={true}
              smooth={true}
              offset={-80}
              duration={500}
              activeClass="bg-blue-50 text-blue-600 border-blue-200"
              className="flex items-start space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-all duration-200 border border-transparent group"
            >
              <item.icon className="h-5 w-5 mt-0.5 group-hover:text-blue-600 transition-colors" />
              <div className="flex-1">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-gray-400 group-hover:text-gray-600">
                  {item.description}
                </div>
              </div>
            </ScrollLink>
          ))}
        </nav>
        
        {/* Live Status Indicator */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">Live Data</span>
          </div>
          <p className="text-xs text-green-600 mt-1">Connected to IoT devices</p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar