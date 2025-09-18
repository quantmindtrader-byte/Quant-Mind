import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const SubscriptionStatus = ({ user }) => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const data = await api.get('/api/saas/usage');
      if (data.current_usage && data.plan) {
        setUsage(data);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="text-center text-gray-400">Loading usage data...</div>
      </div>
    );
  }
  
  if (!usage) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="text-center text-gray-400">
          <div className="text-red-400 mb-2">⚠️ Authentication Required</div>
          <div className="text-sm">Please log in to view usage data</div>
        </div>
      </div>
    );
  }

  const { current_usage, plan } = usage;
  const tokensUsed = current_usage.tokens || 0;
  const tokenLimit = plan.token_limit || 0;
  const planName = plan.name || 'Free';
  
  const usagePercent = tokenLimit > 0 ? (tokensUsed / tokenLimit) * 100 : 0;
  const isUnlimited = tokenLimit === -1;
  
  const getStatusColor = () => {
    if (isUnlimited) return 'text-green-400';
    if (usagePercent >= 90) return 'text-red-400';
    if (usagePercent >= 70) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProgressColor = () => {
    if (isUnlimited) return 'bg-green-500';
    if (usagePercent >= 90) return 'bg-red-500';
    if (usagePercent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300">Token Usage</h3>
        <span className={`text-xs font-bold ${getStatusColor()}`}>
          {planName.toUpperCase()}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">
            {tokensUsed.toLocaleString()} used
          </span>
          <span className="text-gray-400">
            {isUnlimited ? 'Unlimited' : `${tokenLimit.toLocaleString()} limit`}
          </span>
        </div>
        
        {!isUnlimited && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            ></div>
          </div>
        )}
        
        <div className="flex justify-between text-xs">
          <span className={getStatusColor()}>
            {isUnlimited ? '∞' : `${usagePercent.toFixed(1)}%`}
          </span>
          <span className="text-gray-400">
            ${current_usage.cost?.toFixed(4) || '0.0000'} cost
          </span>
        </div>
        
        {(() => {
          const warningThreshold = Math.max(tokenLimit * 0.1, 5000);
          const tokensRemaining = tokenLimit - tokensUsed;
          
          if (usagePercent >= 95 && !isUnlimited) {
            return (
              <div className="bg-red-900 border border-red-600 rounded p-2 mt-2">
                <p className="text-red-200 text-xs">
                  🔴 CRITICAL: Only {tokensRemaining.toLocaleString()} tokens left! Upgrade immediately.
                </p>
              </div>
            );
          } else if (tokensRemaining < warningThreshold && !isUnlimited) {
            return (
              <div className="bg-yellow-900 border border-yellow-600 rounded p-2 mt-2">
                <p className="text-yellow-200 text-xs">
                  ⚠️ WARNING: {tokensRemaining.toLocaleString()} tokens remaining. Consider upgrading.
                </p>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
};

export default SubscriptionStatus;