import { useEffect, useState } from "react";
import api from "../api/api";

export default function Organizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await api.get("/organisation");
      setOrgs(res.data);
    } catch (err) {
      alert("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const requestJoin = async (orgId) => {
    try {
      await api.post(`/organisation/${orgId}/request`);
      alert("Request sent. Please wait for admin approval.");
    } catch (err) {
      alert(err.response?.data?.message || "Request failed");
    }
  };

  if (loading) {
    return <p className="p-6 text-white">Loading organizations...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h2 className="text-2xl font-bold mb-4">Available Organizations</h2>

      {orgs.length === 0 && (
        <p className="text-gray-400">No organizations available</p>
      )}

      {orgs.map((org) => (
        <div
          key={org._id}
          className="bg-gray-900 p-4 rounded mb-3 flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">{org.name}</p>
            {org.domain && (
              <p className="text-sm text-gray-400">{org.domain}</p>
            )}
          </div>

          <button
            onClick={() => requestJoin(org._id)}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Request Join
          </button>
        </div>
      ))}
    </div>
  );
}
