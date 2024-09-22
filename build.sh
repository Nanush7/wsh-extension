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
  local browser="$1";
  rm -rf build;
  mkdir -p build;
  npx tsc
  for file in "${FILES[@]}"; do
    cp -r "$file" "$BUILD_DIR";
  done
  # TODO: Improve this.
  cp "scripts/purify.min.js" "$BUILD_DIR/scripts/"

  find "$BUILD_DIR" -type f | while read -r file; do
    if string_in_array "$(basename "$file")" "${VERSION_DISPLAY_FILES[@]}"; then
      version=$(sed 's/\./\\./g' <<< "$WSH_VERSION");
      sed -E -I '' "s/#{{version}}/$version/" "$file";
    fi
    if string_in_array "$(basename "$file")" "${BROWSER_DEPENDANT_FILES[@]}"; then
      sed -E -I '' 's/^const BROWSER(:[\w\d\._]+)? = "(firefox|chrome)";/const BROWSER = "'"$browser"'";/' "$file";
    fi
  done
}


# Start:
if [[ "$EUID" -eq 0 ]]; then
  echo "Please do not run this script as root.";
  echo "Aborting..."
  exit 1;
fi

target="$1";
if [[ "$target" == "package" ]]; then
  # Most of the process is the same.
  target="build";
  package=0;
elif [[ "$target" == "build" ]]; then
  package=1;
else
  echo "Unknown target operation.";
  echo "Usage: build.sh <build|package> <firefox|chrome>";
  exit 1;
fi
readonly BROWSER="$2";

# Used for manifest keys.
readonly WSH_NAME="WCA Staff Helper";
readonly WSH_DESCRIPTION="Helper extension to link and reference WCA Regulations and Guidelines, WCA IDs and other documents.";
readonly WSH_VERSION=$(cat VERSION);
readonly FIREFOX_MIN_VERSION="109.0";
readonly CHROME_MIN_VERSION="102";
readonly BACKGROUND_FILE="scripts\/background.js";

# JS files that contain a "const BROWSER = '...';" line.
readonly BROWSER_DEPENDANT_FILES=("wsh-event-injection.js" "background.js");

# Files that contain a "#{{version}}" line.
readonly VERSION_DISPLAY_FILES=("popup.html");

# Files to be copied to the build directory.
readonly FILES=("css" "data" "html" "img" "LICENSE" "README.md");
readonly BUILD_DIR="build";

if [[ "$BROWSER" == "firefox" ]]; then
  min_version='"browser_specific_settings": {"gecko": {"strict_min_version": "'$FIREFOX_MIN_VERSION'"}}';
  service_worker='"scripts": ["'$BACKGROUND_FILE'"]';
elif [[ "$BROWSER" == "chrome" ]]; then
  min_version='"minimum_chrome_version": "'$CHROME_MIN_VERSION'"';
  service_worker='"service_worker": "'$BACKGROUND_FILE'"';
else
  echo "Invalid browser argument: $BROWSER";
  exit 1;
fi

if [[ "$target" == "build" ]]; then
  manifest_output_path="$BUILD_DIR/manifest.json";
  copy_files "$BROWSER";
fi

# Replace #{{...}} with the actual values in the manifest file.
if ! sed -E -e "s/#\{\{name\}\}/$WSH_NAME/" \
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

if [[ "$package" -eq 0 ]]; then
  if [[ "$BROWSER" == "firefox" ]]; then
    tar -czf wsh-extension-firefox.tar.gz build;
  elif [[ "$BROWSER" == "chrome" ]]; then
    tar -czf wsh-extension-chrome.tar.gz build;
  fi
  echo "Package created successfully!";
fi

exit 0;
