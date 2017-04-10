package com.example;

import javax.websocket.*;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/chat")
public class ChatWebSocket {

    private static final Map<String, Session> users = new ConcurrentHashMap<>();
    private static final String HEARTBEAT_PING_MSG = "--heartbeat-ping--";
    private static final String HEARTBEAT_PONG_MSG = "--heartbeat-pong--";

    @OnOpen
    public void onOpen(Session session) throws IOException {
        System.out.println("WebSocket opened: " + session.getId());
        String username = session.getQueryString();
        if (username == null || username.equals("")) {
            session.close(new CloseReason(CloseReason.CloseCodes.CANNOT_ACCEPT, "用户名不能为空."));
        } else if (users.containsKey(username) && users.get(username).isOpen()) {
            session.close(new CloseReason(CloseReason.CloseCodes.CANNOT_ACCEPT, "用户名已经存在."));
        } else {
            session.setMaxIdleTimeout(180000);
            System.out.println(username + " connected. timeout: " + session.getMaxIdleTimeout());
            users.put(username, session);
        }
    }

    @OnMessage
    public void onTextMessage(String message, Session session) throws IOException {
        String username = session.getQueryString();
        if (username == null) {
            System.out.println("Close WebSocket, because of lacking username");
            session.close(new CloseReason(CloseReason.CloseCodes.CANNOT_ACCEPT, "username not found."));
        } else {
            if (message.equals(HEARTBEAT_PING_MSG)) {
                System.out.println("Ping: " + session.getQueryString());
                session.getBasicRemote().sendText(HEARTBEAT_PONG_MSG);
                return;
            }
            System.out.println("Message received: " + session.getQueryString() + ":" + message);
            String msg = username + ":" + message;
            for (String user : users.keySet()) {
                users.get(user).getBasicRemote().sendText(msg);
            }
        }
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        System.out.println("Error happened: " + session.getQueryString());
    }

    @OnClose
    public void onClose(CloseReason reason, Session session) {
        System.out.println("Websocket clsoed： " + reason.getReasonPhrase());
        try {
            String username = session.getQueryString();
            if (users.containsKey(username) && users.get(username) == session) {
                users.remove(username);
                for (String user : users.keySet()) {
                    users.get(user).getBasicRemote().sendText(username + " leaved this room.");
                }
            }
            if (session.isOpen()) {
                session.close();
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
