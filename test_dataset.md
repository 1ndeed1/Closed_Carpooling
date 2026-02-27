# End-to-End Test Plan & Dataset

This document provides the exact data and steps needed to test the entire application flow after clearing your MongoDB Atlas database.

---

## 🏗️ Phase 1: Setup & Onboarding

### 1. Register Users
Register three distinct accounts to test all roles and interactions.

| User Role | Name | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Org Admin** | Alice Admin | `admin@test.com` | `password123` | `driver` |
| **Driver** | Bob Driver | `bob@test.com` | `password123` | `driver` |
| **Passenger** | Charlie Pass | `charlie@test.com` | `password123` | `passenger` |

### 2. Manual DB Setup (Admin)
Since there is no "Create Organization" UI for normal users yet (it's usually a backend/superadmin task), you need to manually create one organization in MongoDB Atlas to link Alice as the admin.

**Organization Document:**
```json
{
  "name": "Global Tech",
  "domain": "test.com",
  "admin": "[Alice's ObjectId]",
  "members": ["[Alice's ObjectId]"],
  "pendingRequests": []
}
```
*Note: Update Alice's user document to set `isAdmin: true`, `organization: [OrgId]`, and `orgStatus: "approved"`.*

---

## 🏢 Phase 2: Organization Flow

### 3. Join Organization (Bob & Charlie)
- **Login** as Bob and Charlie.
- **Navigate** to `/organizations`.
- **Action**: Click "Request to Join" for "Global Tech".
- **Verification**: Bob and Charlie should see "Approval Pending" on their dashboards.

### 4. Approve Members (Alice)
- **Login** as Alice.
- **Navigate** to `/org-admin`.
- **Action**: Approve Bob and Charlie in the "Join Requests" tab.
- **Verification**: Bob and Charlie should now see their full Dashboards upon refresh.

---

## 🚗 Phase 3: Ride Lifecycle

### 5. Create a Ride (Bob)
- **Login** as Bob.
- **Action**: Fill "Create Ride" form.
- **Data**:
    - **Start**: (Times Square, NYC) `lat: 40.7580, lng: -73.9855`
    - **End**: (Central Park, NYC) `lat: 40.7812, lng: -73.9665`
    - **Time**: Tomorrow at 09:00 AM
    - **Seats**: `3`
    - **Visibility**: `organization`
- **Verification**: Success toast appears. Ride shows in "My Posted Rides".

### 6. Search & Join Ride (Charlie)
- **Login** as Charlie.
- **Navigate** to "Find a Ride".
- **Action**: Click "Request to Join" on Bob's ride.
- **Verification**: Success toast. Charlie's seat is reserved.

### 7. Live Flow (Bob & Charlie)
- **Bob**: Click "Start Ride" on dashboard.
- **Bob**: (Simulated) Backend starts receiving location updates every 5s.
- **Charlie**: Dashboard updates with "Driver is en-route!" status.
- **Bob**: Click "Finish Ride".
- **Verification**: Ride status changes to `completed`.

---

## 🤝 Phase 4: Social & Metrics

### 8. Friend Request (Charlie -> Bob)
- **Charlie**: Search for Bob (if UI exists) or use `/api/friends/request/[BobId]`.
- **Bob**: Accept request.
- **Test**: Create a "Friends Only" ride as Bob and verify Only Charlie can see it (Alice cannot).

### 9. Sustainability Metrics (Admin)
- **Alice**: Navigate to `/org-admin` -> "Live Operations" tab.
- **Verification**: Verify that total rides, passengers, and CO2 saved reflect the completed trip.

---

## 🧪 Endpoint Summary (for Postman/API testing)

| Method | Endpoint | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | User Signup | `{ "name": "...", "email": "...", "password": "...", "role": "..." }` |
| `POST` | `/api/auth/login` | Get JWT Token | `{ "email": "...", "password": "..." }` |
| `GET` | `/api/auth/me` | Current Profile | `Authorization: Bearer [token]` |
| `POST` | `/api/rides` | Create Ride | `{ "startLocation": { "lat": 40.7, "lng": -73.9 }, ... }` |
| `GET` | `/api/rides/search` | Search Visible Rides | `Authorization: Bearer [token]` |
| `POST` | `/api/rides/[id]/request` | Join a ride | `Authorization: Bearer [token]` |
| `PATCH` | `/api/rides/[id]/status` | Start/End ride | `{ "status": "active" }` |
