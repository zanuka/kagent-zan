package autogen

import "github.com/kagent-dev/kagent/go/autogen/api"

// gets appended to all group chats
var userProxyAgent = api.TeamParticipant{
	Provider:      "autogen_agentchat.agents.UserProxyAgent",
	ComponentType: "agent",
	Version:       makePtr(1),
	Description:   makePtr("An agent that can represent a human user through an input function."),
	Config: api.AgentConfig{
		Name:        "user_proxy",
		Description: "A human user",
	},
	Label: makePtr("UserProxyAgent"),
}
