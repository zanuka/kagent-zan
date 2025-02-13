package autogen

import (
	"context"
	"fmt"
	"github.com/kagent-dev/kagent/go/autogen/api"
	"github.com/kagent-dev/kagent/go/controller/api/v1alpha1"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type AutogenReconciler interface {
	ReconcileAutogenAgent(ctx context.Context, req ctrl.Request) error
	ReconcileAutogenModelConfig(ctx context.Context, req ctrl.Request) error
	ReconcileAutogenTeam(ctx context.Context, req ctrl.Request) error
	ReconcileAutogenApiKeySecret(ctx context.Context, req ctrl.Request) error
}

type autogenReconciler struct {
	translator AutogenApiTranslator

	kube          client.Client
	autogenClient *api.Client
}

func NewAutogenReconciler(
	translator AutogenApiTranslator,
	kube client.Client,
	autogenClient *api.Client,
) AutogenReconciler {
	return &autogenReconciler{
		translator:    translator,
		kube:          kube,
		autogenClient: autogenClient,
	}
}

func (a *autogenReconciler) ReconcileAutogenAgent(ctx context.Context, req ctrl.Request) error {
	// find and reconcile all teams which use this agent
	teams, err := a.findTeamsUsingAgent(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to find teams for agent %s: %v", req.Name, err)
	}

	return a.reconcileTeams(ctx, teams...)
}

func (a *autogenReconciler) ReconcileAutogenModelConfig(ctx context.Context, req ctrl.Request) error {
	teams, err := a.findTeamsUsingModel(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to find teams for model %s: %v", req.Name, err)
	}

	return a.reconcileTeams(ctx, teams...)
}

func (a *autogenReconciler) ReconcileAutogenTeam(ctx context.Context, req ctrl.Request) error {
	team := &v1alpha1.AutogenTeam{}
	if err := a.kube.Get(ctx, req.NamespacedName, team); err != nil {
		return fmt.Errorf("failed to get team %s: %v", req.Name, err)
	}

	return a.reconcileTeams(ctx, team)
}

func (a *autogenReconciler) ReconcileAutogenApiKeySecret(ctx context.Context, req ctrl.Request) error {
	teams, err := a.findTeamsUsingApiKeySecret(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to find teams for api key secret %s: %v", req.Name, err)
	}

	return a.reconcileTeams(ctx, teams...)
}

func (a *autogenReconciler) findTeamsUsingAgent(ctx context.Context, req ctrl.Request) ([]*v1alpha1.AutogenTeam, error) {
	var teamsList v1alpha1.AutogenTeamList
	if err := a.kube.List(
		ctx,
		&teamsList,
		client.InNamespace(req.Namespace),
	); err != nil {
		return nil, fmt.Errorf("failed to list teams: %v", err)
	}

	var teams []*v1alpha1.AutogenTeam
	appendTeamIfUsesAgent := func(team *v1alpha1.AutogenTeam) {
		for _, participant := range team.Spec.Participants {
			if participant == req.Name {
				teams = append(teams, team)
				break
			}
		}
	}
	for _, team := range teamsList.Items {
		team := team
		appendTeamIfUsesAgent(&team)
	}

	return teams, nil
}

func (a *autogenReconciler) reconcileTeams(ctx context.Context, teams ...*v1alpha1.AutogenTeam) error {
	errs := map[types.NamespacedName]error{}
	for _, team := range teams {
		autogenTeam, err := a.translator.TranslateSelectorGroupChat(ctx, team)
		if err != nil {
			errs[types.NamespacedName{Name: team.Name, Namespace: team.Namespace}] = fmt.Errorf("failed to translate team %s: %v", team.Name, err)
			continue
		}
		if err := a.upsertTeam(autogenTeam); err != nil {
			errs[types.NamespacedName{Name: team.Name, Namespace: team.Namespace}] = fmt.Errorf("failed to upsert team %s: %v", team.Name, err)
			continue
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("failed to reconcile teams: %v", errs)
	}

	return nil
}

func (a *autogenReconciler) upsertTeam(team *api.Team) error {
	return a.autogenClient.CreateTeam(team)
}

func (a *autogenReconciler) findTeamsUsingModel(ctx context.Context, req ctrl.Request) ([]*v1alpha1.AutogenTeam, error) {
	var teamsList v1alpha1.AutogenTeamList
	if err := a.kube.List(
		ctx,
		&teamsList,
		client.InNamespace(req.Namespace),
	); err != nil {
		return nil, fmt.Errorf("failed to list teams: %v", err)
	}

	var teams []*v1alpha1.AutogenTeam
	appendTeamIfUsesModel := func(team *v1alpha1.AutogenTeam) {
		if team.Spec.SelectorTeamConfig.ModelConfig == req.Name {
			teams = append(teams, team)
		}
	}
	for _, team := range teamsList.Items {
		team := team
		appendTeamIfUsesModel(&team)
	}

	return teams, nil
}

func (a *autogenReconciler) findTeamsUsingApiKeySecret(ctx context.Context, req ctrl.Request) ([]*v1alpha1.AutogenTeam, error) {
	var modelsList v1alpha1.AutogenModelConfigList
	if err := a.kube.List(
		ctx,
		&modelsList,
		client.InNamespace(req.Namespace),
	); err != nil {
		return nil, fmt.Errorf("failed to list secrets: %v", err)
	}

	var models []string
	appendModelIfUsesApiKeySecret := func(model v1alpha1.AutogenModelConfig) {
		if model.Spec.APIKeySecretName == req.Name {
			models = append(models, model.Name)
		}
	}
	for _, model := range modelsList.Items {
		appendModelIfUsesApiKeySecret(model)
	}

	var teams []*v1alpha1.AutogenTeam
	appendUniqueTeam := func(team *v1alpha1.AutogenTeam) {
		for _, t := range teams {
			if t.Name == team.Name {
				return
			}
		}
		teams = append(teams, team)
	}

	for _, model := range models {
		teamsUsingModel, err := a.findTeamsUsingModel(ctx, ctrl.Request{
			NamespacedName: types.NamespacedName{
				Namespace: req.Namespace,
				Name:      model,
			},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to find teams for model %s: %v", model, err)
		}
		for _, team := range teamsUsingModel {
			appendUniqueTeam(team)
		}
	}

	return teams, nil

}
