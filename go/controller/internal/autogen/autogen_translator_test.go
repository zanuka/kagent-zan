package autogen_test

import (
	"context"
	"github.com/kagent-dev/kagent/go/autogen/api"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"os/exec"
	"time"
)

var _ = Describe("AutogenClient", func() {
	It("should interact with autogen server", func() {
		ctx := context.Background()

		go func() {
			// start autogen server
			startAutogenServer(ctx)
		}()

		// sleep for a while to allow autogen server to start
		<-time.After(3 * time.Second)

		client := api.NewClient("http://localhost:8080", "ws://localhost:8080")

		err := client.CreateTeam().UpsertTeam(ctx, &SelectorGroupChat{
			ID:               1234,
			UserID:           "guestuser@gmail.com",
			Provider:         "autogen_agentchat.teams.SelectorGroupChat",
			ComponentType:    "team",
			Version:          1,
			ComponentVersion: 1,
			Description:      "a test team, pls ignore",
			Config:           SelectorGroupChatConfig{},
		})
		Expect(err).NotTo(HaveOccurred())

		list, err := client.ListTeams(ctx, "guestuser@gmail.com")
		Expect(err).NotTo(HaveOccurred())
		Expect(list).NotTo(BeNil())
	})
})

func startAutogenServer(ctx context.Context) {
	defer GinkgoRecover()
	cmd := exec.CommandContext(ctx, "uv", "run", "autogenstudio", "ui")
	cmd.Dir = "../../../python"
	err := cmd.Run()
	if err != nil && err.Error() != "context canceled" {
		Expect(err).NotTo(HaveOccurred())
	}
}
