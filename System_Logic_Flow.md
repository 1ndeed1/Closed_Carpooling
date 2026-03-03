# System Logic Flow: Ride Initiation & Discovery

This document explains the technical "under-the-hood" flow of how a ride is created by a driver and discovered by passengers within an organization.

---

## 🏎️ Phase 1: Driver Initiation (The "Push")
1.  **Input**: The Driver opens the "Create Ride" dashboard.
2.  **Origin/Destination**: The driver selects a "Starting Hub" (Origin) and "Target Destination" (Endpoint). Our Geocoding logic converts these addresses into exact Latitude/Longitude coordinates.
3.  **Parameters**: The driver sets the Departure Time, available Seats, and Visibility (e.g., "Org-Only").
4.  **Backend Registry**: The system saves this "Ride Object" in the database. 
    *   *Key Field*: `organizationId` is attached to the ride to ensure only "Company/Collage" members can see it.
5.  **Route Generation**: The Google Maps API generates a **Polyline** (the exact path) which is stored so passengers can visualize the route.

---

## 🎒 Phase 2: Passenger Discovery (The "Pull")
1.  **Dashboard Hub**: The Passenger logs in and sees their "Commuter Hub."
2.  **Organization Filter**: The "Find Ride" screen automatically queries the database:
    *   `GET /api/rides?orgId=USER_ORG_ID`
    *   This ensures the passenger *never* sees rides from other organizations.
3.  **Visual Grid**: The passenger sees "Deployment Units" (Active Rides). Each card shows the driver’s name, path, and available seats.
4.  **Real-Time Sync**: If a driver fills up their seats, the ride instantly disappears from the discovery list via WebSocket or real-time polling.

---

## 🤝 Phase 3: The Connection
1.  **Request to Join**: The Passenger clicks "Join Journey."
2.  **Atomic Transaction**: The backend checks: "Are there seats left?"
3.  **Manifest Update**: The Passenger's ID is added to the ride's `passengers` array, and the `seats` count is decremented.
4.  **Live Tracking**: Once joined, the passenger gains access to the **"Live Mission Control"** view, where they can see the driver's location moving along the path in real-time.

---

## 🛡️ Presentation "Edge Cases" (For the Teacher)
*   **Security**: Mention that the system uses **JWT (JSON Web Tokens)** to verify that a passenger actually belongs to the organization before letting them "see" or "join" a ride.
*   **Dynamic Hubs**: Explain that the "Hub" we implemented for passengers allows the system to calculate the exact distancebetween the driver's route and the passenger's standing point.
