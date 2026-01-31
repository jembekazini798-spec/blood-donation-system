import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  PlusIcon, 
  FunnelIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  PhoneIcon, 
  MapPinIcon, 
  EnvelopeIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [donors, setDonors] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contactingDonor, setContactingDonor] = useState(null);
  const [viewingDonors, setViewingDonors] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newRequest, setNewRequest] = useState({
    blood_group: 'O+',
    quantity_units: 1,
    urgency_level: 'medium',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [requestsRes, donorsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/blood-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/donors', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      setRequests(requestsRes.data);
      setDonors(donorsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to load data');
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/api/blood-requests', newRequest, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success('Blood request submitted successfully');
      setShowRequestForm(false);
      fetchData();
      setNewRequest({
        blood_group: 'O+',
        quantity_units: 1,
        urgency_level: 'medium',
        notes: ''
      });
    } catch (error) {
      console.error('Submit request error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to submit request');
    }
  };

  const contactDonor = async (donorId, donorName) => {
    try {
      setContactingDonor(donorId);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`http://localhost:5000/api/contact-donor/${donorId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const donor = response.data.donor;
      
      // Show donor contact info in a modal
      const contactInfo = `
Donor Contact Information:
Name: ${donor.name}
Phone: ${donor.phone}
Email: ${donor.email}

Note: In a real application, this would send a notification to the donor.
      `;
      
      alert(contactInfo);
      toast.success(`Contact information retrieved for ${donor.name}`);
      
    } catch (error) {
      console.error('Contact donor error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to contact donor');
    } finally {
      setContactingDonor(null);
    }
  };

  const viewRequestDonors = async (requestId, bloodGroup) => {
    try {
      setViewingDonors(requestId);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`http://localhost:5000/api/requests/${requestId}/donors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const donors = response.data;
      
      if (donors.length === 0) {
        toast.info(`No donors matched for ${bloodGroup} request yet`);
        return;
      }
      
      // Create a detailed donors list
      let donorList = `MATCHED DONORS FOR ${bloodGroup} REQUEST\n\n`;
      donorList += `Total Donors: ${donors.length}\n\n`;
      
      donors.forEach((donor, index) => {
        donorList += `${index + 1}. ${donor.full_name} (${donor.blood_group})\n`;
        donorList += `   Status: ${donor.availability_status}\n`;
        donorList += `   Match Status: ${donor.match_status}\n`;
        donorList += `   Phone: ${donor.phone}\n`;
        donorList += `   Email: ${donor.email}\n`;
        donorList += `   Location: ${donor.address}\n`;
        donorList += `   Last Donation: ${donor.last_donation_date ?
          new Date(donor.last_donation_date).toLocaleDateString() : 'Never'}\n\n`;
      });
      
      alert(donorList);
      
    } catch (error) {
      console.error('View donors error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to load donors');
    } finally {
      setViewingDonors(null);
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'green' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' }
  ];

  const filteredDonors = donors.filter(donor =>
    donor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hospital dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hospital Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage blood requests and find compatible donors quickly</p>
          </div>
          <button
            onClick={() => setShowRequestForm(true)}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Blood Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-3xl font-bold text-gray-900 mb-2">{requests.length}</div>
          <div className="text-gray-600 text-sm font-medium uppercase tracking-wider">Total Requests</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {requests.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-gray-600 text-sm font-medium uppercase tracking-wider">Pending</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {requests.filter(r => r.status === 'matched').length}
          </div>
          <div className="text-gray-600 text-sm font-medium uppercase tracking-wider">Matched</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-3xl font-bold text-gray-900 mb-2">{donors.length}</div>
          <div className="text-gray-600 text-sm font-medium uppercase tracking-wider">Available Donors</div>
        </div>
      </div>

      {/* Blood Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">New Blood Request</h3>
                      <button
                        onClick={() => setShowRequestForm(false)}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                      >
                        &times;
                      </button>
                    </div>
                    
                    <form onSubmit={handleSubmitRequest} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                          <select
                            value={newRequest.blood_group}
                            onChange={(e) => setNewRequest({...newRequest, blood_group: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                          >
                            {bloodGroups.map(group => (
                              <option key={group} value={group}>{group}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Units)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={newRequest.quantity_units}
                            onChange={(e) => setNewRequest({...newRequest, quantity_units: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
                          <select
                            value={newRequest.urgency_level}
                            onChange={(e) => setNewRequest({...newRequest, urgency_level: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                          >
                            {urgencyLevels.map(level => (
                              <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                          <textarea
                            value={newRequest.notes}
                            onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            rows="3"
                            placeholder="Patient details, special requirements, hospital ward, etc."
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-4 pt-6 border-t">
                        <button
                          type="button"
                          onClick={() => setShowRequestForm(false)}
                          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                          Submit Emergency Request
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blood Requests Table */}
      <div className="bg-white rounded-xl shadow-md mb-8 border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Blood Requests</h3>
          <p className="text-gray-600 text-sm mt-1">All your blood requests</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matched Donors</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.request_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">REQ-{request.request_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white font-bold">
                      {request.blood_group}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{request.quantity_units} unit(s)</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      request.urgency_level === 'critical' ? 'bg-red-100 text-red-800' :
                      request.urgency_level === 'high' ? 'bg-orange-100 text-orange-800' :
                      request.urgency_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {request.urgency_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {new Date(request.request_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'matched' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => viewRequestDonors(request.request_id, request.blood_group)}
                      disabled={viewingDonors === request.request_id}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      {viewingDonors === request.request_id ? 'Loading...' : 'View Donors'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Donors */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Available Donors</h3>
              <p className="text-gray-600 text-sm mt-1">Donors matching your blood requests</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Search donors..."
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select 
                  className="pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  onChange={(e) => {
                    // Filter donors by blood group
                    const filtered = donors.filter(d => e.target.value === 'all' || d.blood_group === e.target.value);
                    setDonors(filtered);
                    if (e.target.value === 'all') fetchData();
                  }}
                >
                  <option value="all">All Blood Groups</option>
                  {bloodGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <button onClick={fetchData} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {filteredDonors.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No donors available with selected filter</p>
              <button onClick={fetchData} className="mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDonors.slice(0, 6).map((donor) => (
                <div key={donor.donor_id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">{donor.full_name}</h4>
                      <div className="flex items-center mt-1">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          donor.availability_status === 'available' ? 'bg-green-500' :
                          donor.availability_status === 'unavailable' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                        <span className="text-sm text-gray-600 capitalize">{donor.availability_status}</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white font-bold">
                      {donor.blood_group}
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{donor.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{donor.email}</span>
                    </div>
                    <div className="flex items-start">
                      <MapPinIcon className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />
                      <span className="truncate">{donor.address}</span>
                    </div>
                    {donor.last_donation_date && (
                      <div className="text-xs text-gray-500 flex items-center">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        Last donation: {new Date(donor.last_donation_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => contactDonor(donor.donor_id, donor.full_name)}
                      disabled={contactingDonor === donor.donor_id}
                      className="w-full py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {contactingDonor === donor.donor_id ? 'Contacting...' : 'Contact Donor'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;