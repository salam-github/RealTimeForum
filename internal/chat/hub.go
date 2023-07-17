package chat

import (
	"encoding/json"

	"real-time-forum/internal/models"
)

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	clients    map[int]*Client
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	typing     map[int]bool // Map to store the typing status of clients
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[int]*Client),
		typing:     make(map[int]bool), // Initialize the typing map
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client.userID] = client

			// Notify other clients that this client is online
			uids := make([]int, 0, len(h.clients))
			for id := range h.clients {
				uids = append(uids, id)
			}
			msg := models.OnlineUsers{
				UserIds:  uids,
				Msg_type: "online",
			}
			sendMsg, err := json.Marshal(msg)
			if err != nil {
				panic(err)
			}

			for _, c := range h.clients {
				select {
				case c.send <- sendMsg:
				default:
					close(c.send)
					delete(h.clients, c.userID)
				}
			}
		case client := <-h.unregister:
			if _, ok := h.clients[client.userID]; ok {
				delete(h.clients, client.userID)

				// Notify other clients that this client is offline
				uids := make([]int, 0, len(h.clients))
				for id := range h.clients {
					uids = append(uids, id)
				}
				msg := models.OnlineUsers{
					UserIds:  uids,
					Msg_type: "online",
				}
				sendMsg, err := json.Marshal(msg)
				if err != nil {
					panic(err)
				}

				for _, c := range h.clients {
					select {
					case c.send <- sendMsg:
					default:
						close(c.send)
						delete(h.clients, c.userID)
					}
				}

				close(client.send)
			}
		case message := <-h.broadcast:
			// Process the message
			var msg models.Message
			if err := json.Unmarshal(message, &msg); err != nil {
				panic(err)
			}

			sendMsg, err := json.Marshal(msg)
			if err != nil {
				panic(err)
			}

			if msg.Msg_type == "msg" {
				for _, client := range h.clients {
					if client.userID == msg.Receiver_id {
						select {
						case client.send <- sendMsg:
						default:
							close(client.send)
							delete(h.clients, client.userID)
						}
					}
				}
			} else {
				for _, client := range h.clients {
					if client.userID != msg.Sender_id {
						select {
						case client.send <- sendMsg:
						default:
							close(client.send)
							delete(h.clients, client.userID)
						}
					}
				}
			}
		}
	}
}

// UpdateTypingStatus updates the typing status of a client in the hub.
func (h *Hub) UpdateTypingStatus(userID int, isTyping bool) {
	h.typing[userID] = isTyping

	// Notify other clients about the typing status change
	msg := models.TypingStatus{
		UserID:   userID,
		IsTyping: isTyping,
		Msgtype:  "typing",
	}
	sendMsg, err := json.Marshal(msg)
	if err != nil {
		panic(err)
	}

	for _, client := range h.clients {
		if client.userID != userID {
			select {
			case client.send <- sendMsg:
			default:
				close(client.send)
				delete(h.clients, client.userID)
			}
		}
	}
}
