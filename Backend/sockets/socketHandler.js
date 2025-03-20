const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const Group = require("../models/Group");
const { JWT_SECRET } = require("../middleware/auth");
const { encryptMessage } = require("../utils/encryption");

const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        const token = socket.handshake.auth.token;
        if (!token) {
            console.log("No token provided, disconnecting:", socket.id);
            socket.disconnect(true);
            return;
        }

        let userId;
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
            socket.userId = userId;
            socket.join(userId); // Join user's personal room
            socket.emit("userId", userId);
            console.log(`User ${userId} joined room ${userId}`);

            // Update user status to "Online"
            User.findByIdAndUpdate(userId, { status: "Online" }, { new: true })
                .then((user) => {
                    if (user) io.emit("statusUpdate", { userId, status: "Online" });
                })
                .catch((err) => console.error("Status update error:", err.message));
        } catch (err) {
            console.error("Connection token error:", err.message);
            socket.disconnect(true);
            return;
        }

        socket.on("joinGroup", async (groupId) => {
            try {
                const group = await Group.findById(groupId);
                if (!group) throw new Error("Group not found");
                if (!group.members.some((m) => m.userId.toString() === socket.userId)) {
                    throw new Error("User not a member of this group");
                }
                socket.join(groupId);
                console.log(`User ${socket.userId} joined group room ${groupId}`);
            } catch (err) {
                console.error("Join group error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        socket.on("leaveGroup", (groupId) => {
            socket.leave(groupId);
            console.log(`User ${socket.userId} left group room ${groupId}`);
        });

        socket.on("chatMessage", async (msgData) => {
            try {
                const sender = await User.findById(socket.userId).lean();
                if (!sender) throw new Error("Sender not found");

                if (msgData.group) {
                    const group = await Group.findById(msgData.group);
                    if (!group) throw new Error("Group not found");
                    const member = group.members.find((m) => m.userId.toString() === socket.userId);
                    if (
                        group.creator.toString() !== socket.userId &&
                        (!member || !member.canSendMessages)
                    ) {
                        throw new Error("No permission to send messages in this group");
                    }
                }

                if (msgData.file) {
                    const fileMessage = {
                        sender: { _id: socket.userId, name: sender.name },
                        file: msgData.file,
                        recipient: msgData.recipient || null,
                        group: msgData.group || null,
                        tempId: msgData.tempId,
                        timestamp: new Date(),
                    };
                    if (msgData.recipient) {
                        io.to(msgData.recipient).emit("chatMessage", fileMessage);
                        io.to(socket.userId).emit("chatMessage", fileMessage);
                    } else if (msgData.group) {
                        io.to(msgData.group).emit("chatMessage", fileMessage);
                    }
                    return;
                }

                let message = {
                    sender: socket.userId,
                    timestamp: new Date(),
                    tempId: msgData.tempId,
                };

                if (msgData.recipient) {
                    const recipient = await User.findById(msgData.recipient).lean();
                    if (!recipient) throw new Error("Recipient not found");

                    const encryptedContent = encryptMessage(msgData.content, recipient.publicKey);
                    message.plaintextContent = msgData.content;
                    message.encryptedContent = encryptedContent;
                    message.recipient = msgData.recipient;

                    const savedMessage = await Message.create(message);
                    const populatedMessage = await Message.findById(savedMessage._id)
                        .populate("sender", "name")
                        .lean();

                    const recipientMessage = {
                        ...populatedMessage,
                        sender: { _id: socket.userId, name: sender.name },
                        content: encryptedContent,
                        tempId: msgData.tempId,
                    };

                    const senderMessage = {
                        ...populatedMessage,
                        sender: { _id: socket.userId, name: sender.name },
                        content: msgData.content,
                        tempId: msgData.tempId,
                    };

                    io.to(msgData.recipient).emit("chatMessage", recipientMessage);
                    io.to(socket.userId).emit("chatMessage", senderMessage);
                } else if (msgData.group) {
                    message.group = msgData.group;
                    message.plaintextContent = msgData.content;
                    message.encryptedContent = null;

                    const savedMessage = await Message.create(message);
                    const populatedMessage = await Message.findById(savedMessage._id)
                        .populate("sender", "name")
                        .lean();

                    const groupMessage = {
                        ...populatedMessage,
                        sender: { _id: socket.userId, name: sender.name },
                        content: msgData.content,
                        tempId: msgData.tempId,
                    };

                    io.to(msgData.group).emit("chatMessage", groupMessage);
                }
            } catch (err) {
                console.error("Chat message error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        // One-on-One Call Events
        socket.on("callRequest", async ({ to }) => {
            try {
                const recipient = await User.findById(to).lean();
                if (!recipient) throw new Error("Recipient not found");
                console.log(`Call request from ${socket.userId} to ${to}`);
                io.to(to).emit("callRequest", { from: socket.userId });
            } catch (err) {
                console.error("Call request error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        socket.on("callAccepted", async ({ to }) => {
            try {
                const caller = await User.findById(to).lean();
                if (!caller) throw new Error("Caller not found");
                console.log(`Call accepted by ${socket.userId} for ${to}`);
                io.to(to).emit("callAccepted");
            } catch (err) {
                console.error("Call accept error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        socket.on("callRejected", async ({ to }) => {
            try {
                const caller = await User.findById(to).lean();
                if (!caller) throw new Error("Caller not found");
                console.log(`Call rejected by ${socket.userId} for ${to}`);
                io.to(to).emit("callRejected");
            } catch (err) {
                console.error("Call reject error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        socket.on("callEnded", async ({ to }) => {
            if (!to) {
                console.log("No 'to' provided in callEnded event, skipping...");
                return;
            }
            try {
                const otherParty = await User.findById(to).lean();
                if (!otherParty) throw new Error("Other party not found");
                console.log(`Call ended between ${socket.userId} and ${to}`);
                io.to(to).emit("callEnded");
            } catch (err) {
                console.error("Call end error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        // Group Call Events
        socket.on("groupCallStarted", async ({ groupId, callerId }) => {
            try {
                const group = await Group.findById(groupId).lean();
                if (!group) throw new Error("Group not found");
                if (!group.members.some((m) => m.userId.toString() === socket.userId)) {
                    throw new Error("User not a member of this group");
                }
                console.log(`Group call started by ${socket.userId} for group ${groupId}`);
                io.to(groupId).emit("groupCallStarted", { groupId, callerId: socket.userId });
            } catch (err) {
                console.error("Start group call error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        socket.on("endGroupCall", async ({ groupId }) => {
            try {
                const group = await Group.findById(groupId).lean();
                if (!group) throw new Error("Group not found");
                if (!group.members.some((m) => m.userId.toString() === socket.userId)) {
                    throw new Error("User not a member of this group");
                }
                console.log(`Group call ended by ${socket.userId} for group ${groupId}`);
                io.to(groupId).emit("groupCallEnded");
            } catch (err) {
                console.error("End group call error:", err.message);
                socket.emit("error", { message: err.message });
            }
        });

        socket.on("disconnect", async () => {
            console.log("Client disconnected:", socket.id);
            try {
                const user = await User.findByIdAndUpdate(
                    socket.userId,
                    { status: "Offline" },
                    { new: true }
                );
                if (user) {
                    io.emit("statusUpdate", { userId: socket.userId, status: "Offline" });
                }
            } catch (err) {
                console.error("Disconnect error:", err.message);
            }
        });
    });
};

module.exports = socketHandler;