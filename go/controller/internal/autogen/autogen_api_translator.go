package autogen

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"github.com/kagent-dev/kagent/go/autogen/api"
	"github.com/kagent-dev/kagent/go/controller/api/v1alpha1"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const GlobalUserID = "guestuser@gmail.com"

type AutogenApiTranslator interface {
	TranslateGroupChat(
		ctx context.Context,
		team *v1alpha1.AutogenTeam,
	) (*api.Team, error)
}

type autogenApiTranslator struct {
	kube client.Client
}

func NewAutogenApiTranslator(
	kube client.Client,
) AutogenApiTranslator {
	return &autogenApiTranslator{
		kube: kube,
	}
}

func (a *autogenApiTranslator) TranslateGroupChat(
	ctx context.Context,
	team *v1alpha1.AutogenTeam,
) (*api.Team, error) {

	// get model config
	selectorTeamConfig := team.Spec.SelectorTeamConfig
	magenticOneTeamConfig := team.Spec.MagenticOneTeamConfig
	swarmTeamConfig := team.Spec.SwarmTeamConfig

	var modelConfigName string
	var groupChatType string
	var teamConfig api.TeamConfig
	if selectorTeamConfig != nil {
		modelConfigName = selectorTeamConfig.ModelConfig
		teamConfig.SelectorPrompt = selectorTeamConfig.SelectorPrompt
		groupChatType = "SelectorGroupChat"
	} else if magenticOneTeamConfig != nil {
		modelConfigName = magenticOneTeamConfig.ModelConfig
		groupChatType = "MagenticOneGroupChat"
		teamConfig.MaxStalls = magenticOneTeamConfig.MaxStalls
		if teamConfig.MaxStalls == 0 {
			// default to 3
			teamConfig.MaxStalls = 3
		}
		teamConfig.FinalAnswerPrompt = magenticOneTeamConfig.FinalAnswerPrompt
	} else if swarmTeamConfig != nil {
		groupChatType = "Swarm"
		modelConfigName = swarmTeamConfig.ModelConfig
	} else {
		return nil, fmt.Errorf("no model config specified")
	}

	modelConfig := &v1alpha1.AutogenModelConfig{}
	err := fetchObjKube(
		ctx,
		a.kube,
		modelConfig,
		modelConfigName,
		team.Namespace,
	)
	if err != nil {
		return nil, err
	}

	// get model api key
	modelApiKeySecret := &v1.Secret{}
	err = fetchObjKube(
		ctx,
		a.kube,
		modelApiKeySecret,
		modelConfig.Spec.APIKeySecretName,
		team.Namespace,
	)
	if err != nil {
		return nil, err
	}

	if modelApiKeySecret.Data == nil {
		return nil, fmt.Errorf("model api key secret data not found")
	}

	modelApiKey, ok := modelApiKeySecret.Data[modelConfig.Spec.APIKeySecretKey]
	if !ok {
		return nil, fmt.Errorf("model api key not found")
	}

	teamConfig.ModelClient = &api.ModelComponent{
		Provider:      "autogen_ext.models.openai.OpenAIChatCompletionClient",
		ComponentType: "model",
		Version:       makePtr(1),
		//ComponentVersion: 1,
		Config: api.ModelConfig{
			Model:  modelConfig.Spec.Model,
			APIKey: makePtr(string(modelApiKey)),
		},
	}

	var participants []api.TeamParticipant
	for _, agentName := range team.Spec.Participants {
		agent := &v1alpha1.AutogenAgent{}
		err := fetchObjKube(
			ctx,
			a.kube,
			agent,
			agentName,
			team.Namespace,
		)
		if err != nil {
			return nil, err
		}

		//TODO: currently only supports builtin tools
		var tools []api.ToolComponent
		for _, toolRef := range agent.Spec.Tools {
			toolProvider, toolConfig, err := translateToolConfig(ctx, a.kube, toolRef, team.Namespace)
			if err != nil {
				return nil, err
			}

			tool := api.ToolComponent{
				Provider:      toolProvider,
				ComponentType: "tool",
				Version:       makePtr(1),
				Config:        toolConfig,
			}
			tools = append(tools, tool)
		}

		sysMsgPtr := makePtr(agent.Spec.SystemMessage)
		if agent.Spec.SystemMessage == "" {
			sysMsgPtr = nil
		}
		participant := api.TeamParticipant{
			//TODO: currently only supports assistant agents
			Provider:      "autogen_agentchat.agents.AssistantAgent",
			ComponentType: "agent",
			Version:       makePtr(1),
			Description:   makePtr(agent.Spec.Description),
			//ComponentVersion: 1,
			Config: api.AgentConfig{
				Name:        agent.Spec.Name,
				ModelClient: teamConfig.ModelClient,
				Tools:       tools,
				ModelContext: &api.ChatCompletionContextComponent{
					Provider:      "autogen_core.model_context.UnboundedChatCompletionContext",
					ComponentType: "chat_completion_context",
					Version:       makePtr(1),
					//ComponentVersion: 1,
				},
				Description: agent.Spec.Description,
				// TODO(ilackarms): convert to non-ptr with omitempty?
				SystemMessage:         sysMsgPtr,
				ReflectOnToolUse:      false,
				ToolCallSummaryFormat: "{result}",
			},
		}
		participants = append(participants, participant)
	}

	if swarmTeamConfig != nil {
		planningAgent := MakeBuiltinPlanningAgent(
			"planning_agent",
			participants,
			teamConfig.ModelClient,
		)
		// prepend builtin planning agent when using swarm mode
		participants = append(
			[]api.TeamParticipant{planningAgent},
			participants...,
		)
	}
	teamConfig.Participants = participants

	terminationCondition, err := translateTerminationCondition(team.Spec.TerminationCondition)
	if err != nil {
		return nil, err
	}
	teamConfig.TerminationCondition = terminationCondition

	return &api.Team{
		ID:     generateIdFromString(team.Name + "-" + team.Namespace),
		UserID: GlobalUserID, // always use global id
		Component: api.TeamComponent{
			Provider:         "autogen_agentchat.teams." + groupChatType,
			ComponentType:    "team",
			Version:          1,
			ComponentVersion: 1,
			Description:      makePtr(team.Spec.Description),
			Label:            team.Name,
			Config:           teamConfig,
		},
	}, nil
}

func translateToolConfig(
	ctx context.Context,
	kube client.Client,
	ref string,
	namespace string,
) (string, api.ToolConfig, error) {
	// right now we only support builtin tools, so we just return the ref
	// later this can fetch user-defined tools from k8s and translate them
	// to autogen-compatible tools
	return ref, api.ToolConfig{}, nil
}

func makePtr[T any](v T) *T {
	return &v
}

func generateIdFromString(s string) int {
	hash := sha256.Sum256([]byte(s))
	// Uses first 8 bytes
	number := int(binary.BigEndian.Uint64(hash[:8]))
	return number
}

func translateTerminationCondition(terminationCondition v1alpha1.TerminationCondition) (*api.TerminationComponent, error) {
	// ensure only one termination condition is set
	var conditionsSet int
	if terminationCondition.MaxMessageTermination != nil {
		conditionsSet++
	}
	if terminationCondition.TextMentionTermination != nil {
		conditionsSet++
	}
	if terminationCondition.OrTermination != nil {
		conditionsSet++
	}
	if conditionsSet != 1 {
		return nil, fmt.Errorf("exactly one termination condition must be set")
	}

	switch {
	case terminationCondition.MaxMessageTermination != nil:
		return &api.TerminationComponent{
			Provider:      "autogen_agentchat.conditions.MaxMessageTermination",
			ComponentType: "termination",
			Version:       makePtr(1),
			//ComponentVersion: 1,
			Config: api.TerminationConfig{
				MaxMessages: makePtr(terminationCondition.MaxMessageTermination.MaxMessages),
			},
		}, nil
	case terminationCondition.TextMentionTermination != nil:
		return &api.TerminationComponent{
			Provider:      "autogen_agentchat.conditions.TextMentionTermination",
			ComponentType: "termination",
			Version:       makePtr(1),
			//ComponentVersion: 1,
			Config: api.TerminationConfig{
				Text: makePtr(terminationCondition.TextMentionTermination.Text),
			},
		}, nil
	case terminationCondition.OrTermination != nil:
		var conditions []api.TerminationComponent
		for _, c := range terminationCondition.OrTermination.Conditions {
			subConditon := v1alpha1.TerminationCondition{
				MaxMessageTermination:  c.MaxMessageTermination,
				TextMentionTermination: c.TextMentionTermination,
			}

			condition, err := translateTerminationCondition(subConditon)
			if err != nil {
				return nil, err
			}
			conditions = append(conditions, *condition)
		}
		return &api.TerminationComponent{
			Provider:      "autogen_agentchat.conditions.OrTerminationCondition",
			ComponentType: "termination",
			Version:       makePtr(1),
			//ComponentVersion: 1,
			Config: api.TerminationConfig{
				Conditions: conditions,
			},
		}, nil
	}

	return nil, fmt.Errorf("unsupported termination condition")
}

func fetchObjKube(ctx context.Context, kube client.Client, obj client.Object, objName, objNamespace string) error {
	err := kube.Get(ctx, types.NamespacedName{
		Name:      objName,
		Namespace: objNamespace,
	}, obj)
	if err != nil {
		return err
	}
	return nil
}
