# GroundedTodo

A fork of the Meteor Tutorial app, which should have basic functionality offline, tracking and updating changes.

Using GroundDB, AppCache, and some cool logic to retry any `Meteor.call`'s made.

## Testing It

* Run meteor, make an account, and log in.
* Add some things to your todo list.
* Kill your meteor server. Try doing things
	* Delete something from your todo list
	* Change something from private to public
* Restart your server
* Notice how changes you made are preserved!

Normally, you wouldn't be able to do something like remove an item when you're offline and have the changes persist to the server. Usually, you would see the local changes, but upon refreshing, your local collection would pull from the server's collection and your removal would be undone. With the `groundCall` method written in here, things are different. `groundCall` saves any `Meteor.call`'s made when offline, and fires them when you get online again. This is good because security is still preserved. Rather than blindly copy the client's database to the server's, which might overwrite changes and let the client use the database maliciously, we run the same secure `Meteor.call` methods invoked earlier.

## Improvements

* Make into a package
* Make smarter, somehow?