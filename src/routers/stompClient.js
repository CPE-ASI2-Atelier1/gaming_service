const { Client } = require("@stomp/stompjs");

// Configurer le client STOMP
const client = new Client({
    brokerURL: "ws://localhost:61614", // URL du broker ActiveMQ (assurez-vous que ws:// est activé)
    connectHeaders: {
        login: "admin",
        passcode: "admin", // Nom d'utilisateur et mot de passe ActiveMQ
    },
    debug: (str) => console.log(str), // Pour le débogage
    onConnect: () => console.log("Connected to ActiveMQ"),
    onStompError: (frame) => console.error("STOMP error:", frame.headers["message"]),
});

client.activate();

// Fonction pour envoyer des messages
const sendMessage = (destination, message) => {
    if (client.connected) {
        client.publish({
            destination, // Canal ou sujet ActiveMQ
            body: JSON.stringify(message), // Le message sous forme JSON
        });
        console.log("Message sent:", message);
    } else {
        console.error("Client is not connected to ActiveMQ");
    }
};

module.exports = { sendMessage };
