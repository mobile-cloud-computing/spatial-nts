#!/bin/bash

COMPOSE_PROJECT_NAME="server"

# Function to stop and remove containers, networks, images, and volumes associated with the service
cleanup_docker() {
    echo "Stopping and removing any existing containers..."
    docker-compose -p "$COMPOSE_PROJECT_NAME" down --rmi all 2>/dev/null || true
}

# Function to build the Docker services using Docker Compose
build_docker_services() {
    echo "Building Docker services..."
    docker-compose -p "$COMPOSE_PROJECT_NAME" build
}

# Function to handle cleanup on script exit
cleanup_on_exit() {
    echo "Script execution completed. Performing cleanup..."
    cleanup_docker
}

set -e

cleanup_docker

# Check if the cleanup was successful
if [ $? -ne 0 ]; then
    echo "Docker cleanup failed."
else
    echo "Docker cleanup successful."
    # Build the Docker services
    build_docker_services

    # Check if the build was successful
    if [ $? -ne 0 ]; then
        echo "Docker Compose build failed. Cleaning up Docker images..."
        sudo docker image prune -f --filter label=server.version=1.0
    else
        echo "Docker Compose build successful."
    fi
fi
