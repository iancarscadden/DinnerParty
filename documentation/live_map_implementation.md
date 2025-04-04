New Feature: We are now going to implement the functionality to map.tsx of displaying the active parties on the map. Basically what we want to do is when the user goes to the map, we are going to go into the dinner_parties table, and pull the latitude and logitude of each party that that is not the users group. now the function of this is that we are pulling every party and displaying them using the map pin svg taht we have hardcoded, and then the main functionaltiy is that when a user presses of one of these ouns, it will pull up that groups profile and fill the data in the MapGroupCard.tsx (we may need to make some sight changes to the map group card to allow for the data that we have for each group but nothing major). lets make a note that for now we dont want to do anything database wise or any further logic than already implemented with the request to attend button on the map group card. the current goal is to just pull in all of the parties that are not the users and then have it so that when a certain pin is pressed on it will the group associated with that pin will come up in map group card. 

now in the dinner_parties each entry has a group_id that is the way we can link to the groups info which is in "groups" table.

here is a list of the current database tables so you can better understand the strucuture just incase you are confused for your implementation of this feature. 

dinner_parties: 

column_name | data_type
------------+--------------------------
updated_at  | timestamp with time zone
group_id    | uuid
is_active   | boolean
created_at  | timestamp with time zone
id          | uuid
latitude    | double precision
longitude   | double precision
main_dish   | text
side        | text
address     | text

groups: 

column_name                | data_type
---------------------------+------------------------------
id                         | uuid
leader_id                  | uuid
created_at                 | timestamp with time zone
updated_at                 | timestamp with time zone
is_ready                   | boolean
is_live                    | boolean
is_locked                  | boolean
dinnerparty_details        | jsonb
accepted_attendee_group_id | uuid
attending_host_group_id    | uuid
join_code                  | text
video_links                | ARRAY

group_members: 

column_name | data_type
------------+--------------------------
group_id    | uuid
user_id     | uuid
joined_at   | timestamp with time zone
