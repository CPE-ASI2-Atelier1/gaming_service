let socket;

function connect() {
    const userId = document.getElementById("userId").value;

    socket = io("http://localhost:3000", { query: { userId } });

    socket.on("connect", () => {
        console.log("Connected to the server with ID:", userId);
        document.getElementById("chat").style.display = "block";
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

function sendMessage() {
    const receiverId = document.getElementById("receiverId").value;
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