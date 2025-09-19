import React, { useState, useEffect } from 'react';

const PaymentModal = ({ isOpen, onClose, onSuccess }) => {
  const [plans, setPlans] = useState({});
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoCredentials, setDemoCredentials] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      fetchDemoCredentials();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/payment/plans');
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchDemoCredentials = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/payment/demo-credentials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDemoCredentials(data.demo_credentials);
      }
    } catch (error) {
      console.error('Error fetching demo credentials:', error);
    }
  };

  const initiatePayment = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ membership_type: selectedPlan })
      });
      
      const data = await response.json();
      if (data.success) {
        setPaymentData(data);
        // In a real implementation, redirect to Fastpay checkout
        // For demo, simulate payment completion
        setTimeout(() => {
          simulatePaymentSuccess(data.order_id);
        }, 2000);
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulatePaymentSuccess = async (orderId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          order_id: orderId, 
          status: 'success',
          transaction_id: `TXN_${Date.now()}`
        })
      });
      
      const data = await response.json();
      if (data.success && data.payment_verified) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Upgrade Membership</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
        </div>

        {!paymentData ? (
          <>
            <div className="space-y-3 mb-6">
              {Object.entries(plans).map(([key, plan]) => (
                <div key={key} className="border border-gray-600 rounded-lg p-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="plan"
                      value={key}
                      checked={selectedPlan === key}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">{plan.name}</div>
                      <div className="text-gray-400">${plan.price}/month</div>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            {demoCredentials && (
              <div className="bg-blue-900 rounded-lg p-3 mb-4">
                <h3 className="text-sm font-medium text-blue-200 mb-2">Demo Credentials</h3>
                <div className="text-xs text-blue-100 space-y-1">
                  <div>Bank: {demoCredentials.bank_name}</div>
                  <div>Account: {demoCredentials.account_no}</div>
                  <div>NIC: {demoCredentials.nic}</div>
                  <div>OTP: {demoCredentials.otp}</div>
                </div>
              </div>
            )}

            <button
              onClick={initiatePayment}
              disabled={!selectedPlan || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg"
            >
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className="text-white mb-4">
              Payment initiated for {plans[selectedPlan]?.name} plan
            </div>
            <div className="text-gray-400 mb-4">
              Order ID: {paymentData.order_id}
            </div>
            <div className="text-sm text-blue-200">
              Simulating payment completion...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;