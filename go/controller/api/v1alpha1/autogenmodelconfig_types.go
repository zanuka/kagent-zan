/*
Copyright 2025.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	ModelConfigConditionTypeAccepted = "Accepted"
)

// ModelProvider represents the model provider type
// +kubebuilder:validation:Enum=Anthropic;OpenAI;AzureOpenAI;Ollama
type ModelProvider string

const (
	Anthropic   ModelProvider = "Anthropic"
	AzureOpenAI ModelProvider = "AzureOpenAI"
	OpenAI      ModelProvider = "OpenAI"
	Ollama      ModelProvider = "Ollama"
)

// AnthropicConfig contains Anthropic-specific configuration options
type AnthropicConfig struct {
	// Base URL for the Anthropic API (overrides default)
	// +optional
	BaseURL string `json:"baseUrl,omitempty"`

	// Maximum tokens to generate
	// +optional
	MaxTokens int `json:"maxTokens,omitempty"`

	// Temperature for sampling
	// +optional
	Temperature string `json:"temperature,omitempty"`

	// Top-p sampling parameter
	// +optional
	TopP string `json:"topP,omitempty"`

	// Top-k sampling parameter
	// +optional
	TopK int `json:"topK,omitempty"`
}

// OpenAIConfig contains OpenAI-specific configuration options
type OpenAIConfig struct {
	// Base URL for the OpenAI API (overrides default)
	// +optional
	BaseURL string `json:"baseUrl,omitempty"`

	// Organization ID for the OpenAI API
	// +optional
	Organization string `json:"organization,omitempty"`

	// Temperature for sampling
	// +optional
	Temperature string `json:"temperature,omitempty"`

	// Maximum tokens to generate
	// +optional
	MaxTokens int `json:"maxTokens,omitempty"`

	// Top-p sampling parameter
	// +optional
	TopP string `json:"topP,omitempty"`

	// Frequency penalty
	// +optional
	FrequencyPenalty string `json:"frequencyPenalty,omitempty"`

	// Presence penalty
	// +optional
	PresencePenalty string `json:"presencePenalty,omitempty"`

	// Seed value
	// +optional
	Seed *int `json:"seed,omitempty"`

	// N value
	N *int `json:"n,omitempty"`

	// Timeout
	Timeout *int `json:"timeout,omitempty"`
}

// AzureOpenAIConfig contains Azure OpenAI-specific configuration options
type AzureOpenAIConfig struct {
	// Endpoint for the Azure OpenAI API
	// +required
	Endpoint string `json:"azureEndpoint,omitempty"`

	// API version for the Azure OpenAI API
	// +required
	APIVersion string `json:"apiVersion,omitempty"`

	// Deployment name for the Azure OpenAI API
	// +optional
	DeploymentName string `json:"azureDeployment,omitempty"`

	// Azure AD token for authentication
	// +optional
	AzureADToken string `json:"azureAdToken,omitempty"`

	// Azure AD token provider
	// +optional
	// TODO (peterj): We need to figure out how to implement this
	// AzureADTokenProvider interface{} `json:"azureAdTokenProvider,omitempty"`

	// Temperature for sampling
	// +optional
	Temperature string `json:"temperature,omitempty"`

	// Maximum tokens to generate
	// +optional
	MaxTokens *int `json:"maxTokens,omitempty"`

	// Top-p sampling parameter
	// +optional
	TopP string `json:"topP,omitempty"`
}

// OllamaConfig contains Ollama-specific configuration options
type OllamaConfig struct {
	// Host for the Ollama API
	// +optional
	Host string `json:"host,omitempty"`

	// Options for the Ollama API
	// +optional
	Options map[string]string `json:"options,omitempty"`
}

// ModelConfigSpec defines the desired state of ModelConfig.
//
// +kubebuilder:validation:XValidation:message="provider.openAI must be nil if the provider is not OpenAI",rule="!(has(self.openAI) && self.provider != 'OpenAI')"
// +kubebuilder:validation:XValidation:message="provider.anthropic must be nil if the provider is not Anthropic",rule="!(has(self.anthropic) && self.provider != 'Anthropic')"
// +kubebuilder:validation:XValidation:message="provider.anthropic must be specified for Anthropic provider",rule="!(!has(self.anthropic) && self.provider == 'Anthropic')"
// +kubebuilder:validation:XValidation:message="provider.azureOpenAI must be nil if the provider is not AzureOpenAI",rule="!(has(self.azureOpenAI) && self.provider != 'AzureOpenAI')"
// +kubebuilder:validation:XValidation:message="provider.azureOpenAI must be specified for AzureOpenAI provider",rule="!(!has(self.azureOpenAI) && self.provider == 'AzureOpenAI')"
// +kubebuilder:validation:XValidation:message="provider.ollama must be nil if the provider is not Ollama",rule="!(has(self.ollama) && self.provider != 'Ollama')"
// +kubebuilder:validation:XValidation:message="provider.ollama must be specified for Ollama provider",rule="!(!has(self.ollama) && self.provider == 'Ollama')"
type ModelConfigSpec struct {
	Model string `json:"model"`

	// The provider of the model
	// +kubebuilder:default=OpenAI
	// +kubebuilder:validation:Enum=Anthropic;OpenAI;AzureOpenAI;Ollama
	Provider ModelProvider `json:"provider"`

	// The name of the secret that contains the API key
	// +optional
	APIKeySecretName string `json:"apiKeySecretName"`

	// The key in the secret that contains the API key
	// +optional
	APIKeySecretKey string `json:"apiKeySecretKey"`

	// OpenAI-specific configuration
	// +optional
	OpenAI *OpenAIConfig `json:"openAI,omitempty"`

	// Anthropic-specific configuration
	// +optional
	Anthropic *AnthropicConfig `json:"anthropic,omitempty"`

	// Azure OpenAI-specific configuration
	// +optional
	AzureOpenAI *AzureOpenAIConfig `json:"azureOpenAI,omitempty"`

	// Ollama-specific configuration
	// +optional
	Ollama *OllamaConfig `json:"ollama,omitempty"`
}

// ModelConfigStatus defines the observed state of ModelConfig.
type ModelConfigStatus struct {
	Conditions         []metav1.Condition `json:"conditions"`
	ObservedGeneration int64              `json:"observedGeneration"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Provider",type="string",JSONPath=".spec.provider"
// +kubebuilder:printcolumn:name="Model",type="string",JSONPath=".spec.model"

// ModelConfig is the Schema for the modelconfigs API.
type ModelConfig struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ModelConfigSpec   `json:"spec,omitempty"`
	Status ModelConfigStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// ModelConfigList contains a list of ModelConfig.
type ModelConfigList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ModelConfig `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ModelConfig{}, &ModelConfigList{})
}
