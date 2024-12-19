let socket;
let senderId;
let receiverId;
let messagesList;

function connect() {
    const userId = document.getElementById("userId").value;
    const userName = document.getElementById("userName").value;

    if (!userId || !userName) {
        console.warn("User ID and Name are required to connect.");
        return;
    }

    socket = io("http://localhost:3000", { query: { userId, userName } });

    socket.on("connect", () => {
        console.log("Connected to the server with ID:", userId, "and Name:", userName);
        document.getElementById("chat").style.display = "block";
    });

    socket.on("ON_USER_SELECTED", (data) => {
        const { participants, messages, receiverName } = data;

        console.log(`Chat history loaded with ${receiverName}`);
        console.log("Messages:", JSON.stringify(messages, null, 2));
        document.getElementById("chatWith").textContent = `Chatting with: ${receiverName}`;

        const messagesList = document.getElementById("messages");
        messagesList.innerHTML = "";

        messages.forEach((msg) => {
            const messageItem = document.createElement("li");
            messageItem.textContent = `${msg.sender === userId ? "You" : "User " + msg.sender}: ${msg.message}`;
            messageItem.style.color = msg.sender === userId ? "blue" : "green";
            messagesList.appendChild(messageItem);
        });
    });

    socket.on("RECEIVE_MESSAGE", (data) => {
        const messages = document.getElementById("messages");
        const newMessage = document.createElement("li");
        newMessage.textContent = `From ${data.senderId}: ${data.message}`;
        messages.appendChild(newMessage);
    });

    socket.on("USER_NOT_CONNECTED", (data) => {
        const messages = document.getElementById("messages");
        const newMessage = document.createElement("li");
        newMessage.textContent = `System: ${data.message}`;
        newMessage.style.color = "red";
        messages.appendChild(newMessage);

        console.log(`Notification: The user ${data.receiverId} is not online.`);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from the server");
    });
}


function retrieveMessage() {
    receiverId = document.getElementById("receiverId").value;
    senderId = document.getElementById("userId").value;

    if (!receiverId || !senderId) {
        console.warn("Both senderId and receiverId are required.");
        return;
    }
    messagesList = document.getElementById("messages");
    messagesList.innerHTML = "";

    socket.emit("ON_USER_SELECT", { senderId, receiverId });
}

function sendMessage() {
    receiverId = document.getElementById("receiverId").value;
    const message = document.getElementById("message").value;

    const messages = document.getElementById("messages");
    const newMessage = document.createElement("li");
    newMessage.textContent = `To ${receiverId}: ${message}`;
    newMessage.style.color = "blue";
    messages.appendChild(newMessage);

    socket.emit("SEND_MESSAGE", {
        senderId: Number(document.getElementById("userId").value),
        receiverId: Number(receiverId),
        message
    });

    console.log("Message sent to user:", receiverId);
}