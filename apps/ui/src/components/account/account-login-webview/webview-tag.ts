/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  LoadCommitEvent,
  DidFailLoadEvent,
  DidFrameFinishLoadEvent,
  PageTitleUpdatedEvent,
  PageFaviconUpdatedEvent,
  ConsoleMessageEvent,
  FoundInPageEvent,
  NewWindowEvent,
  WillNavigateEvent,
  DidStartNavigationEvent,
  DidRedirectNavigationEvent,
  DidNavigateEvent,
  DidFrameNavigateEvent,
  DidNavigateInPageEvent,
  IpcMessageEvent,
  PluginCrashedEvent,
  DidChangeThemeColorEvent,
  UpdateTargetUrlEvent,
  ContextMenuEvent,
  LoadURLOptions,
  WebviewTagPrintOptions,
  PrintToPDFOptions,
  MouseInputEvent,
  MouseWheelInputEvent,
  KeyboardInputEvent,
} from 'electron';

export interface WebviewTag extends HTMLElement {
  // Docs: https://electronjs.org/docs/api/webview-tag

  /**
   * Fired when a load has committed. This includes navigation within the current
   * document as well as subframe document-level loads, but does not include
   * asynchronous resource loads.
   */
  addEventListener(
    event: 'load-commit',
    listener: (event: LoadCommitEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'load-commit',
    listener: (event: LoadCommitEvent) => void
  ): this;
  /**
   * Fired when the navigation is done, i.e. the spinner of the tab will stop
   * spinning, and the `onload` event is dispatched.
   */
  addEventListener(
    event: 'did-finish-load',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-finish-load',
    listener: (event: Event) => void
  ): this;
  /**
   * This event is like `did-finish-load`, but fired when the load failed or was
   * cancelled, e.g. `window.stop()` is invoked.
   */
  addEventListener(
    event: 'did-fail-load',
    listener: (event: DidFailLoadEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-fail-load',
    listener: (event: DidFailLoadEvent) => void
  ): this;
  /**
   * Fired when a frame has done navigation.
   */
  addEventListener(
    event: 'did-frame-finish-load',
    listener: (event: DidFrameFinishLoadEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-frame-finish-load',
    listener: (event: DidFrameFinishLoadEvent) => void
  ): this;
  /**
   * Corresponds to the points in time when the spinner of the tab starts spinning.
   */
  addEventListener(
    event: 'did-start-loading',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-start-loading',
    listener: (event: Event) => void
  ): this;
  /**
   * Corresponds to the points in time when the spinner of the tab stops spinning.
   */
  addEventListener(
    event: 'did-stop-loading',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-stop-loading',
    listener: (event: Event) => void
  ): this;
  /**
   * Fired when attached to the embedder web contents.
   */
  addEventListener(
    event: 'did-attach',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-attach',
    listener: (event: Event) => void
  ): this;
  /**
   * Fired when document in the given frame is loaded.
   */
  addEventListener(
    event: 'dom-ready',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'dom-ready',
    listener: (event: Event) => void
  ): this;
  /**
   * Fired when page title is set during navigation. `explicitSet` is false when
   * title is synthesized from file url.
   */
  addEventListener(
    event: 'page-title-updated',
    listener: (event: PageTitleUpdatedEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'page-title-updated',
    listener: (event: PageTitleUpdatedEvent) => void
  ): this;
  /**
   * Fired when page receives favicon urls.
   */
  addEventListener(
    event: 'page-favicon-updated',
    listener: (event: PageFaviconUpdatedEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'page-favicon-updated',
    listener: (event: PageFaviconUpdatedEvent) => void
  ): this;
  /**
   * Fired when page enters fullscreen triggered by HTML API.
   */
  addEventListener(
    event: 'enter-html-full-screen',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'enter-html-full-screen',
    listener: (event: Event) => void
  ): this;
  /**
   * Fired when page leaves fullscreen triggered by HTML API.
   */
  addEventListener(
    event: 'leave-html-full-screen',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'leave-html-full-screen',
    listener: (event: Event) => void
  ): this;
  /**
   * Fired when the guest window logs a console message.
   *
   * The following example code forwards all log messages to the embedder's console
   * without regard for log level or other properties.
   */
  addEventListener(
    event: 'console-message',
    listener: (event: ConsoleMessageEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'console-message',
    listener: (event: ConsoleMessageEvent) => void
  ): this;
  /**
   * Fired when a result is available for `webview.findInPage` request.
   */
  addEventListener(
    event: 'found-in-page',
    listener: (event: FoundInPageEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'found-in-page',
    listener: (event: FoundInPageEvent) => void
  ): this;
  /**
   * Fired when the guest page attempts to open a new browser window.
   *
   * The following example code opens the new url in system's default browser.
   */
  addEventListener(
    event: 'new-window',
    listener: (event: NewWindowEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'new-window',
    listener: (event: NewWindowEvent) => void
  ): this;
  /**
   * Emitted when a user or the page wants to start navigation. It can happen when
   * the `window.location` object is changed or a user clicks a link in the page.
   *
   * This event will not emit when the navigation is started programmatically with
   * APIs like `<webview>.loadURL` and `<webview>.back`.
   *
   * It is also not emitted during in-page navigation, such as clicking anchor links
   * or updating the `window.location.hash`. Use `did-navigate-in-page` event for
   * this purpose.
   *
   * Calling `event.preventDefault()` does __NOT__ have any effect.
   */
  addEventListener(
    event: 'will-navigate',
    listener: (event: WillNavigateEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'will-navigate',
    listener: (event: WillNavigateEvent) => void
  ): this;
  /**
   * Emitted when any frame (including main) starts navigating. `isInPlace` will be
   * `true` for in-page navigations.
   */
  addEventListener(
    event: 'did-start-navigation',
    listener: (event: DidStartNavigationEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-start-navigation',
    listener: (event: DidStartNavigationEvent) => void
  ): this;
  /**
   * Emitted after a server side redirect occurs during navigation. For example a 302
   * redirect.
   */
  addEventListener(
    event: 'did-redirect-navigation',
    listener: (event: DidRedirectNavigationEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-redirect-navigation',
    listener: (event: DidRedirectNavigationEvent) => void
  ): this;
  /**
   * Emitted when a navigation is done.
   *
   * This event is not emitted for in-page navigations, such as clicking anchor links
   * or updating the `window.location.hash`. Use `did-navigate-in-page` event for
   * this purpose.
   */
  addEventListener(
    event: 'did-navigate',
    listener: (event: DidNavigateEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-navigate',
    listener: (event: DidNavigateEvent) => void
  ): this;
  /**
   * Emitted when any frame navigation is done.
   *
   * This event is not emitted for in-page navigations, such as clicking anchor links
   * or updating the `window.location.hash`. Use `did-navigate-in-page` event for
   * this purpose.
   */
  addEventListener(
    event: 'did-frame-navigate',
    listener: (event: DidFrameNavigateEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-frame-navigate',
    listener: (event: DidFrameNavigateEvent) => void
  ): this;
  /**
   * Emitted when an in-page navigation happened.
   *
   * When in-page navigation happens, the page URL changes but does not cause
   * navigation outside of the page. Examples of this occurring are when anchor links
   * are clicked or when the DOM `hashchange` event is triggered.
   */
  addEventListener(
    event: 'did-navigate-in-page',
    listener: (event: DidNavigateInPageEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-navigate-in-page',
    listener: (event: DidNavigateInPageEvent) => void
  ): this;
  /**
   * Fired when the guest page attempts to close itself.
   *
   * The following example code navigates the `webview` to `about:blank` when the
   * guest attempts to close itself.
   */
  addEventListener(
    event: 'close',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(event: 'close', listener: (event: Event) => void): this;
  /**
   * Fired when the guest page has sent an asynchronous message to embedder page.
   *
   * With `sendToHost` method and `ipc-message` event you can communicate between
   * guest page and embedder page:
   */
  addEventListener(
    event: 'ipc-message',
    listener: (event: IpcMessageEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'ipc-message',
    listener: (event: IpcMessageEvent) => void
  ): this;
  /**
   * Fired when the renderer process is crashed.
   */
  addEventListener(
    event: 'crashed',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(event: 'crashed', listener: (event: Event) => void): this;
  /**
   * Fired when a plugin process is crashed.
   */
  addEventListener(
    event: 'plugin-crashed',
    listener: (event: PluginCrashedEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'plugin-crashed',
    listener: (event: PluginCrashedEvent) => void
  ): this;
  /**
   * Fired when the WebContents is destroyed.
   */
  addEventListener(
    event: 'destroyed',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'destroyed',
    listener: (event: Event) => void
  ): this;
  /**
   * Emitted when media starts playing.
   */
  addEventListener(
    event: 'media-started-playing',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'media-started-playing',
    listener: (event: Event) => void
  ): this;
  /**
   * Emitted when media is paused or done playing.
   */
  addEventListener(
    event: 'media-paused',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'media-paused',
    listener: (event: Event) => void
  ): this;
  /**
   * Emitted when a page's theme color changes. This is usually due to encountering a
   * meta tag:
   */
  addEventListener(
    event: 'did-change-theme-color',
    listener: (event: DidChangeThemeColorEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'did-change-theme-color',
    listener: (event: DidChangeThemeColorEvent) => void
  ): this;
  /**
   * Emitted when mouse moves over a link or the keyboard moves the focus to a link.
   */
  addEventListener(
    event: 'update-target-url',
    listener: (event: UpdateTargetUrlEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'update-target-url',
    listener: (event: UpdateTargetUrlEvent) => void
  ): this;
  /**
   * Emitted when DevTools is opened.
   */
  addEventListener(
    event: 'devtools-opened',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'devtools-opened',
    listener: (event: Event) => void
  ): this;
  /**
   * Emitted when DevTools is closed.
   */
  addEventListener(
    event: 'devtools-closed',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'devtools-closed',
    listener: (event: Event) => void
  ): this;
  /**
   * Emitted when DevTools is focused / opened.
   */
  addEventListener(
    event: 'devtools-focused',
    listener: (event: Event) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'devtools-focused',
    listener: (event: Event) => void
  ): this;
  /**
   * Emitted when there is a new context menu that needs to be handled.
   */
  addEventListener(
    event: 'context-menu',
    listener: (event: ContextMenuEvent) => void,
    useCapture?: boolean
  ): this;
  removeEventListener(
    event: 'context-menu',
    listener: (event: ContextMenuEvent) => void
  ): this;
  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    useCapture?: boolean
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    useCapture?: boolean
  ): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    useCapture?: boolean
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    useCapture?: boolean
  ): void;
  /**
   * Whether the guest page can go back.
   */
  canGoBack(): boolean;
  /**
   * Whether the guest page can go forward.
   */
  canGoForward(): boolean;
  /**
   * Whether the guest page can go to `offset`.
   */
  canGoToOffset(offset: number): boolean;
  /**
   * Resolves with a NativeImage
   *
   * Captures a snapshot of the page within `rect`. Omitting `rect` will capture the
   * whole visible page.
   */
  //   capturePage(rect?: Rectangle): Promise<Electron.NativeImage>;
  /**
   * Clears the navigation history.
   */
  clearHistory(): void;
  /**
   * Closes the DevTools window of guest page.
   */
  closeDevTools(): void;
  /**
   * Executes editing command `copy` in page.
   */
  copy(): void;
  /**
   * Executes editing command `cut` in page.
   */
  cut(): void;
  /**
   * Executes editing command `delete` in page.
   */
  delete(): void;
  /**
   * Initiates a download of the resource at `url` without navigating.
   */
  downloadURL(url: string): void;
  /**
   * A promise that resolves with the result of the executed code or is rejected if
   * the result of the code is a rejected promise.
   *
   * Evaluates `code` in page. If `userGesture` is set, it will create the user
   * gesture context in the page. HTML APIs like `requestFullScreen`, which require
   * user action, can take advantage of this option for automation.
   */
  executeJavaScript(code: string, userGesture?: boolean): Promise<any>;
  /**
   * The request id used for the request.
   *
   * Starts a request to find all matches for the `text` in the web page. The result
   * of the request can be obtained by subscribing to `found-in-page` event.
   */
  //   findInPage(text: string, options?: FindInPageOptions): number;
  /**
   * The title of guest page.
   */
  getTitle(): string;
  /**
   * The URL of guest page.
   */
  getURL(): string;
  /**
   * The user agent for guest page.
   */
  getUserAgent(): string;
  /**
   * The WebContents ID of this `webview`.
   */
  getWebContentsId(): number;
  /**
   * the current zoom factor.
   */
  getZoomFactor(): number;
  /**
   * the current zoom level.
   */
  getZoomLevel(): number;
  /**
   * Makes the guest page go back.
   */
  goBack(): void;
  /**
   * Makes the guest page go forward.
   */
  goForward(): void;
  /**
   * Navigates to the specified absolute index.
   */
  goToIndex(index: number): void;
  /**
   * Navigates to the specified offset from the "current entry".
   */
  goToOffset(offset: number): void;
  /**
   * A promise that resolves with a key for the inserted CSS that can later be used
   * to remove the CSS via `<webview>.removeInsertedCSS(key)`.
   *
   * Injects CSS into the current web page and returns a unique key for the inserted
   * stylesheet.
   */
  insertCSS(css: string): Promise<string>;
  /**
   * Inserts `text` to the focused element.
   */
  insertText(text: string): Promise<void>;
  /**
   * Starts inspecting element at position (`x`, `y`) of guest page.
   */
  inspectElement(x: number, y: number): void;
  /**
   * Opens the DevTools for the service worker context present in the guest page.
   */
  inspectServiceWorker(): void;
  /**
   * Opens the DevTools for the shared worker context present in the guest page.
   */
  inspectSharedWorker(): void;
  /**
   * Whether guest page has been muted.
   */
  isAudioMuted(): boolean;
  /**
   * Whether the renderer process has crashed.
   */
  isCrashed(): boolean;
  /**
   * Whether audio is currently playing.
   */
  isCurrentlyAudible(): boolean;
  /**
   * Whether DevTools window of guest page is focused.
   */
  isDevToolsFocused(): boolean;
  /**
   * Whether guest page has a DevTools window attached.
   */
  isDevToolsOpened(): boolean;
  /**
   * Whether guest page is still loading resources.
   */
  isLoading(): boolean;
  /**
   * Whether the main frame (and not just iframes or frames within it) is still
   * loading.
   */
  isLoadingMainFrame(): boolean;
  /**
   * Whether the guest page is waiting for a first-response for the main resource of
   * the page.
   */
  isWaitingForResponse(): boolean;
  /**
   * The promise will resolve when the page has finished loading (see
   * `did-finish-load`), and rejects if the page fails to load (see `did-fail-load`).
   *
   * Loads the `url` in the webview, the `url` must contain the protocol prefix, e.g.
   * the `http://` or `file://`.
   */
  loadURL(url: string, options?: LoadURLOptions): Promise<void>;
  /**
   * Opens a DevTools window for guest page.
   */
  openDevTools(): void;
  /**
   * Executes editing command `paste` in page.
   */
  paste(): void;
  /**
   * Executes editing command `pasteAndMatchStyle` in page.
   */
  pasteAndMatchStyle(): void;
  /**
   * Prints `webview`'s web page. Same as `webContents.print([options])`.
   */
  print(options?: WebviewTagPrintOptions): Promise<void>;
  /**
   * Resolves with the generated PDF data.
   *
   * Prints `webview`'s web page as PDF, Same as `webContents.printToPDF(options)`.
   */
  printToPDF(options: PrintToPDFOptions): Promise<Uint8Array>;
  /**
   * Executes editing command `redo` in page.
   */
  redo(): void;
  /**
   * Reloads the guest page.
   */
  reload(): void;
  /**
   * Reloads the guest page and ignores cache.
   */
  reloadIgnoringCache(): void;
  /**
   * Resolves if the removal was successful.
   *
   * Removes the inserted CSS from the current web page. The stylesheet is identified
   * by its key, which is returned from `<webview>.insertCSS(css)`.
   */
  removeInsertedCSS(key: string): Promise<void>;
  /**
   * Executes editing command `replace` in page.
   */
  replace(text: string): void;
  /**
   * Executes editing command `replaceMisspelling` in page.
   */
  replaceMisspelling(text: string): void;
  /**
   * Executes editing command `selectAll` in page.
   */
  selectAll(): void;
  /**
   * Send an asynchronous message to renderer process via `channel`, you can also
   * send arbitrary arguments. The renderer process can handle the message by
   * listening to the `channel` event with the `ipcRenderer` module.
   *
   * See webContents.send for examples.
   */
  send(channel: string, ...args: any[]): Promise<void>;
  /**
   * Sends an input `event` to the page.
   *
   * See webContents.sendInputEvent for detailed description of `event` object.
   */
  sendInputEvent(
    event: MouseInputEvent | MouseWheelInputEvent | KeyboardInputEvent
  ): Promise<void>;
  /**
   * Send an asynchronous message to renderer process via `channel`, you can also
   * send arbitrary arguments. The renderer process can handle the message by
   * listening to the `channel` event with the `ipcRenderer` module.
   *
   * See webContents.sendToFrame for examples.
   */
  sendToFrame(
    frameId: [number, number],
    channel: string,
    ...args: any[]
  ): Promise<void>;
  /**
   * Set guest page muted.
   */
  setAudioMuted(muted: boolean): void;
  /**
   * Overrides the user agent for the guest page.
   */
  setUserAgent(userAgent: string): void;
  /**
   * Sets the maximum and minimum pinch-to-zoom level.
   */
  setVisualZoomLevelLimits(
    minimumLevel: number,
    maximumLevel: number
  ): Promise<void>;
  /**
   * Changes the zoom factor to the specified factor. Zoom factor is zoom percent
   * divided by 100, so 300% = 3.0.
   */
  setZoomFactor(factor: number): void;
  /**
   * Changes the zoom level to the specified level. The original size is 0 and each
   * increment above or below represents zooming 20% larger or smaller to default
   * limits of 300% and 50% of original size, respectively. The formula for this is
   * `scale := 1.2 ^ level`.
   *
   * > **NOTE**: The zoom policy at the Chromium level is same-origin, meaning that
   * the zoom level for a specific domain propagates across all instances of windows
   * with the same domain. Differentiating the window URLs will make zoom work
   * per-window.
   */
  setZoomLevel(level: number): void;
  /**
   * Shows pop-up dictionary that searches the selected word on the page.
   *
   * @platform darwin
   */
  showDefinitionForSelection(): void;
  /**
   * Stops any pending navigation.
   */
  stop(): void;
  /**
   * Stops any `findInPage` request for the `webview` with the provided `action`.
   */
  stopFindInPage(
    action: 'clearSelection' | 'keepSelection' | 'activateSelection'
  ): void;
  /**
   * Executes editing command `undo` in page.
   */
  undo(): void;
  /**
   * Executes editing command `unselect` in page.
   */
  unselect(): void;
  /**
   * A `Boolean`. When this attribute is present the guest page will be allowed to
   * open new windows. Popups are disabled by default.
   */
  allowpopups: boolean;
  /**
   * A `String` which is a list of strings which specifies the blink features to be
   * disabled separated by `,`. The full list of supported feature strings can be
   * found in the RuntimeEnabledFeatures.json5 file.
   */
  disableblinkfeatures: string;
  /**
   * A `Boolean`. When this attribute is present the guest page will have web
   * security disabled. Web security is enabled by default.
   */
  disablewebsecurity: boolean;
  /**
   * A `String` which is a list of strings which specifies the blink features to be
   * enabled separated by `,`. The full list of supported feature strings can be
   * found in the RuntimeEnabledFeatures.json5 file.
   */
  enableblinkfeatures: string;
  /**
   * A `String` that sets the referrer URL for the guest page.
   */
  httpreferrer: string;
  /**
   * A `Boolean`. When this attribute is present the guest page in `webview` will
   * have node integration and can use node APIs like `require` and `process` to
   * access low level system resources. Node integration is disabled by default in
   * the guest page.
   */
  nodeintegration: boolean;
  /**
   * A `Boolean` for the experimental option for enabling NodeJS support in
   * sub-frames such as iframes inside the `webview`. All your preloads will load for
   * every iframe, you can use `process.isMainFrame` to determine if you are in the
   * main frame or not. This option is disabled by default in the guest page.
   */
  nodeintegrationinsubframes: boolean;
  /**
   * A `String` that sets the session used by the page. If `partition` starts with
   * `persist:`, the page will use a persistent session available to all pages in the
   * app with the same `partition`. if there is no `persist:` prefix, the page will
   * use an in-memory session. By assigning the same `partition`, multiple pages can
   * share the same session. If the `partition` is unset then default session of the
   * app will be used.
   *
   * This value can only be modified before the first navigation, since the session
   * of an active renderer process cannot change. Subsequent attempts to modify the
   * value will fail with a DOM exception.
   */
  partition: string;
  /**
   * A `Boolean`. When this attribute is present the guest page in `webview` will be
   * able to use browser plugins. Plugins are disabled by default.
   */
  plugins: boolean;
  /**
   * A `String` that specifies a script that will be loaded before other scripts run
   * in the guest page. The protocol of script's URL must be `file:` (even when using
   * `asar:` archives) because it will be loaded by Node's `require` under the hood,
   * which treats `asar:` archives as virtual directories.
   *
   * When the guest page doesn't have node integration this script will still have
   * access to all Node APIs, but global objects injected by Node will be deleted
   * after this script has finished executing.
   *
   * **Note:** This option will appear as `preloadURL` (not `preload`) in the
   * `webPreferences` specified to the `will-attach-webview` event.
   */
  preload: string;
  /**
   * A `String` representing the visible URL. Writing to this attribute initiates
   * top-level navigation.
   *
   * Assigning `src` its own value will reload the current page.
   *
   * The `src` attribute can also accept data URLs, such as `data:text/plain,Hello,
   * world!`.
   */
  src: string;
  /**
   * A `String` that sets the user agent for the guest page before the page is
   * navigated to. Once the page is loaded, use the `setUserAgent` method to change
   * the user agent.
   */
  useragent: string;
  /**
   * A `String` which is a comma separated list of strings which specifies the web
   * preferences to be set on the webview. The full list of supported preference
   * strings can be found in BrowserWindow.
   *
   * The string follows the same format as the features string in `window.open`. A
   * name by itself is given a `true` boolean value. A preference can be set to
   * another value by including an `=`, followed by the value. Special values `yes`
   * and `1` are interpreted as `true`, while `no` and `0` are interpreted as
   * `false`.
   */
  webpreferences: string;
}
