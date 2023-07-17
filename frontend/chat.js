var log = document.querySelector(".chat")

function appendLog(container, msg, date) {
    var doScroll = log.scrollTop > log.scrollHeight - log.clientHeight - 1;
    log.appendChild(container);
    container.append(msg);
    msg.append(date)
   
    if (doScroll) {
        log.scrollTop = log.scrollHeight - log.clientHeight;
    }
} 

function CreateMessages(data, currId) {
    log.innerHTML = ""

    data.map(({sender_id, content, date}) => {
        var receiverContainer = document.createElement("div");
        receiverContainer.className = (sender_id == currId) ? "sender-container": "receiver-container"
        var receiver = document.createElement("div");
        receiver.className = (sender_id == currId) ? "sender": "receiver"
        receiver.innerText = content
        var messagedate = document.createElement("div");
        messagedate.className = "chat-time"
        messagedate.innerText = date.slice(0, -3)
        appendLog(receiverContainer, receiver, messagedate);
    } )
}

function sendMsg(conn, rid, msg, msg_type) {
    console.log(rid)
    if (!conn) {
        return false;
    }
    console.log("Message input Value:", msg.value);
    if (!msg.value) {
        console.log("No message");
        return false;
    }
    console.log("Sending message to receiver ID:", rid);

    let msgData = {
        id: 0,
        sender_id: 0,
        receiver_id: rid,
        content: msg.value,
        date: '',
        msg_type: msg_type,
        is_typing: false
    }

    conn.send(JSON.stringify(msgData))
    msg.value = "";
    updateUsers()


    console.log("Message sent to receiver ID:", rid);
    console.log("Message content:", msg.value);
    console.log("Message Data:", msgData.content);
    return false;
};

function OpenChat(rid, conn, data, currId) {
    document.getElementById('id' + rid).style.fontWeight = "400";

    for (var i = 0; i < unread.length; i++) {
        if (unread[i][0] == rid) {
            unread[i][1] = 0;
        }
    }

    let oldElem = document.querySelector(".send-wrapper");
    let newElem = oldElem.cloneNode(true);
    oldElem.parentNode.replaceChild(newElem, oldElem);

    document.querySelector(".chat-user-username").innerText = allUsers.filter(u => {
        return u.id == rid;
    })[0].username;
    document.querySelector(".chat-wrapper").style.display = "flex";
    var msg = document.getElementById("chat-input");

    log.innerHTML = "";

    var typingTimer;
    var typingInterval = 5000;
    var isTyping = false;

    document.querySelector("#chat-input").addEventListener("keydown", function(event) {
        // Add typing listener and send typing notification
        if (event.keyCode !== 13 && !isTyping) { // Ignore the Enter key and if already typing
            console.log("User started typing");
            isTyping = true;

            clearTimeout(typingTimer);
            typingTimer = setTimeout(function() {
                if (isTyping) {
                    console.log("User stopped typing");
                    sendTypingStatus(conn, rid, false); // Send typing status as false when stopped typing
                    isTyping = false;
                }
            }, typingInterval);

            sendTypingStatus(conn, rid, true); // Send typing status as true when started typing
            console.log("Sending typing status:", true);
        }
    });


    document.querySelector("#send-btn").addEventListener("click", function() {
        sendMsg(conn, rid, msg, 'msg');
        let resp = getData('http://localhost:8000/message?receiver=' + rid);
        resp.then(value => {
            CreateMessages(value, currId);
        }).catch();
        clearTimeout(typingTimer); // Clear the previous timer
        isTyping = false; // Reset the typing flag
    });
    document.querySelector("#chat-input").addEventListener("keydown", function(event) {
        if (event.keyCode === 13) {
            sendMsg(conn, rid, msg, 'msg');
            clearTimeout(typingTimer);
            let resp = getData('http://localhost:8000/message?receiver=' + rid);
            resp.then(value => {
                CreateMessages(value, currId);
            }).catch();
            isTyping = false; // Reset the typing flag
        }
    });
    if (data == null) {
        return;
    }

    CreateMessages(data, currId);
}



function sendTypingStatus(conn, receiverId, isTyping) {
    let typingData = {
        receiver_id: receiverId,
        is_typing: isTyping
    };

    conn.send(JSON.stringify(typingData));
    console.log("Sent typing status:", typingData);
}


// close chat
document.querySelector(".close-chat").addEventListener("click", function() {
    document.querySelector(".chat-wrapper").style.display = "none"
})