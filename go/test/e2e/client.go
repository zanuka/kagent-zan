package e2e_test

import (
	"github.com/kagent-dev/kagent/go/controller/api/v1alpha1"
)

type TestClient struct{}

func (c *TestClient) GetAgent(namespace, name string) (*v1alpha1.Agent, error) {
	return &v1alpha1.Agent{}, nil
}

func (c *TestClient) GetToolServer(namespace, name string) (*v1alpha1.ToolServer, error) {
	return &v1alpha1.ToolServer{}, nil
}

var k8sClient = &TestClient{} 
