// Import polyfill to allow cross-compatibility between chrome and firefox.
import browser from "webextension-polyfill";

/**
 * Listen for and handles clicks on buttons.
 */
function listenForClicks() {
  document.addEventListener("click", (event) => {
    // Listen for a save button click and send the whitelist to the main script for saving.
    // console.log(`Click event: ${event}`);

    if (event.target.classList.contains("save")) {
      // console.log("Saving whitelist...");

      document.querySelector("#statusText").innerText = "Saving whitelist...";
      saveWhitelistToStorage();
    } else if (event.target.classList.contains("cleanupVisitHistory")) {
      // console.log("Cleaning visit history...");

      document.querySelector("#statusText").innerText =
        "Cleaning visit history...";
      cleanVisitHistory();
    }
  });
}

/**
 * Set up listeners for return messages.
 */
async function setupListeners() {
  // Handle general operation completion.
  // console.log("Setting up listeners");
  browser.runtime.onMessage.addListener((message) => {
    if (
      ["saveWhitelistComplete", "cleanHistoryComplete"].includes(
        message.command
      )
    ) {
      document.querySelector("#statusText").innerText = message.messageText;
      enableInputs();
    } else if (message.command === "whiteListLoaded") {
      let whiteList = message.whiteListFilters;
    }
  });
}

/**
 * Enable inputs.
 */
function enableInputs() {
  document.querySelector("#whitelist").disabled = false;
  document.querySelector("#saveButton").disabled = false;
  document.querySelector("#cleanHistoryButton").disabled = false;
}

/**
 * Disable inputs.
 */
function disableInputs() {
  document.querySelector("#whitelist").disabled = true;
  document.querySelector("#saveButton").disabled = true;
  document.querySelector("#cleanHistoryButton").disabled = true;
}

/**
 * Loads previously saved whitelist from local storage to the textarea if possible.
 */
async function loadWhitelist() {
  // Disable inputs.
  disableInputs();

  let whitelist = [];
  let whitelistTextarea = document.querySelector("#whitelist");

  // console.log("loadWhitelist loading whitelist...");
  await browser.storage.local.get().then((results) => {
    // console.log("local storage data:");
    // console.log(results);

    // Check for filters.
    if (!results.filters) {
      // Set empty object if they don't exist.
      let filters = {};
      filters["filters"] = [];

      browser.storage.local.set(filters);
      whitelist = filters;

      // console.log(whitelist);
    } else {
      // Otherwise load the existing ones.
      whitelist = results.filters;

      // console.log(whitelist);

      whitelistTextarea.value = whitelist.join("\n");
    }
  });

  // Enable inputs.
  enableInputs();
}

/**
 * Saves the current whitelist from the textarea to local storage if possible.
 */
async function saveWhitelistToStorage() {
  // Disable inputs.
  disableInputs();

  // Split the string in the textarea into individual strings by pattern match.
  let filters = document.querySelector("#whitelist").value.trim();
  filters = filters.match(/\S+/g);
  // console.log("Filters:", filters);

  // Put the strings into an object.
  let whitelist = {};
  whitelist["filters"] = filters;

  // Send the save command with the object in a message to the content script.
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, {
      command: "saveWhitelist",
      whitelist: whitelist,
    });
  });
}

/**
 * Handles cleaning visit history.
 */
async function cleanVisitHistory() {
  // Disable inputs.
  disableInputs();

  // Send message to main content script to cleanup visit history.
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, {
      command: "cleanupVisitHistory",
    });
  });
}

/**
 * Displays error if necessary.
 * @param error
 */
function reportMenuError(error) {
  document.querySelector("#menu").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(`Error in menu.js: ${error.message}`);
  document.querySelector("#statusText").innerText = `Error: ${error.message}`;
}

/**
 * On popup, setup listeners and load content.
 */
// browser.tabs
//   .executeScript({ file: "/content_scripts/menuHandler.js" })

document.addEventListener("DOMContentLoaded", async () => {
  // console.error(`Document loaded, browser object: ${browser}`);
  await loadWhitelist()
    .then(setupListeners)
    .then(listenForClicks)
    .catch(reportMenuError);
});
