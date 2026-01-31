import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  CalendarIcon, 
  BuildingOffice2Icon, 
  CheckCircleIcon, 

  ChartBarIcon,
  TrophyIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const DonationHistory = ({ donorId }) => {
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (donorId) {
      fetchDonationHistory();
    }
  }, [donorId]);

  const fetchDonationHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/donation-history/${donorId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setDonations(response.data.donations || []);
      setStats(response.data.stats || {});
      setLoading(false);
    } catch (error) {
      console.error('Failed to load donation history:', error);
      toast.error('Failed to load donation history');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateNextDonationDate = (lastDonationDate) => {
    if (!lastDonationDate) return null;
    const lastDate = new Date(lastDonationDate);
    const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + 3));
    return nextDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="flex flex-col items-center">
            <TrophyIcon className="h-8 w-8 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats?.totalDonations || 0}</div>
            <div className="text-sm text-gray-600">Total Donations</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="flex flex-col items-center">
            <HeartIcon className="h-8 w-8 text-red-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats?.livesSaved || 0}</div>
            <div className="text-sm text-gray-600">Lives Saved</div>
            <div className="text-xs text-gray-500 mt-1">(3 lives per donation)</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="flex flex-col items-center">
            <CalendarIcon className="h-8 w-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats?.lastDonation ? formatDate(stats.lastDonation) : 'Never'}
            </div>
            <div className="text-sm text-gray-600">Last Donation</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="flex flex-col items-center">
            <ChartBarIcon className="h-8 w-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats?.daysSinceLast || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Days Since Last</div>
          </div>
        </div>
      </div>

      {/* Next Donation Info */}
      {stats?.lastDonation && (
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start">
            <CalendarIcon className="h-6 w-6 text-blue-500 mt-1 mr-3" />
            <div>
              <h3 className="font-semibold text-blue-800">Next Donation Eligibility</h3>
              <p className="text-blue-700 mt-1">
                You can donate again on <span className="font-bold">
                  {calculateNextDonationDate(stats.lastDonation)}
                </span>. Remember to stay hydrated and eat healthy before donating!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Donation History Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Donation History</h3>
            <p className="text-gray-600 mt-1">Your previous blood donations</p>
          </div>
          <button
            onClick={fetchDonationHistory}
            className="btn btn-secondary flex items-center"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {donations.length === 0 ? (
          <div className="text-center py-12">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">No Donation History</h4>
            <p className="text-gray-500 mb-6">You haven't made any donations yet. Be the first to save lives!</p>
            <div className="bg-gradient-blood text-white rounded-lg p-4 max-w-md mx-auto">
              <p className="font-medium">Each donation can save up to 3 lives. Your contribution matters!</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hospital</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((donation) => (
                    <tr key={donation.donation_id}>
                      <td>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(donation.donation_date)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center">
                          <BuildingOffice2Icon className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{donation.hospital_name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`blood-group-badge blood-group-${donation.blood_group?.toLowerCase().replace('+', '-plus').replace('-', '-minus')}`}>
                          {donation.blood_group}
                        </span>
                      </td>
                      <td>
                        <div className="font-medium">{donation.quantity_units} unit(s)</div>
                      </td>
                      <td>
                        <span className="badge badge-success flex items-center">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Completed
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => generateCertificate(donation)}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{donations.length}</span> of{' '}
                <span className="font-medium">{donations.length}</span> donations
              </div>
              <div className="flex space-x-2">
                <button className="btn btn-sm btn-secondary">Previous</button>
                <button className="btn btn-sm btn-secondary">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Impact Summary */}
      {donations.length > 0 && (
        <div className="card bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
          <div className="flex items-center">
            <TrophyIcon className="h-10 w-10 text-yellow-500 mr-4" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Your Impact Summary</h3>
              <p className="text-gray-700 mt-1">
                You have donated <span className="font-bold text-primary-600">{stats?.totalDonations} times</span>, 
                potentially saving up to <span className="font-bold text-green-600">{stats?.livesSaved} lives</span>!
              </p>
              <div className="mt-3 flex items-center">
                <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm text-gray-600">
                  Thank you for your life-saving contributions!
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function generateCertificate(donation) {
    toast.info('Certificate generation would be implemented in production');
  }
};

export default DonationHistory;