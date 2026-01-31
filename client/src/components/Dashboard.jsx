import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  HeartIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  BellIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();

  const getDashboardContent = () => {
    switch (user?.role) {
      case 'donor':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                <HeartIcon className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome back, <span className="text-red-600">{user?.username}!</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Thank you for being a life-saving blood donor. Your contributions make a real difference in emergencies.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <UserGroupIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">View Matches</h3>
                  <p className="text-gray-600 mb-6">Check emergency blood requests that match your blood type</p>
                  <a 
                    href="/donor" 
                    className="inline-flex items-center justify-center w-full px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Go to Donor Portal
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </a>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <BellIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Update Availability</h3>
                  <p className="text-gray-600 mb-6">Let hospitals know when you're available to donate blood</p>
                  <button className="inline-flex items-center justify-center w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-red-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors">
                    Update Status
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <HeartIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Donation History</h3>
                  <p className="text-gray-600 mb-6">Track your previous donations and see the impact you've made</p>
                  <button className="inline-flex items-center justify-center w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors">
                    View History
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-12 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100">
              <div className="flex items-center">
                <HeartIcon className="h-12 w-12 text-red-500 mr-4" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Did You Know?</h3>
                  <p className="text-gray-700">
                    Each blood donation can save up to 3 lives. Regular donors are the backbone of our emergency response system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'hospital':
        return (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                <BuildingOfficeIcon className="h-10 w-10 text-blue-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome, <span className="text-blue-600">{user?.username}!</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Manage blood requests and find compatible donors quickly to save lives in emergency situations.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <BellIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Create Blood Request</h3>
                  <p className="text-gray-600 mb-6">Submit new blood requests for emergency cases and critical needs</p>
                  <a 
                    href="/hospital" 
                    className="inline-flex items-center justify-center w-full px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Go to Hospital Portal
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </a>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <UserGroupIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Find Donors</h3>
                  <p className="text-gray-600 mb-6">Search for available donors by blood type and location</p>
                  <button className="inline-flex items-center justify-center w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-green-500 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors">
                    Search Donors
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <HeartIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Track Requests</h3>
                  <p className="text-gray-600 mb-6">Monitor the status of all your blood requests and donor responses</p>
                  <button className="inline-flex items-center justify-center w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors">
                    View Requests
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-12 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-12 w-12 text-blue-500 mr-4" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Quick Response System</h3>
                  <p className="text-gray-700">
                    Our automated matching system connects you with compatible donors within minutes of submitting a request.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'admin':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                <UserGroupIcon className="h-10 w-10 text-gray-700" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome, <span className="text-gray-700">Administrator!</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Manage the entire blood donation system, monitor statistics, and ensure smooth operations.
              </p>
              <a 
                href="/admin" 
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl hover:from-gray-800 hover:to-black focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Go to Admin Dashboard
                <ArrowRightIcon className="ml-3 h-6 w-6" />
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">System Overview</h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-gray-700">User Management</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-700">Statistics & Analytics</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-gray-700">Database Administration</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-gray-700">System Monitoring</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-4">
                  <button className="w-full text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors">
                    <span className="font-medium text-gray-900">View System Logs</span>
                  </button>
                  <button className="w-full text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <span className="font-medium text-gray-900">Generate Reports</span>
                  </button>
                  <button className="w-full text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
                    <span className="font-medium text-gray-900">Backup Database</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <div className="spinner spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        );
    }
  };

  return (
    <div className="py-8">
      {getDashboardContent()}
    </div>
  );
};

export default Dashboard;