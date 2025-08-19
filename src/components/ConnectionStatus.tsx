import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function ConnectionStatus({ isConnected, isLoading, error }: ConnectionStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        Processing...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Error
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${
      isConnected 
        ? 'text-green-600 bg-green-50' 
        : 'text-red-600 bg-red-50'
    }`}>
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          Connected
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Disconnected
        </>
      )}
    </div>
  );
}