"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Fan, Thermometer, Droplets, Wind } from "lucide-react"

// Mock data
const actuators = [
  {
    id: "ACT001",
    name: "Ventilation Fan #1",
    type: "Fan",
    location: "Silo A",
    status: "Active",
    isOn: true,
    lastAction: "2 minutes ago",
    icon: Fan
  },
  {
    id: "ACT002",
    name: "Temperature Controller",
    type: "Heater",
    location: "Silo B",
    status: "Idle",
    isOn: false,
    lastAction: "1 hour ago",
    icon: Thermometer
  },
  {
    id: "ACT003",
    name: "Moisture Regulator",
    type: "Dehumidifier",
    location: "Silo C",
    status: "Active",
    isOn: true,
    lastAction: "15 minutes ago",
    icon: Droplets
  },
  {
    id: "ACT004",
    name: "Air Circulation",
    type: "Blower",
    location: "Warehouse",
    status: "Maintenance",
    isOn: false,
    lastAction: "3 hours ago",
    icon: Wind
  }
]

export default function ActuatorsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Actuator Control</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">Manual Override</Button>
          <Button>Auto Mode</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actuators.map((actuator) => {
          const IconComponent = actuator.icon
          return (
            <Card key={actuator.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-5 w-5" />
                    <CardTitle className="text-lg">{actuator.name}</CardTitle>
                  </div>
                  <Badge 
                    variant={
                      actuator.status === "Active" ? "default" : 
                      actuator.status === "Idle" ? "secondary" : "destructive"
                    }
                  >
                    {actuator.status}
                  </Badge>
                </div>
                <CardDescription>{actuator.type} • {actuator.location}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Power Status</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{actuator.isOn ? "ON" : "OFF"}</span>
                    <Switch 
                      checked={actuator.isOn} 
                      disabled={actuator.status === "Maintenance"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Action:</span>
                    <span>{actuator.lastAction}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Device ID:</span>
                    <span>{actuator.id}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1">
                    Schedule
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
