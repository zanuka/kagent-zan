package autogen_test

import (
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

func TestAutogen(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Autogen Suite")
}
