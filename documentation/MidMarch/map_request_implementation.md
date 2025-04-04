We now need to implement some new features:

1. Group leaders can request to attend another groups live dinner party from the map.


Lets now define how new featuer 1 will work.

FEATURE 1 CONTEXT: Currently on the map, we have it so that the active dinner party pins are pulled in, and we have checks running for when the user swipes right
on a dinner party / presses the request to attend button. what we want to do is work with the instance where all checks are passed, when the 
user is not part of that group they are swiping on -> they have a group -> and they are the leader of their group -> they can then request to attend that
dinner party.

FEATURE 1 LOGIC: To implement feature 1 database wise, we will utilize a table called party_requests in supabase which is formulated as follows:

CREATE TABLE party_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Generates a unique ID (requires pgcrypto extension)
    requesting_group_id UUID NOT NULL,              -- The group sending the request
    host_group_id UUID NOT NULL,                    -- The group being requested
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- Timestamp for when the request was created
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- Timestamp for the last update to the request
    CONSTRAINT fk_requesting_group
      FOREIGN KEY (requesting_group_id) REFERENCES groups (id),
    CONSTRAINT fk_host_group
      FOREIGN KEY (host_group_id) REFERENCES groups (id)
);

That above is the database postgre command that was used to create the party_requests table. now what we can do with this is use it to understand how to 
make our implementation in the app. 

When a group leader requests to join a groups dinner party, we will first check if the group they are requesting has the field "has_attendant" as false, if has_attendant is false this means that they currently dont have any group that they have accepted to attend their party and they can receive requests, we then want to check if the current group requesting to attend said group already has a row in party_requests where they are requesting attend that said group, if that check is also passed --> we then will add a row to the party_requests table with the need information, such the the group requesting group id (the id of the group leader) the host_group_id (the id of the group whos party it is). You get the point. 

