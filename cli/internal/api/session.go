package api

import "fmt"

func (c *Client) ListSessions(userID string) ([]Session, error) {
	var sessions []Session
	err := c.doRequest("GET", fmt.Sprintf("/sessions/?user_id=%s", userID), nil, &sessions)
	return sessions, err
}

func (c *Client) CreateSession(session *Session) error {
	return c.doRequest("POST", "/sessions/", session, session)
}

func (c *Client) GetSession(sessionID int, userID string) (*Session, error) {
	var session Session
	err := c.doRequest("GET", fmt.Sprintf("/sessions/%d?user_id=%s", sessionID, userID), nil, &session)
	return &session, err
}

func (c *Client) DeleteSession(sessionID int, userID string) error {
	return c.doRequest("DELETE", fmt.Sprintf("/sessions/%d?user_id=%s", sessionID, userID), nil, nil)
}
