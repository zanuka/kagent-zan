# Image configuration
DOCKER_REGISTRY ?= gcr.io
DOCKER_REPO ?= solo-io-kagent
CONTROLLER_IMAGE_NAME ?= autogenstudio-controller
WEB_IMAGE_NAME ?= autogenstudio-web
VERSION ?= $(shell git describe --tags --always --dirty)
CONTROLLER_IMAGE_TAG ?= $(VERSION)
WEB_IMAGE_TAG ?= $(VERSION)
CONTROLLER_IMG ?= $(DOCKER_REGISTRY)/$(DOCKER_REPO)/$(CONTROLLER_IMAGE_NAME):$(CONTROLLER_IMAGE_TAG)
WEB_IMG ?= $(DOCKER_REGISTRY)/$(DOCKER_REPO)/$(WEB_IMAGE_NAME):$(WEB_IMAGE_TAG)

create-kind-cluster:
	kind create cluster --name autogen

build: build-controller build-web

controller-manifests:
	make -C go manifests
	cp go/config/crd/bases/* helm/crds/

build-controller: controller-manifests
	make -C go docker-build

build-web:
	make -C python build

.PHONY: build build-controller build-web controller-manifests

kind-load-docker-images: build
	kind load docker-image --name autogen $(CONTROLLER_IMG)
	kind load docker-image --name autogen $(WEB_IMG)

.PHONY: kind-load-docker-images

helm-install: kind-load-docker-images
	helm upgrade --install kagent helm/ --namespace kagent --create-namespace --set controller.image.tag=$(CONTROLLER_IMAGE_TAG) --set web.image.tag=$(WEB_IMAGE_TAG)

.PHONY: helm-install
