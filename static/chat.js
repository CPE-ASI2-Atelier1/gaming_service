let socket;
let senderId;
let receiverId;
let messagesList;

function connect() {
    const userId = document.getElementById("userId").value;

    socket = io("http://localhost:3000", { query: { userId } });

    socket.on("connect", () => {
        console.log("Connected to the server with ID:", userId);
        document.getElementById("chat").style.display = "block";
    });

    socket.on("ON_USER_SELECTED", (data) => {
        messagesList = document.getElementById("messages");
        receiverId = document.getElementById("receiverId").value;
        senderId = document.getElementById("userId").value;

        console.log("On recoit un historique !")
        data.messages.forEach((msg) => {
            const messageItem = document.createElement("li");
            messageItem.textContent = `${msg.sender === senderId ? "You" : "User " + msg.sender}: ${msg.message}`;
            messageItem.style.color = msg.sender === senderId ? "blue" : "green";
            messagesList.appendChild(messageItem);
        });
    })

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