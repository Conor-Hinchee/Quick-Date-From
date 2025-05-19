#!/bin/zsh

# Exit on error
set -e

# Define File Paths
PACKAGE_JSON="package.json"
MANIFEST_JSON="manifest.json"
VERSIONS_JSON="versions.json"

echo "Starting the release process..."

# 1. Read Current Version from package.json
echo "Reading current version from $PACKAGE_JSON..."
current_version=$(jq -r .version "$PACKAGE_JSON")
if [[ -z "$current_version" ]] || [[ "$current_version" == "null" ]]; then
  echo "Error: Could not read version from $PACKAGE_JSON. Make sure jq is installed and the file is correct."
  exit 1
fi
echo "Current version: $current_version"

# 2. Calculate New Version (Patch Bump)
echo "Calculating new version..."
new_version=$(echo "$current_version" | awk -F. -v OFS=. '{$NF++;print}')
if [[ -z "$new_version" ]]; then
  echo "Error: Could not calculate new version using awk."
  exit 1
fi
echo "New version will be: $new_version"

# 3. Update package.json
echo "Updating $PACKAGE_JSON to version $new_version..."
jq --arg new_version "$new_version" '.version = $new_version' "$PACKAGE_JSON" > tmp_package.json && mv tmp_package.json "$PACKAGE_JSON"

# 4. Update manifest.json
echo "Updating $MANIFEST_JSON to version $new_version..."
jq --arg new_version "$new_version" '.version = $new_version' "$MANIFEST_JSON" > tmp_manifest.json && mv tmp_manifest.json "$MANIFEST_JSON"

# 5. Update versions.json
# Read minAppVersion from manifest.json
min_app_version=$(jq -r .minAppVersion "$MANIFEST_JSON")
if [[ -z "$min_app_version" ]] || [[ "$min_app_version" == "null" ]]; then
  echo "Error: Could not read minAppVersion from $MANIFEST_JSON."
  exit 1
fi
echo "Using minAppVersion from $MANIFEST_JSON: $min_app_version"

echo "Updating $VERSIONS_JSON with new version $new_version and minAppVersion $min_app_version..."
jq --arg new_version "$new_version" --arg min_app_version "$min_app_version" '. + {($new_version): $min_app_version}' "$VERSIONS_JSON" > tmp_versions.json && mv tmp_versions.json "$VERSIONS_JSON"

echo "JSON files updated successfully."

# 6. Git commands
echo "Staging changes..."
git add "$PACKAGE_JSON" "$MANIFEST_JSON" "$VERSIONS_JSON"

echo "Committing changes..."
commit_message="Bump version to $new_version"
git commit -m "$commit_message"

echo "Creating tag $new_version..."
git tag -a "$new_version" -m "$new_version"

echo "Pushing commit to origin..."
git push

echo "Pushing tag $new_version to origin..."
git push origin "$new_version"

# 7. Print out how awesome I am
echo ""
echo "--------------------------------------------------"
echo "All done! You are absolutely awesome!"
echo "Version $new_version has been released."
echo "--------------------------------------------------"

exit 0
