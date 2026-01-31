import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import DonationHistory from './DonationHistory';
import { 
  HeartIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  CalendarIcon, 
  MapPinIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon,
  TrophyIcon,
  ChartBarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const DonorDashboard = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [donorInfo, setDonorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState('available');
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDonorData();
  }, []);

  const fetchDonorData = async () => {
    try {
      setLoading(true);
      
      // Get donor profile with stats
      const profileRes = await axios.get('http://localhost:5000/api/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setDonorInfo(profileRes.data);
      setAvailability(profileRes.data.availability_status || 'available');
      
      // Get matches for this donor
      const matchesRes = await axios.get('http://localhost:5000/api/my-matches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMatches(matchesRes.data);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load donor data:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to load donor data');
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await fetchDonorData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const updateAvailability = async (status) => {
    try {
      setUpdating(true);
      
      await axios.put('http://localhost:5000/api/profile', {
        availability_status: status
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setAvailability(status);
      toast.success(`Status updated to ${status}`);
      
      // Refresh data
      await fetchDonorData();
    } catch (error) {
      console.error('Update error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update availability');
    } finally {
      setUpdating(false);
    }
  };

  const updateMatchStatus = async (matchId, status) => {
    try {
      await axios.put(`http://localhost:5000/api/matches/${matchId}`, {
        match_status: status
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      toast.success(`Request ${status} successfully`);
      
      // Refresh matches
      await fetchDonorData();
    } catch (error) {
      console.error('Update match error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update request status');
    }
  };

  const handleDonationCompleted = async (matchId) => {
    try {
      // Complete the donation
      await axios.put(`http://localhost:5000/api/matches/${matchId}/complete`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      toast.success('Donation marked as completed and recorded in history!');
      await fetchDonorData();
    } catch (error) {
      console.error('Donation completion error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to mark donation as completed');
    }
  };

  const bloodGroupColor = (bloodGroup) => {
    const colors = {
      'A+': 'blood-group-a-plus',
      'A-': 'blood-group-a-minus',
      'B+': 'blood-group-b-plus',
      'B-': 'blood-group-b-minus',
      'AB+': 'blood-group-ab-plus',
      'AB-': 'blood-group-ab-minus',
      'O+': 'blood-group-o-plus',
      'O-': 'blood-group-o-minus'
    };
    return colors[bloodGroup] || 'blood-group-o-plus';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="spinner spinner-lg mb-4"></div>
        <p className="text-gray-600">Loading donor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header with refresh button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your donations and respond to emergency requests</p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="btn btn-secondary flex items-center"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Stats & Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Donor Info Card */}
        <div className="card col-span-2">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-4">{donorInfo?.full_name || 'No Name Provided'}</h2>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <HeartIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className={`blood-group-badge ${bloodGroupColor(donorInfo?.blood_group)} mr-2`}>
                    {donorInfo?.blood_group || 'Unknown'}
                  </span>
                  <span>Blood Group</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <PhoneIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">{donorInfo?.phone || 'No phone provided'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <EnvelopeIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">{donorInfo?.email || 'No email provided'}</span>
                </div>
                <div className="flex items-start text-gray-600">
                  <MapPinIcon className="h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>{donorInfo?.address || 'No address provided'}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`badge ${
                availability === 'available' ? 'badge-success' :
                availability === 'unavailable' ? 'badge-danger' :
                'badge-warning'
              } mb-4 inline-block`}>
                {availability === 'available' ? 'Available' :
                 availability === 'unavailable' ? 'Unavailable' :
                 'Recently Donated'}
              </div>
              <div className="text-sm text-gray-500">
                Last donation: {donorInfo?.last_donation_date ?
                  new Date(donorInfo.last_donation_date).toLocaleDateString() :
                  'Never'}
              </div>
            </div>
          </div>
        </div>

        {/* Availability Controls */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Availability Status</h3>
          <div className="space-y-3">
            <button
              onClick={() => updateAvailability('available')}
              disabled={updating}
              className={`w-full py-3 rounded-lg flex items-center justify-center ${
                availability === 'available' ? 'btn-success' : 'btn-secondary'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Available to Donate
            </button>
            <button
              onClick={() => updateAvailability('unavailable')}
              disabled={updating}
              className={`w-full py-3 rounded-lg flex items-center justify-center ${
                availability === 'unavailable' ? 'btn-danger' : 'btn-secondary'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <XCircleIcon className="h-5 w-5 mr-2" />
              Currently Unavailable
            </button>
            <button
              onClick={() => updateAvailability('recently_donated')}
              disabled={updating}
              className={`w-full py-3 rounded-lg flex items-center justify-center ${
                availability === 'recently_donated' ? 'btn-warning' : 'btn-secondary'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CalendarIcon className="h-5 w-5 mr-2" />
              Recently Donated
            </button>
          </div>
          {updating && (
            <div className="mt-3 text-sm text-gray-500 text-center">
              Updating status...
            </div>
          )}
        </div>
      </div>

      {/* Emergency Matches */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold">Emergency Blood Requests</h2>
            <p className="text-gray-600 text-sm mt-1">Requests matching your blood type</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="badge badge-primary">{matches.length} requests</span>
            <button
              onClick={() => fetchDonorData()}
              className="btn btn-sm btn-secondary"
            >
              Check for New Requests
            </button>
          </div>
        </div>
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Emergency Requests</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              There are currently no emergency blood requests matching your blood type.
              Hospitals will contact you when there's a match.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-blue-800 text-sm">
                <strong>Tip:</strong> Make sure your availability status is set to "Available to Donate"
                to receive notifications for matching requests.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Blood Needed</th>
                  <th>Urgency</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.match_id}>
                    <td>
                      <div className="font-medium">{match.hospital_name}</div>
                      <div className="text-sm text-gray-500">{match.hospital_phone}</div>
                    </td>
                    <td>
                      <div className="flex items-center">
                        <span className={`blood-group-badge ${bloodGroupColor(match.blood_group)} mr-2`}>
                          {match.blood_group}
                        </span>
                        <span>{match.quantity_units} unit(s)</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        match.urgency_level === 'critical' ? 'badge-danger' :
                        match.urgency_level === 'high' ? 'badge-warning' :
                        match.urgency_level === 'medium' ? 'badge-info' :
                        'badge-success'
                      }`}>
                        {match.urgency_level}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(match.request_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        match.match_status === 'pending' ? 'badge-warning' :
                        match.match_status === 'contacted' ? 'badge-info' :
                        match.match_status === 'confirmed' ? 'badge-success' :
                        match.match_status === 'completed' ? 'badge-primary' :
                        'badge-secondary'
                      }`}>
                        {match.match_status}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {match.match_status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateMatchStatus(match.match_id, 'confirmed')}
                              className="btn btn-success btn-sm"
                              title="Accept this request"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateMatchStatus(match.match_id, 'cancelled')}
                              className="btn btn-danger btn-sm"
                              title="Decline this request"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {match.match_status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleDonationCompleted(match.match_id)}
                              className="btn btn-info btn-sm"
                              title="Mark donation as completed"
                            >
                              Donation Done
                            </button>
                            <button
                              onClick={() => updateMatchStatus(match.match_id, 'cancelled')}
                              className="btn btn-danger btn-sm"
                              title="Cancel donation"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(match.match_status === 'contacted' || match.match_status === 'completed') && (
                          <span className="text-sm text-gray-500 px-2 py-1 bg-gray-100 rounded">
                            No action required
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Donation History */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Donation History</h2>
            <p className="text-gray-600 text-sm mt-1">Track your donations and impact</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="badge badge-primary">
              {donorInfo?.total_donations || 0} donations
            </span>
            <button
              onClick={() => fetchDonorData()}
              className="btn btn-sm btn-secondary"
            >
              Refresh History
            </button>
          </div>
        </div>
        
        {donorInfo?.donor_id ? (
          <DonationHistory donorId={donorInfo.donor_id} />
        ) : (
          <div className="text-center py-12">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Loading donation history...
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions & Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Donation Impact</h2>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <TrophyIcon className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="font-semibold text-green-800">Your Contribution</h3>
              </div>
              <p className="text-green-700 text-sm">
                Each blood donation can save up to 3 lives. With {donorInfo?.total_donations || 0} donations,
                you've potentially saved up to {(donorInfo?.total_donations || 0) * 3} lives!
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-800">Donation Frequency</h3>
              </div>
              <ul className="text-blue-700 text-sm list-disc pl-5 space-y-1">
                <li>Whole blood: Every 56 days (8 weeks)</li>
                <li>Platelets: Every 7 days, up to 24 times/year</li>
                <li>Plasma: Every 28 days, up to 13 times/year</li>
                <li>Double red cells: Every 112 days (16 weeks)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Quick Information</h2>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">Before Donating</h3>
              <ul className="text-yellow-700 text-sm list-disc pl-5 space-y-1">
                <li>Eat a healthy meal before donation</li>
                <li>Drink plenty of water (2-3 glasses)</li>
                <li>Get a good night's sleep (7-8 hours)</li>
                <li>Avoid alcohol for 24 hours before</li>
                <li>Avoid fatty foods on donation day</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">After Donating</h3>
              <ul className="text-purple-700 text-sm list-disc pl-5 space-y-1">
                <li>Drink extra fluids for 24-48 hours</li>
                <li>Avoid strenuous exercise for 24 hours</li>
                <li>Keep the bandage on for several hours</li>
                <li>Eat iron-rich foods (red meat, spinach)</li>
                <li>If you feel dizzy, lie down with feet up</li>
              </ul>
            </div>
            
            <button
              onClick={refreshData}
              className="w-full btn btn-primary mt-4"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2 inline" />
              Refresh All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;