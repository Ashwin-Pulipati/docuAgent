"use client";

import * as React from "react";
import { useNetworkState, useBattery } from "react-use";
import { toast } from "sonner";
import { Wifi, WifiOff, BatteryWarning } from "lucide-react";

export function SystemMonitor() {
  const networkState = useNetworkState();
  const batteryState = useBattery();
  
  const [wasOffline, setWasOffline] = React.useState(false);
  const [lowBatteryNotified, setLowBatteryNotified] = React.useState(false);

  React.useEffect(() => {
    if (!networkState.online && !wasOffline) {
      setWasOffline(true);
      toast.error("You are offline", {
        description: "Check your internet connection.",
        icon: <WifiOff className="h-4 w-4" />,
        duration: Infinity,
        id: "network-status",
      });
    } else if (networkState.online && wasOffline) {
      setWasOffline(false);
      toast.success("Back online", {
        description: "Connection restored.",
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
        id: "network-status",
      });
    }
  }, [networkState.online, wasOffline]);

  React.useEffect(() => {
    if (!batteryState.isSupported || !batteryState.fetched) return;
    
    const level = batteryState.level * 100;
    const isLow = level <= 20;
    const isCharging = batteryState.charging;

    if (isLow && !isCharging && !lowBatteryNotified) {
      setLowBatteryNotified(true);
      toast.warning("Battery is low", {
        description: `Battery is at ${level.toFixed(0)}%. Please plug in.`,
        icon: <BatteryWarning className="h-4 w-4" />,
        duration: 10000,
        id: "battery-status",
      });
    } else if ((!isLow || isCharging) && lowBatteryNotified) {
      setLowBatteryNotified(false);
      toast.dismiss("battery-status");
    }
  }, [batteryState, lowBatteryNotified]);

  return null;
}