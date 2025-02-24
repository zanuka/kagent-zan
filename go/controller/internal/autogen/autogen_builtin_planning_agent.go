package autogen

import (
	_ "embed"
	"fmt"
	"github.com/kagent-dev/kagent/go/autogen/api"
)

// embed planning-agent-system-prompt.txt
//
//go:embed planning-agent-system-prompt.txt
var planningAgentSystemPrompt string

const planningAgentDescription = "The Planning Agent is responsible for planning and scheduling tasks. The planning agent is also responsible for deciding when the user task has been accomplished and terminating the conversation."

func MakeBuiltinPlanningAgent(
	name string,
	teamParticipants []api.TeamParticipant,
	modelClient *api.ModelComponent,
) api.TeamParticipant {
	var handoffs []api.SwarmHandoff
	for _, participant := range teamParticipants {
		targetName := participant.Config.Name
		handoffs = append(handoffs, api.SwarmHandoff{
			Target:      targetName,
			Description: fmt.Sprintf("Handoff to %s. %s", targetName, *participant.Description),
			Name:        fmt.Sprintf("transfer_to_%s", targetName),
			Message:     fmt.Sprintf("Transferred to %s, adopting the role of %s immediately.", targetName, targetName),
		})
	}
	return api.TeamParticipant{
		Provider:      "autogen_agentchat.agents.AssistantAgent",
		ComponentType: "agent",
		Version:       makePtr(1),
		Description:   makePtr(planningAgentDescription),
		//ComponentVersion: 1,
		Config: api.AgentConfig{
			Name:        name,
			ModelClient: modelClient,
			ModelContext: &api.ChatCompletionContextComponent{
				Provider:      "autogen_core.model_context.UnboundedChatCompletionContext",
				ComponentType: "chat_completion_context",
				Version:       makePtr(1),
				//ComponentVersion: 1,
			},
			Description: planningAgentDescription,
			// TODO(ilackarms): convert to non-ptr with omitempty?
			SystemMessage:         makePtr(planningAgentSystemPrompt),
			ReflectOnToolUse:      false,
			ToolCallSummaryFormat: "{result}",
			Handoffs:              handoffs,
		},
	}
}
