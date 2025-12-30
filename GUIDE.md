# How to Build a Chrome Extension (The "JGoblin" Method)

This guide explains how to build a Chrome Extension like JGoblin from scratch. Think of a Chrome Extension as a **mini-website** that lives inside your browser and has special permissions to talk to Chrome.

---

## 1. The Anatomy of an Extension
You only need 4 key files to start.

1.  **`manifest.json`** (The ID Card): Tells Chrome who you are and what permissions you need.
2.  **`popup.html`** (The Face): The user interface (buttons, text areas).
3.  **`popup.js`** (The Brain): The logic that runs when the user interacts with the UI.
4.  **`styles.css`** (The Look): Makes it look good.

*(Optional but powerful)*:
*   **`background.js`** (The Ghost): Runs invisibly in the background (for context menus, side panels).

---

## 2. Step-by-Step Build

### Step 1: Create the Manifest (`manifest.json`)
Create a folder and add a file named `manifest.json`. This is mandatory.

```json
{
  "manifest_version": 3,  // Standard for modern extensions
  "name": "My AI Helper",
  "version": "1.0",
  "description": "My first extension",
  "permissions": [        // What superpowers do you need?
    "storage",            // To save settings
    "activeTab",          // To see the current website
    "contextMenus",       // To add right-click options
    "sidePanel"           // To open in the side bar
  ],
  "action": {             // What happens when you click the icon?
    "default_title": "Open Extension"
  },
  "side_panel": {         // We used Side Panel instead of a popup for JGoblin
    "default_path": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### Step 2: Build the UI (`popup.html`)
This is standard HTML.

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>My Helper</h1>
  <textarea id="myInput" placeholder="Enter text..."></textarea>
  <button id="myButton">Do Something</button>
  <div id="output"></div>

  <!-- IMPORTANT: You must link your JS at the end -->
  <script src="popup.js" type="module"></script>
</body>
</html>
```

### Step 3: Write the Logic (`popup.js`)
This is where the magic happens. We use **JavaScript** to handle clicks, save data, and call APIs.

**A. Handling Clicks:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('myButton');
  const input = document.getElementById('myInput');

  btn.addEventListener('click', async () => {
    const text = input.value;
    alert("You typed: " + text);
  });
});
```

**B. Saving Data (Memory):**
Chrome has a special storage API. It's better than standard local storage because it syncs.
```javascript
// Save
chrome.storage.local.set({ myKey: "some value" });

// Load
chrome.storage.local.get(['myKey'], (result) => {
  console.log(result.myKey);
});
```

**C. Calling an AI (The "JGoblin" feature):**
We use the standard `fetch` API to talk to Gemini (or OpenAI).
```javascript
async function callAI(prompt) {
  const apiKey = "YOUR_KEY";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
```

### Step 4: The Background Script (`background.js`)
Use this for things that happen *outside* the popup, like right-click menus.

```javascript
// Create a Context Menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveText",
    title: "Save this text",
    contexts: ["selection"] // Only show when text is selected
  });
});

// Listen for clicks on the menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveText") {
    // Save the selected text to storage so popup.js can see it
    chrome.storage.local.set({ savedText: info.selectionText });
  }
});
```

---

## 3. How We Added Specific Features

### 1. Reading PDFs
Browser JS cannot read PDFs natively. We downloaded a library called **PDF.js** and put it in a `lib` folder.
*   **How it works:** We read the file as an `ArrayBuffer` -> Pass it to PDF.js -> Loop through pages -> Extract text strings.

### 2. Reading Word Docs (.docx)
We used a library called **Mammoth.js**.
*   **How it works:** Read file as `ArrayBuffer` -> Pass to Mammoth -> It returns raw text.

### 3. The Side Panel
Instead of `default_popup` in `manifest.json`, we used `side_panel`. We also added code in `background.js` to open the panel when the icon is clicked:
```javascript
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

### 4. Custom Tones (Dynamic UI)
We didn't hardcode options. We saved an **Array** of tones in `chrome.storage.local`. When the popup loads, we loop through that array and create `<option>` tags dynamically.

---

## 4. How to Test Your Extension

1.  Open Chrome and go to `chrome://extensions`.
2.  Toggle **Developer mode** (top right corner).
3.  Click **Load unpacked**.
4.  Select the folder containing your `manifest.json`.
5.  Your extension is now active! Pin it to your toolbar.

**Debugging:**
*   **Popup/Side Panel:** Right-click inside the panel > Inspect. Look at the **Console** for errors.
*   **Background Script:** On `chrome://extensions`, look for "Inspect views: service worker". Click it to see the background console.

---

## 5. Summary Checklist
1.  [ ] **Manifest:** Do I have permissions for what I want to do?
2.  **UI:** Does my HTML have IDs for everything I need to touch with JS?
3.  **Logic:** am I waiting for `DOMContentLoaded` before running my script?
4.  **Storage:** Am I saving user inputs so they don't vanish?
5.  **Security:** NEVER save API keys in your code. Always ask the user to input them and save to `chrome.storage.local`.
