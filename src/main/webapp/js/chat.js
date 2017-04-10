var ws = null;
var username = null;
// 用心跳机制防止 Server 端超时。也可以让客户端及时发现掉线。
var heartbeat_interval = null, missed_heartbeats = 0, heartbeat_ping_msg = "--heartbeat-ping--", heartbeat_pong_msg = "--heartbeat-pong--";

function sendMessage() {
    try {
        if (username == null) {
            alert("You must choose a username first.");
            return;
        }
        if (ws == null || ws.readyState != ws.OPEN) {
            alert("Websocket is not open, please try again later.");
            return;
        }
        ws.send($('#message').val());
        $('#message').val('');
    } catch (e) {
        alert(e.message);
    }
}

function setUsername() {
    if (ws && ws.readyState == ws.OPEN) {
        alert("You can not change username in a valid session.");
        return;
    }
    var value = $('#username').val();
    console.log("username is :" + value);
    if (value) {
        username = value;
        buildWS();
    } else {
        alert("username can not be empty.");
    }
}

function buildWS() {
    try {
        ws = new WebSocket("ws://localhost:8080/chat?" + username);

        ws.onopen = function (event) {
            console.log("websocket opened.");
            document.getElementById("username").readOnly = true;
            ws.send(username + " entered the room.");

            // heartbeat
            if (heartbeat_interval === null) {
                missed_heartbeats = 0;
                heartbeat_interval = setInterval(function () {
                    try {
                        missed_heartbeats++;
                        if (missed_heartbeats > 3) {
                            throw new Error("Too many missed heartbeats.");
                        }
                        ws.send(heartbeat_ping_msg);
                    } catch (e) {
                        console.warn("Closing connection. Reason: " + e.message);
                        close_websocket();
                    }
                }, 60000);// send ping every 5 seconds.
            }
        };
        ws.onmessage = function (event) {
            if (event.data === heartbeat_pong_msg) {
                console.log("pong");
                missed_heartbeats = 0;
                return;
            }
            var $textarea = $('#messages');
            $textarea.val($textarea.val() + event.data + "\n");
            $textarea.animate({
                scrollTop: $textarea.height()
            }, 1000);
        };
        ws.onerror = function (event) {
            console.log("error: " + event);
        };
        ws.onclose = function (event) {
            alert('websocket closed by server. ' + event.code + ":" + event.reason);
            close_websocket();
        };
    } catch (e) {
        alert(e.message);
    }
}

function close_websocket() {
    if (ws !== null) {
        ws.close();
        ws = null;
    }
    document.getElementById("username").readOnly = false;
    if (heartbeat_interval !== null) {
        clearInterval(heartbeat_interval);
        heartbeat_interval = null;
    }
}

// bind enter shortcut.
$("#username").keyup(function (event) {
    if (event.keyCode == 13) {
        $("#setUsername").click();
    }
});
// bind enter shortcut.
$("#message").keyup(function (event) {
    if (event.keyCode == 13) {
        $("#submitmsg").click();
    }
});
window.onbeforeunload = function () {
    if (ws && ws.readyState === ws.OPEN) {
        return "quit?";
    }
}