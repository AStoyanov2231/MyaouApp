# Native iOS App + Web App Integration Plan

## Overview

Create a native iOS app that:
- Loads the Myaou web app in a WKWebView
- Uses native UITabBar with Liquid Glass (iOS 26+)
- Communicates bidirectionally with the web app
- Displays notification badges on tabs (e.g., unread messages)

---

## Architecture

```
┌─────────────────────────────────────┐
│  Native iOS App (SwiftUI)           │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   WKWebView                   │  │
│  │   - Loads: myaou-app.com      │  │
│  │   - JS injection at start    │  │
│  │   - Receives postMessage      │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Native TabBar (Liquid Glass) │  │
│  │  [Places][Messages][Friends][Profile] │
│  │           ↑ badge                │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Part 1: Web App Changes

### 1.1 Create Native Platform Detection Hook

**File:** `src/hooks/useNativePlatform.ts`

```typescript
type Platform = 'ios' | 'android' | 'web';

interface NativeBridge {
  postMessage: (message: string) => void;
}

declare global {
  interface Window {
    isNativeApp?: boolean;
    nativePlatform?: Platform;
    webkit?: {
      messageHandlers?: {
        nativeBridge?: NativeBridge;
      };
    };
  }
}

export function useNativePlatform() {
  const isNative = typeof window !== 'undefined' && window.isNativeApp === true;
  const platform = (typeof window !== 'undefined' && window.nativePlatform) || 'web';

  const sendToNative = (action: string, payload?: Record<string, unknown>) => {
    if (isNative && window.webkit?.messageHandlers?.nativeBridge) {
      window.webkit.messageHandlers.nativeBridge.postMessage(
        JSON.stringify({ action, payload })
      );
    }
  };

  return { isNative, platform, sendToNative };
}
```

### 1.2 Create Native Bridge Provider

**File:** `src/contexts/NativeBridgeContext.tsx`

Provides app-wide access to native communication:
- `sendBadgeUpdate(tab: string, count: number)` - Update tab badge
- `sendNavigationEvent(route: string)` - Notify native of navigation
- `isNative` - Boolean for conditional rendering

### 1.3 Modify MobileNav Component

**File:** `src/components/layout/MobileNav.tsx`

```tsx
// Add at top of component
const { isNative } = useNativePlatform();

// Early return if native (native app handles navigation)
if (isNative) return null;

// Rest of existing component...
```

### 1.4 Sync Unread Count to Native

**File:** `src/contexts/UnreadMessagesContext.tsx` or `src/hooks/useUnreadMessages.ts`

When `totalUnread` changes, notify native app:

```typescript
const { isNative, sendToNative } = useNativePlatform();

useEffect(() => {
  if (isNative) {
    sendToNative('updateBadge', {
      tab: 'messages',
      count: totalUnread
    });
  }
}, [totalUnread, isNative, sendToNative]);
```

### 1.5 Listen for Native Navigation Commands

**File:** `src/contexts/NativeBridgeContext.tsx`

```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;

  // Native app calls this when tab is tapped
  window.navigateFromNative = (route: string) => {
    router.push(route);
  };

  return () => {
    delete window.navigateFromNative;
  };
}, [router]);
```

### 1.6 Files to Modify Summary

| File | Change |
|------|--------|
| `src/hooks/useNativePlatform.ts` | NEW - Platform detection + bridge |
| `src/contexts/NativeBridgeContext.tsx` | NEW - App-wide native communication |
| `src/components/layout/MobileNav.tsx` | Hide when `isNative` |
| `src/contexts/UnreadMessagesContext.tsx` | Send badge updates to native |
| `src/app/(main)/layout.tsx` | Wrap with `NativeBridgeProvider` |

---

## Part 2: iOS Native App Implementation

### 2.1 Project Structure

```
MyaouApp-iOS/
├── MyaouApp.swift              # App entry point
├── ContentView.swift           # Main view with TabView + WebView
├── WebView/
│   ├── WebViewContainer.swift  # WKWebView wrapper
│   ├── WebViewCoordinator.swift # Handles JS messages
│   └── ScriptMessageHandler.swift # Message routing
├── Models/
│   └── NativeMessage.swift     # Message types from web
├── ViewModels/
│   └── AppViewModel.swift      # Shared state (badges, etc.)
└── Info.plist
```

### 2.2 App Entry Point

**File:** `MyaouApp.swift`

```swift
import SwiftUI

@main
struct MyaouApp: App {
    @StateObject private var appViewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appViewModel)
        }
    }
}
```

### 2.3 Main Content View with Native TabBar

**File:** `ContentView.swift`

```swift
import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @State private var selectedTab: Tab = .places

    enum Tab: String, CaseIterable {
        case places = "/places"
        case messages = "/messages"
        case friends = "/friends"
        case profile = "/profile"

        var icon: String {
            switch self {
            case .places: return "mappin.circle.fill"
            case .messages: return "message.fill"
            case .friends: return "person.2.fill"
            case .profile: return "person.crop.circle.fill"
            }
        }

        var title: String {
            switch self {
            case .places: return "Places"
            case .messages: return "Messages"
            case .friends: return "Friends"
            case .profile: return "Profile"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ForEach(Tab.allCases, id: \.self) { tab in
                WebViewContainer(
                    route: tab.rawValue,
                    selectedTab: $selectedTab
                )
                .tabItem {
                    Label(tab.title, systemImage: tab.icon)
                }
                .tag(tab)
                .badge(tab == .messages ? appViewModel.messagesBadge : 0)
            }
        }
        // Liquid Glass is automatic on iOS 26+ for standard TabView
    }
}
```

### 2.4 WebView Container

**File:** `WebView/WebViewContainer.swift`

```swift
import SwiftUI
import WebKit

struct WebViewContainer: UIViewRepresentable {
    let route: String
    @Binding var selectedTab: ContentView.Tab
    @EnvironmentObject var appViewModel: AppViewModel

    // Single shared WebView instance
    static var sharedWebView: WKWebView?

    func makeUIView(context: Context) -> WKWebView {
        if let existing = Self.sharedWebView {
            return existing
        }

        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()

        // Inject native detection script
        let script = WKUserScript(
            source: """
                window.isNativeApp = true;
                window.nativePlatform = 'ios';
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        contentController.addUserScript(script)

        // Register message handler
        contentController.add(
            context.coordinator,
            name: "nativeBridge"
        )

        config.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true

        // Load initial URL
        let baseURL = "https://your-myaou-app.com"
        if let url = URL(string: baseURL + route) {
            webView.load(URLRequest(url: url))
        }

        Self.sharedWebView = webView
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Navigate when tab changes
        let script = "window.navigateFromNative?.('\(route)')"
        webView.evaluateJavaScript(script)
    }

    func makeCoordinator() -> WebViewCoordinator {
        WebViewCoordinator(appViewModel: appViewModel)
    }
}
```

### 2.5 WebView Coordinator (Message Handler)

**File:** `WebView/WebViewCoordinator.swift`

```swift
import WebKit

class WebViewCoordinator: NSObject, WKScriptMessageHandler {
    var appViewModel: AppViewModel

    init(appViewModel: AppViewModel) {
        self.appViewModel = appViewModel
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? String,
              let data = body.data(using: .utf8),
              let json = try? JSONDecoder().decode(NativeMessage.self, from: data)
        else { return }

        DispatchQueue.main.async {
            self.handleMessage(json)
        }
    }

    private func handleMessage(_ message: NativeMessage) {
        switch message.action {
        case "updateBadge":
            if let tab = message.payload?["tab"] as? String,
               let count = message.payload?["count"] as? Int {
                if tab == "messages" {
                    appViewModel.messagesBadge = count
                }
            }
        case "navigate":
            // Handle navigation requests from web
            break
        default:
            print("Unknown action: \(message.action)")
        }
    }
}
```

### 2.6 Message Model

**File:** `Models/NativeMessage.swift`

```swift
struct NativeMessage: Codable {
    let action: String
    let payload: [String: AnyCodable]?
}

// Helper for decoding mixed JSON values
struct AnyCodable: Codable {
    let value: Any

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let int = try? container.decode(Int.self) {
            value = int
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else {
            value = ""
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let int = value as? Int {
            try container.encode(int)
        } else if let string = value as? String {
            try container.encode(string)
        }
    }
}
```

### 2.7 App ViewModel

**File:** `ViewModels/AppViewModel.swift`

```swift
import SwiftUI

class AppViewModel: ObservableObject {
    @Published var messagesBadge: Int = 0

    // Add other shared state as needed
}
```

---

## Part 3: Communication Protocol

### Messages from Web → Native

```typescript
// Web sends:
window.webkit.messageHandlers.nativeBridge.postMessage(JSON.stringify({
    action: 'updateBadge',
    payload: { tab: 'messages', count: 5 }
}));
```

### Commands from Native → Web

```swift
// Native calls:
webView.evaluateJavaScript("window.navigateFromNative('/messages')")
```

### Message Types

| Action | Direction | Payload | Purpose |
|--------|-----------|---------|---------|
| `updateBadge` | Web → Native | `{ tab, count }` | Update tab badge |
| `navigate` | Web → Native | `{ route }` | Request navigation |
| `navigateFromNative` | Native → Web | `route` | Tab was tapped |

---

## Part 4: Verification Steps

### Web App Testing
1. Run `npm run dev`
2. Open browser DevTools, run:
   ```js
   window.isNativeApp = true;
   window.nativePlatform = 'ios';
   ```
3. Verify MobileNav disappears
4. Verify badge updates still work in console

### iOS App Testing
1. Build in Xcode with iOS 26 SDK
2. Run on simulator or device
3. Verify:
   - Web app loads correctly
   - Bottom navbar is hidden in WebView
   - Native TabBar shows with Liquid Glass
   - Tapping tabs navigates WebView
   - Message badge appears when unread count > 0

### Integration Testing
1. Send a message to trigger unread count
2. Verify badge appears on native Messages tab
3. Tap Messages tab, verify count clears after reading

---

## Summary

| Component | Files | Purpose |
|-----------|-------|---------|
| **Web Detection** | `useNativePlatform.ts` | Detect native + send messages |
| **Web Bridge** | `NativeBridgeContext.tsx` | App-wide native communication |
| **Hide Nav** | `MobileNav.tsx` | Return null when native |
| **Badge Sync** | `UnreadMessagesContext.tsx` | Push unread count to native |
| **iOS App** | `ContentView.swift` | TabView with Liquid Glass |
| **iOS WebView** | `WebViewContainer.swift` | WKWebView with JS injection |
| **iOS Handler** | `WebViewCoordinator.swift` | Receive messages from web |
