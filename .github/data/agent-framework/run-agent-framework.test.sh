#!/bin/bash
set -euo pipefail

# Define a function to log messages with timestamp
log() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S')] $1"
}

CLUSTER1=cluster1
test_dir=$(pwd)
# Loop through each challenge defined in the .github/data/agent-framework directory
for scenario_dir in *; do
  if [ ! -d "$scenario_dir" ]; then
    continue
  fi
  pushd $scenario_dir
  pnpm i || npm i
  echo "pwd=$(pwd)"
  for challenge_file in *.yaml; do
    # Extract the challenge name and description from the YAML metadata file
    NAME=$(yq eval '.metadata.name' "$challenge_file")
    DESCRIPTION=$(yq eval '.spec.description' "$challenge_file")
    USER_PROMPT=$(yq eval '.spec.prompt' "$challenge_file")

    # Run the challenge scenario using a Bash script generated from markdown in the README file
    log "*********************************************************************"
    log "Running challenge: $NAME - $DESCRIPTION"
    log "*********************************************************************"
    log "User Prompt: $USER_PROMPT"
    kind delete clusters --all || true
    kubectl config delete-context mgmt || true
    kubectl config delete-context cluster1 || true
    cat README.md |./scripts/md-to-bash.sh | bash
    echo "Waiting for pods to be stable..."
    while kubectl --context ${CLUSTER1} get pods -A | grep ContainerCreating; do sleep 5; done
    while kubectl --context ${CLUSTER1} get pods -A | grep Terminating; do sleep 5; done

    # Test baseline
    timeout --signal=INT 3m mocha ./test.js --timeout 10000 --retries 5

    # Break the environment by executing commands defined in each step of the challenge
    log "Breaking the environment..."
    STEPS_COUNT=$(yq '.spec.steps | length' "$challenge_file")
    for ((i=0; i<$STEPS_COUNT; i++)); do
        yq ".spec.steps[$i].run" "$challenge_file" | while IFS= read -r cmd; do
        echo "$cmd" >> "$challenge_file".$i.sh
        done
        sh "$challenge_file".$i.sh
    done
    rm -f "$challenge_file".*.sh
    echo "Waiting for pods to be stable..."
    # while kubectl --context ${CLUSTER1} get pods -A | grep ContainerCreating; do sleep 5; done
    while kubectl --context ${CLUSTER1} get pods -A | grep Terminating; do sleep 5; done
    kubectl --context ${CLUSTER1} get pods -A

    log "Testing cluster after breaking..."
    timeout --signal=INT 1m mocha ./test.js --timeout 10000 || true

    # Try to fix the broken environment using the Agent Framework (apps/agent-framework) and OpenAI API
    pushd $test_dir/..
    ############# BEGIN CHANGE THIS FOR YOUR OWN RESOLUTION TOOL
    log "Trying to fix the broken environment using the Agent Framework..."
    #pnpm start:cli -p "${USER_PROMPT}" -u -f kubernetesExpert > $test_dir/$NAME.thought.log
    echo "Thought process of AI agent: [...]" > $test_dir/$NAME.thought.log
    ############# END CHANGE THIS FOR YOUR OWN RESOLUTION TOOL
    popd

    log "Testing cluster after fixing..."
    kubectl --context ${CLUSTER1} get pods -A
    if mocha ./test.js --timeout 10000; then
      log "---------------> challenge SUCCESSFUL <------------------"
      rm -f $test_dir/$NAME.failure
      mv $test_dir/$NAME.thought.log $test_dir/$NAME.success || touch $test_dir/$NAME.success
    else
      log "---------------> challenge FAILED <----------------------"
      rm -f $test_dir/$NAME.success
      mv $test_dir/$NAME.thought.log $test_dir/$NAME.failure || touch $test_dir/$NAME.failure
    fi
  done
  popd
done