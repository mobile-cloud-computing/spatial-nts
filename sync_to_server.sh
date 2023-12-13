#!/bin/bash

# Define the source and destination paths
SOURCE="./"
DESTINATION="ubuntu@193.40.154.245:~/dev"


# Perform the rsync operation with exclusions
rsync -avz --exclude 'node_modules/' --exclude '.idea/' -e ssh "$SOURCE" "$DESTINATION"
