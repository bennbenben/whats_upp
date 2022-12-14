const chatroomModel = require("../models/chatroomModel");
const messagesModel = require("../models/messagesModel");
const ErrorResponse = require("../utils/ErrorResponse");
const userModel = require("../models/userModel");
const uniqueArray = require("../utils/Common");

// Display all open chat rooms in SidebarChat
exports.listChatroom = async (req, res, next) => {
  const { userId, username } = req.body;
  // console.log('req.data',req.body)
  console.log('inside listChatroom')
  let chatrooms = [];

  try {
    chatrooms = await chatroomModel.find({
      $or: [
        { "participants": { "$elemMatch": { "userId": userId } } },
        { "participants": { "$elemMatch": { "username": username } } },
      ],
    });

    if (!chatrooms) {
      next(new ErrorResponse("No active chatrooms found", 404));
    }

    // create array of promises first
    let promisesArray = chatrooms.map(async (room) => {
      const lastMsg = await messagesModel.find({"chatId": room._id})
      .sort({"timestamp": "desc"})
      .limit(1);

      // console.log("lastmessage is: ", lastMsg);

      if (!lastMsg[0]) {
        return;
      }

      return {
        "chatroomId": lastMsg[0].chatId,
        "lastMsg": lastMsg[0].message,
      }
    })

    const latestMessage = await Promise.all(promisesArray);
    // console.log(`latestMessage is: ${JSON.stringify(latestMessage)}`);

    return res.status(200).json({ success: true, chatrooms: chatrooms, latestMessage: latestMessage });

  } catch (error) {
    console.log("err is: ", error);
    return next(new ErrorResponse("Failed to show chatrooms", 500));
  };
};

// Create a chatroom
exports.createChatroom = async (req, res, next) => {
  console.log('inside createChatroom')
  // console.log(req.body);
  //body is going to receive 2 things
  //1. participants - array of names
  //2. chatroom name - string
  
  try {
    const chatroomDTO = await chatroomModel.create({
      chatroom_name: req.body.chatroom_name,
      participants: req.body.participants,
    });

    // console.log(`chatroomDTO: ${chatroomDTO}`);

    res.status(201).json({ success: true, chatroomId: chatroomDTO._id });

  } catch (error) {
    return next(error);
  };
};

// Open a chatroom and show the chats
exports.showChatroom = async (req, res, next) => {
  console.log("inside showChatroom");
  let chatroom = {
    // _id: ...
    // chatroom_name: ....
    // participants: [{userId, username}]
  };

  try {
    // console.log(`these are the req.params: ${req.params}`);
    const chatroomId = req.params.chatroomId;
    chatroom = await chatroomModel.findById(chatroomId);
    
  } catch (error) {
    return next(new ErrorResponse("Failed to fetch chatroom data", 500));
  }

  return res.status(200).json({ success: true, chatroom: chatroom });
};

// Delete Chatroom

exports.deleteChatroom = async (req, res, next) => {
  const chatroomId = req.body

  try {
    console.log('inside deleteChatroom ',chatroomId)
    await chatroomModel.deleteOne({ _id: chatroomId.chatId })
    await messagesModel.deleteMany({chatId: chatroomId.chatId})
    return res.status(200).json({ success: true, deleteChatroomId: chatroomId})

  } catch (err) {
    return next(new ErrorResponse("Failed to delete chat", 500))
  }
}

// Lists the messages in a chat
exports.listMessage = async (req, res, next) => {
  console.log("inside listMessage");
  let messages = []
        
  try {
    // console.log(`these are the req.params: ${JSON.stringify(req.params.chatroomId)}`);
    messages = await messagesModel.find({ chatId : req.params.chatroomId }).exec();
  } catch (err) {
    return next(new ErrorResponse("Failed to fetch list messages", 500));
  }

  return res.status(200).json({ success: true, messages: messages });
};

// Creates a message
exports.createMessage = async (req, res, next) => {
  console.log("inside createMessage");
  let message = req.body;
  message.timestamp = Date.now();

  try {
    const createdMessage = await messagesModel.create(message);
    // console.log(`createdMessage is: ${createdMessage}`);
    const chatroomDTO = await chatroomModel.findById(message.chatId);
    const participants = chatroomDTO.participants.map(
      (user) => ({
        "userId": user.userId,
        "username": user.username,
      })
    );
    
    const uniqueParticipants = uniqueArray(participants, "userId");
    // console.log("uniqueParticipants: ", uniqueParticipants);

    return res.status(201).json({ success: true, message: createdMessage, participants: uniqueParticipants });

  } catch (error) {
    return next(new ErrorResponse("Failed to send message", 500));
  };
};

// List all users from DB
exports.listUsers = async (req, res, next) => {
  // const { userId, username } = req.body;
  console.log("insude listUsers");
  let usersList = [];

  try {
    usersList = await userModel.find({}).exec();

    if (!usersList) {
      next(new ErrorResponse("No active users found", 404));
    }

    return res.status(200).json({ success: true, usersList: usersList });

  } catch (error) {
    return next(new ErrorResponse("Failed to show usersList", 500));
  };
};