import { useEffect, useState } from "react";
import api from "../api/api";

export default function OrgAdmin() {
  const [requests, setRequests] = useState([]);
  const orgId = localStorage.getItem("organization");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const res = await api.get(`/organisation/${orgId}/requests`);
    setRequests(res.data);
  };

  const approveUser = async (userId) => {
    await api.post(`/organisation/${orgId}/approve/${userId}`);
    fetchRequests();
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">
        Organization Join Requests
      </h2>

      {requests.length === 0 && (
        <p className="text-gray-400">No pending requests</p>
      )}

      {requests.map((user) => (
        <div
          key={user._id}
          className="bg-gray-900 p-4 rounded mb-3 flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>

          <button
            onClick={() => approveUser(user._id)}
            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}
