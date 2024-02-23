chrome.commands.onCommand.addListener((command) => {
    if (command === "scan-selected-text") {
        console.log("Scanning selected text");
    }
});
