# Dinner Party App UI Structure

There will be **3 main tabs** in the app:
- **Map**
- **Social**
- **Profile**

---

## Map Tab

- **Map Display:**
  - A map that is bounded to the San Diego State University campus.
- **Active Dinner Parties:**
  - Each active dinner party that has not been locked in to an accepted group will be shown on the map.
- **Modal View:**
  - Tapping on a pin will bring up a modal view showing the host group’s profile and party details.
- **Modal Buttons:**
  - There will be two buttons at the bottom of the modal view:
    - **Hide:** Hides the dinner party from your map view.
    - **Request to Join:** Follows the backend logic for sending a join request to the host group.

---

## Social Tab

The Social tab will contain **3 sub-tabs**, navigable from the three words at the top of the screen: **Attend**, **Group**, and **Host**.

### Attend Sub Tab

- **Current Dinner Party Display:**
  - Shows the current dinner party that your group is locked in to attend.
  - When your group is locked in, it displays the group's profile for the party with the header:
    - *"Let's get this group chat going"*
  - The creator’s phone number is displayed right below the header.
- **No Group / Not Locked-In State:**
  - If a user is not in a group, or is in a group but not locked into a dinner party, a message is shown:
    - *"Let's be social, attend a dinner party to see stuff here."*
- **Party Expiration:**
  - When the dinner party expires (as determined by backend logic), the party is removed from this tab.

### Host Sub Tab

- **Creating a Dinner Party:**
  - This sub-tab is for the group leader (creator) to initialize their group to host a dinner party.
  - Once the group meets the requirements, the leader can tap **"Create a Dinner Party"** and fill out fields such as:
    - Time
    - Date
    - Location
    - Phone Number
    - Menu
  - After posting the dinner party, the Host tab transforms into a hub for managing the party.
- **Handling Join Requests:**
  - Incoming join requests from other groups appear in this tab.
  - The creator can tap a request to view the requesting group’s profile in a modal view (similar to the Map tab) with options to **reject** or **accept** the group.
  - When a group is accepted, the Host tab then displays a view similar to the **Attend** sub-tab, showing:
    - The accepted group's profile.
    - A header: *"Let's get this group chat going"*
    - The phone number of the accepted group’s creator.
- **View for Non-Creator Group Members:**
  - Members of the hosting group who are not the creator will see the message:
    - *"Tell your group leader to check here for requests!"*
  - They will not see any join requests until the hosting group’s creator locks in with a group.

---

## Profile Tab

- **User Information:**
  - Displays the user's profile picture, name, and email.
- **Functional Buttons:**
  - Buttons for essential functions such as:
    - Delete Account
    - Sign Out
    - Report a Bug
- **Legal & Informational Links:**
  - Links to the Privacy Policy and Terms of Service.
