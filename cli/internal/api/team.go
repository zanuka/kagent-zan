package api

import "fmt"

func (c *Client) ListTeams(userID string) ([]Team, error) {
	var teams []Team
	err := c.doRequest("GET", fmt.Sprintf("/teams/?user_id=%s", userID), nil, &teams)
	return teams, err
}

func (c *Client) CreateTeam(team *Team) error {
	return c.doRequest("POST", "/teams/", team, team)
}

func (c *Client) GetTeam(teamID int, userID string) (*Team, error) {
	var team Team
	err := c.doRequest("GET", fmt.Sprintf("/teams/%d?user_id=%s", teamID, userID), nil, &team)
	return &team, err
}

func (c *Client) DeleteTeam(teamID int, userID string) error {
	return c.doRequest("DELETE", fmt.Sprintf("/teams/%d?user_id=%s", teamID, userID), nil, nil)
}
