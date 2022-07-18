// Import polyfill to allow cross-compatibility between chrome and firefox.
import browser from "webextension-polyfill";
// Used to detect navigation in single page applications.
let previousUrl = "";

/**
 * Checks to make sure that visitHistory and whitelist filters objects exist in local storage.
 * Creates empty objects if needed.
 */
async function checkLocalStorage() {
  console.log("---Checking local storage...");
  await browser.storage.local.get("visitHistory").then(async (results) => {
    console.log("checkLocalStorage visitHistory results:", results);
    let history = {};

    if (!results.visitHistory) {
      // Set empty visitHistory object if it does not exist in local storage.
      console.log("Creating visitHistory object...");
      history["visitHistory"] = {};

      await browser.storage.local.set(history);
      // .then(() => {
      // 	console.log("New visitHistory object inserted in localstorage.");
      // });
    }
  });

  await browser.storage.local.get("filters").then(async (results) => {
    console.log("checkLocalStorage filters results:", results);

    // Check for filters.
    if (!results.filters) {
      // Set empty object if they don't exist.
      console.log("Writing empty whitelist.");
      let filters = {};
      filters["filters"] = [];

      await browser.storage.local.set(filters);
    }
  });
  console.log("---Done checking local storage.");
}

/**
 * Manages the creation/updating/deletion of lastVisitedText banner/div.
 */
async function manageLastVisitedText() {
  let URL = location.href.split("#")[0];

  // If the current URL pattern matches our filters,
  // then create or update the div.
  if (await checkURLmatchesFilters(URL)) {
    let lastVisitedTime = await getLastVisitDate(URL);
    console.log("Last visited date:", lastVisitedTime);
    createUpdateVisitedTimeBanner(lastVisitedTime);
  } else {
    // Otherwise, remove the div if it exists.
    removeVisitedTimeBanner();
  }
}

/**
 * Creates or updates the lastVisitedText banner/div with given timeVisited string.
 * @param String timeVisited
 */
function createUpdateVisitedTimeBanner(timeVisited) {
  if (document.getElementById("lastVisitedText") === null) {
    console.log("createUpdateVisitedTimeBanner creating new div.");
    console.log("Creating new lastVisitedText");
    let paddingDiv = document.createElement("div");
    let lastVisitedElem = document.createElement("div");

    paddingDiv.id = "paddingDiv";

    lastVisitedElem.id = "lastVisitedText";
    lastVisitedElem.style.textAlign = "center";
    lastVisitedElem.innerText = timeVisited;

    document.body.prepend(lastVisitedElem);
    document.body.prepend(paddingDiv);
  } else if (document.getElementById("lastVisitedText") === "Never") {
    console.log("createUpdateVisitedTimeBanner Never condition.");
    return;
  } else {
    let lastVisitedElem = document.getElementById("lastVisitedText");
    console.log("createUpdateVisitedTimeBanner updating div.");
    lastVisitedElem.innerText = timeVisited;
  }
}

/**
 * Removes the lastVisitedText banner/div.
 */
function removeVisitedTimeBanner() {
  if (document.getElementById("lastVisitedText") === null) {
    return;
  } else {
    document.getElementById("paddingDiv").remove();
    document.getElementById("lastVisitedText").remove();
  }
}

/**
 * Loads and returns whitelist from local storage.
 * @returns storage.local.filters object.
 */
async function loadWhitelist() {
  let whitelist = [];

  console.log("---loadWhitelist loading whitelist...");
  await browser.storage.local.get().then((results) => {
    console.log("local storage whitelist data:", results);

    // :oad the existing ones.
    whitelist = results.filters;
  });
  console.log("---loadWhitelist finished loading whitelist.");

  return whitelist;
}

async function saveWhitelist(newWhitelist) {
  // Save the whitelist.
  console.log("saveWhitelist saving whitelist...");
  await browser.storage.local.set(newWhitelist);

  // Handle the lastVisitedText banner/div.
  await manageLastVisitedText();

  console.log("Save complete, sending completion message...");
  browser.runtime.sendMessage({
    command: "saveWhitelistComplete",
    messageText: "Whitelist saved.",
  });
}

/**
 *
 * @param String Whitelisted URL to check for.
 * @returns new Date.now() if the url does not exist in history.
 * @returns Previously visited date if the url does exist in history.
 */
async function getLastVisitDate(URL) {
  console.log(`---getLastVisitDate checking history for ${URL} last visited date...`);
  let lastVisitedDate = null;

  await browser.storage.local.get("visitHistory").then((results) => {

    let URLVisitDatePairs = {};
    URLVisitDatePairs = results;

    console.log("local storage data:", URLVisitDatePairs);

    // Try to load the last visited date for the given URL if it exists.
    if (URLVisitDatePairs.visitHistory.hasOwnProperty(URL)) {
      console.log("URL exists in visitHistory:", URLVisitDatePairs.visitHistory[URL]);
      lastVisitedDate = URLVisitDatePairs.visitHistory[URL];
    } else {
      // If this current pages URL matches a whitelist filter pattern but
      // a last visited entry does not exist for it, we need to create a new entry.
      console.log("URL does not exist in visitHistory");

      console.log(URLVisitDatePairs);
      lastVisitedDate = "Never";
      URLVisitDatePairs.visitHistory[URL] = new Date().toString();
      console.log(URLVisitDatePairs);

      browser.storage.local.set(URLVisitDatePairs);
    }
  });

  console.log("---getLastVisitDate done checking history for URL last visited date...");

  return lastVisitedDate;
}

/**
 * Checks local storage history for the given url and updates its last date visited.
 * This function does not check to see if the URL is whitelisted.
 * @param String Whitelisted URL to check for.
 * @returns new Date.now() string.
 */
async function updateLastVisitDate(URL) {
  console.log("---updateLastVisitDate updating URL last visited date...");
  let lastVisitedDate = null;

  await browser.storage.local.get("visitHistory").then((results) => {
    let URLVisitDatePairs = {};
    URLVisitDatePairs = results;
    lastVisitedDate = new Date().toString();
    URLVisitDatePairs.visitHistory[URL] = lastVisitedDate;
    browser.storage.local.set(URLVisitDatePairs);
  });

  console.log("---updateLastVisitDate done updating URL last visited date.");

  return lastVisitedDate;
}

/**
 * Clears non-whitelisted URLs from visit history.
 */
async function cleanupVisitHistory() {
  let newHist = {
    visitHistory: {},
  };

  // Check local storage.
  await checkLocalStorage();

  // Load whitelist filters.
  let filters = {};
  await loadWhitelist().then((results) => {
    let URLVisitDatePairs = {};
    filters = results;
    console.log(filters);
    // Parse filters.

    filters = filters.map(checkValidRegExp).filter((pattern) => {
      return pattern !== null;
    });
    console.log("Usable filters:", filters);
  });

  // If the filters list is empty, delete the visit history object and return early.
  if (filters.length === 0) {
    console.log("Empty URL match list. Deleting visit history.");

    await browser.storage.local.remove("visitHistory");
    await browser.storage.local.set(newHist);
  }

  // Load visitHistory.
  let visitHistory = {};
  await browser.storage.local.get("visitHistory").then((results) => {
    let URLVisitDatePairs = {};
    visitHistory = results;
    console.log(visitHistory);
  });

  // Create regex matcher.
  let filterRegex = new RegExp(filters.join("|"));

  // Check for URL matches. If matches are found, add them to the newHist object.
  for (const [URL, lastVisitDate] of Object.entries(
    visitHistory.visitHistory
  )) {
    console.log(`${URL}: ${lastVisitDate}`);

    if (filterRegex.test(URL)) {
      newHist.visitHistory[URL] = lastVisitDate;
    }
  }

  console.log("newHist:", newHist);

  // Save results.
  await browser.storage.local.remove("visitHistory");
  await browser.storage.local.set(newHist);

  // Handle the lastVisitedText banner/div.
  await manageLastVisitedText();

  console.log("History cleaned, sending completion message...");
  browser.runtime.sendMessage({
    command: "cleanHistoryComplete",
    messageText: "History cleaned.",
  });
}

/**
 * Test if given URL matches existing filter.
 * @param String URL to check for pattern match.
 * @returns boolean URL matches pattern.
 */
async function checkURLmatchesFilters(URL) {
  console.log("---Checking to see if URL matches filters...");
  let isURLwhitelisted = false;

  await loadWhitelist().then((filters) => {
    console.log(`Checking ${URL} for regexp match.`);
    // Parse filters.
    if (!filters) {
      return false;
    }

    let usableFilters = filters.map(checkValidRegExp).filter((pattern) => {
      return pattern !== null;
    });
    console.log("Usable filters:", usableFilters);
    let filterRegex = new RegExp(usableFilters.join("|"));
    if (usableFilters.length === 0) {
      console.log("URL does not match any filters.");
      isURLwhitelisted = false;
    } else if (filterRegex.test(URL)) {
      console.log("URL matchs filter(s).");
      isURLwhitelisted = true;
    } else {
      console.log("URL does not match any filters.");
      isURLwhitelisted = false;
    }
  });
  console.log("---Done checking to see if URL matches filters.");

  return isURLwhitelisted;
}

/**
 * @param String A potential regexp string
 * @returns  null if input is invalid
 * @returns  Adjusted regexp string if valid
 */
function checkValidRegExp(input) {
  try {
    let adjustedInput = `${input}`;
    new RegExp(adjustedInput);

    return adjustedInput;
  } catch (e) {
    return null;
  }
}

/**
 * Handles window events. Updates url+dateVisited pairs in local storage as needed.
 * @param Event event
 */
async function windowEventsHandler(event) {
  console.log("---windowEventsHandler triggered by:", event);
  await checkLocalStorage();
  let URL = location.href.split("#")[0];

  await manageLastVisitedText();

  if(await checkURLmatchesFilters(URL)) {
    updateLastVisitDate(URL);
  }

  console.log("---windowEventsHandler finished.");
}

/**
 * Startup function.
 * Checks local storage for correct structures and
 * checks to see if the current tab is whitelisted and needs a last visited banner.
 */
async function startup() {
  console.log("Starting up...");

  // await browser.storage.local.remove("visitHistory");
  await checkLocalStorage();
  await manageLastVisitedText();

  // We want to save the visit time when the tab exits, navigates away, or refreshes,
  // so the beforeunload event is ideal here.
  ["beforeunload"].forEach((event) => {
    window.addEventListener(event, function () {
      console.log(`Responding to: ${event} trigger`);
      previousUrl = window.location.href;
      windowEventsHandler(event);
    });
  });

  // Create a mutation obeserver to watch for page navigation in SRAs.
  const observer = new MutationObserver(() => {
    if (window.location.href !== previousUrl && previousUrl !== "") {
      console.log(`URL changed from ${previousUrl} to ${window.location.href}`);
      previousUrl = window.location.href;
      windowEventsHandler(event);
    }
  });
  const config = { subtree: true, childList: true };
  observer.observe(document, config);

  // Handle whitelist saving.
  browser.runtime.onMessage.addListener((message) => {
    if (message.command === "saveWhitelist") {
      console.log("saveWhitelist message received in main.");
      saveWhitelist(message.whitelist);
    }
  });

  // Handle history cleanup.
  browser.runtime.onMessage.addListener((message) => {
    if (message.command === "cleanupVisitHistory") {
      console.log("cleanupVisitHistory message received in main.");
      cleanupVisitHistory();
    }
  });

  console.log("Done starting up...");
}

startup();


function test() {
  let myObj = {
    hist: {
      field1: "res1",
      field2: "res2"
    }
  };

  console.log(`field1: ${myObj.hist.hasOwnProperty("field1")}`)
  console.log(`field2: ${myObj.hist.hasOwnProperty("field2")}`)
  console.log("Removing field 2.");
  delete(myObj.hist.field2);
  console.log(`field2: ${myObj.hist.hasOwnProperty("field2")}`)
}

test();
