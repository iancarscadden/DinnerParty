We now need to implement if we havent already the accepted_attendee_group_id and attending_host_group_id in the
groups table. Now for some context for these, when a group leader is in the host screen and is doing our swipe 
action through the profile cards, when the host / grouop leader accepts a group, the id of the group that the
leader just accepted to attend their dinner party will be added to the hosting groups field for the accepted_attendee_group_id, and then for the group that just got accepted, in that groups row we will add the id of the group that they just got accepted to in their column for attending_host_group_id

Now if a group has any value in the accepted_attendee_group_id, when anyone in the group goes to the host screen, they will see just a card on the screen with that groups info. 

Now if a group has any value in the attending_host_group_id, when anyone in that group goes to the attend tab of the social tab in the app, they will then see a card there filled out with the info for the group that they are attending.

Now each of the files for the host screen and attend screen should already have card modal files that are connected to them.

Now when a group leadear accepts a group form the group_requests in the host screen if they have any, it will then trigger an effect will it will delete all the incoming party_requests for the accepting/hosting group, and it will delete all of the outgoing requests in the party_requests for the group that just got accepted. 

Now we also want to make it so that when a group goes to the attend screen, if they have a value for the attending_host_id whixh would mean they have been accepted to a party, we then want to have a button at the bottom of the screen below the card with the groups profile, that will have a button for "Leave Party" whixh will be only visible for the group leader / used by the group leader, which will be white and purple outline in color, which will take the id of current group they are attending, go into the db and remove their groups id from that groups accepted_attende_group_id, then will remove the value for the groups row for the field attending_host_group_id. and we then want to also implement this button in the host screen as well when a group has another agroup attending their party, the group leader can see and hit a cancel button at the bottom of the screen to delete the groups attending id out of their accepted_attende_group_id and in the other group delete the value for their attending_host_group_id field.

Now we need to make a check in the map tab for whenever a group leader is trying to request to attend a groups party, we first need to run a check if the group has a value for their accepted_attending_group_id, if they do we will say "This group already has guests". 

Now we want to rememebr that any of the functions / buttons that have actions should only be usable / visivle by the leader of the group. 

We also should remember that the type in the supabase database for accepted_attending_group_id and attending_host_group_id is uuid and a key i believe. 