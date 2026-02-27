import { useEffect, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

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
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const requestJoin = async (orgId) => {
    try {
      await api.post(`/organisation/${orgId}/request`);
      toast.success("Request sent!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Request failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 font-medium">Loading organizations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 border-b border-gray-200/50 pb-4 flex items-center gap-2">
          <span className="text-red-500">🏢</span> Available Organizations
        </h2>

        {orgs.length === 0 && (
          <div className="glass-card text-center py-12 px-4 shadow-sm">
            <p className="text-gray-500 font-medium italic">No organizations available to join.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orgs.map((org) => (
            <div
              key={org._id}
              className="glass-card p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-full"
            >
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg border border-red-100">
                    {org.name.charAt(0)}
                  </div>
                  <p className="font-bold text-xl text-gray-800">{org.name}</p>
                </div>
                {org.domain && (
                  <p className="text-sm font-medium text-gray-500 ml-13 flex items-center gap-1">
                    <span className="text-gray-400">@</span> {org.domain}
                  </p>
                )}
              </div>

              <button
                onClick={() => requestJoin(org._id)}
                className="glass-button w-full"
              >
                Request to Join
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
