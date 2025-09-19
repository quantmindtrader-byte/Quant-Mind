import React, { useEffect, useRef, useState } from 'react';

const TradingViewWidget = ({ 
  symbol = 'EURUSD', 
  width = '100%', 
  height = '400px',
  onSymbolChange = null 
}) => {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [currentSymbol, setCurrentSymbol] = useState(symbol);

  const symbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF',
    'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'BTCUSD', 'ETHUSD',
    'XAUUSD', 'XAGUSD', 'US30', 'SPX500', 'NAS100'
  ];

  const getSymbolFormat = (symbol) => {
    const symbolMap = {
      'EURUSD': 'FX:EURUSD',
      'GBPUSD': 'FX:GBPUSD', 
      'USDJPY': 'FX:USDJPY',
      'AUDUSD': 'FX:AUDUSD',
      'USDCAD': 'FX:USDCAD',
      'USDCHF': 'FX:USDCHF',
      'NZDUSD': 'FX:NZDUSD',
      'EURGBP': 'FX:EURGBP',
      'EURJPY': 'FX:EURJPY',
      'GBPJPY': 'FX:GBPJPY',
      'BTCUSD': 'COINBASE:BTCUSD',
      'ETHUSD': 'COINBASE:ETHUSD',
      'XAUUSD': 'FX:XAUUSD',
      'XAGUSD': 'FX:XAGUSD',
      'US30': 'DJ:DJI',
      'SPX500': 'SP:SPX',
      'NAS100': 'NASDAQ:NDX'
    };
    return symbolMap[symbol] || `FX:${symbol}`;
  };

  const loadTradingViewWidget = (symbolToLoad) => {
    if (!containerRef.current) return;

    // Clear existing widget
    containerRef.current.innerHTML = '';

    // Generate unique container ID
    const containerId = `tradingview_${Date.now()}`;
    containerRef.current.id = containerId;

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        try {
          widgetRef.current = new window.TradingView.widget({
            autosize: true,
            symbol: getSymbolFormat(symbolToLoad),
            interval: '15',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#1f2937',
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: containerId,
            hide_side_toolbar: false,
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            studies: ['RSI@tv-basicstudies'],
            loading_screen: { backgroundColor: '#1f2937' },
            overrides: {
              'paneProperties.background': '#1f2937',
              'paneProperties.vertGridProperties.color': '#374151',
              'paneProperties.horzGridProperties.color': '#374151',
              'symbolWatermarkProperties.transparency': 90,
              'scalesProperties.textColor': '#9ca3af'
            }
          });
        } catch (error) {
          console.error('TradingView widget error:', error);
        }
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  };

  useEffect(() => {
    const cleanup = loadTradingViewWidget(currentSymbol);
    return cleanup;
  }, [currentSymbol]);

  const handleSymbolChange = (newSymbol) => {
    setCurrentSymbol(newSymbol);
    if (onSymbolChange) {
      onSymbolChange(newSymbol);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Chart Container */}
      <div 
        ref={containerRef}
        style={{ width, height }}
        className="bg-gray-900"
      />
    </div>
  );
};

export default TradingViewWidget;