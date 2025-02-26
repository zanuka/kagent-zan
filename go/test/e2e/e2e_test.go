package e2e_test

import (
	"encoding/json"
	"os"

	"sigs.k8s.io/yaml"

	"github.com/kagent-dev/kagent/go/controller/api/v1alpha1"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	apikeySecretKey = "api-key"
)

var (
	openaiApiKey = os.Getenv("OPENAI_API_KEY")
)

var _ = Describe("E2e", func() {
	It("configures the agent", func() {

		// add a team
		namespace := "team-ns"

		apikeySecret := &v1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-secret",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "Secret",
				APIVersion: "v1",
			},
			Data: map[string][]byte{
				apikeySecretKey: []byte(openaiApiKey),
			},
		}

		modelConfig := &v1alpha1.AutogenModelConfig{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-model",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "AutogenModelConfig",
				APIVersion: "agent.ai.solo.io/v1alpha1",
			},
			Spec: v1alpha1.AutogenModelConfigSpec{
				Model:            "gpt-4o",
				APIKeySecretName: apikeySecret.Name,
				APIKeySecretKey:  apikeySecretKey,
			},
		}

		planningAgent := &v1alpha1.AutogenAgent{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "planning-agent",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "AutogenAgent",
				APIVersion: "agent.ai.solo.io/v1alpha1",
			},
			Spec: v1alpha1.AutogenAgentSpec{
				Name:          "planning_agent",
				Description:   "The Planning Agent is responsible for planning and scheduling tasks. The planning agent is also responsible for deciding when the user task has been accomplished and terminating the conversation.",
				SystemMessage: readFileAsString("systemprompts/planning-agent-system-prompt.txt"),
			},
		}

		kubectlUser := &v1alpha1.AutogenAgent{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "kubectl-user",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "AutogenAgent",
				APIVersion: "agent.ai.solo.io/v1alpha1",
			},
			Spec: v1alpha1.AutogenAgentSpec{
				Name:          "kubectl_execution_agent",
				Description:   "The Kubectl User is responsible for running kubectl commands corresponding to user requests.",
				SystemMessage: readFileAsString("systemprompts/kubectl-user-system-prompt.txt"),
				Tools: []v1alpha1.AutogenTool{
					{
						Provider: string(v1alpha1.BuiltinTool_KubectlGetPods),
					},
					{
						Provider: string(v1alpha1.BuiltinTool_KubectlGetServices),
					},
					{
						Provider: string(v1alpha1.BuiltinTool_KubectlApplyManifest),
					},
					{
						Provider: string(v1alpha1.BuiltinTool_KubectlGetResources),
					},
					{
						Provider: string(v1alpha1.BuiltinTool_KubectlGetPodLogs),
					},
					{
						Provider: "kagent.tools.docs.QueryTool",
						Config: map[string]v1alpha1.AnyType{
							"docs_download_url": {
								RawMessage: makeRawMsg("https://doc-sqlite-db.s3.sa-east-1.amazonaws.com"),
							},
						},
					},
				},
			},
		}

		kubeExpert := &v1alpha1.AutogenAgent{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "kube-expert",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "AutogenAgent",
				APIVersion: "agent.ai.solo.io/v1alpha1",
			},
			Spec: v1alpha1.AutogenAgentSpec{
				Name:          "kubernetes_expert_agent",
				Description:   "The Kubernetes Expert AI Agent specializing in cluster operations, troubleshooting, and maintenance.",
				SystemMessage: readFileAsString("systemprompts/kube-expert-system-prompt.txt"),
			},
		}

		apiTeam := &v1alpha1.AutogenTeam{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "kube-team",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "AutogenTeam",
				APIVersion: "agent.ai.solo.io/v1alpha1",
			},
			Spec: v1alpha1.AutogenTeamSpec{
				Participants: []string{
					planningAgent.Name,
					kubectlUser.Name,
					kubeExpert.Name,
				},
				Description: "A team that debugs kubernetes issues.",
				//SelectorTeamConfig: &v1alpha1.SelectorTeamConfig{
				//	ModelConfig:    modelConfig.Name,
				//	SelectorPrompt: "Please select a team member to help you with your Kubernetes issue.",
				//},
				ModelConfig: modelConfig.Name,
				MagenticOneTeamConfig: &v1alpha1.MagenticOneTeamConfig{
					MaxStalls: 3,
					FinalAnswerPrompt: `We are working on the following task:
{task}

We have completed the task.

The above messages contain the conversation that took place to complete the task.

Based on the information gathered, provide the final answer to the original request.
The answer should be phrased as if you were speaking to the user.`,
				},
				TerminationCondition: v1alpha1.TerminationCondition{
					MaxMessageTermination:  &v1alpha1.MaxMessageTermination{MaxMessages: 10},
					TextMentionTermination: &v1alpha1.TextMentionTermination{Text: "TERMINATE"},
				},
				MaxTurns: 10,
			},
		}

		writeKubeObjects(
			"manifests/kubeobjects.yaml",
			apikeySecret,
			modelConfig,
			planningAgent,
			kubeExpert,
			kubectlUser,
			apiTeam,
		)

		Expect(true).To(BeTrue())
	})
})

func makeRawMsg(v interface{}) json.RawMessage {
	data, err := json.Marshal(v)
	Expect(err).NotTo(HaveOccurred())
	return data
}

func writeKubeObjects(file string, objects ...metav1.Object) {
	var bytes []byte
	for _, obj := range objects {
		data, err := yaml.Marshal(obj)
		Expect(err).NotTo(HaveOccurred())
		bytes = append(bytes, data...)
		bytes = append(bytes, []byte("---\n")...)
	}

	err := os.WriteFile(file, bytes, 0644)
	Expect(err).NotTo(HaveOccurred())
}

func readFileAsString(path string) string {
	bytes, err := os.ReadFile(path)
	Expect(err).NotTo(HaveOccurred())
	return string(bytes)
}
