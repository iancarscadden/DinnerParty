New feature: Hosting a party

We are now going to develop the functionality for a user to host a party. Here is the flow for a user:

Some borderline context of the idea of a group hosting a party: When a group decides to hsot a party, they will now have an active pin on the map that will always be up on the map, but will not be accepting applications if is_active is false, if is _active is false this will mean that a group is now locked in with another group and will not be accepting applications from other groups. (this will be implemented in code later for now we are developing the outlined feature below)

If the user is not in a group or they are not in a group that is ready to host a party, meaning is_live is not check to true. Then when the user goes to the host sub tab they will see a blurb that says you need a group with a profile to host a party. Now lets say the user has a group that is ready to host, if they are just a member of the group and not the leader, when thet go to the sub tab they will see the button to "Host Party" but when they click it it will say that you need to be the leader of the group to host a party. Now lets say you are the leader of the group. Now when you click on the "Host Party" button you will be shown a screen with fields you will need to fill out to host a party. Those fields will be (main dish, side dish, address) now once those are all filled the user can press "Confirm party!" to continue, or they can also press "Cancel" to cancel the process and go back. Now when creator clicks cofirm party, that will trigger ourdatabse logic to create the party for the group and we will make an entry in the dinner_parties table. 

We also to use the google maps places api for autocomplete suggestions for the address field. as well as we will be useing the google geocoding api to get the latitude and longitude of the address. I have put my GOOGLE_API_KEY in the .env file. (Will will need to build UI for the autocomplete suggestions as well, you will do this to look nice)

Here is what the sql command looks like that i used to create the dinner_parties table:

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


Now once the user confirms the party, we will write to that. So when the user first goes to the host sub tab, we will check if they curretnly have a dinner_parties, if they dont, they will do the flow as outlined above, now once the leader makes an entry in dinner_parties, now when a member of the group comes to this the host tab, they will see some text that says "Your party is active! requests to come from other groups will appear here."

The next step in the process is to developing the map_production_build.md file, when have fully implemented this feature, ask for that!