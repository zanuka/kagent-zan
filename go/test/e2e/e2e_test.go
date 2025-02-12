package e2e_test

import (
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

		participant1 := &v1alpha1.AutogenAgent{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "kube-expert",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "AutogenAgent",
				APIVersion: "agent.ai.solo.io/v1alpha1",
			},
			Spec: v1alpha1.AutogenAgentSpec{
				Name:          "kubernetesExpert",
				Description:   "The Kubernetes Expert is responsible for solving Kubernetes related problems",
				SystemMessage: readFileAsString("systemprompts/kube-expert-system-prompt.txt"),
				Tools:         nil,
			},
		}

		participant2 := &v1alpha1.AutogenAgent{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "prometheus-expert",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "AutogenAgent",
				APIVersion: "agent.ai.solo.io/v1alpha1",
			},
			Spec: v1alpha1.AutogenAgentSpec{
				Name:          "prometheusExpert",
				Description:   "The Prometheus Expert is responsible for solving Prometheus related problems",
				SystemMessage: readFileAsString("systemprompts/prometheus-expert-system-prompt.txt"),
				Tools:         nil,
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
					participant1.Name,
					participant2.Name,
				},
				Description: "a team that debugs kubernetes and prometheus issues",
				SelectorTeamConfig: v1alpha1.SelectorTeamConfig{
					ModelConfig: modelConfig.Name,
				},
				TerminationCondition: v1alpha1.TerminationCondition{
					MaxMessageTermination: &v1alpha1.MaxMessageTermination{MaxMessages: 10},
				},
				MaxTurns: 10,
			},
		}

		writeKubeObjects(apikeySecret, modelConfig, participant1, participant2, apiTeam)

		Expect(true).To(BeTrue())
	})
})

func writeKubeObjects(objects ...metav1.Object) {
	var bytes []byte
	for _, obj := range objects {
		data, err := yaml.Marshal(obj)
		Expect(err).NotTo(HaveOccurred())
		bytes = append(bytes, data...)
		bytes = append(bytes, []byte("---\n")...)
	}

	err := os.WriteFile("manifests/kubeobjects.yaml", bytes, 0644)
	Expect(err).NotTo(HaveOccurred())
}

func readFileAsString(path string) string {
	bytes, err := os.ReadFile(path)
	Expect(err).NotTo(HaveOccurred())
	return string(bytes)
}
