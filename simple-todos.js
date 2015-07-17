Tasks = new Mongo.Collection("tasks");
Ground.Collection(Tasks);//saves the contents of Tasks offline

CallQueue = new Ground.Collection(null)//this database tracks any meteor calls made while the user was offline, and retries them later

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({//we only can access this if we're online in the first place, so we'll use the online db here
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}



if (Meteor.isClient) {

  var lastState = null

  Deps.autorun(function(){//to check if the user's connected state has changed and, if it has and the user is online, execute calls

    if(lastState == Meteor.status().connected || !Meteor.status().connected)//if the user has not changed connected states, or if they're offline, don't execute the queued meteor calls
      return

    if(CallQueue.find().count() == 0)//if there's nothing in the callqueue, don't do anything either
      return

    lastState = Meteor.status().connected//update lastState 

    CallQueue.find().forEach(function(doc){//iterate through all queued meteor calls
      
      Meteor.apply(doc.methodName, doc.args, doc.meteorCallCallback)//run the queued call method
      CallQueue.remove(doc._id)//remove from collection

    })

  })

  /*
    groundCall is our wrapper for Meteor.call
    Instead of doing Meteor.call(method, arg1, arg2, arg3, callback),
    you do
    groundCall(method, [arg1, arg2, arg3], callback)
  */

  function groundCall(methodName, argArray, callback){

    var meteorCallCallback = function(e, r){// called when meteor call triggers its callback

      if(!Meteor.status().connected){
        console.log("Call method requires internet access - will retry when connection gets better")
      }

      if(callback && typeof callback == "function")
        callback(e, r)//the user's callback, if provided
    }

    Meteor.apply(methodName, argArray, meteorCallCallback)//try to call the method
    //we call this regardless if the user is offline or not, so the user sees changes on their side

    if(!Meteor.status().connected)//if the user is offline when the method is attempted, push it to the queue
      CallQueue.insert({args: argArray, methodName: methodName, meteorCallCallback: meteorCallCallback})

  }

  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      // Insert a task into the collection
      // Meteor.call("addTask", text);
      groundCall('addTask',[text], function(e, r){
        console.log("Added task", text)
      })

      // Clear form
      event.target.text.value = "";
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      // Meteor.call("setChecked", this._id, ! this.checked);
      groundCall('setChecked', [this._id, !this.checked], function(e, r){
        console.log("Toggled checked")
      })
    },
    "click .delete": function () {
      // Meteor.call("deleteTask", this._id);
      groundCall('deleteTask', [this._id], function(e, r){
        console.log("Deleted task")
      })
    },
    "click .toggle-private": function () {
      // Meteor.call("setPrivate", this._id, ! this.private);
      groundCall('setPrivate', [this._id, !this.private], function(e, r){
        console.log("Set private")
      })
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task

    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    return Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    })


  },
  deleteTask: function (taskId) {


    var task = Tasks.findOne(taskId);

    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    return Tasks.remove(taskId);

  },
  setChecked: function (taskId, setChecked) {

    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    return Tasks.update(taskId, { $set: { checked: setChecked} });

  },
  setPrivate: function (taskId, setToPrivate) {

    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    console.log("Great success")
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    return Tasks.update(taskId, { $set: { private: setToPrivate } });

  },
  test: function(a){
    console.log("HEY");
    return a;
  }
});
