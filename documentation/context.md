# Dinner Party App for SDSU Students (MVP)

## Main Idea

- The main idea of the app is to create a platform for SDSU students to find and attend dinner parties.
- The app will be a social app that will allow students to create groups, post dinner parties, and request to join dinner parties.

## 1. User Onboarding & Profile Setup

- **Sign Up & Verification:**  
  - Users sign up with their email and verify their account via a code sent to that email.
- **Profile Setup:**  
  - Users upload a profile picture and enter their name.
  - This information is stored in the user profile table in the database.

## 2. Group Formation

- **Creating or Joining a Group:**  
  - Users can either create a new group (which then generates a unique join code) or join an existing one using a unique join code.
- **Group Rules:**  
  - **Minimum Members:** A group must have at least **3 members** to host a dinner party.  
  - **Maximum Members:** A group can have up to **5 members**.  
  - A simple state flag (e.g., `isReady`) in the database can indicate when a group has reached the minimum of 3 members.
  - **Group Posting:** Once a group is locked in to attending a dinner party, or is currently hosting/has a posting for a dinner party, the group is locked from any further changes. 
- **Leaving a Group:**  
  - A user can leave their group at any time. As long as it is not an active dinner party / posting for a dinner party / attending a dinner party.
  - If a member leaves and the total drops below 3, the group is no longer considered “ready” to host a dinner party as well as they can no longer attend a dinner party with below 3 members.

## 3. Group Profile & Dinner Party Hosting

- **Building a Group Profile:**  
  - Once the group reaches the minimum of 3 members, their shared “Hinge style” profile becomes active.  
  - This will start off as a canvas of skeleton profile details that can be edited by any group member.
  - During the profile building process, people can join the group until it reaches up to 5 members.
  - If the members drop below 3, the build a profile process is no longer available, and they will be given the join code to invite new members. 
- **Profile Locking on Posting:**  
  - **Important:** Once the group posts a dinner party, the group profile is locked and no further changes can be made.
  - Also once a group is attending a dinner party, the group profile is locked and no further changes can be made.
- **Hosting a Dinner Party:**  
  - Only the group creator (the “leader”) can initiate hosting a dinner party.  
  - A complete group profile is required (with at least 3 members).
  - When hosting, the dinner party details are posted to a dedicated “host” area.

## 4. Browsing & Requesting Dinner Parties

- **Interactive Map:**  
  - A geo-bounded, SDSU-centered map displays dinner party “pins” representing active dinner parties.
  - Tapping a pin brings up a modal view showing the host group’s locked profile and party details.
- **Requesting to Join a Dinner Party:**  
  - Only groups that are “ready” (with at least 3 members and a complete profile) can send a join request.
  - **Note:** Only the group creator can tap the “Request” button; for other members, the button is visible but disabled.

## 5. Managing Dinner Party Requests

- **For the Host Group:**  
  - In the “host” tab, the group creator sees a list of incoming requests from other groups.
  - The host can accept or reject each request.
  - **MVP Simplification:** Only one group may be accepted per dinner party.
- **After Acceptance:**  
  - Once a group is accepted, the dinner party will be taked off the map and the 2 groups will be locked in to attending and hosting the dinner party.

    
    
