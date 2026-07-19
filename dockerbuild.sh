IMAGE="varshithknaik/distributed-order-app"
ENV_FILE="./.env.docker"

BUILD_ARGS=$(grep -vE '^(#/$)' $ENV_FILE | sed 's/^/--build-arg /');

VERSION=${1:-latest}

DOCKERFILE="infrastructure/docker/Dockerfile"
CONTEXT="."

echo "🚀 Building $IMAGE:$VERSION ..."

docker build \
  --platform=linux/amd64 \
  -f $DOCKERFILE \
  -t $IMAGE:$VERSION \
  $CONTEXT || exit 1

echo "📤 Pushing $IMAGE:$VERSION ..."

docker push $IMAGE:$VERSION || exit 1

echo "✅ Done: $IMAGE:$VERSION"