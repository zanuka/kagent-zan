package autogen

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"github.com/kagent-dev/kagent/controller/api/v1alpha1"
	"github.com/kagent-dev/kagent/controller/internal/utils/syncutils"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type AutogenApiTranslator interface {
	TranslateSelectorGroupChat(
		ctx context.Context,
		selectorTeamRef types.NamespacedName,
	) (*SelectorGroupChat, error)
}

type autogenApiTranslator struct {
	kube client.Client

	// map of tool ref to builtin function name
	builtinTools syncutils.AtomicMap[string, string]
}

func NewAutogenApiTranslator(
	kube client.Client,
	builtinTools syncutils.AtomicMap[string, string],
) AutogenApiTranslator {
	return &autogenApiTranslator{
		kube:         kube,
		builtinTools: builtinTools,
	}
}

func (a *autogenApiTranslator) TranslateSelectorGroupChat(
	ctx context.Context,
	selectorTeamRef types.NamespacedName,
) (*SelectorGroupChat, error) {
	// get selector team
	selectorTeam := &v1alpha1.AutogenTeam{}
	err := fetchObjKube(
		ctx,
		a.kube,
		selectorTeam,
		selectorTeamRef.Name,
		selectorTeamRef.Namespace,
	)
	if err != nil {
		return nil, err
	}

	// get model config
	modelConfig := &v1alpha1.AutogenModelConfig{}
	err = fetchObjKube(
		ctx,
		a.kube,
		modelConfig,
		selectorTeam.Spec.SelectorTeamConfig.ModelConfig,
		selectorTeam.Namespace,
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
		modelConfig.Spec.APIKeySecret,
		selectorTeam.Namespace,
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

	modelClient := ModelClient{
		Provider:         "autogen_ext.models.openai.OpenAIChatCompletionClient",
		ComponentType:    "model",
		Version:          1,
		ComponentVersion: 1,
		Config: ModelClientConfig{
			Model:  modelConfig.Spec.Model,
			ApiKey: string(modelApiKey),
		},
	}

	var participants []GroupChatParticipant
	for _, agentName := range selectorTeam.Spec.Participants {
		agent := &v1alpha1.AutogenAgent{}
		err := fetchObjKube(
			ctx,
			a.kube,
			agent,
			agentName,
			selectorTeam.Namespace,
		)
		if err != nil {
			return nil, err
		}

		//TODO: currently only supports builtin tools
		var tools []GroupChatParticipantTool
		for _, toolRef := range agent.Spec.Tools {
			// fetch fn name from builtin tools
			fnName, ok := a.builtinTools.Get(toolRef)
			if !ok {
				return nil, fmt.Errorf("builtin tool %s not found", toolRef)
			}

			tool := GroupChatParticipantTool{
				Provider:         "autogen_agentchat.tools.BuiltinTool",
				ComponentType:    "tool",
				Version:          1,
				ComponentVersion: 1,
				Config: GroupChatParticipantToolConfig{
					FnName: fnName,
				},
			}
			tools = append(tools, tool)
		}

		participant := GroupChatParticipant{
			//TODO: currently only supports assistant agents
			Provider:         "autogen_agentchat.agents.AssistantAgent",
			ComponentType:    "agent",
			Version:          1,
			ComponentVersion: 1,
			Config: GroupChatParticipantConfig{
				Name:        agent.Spec.Name,
				ModelClient: modelClient,
				Tools:       tools,
				ModelContext: ModelContext{
					Provider:         "autogen_core.model_context.UnboundedChatCompletionContext",
					ComponentType:    "chat_completion_context",
					Version:          1,
					ComponentVersion: 1,
				},
				Description:           agent.Spec.Description,
				SystemMessage:         agent.Spec.SystemMessage,
				ReflectOnToolUse:      false,
				ToolCallSummaryFormat: "{result}",
			},
		}
		participants = append(participants, participant)
	}

	terminationCondition, err := translateTerminationCondition(selectorTeam.Spec.TerminationCondition)
	if err != nil {
		return nil, err
	}

	return &SelectorGroupChat{
		ID:               generateIdFromString(selectorTeam.Name + "-" + selectorTeam.Namespace),
		UserID:           "guestuser@gmail.com", // always use global id
		Provider:         "autogen_agentchat.teams.SelectorGroupChat",
		ComponentType:    "team",
		Version:          1,
		ComponentVersion: 1,
		Description:      selectorTeam.Spec.Description,
		Config: SelectorGroupChatConfig{
			Participants:         participants,
			ModelClient:          modelClient,
			TerminationCondition: *terminationCondition,
			SelectorPrompt:       selectorTeam.Spec.SelectorTeamConfig.SelectorPrompt,
			AllowRepeatedSpeaker: false,
		},
	}, nil
}

func generateIdFromString(s string) int {
	hash := sha256.Sum256([]byte(s))
	// Uses first 8 bytes
	number := int(binary.BigEndian.Uint64(hash[:8]))
	return number
}

func translateTerminationCondition(terminationCondition v1alpha1.TerminationCondition) (*TerminationCondition, error) {
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
		return &TerminationCondition{
			Provider:         "autogen_agentchat.conditions.MaxMessageTermination",
			ComponentType:    "termination",
			Version:          1,
			ComponentVersion: 1,
			Config: TerminationConditionConfig{
				MaxMessages: terminationCondition.MaxMessageTermination.MaxMessages,
			},
		}, nil
	case terminationCondition.TextMentionTermination != nil:
		return &TerminationCondition{
			Provider:         "autogen_agentchat.conditions.TextMentionTermination",
			ComponentType:    "termination",
			Version:          1,
			ComponentVersion: 1,
			Config: TerminationConditionConfig{
				Text: terminationCondition.TextMentionTermination.Text,
			},
		}, nil
	case terminationCondition.OrTermination != nil:
		var conditions []TerminationCondition
		for _, c := range terminationCondition.OrTermination.Conditions {
			condition, err := translateTerminationCondition(c)
			if err != nil {
				return nil, err
			}
			conditions = append(conditions, *condition)
		}
		return &TerminationCondition{
			Provider:         "autogen_agentchat.conditions.OrTerminationCondition",
			ComponentType:    "termination",
			Version:          1,
			ComponentVersion: 1,
			Config: TerminationConditionConfig{
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
