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

	ModelConfigConditionStatusTrue  = "True"
	ModelConfigConditionStatusFalse = "False"
)

// ModelConfigSpec defines the desired state of ModelConfig.
type ModelConfigSpec struct {
	Model            string `json:"model"`
	APIKeySecretName string `json:"apiKeySecretName"`
	APIKeySecretKey  string `json:"apiKeySecretKey"`
}

// ModelConfigStatus defines the observed state of ModelConfig.
type ModelConfigStatus struct {
	Conditions         []ModelConfigCondition `json:"conditions"`
	ObservedGeneration int64                  `json:"observedGeneration"`
}

type ModelConfigCondition struct {
	Type               string      `json:"type"`
	Status             string      `json:"status"`
	LastTransitionTime metav1.Time `json:"lastTransitionTime"`
	Reason             string      `json:"reason"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

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
