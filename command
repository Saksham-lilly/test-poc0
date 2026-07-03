Perfect — everything's in place. Path A: we use the Makefile target docker-build. Let me flag two things before the commands, then walk through the build.
Two things to know
1. Your Go install is 32-bit (windows/386). That's unusual and might cause problems building a Linux operator image from Windows. However — the Dockerfile likely does a multi-stage build with Go inside the container, so your host's Go install doesn't matter. We'll find out in a moment. If the build fails on Go issues, we'll know.
2. The current image is tfy.jfrog.io/tfy-images/elasti-operator:0.1.25. We're going to build our own image with a distinctive tag (like elasti-operator:local-fix) so we can clearly tell whether the operator is running our modified code or the official one.
Step 1: Build the operator image
The Makefile target requires IMG and CONTAINER_TOOL variables. From your KubeElasti repo root (C:\Users\saksh\Downloads\KubeElasti), enter the operator directory and run:
powershellcd C:\Users\saksh\Downloads\KubeElasti\operator
make docker-build IMG=elasti-operator:local-fix CONTAINER_TOOL=docker
What this does:

make docker-build runs the docker-build target from operator/Makefile
IMG=elasti-operator:local-fix sets the image name and tag — a locally-unique tag so we can confirm our version is running
CONTAINER_TOOL=docker picks Docker as the container tool (in case the default is podman)
Under the hood, it runs docker build -t elasti-operator:local-fix -f ./Dockerfile ../ — building from the repo root as context so it can access the shared pkg/ and other directories

Expected outcome: Docker pulls a Go builder image, downloads dependencies, compiles the operator, produces a slim runtime image. Takes 2-8 minutes depending on network and cache state.
If it fails, paste the last ~30 lines of output. Common failure modes:

Make isn't installed on Windows → we'll fall back to the direct docker build command
Docker context path issues → we'll fix
Go build errors inside the container → those would indicate a bug in our code change

If make isn't available on your Windows PowerShell (very possible — Windows doesn't ship with make), use this instead:
powershellcd C:\Users\saksh\Downloads\KubeElasti\operator
docker build -t elasti-operator:local-fix -f .\Dockerfile ..\
That's the same command the Makefile would run.
Step 2: Verify the image was built
powershelldocker images elasti-operator:local-fix
Should show one line with the image, size, and creation time (should say "seconds ago" or "minutes ago").
Step 3: Load the image into kind
Kind runs Kubernetes nodes in Docker containers. Images from your host's Docker daemon aren't automatically available inside the kind node — you have to explicitly load them.
powershellkind load docker-image elasti-operator:local-fix --name elasti-test
Should print something like Image: "elasti-operator:local-fix" with ID "sha256:..." not yet present on node "elasti-test-control-plane", loading.... Takes 10-30 seconds.
Verify it landed:
powershelldocker exec elasti-test-control-plane crictl images | Select-String "elasti-operator"
Should show both the original tfy.jfrog.io/... image and your elasti-operator:local-fix image inside the kind node.
Step 4: Swap the operator to use your image
powershellkubectl set image deployment/elasti-operator-controller-manager -n elasti manager=elasti-operator:local-fix
Important: the container name inside the pod is manager (that's controller-runtime scaffold convention). If that command fails with "container manager not found", let's inspect:
powershellkubectl get deployment elasti-operator-controller-manager -n elasti -o jsonpath='{.spec.template.spec.containers[*].name}'
That prints the actual container names. If it's something else, substitute that name in the kubectl set image command.
Step 5: Force a rollout and wait for the new pod
powershellkubectl rollout restart deployment/elasti-operator-controller-manager -n elasti
kubectl rollout status deployment/elasti-operator-controller-manager -n elasti --timeout=90s
Then verify the pod is running your image:
powershellkubectl get pods -n elasti -l control-plane=controller-manager -o jsonpath='{.items[0].spec.containers[0].image}'
echo
Should print elasti-operator:local-fix.
Step 6: Also add imagePullPolicy: IfNotPresent
The operator Deployment probably has imagePullPolicy: Always for the operator container (that's the default for :latest-ish tags). Since your local image isn't in any registry, Always would fail on next pod restart with ErrImagePull. Force IfNotPresent:
powershellkubectl patch deployment elasti-operator-controller-manager -n elasti -p '{"spec":{"template":{"spec":{"containers":[{"name":"manager","imagePullPolicy":"IfNotPresent"}]}}}}'
If that PowerShell escaping gives you grief (single quotes on Windows are finicky), use this variant:
powershell$patch = '{"spec":{"template":{"spec":{"containers":[{"name":"manager","imagePullPolicy":"IfNotPresent"}]}}}}'
kubectl patch deployment elasti-operator-controller-manager -n elasti -p $patch
Paste back after each step
Run through Steps 1-6, pasting the output as you go. If any step fails, stop there and paste the error — we'll fix it before continuing. Don't power through failures.
Once all six steps are green — new operator pod running with tag elasti-operator:local-fix — we'll set up the state for the deletion test (whoami in proxy mode, curlbox ready) and then run the actual reproduction. That's where we prove the fix works.
