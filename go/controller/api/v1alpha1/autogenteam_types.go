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

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// AutogenTeamSpec defines the desired state of AutogenTeam.
type AutogenTeamSpec struct {
	Participants []string `json:"participants"`
	Description  string   `json:"description"`
	// +kubebuilder:validation:Optional
	SelectorTeamConfig *SelectorTeamConfig `json:"selectorTeamConfig"`
	// +kubebuilder:validation:Optional
	MagenticOneTeamConfig *MagenticOneTeamConfig `json:"magenticOneTeamConfig"`
	// +kubebuilder:validation:Optional
	SwarmTeamConfig      *SwarmTeamConfig     `json:"swarmTeamConfig"`
	TerminationCondition TerminationCondition `json:"terminationCondition"`
	MaxTurns             int64                `json:"maxTurns"`
}

type SelectorTeamConfig struct {
	SelectorPrompt string `json:"selectorPrompt"`
	ModelConfig    string `json:"modelConfig"`
}

type MagenticOneTeamConfig struct {
	ModelConfig       string `json:"modelConfig"`
	MaxStalls         int    `json:"maxStalls"`
	FinalAnswerPrompt string `json:"finalAnswerPrompt"`
}

type SwarmTeamConfig struct {
	ModelConfig string `json:"modelConfig"`
}

type TerminationCondition struct {
	// ONEOF: maxMessageTermination, textMentionTermination, orTermination
	MaxMessageTermination  *MaxMessageTermination  `json:"maxMessageTermination,omitempty"`
	TextMentionTermination *TextMentionTermination `json:"textMentionTermination,omitempty"`
	OrTermination          *OrTermination          `json:"orTermination,omitempty"`
}

type MaxMessageTermination struct {
	MaxMessages int `json:"maxMessages"`
}

type TextMentionTermination struct {
	Text string `json:"text"`
}

type OrTermination struct {
	Conditions []OrTerminationCondition `json:"conditions"`
}

type OrTerminationCondition struct {
	MaxMessageTermination  *MaxMessageTermination  `json:"maxMessageTermination,omitempty"`
	TextMentionTermination *TextMentionTermination `json:"textMentionTermination,omitempty"`
}

// AutogenTeamStatus defines the observed state of AutogenTeam.
type AutogenTeamStatus struct{}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// AutogenTeam is the Schema for the autogenteams API.
type AutogenTeam struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AutogenTeamSpec   `json:"spec,omitempty"`
	Status AutogenTeamStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// AutogenTeamList contains a list of AutogenTeam.
type AutogenTeamList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AutogenTeam `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AutogenTeam{}, &AutogenTeamList{})
}
