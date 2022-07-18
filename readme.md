# iForgor

> Cross-browser (Firefox/Chrome) extension that pattern matches URLs and displays the last date visited date and time of matched webpages in a div at the top of the page.

## Features

- Floating header bar with last visited date/time information. Styled to minimize potential obstruction of actual page contents.
- In-situ display and removal of last date visited div when the user updates filters. No page refresh necessary.
- User-defined URL pattern matching via RegExp strings: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp`
- Supports Firefox and Chrome browsers thanks to Mozilla's webextension-polyfill module.

## Getting started

### 🛠 Build locally
1. Run `npm install` to install all required dependencies
1. Run `npm run build`

The build step will create the `distribution` folder which will contain the generated extension.

### 🏃 Run the extension

Using [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) is recommened for automatic reloading and running in a dedicated browser instance. Alternatively you can load the extension manually (see below).

1. Run `npm run watch` to watch for file changes and build continuously
1. Run `npm install --global web-ext` (only only for the first time)
1. In another terminal, run one of `web-ext run -t chromium`, `web-ext run -t firefox`, etc.

#### Manually

You can also [load the extension manually in Chrome](https://www.smashingmagazine.com/2017/04/browser-extension-edge-chrome-firefox-opera-brave-vivaldi/#google-chrome-opera-vivaldi) or [Firefox](https://www.smashingmagazine.com/2017/04/browser-extension-edge-chrome-firefox-opera-brave-vivaldi/#mozilla-firefox).

### Acknowledgements

This extension is built on top of [browser-extension-template](https://github.com/fregante/browser-extension-template)
