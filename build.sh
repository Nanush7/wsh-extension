#!/bin/bash

string_in_array() {
  local string="$1";
  shift;
  local array=("$@");
  for element in "${array[@]}"; do
    if [ "$element" == "$string" ]; then
      return 0;
    fi
  done
  return 1;
}

copy_files() {
  rm -rf build;
  mkdir -p build;
  for file in "${FILES[@]}"; do
    cp -r "$file" "$BUILD_DIR";
  done

  find "$BUILD_DIR" -type f | while read -r file; do
    if string_in_array "$file" "${VERSION_DISPLAY_FILES[@]}"; then
      sed --sandbox -i -e "s/#\{\{version\}\}/$WSH_VERSION/";
    fi
    if string_in_array "$file" "${BROWSER_DEPENDANT_FILES[@]}"; then
      sed --sandbox -i -e '0,/^const BROWSER = "firefox|chrome";/s//const BROWSER = "'"$1"'";/';
    fi
  done
}

# Used for manifest keys.
readonly WSH_NAME="WCA Staff Helper";
readonly WSH_DESCRIPTION="Helper extension to link and reference WCA Regulations and Guidelines, WCA IDs and other documents.";
readonly WSH_VERSION=$(cat VERSION);
readonly FIREFOX_MIN_VERSION="109.0";
readonly CHROME_MIN_VERSION="102";
readonly BACKGROUND_FILE="scripts/background.js";

# JS files that contain a "const BROWSER = '...';" line.
readonly BROWSER_DEPENDANT_FILES=("scripts/wsh-event-injection.js" "scripts/background.js");

# Files that contain a "#{{version}}" line.
readonly VERSION_DISPLAY_FILES=("popup.js");

# Files to be copied to the build directory.
readonly FILES=("css" "data" "html" "img" "scripts" "LICENSE" "README.md");
readonly BUILD_DIR="build";

if [[ -z "$1" || -z "$2" ]]; then
  echo "Missing arguments";
  echo "Usage: build.sh <build|develop> <firefox|chrome>";
  exit 1;
fi

if [[ "$2" == "firefox" ]]; then
  min_version='"browser_specific_settings": {"gecko": {"strict_min_version": "'$FIREFOX_MIN_VERSION'"}}';
  service_worker='"scripts": ["'$BACKGROUND_FILE'"]';
elif [[ "$2" == "chrome" ]]; then
  min_version='"minimum_chrome_version": "'$CHROME_MIN_VERSION'"';
  service_worker='"service_worker": "'$BACKGROUND_FILE'"';
else
  echo "Invalid browser argument: $2";
  exit 1;
fi

if [[ "$1" == "build" ]]; then
  copy_files "$2";
  manifest_output_path="$BUILD_DIR/manifest.json";
elif [[ "$1" == "develop" ]]; then
  manifest_output_path="manifest.json";
  # If the file is browser dependant, replace the BROWSER constant.
  for file in "${BROWSER_DEPENDANT_FILES[@]}"; do
    sed --sandbox -i -e '0,/^const BROWSER = "firefox|chrome";/s//const BROWSER = "'"$2"'";/';
  done
else
  echo "Invalid operation argument: $1";
  exit 1;
fi

# Replace #{{...}} with the actual values in the manifest file.
if ! sed --sandbox -e "s/#\{\{name\}\}/$WSH_NAME/" \
  -e "s/#\{\{description\}\}/$WSH_DESCRIPTION/" \
  -e "s/#\{\{version\}\}/$WSH_VERSION/" \
  -e "s/#\{\{min_version\}\}/$min_version/" \
  -e "s/#\{\{service_worker\}\}/$service_worker/" \
  metadata/manifest.template.json > "$manifest_output_path";
then
    echo "Failed to generate manifest file";
    exit 1;
fi

echo "Build completed successfully!";
exit 0;
