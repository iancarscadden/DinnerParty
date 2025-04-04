New feature: the build out of the map tab for the production build.

The main goal of the map tab is to populate it with pins that represent the groups that have an entry in the dinner_parties table. 

Just for a reminder this is what the dinner_parties table looks like:

CREATE TABLE dinner_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) UNIQUE,
  main_dish text NOT NULL,
  side text NOT NULL,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


We will need to take the latadude and longitude of each row in the table and use it to populate the map. We also will need to assoacite the group_id with the pin so that when the user presses on the pin, it will bring up the group's profile for that group on the screen in the card style that we have right now in the dummy data. We will use the file MapGroupCard.tsx to do this, but we will need to remake the file to make it into a template to use data from the database. You will notice at the bottom of the card are directions for where the user can swipe, we already have code in place to handle all of the animations swipe, we also have code in place for swiping right on a card to "Request to Attend" now we need to make a check for when a user swipes right on a card, we first need to check if the party who ther user is swiping right on has is_active set to ture,if its false we can say the group is currently hosting another group, if that comes back true we then check if the user who is swiping right is in a group, if they are not, we return a system alert saying they need a group to request to join a party, if that passes we check if they are the leader of a group, if they are not the leader of their group we return a alert saying they need to be the leader of a group to request to attend a party. The next check, if they are the leader of a group, we check if their group "is_live" if that is false, we then return saying Their group need a complete profile to request to request to attend a party. If all of checks pass, for now lets just return a toast saying "Request to Attend sent!" and then close the card thats on the screen. Also be sure to add commments at the toast saying somthing like, "Here is where we will make future backend logic implememtation for the map tab."

