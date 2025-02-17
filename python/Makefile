# Image configuration
DOCKER_REGISTRY ?= gcr.io
DOCKER_REPO ?= solo-io-kagent
IMAGE_NAME ?= autogenstudio-web
VERSION ?= $(shell git describe --tags --always --dirty)
IMAGE_TAG ?= $(VERSION)
IMG ?= $(DOCKER_REGISTRY)/$(DOCKER_REPO)/$(IMAGE_NAME):$(IMAGE_TAG)

# Docker build arguments
BUILD_ARGS ?=

.PHONY: help build push run clean

help: ## Display this help message
	@echo "Docker Management Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker image
	docker build $(BUILD_ARGS) \
		-t $(IMG) \
		--progress=plain \
		.

push: ## Push the Docker image to the registry
	docker push $(IMG)

run: ## Run the Docker container
	docker run --rm -it \
		-v $(PWD):/app \
		$(IMG)

dev: ## Run the container in development mode with source mounted
	docker run --rm -it \
		-v $(PWD)/.env:/app/.env \
		--env-file .env \
		$(IMG) \
		/bin/bash

lint: ## Run linting inside the container
	docker run --rm \
		-v $(PWD):/app \
		$(IMG) \
		ruff check .

clean: ## Remove built images
	docker rmi $(IMG) || true

version: ## Display the current version
	@echo $(VERSION)