package e2e_test

import (
	"context"
	"time"

	"github.com/kagent-dev/kagent/go/controller/api/v1alpha1"
	"github.com/kagent-dev/kagent/go/tools"
	"github.com/kagent-dev/kagent/go/tools/interfaces"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var _ = Describe("MCP Tool Integration", func() {
	It("configures and tests MCP tool with hosted service", func() {
		namespace := "mcp-test-ns"

		apiKeySecret := &v1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "openai-api-key-secret",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "Secret",
				APIVersion: "v1",
			},
			Data: map[string][]byte{
				"apikey": []byte("fake"),
			},
		}

		modelConfig := &v1alpha1.ModelConfig{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "gpt-model-config",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "ModelConfig",
				APIVersion: "kagent.dev/v1alpha1",
			},
			Spec: v1alpha1.ModelConfigSpec{
				Model:            "gpt-4o",
				Provider:         v1alpha1.OpenAI,
				APIKeySecretName: apiKeySecret.Name,
				APIKeySecretKey:  "apikey",
				OpenAI: &v1alpha1.OpenAIConfig{
					Temperature: "0.7",
					MaxTokens:   2048,
					TopP:        "0.95",
				},
			},
		}

		mcpAgent := &v1alpha1.Agent{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "mcp-test-agent",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "Agent",
				APIVersion: "kagent.dev/v1alpha1",
			},
			Spec: v1alpha1.AgentSpec{
				Description:    "Test agent for MCP tool integration",
				SystemMessage:  "You are a test agent for MCP tool integration",
				ModelConfigRef: modelConfig.Name,
				Tools: []*v1alpha1.Tool{
					{
						Inline: &v1alpha1.InlineTool{
							Provider: "kagent.tools.test.TestTool",
							Config: map[string]v1alpha1.AnyType{
								"test_param": {
									RawMessage: makeRawMsg("test_value"),
								},
							},
						},
					},
				},
			},
		}

		hostedMcpServer := &v1alpha1.ToolServer{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "hosted-mcp-server",
				Namespace: namespace,
			},
			TypeMeta: metav1.TypeMeta{
				Kind:       "ToolServer",
				APIVersion: "kagent.dev/v1alpha1",
			},
			Spec: v1alpha1.ToolServerSpec{
				Description: "Hosted MCP server for testing",
				Config: v1alpha1.ToolServerConfig{
					Sse: &v1alpha1.SseMcpServerConfig{
						URL: "https://www.mcp.run/api/mcp/sse",
					},
				},
			},
		}

		writeKubeObjects(
			"manifests/mcp-test/api-key-secret.yaml",
			apiKeySecret,
		)

		writeKubeObjects(
			"manifests/mcp-test/model-config.yaml",
			modelConfig,
		)

		writeKubeObjects(
			"manifests/mcp-test/agent.yaml",
			mcpAgent,
			hostedMcpServer,
		)

		By("Waiting for MCP tool to be ready")
		time.Sleep(5 * time.Second)

		By("Verifying MCP tool integration")
		// Verify the agent was created successfully
		agent, err := k8sClient.GetAgent(namespace, mcpAgent.Name)
		Expect(err).NotTo(HaveOccurred())
		Expect(agent).NotTo(BeNil())

		// Verify the tool server was created successfully
		toolServer, err := k8sClient.GetToolServer(namespace, hostedMcpServer.Name)
		Expect(err).NotTo(HaveOccurred())
		Expect(toolServer).NotTo(BeNil())

		// Verify the tool is registered and can be executed
		tool, err := tools.GetTool("kagent.tools.test.TestTool", makeRawMsg(map[string]string{
			"test_param": "test_value",
		}))
		Expect(err).NotTo(HaveOccurred())
		Expect(tool).NotTo(BeNil())

		// Execute the tool and verify the output
		output, err := tool.Execute(context.Background(), interfaces.ToolInput{
			Content: "test input",
		})
		Expect(err).NotTo(HaveOccurred())
		Expect(output.Content).To(ContainSubstring("test_value"))
	})
}) 
