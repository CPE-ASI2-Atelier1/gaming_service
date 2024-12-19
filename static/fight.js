let socket;
let currentEnergy = 0;
const maxEnergy = 100;
let isMyTurn = false;

document.getElementById("connectBtn").addEventListener("click", () => {
    const userId = document.getElementById("userId").value;
    const userName = "Floppa"

    if (!userId) {
        alert("Please enter a valid User ID!");
        return;
    }

    // Connect to the server with the User ID as a query parameter
    socket = io("http://localhost:3000", {
        query: { userId, userName }
    });

    document.getElementById("status").innerText = `Connecting as User ${userId}...`;

    // Handle connection success
    socket.on("connect", () => {
        document.getElementById("status").innerText = `Connected as User ${userId}`;
        console.log(`Connected with socket ID: ${socket.id}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        document.getElementById("status").innerText = "Disconnected from server.";
        console.log("Disconnected from server.");
    });

    // Handle game starting
    socket.on("CARD_SELECTION", (data) => {
        const { userId: enemyId } = data;
        document.getElementById("game-status").innerText = `Match found! Your enemy is User ${enemyId}. Select your cards!`;
        document.getElementById("card-selection").style.display = "block";
        console.log(`Game starts against User ${enemyId}`);
    });

    // Notify when game starts
    socket.on("GAME_STARTS", (data) => {
        const { cardsIds } = data;

        // Mettre à jour le panneau de contrôle
        document.getElementById("game-status").innerText = "The game has started! Take your actions!";
        document.getElementById("battle-controls").style.display = "block";

        // Afficher les cartes de l'adversaire
        const enemyCardsList = document.getElementById("enemy-cards-list");
        enemyCardsList.innerHTML = cardsIds.map(cardId => `Card ${cardId}`).join(", ");
        console.log(`Enemy's cards: ${cardsIds}`);
    });

    socket.on("START_TURN", () => {
        isMyTurn = true;
        currentEnergy = maxEnergy;
        document.getElementById("game-status").innerText = "Your turn! Select a card to attack.";
    });

    socket.on("RECEIVE_ACTION", (data) => {
        const { cardId, damage } = data;
        alert(`Your card ${cardId} took ${damage} damage!`);
        console.log(`Card ${cardId} took ${damage} damage.`);
    });

    socket.on("END_TURN", () => {
        document.getElementById("game-status").innerText = "Opponent's turn. Waiting...";
    });

    socket.on("GAME_OVER", (data) => {
        const { result, award } = data;

        // Masquer les contrôles de combat
        document.getElementById("battle-controls").style.display = "none";

        // Afficher les résultats
        const gameResult = document.getElementById("game-result");
        const gameOverDiv = document.getElementById("game-over");

        if (result === "forfeited") {
            gameResult.innerText = "Your opponent disconnected. You win by forfeit!";
        } else if (result === "win") {
            gameResult.innerText = `Congratulations! You won the game! Award: ${award} points`;
        } else if (result === "lose") {
            gameResult.innerText = "You lost the game. Better luck next time!";
        }

        gameOverDiv.style.display = "block";

        console.log(`Game over: You ${result}, award: ${award}`);
    });

    socket.on("ACTION_FAILED", (data) => {
        const { message, code } = data;
        console.error(`Action failed (code: ${code}): ${message}`);
        alert(`Error: ${message}`);
    });
});

document.getElementById("confirmCards").addEventListener("click", () => {
    if (!socket) {
        alert("Please connect first!");
        return;
    }

    // Gather selected cards
    const selectedCards = [];
    const cardCheckboxes = document.querySelectorAll("#cards input[type='checkbox']");
    cardCheckboxes.forEach((checkbox) => {
        if (checkbox.checked) {
            selectedCards.push({
                id: parseInt(checkbox.value),
                attack: 10, // Dummy values for testing
                defence: 5, // Dummy values for testing
                energy: 3,  // Dummy values for testing
                hp: 20     // Dummy values for testing
            });
        }
    });
    console.log(selectedCards);

    if (selectedCards.length > 4) {
        alert("You can select up to 4 cards only!");
        return;
    }

    if (selectedCards.length === 0) {
        alert("Please select at least one card.");
        return;
    }

    // Send selected cards to server
    const userId = document.getElementById("userId").value;
    socket.emit("WAITING_CARDS", { id: Number(userId), cards: selectedCards });
    document.getElementById("game-status").innerText = "Cards selected. Waiting for the opponent...";
    document.getElementById("card-selection").style.display = "none";
    console.log(`User ${userId} selected cards:`, selectedCards);
});

function fight() {
    if (!socket) {
        alert("Please connect first!");
        return;
    }

    // Notify the server that the user is waiting for a game
    const userId = document.getElementById("userId").value;

    socket.emit("WAITING_PLAYER", { id: Number(userId) });
    document.getElementById("game-status").innerText = "Waiting for a match...";
    console.log(`User ${userId} is waiting for a match.`);
}

function attack() {

    const cardId = parseInt(document.getElementById("attack-card").value);
    const targetId = parseInt(document.getElementById("target-card").value);
    const energyCost = 20; // Exemple de coût d'énergie fixe pour une attaque


    if (!isMyTurn) {
        alert("It's not your turn!");
        return;
    }

    if (currentEnergy < energyCost) {
        alert("Not enough energy!");
        return;
    }

    const userId = document.getElementById("userId").value;

    socket.emit("SEND_ACTION", {
        userId: Number(userId),
        cardId,
        targetId
    });

    currentEnergy -= energyCost;
    document.getElementById("game-status").innerText = `You attacked with card ${cardId}. Remaining energy: ${currentEnergy}`;
}

function endTurn() {
    if (!isMyTurn) {
        alert("You can't end your turn now!");
        return;
    }

    const userId = document.getElementById("userId").value;
    socket.emit("END_TURN", { id: Number(userId) });
    isMyTurn = false;
    document.getElementById("game-status").innerText = "Turn ended. Waiting for opponent...";
}